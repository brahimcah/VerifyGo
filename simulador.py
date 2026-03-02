import time
import requests
import json
import logging
import subprocess
import os
import sys

# Script para simular peticiones al backend a través de Streamlit no es tan directo.
# Vamos a importar directamente ai_agent.py y mostrar el resultado en la consola.
# Para interactuar directamente como una demo.

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from backend.ai_agent import evaluate_truck_status

def print_separator(title):
    print(f"\\n{'='*50}")
    print(f" {title} ".center(50, '='))
    print(f"{'='*50}\\n")

def run_simulation():
    print("🚀 Iniciando Simulador de FleetSync AI 🚀")
    time.sleep(1)
    
    # Escenario A (Normal)
    print_separator("Escenario A (Normal): Ruta Segura")
    print("El camión (TRK-001) navega por su ruta habitual. Los sistemas GPS y de red móvil coinciden.")
    
    truck_id_A = "TRK-001"
    phone_A = "+34600123456"  # Número normal
    lat_A = 40.4168
    lon_A = -3.7038
    
    print(f"📡 Enviando telemetría al Agente IA (ID: {truck_id_A}, Tlf: {phone_A}, Pos: {lat_A}, {lon_A})...")
    
    try:
        resultado_A = evaluate_truck_status(truck_id_A, phone_A, lat_A, lon_A)
        print(f"\\n🧠 Decisión de la IA:\\n{json.dumps(resultado_A, indent=2, ensure_ascii=False)}")
    except Exception as e:
        print(f"❌ Error en Escenario A: {e}")
        
    time.sleep(3)

    # Escenario B (Ataque)
    print_separator("Escenario B (Ataque): Posible Inhibidor/Spoofing GPS")
    print("El camión (TRK-002) envía coordenadas GPS normales, pero la antena de Nokia CAMARA dice que el móvil del conductor está a 500km de distancia.")
    
    truck_id_B = "TRK-002"
    phone_B = "+34600123000"  # Número que simula un fallo en 'verify_location'
    lat_B = 41.3851
    lon_B = 2.1734
    
    print(f"📡 Enviando telemetría de posible ataque al Agente IA (ID: {truck_id_B}, Tlf: {phone_B}, Pos: {lat_B}, {lon_B})...")
    
    try:
        resultado_B = evaluate_truck_status(truck_id_B, phone_B, lat_B, lon_B)
        print(f"\\n🚨 Decisión de la IA:\\n{json.dumps(resultado_B, indent=2, ensure_ascii=False)}")
    except Exception as e:
        print(f"❌ Error en Escenario B: {e}")

if __name__ == "__main__":
    run_simulation()
