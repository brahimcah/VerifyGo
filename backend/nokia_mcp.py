import os
from contextlib import asynccontextmanager
from mcp import ClientSession
from mcp.client.sse import sse_client
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
    Abre una sesión MCP con Nokia Network as Code via SSE (RapidAPI).
    Conecta directamente al servidor MCP de Nokia en la nube,
    sin necesidad de levantar un servidor local.

    Variables de entorno requeridas en .env:
        NOKIA_NAC_API_KEY  → tu RapidAPI key de Nokia NaC
        NOKIA_NAC_API_HOST → network-as-code.nokia.rapidapi.com
        NOKIA_NAC_MCP_URL  → https://mcp-eu.rapidapi.com
    """
    url = os.environ["NOKIA_NAC_MCP_URL"]
    async with sse_client(url=url, headers=_nokia_nac_headers()) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            yield session
