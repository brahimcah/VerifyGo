"""
backend/server.py — API REST Flask en puerto 8000.
Sirve los endpoints que consume el frontend React (frontend/src/lib/api.ts).

Endpoints:
  GET  /api/delivery/status        → estado actual del camión activo
  GET  /api/delivery/timeline      → historial de incidencias como AgentActions
  POST /api/delivery/start         → Flujo 1: inicio de viaje
  POST /api/delivery/trigger-event → simular evento (gps_drift, manual_qod, sim_swap)
"""
import asyncio
import json
import logging
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from backend.ai_agent import (
    run_journey_start,
    run_qod_activation,
    start_monitoring,
    run_confirm_arrival,
)
from backend import incident_manager, route_monitor, user_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Permite peticiones desde React en puerto 3000


# ── Estado global de demo ─────────────────────────────────────────────────────

_active_truck = {
    "truck_id": "TRK-001",
    "phone_number": "+99999991000",
    "actor_name": "Carlos Rodríguez",
    "actor_id": "#AGT-8821",
    "actor_type": "Human",
    "lat": 40.4168,
    "lon": -3.7038,
    "lat_destino": 41.3851,
    "lon_destino": 2.1734,
    "is_qod_active": False,
    "is_kyc_verified": True,
    "status": "ACTIVE",
}

# Simulated network telemetry
_telemetry = {
    "latency": 24,
    "signal": -85,
    "packet_jitter": 0.8,
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _run_async(coro):
    """Ejecuta una corrutina desde un contexto síncrono (Flask)."""
    return asyncio.run(coro)


def _format_incident_as_action(incident: dict, idx: int) -> dict:
    """Convierte una incidencia del incident_manager al formato AgentAction del frontend."""
    status_map = {
        "SIM_SWAP": "Warning",
        "GPS_SPOOFING": "Warning",
        "ROUTE_DEVIATION": "Auto-Action",
        "DELIVERY_COMPLETED": "Success",
        "LOCATION_MISMATCH": "Warning",
    }
    ts = incident.get("created_at", datetime.now(timezone.utc).isoformat())
    try:
        dt = datetime.fromisoformat(ts)
        formatted_ts = dt.strftime("%H:%M:%S")
    except Exception:
        formatted_ts = ts

    incident_type = incident.get("type", "UNKNOWN")
    return {
        "id": incident.get("id", str(idx)),
        "timestamp": formatted_ts,
        "action": incident_type.replace("_", " ").title(),
        "reason": incident.get("description", ""),
        "status": status_map.get(incident_type, "Active"),
        "toolUsed": "Nokia NaC MCP",
        "toolDetails": f"truck: {incident.get('truck_id')} | lat: {incident.get('lat')}, lon: {incident.get('lon')}",
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/api/delivery/status")
def get_delivery_status():
    t = _active_truck
    import math

    def dist_km(la1, lo1, la2, lo2):
        R = 6371
        d = math.radians
        a = math.sin(d(la2-la1)/2)**2 + math.cos(d(la1))*math.cos(d(la2))*math.sin(d(lo2-lo1)/2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    remaining_km = dist_km(t["lat"], t["lon"], t["lat_destino"], t["lon_destino"])
    eta_minutes = int(remaining_km / 0.8)  # ~80 km/h
    eta_h = eta_minutes // 60
    eta_m = eta_minutes % 60
    eta_str = f"{datetime.now().hour + eta_h:02d}:{(datetime.now().minute + eta_m) % 60:02d}"

    return jsonify({
        "actorType": t["actor_type"],
        "actorName": t["actor_name"],
        "actorId": t["actor_id"],
        "actorRating": 4.9,
        "isKycVerified": t["is_kyc_verified"],
        "isQodActive": t["is_qod_active"],
        "location": {"lat": t["lat"], "lng": t["lon"]},
        "latency": _telemetry["latency"],
        "signal": _telemetry["signal"],
        "packetJitter": _telemetry["packet_jitter"],
        "eta": eta_str,
        "distanceRemaining": f"{remaining_km:.1f} km",
        "truckStatus": t["status"],
    })


@app.post("/api/auth/login")
def login():
    data = request.get_json() or {}
    phone = data.get("phoneNumber", "").strip()
    if not phone:
        return jsonify({"ok": False, "error": "phoneNumber is required"}), 400

    user = user_manager.login(phone)
    if not user:
        return jsonify({"ok": False, "error": "Phone number not registered"}), 401

    return jsonify({"ok": True, "user": user})


@app.get("/api/incidents")
def get_incidents():
    return jsonify(incident_manager.get_all())


@app.get("/api/delivery/timeline")
def get_timeline():
    incidents = incident_manager.get_all()

    # Construir timeline: incidencias reales + eventos de sistema base
    timeline = []

    # Eventos de sistema fijos (base)
    timeline.append({
        "id": "sys-1",
        "timestamp": "08:00:00",
        "action": "Shift Started",
        "reason": "FleetSync AI initialized. Nokia NaC MCP connected. Telemetry streams active.",
        "status": "System",
        "toolUsed": "Nokia NaC MCP",
        "toolDetails": "protocol: 2024-11-05 | tools: 70 available"
    })

    if _active_truck.get("is_qod_active"):
        timeline.append({
            "id": "qod-1",
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "action": "QoD Session Active",
            "reason": "Quality of Service on Demand activated via Nokia NaC createSession-QoD-V1.",
            "status": "Active",
            "toolUsed": "Nokia NaC MCP",
            "toolDetails": "profile: QOS_L | status: AVAILABLE"
        })

    # Incidencias reales
    for i, inc in enumerate(reversed(incidents)):
        timeline.append(_format_incident_as_action(inc, i))

    return jsonify(timeline)


@app.post("/api/delivery/start")
def start_delivery():
    data = request.get_json() or {}

    truck_id    = data.get("truckId", _active_truck["truck_id"])
    phone       = data.get("phoneNumber", _active_truck["phone_number"])
    lat         = float(data.get("lat", _active_truck["lat"]))
    lon         = float(data.get("lon", _active_truck["lon"]))
    lat_dest    = float(data.get("latDestino", _active_truck["lat_destino"]))
    lon_dest    = float(data.get("lonDestino", _active_truck["lon_destino"]))
    route       = data.get("route", [])
    actor_type  = data.get("actorType", "Human")

    # Actualizar estado global
    _active_truck.update({
        "truck_id": truck_id,
        "phone_number": phone,
        "actor_type": actor_type,
        "lat": lat,
        "lon": lon,
        "lat_destino": lat_dest,
        "lon_destino": lon_dest,
        "status": "ACTIVE",
    })

    try:
        # Flujo 1 — autorizar inicio
        journey_result = _run_async(
            run_journey_start(truck_id, phone, lat, lon, route)
        )

        if journey_result.get("status") == "AUTHORIZED":
            # Flujo 2 — activar QoD si la distancia lo requiere
            qod_result = _run_async(
                run_qod_activation(truck_id, phone, lat, lon, lat_dest, lon_dest)
            )
            if qod_result.get("status") == "QOD_ACTIVATED":
                _active_truck["is_qod_active"] = True

            # Flujo 3 — arrancar monitorización (orquestado por ai_agent)
            start_monitoring(truck_id)
            logger.info(f"[server] Flujo 3 delegado a ai_agent para {truck_id}")

        return jsonify({
            "success": journey_result.get("status") == "AUTHORIZED",
            "journey": journey_result,
        })

    except Exception as e:
        logger.error(f"[server] Error en /delivery/start: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.post("/api/delivery/trigger-event")
def trigger_event():
    data = request.get_json() or {}
    event_id = data.get("eventId", "")

    truck_id = _active_truck["truck_id"]
    phone    = _active_truck["phone_number"]
    lat      = _active_truck["lat"]
    lon      = _active_truck["lon"]

    if event_id == "gps_drift":
        # Simular GPS spoofing: añadir incidencia directamente
        incident_manager.add_incident(
            truck_id=truck_id,
            incident_type="GPS_SPOOFING",
            description="Simulación: discrepancia GPS detectada por Nokia NaC verifyLocation.",
            lat=lat, lon=lon
        )
        _telemetry["packet_jitter"] = 3.5
        logger.info("[server] Evento GPS drift simulado")

    elif event_id == "manual_qod":
        _active_truck["is_qod_active"] = True
        incident_manager.add_incident(
            truck_id=truck_id,
            incident_type="QOD_MANUAL",
            description="QoD activado manualmente desde el panel de control.",
            lat=lat, lon=lon
        )
        logger.info("[server] QoD manual activado")

    elif event_id == "sim_swap":
        incident_manager.add_incident(
            truck_id=truck_id,
            incident_type="SIM_SWAP",
            description="Simulación: SIM swap detectado por Nokia NaC checkSimSwap.",
            lat=lat, lon=lon
        )
        _active_truck["status"] = "ALERT"
        logger.info("[server] Evento SIM swap simulado")

    elif event_id == "route_deviation":
        incident_manager.add_incident(
            truck_id=truck_id,
            incident_type="ROUTE_DEVIATION",
            description="Simulación: camión fuera del radio de la ruta esperada.",
            lat=lat, lon=lon
        )
        logger.info("[server] Evento desvío de ruta simulado")

    else:
        return jsonify({"success": False, "error": f"Evento desconocido: {event_id}"}), 400

    return jsonify({"success": True, "eventId": event_id})


@app.post("/api/delivery/complete")
def complete_delivery():
    """Flujo 4 — El conductor confirma llegada al destino."""
    t = _active_truck
    try:
        result = _run_async(
            run_confirm_arrival(
                t["truck_id"], t["phone_number"],
                t["lat"], t["lon"],
                t["lat_destino"], t["lon_destino"],
            )
        )
        if result.get("status") == "ARRIVED":
            _active_truck["status"] = "COMPLETED"
            incident_manager.add_incident(
                truck_id=t["truck_id"],
                incident_type="DELIVERY_COMPLETED",
                description="Entrega confirmada en destino por Nokia NaC.",
                lat=t["lat_destino"], lon=t["lon_destino"],
            )
        return jsonify({"success": True, "result": result})
    except Exception as e:
        logger.error(f"[server] Error en /delivery/complete: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ── Arranque ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("FleetSync AI — Backend API en http://localhost:8000")
    app.run(host="0.0.0.0", port=8000, debug=False)
