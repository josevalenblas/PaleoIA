from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel
import os
import secrets
import time


# ==========================================
# VARIABLES DE ENTORNO
# ==========================================

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
dev_password = os.getenv("PALEOIA_DEV_PASSWORD")


# ==========================================
# APLICACIÓN
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
# GEMINI
# ==========================================

if api_key:
    client = genai.Client(api_key=api_key)
else:
    client = None


# ==========================================
# SESIONES DE DESARROLLADOR
# ==========================================

sesiones_desarrollador = set()


# ==========================================
# PALEOIA NORMAL
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

Sé directo y evita respuestas
innecesariamente largas.
"""


# ==========================================
# MODO DESARROLLADOR
# ==========================================

DEVELOPER_PROMPT = """
Eres PaleoIA en MODO DESARROLLADOR.

El usuario está autenticado como
desarrollador.

En este modo puedes responder preguntas
sobre cualquier tema permitido y no estás
limitado exclusivamente a paleontología.

Responde siempre en español.

Sé claro, directo y útil.

Cuando una pregunta sea científica,
diferencia entre hechos, estimaciones
e hipótesis cuando sea necesario.

No inventes fuentes ni información.
"""


# ==========================================
# LOGIN
# ==========================================

class LoginRequest(BaseModel):
    password: str


# ==========================================
# PÁGINA PRINCIPAL
# ==========================================

@app.get("/")
def inicio():

    return {
        "mensaje": "🦖 PaleoIA está funcionando",
        "api_key_detectada": bool(api_key),
        "modo_desarrollador": "disponible"
    }


# ==========================================
# ACTIVAR MODO DESARROLLADOR
# ==========================================

@app.post("/activar-desarrollador")
def activar_desarrollador(datos: LoginRequest):

    if not dev_password:

        return {
            "exito": False,
            "mensaje": "❌ El modo desarrollador no está configurado."
        }

    if not secrets.compare_digest(
        datos.password,
        dev_password
    ):

        print("⚠️ Intento de acceso rechazado")

        return {
            "exito": False,
            "mensaje": "❌ Contraseña incorrecta."
        }

    token = secrets.token_urlsafe(32)

    sesiones_desarrollador.add(token)

    print("🔓 MODO DESARROLLADOR ACTIVADO")

    return {
        "exito": True,
        "mensaje": "🧠 Modo desarrollador activado.",
        "token": token
    }


# ==========================================
# DESACTIVAR MODO DESARROLLADOR
# ==========================================

@app.post("/desactivar-desarrollador")
def desactivar_desarrollador(token: str):

    sesiones_desarrollador.discard(token)

    return {
        "exito": True,
        "mensaje": "🔒 Modo desarrollador desactivado."
    }


# ==========================================
# PREGUNTAR A PALEOIA
# ==========================================

@app.get("/preguntar")
def preguntar(
    pregunta: str,
    token: str = ""
):

    print("\n================================")
    print("🦖 PREGUNTA RECIBIDA:")
    print(pregunta)
    print("================================")

    # ======================================
    # COMPROBAR API
    # ======================================

    if not api_key or client is None:

        return {
            "pregunta": pregunta,
            "respuesta": "❌ PaleoIA no tiene configurada su API."
        }


    # ======================================
    # COMPROBAR MODO
    # ======================================

    modo_desarrollador = token in sesiones_desarrollador


    if modo_desarrollador:

        prompt = (
            DEVELOPER_PROMPT
            + "\n\nPregunta del usuario:\n"
            + pregunta
        )

        print("👨‍💻 Modo desarrollador")

    else:

        prompt = (
            SYSTEM_PROMPT
            + "\n\nPregunta del usuario:\n"
            + pregunta
        )

        print("🦖 Modo PaleoIA")


    # ======================================
    # GEMINI
    # ======================================

    for intento in range(3):

        try:

            print(
                f"🧠 Consultando Gemini "
                f"(intento {intento + 1}/3)..."
            )

            respuesta = client.models.generate_content(

                model="gemini-2.5-flash",

                contents=prompt
            )

            texto = respuesta.text

            print("✅ Respuesta recibida")

            return {
                "pregunta": pregunta,
                "respuesta": texto,
                "modo_desarrollador": modo_desarrollador
            }


        except Exception as error:

            error_texto = str(error)

            print("❌ Error de Gemini:")
            print(error_texto)


            # ==================================
            # REINTENTAR SI GEMINI ESTÁ OCUPADO
            # ==================================

            if "503" in error_texto or "UNAVAILABLE" in error_texto:

                if intento < 2:

                    print("⏳ Gemini está ocupado. Reintentando...")

                    time.sleep(1)

                    continue

                return {
                    "pregunta": pregunta,
                    "respuesta":
                        "⚠️ Gemini está recibiendo muchas "
                        "solicitudes en este momento. "
                        "Intenta nuevamente en unos segundos.",
                    "modo_desarrollador": modo_desarrollador
                }


            # ==================================
            # OTROS ERRORES
            # ==================================

            return {
                "pregunta": pregunta,
                "respuesta":
                    "❌ Ocurrió un error al consultar "
                    "el cerebro de PaleoIA.",
                "modo_desarrollador": modo_desarrollador
            }


    return {
        "pregunta": pregunta,
        "respuesta": "❌ No se pudo obtener una respuesta.",
        "modo_desarrollador": modo_desarrollador
    }