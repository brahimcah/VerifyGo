# FleetSync AI — Guía de Implementación por Flujos

> Stack: Python · Nokia Network as Code (RapidAPI) · MCP (FastMCP) · Gemini 2.5 Flash · Streamlit
> Equipo: 4 personas — 1 flujo por persona
> Plazo: 2 días

---

## Arquitectura: Monolito Modular

```
VerifyGo/
├── backend/
│   ├── nokia_mcp.py       # MÓDULO GENERAL — Conexión Nokia NaC MCP via SSE
│   ├── gemini_agent.py    # MÓDULO GENERAL — Cliente Gemini centralizado
│   ├── ai_agent.py        # Flujo 1 — Inicio de conducción
│   ├── route_monitor.py   # Flujo 3 — Monitorización periódica
│   └── incident_manager.py# Estado compartido de incidencias
├── tests/
│   ├── test_mcp.py        # Tests de todas las tools Nokia NaC MCP
│   └── test_gemini.py     # Tests de Gemini con datos simulados
└── frontend/
    └── app.py             # Dashboard Streamlit
```

---

## REGLA OBLIGATORIA para todos los flujos

> **Cada agente/flujo DEBE importar y usar los dos módulos generales.**
> Nunca instanciar `genai.Client()` ni `ClientSession` directamente en el código de cada flujo.

```python
# SIEMPRE importar estos dos módulos en cada flujo
from backend.nokia_mcp import nokia_nac_session   # módulo general MCP
from backend.gemini_agent import evaluate          # módulo general Gemini
```

**Patrón obligatorio en cada flujo:**

```python
from backend.nokia_mcp import nokia_nac_session
from backend.gemini_agent import evaluate

async def run_flujo_X(...):
    # 1. Abrir sesión Nokia y llamar tools
    async with nokia_nac_session() as session:
        res = await session.call_tool("nombre_tool", { ...params... })
        resultado = res.content[0].text

    # 2. Pasar resultados a Gemini
    decision = evaluate(
        prompt=f"Datos Nokia: {resultado} ...",
        system_prompt="Eres FleetSync AI. Reglas: ..."
    )
    return decision
```

---

## Módulos generales

### `backend/nokia_mcp.py`
Abre sesión SSE con Nokia NaC en la nube (RapidAPI). Lee credenciales del `.env`.
```python
from backend.nokia_mcp import nokia_nac_session

async with nokia_nac_session() as session:
    res = await session.call_tool("verify_location", {...})
```
Variables `.env` requeridas:
```
NOKIA_NAC_API_KEY=<tu key RapidAPI>
NOKIA_NAC_API_HOST=network-as-code.nokia.rapidapi.com
NOKIA_NAC_MCP_URL=https://mcp-eu.rapidapi.com
```

### `backend/gemini_agent.py`
Cliente centralizado de Gemini. Recibe prompt + system_prompt, retorna dict JSON.
```python
from backend.gemini_agent import evaluate

decision = evaluate(
    prompt="Datos del camión y resultados Nokia...",
    system_prompt="Eres FleetSync AI. Reglas de decisión..."
)
# decision → {"status": "SECURE", "reason": "..."}
```
Variable `.env` requerida:
```
GEMINI_API_KEY=<tu key Google AI Studio>
```

---

## Tools disponibles en Nokia NaC MCP

| Tool | Flujo |
|---|---|
| `check_number_verification(phone_number)` | 1 |
| `check_sim_swap(phone_number)` | 1 |
| `verify_location(phone_number, lat, lon, max_distance)` | 1, 3, 4 |
| `verify_truck_chip_location(truck_id, lat, lon, max_distance)` | 1, 4 |
| `calculate_distance(lat1, lon1, lat2, lon2)` | 2, 4 |
| `activate_emergency_qod(phone_number, duration)` | 2, 3, 4 |
| `check_route_deviation(current_lat, current_lon, route_json, max_m)` | 3 |
| `create_incident(truck_id, type, description, lat, lon)` | 3, 4 |

---

---

# FLUJO 1 — Inicio de Conducción

**Responsable:** Persona 1
**Archivo:** `backend/ai_agent.py`

### Imports obligatorios
```python
from backend.nokia_mcp import nokia_nac_session
from backend.gemini_agent import evaluate
```

### Objetivo
Verificar identidad y ubicación del conductor y del camión antes de autorizar el inicio del viaje.

### Pasos

```
Entrada: truck_id, phone_number, lat_inicio, lon_inicio, route=[{lat,lon}...]

── Abrir nokia_nac_session() ──────────────────────────────────────

PASO 1 — session.call_tool("check_number_verification", {phone_number})
  → ¿El número existe y es válido en la red Nokia?

PASO 2 — session.call_tool("check_sim_swap", {phone_number})
  → ¿La SIM fue cambiada recientemente? (true = peligro)

PASO 3 — session.call_tool("verify_location", {phone_number, lat, lon, 500})
  → Nokia confirma: ¿el conductor está físicamente en el punto de inicio?

PASO 4 — session.call_tool("verify_truck_chip_location", {truck_id, lat, lon, 500})
  → Nokia confirma: ¿el chip del camión está en el mismo punto?

── Cerrar sesión Nokia ─────────────────────────────────────────────

PASO 5 — evaluate(prompt, system_prompt)
  → Pasar los 4 resultados a Gemini para que tome la decisión
  → Todo OK                    → AUTHORIZED
  → sim_swap = true            → DENIED (razón: SIM_SWAP)
  → verify_location = false    → DENIED (razón: DRIVER_NOT_AT_START)
  → truck_chip = false         → DENIED (razón: TRUCK_NOT_AT_START)
  → number_invalid             → DENIED (razón: INVALID_NUMBER)

PASO 6 — Si AUTHORIZED:
  route_monitor.add_journey(truck_id, phone, route, destination=route[-1])
  → Disparar Flujo 2
  → Arrancar Flujo 3
```

### Código base
```python
from backend.nokia_mcp import nokia_nac_session
from backend.gemini_agent import evaluate

async def run_journey_start(truck_id, phone_number, lat, lon, route):
    async with nokia_nac_session() as session:
        res_nv  = await session.call_tool("check_number_verification", {"phone_number": phone_number})
        res_ss  = await session.call_tool("check_sim_swap", {"phone_number": phone_number})
        res_loc = await session.call_tool("verify_location", {"phone_number": phone_number, "lat": lat, "lon": lon, "max_distance": 500})
        res_trk = await session.call_tool("verify_truck_chip_location", {"truck_id": truck_id, "lat": lat, "lon": lon, "max_distance": 500})

    return evaluate(
        prompt=f"Camión {truck_id}. NV:{res_nv.content[0].text} SS:{res_ss.content[0].text} LOC:{res_loc.content[0].text} CHIP:{res_trk.content[0].text}",
        system_prompt="Eres FleetSync AI. Autoriza o deniega el inicio del viaje según los resultados. Responde JSON {status, reason, checks}."
    )
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
  }
}
```

---

---

# FLUJO 2 — Prioridad de Red Nokia QoD

**Responsable:** Persona 2
**Archivo:** `backend/ai_agent.py`

### Imports obligatorios
```python
from backend.nokia_mcp import nokia_nac_session
from backend.gemini_agent import evaluate
```

### Objetivo
Calcular distancia del trayecto y activar QoD de Nokia proactivamente para garantizar banda ancha prioritaria.

> Nokia NaC NO tiene API de "consultar congestión". El QoD se activa proactivamente según distancia del viaje.

### Pasos

```
Entrada: truck_id, phone_number, lat_inicio, lon_inicio, lat_destino, lon_destino

── Abrir nokia_nac_session() ──────────────────────────────────────

PASO 1 — session.call_tool("calculate_distance", {lat1, lon1, lat2, lon2})
  → distancia total del trayecto en km

PASO 2 — Decisión interna (sin Nokia):
  > 100 km  → duration = 14400s (4h)
  > 50 km   → duration = 7200s  (2h)
  > 20 km   → duration = 3600s  (1h)
  <= 20 km  → QoD opcional

PASO 3 — session.call_tool("activate_emergency_qod", {phone_number, duration})
  → Nokia reserva ancho de banda prioritario para el dispositivo

── Cerrar sesión Nokia ─────────────────────────────────────────────

PASO 4 — evaluate(prompt, system_prompt)
  → Gemini resume la decisión tomada
  → QOD_ACTIVATED | QOD_NOT_REQUIRED
```

### Código base
```python
from backend.nokia_mcp import nokia_nac_session
from backend.gemini_agent import evaluate

async def run_qod_activation(truck_id, phone_number, lat1, lon1, lat2, lon2):
    async with nokia_nac_session() as session:
        res_dist = await session.call_tool("calculate_distance", {"lat1": lat1, "lon1": lon1, "lat2": lat2, "lon2": lon2})
        dist_km = json.loads(res_dist.content[0].text).get("distance_km", 0)

        duration = 7200 if dist_km > 50 else (3600 if dist_km > 20 else 0)
        res_qod = None
        if duration > 0:
            res_qod = await session.call_tool("activate_emergency_qod", {"phone_number": phone_number, "duration": duration})

    return evaluate(
        prompt=f"Distancia: {dist_km}km. QoD activado: {duration}s. Resultado: {res_qod.content[0].text if res_qod else 'No activado'}",
        system_prompt="Eres FleetSync AI. Resume la activación de QoD. Responde JSON {status, distance_km, qod_duration_seconds, reason}."
    )
```

### Salida JSON
```json
{
  "status": "QOD_ACTIVATED" | "QOD_NOT_REQUIRED",
  "distance_km": 85.4,
  "qod_duration_seconds": 7200,
  "reason": "..."
}
```

---

---

# FLUJO 3 — Monitorización Periódica de Ruta

**Responsable:** Persona 3
**Archivo:** `backend/route_monitor.py`

### Imports obligatorios
```python
from backend.nokia_mcp import nokia_nac_session
from backend.gemini_agent import evaluate
```

### Objetivo
Loop que verifica periódicamente la posición del camión. Si detecta desvío o discrepancia conductor/camión, genera incidencia y activa QoD.

### Pasos

```
Loop cada 60s por cada truck en status ACTIVE.

── Abrir nokia_nac_session() ──────────────────────────────────────

PASO 1 — session.call_tool("verify_location", {phone_number, current_lat, current_lon, 300})
  → ¿El móvil del conductor coincide con el GPS?

PASO 2 — session.call_tool("check_route_deviation", {current_lat, current_lon, route_json, 500})
  → ¿El camión está a más de 500m de la ruta?

Si verify_location = FALSE:
  PASO 3a — session.call_tool("create_incident", {truck_id, "LOCATION_MISMATCH", ...})
  PASO 3b — session.call_tool("activate_emergency_qod", {phone_number, 3600})

Si is_deviated = TRUE:
  PASO 3a — session.call_tool("create_incident", {truck_id, "ROUTE_DEVIATION", ...})
  PASO 3b — session.call_tool("activate_emergency_qod", {phone_number, 1800})

── Cerrar sesión Nokia ─────────────────────────────────────────────

PASO 4 — evaluate(prompt, system_prompt)
  → Gemini confirma la incidencia y nivel de severidad
```

### Código base
```python
from backend.nokia_mcp import nokia_nac_session
from backend.gemini_agent import evaluate

async def run_periodic_check(truck_id, phone_number, current_lat, current_lon, route_json):
    async with nokia_nac_session() as session:
        res_loc = await session.call_tool("verify_location", {"phone_number": phone_number, "lat": current_lat, "lon": current_lon, "max_distance": 300})
        res_dev = await session.call_tool("check_route_deviation", {"current_lat": current_lat, "current_lon": current_lon, "route_waypoints_json": route_json, "max_deviation_meters": 500})

        loc_ok  = json.loads(res_loc.content[0].text).get("verificationResult", False)
        deviated = json.loads(res_dev.content[0].text).get("is_deviated", False)

        res_inc = res_qod = None
        if not loc_ok:
            res_inc = await session.call_tool("create_incident", {"truck_id": truck_id, "incident_type": "LOCATION_MISMATCH", "description": "Conductor no coincide con GPS.", "lat": current_lat, "lon": current_lon})
            res_qod = await session.call_tool("activate_emergency_qod", {"phone_number": phone_number, "duration": 3600})
        elif deviated:
            res_inc = await session.call_tool("create_incident", {"truck_id": truck_id, "incident_type": "ROUTE_DEVIATION", "description": "Camión fuera de ruta.", "lat": current_lat, "lon": current_lon})
            res_qod = await session.call_tool("activate_emergency_qod", {"phone_number": phone_number, "duration": 1800})

    return evaluate(
        prompt=f"Check camión {truck_id}. location_ok:{loc_ok} deviated:{deviated} incident:{res_inc.content[0].text if res_inc else 'ninguna'}",
        system_prompt="Eres FleetSync AI monitorizando ruta. Evalúa el estado. Responde JSON {status, reason}."
    )
```

### Salida JSON
```json
{
  "status": "ON_ROUTE" | "ROUTE_DEVIATION" | "LOCATION_MISMATCH",
  "reason": "..."
}
```

---

---

# FLUJO 4 — Confirmación de Llegada a Destino

**Responsable:** Persona 4
**Archivo:** `backend/ai_agent.py` + `frontend/app.py`

### Imports obligatorios
```python
from backend.nokia_mcp import nokia_nac_session
from backend.gemini_agent import evaluate
```

### Objetivo
El conductor pulsa "He llegado". Verificar via Nokia que conductor y camión están en el destino. Cerrar el viaje.

### Pasos

```
Entrada: truck_id, phone_number, lat_actual, lon_actual

── Abrir nokia_nac_session() ──────────────────────────────────────

PASO 1 — session.call_tool("calculate_distance", {lat_actual, lon_actual, destino.lat, destino.lon})
  → ¿A cuántos metros está del destino?

PASO 2 — session.call_tool("verify_location", {phone_number, lat_actual, lon_actual, 300})
  → Nokia: ¿el conductor está físicamente en el destino?

PASO 3 — session.call_tool("verify_truck_chip_location", {truck_id, lat_actual, lon_actual, 300})
  → Nokia: ¿el chip del camión también llegó?

Si ARRIVED:
  PASO 4 — session.call_tool("create_incident", {truck_id, "DELIVERY_COMPLETED", ...})

Si ALERT (conductor OK, camión NO):
  PASO 4 — session.call_tool("create_incident", {truck_id, "LOCATION_MISMATCH_AT_DESTINATION", ...})
  PASO 5 — session.call_tool("activate_emergency_qod", {phone_number, 1800})

── Cerrar sesión Nokia ─────────────────────────────────────────────

PASO 6 — evaluate(prompt, system_prompt)
  → ARRIVED | ALERT | NOT_ARRIVED
```

### Código base
```python
from backend.nokia_mcp import nokia_nac_session
from backend.gemini_agent import evaluate

async def run_arrival_confirmation(truck_id, phone_number, lat, lon, destino):
    async with nokia_nac_session() as session:
        res_dist = await session.call_tool("calculate_distance", {"lat1": lat, "lon1": lon, "lat2": destino["lat"], "lon2": destino["lon"]})
        res_loc  = await session.call_tool("verify_location", {"phone_number": phone_number, "lat": lat, "lon": lon, "max_distance": 300})
        res_trk  = await session.call_tool("verify_truck_chip_location", {"truck_id": truck_id, "lat": lat, "lon": lon, "max_distance": 300})

        dist_m    = json.loads(res_dist.content[0].text).get("distance_meters", 9999)
        driver_ok = json.loads(res_loc.content[0].text).get("verificationResult", False)
        truck_ok  = json.loads(res_trk.content[0].text).get("verificationResult", False)

        res_inc = None
        if dist_m < 300 and driver_ok and truck_ok:
            res_inc = await session.call_tool("create_incident", {"truck_id": truck_id, "incident_type": "DELIVERY_COMPLETED", "description": "Entrega confirmada.", "lat": lat, "lon": lon})
        elif driver_ok and not truck_ok:
            res_inc = await session.call_tool("create_incident", {"truck_id": truck_id, "incident_type": "LOCATION_MISMATCH_AT_DESTINATION", "description": "Conductor llegó, camión no.", "lat": lat, "lon": lon})
            await session.call_tool("activate_emergency_qod", {"phone_number": phone_number, "duration": 1800})

    return evaluate(
        prompt=f"Llegada camión {truck_id}. dist:{dist_m}m driver_ok:{driver_ok} truck_ok:{truck_ok}",
        system_prompt="Eres FleetSync AI. Si dist<300 y ambos OK → ARRIVED. Si conductor OK y camión NO → ALERT. Si dist>=300 → NOT_ARRIVED. Responde JSON {status, reason, checks}."
    )
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

---

---

## Orden de integración recomendado

```
Día 1:
  1. Verificar test_mcp.py y test_gemini.py funcionan OK
  2. Persona 1: Flujo 1 en ai_agent.py
  3. Persona 2: Flujo 2 en ai_agent.py

Día 2 (mañana):
  4. Persona 3: Flujo 3 en route_monitor.py
  5. Persona 4: Flujo 4 en ai_agent.py + tabs frontend

Día 2 (tarde):
  6. Integración final — conectar los 4 flujos
  7. Demo y escenarios de prueba
```

---

## Escenarios de demo

| Escenario | Cómo simular | Resultado esperado |
|---|---|---|
| Viaje normal | Número normal, truck_id normal | AUTHORIZED → QoD → ARRIVED |
| SIM Swap | Número terminado en `999` | DENIED Flujo 1 |
| Camión no en inicio | truck_id terminado en `000` | DENIED Flujo 1 |
| Desvío de ruta | Coords fuera de ruta en Flujo 3 | ROUTE_DEVIATION + QoD |
| Conductor ≠ camión en ruta | Número terminado en `000` en Flujo 3 | LOCATION_MISMATCH + QoD |
| Llegada correcta | Coords en destino, todo OK | ARRIVED + viaje cerrado |
| Llegada con alerta | Conductor OK, truck_id `000` en Flujo 4 | ALERT + QoD |
