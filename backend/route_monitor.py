"""
route_monitor.py — Flujo 3: monitorización periódica de rutas activas.

Loop asíncrono que cada CHECK_INTERVAL segundos:
  1. Obtiene posición real del dispositivo (retrieveLocation Nokia)
  2. Verifica que el GPS coincide con la red móvil (verifyLocation Nokia)
  3. Detecta SIM swap (checkSimSwap Nokia)
  4. Detecta desvío de ruta localmente (haversine vs waypoints)
  5. Llama a Gemini para decidir: ON_ROUTE | ALERT
  6. Si ALERT → crea incidencia + activa QoD de emergencia
"""
import asyncio
import json
import logging
import math

from backend.gemini_agent import evaluate
from backend.nokia_mcp import nokia_nac_session
from backend import incident_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Viajes activos: {truck_id: {phone_number, route_waypoints, destination, status, current_lat, current_lon}}
active_journeys: dict = {}

# Intervalo entre checks (segundos)
CHECK_INTERVAL = 60


# ── Utilidad: desvío de ruta local ───────────────────────────────────────────

def _min_distance_to_route_km(lat: float, lon: float, waypoints: list[dict]) -> float:
    """Distancia mínima (km) del punto actual al waypoint más cercano de la ruta."""
    if not waypoints:
        return 0.0

    def _haversine(lat1, lon1, lat2, lon2):
        R = 6371.0
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = (math.sin(d_lat / 2) ** 2
             + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
             * math.sin(d_lon / 2) ** 2)
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return min(
        _haversine(lat, lon, wp.get("lat", 0), wp.get("lon", 0))
        for wp in waypoints
    )


# ── Loop principal de monitorización ─────────────────────────────────────────

async def run_monitor_journey(truck_id: str, check_interval: int = CHECK_INTERVAL):
    """
    Loop asíncrono de monitorización para un camión.
    Se detiene cuando el viaje pasa a COMPLETED, ALERT o desaparece de active_journeys.
    """
    logger.info(f"[Flujo 3] Iniciando monitorización de {truck_id}")

    while True:
        journey = active_journeys.get(truck_id)

        if not journey or journey.get("status") != "ACTIVE":
            logger.info(f"[Flujo 3] Monitorización detenida para {truck_id} "
                        f"(status={journey.get('status') if journey else 'eliminado'})")
            break

        phone_number = journey["phone_number"]
        current_lat  = float(journey["current_lat"])
        current_lon  = float(journey["current_lon"])
        waypoints    = json.loads(journey.get("route_waypoints", "[]"))

        try:
            async with nokia_nac_session() as session:
                # 1. Posición real del dispositivo
                res_pos = await session.call_tool("retrieveLocation", {
                    "device": {"phoneNumber": phone_number},
                    "maxAge": 60
                })

                # 2. Verificar GPS vs red móvil
                res_loc = await session.call_tool("verifyLocation", {
                    "device": {"phoneNumber": phone_number},
                    "area": {
                        "areaType": "CIRCLE",
                        "center": {"latitude": current_lat, "longitude": current_lon},
                        "radius": 2000
                    },
                    "maxAge": 60
                })

                # 3. SIM swap
                res_ss = await session.call_tool("checkSimSwap", {
                    "phoneNumber": phone_number,
                    "maxAge": 60
                })

                pos_data = json.loads(res_pos.content[0].text)
                loc_data = json.loads(res_loc.content[0].text)
                ss_data  = json.loads(res_ss.content[0].text)

            # 4. Desvío de ruta (local, Nokia no tiene esta tool)
            deviation_km = _min_distance_to_route_km(current_lat, current_lon, waypoints)
            is_deviated  = deviation_km > 0.5  # umbral: 500 m

            mcp_data = {
                "retrieveLocation":  pos_data,
                "verifyLocation":    loc_data,
                "checkSimSwap":      ss_data,
                "route_deviation": {
                    "is_deviated": is_deviated,
                    "min_distance_to_route_km": round(deviation_km, 3),
                    "threshold_km": 0.5
                },
            }
            logger.info(f"[Flujo 3] {truck_id} — MCP: {mcp_data}")

            # 5. Decisión Gemini
            result = evaluate(
                prompt=(
                    f"Check periódico — Camión {truck_id}\n"
                    f"Posición actual: {current_lat}, {current_lon}\n"
                    f"Resultados Nokia NaC MCP:\n{json.dumps(mcp_data, indent=2)}"
                ),
                system_prompt=(
                    "Eres FleetSync AI monitorizando una ruta activa.\n"
                    "Reglas (en orden de prioridad):\n"
                    "1. checkSimSwap.swapped=true → ALERT, reason: SIM_SWAP\n"
                    "2. verifyLocation.verificationResult='FALSE' → ALERT, reason: GPS_SPOOFING\n"
                    "3. route_deviation.is_deviated=true → ALERT, reason: ROUTE_DEVIATION\n"
                    "4. Todo OK → ON_ROUTE, reason: POSITION_VERIFIED\n"
                    "Responde en JSON: {\"status\": \"ON_ROUTE|ALERT\", "
                    "\"reason\": \"...\", \"action\": \"...\"}"
                )
            )

            status = result.get("status")
            reason = result.get("reason", "")
            logger.info(f"[Flujo 3] {truck_id} — Gemini: {status} / {reason}")

            # 6. Acciones si ALERT
            if status == "ALERT":
                # Crear incidencia
                incident = incident_manager.add_incident(
                    truck_id=truck_id,
                    incident_type=reason,
                    description=result.get("action", "Alerta detectada en monitorización periódica."),
                    lat=current_lat,
                    lon=current_lon
                )
                logger.warning(f"[Flujo 3] Incidencia creada: {incident['id']} ({reason})")

                # Activar QoD de emergencia
                try:
                    async with nokia_nac_session() as session:
                        await session.call_tool("createSession-QoD-V1", {
                            "allOf": [
                                {
                                    "device": {"phoneNumber": phone_number},
                                    "applicationServer": {
                                        "ipv4Address": {"publicAddress": "1.1.1.1", "publicPort": 443}
                                    },
                                    "qosProfile": "QOS_L",
                                    "duration": 3600
                                }
                            ]
                        })
                        logger.info(f"[Flujo 3] QoD emergencia activado para {phone_number}")
                except Exception as qod_err:
                    logger.warning(f"[Flujo 3] QoD no disponible: {qod_err}")

                # Parar loop si es SIM_SWAP o GPS_SPOOFING (riesgo crítico)
                if reason in ("SIM_SWAP", "GPS_SPOOFING"):
                    active_journeys[truck_id]["status"] = "ALERT"
                    break

        except Exception as e:
            logger.error(f"[Flujo 3] Error en iteración de {truck_id}: {e}")

        await asyncio.sleep(check_interval)


# ── API pública ───────────────────────────────────────────────────────────────

def start_monitoring(truck_id: str, check_interval: int = CHECK_INTERVAL) -> asyncio.Task:
    """
    Lanza el loop de monitorización como asyncio.Task en background.
    Requiere que haya un event loop activo (ej: dentro de un contexto async).

    Uso desde código async:
        task = start_monitoring("TRK-001")

    Uso desde Streamlit (hilo separado):
        thread = threading.Thread(target=_run_in_thread, args=("TRK-001",), daemon=True)
        thread.start()
    """
    loop = asyncio.get_event_loop()
    return loop.create_task(run_monitor_journey(truck_id, check_interval))


def _run_in_thread(truck_id: str, check_interval: int = CHECK_INTERVAL):
    """Wrapper para lanzar la monitorización desde un hilo no-async (Streamlit)."""
    asyncio.run(run_monitor_journey(truck_id, check_interval))
