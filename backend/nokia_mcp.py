import os
from contextlib import asynccontextmanager
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client
from dotenv import load_dotenv

load_dotenv()


def _nokia_nac_headers():
    return {
        "x-api-host": os.environ["NOKIA_NAC_API_HOST"],
        "x-api-key": os.environ["NOKIA_NAC_API_KEY"],
    }


@asynccontextmanager
async def nokia_nac_session():
    """
    Abre una sesión MCP con Nokia Network as Code via Streamable HTTP (RapidAPI).
    El servidor Nokia usa JSON-RPC sobre HTTP (protocolo MCP v0.1.7+),
    no SSE. Se conecta directamente al MCP de Nokia en la nube.

    Variables de entorno requeridas en .env:
        NOKIA_NAC_API_KEY  → tu RapidAPI key de Nokia NaC
        NOKIA_NAC_API_HOST → network-as-code.nokia.rapidapi.com
        NOKIA_NAC_MCP_URL  → https://mcp-eu.rapidapi.com
    """
    url = os.environ["NOKIA_NAC_MCP_URL"]
    async with streamablehttp_client(url=url, headers=_nokia_nac_headers()) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            yield session
