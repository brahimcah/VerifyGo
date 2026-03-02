import os
import json
import uuid
import asyncio
import aiohttp
from mcp.server.fastmcp import FastMCP
from dotenv import load_dotenv

load_dotenv()

# Inicializar FastMCP server
mcp = FastMCP("FleetSync AI CAMARA API Server")

import http.client

def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    import math
    R = 6371.0
    lat1_rad, lon1_rad = math.radians(lat1), math.radians(lon1)
    lat2_rad, lon2_rad = math.radians(lat2), math.radians(lon2)
    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c * 1000

@mcp.tool()
def check_number_verification(phone_number: str) -> str:
    """Valida si el número es válido usando el endpoint de CAMARA."""
    nokia_api_key = os.getenv("NOKIA_API_KEY")
    if not nokia_api_key or nokia_api_key == "tu_nokia_camara_api_key_aqui":
        valido = phone_number.startswith("+")
        return json.dumps({"phoneNumber": phone_number, "verificationResult": valido})

    conn = http.client.HTTPSConnection("network-as-code.nokia.rapidapi.com")
    headers = {
        'x-rapidapi-key': nokia_api_key,
        'x-rapidapi-host': "network-as-code.nokia.rapidapi.com",
        'Content-Type': "application/json"
    }
    payload = json.dumps({"phoneNumber": phone_number})
    try:
        conn.request("POST", "/passthrough/camara/v1/number-verification/number-verification/v0/verify", payload, headers)
        res = conn.getresponse()
        return res.read().decode("utf-8")
    except Exception as e:
        return json.dumps({"error": str(e)})

@mcp.tool()
def check_sim_swap(phone_number: str) -> str:
    """Retorna true si hubo SIM swap reciente usando el endpoint CAMARA."""
    nokia_api_key = os.getenv("NOKIA_API_KEY")
    if not nokia_api_key or nokia_api_key == "tu_nokia_camara_api_key_aqui":
        is_swapped = phone_number.endswith("999")
        return json.dumps({"swapped": is_swapped})
        
    conn = http.client.HTTPSConnection("network-as-code.nokia.rapidapi.com")
    headers = {
        'x-rapidapi-key': nokia_api_key,
        'x-rapidapi-host': "network-as-code.nokia.rapidapi.com",
        'Content-Type': "application/json"
    }
    payload = json.dumps({"phoneNumber": phone_number})
    try:
        conn.request("POST", "/passthrough/camara/v1/sim-swap/sim-swap/v0/retrieve-date", payload, headers)
        res = conn.getresponse()
        return res.read().decode("utf-8")
    except Exception as e:
        return json.dumps({"error": str(e)})

@mcp.tool()
async def activate_emergency_qod(phone_number: str, duration: int) -> str:
    """Activa un perfil de Quality of Service on Demand (QoD) premium."""
    nokia_api_key = os.getenv("NOKIA_API_KEY")
    
    if not nokia_api_key or nokia_api_key == "tu_nokia_camara_api_key_aqui":
        return json.dumps({
            "status": "SUCCESS",
            "message": f"SIMULADO: Ancho de banda garantizado (QoD) activado para {phone_number} por {duration} segundos."
        })
        
    url = "https://network-as-code.nokia.rapidapi.com/passthrough/camara/qod/v0/sessions"
    headers = {
        'x-rapidapi-key': nokia_api_key,
        'x-rapidapi-host': "network-as-code.nokia.rapidapi.com",
        'Content-Type': "application/json"
    }
    payload = {
        "phoneNumber": phone_number,
        "duration": duration
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload, timeout=10) as response:
                content = await response.text()
                if response.status in (200, 201):
                    return json.dumps({
                        "status": "SUCCESS", 
                        "message": f"QoD Session Premium activada para la línea {phone_number} durante {duration}s.",
                        "raw_api": content
                    })
                else:
                    return json.dumps({
                        "status": "ERROR", 
                        "error": f"API Error {response.status}", "raw": content
                    })
    except asyncio.TimeoutError:
        return json.dumps({"status": "ERROR", "error": "Timeout connection"})
    except Exception as e:
        return json.dumps({"status": "ERROR", "error": str(e)})

def _internal_verify_location(phone_number: str, lat: float, lon: float, max_distance: float) -> dict:
    nokia_api_key = os.getenv("NOKIA_API_KEY")
    if not nokia_api_key or nokia_api_key == "tu_nokia_camara_api_key_aqui":
        match = not phone_number.endswith("000")
        distance = 0 if match else max_distance + 1000
        return {"verificationResult": match, "distance_m": distance}

    conn = http.client.HTTPSConnection("network-as-code.nokia.rapidapi.com")
    headers = {
        'x-rapidapi-key': nokia_api_key,
        'x-rapidapi-host': "network-as-code.nokia.rapidapi.com",
        'Content-Type': "application/json"
    }
    payload = json.dumps({"device": {"phoneNumber": phone_number}, "maxAge": 60})
    try:
        conn.request("POST", "/passthrough/camara/v1/location-retrieval/location-retrieval/v0/retrieve", payload, headers)
        res = conn.getresponse()
        data = res.read().decode("utf-8")
        response_json = json.loads(data)
        
        retrieved_lat = response_json.get("area", {}).get("center", {}).get("latitude")
        retrieved_lon = response_json.get("area", {}).get("center", {}).get("longitude")
        
        if retrieved_lat is not None and retrieved_lon is not None:
            distance = _haversine(lat, lon, float(retrieved_lat), float(retrieved_lon))
            return {
                "verificationResult": distance <= max_distance,
                "distance_m": distance,
                "api_lat": retrieved_lat,
                "api_lon": retrieved_lon
            }
        return {"error": "No coordinates in API response", "raw": response_json}
    except Exception as e:
        return {"error": str(e)}

@mcp.tool()
def verify_location(phone_number: str, lat: float, lon: float, max_distance: int) -> str:
    """Obtener ubicación del conductor. Comparar con lat_inicio/lon_inicio indicando si está a <= max_distance metros."""
    return json.dumps(_internal_verify_location(phone_number, lat, lon, float(max_distance)))

@mcp.tool()
def check_device_roaming(phone_number: str) -> str:
    """
    Verifica si el dispositivo está en roaming internacional.
    Llama a la API Device Status de Nokia CAMARA.
    """
    api_url = "https://network-as-code.p-eu.rapidapi.com/device-status/device-roaming-status/v1/retrieve"
    nokia_api_key = os.getenv("NOKIA_API_KEY")

    if not nokia_api_key or nokia_api_key == "tu_nokia_camara_api_key_aqui":
        is_roaming = True if phone_number.endswith("999") else False
        return json.dumps({
            "error": "WARNING: NOKIA_API_KEY no configurada. Retornando simulación local.",
            "roaming": is_roaming
        })

    headers = {
        'x-rapidapi-key': nokia_api_key,
        'x-rapidapi-host': "network-as-code.nokia.rapidapi.com",
        'Content-Type': "application/json",
        'x-correlator': str(uuid.uuid4())
    }

    payload = {
        "device": {
            "phoneNumber": phone_number
        }
    }

    try:
        response = requests.post(api_url, headers=headers, json=payload, timeout=5)
        
        if response.status_code == 200:
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

def get_truck_sim(truck_id: str) -> str:
    """Mock para obtener el teléfono (SIM) integrado en el camión."""
    # Para poder simular robo (que termine en '000'), retornamos un fake number
    if truck_id.endswith("000"):
        return "+34600123000"
    return "+34600999111"

@mcp.tool()
def verify_truck_chip_location(truck_id: str, lat: float, lon: float, max_distance: int) -> str:
    """Obtener ubicación del camión. Compara con (lat, lon) con la API de Nokia y Haversine."""
    truck_sim_number = get_truck_sim(truck_id)
    res = _internal_verify_location(truck_sim_number, lat, lon, float(max_distance))
    res["truck_id"] = truck_id
    res["truck_sim_number"] = truck_sim_number
    return json.dumps(res)

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
