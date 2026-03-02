import asyncio
import os
import json
import logging
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv() # Carga las variables de entorno de .env (GEMINI_API_KEY, NOKIA_API_KEY, etc.)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_mcp_evaluation(truck_id, phone_number, reported_lat, reported_lon):
    server_params = StdioServerParameters(
        command="python",
        args=["mcp_server/server.py"],
        env=os.environ.copy()
    )

    try:
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                
                logger.info("Calling MCP tools...")
                
                try:
                    # Llamamos a las herramientas del servidor MCP que simulan las APIs de CAMARA
                    res_nv = await session.call_tool("check_number_verification", {"phone_number": phone_number})
                    res_ss = await session.call_tool("check_sim_swap", {"phone_number": phone_number})
                    res_loc = await session.call_tool("verify_location", {
                        "phone_number": phone_number, 
                        "lat": float(reported_lat), 
                        "lon": float(reported_lon), 
                        "max_distance": 5000
                    })

                    nv_result = res_nv.content[0].text
                    ss_result = res_ss.content[0].text
                    loc_result = res_loc.content[0].text
                except Exception as mcp_err:
                    logger.error(f"Error executing MCP tools: {mcp_err}")
                    return {
                        "status": "UNKNOWN",
                        "reason": f"Error de comunicación con el servidor MCP de red: {mcp_err}"
                    }
                
                logger.info(f"MCP NV: {nv_result}, SS: {ss_result}, LOC: {loc_result}")

            system_prompt = """Eres FleetSync AI, un sistema experto en ciberseguridad logística. Tu objetivo es evaluar el riesgo de secuestro de camiones. Se te darán las coordenadas GPS reportadas por el camión y el número de móvil del conductor. DEBES usar la herramienta de verificación de ubicación de la red telco. 
Reglas de decisión:
- Si la red confirma que el móvil está en esas coordenadas -> STATUS: SECURE.
- Si la red dice que NO coinciden -> STATUS: ALERT. Esto significa que el hardware GPS del camión está siendo inhibido o falseado.
- Si el STATUS es ALERT (robo detectado), DEBES ejecutar inmediatamente la herramienta activate_emergency_qod para priorizar el ancho de banda del camión y permitir la transmisión de las cámaras de seguridad en 4K hacia la central.
- NUNCA asumas que el camión está seguro sin usar la herramienta de red."""
            
            prompt = f"""
            Evalúa la seguridad del camión {truck_id}.
            Datos reportados por el GPS del camión:
            - Teléfono del conductor: {phone_number}
            - GPS Lat, Lon: {reported_lat}, {reported_lon}
            
            Resultados obtenidos de las herramientas telco (Nokia CAMARA APIs a través de MCP):
            - check_number_verification: {nv_result}
            - check_sim_swap: {ss_result}
            - verify_location: {loc_result}
            
            Devuelve un JSON estrictamente con el siguiente formato:
            {{"status": "SECURE" o "ALERT", "reason": "Tu razonamiento técnico de máximo 3 frases."}}
            """
            
            try:
                # Intentar conectar con Gemini
                client = genai.Client()
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        response_mime_type="application/json",
                    ),
                )
                
                # Devolvemos la decisión de la IA y además los logs crudos para la interfaz "Consola de Red"
                result_json = json.loads(response.text)
                result_json["network_logs"] = {
                    "verify_location": loc_result
                }
                
                # Segunda API: si es un alert, llamamos al QoD
                if result_json.get("status") == "ALERT":
                    logger.info("Executing Emergency QoD API for video streaming...")
                    res_qod = await session.call_tool("activate_emergency_qod", {"phone_number": phone_number, "duration": 3600})
                    result_json["network_logs"]["qod_activation"] = res_qod.content[0].text
                    
                return result_json
                
            except Exception as e:
                logger.error(f"Error calling Gemini AI: {e}. Returning fallback analysis.")
                # Fallback if API key is not set or another error occurs
                status = "SECURE"
                reason = "El vehículo opera normalmente. Los parámetros de red coinciden con la telemetría."
                
                if "true" in str(ss_result).lower() or "sim swap" in str(ss_result).lower():
                    status = "ALERT"
                    reason = "ALERTA CRÍTICA: Se ha detectado un SIM Swap reciente en el número del conductor, posible secuestro de comunicaciones."
                elif "false" in str(loc_result).lower() or "error" in str(loc_result).lower():
                    status = "ALERT"
                    reason = "ALERTA CRÍTICA: Discrepancia entre el GPS del camión y la ubicación de la red móvil (Posible spoofing GPS, inhibidor o fallo de endpoint)."
                
                return {
                    "status": status,
                    "reason": reason,
                    "network_logs": {"verify_location": loc_result}
                }
    except Exception as connection_err:
        logger.error(f"Error de conexión global con el proceso MCP: {connection_err}")
        return {
            "status": "UNKNOWN",
            "reason": f"Error crítico al intentar levantar o conectar con el servidor local MCP: {connection_err}"
        }

def evaluate_truck_status(truck_id, phone_number, reported_lat, reported_lon):
    """
    Función síncrona para ser utilizada desde la interfaz de Streamlit.
    """
    return asyncio.run(run_mcp_evaluation(truck_id, phone_number, reported_lat, reported_lon))

if __name__ == "__main__":
    # Prueba de concepto rápida
    print("Test Normal:")
    print(evaluate_truck_status("TRK-100", "+34600123456", 40.4168, -3.7038))
    
    print("\\nTest Ataque (SIM Swap):")
    print(evaluate_truck_status("TRK-101", "+34600123999", 40.4168, -3.7038))
    
    print("\\nTest Ataque (GPS Spoofing):")
    print(evaluate_truck_status("TRK-102", "+34600123000", 40.4168, -3.7038))
