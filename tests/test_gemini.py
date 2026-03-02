"""
test_gemini.py — Tests de Gemini con datos simulados del MCP Nokia NaC (dump real)
No requiere conexión Nokia. Usa respuestas con la estructura REAL de Nokia para aislar el modelo.

Estructuras reales Nokia:
  checkSimSwap       → {"swapped": true/false}
  verifyLocation     → {"verificationResult": "TRUE"/"FALSE", "lastLocationTime": "..."}
  getRoamingStatus   → {"roaming": true/false, "countryCode": N, "countryName": [...]}
  retrieveLocation   → {"lastLocationTime": "...", "area": {"areaType": "CIRCLE",
                         "center": {"latitude": X, "longitude": Y}, "radius": N}}

Ejecutar: python tests/test_gemini.py
"""
import sys
import os
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.gemini_agent import evaluate

def ok(msg):     print(f"  [OK]   {msg}")
def fail(msg):   print(f"  [FAIL] {msg}")
def header(msg): print(f"\n{'='*55}\n  {msg}\n{'='*55}")

# System prompt base para seguridad de conductor
SECURITY_SYSTEM_PROMPT = """
Eres FleetSync AI, experto en seguridad logística.
Recibirás resultados de la API Nokia Network as Code (CAMARA).

Reglas de decisión:
- checkSimSwap.swapped=true → STATUS: ALERT, reason: SIM_SWAP
- verifyLocation.verificationResult="FALSE" → STATUS: ALERT, reason: GPS_SPOOFING
- getRoamingStatus.roaming=true → STATUS: WARNING, reason: ROAMING_DETECTED
- Todo OK → STATUS: SECURE, reason: ALL_CHECKS_PASSED

Prioridad: SIM_SWAP > GPS_SPOOFING > ROAMING > SECURE
Responde únicamente en JSON: {"status": "...", "reason": "..."}
"""


# ---------------------------------------------------------------------------

def test_viaje_normal():
    header("TEST 1 — Viaje normal (todo OK)")
    mcp_dump = {
        "checkSimSwap": {"swapped": False},
        "verifyLocation": {
            "verificationResult": "TRUE",
            "lastLocationTime": "2026-03-02T10:00:00Z"
        },
        "getRoamingStatus": {"roaming": False},
    }
    result = evaluate(
        prompt=(
            f"Evalúa la seguridad del conductor del camión TRK-001.\n"
            f"Teléfono: +99999991000 | GPS declarado: 40.4168, -3.7038 (Madrid)\n"
            f"Resultados Nokia NaC MCP:\n{json.dumps(mcp_dump, indent=2)}"
        ),
        system_prompt=SECURITY_SYSTEM_PROMPT
    )
    print(f"  Respuesta Gemini: {json.dumps(result, ensure_ascii=False)}")
    if result.get("status") == "SECURE":
        ok("Gemini devuelve SECURE correctamente")
    else:
        fail(f"Esperado SECURE, obtenido: {result.get('status')}")


def test_sim_swap():
    header("TEST 2 — SIM Swap detectado")
    mcp_dump = {
        "checkSimSwap": {"swapped": True},
        "verifyLocation": {
            "verificationResult": "TRUE",
            "lastLocationTime": "2026-03-02T10:00:00Z"
        },
        "getRoamingStatus": {"roaming": False},
    }
    result = evaluate(
        prompt=(
            f"Evalúa la seguridad del conductor del camión TRK-002.\n"
            f"Teléfono: +99999991000 | GPS declarado: 40.4168, -3.7038\n"
            f"Resultados Nokia NaC MCP:\n{json.dumps(mcp_dump, indent=2)}"
        ),
        system_prompt=SECURITY_SYSTEM_PROMPT
    )
    print(f"  Respuesta Gemini: {json.dumps(result, ensure_ascii=False)}")
    if result.get("status") == "ALERT" and result.get("reason") == "SIM_SWAP":
        ok("Gemini devuelve ALERT por SIM_SWAP correctamente")
    else:
        fail(f"Esperado ALERT/SIM_SWAP, obtenido: {result}")


def test_gps_spoofing():
    header("TEST 3 — GPS Spoofing (GPS declarado ≠ ubicación red móvil)")
    mcp_dump = {
        "checkSimSwap": {"swapped": False},
        "verifyLocation": {
            "verificationResult": "FALSE",
            "lastLocationTime": "2026-03-02T10:00:00Z"
        },
        "retrieveLocation": {
            "lastLocationTime": "2026-03-02T10:00:00Z",
            "area": {
                "areaType": "CIRCLE",
                "center": {"latitude": 47.4863, "longitude": 19.0792},
                "radius": 1000
            }
        },
    }
    result = evaluate(
        prompt=(
            f"Evalúa la seguridad del conductor del camión TRK-003.\n"
            f"Teléfono: +99999991000 | GPS declarado: 40.4168, -3.7038 (Madrid)\n"
            f"AVISO: La red móvil sitúa el dispositivo en Budapest (lat:47.48, lon:19.07)\n"
            f"Resultados Nokia NaC MCP:\n{json.dumps(mcp_dump, indent=2)}"
        ),
        system_prompt=SECURITY_SYSTEM_PROMPT
    )
    print(f"  Respuesta Gemini: {json.dumps(result, ensure_ascii=False)}")
    if result.get("status") == "ALERT" and result.get("reason") == "GPS_SPOOFING":
        ok("Gemini devuelve ALERT por GPS_SPOOFING correctamente")
    else:
        fail(f"Esperado ALERT/GPS_SPOOFING, obtenido: {result}")


def test_qod_activacion():
    header("TEST 4 — Decisión QoD (viaje largo Madrid → Barcelona)")
    # Nokia no tiene calculate_distance; usamos retrieveLocation de origen y destino
    # para que Gemini decida si la distancia justifica activar QoD
    mcp_dump = {
        "retrieveLocation_origin": {
            "area": {"center": {"latitude": 40.4168, "longitude": -3.7038}}
        },
        "destination": {
            "latitude": 41.3851, "longitude": 2.1734, "name": "Barcelona"
        },
        "estimated_distance_km": 621,  # distancia real Madrid-Barcelona
    }
    result = evaluate(
        prompt=(
            f"El camión TRK-004 va a iniciar un viaje.\n"
            f"Origen: Madrid (40.4168, -3.7038)\n"
            f"Destino: Barcelona (41.3851, 2.1734)\n"
            f"Resultados Nokia NaC MCP:\n{json.dumps(mcp_dump, indent=2)}\n"
            f"¿Se debe activar QoD para priorizar la conexión durante el viaje?"
        ),
        system_prompt=(
            "Eres FleetSync AI. Decides si activar Quality of Service on Demand (QoD) de Nokia NaC.\n"
            "Reglas:\n"
            "- Si estimated_distance_km > 50 → activar QoD, STATUS: QOD_ACTIVATED\n"
            "- Si estimated_distance_km <= 50 → no necesario, STATUS: QOD_NOT_REQUIRED\n"
            "Responde JSON con {\"status\": \"...\", \"reason\": \"...\", \"qod_duration_seconds\": N}.\n"
            "qod_duration_seconds = distancia_km * 60 (aprox 1 min por km)."
        )
    )
    print(f"  Respuesta Gemini: {json.dumps(result, ensure_ascii=False)}")
    if result.get("status") == "QOD_ACTIVATED":
        ok("Gemini activa QoD para viaje largo correctamente")
    else:
        fail(f"Esperado QOD_ACTIVATED, obtenido: {result.get('status')}")


def test_desvio_ruta():
    header("TEST 5 — Desvío de ruta detectado")
    # verifyLocation con el área de la ruta esperada devuelve FALSE → el camión está fuera
    mcp_dump = {
        "verifyLocation_route_area": {
            "verificationResult": "FALSE",
            "lastLocationTime": "2026-03-02T11:30:00Z"
        },
        "retrieveLocation": {
            "lastLocationTime": "2026-03-02T11:30:00Z",
            "area": {
                "areaType": "CIRCLE",
                "center": {"latitude": 41.1200, "longitude": -1.5000},
                "radius": 1000
            }
        },
        "route_expected_area": {
            "center": {"latitude": 41.6500, "longitude": -0.8900},
            "radius_meters": 5000,
            "description": "Autopista A-2 km 320"
        },
    }
    result = evaluate(
        prompt=(
            f"Monitorización del camión TRK-005 en ruta Madrid → Zaragoza.\n"
            f"Posición actual por red móvil: lat 41.12, lon -1.50\n"
            f"Posición esperada en ruta: lat 41.65, lon -0.89\n"
            f"Resultados Nokia NaC MCP:\n{json.dumps(mcp_dump, indent=2)}"
        ),
        system_prompt=(
            "Eres FleetSync AI monitorizando una ruta activa.\n"
            "Reglas:\n"
            "- Si verifyLocation_route_area.verificationResult='FALSE' → camión fuera de ruta, STATUS: ROUTE_DEVIATION\n"
            "- Si verifyLocation_route_area.verificationResult='TRUE' → en ruta, STATUS: ON_ROUTE\n"
            "Responde JSON con {\"status\": \"...\", \"reason\": \"...\", \"action\": \"...\"}."
        )
    )
    print(f"  Respuesta Gemini: {json.dumps(result, ensure_ascii=False)}")
    if result.get("status") == "ROUTE_DEVIATION":
        ok("Gemini detecta desvío de ruta correctamente")
    else:
        fail(f"Esperado ROUTE_DEVIATION, obtenido: {result.get('status')}")


def test_llegada_destino():
    header("TEST 6 — Confirmación de llegada al destino")
    # verifyLocation con radio pequeño en destino devuelve TRUE → llegó
    mcp_dump = {
        "verifyLocation_destination": {
            "verificationResult": "TRUE",
            "lastLocationTime": "2026-03-02T15:45:00Z"
        },
        "retrieveLocation": {
            "lastLocationTime": "2026-03-02T15:45:00Z",
            "area": {
                "areaType": "CIRCLE",
                "center": {"latitude": 41.3851, "longitude": 2.1734},
                "radius": 150
            }
        },
        "destination": {
            "latitude": 41.3851, "longitude": 2.1734,
            "name": "Barcelona - Centro Logístico",
            "verification_radius_meters": 300
        },
        "checkSimSwap": {"swapped": False},
    }
    result = evaluate(
        prompt=(
            f"El conductor del camión TRK-006 indica que ha llegado al destino.\n"
            f"Destino: Barcelona Centro Logístico (41.3851, 2.1734)\n"
            f"La red móvil sitúa el dispositivo a ~150m del destino.\n"
            f"Resultados Nokia NaC MCP:\n{json.dumps(mcp_dump, indent=2)}"
        ),
        system_prompt=(
            "Eres FleetSync AI confirmando la llegada a destino.\n"
            "Reglas:\n"
            "- Si verifyLocation_destination.verificationResult='TRUE' Y checkSimSwap.swapped=false → STATUS: ARRIVED\n"
            "- Si verifyLocation_destination.verificationResult='TRUE' Y checkSimSwap.swapped=true → STATUS: ALERT (conductor sospechoso)\n"
            "- Si verifyLocation_destination.verificationResult='FALSE' → STATUS: NOT_ARRIVED\n"
            "Responde JSON con {\"status\": \"...\", \"reason\": \"...\", \"confirmed_at\": \"...\" (ISO timestamp)}."
        )
    )
    print(f"  Respuesta Gemini: {json.dumps(result, ensure_ascii=False)}")
    if result.get("status") == "ARRIVED":
        ok("Gemini confirma llegada correctamente")
    else:
        fail(f"Esperado ARRIVED, obtenido: {result.get('status')}")


# ---------------------------------------------------------------------------

def main():
    print("\nFleetSync AI — Tests Gemini con datos Nokia NaC reales (simulados)")
    print("(No requiere conexión Nokia — datos hardcodeados con estructura real)\n")

    test_viaje_normal()
    test_sim_swap()
    test_gps_spoofing()
    test_qod_activacion()
    test_desvio_ruta()
    test_llegada_destino()

    print(f"\n{'='*55}\n  Tests Gemini finalizados\n{'='*55}\n")


if __name__ == "__main__":
    main()
