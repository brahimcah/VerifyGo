# 🚛 FleetSync AI - Centro de Mando de Logística

**FleetSync AI** es un sistema inteligente de ciberseguridad anti-robo diseñado para flotas de camiones. En un contexto donde la logística enfrenta graves amenazas de seguridad (inhibidores GPS, suplantación de identidad mediante SIM Swap, secuestros de rutas), FleetSync AI emerge como la solución definitiva al fusionar la telemetría tradicional de los camiones con el poder irrefutable de la red de telecomunicaciones. 

Al integrar Inteligencia Artificial generativa (Gemini) y las **APIs CAMARA de Nokia Network as Code (NaC)**, FleetSync AI no solo detecta anomalías, sino que verifica criptográficamente la ubicación física de un conductor directamente con las antenas celulares, disparando protocolos de emergencia de forma autónoma.

---

> [!IMPORTANT]
> **Open Gateway Hackathon 2026**
> Este proyecto es una Prueba de Concepto (PoC) funcional desarrollada exclusivamente como entrega técnica para el Hackathon. Demuestra la viabilidad técnica y el ROI para el sector logístico de integrar APIs Telco de nueva generación.

---

## 🏗 Arquitectura del Sistema

El ecosistema de FleetSync consta de tres pilares fundamentales que colaboran en tiempo real:

1.  **Frontend (El Centro de Mando):** Construido en `Streamlit`, proporciona un panel de control avanzado para los operadores logísticos. Permite la introducción simulada de telemetría (ID de camión, teléfono del conductor, latitud y longitud GPS), visualiza de forma profesional los logs brutos de la red (Consola de Red), y muestra de forma inequívoca el dictamen de seguridad final. También presenta un módulo ROI con impacto de negocio.
2.  **Agente IA (El Cerebro Analítico):** Un script asíncrono en Python (`backend/ai_agent.py`) potenciado por **Google Gemini Models**. Utiliza un estricto *System Prompt* diseñado para ciberseguridad. Su trabajo es ingerir las coordenadas reportadas por el hardware GPS de un camión, invocar a la red Telco, cruzar los datos y emitir un dictamen irrefutable: `SECURE` o `ALERT`.
3.  **Servidor de Infraestructura MCP:** Un servidor Python (`mcp_server/server.py`) que implementa el **Model Context Protocol (MCP)**. Funciona como el puente seguro entre el Agente de IA y las APIs de telecomunicaciones. Expone herramientas atómicas (tools) a la IA con integración real HTTP a:
    *   **Nokia NaC - Location Verification API:** Confirma si el móvil del conductor está realmente bajo la cobertura de la antena correspondiente a las coordenadas GPS reportadas por el camión.
    *   **Nokia NaC - Quality of Service on Demand (QoD):** Priorización de red bajo demanda activada en caso de emergencia.

## 🔄 Flujo de APIs (Razonamiento de Ciberseguridad)

¿Por qué usamos estas APIs específicas de Nokia Network as Code?

*   **Location Verification (Anti-Spoofing):** Los ladrones modernos utilizan inhibidores GPS (Jammers) o falsean las coordenadas (Spoofing) para desviar camiones sin levantar sospechas. Sin embargo, no pueden falsear la triangulación física celular de la red Telco. FleetSync pide a la API de Nokia que verifique si el móvil del conductor (dispositivo físico) está realmente en las coordenadas que el GPS del camión dice estar. Si la API de Nokia dice `False`, sabemos que el GPS miente: el camión está siendo robado.
*   **Quality of Service on Demand (QoD):** Si la IA decreta un estado de `ALERT` tras usar la verificación de ubicación o detectar un *SIM Swap*, el sistema invoca inmediatamente la API QoD para asignar ancho de banda prioritario e ininterrumpible al vehículo. Esto garantiza que las cámaras de seguridad 4K del camión puedan transmitir en directo al cuartel de policía o al centro de mando, sorteando cualquier congestión de red en la zona del secuestro.

---

## ⚙️ Requisitos Previos

Para levantar este proyecto en tu entorno local, asegúrate de contar con:
*   Python 3.10 o superior.
*   Una API Key válida de Google Gemini (`GEMINI_API_KEY`).
*   Una API Key Bearer válida para el Sandbox de Nokia Network as Code (`NOKIA_API_KEY`).

## 🚀 Instrucciones de Instalación

1.  Clona este repositorio o descomprime el código fuente.
2.  Crea un entorno virtual de Python en la raíz del proyecto para aislar las dependencias:
    ```bash
    python3 -m venv venv
    source venv/bin/activate  # En Windows usa: venv\\Scripts\\activate
    ```
3.  Instala las dependencias necesarias:
    ```bash
    pip install -r requirements.txt
    ```
4.  Crea un archivo llamado `.env` en la raíz del proyecto y añade tus credenciales. (Puedes usar un editor de texto o el comando a continuación):
    ```bash
    echo "GEMINI_API_KEY=tu_clave_gemini_aqui" > .env
    echo "NOKIA_API_KEY=tu_clave_nokia_aqui" >> .env
    ```
    *(Nota: Si no dispones de una clave de Nokia, el sistema hará una simulación local automática avisando de ello mediante la devolución de logs crudos simulados para no interrumpir la demo).*

## ▶️ Instrucciones de Ejecución

Para una demostración visual fluida digna del jurado, ejecuta el simulador interactivo completo ("El Botón Rojo"):

```bash
# ¡Asegúrate de tener el entorno virtual activo!
python start.py
```

Este comando orquestador se encarga de:
1.  Preparar el contexto local del servidor MCP en segundo plano.
2.  Levantar e inicializar automáticamente el Dashboard de `Streamlit` en tu navegador por defecto (usualmente `http://localhost:8501`).

### Simulación Rápida (CLI)

Si deseas probar el razonamiento en consola (Escenarios de Normalidad y Ataque):
```bash
python simulador.py
```
