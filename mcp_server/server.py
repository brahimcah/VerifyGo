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

import os
import requests
import json

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
