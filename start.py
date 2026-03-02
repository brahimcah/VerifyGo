"""
start.py — Arranca el backend Python (Flask API en puerto 8000).

El frontend React se arranca por separado:
  cd frontend && npm run dev   → http://localhost:3000

Uso:
  python start.py
"""
import subprocess
import sys
import os

if __name__ == "__main__":
    print("FleetSync AI — Arrancando backend API...")
    print("  Backend: http://localhost:8000")
    print("  Frontend (separado): cd frontend && npm run dev\n")

    python = sys.executable
    os.environ.setdefault("PYTHONPATH", os.path.dirname(os.path.abspath(__file__)))

    try:
        subprocess.run(
            [python, "-m", "backend.server"],
            env={**os.environ, "PYTHONPATH": os.path.dirname(os.path.abspath(__file__))}
        )
    except KeyboardInterrupt:
        print("\nBackend detenido.")
