import streamlit as st
import sys
import os
import json
import time
import pandas as pd
import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.ai_agent import evaluate_truck_status

st.set_page_config(layout='wide', page_title='FleetSync Command Center')

st.title("🚛 FleetSync Command Center & Business Dashboard")
st.markdown("Monitor de Seguridad Anti-Robo de Flotas soportado por Nokia CAMARA APIs y Google Gemini.")

st.markdown("---")
st.subheader("📊 Relevancia de Negocio y ROI (Impacto Financiero)")
m1, m2, m3 = st.columns(3)
with m1:
    st.metric(label="Valor de la Carga Protegida", value="€2.5M", delta="Alta Prioridad")
with m2:
    st.metric(label="Costo Operativo API", value="€0.02 / llamada", delta="-99% vs Escolta", delta_color="inverse")
with m3:
    st.metric(label="Ahorro Estimado Póliza Seguro", value="-15% Anual", delta="€150k Ahorro/año")

# Gráfico Dummy de ROI / Reducción de incidentes
chart_data = pd.DataFrame(
    {
        "Hardware GPS Tradicional": [12, 14, 15, 13, 16],
        "FleetSync AI (Nokia NaC)": [12, 6, 2, 1, 0]
    },
    index=["Q1", "Q2", "Q3", "Q4", "Q1 (Año Sig)"]
)
st.line_chart(chart_data, color=["#FF4B4B", "#00FF00"])

st.markdown("---")

col1, col2 = st.columns([1, 1])

with col1:
    st.header("📡 Controles del Simulador")
    st.markdown("Inyecta telemetría (normal o falseada) para evaluar la reacción del sistema:")
    
    truck_id = st.text_input("ID del Camión", value="TRK-900")
    phone_number = st.text_input("Teléfono del Conductor", value="+34600123456")
    reported_lat = st.number_input("Latitud GPS", value=40.4168, format="%.5f")
    reported_lon = st.number_input("Longitud GPS", value=-3.7038, format="%.5f")

    if st.button("🛡️ Evaluar Seguridad con IA", type="primary", use_container_width=True):
        st.session_state['evaluating'] = True
        st.session_state['result'] = None
        st.session_state['truck_id'] = truck_id
        st.session_state['phone_number'] = phone_number
        st.session_state['reported_lat'] = reported_lat
        st.session_state['reported_lon'] = reported_lon

with col2:
    st.header("🧠 Log de Eventos de la IA")
    if st.session_state.get('evaluating'):
        with st.spinner("Conectando con MCP Server (Nokia NaC API) y Gemini..."):
            try:
                result = evaluate_truck_status(
                    st.session_state['truck_id'], 
                    st.session_state['phone_number'], 
                    st.session_state['reported_lat'], 
                    st.session_state['reported_lon']
                )
                
                # Consola de red
                st.subheader("🌐 Consola de Red (Nokia API)")
                network_logs = result.get("network_logs", {})
                if "verify_location" in network_logs:
                    try:
                        parsed_net_log = json.loads(network_logs['verify_location'])
                        st.json(parsed_net_log)
                    except:
                        st.code(network_logs['verify_location'], language="json")
                else:
                    st.info("No hay logs de red disponibles.")

                # Decisión de IA
                st.subheader("🤖 Decisión de Ciberseguridad")
                status = result.get("status", "UNKNOWN")
                reason = result.get("reason", "Sin razón provista.")
                
                if status == "SECURE":
                    st.success(f"✅ **ESTADO SEGURO**\\n\\n{reason}", icon="🟢")
                elif status == "ALERT":
                    st.error(f"🚨 **ALERTA DE SEGURIDAD DETECTADA**\\n\\n{reason}", icon="🔴")
                else:
                    st.warning(f"Estado desconocido: {status}\\n\\n{reason}")
                    
                with st.expander("Ver Respuesta JSON de la IA"):
                    st.json({"status": status, "reason": reason})

            except Exception as e:
                st.error(f"Error al evaluar la seguridad: {str(e)}")
            st.session_state['evaluating'] = False
    else:
        st.info("👈 Configura los parámetros en el panel izquierdo y pulsa 'Evaluar Seguridad con IA'.")

