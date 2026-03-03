"""
backend/user_manager.py — Gestión de usuarios (en memoria).
"""

_users: dict[str, dict] = {
    "+99999991000": {
        "phone_number": "+99999991000",
        "name": "Carlos Rodríguez",
        "actor_id": "#AGT-8821",
        "actor_type": "Human",
        "truck_id": "TRK-001",
        "rating": 4.9,
        "route": {
            "origin":      {"name": "Madrid",    "lat": 40.4168, "lon": -3.7038},
            "destination": {"name": "Barcelona", "lat": 41.3851, "lon":  2.1734},
            "waypoints": [
                {"lat": 40.4168, "lon": -3.7038},
                {"lat": 40.7,    "lon": -1.5   },
                {"lat": 41.3851, "lon":  2.1734},
            ],
            "distance_km": 621,
        },
    },
    "+99999991001": {
        "phone_number": "+99999991001",
        "name": "Ana García",
        "actor_id": "#AGT-5542",
        "actor_type": "Human",
        "truck_id": "TRK-002",
        "rating": 4.7,
        "route": {
            "origin":      {"name": "Barcelona", "lat": 41.3825, "lon":  2.1769},
            "destination": {"name": "Zaragoza",  "lat": 41.6488, "lon": -0.8891},
            "waypoints": [
                {"lat": 41.3825, "lon":  2.1769},
                {"lat": 41.5,    "lon":  0.5   },
                {"lat": 41.6488, "lon": -0.8891},
            ],
            "distance_km": 296,
        },
    },
}


def login(phone_number: str) -> dict | None:
    """Devuelve el usuario si el número existe, None si no."""
    return _users.get(phone_number)


def get_all() -> list[dict]:
    return list(_users.values())
