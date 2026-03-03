# VerifyGO 🚚🛡️

> **Open Gateway Hackathon 2026** — Prueba de Concepto (PoC) Funcional

**VerifyGO** (anteriormente FleetSync AI) es un innovador sistema de seguridad en tiempo real diseñado para flotas de camiones. Combina la potencia de la red de telecomunicaciones de **Nokia (Network as Code)** con **Inteligencia Artificial Generativa (Gemini 2.5 Flash)** para verificar la identidad de los conductores, detectar anomalías de GPS (spoofing) y garantizar la integridad absoluta de las rutas y entregas.

El sistema resuelve un problema crítico en la logística moderna: los ciberdelincuentes pueden falsear las coordenadas GPS de un dispositivo, pero no pueden falsificar la triangulación celular de la red de telecomunicaciones. VerifyGO utiliza **Nokia Network as Code** para verificar directamente con las antenas de red si el dispositivo móvil del conductor se encuentra realmente donde el GPS indica.

---

## 🌟 Características Principales

- **Verificación de Ubicación Inmutable**: Contraste continuo de datos GPS del dispositivo contra las antenas de la red móvil (Nokia NaC).
- **Detección de SIM Swap**: Alerta inmediata si la tarjeta SIM del conductor ha sido clonada o intercambiada.
- **Activación de Quality on Demand (QoD)**: Asignación de prioridad de red automática para camiones en rutas críticas o con pérdida de señal.
- **Análisis Inteligente Continuo**: Uso de Gemini 2.5 Flash para analizar las validaciones de red y emitir dictámenes precisos basados en IA.
- **Dashboard de Operaciones**: Panel de control en tiempo real para gestores de flota, visualizando incidencias al instante.

---

## 🏗️ Arquitectura del Sistema

La solución se divide en un backend orquestador (Python/Flask) y un frontend moderno (React).

```text
React Frontend (Puerto 3000)
    │
    ├─ REST API
    ▼
Flask Backend (Puerto 8000)
    │
    ├─ MCP Streamable HTTP llamadas
    ▼
Nokia Network as Code (vía RapidAPI)  <====>  Google Gemini 2.5 Flash
```

### ⚙️ Componentes

**Backend** (`backend/`):
- `server.py`: API REST Flask, punto de entrada que orquesta los flujos principales.
- `ai_agent.py`: Cerebro integrador que conecta Nokia NaC MCP y Gemini para la toma de decisiones.
- `nokia_mcp.py`: Gestión de sesiones MCP (Model Context Protocol) con la API de Nokia NaC.
- `gemini_agent.py`: Cliente de Gemini 2.5 Flash para la evaluación de estado y generación de respuestas JSON.
- `route_monitor.py`: Proceso de monitorización en segundo plano (bucle periódico).
- `incident_manager.py`: Sistema de registro en memoria temporal de incidencias y alertas.
- `user_manager.py`: Módulo de autenticación y gestión de conductores (login basado en número de teléfono).

**Frontend** (`frontend/`):
- `/`: Dashboard de operaciones, mapa y control en tiempo real (Vista Admin).
- `/driver`: Aplicación web responsiva para uso del conductor durante el viaje.

---

## 🔄 Los 4 Flujos de Validación (Nokia NaC)

En su núcleo, VerifyGO ejecuta 4 flujos principales utilizando las APIs de red:

| Flujo | Momento de Ejecución | APIs de Nokia NaC Utilizadas |
|-------|----------------------|------------------------------|
| **1. Inicio de Viaje** | El conductor pulsa "Start Journey" | `checkSimSwap` · `verifyLocation` · `getRoamingStatus` |
| **2. Activación QoD** | Si la ruta supera los 50 km | `createSession-QoD-V1` |
| **3. Monitorización** | Cada 5 minutos durante el trayecto | `verifyLocation` · `checkSimSwap` |
| **4. Confirmación** | El conductor pulsa "I have arrived" | `verifyLocation` · `checkSimSwap` · `retrieveLocation` |

> 🤖 **El papel de la IA:** Gemini 2.5 Flash ingiere los datos JSON provenientes de la red de Nokia tras cada flujo y decide el estado operativo emitiendo uno de cuatro dictámenes: `AUTHORIZED`, `DENIED`, `ALERT` o `ARRIVED`.

---

## 📋 Requisitos Previos

Asegúrate de tener instalados los siguientes componentes antes de iniciar:

- **Python** 3.10 o superior (para el Backend)
- **Node.js** 18 o superior (para el Frontend)
- Clave API de **Google Gemini** (`GEMINI_API_KEY`)
- Clave de API de **Nokia Network as Code** a través de RapidAPI (`NOKIA_NAC_API_KEY`)

---

## 🚀 Instalación y Configuración

Sigue estos pasos para levantar el proyecto en tu entorno local:

```bash
# 1. Clonar el repositorio
git clone <tu-repositorio-url>
cd VerifyGo

# 2. Configurar Entorno Virtual Python
python3 -m venv .venv
source .venv/bin/activate  # En Windows usar: .venv\Scripts\activate

# 3. Instalar Dependencias Python
pip install -r requirements.txt

# 4. Instalar Dependencias Frontend
cd frontend
npm install
cd ..

# 5. Configurar Variables de Entorno
# Copia el archivo de ejemplo y configura tus claves reales
cp .env.example .env
```

### 🔐 Variables de Entorno `.env` necesarias:
Abre el archivo `.env` recién creado y asegúrate de completar tus claves:
```env
GEMINI_API_KEY=tu_clave_gemini_aqui
NOKIA_NAC_API_KEY=tu_clave_rapidapi_aqui
NOKIA_NAC_API_HOST=network-as-code.nokia.rapidapi.com
NOKIA_NAC_MCP_URL=https://mcp-eu.rapidapi.com
```

---

## ▶️ Ejecución de la Aplicación

Para lanzar ambos servicios simultáneamente, necesitarás dos terminales.

**Terminal 1 (Backend - Puerto 8000):**
```bash
# Asegúrate de tener el entorno virtual activo
source .venv/bin/activate
python3 start.py
```

**Terminal 2 (Frontend - Puerto 3000):**
```bash
cd frontend
npm run dev
```

**Accesos:**
- 🖥️ **Panel de Administración:** [http://localhost:3000](http://localhost:3000)
- 📱 **Aplicación del Conductor:** [http://localhost:3000/driver](http://localhost:3000/driver)

---

## 🎮 Guía de Demostración

La aplicación incluye datos de prueba para realizar simulaciones completas.

### 👥 Conductores de Prueba Disponibles

| Teléfono | Conductor | Vehículo | Ruta Asignada |
|----------|-----------|----------|---------------|
| `+99999991000` | Carlos Rodríguez | TRK-001 | Madrid → Barcelona (621 km) |
| `+99999991001` | Ana García | TRK-002 | Barcelona → Zaragoza (296 km) |

### 🚨 Simulación de Eventos desde el Dashboard

Al acceder al panel de administración (Dashboard), puedes forzar las siguientes anomalías:

| Evento de Prueba | Resultado Simulado |
|------------------|--------------------|
| **GPS Drift (Spoofing)** | Fuerza que la ubicación del dispositivo difiera de la antena en red. Genera la incidencia `GPS_SPOOFING`. |
| **SIM Swap** | Emula que el ICCID asociado al número telefónico ha cambiado recientemente. Estado `ALERT`, incidencia `SIM_SWAP`. |
| **Route Deviation** | Simula que el camión no se encuentra en el trayecto preaprobado → `ROUTE_DEVIATION`. |
| **Manual QoD** | Fuerza la petición de calidad garantizada de red "Quality on Demand" para un vehículo. |

### 🎬 Paso a Paso para la Demo

1. Abre **[http://localhost:3000/driver](http://localhost:3000/driver)** (preferiblemente simulando vista móvil en el navegador).
2. Selecciona "Test numbers" e ingresa con un conductor de prueba.
3. Haz clic en **Start Journey**. Inmediatamente, Nokia NaC verificará posibles problemas de SIM, el estado de Roaming y tu ubicación real.
4. Abre **[http://localhost:3000](http://localhost:3000)** en otra pestaña para ver al conductor activo.
5. Utiliza los botones del Dashboard para disparar excepciones (Ej: GPS Spoofing).
6. Regresa al conductor y haz clic en **I have arrived** para finalizar el trayecto.

---

## 📁 Estructura del Proyecto

```text
VerifyGo/
├── backend/
│   ├── server.py           # API REST (Punto de entrada general)
│   ├── ai_agent.py         # Integración y lógica Gemini/Nokia
│   ├── nokia_mcp.py        # Configuración Sesión MCP NaC
│   ├── gemini_agent.py     # Lógica pura del modelo Generativo
│   ├── route_monitor.py    # Job periódico de validación de flota
│   ├── incident_manager.py # Almacenamiento local de logs/eventos
│   └── user_manager.py     # Lógica simple de mock login
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx    # Vista administrador central
│   │   │   ├── DriverApp.tsx    # Interfaz conductor (móvil)
│   │   │   ├── Fleet.tsx        # Sección monitorización flota
│   │   │   ├── Incidents.tsx    # Visor histórico alertas
│   │   │   ├── Deliveries.tsx   # Dashboard de misiones
│   │   │   └── NokiaFlows.tsx   # Visor UI de invocaciones a la API de Nokia
│   │   ├── lib/
│   │   │   ├── api.ts           # Cliente HTTP
│   │   │   └── constants.ts     # Configuraciones por defecto y Mocks
│   │   └── App.css              # Estilos UI globales
├── start.py                # Wrapper para arrancar backend
├── requirements.txt        # Dependencias Pip
└── README.md               # Documentación actual
```

---

*Desarrollado para el **Open Gateway Hackathon 2026**.*
