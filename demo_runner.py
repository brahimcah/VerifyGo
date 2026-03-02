import time
import json
import sys
import os

from backend.ai_agent import start_journey, evaluate_truck_status, activate_journey_qod, confirm_arrival

def print_step(msg):
    print(f"\n[+] {msg}")
    time.sleep(2)

def run_perfect_journey():
    print("\n=== ESCENARIO 1: Viaje Perfecto (Todo OK) ===")
    truck_id = "TRK-200"
    phone = "+99999991000"
    route = "Madrid -> Valencia"
    lat_mad, lon_mad = 40.4168, -3.7038
    lat_val, lon_val = 39.4699, -0.3763
    
    print_step("1. Solicitando autorización de inicio de ruta (Flujo 1)...")
    res1 = start_journey(truck_id, phone, lat_mad, lon_mad, route)
    print(json.dumps(res1, indent=2))
    
    print_step("2. Evaluando perfil QoD para el viaje (Flujo 2)...")
    res2 = activate_journey_qod(truck_id, phone, lat_mad, lon_mad, lat_val, lon_val)
    print(json.dumps(res2, indent=2))
    
    print_step("3. Simulando ruta en progreso. Evaluación de seguridad constante (Flujo 3)...")
    res3 = evaluate_truck_status(truck_id, phone, 40.0, -3.0) 
    print(json.dumps(res3, indent=2))
    
    print_step("4. Camión llega a destino. Confirmando llegada de conductor y carga (Flujo 4)...")
    res4 = confirm_arrival(truck_id, phone, lat_val, lon_val)
    print(json.dumps(res4, indent=2))
    print("\n=== Escenario Completado ===")

def run_spoofing_attack():
    print("\n=== ESCENARIO 2: Ataque Spoofing (Conductor no está en el camión) ===")
    truck_id = "TRK-102"
    phone = "+34600123000" # Número con 000 simulado para test_location=False
    route = "Sevilla -> Córdoba"
    lat, lon = 37.3828, -5.9731

    print_step("1. Iniciando ruta. El conductor reporta estar en el camión a través de la app...")
    print_step("2. FleetSync AI cruza la telemetría IoT del camión con la API Location de Nokia NaC...")
    res = start_journey(truck_id, phone, lat, lon, route)
    print(json.dumps(res, indent=2))
    
    print_step("3. Resultado: Permiso DENEGADO por discrepancia de red (Posible clonación o inhibición).")
    print("\n=== Escenario Completado ===")

def run_route_deviation():
    print("\n=== ESCENARIO 3: Desvío de Ruta (Incidencia en vivo) ===")
    truck_id = "TRK-900"
    phone = "+34600123456"
    route = "Bilbao -> Zaragoza"
    lat, lon = 43.2630, -2.9350
    
    print_step("1. El viaje comienza normalmente de forma segura...")
    res1 = start_journey(truck_id, phone, lat, lon, route)
    print(json.dumps(res1, indent=2))
    
    print_step("2. Tres horas después en zona de sombra... El camión notifica desviación crítica de ruta...")
    # Simulate status check
    res2 = evaluate_truck_status(truck_id, phone, lat + 1.0, lon + 1.0)
    print(json.dumps(res2, indent=2))
    
    print_step("3. FleetSync AI activa el protocolo de emergencia, solicitando video 4K (QoD).")
    print("\n=== Escenario Completado ===")

def main():
    while True:
        print("\n" + "="*60)
        print("🚛 FLEETSYNC AI - SIMULADOR COREOGRÁFICO DE PITCH (5 MIN)")
        print("="*60)
        print("[1] Ejecutar Escenario: Viaje Perfecto (Todo OK)")
        print("[2] Ejecutar Escenario: Ataque Spoofing (Conductor no está en el camión)")
        print("[3] Ejecutar Escenario: Desvío de Ruta (Incidencia en vivo)")
        print("[4] Salir")
        
        choice = input("\nSelecciona un escenario para la Demo [1-4]: ")
        
        if choice == '1':
            run_perfect_journey()
        elif choice == '2':
            run_spoofing_attack()
        elif choice == '3':
            run_route_deviation()
        elif choice == '4':
            print("Saliendo del simulador...")
            break
        else:
            print("Opción no válida. Por favor, selecciona del 1 al 4.")

if __name__ == "__main__":
    main()
