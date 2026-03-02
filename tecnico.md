# ⚙️ Documentación Técnica - FleetSync AI

Este documento está dirigido a desarrolladores, ingenieros de software y arquitectos que necesiten comprender, mantener o escalar **FleetSync AI**.

## 🏗 Arquitectura del Sistema

FleetSync AI sigue una arquitectura modular separando la interfaz de usuario, el motor de razonamiento lógico y la capa de integración de red. Todo está orquestado localmente usando Python, pero diseñado para ser transicionado fácilmente a microservicios en la nube.

1.  **Capa de Presentación (Frontend):** 
    - Construida con **Streamlit** (`frontend/app.py`).
    - Gestiona el estado de la aplicación interactiva (Session State).
    - Proporciona visualización en tiempo real de los logs de red y las decisiones de la IA.
2.  **Capa Analítica y Orquestación (Backend IA):** 
    - Actúa como el cliente principal (`backend/ai_agent.py`).
    - Integra la API de **Google Gemini (gemini-2.5-flash)** usando `google-genai`.
    - Contiene los *System Prompts* que definen las reglas estrictas de ciberseguridad.
    - Llama a las herramientas del servidor MCP de forma asíncrona mediante `stdio_client` y `ClientSession`.
3.  **Capa de Integración Telco e IoT (MCP Server):**
    - Construida usando **FastMCP** (`mcp_server/server.py`).
    - Expone de forma estandarizada (vía Model Context Protocol) herramientas HTTP reales y simuladas a la IA.
    - Se comunica con el sandbox de **Nokia Network as Code** (via RapidAPI).

---

## 📂 Estructura del Proyecto

```text
FleetSync_AI/
├── .env                  # Variables de entorno (GEMINI_API_KEY, NOKIA_API_KEY). No se sube al repo.
├── requirements.txt      # Dependencias (streamlit, mcp, google-genai, requests, etc.)
├── README.md             # Documentación general y de onboarding.
├── historial.md          # Bitácora detallada del desarrollo paso a paso del Hackathon.
├── FLUJOS.md             # (Si aplica) Documentación de las lógicas de negocio.
├── start.py              # Script orquestador para levantar Streamlit y background tasks.
├── simulador.py          # Script CLI rápido para pruebas de concepto atómicas.
├── demo_runner.py        # Script CLI de coreografía para demos interactivas automatizadas.
│
├── frontend/
│   └── app.py            # Dashboard visual principal. Maneja métricas, UI y llamadas al backend.
│
├── backend/
│   ├── ai_agent.py       # Core de la Lógica IA. Define 'start_journey', 'evaluate_truck_status', etc.
│   ├── route_monitor.py  # (Mock) Almacenamiento en memoria de viajes activos (active_journeys = {}).
│   └── incident_manager.py # (Mock) Almacenamiento en memoria de incidentes (incidents = []).
│
└── mcp_server/
    └── server.py         # Servidor FastMCP exponiendo las tools Telco e IoT.
```

---

## 🔌 Integraciones y APIs

### 1. Google Gemini (LLM)
- **Implementación:** `backend/ai_agent.py`
- **Uso:** Razonamiento sobre los datos brutos devueltos por el MCP Server para tomar decisiones binarias (`SECURE`/`ALERT`, `AUTHORIZED`/`DENIED`).
- **Seguridad:** Los fallos o la ausencia de API Key se manejan con bloques `try-except` que derivan en un análisis de *fallback* determinista basado en condicionales simples.

### 2. Protocolo MCP (Model Context Protocol)
- **Cliente:** Se instancia dentro de cada función de la IA (`await session.call_tool("nombre_tool", {parametros})`).
- **Servidor:** Se levanta como un proceso subordinado (`command="python", args=["mcp_server/server.py"]`) a través del canal estándar (StdIO).
- **Importante para escalar:** En el futuro, si el servidor MCP se despliega remotamente (ej. GCP Cloud Run), se debería cambiar `stdio_client` por un cliente SSE (Server-Sent Events).

### 3. Nokia Network as Code (vía RapidAPI)
Se centralizó el acceso a través del endpoint de RapidAPI (Golden Path) para unificar la estructura de *Headers*.
- **Endpoint Base:** `https://network-as-code.p-eu.rapidapi.com`
- **Headers Requeridos:**
  ```python
  headers = {
      'x-rapidapi-key': os.getenv("NOKIA_API_KEY"),
      'x-rapidapi-host': "network-as-code.nokia.rapidapi.com",
      'Content-Type': "application/json",
      'x-correlator': str(uuid.uuid4()) # ID dinámico por request
  }
  ```
- **Tools Expuestas (server.py):**
  - `verify_location`: Llamada HTTP real. Valida posicionamiento físico.
  - `check_device_roaming`: Llamada HTTP real. Verifica estado de itinerancia internacional.
  - `activate_emergency_qod`: LLamada HTTP simulada (Retorna JSON de éxito directamente bajo la firma de la API). Prioriza ancho de banda.
  - `calculate_distance`: Herramienta matemática local usando la fórmula de Haversine nativa en Python.
  - Obras herramientas simuladas: `check_number_verification`, `check_sim_swap`, `verify_truck_chip_location`, `check_route_deviation`, `create_incident`.

---

## 🛠️ Notas de Desarrollo y Mantenimiento

1.  **Manejo de Estados con Streamlit:** En `frontend/app.py`, observar el uso de `st.session_state` para evitar que la interfaz parpadee o pierda el resultado de la IA cuando se actualizan otros componentes.
2.  **Lógica Asíncrona (Asyncio):** El Agente IA `backend/ai_agent.py` ejecuta rutinas `async` debido a la naturaleza I/O del Model Context Protocol. Las funciones expuestas globalmente al frontend (`evaluate_truck_status`, etc.) están envueltas en `asyncio.run()` para bloquear y entregar resultados a la UI síncrona de Streamlit.
3.  **Persistencia de Datos temporal:** Para fines de la demo de este hackathon, los archivos `route_monitor.py` e `incident_manager.py` actúan como bases de datos en memoria (diccionarios y listas). En producción, estas capas deben conectarse a una Base de Datos Relacional (PostgreSQL en Cloud SQL).
4.  **Inyección de `os.environ`:** Cuidado con importar módulos anidados, ya que FastMCP hereda el `os.environ.copy()` del proceso padre, si re-importas localmente puedes causar `UnboundLocalError`.

## ⚙️ Flujo para Levantar el Entorno Dev

1. Python 3.10+
2. Crear venv: `python -m venv venv`
3. Activar: `source venv/bin/activate`
4. Instalar: `pip install -r requirements.txt`
5. Setear API Keys en el `.env`:
   ```env
   GEMINI_API_KEY=tu_clave
   NOKIA_API_KEY=tu_clave_de_rapidapi
   ```
6. Puedes testear flujos IA llanos con `python demo_runner.py` o encender toda la plataforma con `python start.py`.
