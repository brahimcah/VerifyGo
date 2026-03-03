import asyncio
import json
import logging
import math
import threading

from dotenv import load_dotenv

from backend.gemini_agent import evaluate
from backend.nokia_mcp import nokia_nac_session
from backend import incident_manager

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ── Distancia local (Nokia no tiene calculate_distance) ──────────────────────

def _haversine_km(lat1, lon1, lat2, lon2) -> float:
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(d_lon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── Flujo 1 — Inicio de viaje ─────────────────────────────────────────────────

async def run_journey_start(truck_id, phone_number, lat_inicio, lon_inicio, route):
    try:
        async with nokia_nac_session() as session:
            logger.info(f"[Flujo 1] Nokia MCP — inicio de viaje {truck_id}")

            res_ss = await session.call_tool("checkSimSwap", {
                "phoneNumber": phone_number,
                "maxAge": 240
            })
            res_loc = await session.call_tool("verifyLocation", {
                "device": {"phoneNumber": phone_number},
                "area": {
                    "areaType": "CIRCLE",
                    "center": {"latitude": float(lat_inicio), "longitude": float(lon_inicio)},
                    "radius": 500
                },
                "maxAge": 60
            })
            res_roaming = await session.call_tool("getRoamingStatus", {
                "device": {"phoneNumber": phone_number}
            })

            mcp_data = {
                "checkSimSwap": json.loads(res_ss.content[0].text),
                "verifyLocation": json.loads(res_loc.content[0].text),
                "getRoamingStatus": json.loads(res_roaming.content[0].text),
            }
            logger.info(f"[Flujo 1] MCP results: {mcp_data}")

            result = evaluate(
                prompt=(
                    f"Inicio de viaje — Camión {truck_id}\n"
                    f"Teléfono: {phone_number} | GPS inicio: {lat_inicio}, {lon_inicio}\n"
                    f"Resultados Nokia NaC MCP:\n{json.dumps(mcp_data, indent=2)}"
                ),
                system_prompt=(
                    "Eres FleetSync AI. Autoriza o deniega el inicio del viaje.\n"
                    "Reglas (en orden de prioridad):\n"
                    "1. checkSimSwap.swapped=true → DENIED, reason: SIM_SWAP\n"
                    "2. verifyLocation.verificationResult='FALSE' → DENIED, reason: DRIVER_NOT_AT_START\n"
                    "3. getRoamingStatus.roaming=true → WARNING, reason: ROAMING_DETECTED\n"
                    "4. Todo OK → AUTHORIZED, reason: ALL_CHECKS_PASSED\n"
                    "Responde SOLO en JSON: {\"status\": \"AUTHORIZED|DENIED|WARNING\", \"reason\": \"...\", "
                    "\"reason_display\": \"<short, friendly message for the driver in English, "
                    "e.g.: 'A suspicious SIM swap was detected. Please contact your fleet manager.'>\", "
                    "\"checks\": {\"sim_safe\": bool, \"driver_location_ok\": bool, \"roaming\": bool}}"
                )
            )

            if result.get("status") == "AUTHORIZED":
                try:
                    from backend import route_monitor
                    route_monitor.active_journeys[truck_id] = {
                        "phone_number": phone_number,
                        "route_waypoints": json.dumps(route),
                        "destination": route[-1] if route else None,
                        "status": "ACTIVE",
                        "current_lat": lat_inicio,
                        "current_lon": lon_inicio,
                    }
                    logger.info(f"[Flujo 1] Viaje {truck_id} registrado en route_monitor")
                except Exception as e:
                    logger.warning(f"[Flujo 1] No se pudo registrar en route_monitor: {e}")

            return result

    except Exception as e:
        logger.error(f"[Flujo 1] Error: {e}")
        return {
            "status": "DENIED",
            "reason": f"CRITICAL_ERROR: {e}",
            "checks": {"sim_safe": False, "driver_location_ok": False, "roaming": False}
        }


# ── Flujo 2 — Activación QoD ──────────────────────────────────────────────────

async def run_qod_activation(truck_id, phone_number, lat_origen, lon_origen, lat_destino, lon_destino):
    distance_km = _haversine_km(lat_origen, lon_origen, lat_destino, lon_destino)
    logger.info(f"[Flujo 2] Distancia calculada localmente: {distance_km:.2f} km")

    if distance_km > 50:
        duration = min(int(distance_km * 60), 86400)  # ~1 min/km, máx 24h
    elif distance_km > 20:
        duration = 3600
    else:
        duration = 0

    qod_raw = "Not required"

    try:
        async with nokia_nac_session() as session:
            if duration > 0:
                logger.info(f"[Flujo 2] Activando QoD {duration}s para {phone_number}...")
                res_qod = await session.call_tool("createSession-QoD-V1", {
                    "allOf": [
                        {
                            "device": {"phoneNumber": phone_number},
                            "applicationServer": {
                                "ipv4Address": {"publicAddress": "1.1.1.1", "publicPort": 443}
                            },
                            "qosProfile": "QOS_L",
                            "duration": duration
                        }
                    ]
                })
                qod_raw = res_qod.content[0].text

        result = evaluate(
            prompt=(
                f"Camión {truck_id} — Viaje de {distance_km:.1f} km\n"
                f"Duración QoD solicitada: {duration}s\n"
                f"Respuesta Nokia NaC QoD:\n{qod_raw}"
            ),
            system_prompt=(
                "Eres FleetSync AI. Resume la decisión de QoD para el viaje.\n"
                "Responde en JSON: {\"status\": \"QOD_ACTIVATED|QOD_NOT_REQUIRED\", "
                "\"distance_km\": float, \"qod_duration_seconds\": int, \"reason\": \"...\"}"
            )
        )
        result["distance_km"] = round(distance_km, 2)
        result["qod_duration_seconds"] = duration
        return result

    except Exception as e:
        logger.error(f"[Flujo 2] Error QoD: {e}")
        return {
            "status": "QOD_NOT_REQUIRED",
            "distance_km": round(distance_km, 2),
            "qod_duration_seconds": 0,
            "reason": f"QOD_ERROR: {e}"
        }


# ── Flujo 3 — Monitorización periódica ───────────────────────────────────────

async def run_periodic_check(truck_id, phone_number, current_lat, current_lon, route_waypoints=None):
    try:
        async with nokia_nac_session() as session:
            logger.info(f"[Flujo 3] Check periódico {truck_id}...")

            res_loc = await session.call_tool("verifyLocation", {
                "device": {"phoneNumber": phone_number},
                "area": {
                    "areaType": "CIRCLE",
                    "center": {"latitude": float(current_lat), "longitude": float(current_lon)},
                    "radius": 2000
                },
                "maxAge": 60
            })
            res_ss = await session.call_tool("checkSimSwap", {
                "phoneNumber": phone_number,
                "maxAge": 60
            })

            mcp_data = {
                "verifyLocation": json.loads(res_loc.content[0].text),
                "checkSimSwap": json.loads(res_ss.content[0].text),
                "current_position": {"latitude": current_lat, "longitude": current_lon},
            }
            logger.info(f"[Flujo 3] MCP results: {mcp_data}")

            return evaluate(
                prompt=(
                    f"Check periódico — Camión {truck_id}\n"
                    f"Posición actual: {current_lat}, {current_lon}\n"
                    f"Resultados Nokia NaC MCP:\n{json.dumps(mcp_data, indent=2)}"
                ),
                system_prompt=(
                    "Eres FleetSync AI monitorizando una ruta activa.\n"
                    "Reglas:\n"
                    "- checkSimSwap.swapped=true → ALERT, reason: SIM_SWAP\n"
                    "- verifyLocation.verificationResult='FALSE' → ALERT, reason: GPS_SPOOFING\n"
                    "- Todo OK → ON_ROUTE, reason: POSITION_VERIFIED\n"
                    "Responde en JSON: {\"status\": \"ON_ROUTE|ALERT\", \"reason\": \"...\", \"action\": \"...\"}"
                )
            )

    except Exception as e:
        logger.error(f"[Flujo 3] Error: {e}")
        return {"status": "UNKNOWN", "reason": f"CHECK_ERROR: {e}"}


# ── Flujo 4 — Confirmación de llegada ────────────────────────────────────────

async def run_confirm_arrival(truck_id, phone_number, lat_actual, lon_actual, lat_destino, lon_destino):
    distance_m = _haversine_km(lat_actual, lon_actual, lat_destino, lon_destino) * 1000
    logger.info(f"[Flujo 4] Distancia al destino: {distance_m:.0f}m")

    try:
        async with nokia_nac_session() as session:
            res_loc = await session.call_tool("verifyLocation", {
                "device": {"phoneNumber": phone_number},
                "area": {
                    "areaType": "CIRCLE",
                    "center": {"latitude": float(lat_destino), "longitude": float(lon_destino)},
                    "radius": 300
                },
                "maxAge": 60
            })
            res_ss = await session.call_tool("checkSimSwap", {
                "phoneNumber": phone_number,
                "maxAge": 60
            })
            res_position = await session.call_tool("retrieveLocation", {
                "device": {"phoneNumber": phone_number},
                "maxAge": 60
            })

            mcp_data = {
                "verifyLocation_destination": json.loads(res_loc.content[0].text),
                "checkSimSwap": json.loads(res_ss.content[0].text),
                "retrieveLocation": json.loads(res_position.content[0].text),
                "distance_to_destination_meters": round(distance_m, 1),
            }
            logger.info(f"[Flujo 4] MCP results: {mcp_data}")

            result = evaluate(
                prompt=(
                    f"Confirmación llegada — Camión {truck_id}\n"
                    f"Destino: {lat_destino}, {lon_destino} | Posición actual: {lat_actual}, {lon_actual}\n"
                    f"Distancia al destino: {distance_m:.0f}m\n"
                    f"Resultados Nokia NaC MCP:\n{json.dumps(mcp_data, indent=2)}"
                ),
                system_prompt=(
                    "Eres FleetSync AI confirmando la llegada a destino.\n"
                    "Reglas:\n"
                    "- verifyLocation_destination.verificationResult='TRUE' Y checkSimSwap.swapped=false → ARRIVED\n"
                    "- verifyLocation_destination.verificationResult='TRUE' Y checkSimSwap.swapped=true → ALERT\n"
                    "- verifyLocation_destination.verificationResult='FALSE' → NOT_ARRIVED\n"
                    "Responde en JSON: {\"status\": \"ARRIVED|ALERT|NOT_ARRIVED\", "
                    "\"reason\": \"...\", \"confirmed_at\": \"ISO timestamp o null\"}"
                )
            )

            if result.get("status") == "ARRIVED":
                try:
                    from backend import route_monitor
                    if truck_id in route_monitor.active_journeys:
                        route_monitor.active_journeys[truck_id]["status"] = "COMPLETED"
                        logger.info(f"[Flujo 4] Viaje {truck_id} marcado como COMPLETED")
                except Exception:
                    pass

            return result

    except Exception as e:
        logger.error(f"[Flujo 4] Error: {e}")
        return {"status": "ERROR", "reason": f"ARRIVAL_CHECK_ERROR: {e}"}


# ── Flujo 3 — Arranque del bucle de monitorización ────────────────────────────

def start_monitoring(truck_id: str) -> threading.Thread:
    """
    Flujo 3 — Arranca el bucle de monitorización en un daemon thread.
    Orquesta route_monitor, que a su vez usa incident_manager.
    Llamar después de que run_journey_start haya devuelto AUTHORIZED.
    """
    from backend import route_monitor
    t = threading.Thread(target=route_monitor._run_in_thread, args=(truck_id,), daemon=True)
    t.start()
    logger.info(f"[ai_agent] Monitorización iniciada para {truck_id}")
    return t


# ── Wrappers síncronos ────────────────────────────────────────────────────────

def start_journey(truck_id, phone_number, lat_inicio, lon_inicio, route):
    """Flujo 1 — Autoriza el inicio del viaje."""
    return asyncio.run(run_journey_start(truck_id, phone_number, lat_inicio, lon_inicio, route))

def activate_journey_qod(truck_id, phone_number, lat_origen, lon_origen, lat_destino, lon_destino):
    """Flujo 2 — Activa QoD según la distancia del viaje."""
    return asyncio.run(run_qod_activation(truck_id, phone_number, lat_origen, lon_origen, lat_destino, lon_destino))

def check_periodic_location(truck_id, phone_number, current_lat, current_lon, route_waypoints=None):
    """Flujo 3 (one-shot) — Check puntual de posición y seguridad."""
    return asyncio.run(run_periodic_check(truck_id, phone_number, current_lat, current_lon, route_waypoints))

def confirm_arrival(truck_id, phone_number, lat_actual, lon_actual, lat_destino, lon_destino):
    """Flujo 4 — Confirma la llegada al destino."""
    return asyncio.run(run_confirm_arrival(truck_id, phone_number, lat_actual, lon_actual, lat_destino, lon_destino))
