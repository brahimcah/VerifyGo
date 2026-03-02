import asyncio
import os
import logging
import json
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# Estructura de datos en memoria para el Flujo 3
active_journeys = {}

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_monitor_journey(truck_id):
    server_params = StdioServerParameters(
        command="python",
        args=["mcp_server/server.py"],
        env=os.environ.copy()
    )

    try:
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                
                logger.info(f"Starting journey monitor for {truck_id}")
                
                while active_journeys.get(truck_id, {}).get("status") == "ACTIVE":
                    journey_data = active_journeys[truck_id]
                    phone_number = journey_data.get("phone_number")
                    current_lat = journey_data.get("current_lat")
                    current_lon = journey_data.get("current_lon")
                    route_waypoints = journey_data.get("route_waypoints", "[]")
                    
                    try:
                        # 1. Verificar ubicación
                        res_loc = await session.call_tool("verify_location", {
                            "phone_number": phone_number,
                            "lat": float(current_lat),
                            "lon": float(current_lon),
                            "max_distance": 500
                        })
                        loc_result_json = json.loads(res_loc.content[0].text)
                        is_location_verified = loc_result_json.get("verificationResult", False)

                        # Si verificación de ubicación falla:
                        if not is_location_verified:
                            logger.error(f"ALERT: Location verification failed for {truck_id}")
                            
                            # Crear incidente
                            await session.call_tool("create_incident", {
                                "truck_id": truck_id,
                                "incident_type": "LOCATION_MISMATCH",
                                "description": "Discrepancia crítica entre GPS e red celular.",
                                "lat": current_lat,
                                "lon": current_lon
                            })
                            
                            # Activar QoD de emergencia (3600s)
                            await session.call_tool("activate_emergency_qod", {
                                "phone_number": phone_number,
                                "duration": 3600
                            })
                            
                            # Actualizar estado y detener loop
                            active_journeys[truck_id]["status"] = "ALERT"
                            break

                        # 2. Verificar desviación de ruta
                        res_dev = await session.call_tool("check_route_deviation", {
                            "current_lat": float(current_lat),
                            "current_lon": float(current_lon),
                            "route_waypoints_json": route_waypoints,
                            "max_deviation_meters": 500
                        })
                        dev_result_json = json.loads(res_dev.content[0].text)
                        
                        if dev_result_json.get("is_deviated", False):
                            logger.warning(f"WARNING: Route deviation detected for {truck_id}")
                            
                            # Crear incidente
                            await session.call_tool("create_incident", {
                                "truck_id": truck_id,
                                "incident_type": "ROUTE_DEVIATION",
                                "description": "El camión se desvió de la ruta planeada.",
                                "lat": current_lat,
                                "lon": current_lon
                            })
                            
                            # Activar QoD de precaución (1800s)
                            await session.call_tool("activate_emergency_qod", {
                                "phone_number": phone_number,
                                "duration": 1800
                            })
                            # Continúa el loop...

                    except Exception as loop_err:
                        logger.error(f"Error during monitor loop iteration: {loop_err}")
                    
                    # Esperar 60 segundos antes de la próxima comprobación
                    await asyncio.sleep(60)

    except Exception as connection_err:
        logger.error(f"Error connecting to MCP server in monitor loop: {connection_err}")

def monitor_journey(truck_id):
    """
    Función de entrada para iniciar el loop de monitorización
    (normalmente se lanzaría en un hilo o task asíncrona dedicada).
    """
    asyncio.run(run_monitor_journey(truck_id))
