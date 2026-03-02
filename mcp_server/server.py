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

import math

@mcp.tool()
def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> str:
    """
    Calcula la distancia entre dos puntos (lat1, lon1) y (lat2, lon2) usando la fórmula de Haversine.
    Devuelve la distancia en metros y kilómetros.
    """
    R = 6371.0 # Radio de la Tierra en km

    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)

    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad

    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    distance_km = R * c
    distance_meters = distance_km * 1000

    return json.dumps({
        "distance_meters": round(distance_meters, 2),
        "distance_km": round(distance_km, 2)
    })

@mcp.tool()
def verify_truck_chip_location(truck_id: str, lat: float, lon: float, max_distance: int) -> str:
    """
    Verifica si el chip integrado en el camión reporta la misma ubicación
    (simulando la comprobación cruzada de IoT del camión).
    """
    match = False if truck_id.endswith("000") else True
    return json.dumps({
        "truck_id": truck_id,
        "verificationResult": match
    })

@mcp.tool()
def check_route_deviation(current_lat: float, current_lon: float, route_waypoints_json: str, max_deviation_meters: int) -> str:
    """
    Verifica si la ubicación actual del camión (current_lat, current_lon) se ha desviado
    más del max_deviation_meters de alguno de los puntos de la ruta (route_waypoints_json).
    Simulación para el Hackathon.
    """
    # Parseamos la ruta
    try:
        waypoints = json.loads(route_waypoints_json)
        # Lógica simulada: Si max_deviation_meters es menor a un valor hardcodeado (ej 100) simulamos desvío
        # Si no, miramos si la lista está vacía, etc...
        # Para la demo, lo haremos muy simple: Si la lat/lon actual es "0, 0", siempre es desvío.
        is_deviated = False
        
        # Iteramos (simulado)
        if current_lat == 0 and current_lon == 0:
            is_deviated = True
            
        return json.dumps({
            "is_deviated": is_deviated,
            "checked_against_waypoints": len(waypoints)
        })
    except Exception as e:
         return json.dumps({
            "error": f"Error parsing route: {str(e)}"
        })

import uuid
import sys
import os

# Agregamos backend al path para poder importar incident_manager
# Esto es un workaround para el Hackathon, habitualmente se usaría base de datos.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

try:
    import incident_manager
except ImportError:
    pass # Si falla al cargar (ej. no está en el path esperado), ignoramos en la compilación.

@mcp.tool()
def create_incident(truck_id: str, incident_type: str, description: str, lat: float, lon: float) -> str:
    """
    Crea un incidente y lo guarda en la memoria.
    Retorna el estado OPEN y el ID del incidente.
    """
    incident_id = f"INC-{uuid.uuid4().hex[:8].upper()}"
    incident = {
        "id": incident_id,
        "truck_id": truck_id,
        "type": incident_type,
        "description": description,
        "lat": lat,
        "lon": lon,
        "status": "OPEN"
    }
    
    try:
        incident_manager.incidents.append(incident)
    except NameError:
        # Fallback si no pudo importar incident_manager
        pass
        
    return json.dumps(incident)

if __name__ == "__main__":
    mcp.run()
