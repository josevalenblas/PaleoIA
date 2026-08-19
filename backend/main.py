from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from google import genai
import os


# ==========================================
# CARGAR VARIABLES DE ENTORNO
# ==========================================

load_dotenv()


# ==========================================
# CREAR APLICACIÓN
# ==========================================

app = FastAPI()


# ==========================================
# CORS
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# API DE GEMINI
# ==========================================

api_key = os.getenv("GEMINI_API_KEY")


if api_key:
    client = genai.Client(
        api_key=api_key
    )
else:
    client = None


# ==========================================
# PERSONALIDAD DE PALEOIA
# ==========================================

SYSTEM_PROMPT = """
Eres PaleoIA, una inteligencia artificial
especializada en paleontología y animales
prehistóricos.

Tu especialidad incluye:

- Dinosaurios
- Pterosaurios
- Reptiles marinos
- Mamíferos prehistóricos
- Peces prehistóricos
- Anfibios prehistóricos
- Artrópodos prehistóricos
- Otros animales extintos

No incluyas humanos como animales
prehistóricos de PaleoIA.

Responde siempre en español.

Tu objetivo es enseñar paleontología
de manera clara, entretenida y
científicamente responsable.

Diferencia entre:

- Hechos científicos establecidos
- Estimaciones
- Hipótesis

Nunca inventes fuentes.

Si no estás seguro de un dato,
dilo claramente.

Explica los conceptos de forma sencilla
pero científicamente correcta.
"""


# ==========================================
# PÁGINA PRINCIPAL
# ==========================================

@app.get("/")
def inicio():

    return {
        "mensaje": "🦖 PaleoIA está funcionando",
        "api_key_detectada": bool(api_key)
    }


# ==========================================
# PREGUNTAR A PALEOIA
# ==========================================

@app.get("/preguntar")
def preguntar(pregunta: str):

    print("\n================================")
    print("🦖 PREGUNTA RECIBIDA:")
    print(pregunta)
    print("================================")


    # ======================================
    # COMPROBAR API KEY
    # ======================================

    if not api_key:

        print("❌ ERROR: GEMINI_API_KEY no encontrada")

        return {
            "pregunta": pregunta,
            "respuesta":
                "❌ PaleoIA no tiene configurada "
                "su API de investigación."
        }


    # ======================================
    # CONECTAR CON GEMINI
    # ======================================

    try:

        print(
            "🧠 Conectando con el cerebro "
            "de investigación..."
        )


        respuesta = client.models.generate_content(

           model="gemini-3.6-flash",

            contents=(
                SYSTEM_PROMPT
                + "\n\nPregunta del usuario:\n"
                + pregunta
            )
        )


        texto = respuesta.text


        print(
            "✅ Respuesta recibida correctamente"
        )


        return {
            "pregunta": pregunta,
            "respuesta": texto
        }


    # ======================================
    # ERROR
    # ======================================

    except Exception as error:

        print("\n❌ ERROR DE GEMINI:")
        print(repr(error))
        print("================================\n")

        return {
            "pregunta": pregunta,
            "respuesta": f"❌ Error de Gemini: {str(error)}"
        }