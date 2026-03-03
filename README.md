# FleetSync AI

**FleetSync AI** es un sistema de seguridad en tiempo real para flotas de camiones que combina la red de telecomunicaciones de Nokia con IA generativa para verificar conductores, detectar anomalías GPS y garantizar la integridad de las entregas.

El sistema resuelve un problema real: los ladrones pueden falsear las coordenadas GPS de un camión, pero no pueden falsear la triangulación celular de la red. Nokia Network as Code verifica directamente con las antenas si el conductor está donde dice estar.

> **Open Gateway Hackathon 2026** — Prueba de Concepto funcional.

---

## Arquitectura

```
React Frontend (puerto 3000)
    ↓ REST API
Flask Backend (puerto 8000)
    ↓ MCP Streamable HTTP
Nokia Network as Code (RapidAPI)   +   Gemini 2.5 Flash
```

**Backend** (`backend/`):
- `server.py` — API REST Flask, orquesta los 4 flujos
- `ai_agent.py` — Llama a Nokia NaC MCP + Gemini para cada decisión
- `nokia_mcp.py` — Sesión MCP con Nokia NaC vía RapidAPI
- `gemini_agent.py` — Cliente Gemini 2.5 Flash con respuesta JSON
- `route_monitor.py` — Bucle de monitorización periódica (Flujo 3)
- `incident_manager.py` — Registro en memoria de incidencias
- `user_manager.py` — Gestión de conductores (login por teléfono)

**Frontend** (`frontend/`):
- `/` — Dashboard de operaciones (admin)
- `/driver` — App móvil del conductor

---

## Los 4 Flujos Nokia NaC

| Flujo | Cuándo | Herramientas Nokia NaC |
|-------|--------|------------------------|
| **1 — Inicio de viaje** | El conductor pulsa "Start Journey" | `checkSimSwap` · `verifyLocation` · `getRoamingStatus` |
| **2 — Activación QoD** | Si la ruta supera 50 km | `createSession-QoD-V1` |
| **3 — Monitorización** | Cada 5 min durante el viaje | `verifyLocation` · `checkSimSwap` |
| **4 — Confirmación llegada** | El conductor pulsa "I have arrived" | `verifyLocation` · `checkSimSwap` · `retrieveLocation` |

Gemini 2.5 Flash analiza los resultados de Nokia NaC y emite el dictamen: `AUTHORIZED / DENIED / ALERT / ARRIVED`.

---

## Requisitos

- Python 3.10+
- Node.js 18+
- API Key de Google Gemini (`GEMINI_API_KEY`)
- API Key de Nokia Network as Code vía RapidAPI (`NOKIA_NAC_API_KEY`, `NOKIA_NAC_API_HOST`, `NOKIA_NAC_MCP_URL`)

---

## Instalación

```bash
# 1. Entorno virtual Python
python3 -m venv .venv
source .venv/bin/activate

# 2. Dependencias Python
pip install -r requirements.txt

# 3. Dependencias frontend
cd frontend && npm install && cd ..

# 4. Variables de entorno
cp .env.example .env   # edita con tus claves
```

`.env` necesario:
```
GEMINI_API_KEY=...
NOKIA_NAC_API_KEY=...
NOKIA_NAC_API_HOST=network-as-code.nokia.rapidapi.com
NOKIA_NAC_MCP_URL=https://mcp-eu.rapidapi.com
```

---

## Ejecución

**Backend** (puerto 8000):
```bash
python3 start.py
```

**Frontend** (puerto 3000), en otra terminal:
```bash
cd frontend && npm run dev
```

Abre:
- **Dashboard operaciones:** http://localhost:3000
- **App conductor:** http://localhost:3000/driver

---

## Demo

### Conductores de prueba

| Teléfono | Conductor | Camión | Ruta |
|----------|-----------|--------|------|
| `+99999991000` | Carlos Rodríguez | TRK-001 | Madrid → Barcelona (621 km) |
| `+99999991001` | Ana García | TRK-002 | Barcelona → Zaragoza (296 km) |

### Eventos simulables desde el dashboard

| Evento | Efecto |
|--------|--------|
| **GPS Drift** | Simula spoofing GPS → incidencia `GPS_SPOOFING` |
| **SIM Swap** | Simula cambio de SIM → incidencia `SIM_SWAP`, estado ALERT |
| **Route Deviation** | Simula desvío de ruta → incidencia `ROUTE_DEVIATION` |
| **Manual QoD** | Activa QoD manualmente desde el panel |

### Flujo completo de demo

1. Abre http://localhost:3000/driver en móvil o ventana estrecha
2. Introduce el teléfono de prueba (o pulsa en "Test numbers")
3. Pulsa **Start Journey** — Nokia NaC verifica SIM, ubicación y roaming
4. Durante el viaje, usa el dashboard para disparar eventos
5. Pulsa **I have arrived** — Nokia NaC confirma llegada en destino

---

## Estructura del proyecto

```
VerifyGo/
├── backend/
│   ├── server.py           # API REST Flask
│   ├── ai_agent.py         # Orquestador Nokia NaC + Gemini
│   ├── nokia_mcp.py        # Sesión MCP Nokia NaC
│   ├── gemini_agent.py     # Cliente Gemini 2.5 Flash
│   ├── route_monitor.py    # Monitorización periódica
│   ├── incident_manager.py # Registro de incidencias
│   └── user_manager.py     # Gestión de conductores
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Dashboard.tsx    # Vista principal operaciones
│       │   ├── Fleet.tsx        # Gestión de flota
│       │   ├── Incidents.tsx    # Registro de incidencias
│       │   ├── Deliveries.tsx   # Seguimiento de entregas
│       │   ├── NokiaFlows.tsx   # Documentación de flujos
│       │   └── DriverApp.tsx    # App móvil del conductor
│       └── lib/
│           ├── api.ts           # Cliente REST
│           └── constants.ts     # Datos demo y configuración
├── start.py                # Arranca el backend
└── requirements.txt
```
