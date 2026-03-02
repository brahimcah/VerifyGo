import json
import logging
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Modelo usado en todos los flujos
GEMINI_MODEL = "gemini-2.5-flash"


def evaluate(prompt: str, system_prompt: str) -> dict:
    """
    Llama a Gemini con el prompt y system_prompt dados.
    Retorna siempre un dict (JSON parseado).
    Incluye fallback si la API falla.

    Uso:
        from backend.gemini_agent import evaluate

        result = evaluate(
            prompt="Evalúa el camión TRK-001...",
            system_prompt="Eres FleetSync AI..."
        )
        # result -> {"status": "SECURE", "reason": "..."}
    """
    try:
        client = genai.Client()
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
            ),
        )
        return json.loads(response.text)

    except Exception as e:
        logger.error(f"Error llamando a Gemini ({GEMINI_MODEL}): {e}")
        return {
            "status": "UNKNOWN",
            "reason": f"Error al conectar con Gemini: {str(e)}"
        }
