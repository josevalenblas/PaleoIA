from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel
import os
import secrets
import time


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
# VARIABLES DE ENTORNO
# ==========================================

api_key = os.getenv("GEMINI_API_KEY")
dev_password = os.getenv("PALEOIA_DEV_PASSWORD")


# ==========================================
# CLIENTE GEMINI
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
# PERSONALIDAD NORMAL
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
# PERSONALIDAD DESARROLLADOR
# ==========================================

DEVELOPER_PROMPT = """
Eres PaleoIA en MODO DESARROLLADOR.

El usuario ha sido autenticado como
desarrollador.

En este modo puedes responder preguntas
sobre cualquier tema permitido y no estás
limitado exclusivamente a paleontología.

Mantén siempre una respuesta clara,
útil y científicamente responsable.

Responde siempre en español.
"""


# ==========================================
# MODELO PARA LOGIN
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

        print("❌ GEMINI_API_KEY no encontrada")

        return {
            "pregunta": pregunta,
            "respuesta":
                "❌ PaleoIA no tiene configurada "
                "su API de investigación.",
            "modo_desarrollador": False
        }


    # ======================================
    # COMPROBAR MODO DESARROLLADOR
    # ======================================

    modo_desarrollador = (
        token != ""
        and token in sesiones_desarrollador
    )


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
    # CONSULTAR GEMINI
    # ======================================

    max_intentos = 3

    for intento in range(1, max_intentos + 1):

        try:

            print(
                f"🧠 Consultando Gemini "
                f"(intento {intento}/{max_intentos})..."
            )


            respuesta = client.models.generate_content(

                # MODELO ACTUAL
                model="gemini-3.6-flash",

                contents=prompt
            )


            texto = respuesta.text


            if not texto:

                raise Exception(
                    "Gemini devolvió una respuesta vacía."
                )


            print(
                "✅ Respuesta recibida correctamente"
            )


            return {
                "pregunta": pregunta,
                "respuesta": texto,
                "modo_desarrollador":
                    modo_desarrollador
            }


        except Exception as error:

            error_texto = str(error)

            print("❌ Error de Gemini:")
            print(error_texto)


            # ==================================
            # SI ES UN ERROR TEMPORAL
            # ==================================

            if (
                "503" in error_texto
                or "UNAVAILABLE" in error_texto
                or "429" in error_texto
                or "RESOURCE_EXHAUSTED" in error_texto
            ):

                if intento < max_intentos:

                    print(
                        "⏳ Reintentando..."
                    )

                    time.sleep(1)

                    continue


            # ==================================
            # ERROR DEFINITIVO
            # ==================================

            return {
                "pregunta": pregunta,
                "respuesta":
                    "❌ Ocurrió un error al "
                    "consultar el cerebro de PaleoIA.\n\n"
                    "Detalle: "
                    + error_texto,
                "modo_desarrollador":
                    modo_desarrollador
            }


    return {
        "pregunta": pregunta,
        "respuesta":
            "❌ PaleoIA no pudo obtener "
            "una respuesta.",
        "modo_desarrollador":
            modo_desarrollador
    }