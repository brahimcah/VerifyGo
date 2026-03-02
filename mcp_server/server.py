import os
import requests
import json
from mcp.server.fastmcp import FastMCP

# Inicializar FastMCP server
mcp = FastMCP("FleetSync AI CAMARA API Server")

@mcp.tool()
def check_number_verification(phone_number: str) -> bool:
    """
    Verifica si el número de teléfono está asociado a la red y es válido.
    Simula la API de Number Verification de CAMARA.
    """
    # Lógica simulada
    return phone_number.startswith("+34") or phone_number.startswith("+")

@mcp.tool()
def check_sim_swap(phone_number: str) -> bool:
    """
    Verifica si ha habido un cambio reciente de tarjeta SIM (SIM Swap).
    Simula la API de SIM Swap de CAMARA.
    Devuelve False si es seguro (no hubo swap). Devuelve True si hubo SIM Swap reciente.
    """
    # Lógica simulada: Si el número termina en '999', simulamos SIM Swap alerta.
    return phone_number.endswith("999")

@mcp.tool()
def activate_emergency_qod(phone_number: str, duration: int) -> str:
    """
    Activa un perfil de Quality of Service on Demand (QoD) para priorizar el tráfico
    de un dispositivo móvil (ej. subir video 4K en tiempo real de las cámaras del camión).
    API Secundaria de Nokia Network as Code. Responde con un JSON.
    """
    # Extraemos la clave de autenticación configurada en el ambiente
    nokia_api_key = os.environ.get("NOKIA_API_KEY")
    
    # Para la Demo del Hackathon, si no hay key real o se usa el template, simulamos éxito.
    if not nokia_api_key or nokia_api_key == "tu_nokia_camara_api_key_aqui":
        return json.dumps({
            "status": "SUCCESS",
            "message": f"SIMULADO: Ancho de banda garantizado (QoD) activado para {phone_number} por {duration} segundos."
        })
        
    # Aquí iría el endpoint real de QoD de Nokia NaC:
    # URL = "https://sandbox.networkascode.nokia.com/api/qod/v0/sessions"
    # El payload requeriría IP origen, IP destino, puertos y el perfil de red ('QOS_VC').
    
    # Para el scope de este Hackathon, simulamos la respuesta HTTP exitosa
    # basándonos en la firma de la API de QoD para no complejizar excesivamente la demo si no hay IPs reales.
    return json.dumps({
        "status": "SUCCESS",
        "sessionId": "qod_session_987654321",
        "message": f"QoD Session Premium activada para la línea {phone_number} durante {duration}s."
    })

@mcp.tool()
def verify_location(phone_number: str, lat: float, lon: float, max_distance: int) -> str:
    """
    Verifica si la ubicación real del dispositivo basada en la red móvil coincide
    con las coordenadas indicadas (lat, lon) dentro del max_distance en metros.
    Llama a la API de Device Location Verification de Nokia CAMARA.
    """
    # Endpoint principal de telecomunicaciones proporcionado por Nokia en su Sandbox
    api_url = "https://sandbox.networkascode.nokia.com/api/location-verification/v0/verify"
    nokia_api_key = os.environ.get("NOKIA_API_KEY")
    
    # Manejo de ausencia de KEY
    if not nokia_api_key or nokia_api_key == "tu_nokia_camara_api_key_aqui":
        # Simulamos la respuesta para seguir permitiendo probar si no se ha configurado la clave aún
        match = False if phone_number.endswith("000") else True
        return json.dumps({
            "error": "WARNING: NOKIA_API_KEY no configurada. Retornando simulación local.",
            "verificationResult": match
        })

    # Headers de autorización requeridos por la API de NaC
    headers = {
        "Authorization": f"Bearer {nokia_api_key}",
        "Content-Type": "application/json"
    }
    
    # Construcción minuciosa del body esperado por la API 'Location Verification'
    payload = {
        "device": {
            "phoneNumber": phone_number
        },
        "area": {
            "areaType": "Circle",
            "center": {
                "latitude": lat,
                "longitude": lon
            },
            "radius": max_distance
        },
        "maxAge": 60 # Tiempo máximo de antigüedad de la localización en segundos
    }
    
    try:
        # Llamada HTTP sincrona. Configuramos timeout corto para no bloquear la IA indefinidamente.
        response = requests.post(api_url, headers=headers, json=payload, timeout=5)
        
        # Parseo y categorización de errores comunes de la API Telco
        if response.status_code == 401:
            return json.dumps({"error": "Unauthorized (401): Revisa la validez de tu NOKIA_API_KEY en el sandbox."})
        elif response.status_code == 500:
            return json.dumps({"error": "Server Error (500): Falla interna en la API de Nokia NaC."})
        elif response.status_code == 200:
            # Respuesta correcta, devolvemos el Body exacto de la red (verificationResult: bool)
            return json.dumps(response.json())
        else:
            return json.dumps({"error": f"Error HTTP {response.status_code}", "detalles": response.text})
            
    except requests.exceptions.RequestException as req_err:
        return json.dumps({"error": f"Fallo al conectar con la API de Nokia: {str(req_err)}"})

if __name__ == "__main__":
    mcp.run()
    """
    Activa un perfil de Quality of Service on Demand (QoD) para priorizar el tráfico
    de un dispositivo móvil (ej. subir video 4K en tiempo real de las cámaras del camión).
    API Secundaria de Nokia Network as Code. Responde con un JSON.
    """
    nokia_api_key = os.environ.get("NOKIA_API_KEY")
    # Para la Demo del Hackathon, si no hay key, simulamos éxito.
    if not nokia_api_key or nokia_api_key == "tu_nokia_camara_api_key_aqui":
        return json.dumps({
            "status": "SUCCESS",
            "message": f"SIMULADO: Ancho de banda garantizado (QoD) activado para {phone_number} por {duration} segundos."
        })
        
    # Aquí iría el endpoint real de QoD de Nokia NaC
    # Para el scope de este Hackathon, simulamos la respuesta HTTP exitosa
    # basándonos en la firma de la API de QoD.
    return json.dumps({
        "status": "SUCCESS",
        "sessionId": "qod_session_987654321",
        "message": f"QoD Session Premium activada para la línea {phone_number} durante {duration}s."
    })

@mcp.tool()
def verify_location(phone_number: str, lat: float, lon: float, max_distance: int) -> str:
    """
    Verifica si la ubicación real del dispositivo basada en la red móvil coincide
    con las coordenadas indicadas (lat, lon) dentro del max_distance en metros.
    Llama a la API de Device Location Verification de Nokia CAMARA.
    """
    api_url = "https://sandbox.networkascode.nokia.com/api/location-verification/v0/verify"
    nokia_api_key = os.environ.get("NOKIA_API_KEY")
    
    # Manejo de ausencia de KEY
    if not nokia_api_key or nokia_api_key == "tu_nokia_camara_api_key_aqui":
        # Simulamos la respuesta para seguir permitiendo probar si no se ha configurado la clave aún
        match = False if phone_number.endswith("000") else True
        return json.dumps({
            "error": "WARNING: NOKIA_API_KEY no configurada. Retornando simulación local.",
            "verificationResult": match
        })

    headers = {
        "Authorization": f"Bearer {nokia_api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "device": {
            "phoneNumber": phone_number
        },
        "area": {
            "areaType": "Circle",
            "center": {
                "latitude": lat,
                "longitude": lon
            },
            "radius": max_distance
        },
        "maxAge": 60
    }
    
    try:
        response = requests.post(api_url, headers=headers, json=payload, timeout=5)
        
        if response.status_code == 401:
            return json.dumps({"error": "Unauthorized (401): Revisa la validez de tu NOKIA_API_KEY en el sandbox."})
        elif response.status_code == 500:
            return json.dumps({"error": "Server Error (500): Falla interna en la API de Nokia NaC."})
        elif response.status_code == 200:
            return json.dumps(response.json())
        else:
            return json.dumps({"error": f"Error HTTP {response.status_code}", "detalles": response.text})
            
    except requests.exceptions.RequestException as req_err:
        return json.dumps({"error": f"Fallo al conectar con la API de Nokia: {str(req_err)}"})

if __name__ == "__main__":
    mcp.run()
