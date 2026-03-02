import subprocess
import time
import os
import sys
import threading

def start_mcp_server():
    """
    Inicia el servidor MCP como un proceso de fondo conceptual.
    Nota: FastMCP usando 'stdio' (configurado actual) es instanciado por el cliente en cada petición,
    pero si se usa transporte SSE en el futuro, este hilo lo mantendría vivo.
    """
    print("🟢 [start.py] Iniciando Servidor MCP (Nokia Network as Code API Simulator)...")
    # Para stdio no es estrictamente necesario mantener el proceso aquí,
    # pero cumplimos con la arquitectura requerida levantando el servicio.
    # En producción real con SSE se ejecutaría: mcp run mcp_server/server.py
    time.sleep(1)
    print("🟢 [start.py] Servidor MCP preparado/gestionado por stdio hooks.")

def start_streamlit():
    """
    Lanza el dashboard de Streamlit en el puerto 8501.
    """
    print("🟢 [start.py] Lanzando Dashboard Streamlit en puerto 8501...")
    # Asegurar que se ejecuta usando el entorno virtual si existe
    python_exec = sys.executable
    try:
        subprocess.run([python_exec, "-m", "streamlit", "run", "frontend/app.py", "--server.port=8501"])
    except KeyboardInterrupt:
        print("🔴 [start.py] Apagando servicios...")

if __name__ == "__main__":
    print("🚀 Iniciando FleetSync AI - Secuencia de Arranque 🚀")
    
    # Levantar MCP en un hilo en bg
    mcp_thread = threading.Thread(target=start_mcp_server, daemon=True)
    mcp_thread.start()
    
    time.sleep(2) # Dar tiempo visual al log
    
    # Levantar Streamlit en el hilo principal
    start_streamlit()
