"""
test_incident_and_monitor.py — Tests unitarios de incident_manager y route_monitor.

Ejecutar: python tests/test_incident_and_monitor.py
Pytest:   pytest tests/test_incident_and_monitor.py -v
"""
import sys
import os
import json
import pytest
from contextlib import asynccontextmanager
from unittest.mock import MagicMock, patch

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import incident_manager
from backend.route_monitor import (
    run_monitor_journey,
    _min_distance_to_route_km,
    active_journeys,
)


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def reset_state():
    """Limpia estado global antes y después de cada test."""
    incident_manager.incidents.clear()
    active_journeys.clear()
    yield
    incident_manager.incidents.clear()
    active_journeys.clear()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _mcp_response(data: dict) -> MagicMock:
    content = MagicMock()
    content.text = json.dumps(data)
    result = MagicMock()
    result.content = [content]
    return result


def _nokia_session_mock(tool_responses: dict):
    """Mock de nokia_nac_session que devuelve respuestas predefinidas."""
    @asynccontextmanager
    async def _mock():
        session = MagicMock()
        async def call_tool(name, params=None):
            return _mcp_response(tool_responses.get(name, {}))
        session.call_tool = call_tool
        yield session
    return _mock


def _setup_journey(truck_id, status="ACTIVE", lat=40.4168, lon=-3.7038, waypoints=None):
    active_journeys[truck_id] = {
        "phone_number": "+99999991000",
        "route_waypoints": json.dumps(waypoints or [{"lat": lat, "lon": lon}]),
        "status": status,
        "current_lat": lat,
        "current_lon": lon,
    }


# ══════════════════════════════════════════════════════════════════════════════
# Tests — incident_manager
# ══════════════════════════════════════════════════════════════════════════════

def test_add_incident_returns_correct_fields():
    inc = incident_manager.add_incident("TRK-001", "GPS_SPOOFING", "Test", 40.4, -3.7)
    assert inc["truck_id"] == "TRK-001"
    assert inc["type"] == "GPS_SPOOFING"
    assert inc["status"] == "OPEN"
    assert inc["id"].startswith("INC-")
    assert "created_at" in inc


def test_add_incident_generates_unique_ids():
    inc1 = incident_manager.add_incident("TRK-001", "GPS_SPOOFING", "a", 0, 0)
    inc2 = incident_manager.add_incident("TRK-001", "SIM_SWAP", "b", 0, 0)
    assert inc1["id"] != inc2["id"]


def test_get_all_returns_all_incidents():
    incident_manager.add_incident("TRK-001", "GPS_SPOOFING", "a", 0, 0)
    incident_manager.add_incident("TRK-002", "SIM_SWAP", "b", 0, 0)
    assert len(incident_manager.get_all()) == 2


def test_get_all_empty():
    assert incident_manager.get_all() == []


def test_get_by_truck_filters_correctly():
    incident_manager.add_incident("TRK-001", "GPS_SPOOFING", "a", 0, 0)
    incident_manager.add_incident("TRK-001", "SIM_SWAP", "b", 0, 0)
    incident_manager.add_incident("TRK-002", "ROUTE_DEVIATION", "c", 0, 0)

    assert len(incident_manager.get_by_truck("TRK-001")) == 2
    assert len(incident_manager.get_by_truck("TRK-002")) == 1
    assert len(incident_manager.get_by_truck("TRK-999")) == 0


def test_close_incident_changes_status():
    inc = incident_manager.add_incident("TRK-001", "SIM_SWAP", "test", 0, 0)
    assert incident_manager.close_incident(inc["id"]) is True
    assert incident_manager.get_all()[0]["status"] == "CLOSED"


def test_close_incident_returns_false_if_not_found():
    assert incident_manager.close_incident("INC-NOTEXIST") is False


def test_close_incident_only_closes_target():
    inc1 = incident_manager.add_incident("TRK-001", "GPS_SPOOFING", "a", 0, 0)
    inc2 = incident_manager.add_incident("TRK-001", "SIM_SWAP", "b", 0, 0)
    incident_manager.close_incident(inc1["id"])
    assert incident_manager.get_all()[0]["status"] == "CLOSED"
    assert incident_manager.get_all()[1]["status"] == "OPEN"


# ══════════════════════════════════════════════════════════════════════════════
# Tests — _min_distance_to_route_km
# ══════════════════════════════════════════════════════════════════════════════

def test_distance_empty_waypoints_returns_zero():
    assert _min_distance_to_route_km(40.4, -3.7, []) == 0.0


def test_distance_same_point_returns_zero():
    waypoints = [{"lat": 40.4168, "lon": -3.7038}]
    assert _min_distance_to_route_km(40.4168, -3.7038, waypoints) == pytest.approx(0.0, abs=0.001)


def test_distance_picks_nearest_waypoint():
    # Punto en Madrid, un waypoint en Madrid y otro en Barcelona
    waypoints = [
        {"lat": 40.4168, "lon": -3.7038},  # Madrid (~0 km)
        {"lat": 41.3851, "lon": 2.1734},    # Barcelona (~500 km)
    ]
    dist = _min_distance_to_route_km(40.4168, -3.7038, waypoints)
    assert dist == pytest.approx(0.0, abs=0.001)


def test_distance_detects_deviation_over_500m():
    waypoints = [{"lat": 40.4168, "lon": -3.7038}]
    dist = _min_distance_to_route_km(40.5, -3.7, waypoints)
    assert dist > 0.5


def test_distance_within_route_under_500m():
    # Punto muy cercano (~100m de diferencia)
    waypoints = [{"lat": 40.4168, "lon": -3.7038}]
    dist = _min_distance_to_route_km(40.4169, -3.7039, waypoints)
    assert dist < 0.5


# ══════════════════════════════════════════════════════════════════════════════
# Tests — run_monitor_journey (loop)
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_loop_stops_if_journey_not_active():
    """Si status != ACTIVE el loop no hace ninguna llamada Nokia."""
    _setup_journey("TRK-M01", status="COMPLETED")

    with patch("backend.route_monitor.nokia_nac_session") as mock_nokia, \
         patch("backend.route_monitor.evaluate") as mock_eval:
        await run_monitor_journey("TRK-M01", check_interval=0)

    mock_nokia.assert_not_called()
    mock_eval.assert_not_called()


@pytest.mark.asyncio
async def test_loop_stops_if_truck_missing():
    """Si el truck_id no existe en active_journeys, el loop para inmediatamente."""
    with patch("backend.route_monitor.nokia_nac_session") as mock_nokia:
        await run_monitor_journey("TRK-GHOST", check_interval=0)
    mock_nokia.assert_not_called()


@pytest.mark.asyncio
async def test_on_route_no_incident_created():
    """ON_ROUTE: no se crea incidencia. El evaluate detiene el loop poniendo COMPLETED."""
    _setup_journey("TRK-M02")

    nokia_responses = {
        "retrieveLocation": {"area": {"center": {"latitude": 40.4168, "longitude": -3.7038}}},
        "verifyLocation":   {"verificationResult": "TRUE"},
        "checkSimSwap":     {"swapped": False},
    }

    # El evaluate marca COMPLETED para detener el loop tras la primera iteración
    def mock_evaluate(prompt, system_prompt):
        active_journeys["TRK-M02"]["status"] = "COMPLETED"
        return {"status": "ON_ROUTE", "reason": "POSITION_VERIFIED", "action": "Continue."}

    with patch("backend.route_monitor.nokia_nac_session", _nokia_session_mock(nokia_responses)), \
         patch("backend.route_monitor.evaluate", side_effect=mock_evaluate):
        await run_monitor_journey("TRK-M02", check_interval=0)

    assert len(incident_manager.get_by_truck("TRK-M02")) == 0


@pytest.mark.asyncio
async def test_alert_gps_spoofing_creates_incident_and_stops():
    """GPS_SPOOFING: crea incidencia, pone status=ALERT y para el loop."""
    _setup_journey("TRK-M03")

    nokia_responses = {
        "retrieveLocation":     {"area": {"center": {"latitude": 47.48, "longitude": 19.07}}},
        "verifyLocation":       {"verificationResult": "FALSE"},
        "checkSimSwap":         {"swapped": False},
        "createSession-QoD-V1": {"sessionId": "qod-123"},
    }
    gemini_result = {"status": "ALERT", "reason": "GPS_SPOOFING", "action": "Bloquear."}

    with patch("backend.route_monitor.nokia_nac_session", _nokia_session_mock(nokia_responses)), \
         patch("backend.route_monitor.evaluate", return_value=gemini_result):
        await run_monitor_journey("TRK-M03", check_interval=0)

    incidents = incident_manager.get_by_truck("TRK-M03")
    assert len(incidents) == 1
    assert incidents[0]["type"] == "GPS_SPOOFING"
    assert incidents[0]["status"] == "OPEN"
    assert active_journeys["TRK-M03"]["status"] == "ALERT"


@pytest.mark.asyncio
async def test_alert_sim_swap_creates_incident_and_stops():
    """SIM_SWAP: crea incidencia, pone status=ALERT y para el loop."""
    _setup_journey("TRK-M04")

    nokia_responses = {
        "retrieveLocation":     {"area": {"center": {"latitude": 40.4, "longitude": -3.7}}},
        "verifyLocation":       {"verificationResult": "TRUE"},
        "checkSimSwap":         {"swapped": True},
        "createSession-QoD-V1": {"sessionId": "qod-456"},
    }
    gemini_result = {"status": "ALERT", "reason": "SIM_SWAP", "action": "Alertar."}

    with patch("backend.route_monitor.nokia_nac_session", _nokia_session_mock(nokia_responses)), \
         patch("backend.route_monitor.evaluate", return_value=gemini_result):
        await run_monitor_journey("TRK-M04", check_interval=0)

    incidents = incident_manager.get_by_truck("TRK-M04")
    assert len(incidents) == 1
    assert incidents[0]["type"] == "SIM_SWAP"
    assert active_journeys["TRK-M04"]["status"] == "ALERT"


@pytest.mark.asyncio
async def test_alert_route_deviation_creates_incident_continues():
    """ROUTE_DEVIATION: crea incidencia pero NO para el loop (riesgo no crítico)."""
    _setup_journey("TRK-M05")

    nokia_responses = {
        "retrieveLocation":     {"area": {"center": {"latitude": 40.4, "longitude": -3.7}}},
        "verifyLocation":       {"verificationResult": "TRUE"},
        "checkSimSwap":         {"swapped": False},
        "createSession-QoD-V1": {"sessionId": "qod-789"},
    }

    # Primera llamada → ROUTE_DEVIATION (no para el loop por sí solo)
    # Segunda llamada → marcamos COMPLETED para detener el loop
    call_count = {"n": 0}
    def mock_evaluate(prompt, system_prompt):
        call_count["n"] += 1
        if call_count["n"] >= 2:
            active_journeys["TRK-M05"]["status"] = "COMPLETED"
        return {"status": "ALERT", "reason": "ROUTE_DEVIATION", "action": "Notificar."}

    with patch("backend.route_monitor.nokia_nac_session", _nokia_session_mock(nokia_responses)), \
         patch("backend.route_monitor.evaluate", side_effect=mock_evaluate):
        await run_monitor_journey("TRK-M05", check_interval=0)

    incidents = incident_manager.get_by_truck("TRK-M05")
    # Al menos 1 incidencia creada (puede ser 2 si corrió 2 iteraciones)
    assert len(incidents) >= 1
    assert incidents[0]["type"] == "ROUTE_DEVIATION"
    # El loop paró por COMPLETED, NO por ALERT
    assert active_journeys["TRK-M05"]["status"] == "COMPLETED"


@pytest.mark.asyncio
async def test_mcp_error_does_not_crash_loop():
    """Si Nokia MCP falla, el loop captura el error y no lanza excepción."""
    _setup_journey("TRK-M06")

    @asynccontextmanager
    async def failing_session():
        # El error ocurre al entrar al context manager
        active_journeys["TRK-M06"]["status"] = "COMPLETED"
        raise ConnectionError("Nokia MCP no disponible")
        yield  # nunca llega

    # No debe propagar la excepción
    with patch("backend.route_monitor.nokia_nac_session", failing_session):
        await run_monitor_journey("TRK-M06", check_interval=0)

    assert len(incident_manager.get_by_truck("TRK-M06")) == 0


# ── Ejecución directa ─────────────────────────────────────────────────────────

async def _run_all():
    import inspect

    tests_sync = [
        test_add_incident_returns_correct_fields,
        test_add_incident_generates_unique_ids,
        test_get_all_returns_all_incidents,
        test_get_all_empty,
        test_get_by_truck_filters_correctly,
        test_close_incident_changes_status,
        test_close_incident_returns_false_if_not_found,
        test_close_incident_only_closes_target,
        test_distance_empty_waypoints_returns_zero,
        test_distance_same_point_returns_zero,
        test_distance_picks_nearest_waypoint,
        test_distance_detects_deviation_over_500m,
        test_distance_within_route_under_500m,
    ]
    tests_async = [
        test_loop_stops_if_journey_not_active,
        test_loop_stops_if_truck_missing,
        test_on_route_no_incident_created,
        test_alert_gps_spoofing_creates_incident_and_stops,
        test_alert_sim_swap_creates_incident_and_stops,
        test_alert_route_deviation_creates_incident_continues,
        test_mcp_error_does_not_crash_loop,
    ]

    print("\nFleetSync AI — Tests incident_manager + route_monitor\n")
    passed = failed = 0

    for fn in tests_sync:
        incident_manager.incidents.clear()
        active_journeys.clear()
        try:
            fn()
            print(f"  [OK]   {fn.__name__}")
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {fn.__name__} → {e}")
            failed += 1

    for fn in tests_async:
        incident_manager.incidents.clear()
        active_journeys.clear()
        try:
            await fn()
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
