"""
test_mcp.py — Tests de las tools Nokia NaC MCP (nombres y schemas reales)
Cada test abre su propia sesión — compatible con pytest y PyCharm.

Ejecutar directo:  python tests/test_mcp.py
Ejecutar pytest:   pytest tests/test_mcp.py -v
"""
import asyncio
import sys
import os
import json
import pytest

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.nokia_mcp import nokia_nac_session

TEST_PHONE = "+99999991000"
TEST_LAT   = 40.4168
TEST_LON   = -3.7038


# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_tools():
    async with nokia_nac_session() as session:
        tools = await session.list_tools()
        nombres = [t.name for t in tools.tools]
        assert len(nombres) > 0, "No se encontraron tools en Nokia NaC MCP"
        print(f"\n  Tools disponibles ({len(nombres)}): {nombres[:5]}...")


@pytest.mark.asyncio
async def test_check_sim_swap():
    """checkSimSwap — verifica si hubo SIM swap reciente."""
    async with nokia_nac_session() as session:
        res = await session.call_tool("checkSimSwap", {
            "phoneNumber": TEST_PHONE,
            "maxAge": 240
        })
        respuesta = res.content[0].text
        print(f"\n  SIM Swap result: {respuesta}")
        assert respuesta is not None


@pytest.mark.asyncio
async def test_verify_location():
    """verifyLocation — verifica si el dispositivo está en la zona indicada."""
    async with nokia_nac_session() as session:
        res = await session.call_tool("verifyLocation", {
            "device": {"phoneNumber": TEST_PHONE},
            "area": {
                "areaType": "CIRCLE",
                "center": {"latitude": TEST_LAT, "longitude": TEST_LON},
                "radius": 5000
            },
            "maxAge": 60
        })
        respuesta = res.content[0].text
        print(f"\n  verifyLocation result: {respuesta}")
        assert respuesta is not None


@pytest.mark.asyncio
async def test_get_roaming_status():
    """getRoamingStatus — verifica si el dispositivo está en roaming."""
    async with nokia_nac_session() as session:
        res = await session.call_tool("getRoamingStatus", {
            "device": {"phoneNumber": TEST_PHONE}
        })
        respuesta = res.content[0].text
        print(f"\n  Roaming status: {respuesta}")
        assert respuesta is not None


@pytest.mark.asyncio
async def test_retrieve_sim_swap_date():
    """retrieveSimSwapDate — obtiene la fecha del último SIM swap."""
    async with nokia_nac_session() as session:
        res = await session.call_tool("retrieveSimSwapDate", {
            "phoneNumber": TEST_PHONE
        })
        respuesta = res.content[0].text
        print(f"\n  SIM Swap date: {respuesta}")
        assert respuesta is not None


@pytest.mark.asyncio
async def test_retrieve_location():
    """retrieveLocation — obtiene la ubicación actual del dispositivo."""
    async with nokia_nac_session() as session:
        res = await session.call_tool("retrieveLocation", {
            "device": {"phoneNumber": TEST_PHONE},
            "maxAge": 60
        })
        respuesta = res.content[0].text
        print(f"\n  Location: {respuesta}")
        assert respuesta is not None


# ---------------------------------------------------------------------------
# Ejecución directa: python tests/test_mcp.py
# ---------------------------------------------------------------------------

async def _run_all():
    tests = [
        test_list_tools,
        test_check_sim_swap,
        test_verify_location,
        test_get_roaming_status,
        test_retrieve_sim_swap_date,
        test_retrieve_location,
    ]

    print(f"\nFleetSync AI — Tests Nokia NaC MCP (tools reales)")
    print(f"Número de test: {TEST_PHONE}\n")

    passed = failed = 0
    for test_fn in tests:
        try:
            await test_fn()
            print(f"  [OK]   {test_fn.__name__}")
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {test_fn.__name__} → {e}")
            failed += 1

    print(f"\n{'='*55}")
    print(f"  Resultado: {passed} OK  |  {failed} FAIL")
    print(f"{'='*55}\n")


if __name__ == "__main__":
    asyncio.run(_run_all())
