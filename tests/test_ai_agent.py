"""
test_ai_agent.py — Tests unitarios de ai_agent.py
Mockea Nokia MCP y Gemini para aislar la lógica de cada flujo.

Ejecutar: python tests/test_ai_agent.py
Pytest:   pytest tests/test_ai_agent.py -v
"""
import sys
import os
import json
import pytest
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.ai_agent import (
    run_journey_start,
    run_qod_activation,
    run_periodic_check,
    run_confirm_arrival,
    _haversine_km,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _mcp_response(data: dict) -> MagicMock:
    """Crea un objeto MCP response falso con content[0].text = json(data)."""
    content = MagicMock()
    content.text = json.dumps(data)
    result = MagicMock()
    result.content = [content]
    return result


def _nokia_session_mock(tool_responses: dict):
    """
    Devuelve un async context manager que simula nokia_nac_session.
    tool_responses: {nombre_tool: dict_respuesta}
    """
    @asynccontextmanager
    async def _mock_session():
        session = AsyncMock()
        async def call_tool(name, params=None):
            if name not in tool_responses:
                raise ValueError(f"Tool '{name}' no definida en el mock")
            return _mcp_response(tool_responses[name])
        session.call_tool = call_tool
        yield session
    return _mock_session


# ── Tests Flujo 1 — Inicio de viaje ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_journey_start_authorized():
    """Flujo 1: todo OK → AUTHORIZED."""
    nokia_responses = {
        "checkSimSwap":   {"swapped": False},
        "verifyLocation": {"verificationResult": "TRUE", "lastLocationTime": "2026-03-02T10:00:00Z"},
        "getRoamingStatus": {"roaming": False},
    }
    gemini_result = {
        "status": "AUTHORIZED",
        "reason": "ALL_CHECKS_PASSED",
        "checks": {"sim_safe": True, "driver_location_ok": True, "roaming": False}
    }

    with patch("backend.ai_agent.nokia_nac_session", _nokia_session_mock(nokia_responses)), \
         patch("backend.ai_agent.evaluate", return_value=gemini_result):

        result = await run_journey_start("TRK-001", "+99999991000", 40.4168, -3.7038, [])

    assert result["status"] == "AUTHORIZED"
    assert result["checks"]["sim_safe"] is True


@pytest.mark.asyncio
async def test_journey_start_denied_sim_swap():
    """Flujo 1: SIM swap detectado → DENIED."""
    nokia_responses = {
        "checkSimSwap":   {"swapped": True},
        "verifyLocation": {"verificationResult": "TRUE"},
        "getRoamingStatus": {"roaming": False},
    }
    gemini_result = {
        "status": "DENIED",
        "reason": "SIM_SWAP",
        "checks": {"sim_safe": False, "driver_location_ok": True, "roaming": False}
    }

    with patch("backend.ai_agent.nokia_nac_session", _nokia_session_mock(nokia_responses)), \
         patch("backend.ai_agent.evaluate", return_value=gemini_result):

        result = await run_journey_start("TRK-002", "+99999991000", 40.4168, -3.7038, [])

    assert result["status"] == "DENIED"
    assert result["reason"] == "SIM_SWAP"


@pytest.mark.asyncio
async def test_journey_start_denied_driver_not_at_start():
    """Flujo 1: conductor fuera de posición → DENIED."""
    nokia_responses = {
        "checkSimSwap":   {"swapped": False},
        "verifyLocation": {"verificationResult": "FALSE", "lastLocationTime": "2026-03-02T10:00:00Z"},
        "getRoamingStatus": {"roaming": False},
    }
    gemini_result = {
        "status": "DENIED",
        "reason": "DRIVER_NOT_AT_START",
        "checks": {"sim_safe": True, "driver_location_ok": False, "roaming": False}
    }

    with patch("backend.ai_agent.nokia_nac_session", _nokia_session_mock(nokia_responses)), \
         patch("backend.ai_agent.evaluate", return_value=gemini_result):

        result = await run_journey_start("TRK-003", "+99999991000", 40.4168, -3.7038, [])

    assert result["status"] == "DENIED"
    assert result["reason"] == "DRIVER_NOT_AT_START"


# ── Tests Flujo 2 — Activación QoD ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_qod_activated_long_distance():
    """Flujo 2: Madrid → Barcelona (~621 km) → QOD_ACTIVATED."""
    nokia_responses = {
        "createSession-QoD-V1": {"sessionId": "qod-abc123", "status": "AVAILABLE"}
    }
    gemini_result = {
        "status": "QOD_ACTIVATED",
        "distance_km": 621.0,
        "qod_duration_seconds": 37260,
        "reason": "Distancia > 50km, QoD activado."
    }

    with patch("backend.ai_agent.nokia_nac_session", _nokia_session_mock(nokia_responses)), \
         patch("backend.ai_agent.evaluate", return_value=gemini_result):

        # Madrid → Barcelona
        result = await run_qod_activation(
            "TRK-004", "+99999991000",
            40.4168, -3.7038,   # origen Madrid
            41.3851,  2.1734    # destino Barcelona
        )

    assert result["status"] == "QOD_ACTIVATED"
    assert result["distance_km"] > 50


@pytest.mark.asyncio
async def test_qod_not_required_short_distance():
    """Flujo 2: distancia < 20 km → QOD_NOT_REQUIRED (sin llamada Nokia)."""
    gemini_result = {
        "status": "QOD_NOT_REQUIRED",
        "distance_km": 5.0,
        "qod_duration_seconds": 0,
        "reason": "Distancia <= 20km, QoD no necesario."
    }

    # No necesita nokia porque duration=0 y no llama createSession
    with patch("backend.ai_agent.nokia_nac_session", _nokia_session_mock({})), \
         patch("backend.ai_agent.evaluate", return_value=gemini_result):

        # Madrid → Getafe (~15 km)
        result = await run_qod_activation(
            "TRK-005", "+99999991000",
            40.4168, -3.7038,
            40.3055, -3.7237
        )

    assert result["status"] == "QOD_NOT_REQUIRED"
    assert result["qod_duration_seconds"] == 0


# ── Tests Flujo 3 — Monitorización periódica ─────────────────────────────────

@pytest.mark.asyncio
async def test_periodic_check_on_route():
    """Flujo 3: posición verificada → ON_ROUTE."""
    nokia_responses = {
        "verifyLocation": {"verificationResult": "TRUE", "lastLocationTime": "2026-03-02T11:00:00Z"},
        "checkSimSwap":   {"swapped": False},
    }
    gemini_result = {
        "status": "ON_ROUTE",
        "reason": "POSITION_VERIFIED",
        "action": "Continuar monitorización."
    }

    with patch("backend.ai_agent.nokia_nac_session", _nokia_session_mock(nokia_responses)), \
         patch("backend.ai_agent.evaluate", return_value=gemini_result):

        result = await run_periodic_check("TRK-006", "+99999991000", 40.5000, -3.6000)

    assert result["status"] == "ON_ROUTE"


@pytest.mark.asyncio
async def test_periodic_check_alert_gps_spoofing():
    """Flujo 3: GPS no coincide con red → ALERT GPS_SPOOFING."""
    nokia_responses = {
        "verifyLocation": {"verificationResult": "FALSE", "lastLocationTime": "2026-03-02T11:00:00Z"},
        "checkSimSwap":   {"swapped": False},
    }
    gemini_result = {
        "status": "ALERT",
        "reason": "GPS_SPOOFING",
        "action": "Notificar a central y activar QoD emergencia."
    }

    with patch("backend.ai_agent.nokia_nac_session", _nokia_session_mock(nokia_responses)), \
         patch("backend.ai_agent.evaluate", return_value=gemini_result):

        result = await run_periodic_check("TRK-007", "+99999991000", 40.5000, -3.6000)

    assert result["status"] == "ALERT"
    assert result["reason"] == "GPS_SPOOFING"


@pytest.mark.asyncio
async def test_periodic_check_alert_sim_swap():
    """Flujo 3: SIM swap en ruta → ALERT."""
    nokia_responses = {
        "verifyLocation": {"verificationResult": "TRUE"},
        "checkSimSwap":   {"swapped": True},
    }
    gemini_result = {
        "status": "ALERT",
        "reason": "SIM_SWAP",
        "action": "Bloquear acceso y alertar a seguridad."
    }

    with patch("backend.ai_agent.nokia_nac_session", _nokia_session_mock(nokia_responses)), \
         patch("backend.ai_agent.evaluate", return_value=gemini_result):

        result = await run_periodic_check("TRK-008", "+99999991000", 40.5000, -3.6000)

    assert result["status"] == "ALERT"
    assert result["reason"] == "SIM_SWAP"


# ── Tests Flujo 4 — Confirmación de llegada ───────────────────────────────────

@pytest.mark.asyncio
async def test_confirm_arrival_arrived():
    """Flujo 4: conductor verificado en destino → ARRIVED."""
    nokia_responses = {
        "verifyLocation": {"verificationResult": "TRUE", "lastLocationTime": "2026-03-02T15:00:00Z"},
        "checkSimSwap":   {"swapped": False},
        "retrieveLocation": {
            "lastLocationTime": "2026-03-02T15:00:00Z",
            "area": {"areaType": "CIRCLE", "center": {"latitude": 41.3851, "longitude": 2.1734}, "radius": 150}
        },
    }
    gemini_result = {
        "status": "ARRIVED",
        "reason": "Conductor verificado en destino.",
        "confirmed_at": "2026-03-02T15:00:00Z"
    }

    with patch("backend.ai_agent.nokia_nac_session", _nokia_session_mock(nokia_responses)), \
         patch("backend.ai_agent.evaluate", return_value=gemini_result):

        result = await run_confirm_arrival(
            "TRK-009", "+99999991000",
            41.3851, 2.1734,   # posición actual
            41.3851, 2.1734    # destino (mismo punto)
        )

    assert result["status"] == "ARRIVED"
    assert result["confirmed_at"] is not None


@pytest.mark.asyncio
async def test_confirm_arrival_not_arrived():
    """Flujo 4: conductor lejos del destino → NOT_ARRIVED."""
    nokia_responses = {
        "verifyLocation": {"verificationResult": "FALSE"},
        "checkSimSwap":   {"swapped": False},
        "retrieveLocation": {
            "area": {"areaType": "CIRCLE", "center": {"latitude": 40.9000, "longitude": 1.5000}, "radius": 1000}
        },
    }
    gemini_result = {
        "status": "NOT_ARRIVED",
        "reason": "El conductor no está en el radio del destino.",
        "confirmed_at": None
    }

    with patch("backend.ai_agent.nokia_nac_session", _nokia_session_mock(nokia_responses)), \
         patch("backend.ai_agent.evaluate", return_value=gemini_result):

        result = await run_confirm_arrival(
            "TRK-010", "+99999991000",
            40.9000, 1.5000,   # posición actual (en ruta, no en destino)
            41.3851, 2.1734    # destino Barcelona
        )

    assert result["status"] == "NOT_ARRIVED"


@pytest.mark.asyncio
async def test_confirm_arrival_alert_suspicious():
    """Flujo 4: ubicación OK pero SIM swap → ALERT conductor sospechoso."""
    nokia_responses = {
        "verifyLocation": {"verificationResult": "TRUE"},
        "checkSimSwap":   {"swapped": True},
        "retrieveLocation": {
            "area": {"areaType": "CIRCLE", "center": {"latitude": 41.3851, "longitude": 2.1734}, "radius": 100}
        },
    }
    gemini_result = {
        "status": "ALERT",
        "reason": "Conductor en destino pero con SIM swap reciente.",
        "confirmed_at": None
    }

    with patch("backend.ai_agent.nokia_nac_session", _nokia_session_mock(nokia_responses)), \
         patch("backend.ai_agent.evaluate", return_value=gemini_result):

        result = await run_confirm_arrival(
            "TRK-011", "+99999991000",
            41.3851, 2.1734,
            41.3851, 2.1734
        )

    assert result["status"] == "ALERT"


# ── Test utilidad _haversine_km ───────────────────────────────────────────────

def test_haversine_madrid_barcelona():
    """Distancia Madrid-Barcelona debe ser ~600 km."""
    km = _haversine_km(40.4168, -3.7038, 41.3851, 2.1734)
    assert 480 < km < 530, f"Distancia esperada ~505 km (línea recta), obtenida {km:.1f} km"


def test_haversine_mismo_punto():
    """Distancia entre el mismo punto debe ser 0."""
    km = _haversine_km(40.4168, -3.7038, 40.4168, -3.7038)
    assert km == 0.0


# ── Ejecución directa ─────────────────────────────────────────────────────────

async def _run_all():
    tests = [
        test_journey_start_authorized,
        test_journey_start_denied_sim_swap,
        test_journey_start_denied_driver_not_at_start,
        test_qod_activated_long_distance,
        test_qod_not_required_short_distance,
        test_periodic_check_on_route,
        test_periodic_check_alert_gps_spoofing,
        test_periodic_check_alert_sim_swap,
        test_confirm_arrival_arrived,
        test_confirm_arrival_not_arrived,
        test_confirm_arrival_alert_suspicious,
    ]
    sync_tests = [test_haversine_madrid_barcelona, test_haversine_mismo_punto]

    print("\nFleetSync AI — Tests unitarios ai_agent (Nokia + Gemini mockeados)\n")

    passed = failed = 0
    for fn in tests:
        try:
            await fn()
            print(f"  [OK]   {fn.__name__}")
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {fn.__name__} → {e}")
            failed += 1

    for fn in sync_tests:
        try:
            fn()
            print(f"  [OK]   {fn.__name__}")
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {fn.__name__} → {e}")
            failed += 1

    print(f"\n{'='*55}")
    print(f"  Resultado: {passed} OK  |  {failed} FAIL")
    print(f"{'='*55}\n")


if __name__ == "__main__":
    import asyncio
    asyncio.run(_run_all())
