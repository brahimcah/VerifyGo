# FleetSync AI — Guía de Implementación por Flujos

> Stack: Python · Nokia Network as Code (RapidAPI) · MCP (FastMCP) · Gemini 2.5 Flash · Streamlit
> Equipo: 4 personas — 1 flujo por persona
> Plazo: 2 días

---

## Arquitectura: Monolito Modular

```
VerifyGo/
├── mcp_server/
│   └── server.py              # MCP Nokia CAMARA — todas las tools de red
├── backend/
│   ├── ai_agent.py            # Agente Gemini — orquesta los flujos
│   ├── route_monitor.py       # Estado de viajes activos + loop periódico (NUEVO)
│   └── incident_manager.py    # Almacén de incidencias en memoria (NUEVO)
└── frontend/
    └── app.py                 # Dashboard Streamlit
```

**Regla de comunicación:**
```
frontend/app.py
    → llama funciones síncronas de backend/ai_agent.py
        → ai_agent.py abre sesión MCP y llama tools de server.py
        → ai_agent.py llama a Gemini con los resultados
    → lee incidencias de incident_manager.py
```

**MCP Nokia — endpoint base:**
```
https://sandbox.networkascode.nokia.com
Variable de entorno requerida: NOKIA_API_KEY (Bearer token)
```

---

## Bugs conocidos corregidos

1. **`verify_location` duplicada en `server.py`** — eliminada la primera definición
2. **`activate_emergency_qod` fuera de sesión MCP en `ai_agent.py`** — movida dentro del bloque `async with ClientSession`

---

## Tools disponibles en `server.py`

| Tool | Tipo | Flujo |
|---|---|---|
| `check_number_verification(phone_number)` | Simulada | 1 |
| `check_sim_swap(phone_number)` | Simulada | 1 |
| `verify_location(phone_number, lat, lon, max_distance)` | Nokia API real | 1, 3, 4 |
| `activate_emergency_qod(phone_number, duration)` | Simulada | 2, 3, 4 |
| `verify_truck_chip_location(truck_id, lat, lon, max_distance)` | Simulada | 1, 4 |
| `calculate_distance(lat1, lon1, lat2, lon2)` | Local (Haversine) | 2, 4 |
| `check_route_deviation(current_lat, current_lon, route_json, max_m)` | Local (Haversine) | 3 |
| `create_incident(truck_id, type, description, lat, lon)` | Local | 3, 4 |

---

---

# FLUJO 1 — Inicio de Conducción

**Responsable:** Persona 1
**Archivos:** `mcp_server/server.py` + `backend/ai_agent.py`

### Objetivo
Verificar identidad y ubicación del conductor y del camión antes de autorizar el inicio del viaje.

### Pasos

```
Entrada: truck_id, phone_number, lat_inicio, lon_inicio, route=[{lat,lon}...]

PASO 1 — check_number_verification(phone_number)
  → ¿El número existe y es válido en la red Nokia?

PASO 2 — check_sim_swap(phone_number)
  → ¿La SIM fue cambiada recientemente? (true = peligro)

PASO 3 — verify_location(phone_number, lat_inicio, lon_inicio, 500)
  → Nokia confirma: ¿el conductor está físicamente en el punto de inicio?

PASO 4 — verify_truck_chip_location(truck_id, lat_inicio, lon_inicio, 500)
  → Nokia confirma: ¿el chip del camión está en el mismo punto?

PASO 5 — Gemini evalúa los 4 resultados:
  Todo OK                    → AUTHORIZED
  sim_swap = true            → DENIED (razón: SIM_SWAP)
  verify_location = false    → DENIED (razón: DRIVER_NOT_AT_START)
  truck_chip = false         → DENIED (razón: TRUCK_NOT_AT_START)
  number_invalid             → DENIED (razón: INVALID_NUMBER)

PASO 6 — Si AUTHORIZED:
  route_monitor.add_journey(truck_id, phone, route, destination=route[-1])
  → Disparar Flujo 2
  → Arrancar Flujo 3
```

### Salida JSON
```json
{
  "status": "AUTHORIZED" | "DENIED",
  "reason": "...",
  "checks": {
    "number_valid": true,
    "sim_safe": true,
    "driver_location_ok": true,
    "truck_location_ok": true
  },
  "network_logs": { "verify_location": "...", "truck_chip": "..." }
}
```

### Función en `ai_agent.py`
```python
def start_journey(truck_id, phone_number, lat_inicio, lon_inicio, route):
    return asyncio.run(run_journey_start(truck_id, phone_number, lat_inicio, lon_inicio, route))
```

---

---

# FLUJO 2 — Prioridad de Red Nokia QoD

**Responsable:** Persona 2
**Archivos:** `mcp_server/server.py` + `backend/ai_agent.py`

### Objetivo
Justo tras el AUTHORIZED del Flujo 1, calcular la distancia total y activar QoD de Nokia de forma proactiva para garantizar banda ancha prioritaria durante el viaje.

> Nokia NaC NO tiene API de "consultar congestión". El QoD se activa proactivamente según criterios del viaje.

### Pasos

```
Entrada: truck_id, phone_number, lat_inicio, lon_inicio, lat_destino, lon_destino

PASO 1 — calculate_distance(lat_inicio, lon_inicio, lat_destino, lon_destino)
  → distancia total del trayecto en km

PASO 2 — Decisión interna (sin Nokia):
  > 100 km  → QoD obligatorio, duration = 14400s (4h)
  > 50 km   → QoD obligatorio, duration = 7200s  (2h)
  > 20 km   → QoD recomendado, duration = 3600s  (1h)
  <= 20 km  → QoD opcional

PASO 3 — Si criterio cumplido:
  activate_emergency_qod(phone_number, duration)
  → Nokia reserva ancho de banda prioritario para el dispositivo
  → Garantiza telemetría continua + cámaras sin cortes

PASO 4 — Gemini devuelve resumen:
  QOD_ACTIVATED | QOD_NOT_REQUIRED
```

### Salida JSON
```json
{
  "status": "QOD_ACTIVATED" | "QOD_NOT_REQUIRED",
  "distance_km": 85.4,
  "qod_duration_seconds": 7200,
  "reason": "...",
  "network_logs": { "qod_activation": "..." }
}
```

### Función en `ai_agent.py`
```python
def activate_journey_qod(truck_id, phone_number, lat_inicio, lon_inicio, lat_destino, lon_destino):
    return asyncio.run(run_qod_activation(truck_id, phone_number, lat_inicio, lon_inicio, lat_destino, lon_destino))
```

---

---

# FLUJO 3 — Monitorización Periódica de Ruta

**Responsable:** Persona 3
**Archivos:** `mcp_server/server.py` + `backend/route_monitor.py` + `backend/incident_manager.py`

### Objetivo
Loop en segundo plano que verifica periódicamente la posición del camión. Si detecta que el conductor no coincide con el GPS o que se salió de la ruta, genera incidencia y activa QoD de emergencia.

### Pasos

```
Se arranca tras AUTHORIZED del Flujo 1.
Loop cada X segundos (defecto: 60s) por cada truck en status ACTIVE.

Lee posición actual → (current_lat, current_lon)

PASO 1 — verify_location(phone_number, current_lat, current_lon, 300)
  → ¿El móvil del conductor coincide con el GPS del camión?

PASO 2 — check_route_deviation(current_lat, current_lon, route_json, 500)
  → ¿El camión está a más de 500m de la ruta planificada?

Si verify_location = FALSE:
  PASO 3a — create_incident(truck_id, "LOCATION_MISMATCH", desc, lat, lon)
  PASO 3b — activate_emergency_qod(phone_number, 3600)
  PASO 3c — active_journeys[truck_id].status = "ALERT"
  PASO 3d — Detener loop para ese truck

Si check_route_deviation.deviated = TRUE:
  PASO 3a — create_incident(truck_id, "ROUTE_DEVIATION", desc, lat, lon)
  PASO 3b — activate_emergency_qod(phone_number, 1800)
  PASO 3c — incident_manager.add_incident(...)
  (loop continúa)

Si todo OK → registrar check en log, continuar
```

### Estructura `route_monitor.py`
```python
active_journeys = {}
# { truck_id: { phone, route, destination, status, started_at, completed_at, incidents[] } }

def add_journey(truck_id, phone_number, route, destination): ...
def get_journey(truck_id): ...
def complete_journey(truck_id): ...
def set_journey_alert(truck_id): ...
def get_all_active(): ...
```

### Estructura `incident_manager.py`
```python
incidents = []
# [{ incident_id, truck_id, incident_type, description, location, severity, status, created_at }]

def add_incident(incident_data): ...
def get_all(): ...
def get_by_truck(truck_id): ...
```

### Funciones en `ai_agent.py`
```python
def check_periodic_location(truck_id, phone_number, current_lat, current_lon, route_json):
    """Un ciclo del loop. Streamlit llama esto manualmente para la demo."""
    return asyncio.run(run_periodic_check(truck_id, phone_number, current_lat, current_lon, route_json))
```

---

---

# FLUJO 4 — Confirmación de Llegada a Destino

**Responsable:** Persona 4
**Archivos:** `backend/ai_agent.py` + `frontend/app.py`

### Objetivo
El conductor pulsa "He llegado". Verificar via Nokia que conductor y camión están en el destino. Cerrar el viaje y parar la monitorización.

### Pasos

```
Entrada: truck_id, phone_number, lat_actual, lon_actual
Precondición: active_journeys[truck_id].status == "ACTIVE"

PASO 1 — calculate_distance(lat_actual, lon_actual, destino.lat, destino.lon)
  → ¿A cuántos metros está del destino esperado?

PASO 2 — verify_location(phone_number, lat_actual, lon_actual, 300)
  → Nokia: ¿el conductor está físicamente en el destino?

PASO 3 — verify_truck_chip_location(truck_id, lat_actual, lon_actual, 300)
  → Nokia: ¿el chip del camión también llegó al destino?

PASO 4 — Gemini evalúa:

  CASO A — distancia < 300m AND conductor OK AND camión OK:
    → STATUS: ARRIVED
    → create_incident(truck_id, "DELIVERY_COMPLETED", ..., lat, lon)
    → active_journeys[truck_id].status = "COMPLETED"
    → active_journeys[truck_id].completed_at = now()
    → stop_monitoring(truck_id)

  CASO B — conductor OK, camión NO en destino:
    → STATUS: ALERT
    → create_incident(truck_id, "LOCATION_MISMATCH_AT_DESTINATION", ..., lat, lon)
    → activate_emergency_qod(phone_number, 1800)
    → status sigue "ALERT", loop Flujo 3 continúa

  CASO C — distancia >= 300m (aún no llegó):
    → STATUS: NOT_ARRIVED
    → retornar distancia restante, no crear incidencia
```

### Salida JSON
```json
{
  "status": "ARRIVED" | "ALERT" | "NOT_ARRIVED",
  "distance_to_destination_meters": 120,
  "reason": "...",
  "checks": {
    "driver_at_destination": true,
    "truck_at_destination": true
  }
}
```

### Función en `ai_agent.py`
```python
def confirm_arrival(truck_id, phone_number, lat_actual, lon_actual):
    return asyncio.run(run_arrival_confirmation(truck_id, phone_number, lat_actual, lon_actual))
```

### Sección en `frontend/app.py`
```
Inputs: truck_id, phone_number, lat_actual, lon_actual
Botón: "Confirmar Llegada"
Output:
  ARRIVED      → st.success("Entrega completada y verificada")
  NOT_ARRIVED  → st.info(f"Aún a {distance}m del destino")
  ALERT        → st.error("Discrepancia de ubicación en destino")
```

---

---

## Orden de integración recomendado

```
Día 1:
  1. Corregir bugs en server.py y ai_agent.py
  2. Persona 1: Flujo 1 + verify_truck_chip_location en server.py
  3. Persona 2: Flujo 2 + calculate_distance en server.py

Día 2 (mañana):
  4. Persona 3: route_monitor.py + incident_manager.py + Flujo 3
                + check_route_deviation y create_incident en server.py
  5. Persona 4: Flujo 4 + tabs del frontend

Día 2 (tarde):
  6. Integración final en ai_agent.py
  7. Demo y escenarios de prueba
```

---

## Escenarios de demo

| Escenario | Cómo simular | Resultado esperado |
|---|---|---|
| Viaje normal | Número normal, truck_id normal | AUTHORIZED → QoD → ARRIVED |
| SIM Swap | Número terminado en `999` | DENIED Flujo 1 |
| Camión no en inicio | truck_id terminado en `000` | DENIED Flujo 1 |
| Desvío de ruta | Coords fuera de ruta en Flujo 3 | Incidencia ROUTE_DEVIATION + QoD |
| Conductor ≠ camión en ruta | Número terminado en `000` en Flujo 3 | Incidencia LOCATION_MISMATCH + QoD |
| Llegada correcta | Coords en destino, todo OK | ARRIVED + viaje cerrado |
| Llegada con alerta | Conductor OK, truck_id `000` en Flujo 4 | ALERT + QoD |
