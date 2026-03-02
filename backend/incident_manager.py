"""
incident_manager.py — Gestión de incidencias en memoria.
Usado por route_monitor y ai_agent para registrar y consultar incidencias.
"""
import uuid
from datetime import datetime, timezone

# Almacén en memoria (para hackathon; en producción sería una BD)
incidents: list[dict] = []


def add_incident(truck_id: str, incident_type: str, description: str,
                 lat: float, lon: float) -> dict:
    incident = {
        "id": f"INC-{uuid.uuid4().hex[:8].upper()}",
        "truck_id": truck_id,
        "type": incident_type,
        "description": description,
        "lat": lat,
        "lon": lon,
        "status": "OPEN",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    incidents.append(incident)
    return incident


def get_all() -> list[dict]:
    return incidents


def get_by_truck(truck_id: str) -> list[dict]:
    return [i for i in incidents if i["truck_id"] == truck_id]


def close_incident(incident_id: str) -> bool:
    for i in incidents:
        if i["id"] == incident_id:
            i["status"] = "CLOSED"
            return True
    return False
