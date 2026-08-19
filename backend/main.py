from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel

import os
import json
import secrets
import sqlite3
import uuid
from datetime import datetime


# =========================================================
# CONFIGURACIÓN
# =========================================================

load_dotenv()

app = FastAPI(title="PaleoIA Backend")


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# VARIABLES
# =========================================================

API_KEY = os.getenv("GEMINI_API_KEY")
DEV_PASSWORD = os.getenv("PALEOIA_DEV_PASSWORD")

# IMPORTANTE:
# Usamos solamente este modelo.
MODEL_NAME = "gemini-3.6-flash"

DB_FILE = "paleoia.db"

MAX_MENSAJES_MEMORIA = 12


# =========================================================
# CLIENTE GEMINI
# =========================================================

if API_KEY:
    client = genai.Client(api_key=API_KEY)
else:
    client = None


# =========================================================
# SESIONES DE DESARROLLADOR
# =========================================================

sesiones_desarrollador = set()


# =========================================================
# BASE DE DATOS
# =========================================================

def conectar_db():

    conexion = sqlite3.connect(
        DB_FILE,
        check_same_thread=False
    )

    conexion.row_factory = sqlite3.Row

    return conexion


def inicializar_db():

    conexion = conectar_db()

    cursor = conexion.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversaciones (
            id TEXT PRIMARY KEY,
            creada TEXT NOT NULL,
            actualizada TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS mensajes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT NOT NULL,
            rol TEXT NOT NULL,
            contenido TEXT NOT NULL,
            fecha TEXT NOT NULL
        )
    """)

    conexion.commit()
    conexion.close()


inicializar_db()


# =========================================================
# FUNCIONES DE MEMORIA
# =========================================================

def crear_conversacion_db():

    conversation_id = str(uuid.uuid4())

    ahora = datetime.utcnow().isoformat()

    conexion = conectar_db()

    conexion.execute(
        """
        INSERT INTO conversaciones
        (id, creada, actualizada)
        VALUES (?, ?, ?)
        """,
        (
            conversation_id,
            ahora,
            ahora
        )
    )

    conexion.commit()
    conexion.close()

    return conversation_id


def existe_conversacion(conversation_id):

    conexion = conectar_db()

    resultado = conexion.execute(
        """
        SELECT id
        FROM conversaciones
        WHERE id = ?
        """,
        (conversation_id,)
    ).fetchone()

    conexion.close()

    return resultado is not None


def guardar_mensaje(
    conversation_id,
    rol,
    contenido
):

    ahora = datetime.utcnow().isoformat()

    conexion = conectar_db()

    conexion.execute(
        """
        INSERT INTO mensajes
        (conversation_id, rol, contenido, fecha)
        VALUES (?, ?, ?, ?)
        """,
        (
            conversation_id,
            rol,
            contenido,
            ahora
        )
    )

    conexion.execute(
        """
        UPDATE conversaciones
        SET actualizada = ?
        WHERE id = ?
        """,
        (
            ahora,
            conversation_id
        )
    )

    conexion.commit()
    conexion.close()


def obtener_historial(
    conversation_id,
    limite=MAX_MENSAJES_MEMORIA
):

    conexion = conectar_db()

    mensajes = conexion.execute(
        """
        SELECT rol, contenido
        FROM mensajes
        WHERE conversation_id = ?
        ORDER BY id DESC
        LIMIT ?
        """,
        (
            conversation_id,
            limite
        )
    ).fetchall()

    conexion.close()

    mensajes = list(reversed(mensajes))

    return [
        {
            "rol": mensaje["rol"],
            "contenido": mensaje["contenido"]
        }
        for mensaje in mensajes
    ]


def eliminar_conversacion_db(
    conversation_id
):

    conexion = conectar_db()

    conexion.execute(
        """
        DELETE FROM mensajes
        WHERE conversation_id = ?
        """,
        (conversation_id,)
    )

    conexion.execute(
        """
        DELETE FROM conversaciones
        WHERE id = ?
        """,
        (conversation_id,)
    )

    conexion.commit()
    conexion.close()


# =========================================================
# PERSONALIDAD PALEOIA
# =========================================================

SYSTEM_PROMPT = """
Eres PaleoIA, una inteligencia artificial
especializada en paleontología y animales
prehistóricos.

Responde siempre en español.

Especialidad:

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

Tu objetivo es enseñar paleontología de forma
clara, entretenida y científicamente responsable.

Distingue entre:

- Hechos científicos establecidos
- Estimaciones
- Hipótesis

No inventes fuentes.

Si un dato no es seguro, indícalo.

Responde de forma directa.
No repitas innecesariamente la pregunta.

MANTÉN EL CONTEXTO.

Si el usuario dice:

"él"
"ella"
"ese"
"esa"
"el otro"
"el primero"
"el segundo"
"¿cuánto?"
"¿por qué?"
"¿cómo?"
"¿cuándo?"
"¿dónde?"
"sí"
"no"

interpreta el mensaje utilizando la conversación
anterior.

No reinicies la conversación.

No preguntes nuevamente de qué está hablando
si el contexto permite saberlo.

Si la pregunta es sencilla, responde de forma
sencilla y rápida.
"""


# =========================================================
# PERSONALIDAD DESARROLLADOR
# =========================================================

DEVELOPER_PROMPT = """
Eres PaleoIA en MODO DESARROLLADOR.

El usuario está autorizado como desarrollador.

Puedes responder preguntas sobre cualquier tema
permitido.

Responde siempre en español.

Sé claro, directo y científicamente responsable.

Mantén el contexto de la conversación.

Comprende respuestas cortas utilizando
el contexto anterior.

No reinicies conversaciones.

Cuando el usuario pregunte sobre programación,
puedes proporcionar código completo y funcional.
"""


# =========================================================
# LOGIN
# =========================================================

class LoginRequest(BaseModel):
    password: str


# =========================================================
# PÁGINA PRINCIPAL
# =========================================================

@app.get("/")
def inicio():

    return {
        "mensaje": "🦖 PaleoIA está funcionando",
        "api_key_detectada": bool(API_KEY),
        "modelo": MODEL_NAME,
        "memoria": True,
        "streaming": True,
        "base_datos": "SQLite"
    }


# =========================================================
# NUEVA CONVERSACIÓN
# =========================================================

@app.get("/nueva-conversacion")
def nueva_conversacion():

    conversation_id = crear_conversacion_db()

    return {
        "exito": True,
        "conversation_id": conversation_id
    }


# =========================================================
# HISTORIAL
# =========================================================

@app.get("/historial/{conversation_id}")
def historial_conversacion(
    conversation_id: str
):

    if not existe_conversacion(
        conversation_id
    ):

        return {
            "exito": False,
            "mensajes": []
        }

    historial = obtener_historial(
        conversation_id,
        limite=1000
    )

    return {
        "exito": True,
        "conversation_id": conversation_id,
        "mensajes": historial
    }


# =========================================================
# LISTA DE CONVERSACIONES
# =========================================================

@app.get("/conversaciones")
def listar_conversaciones():

    conexion = conectar_db()

    conversaciones = conexion.execute(
        """
        SELECT id, creada, actualizada
        FROM conversaciones
        ORDER BY actualizada DESC
        """
    ).fetchall()

    resultado = []

    for conversacion in conversaciones:

        primer_mensaje = conexion.execute(
            """
            SELECT contenido
            FROM mensajes
            WHERE conversation_id = ?
            ORDER BY id ASC
            LIMIT 1
            """,
            (conversacion["id"],)
        ).fetchone()

        titulo = (
            primer_mensaje["contenido"]
            if primer_mensaje
            else "Nueva conversación"
        )

        if len(titulo) > 45:
            titulo = titulo[:45] + "..."

        resultado.append({
            "conversation_id":
                conversacion["id"],

            "titulo":
                titulo,

            "actualizada":
                conversacion["actualizada"]
        })

    conexion.close()

    return {
        "exito": True,
        "conversaciones": resultado
    }


# =========================================================
# ACTIVAR MODO DESARROLLADOR
# =========================================================

@app.post("/activar-desarrollador")
def activar_desarrollador(
    datos: LoginRequest
):

    if not DEV_PASSWORD:

        return {
            "exito": False,
            "mensaje":
                "❌ El modo desarrollador "
                "no está configurado."
        }

    if not secrets.compare_digest(
        datos.password,
        DEV_PASSWORD
    ):

        print(
            "⚠️ Intento de acceso rechazado"
        )

        return {
            "exito": False,
            "mensaje":
                "❌ Contraseña incorrecta."
        }

    token = secrets.token_urlsafe(32)

    sesiones_desarrollador.add(token)

    print(
        "🔓 MODO DESARROLLADOR ACTIVADO"
    )

    return {
        "exito": True,
        "mensaje":
            "🧠 Modo desarrollador activado.",
        "token": token
    }


# =========================================================
# DESACTIVAR MODO DESARROLLADOR
# =========================================================

@app.post("/desactivar-desarrollador")
def desactivar_desarrollador(
    token: str
):

    if token:
        sesiones_desarrollador.discard(token)

    return {
        "exito": True,
        "mensaje":
            "🔒 Modo desarrollador desactivado."
    }


# =========================================================
# BORRAR CONVERSACIÓN
# =========================================================

@app.delete(
    "/conversacion/{conversation_id}"
)
def borrar_conversacion(
    conversation_id: str
):

    eliminar_conversacion_db(
        conversation_id
    )

    return {
        "exito": True,
        "mensaje":
            "🗑️ Conversación eliminada."
    }


# =========================================================
# CREAR PROMPT
# =========================================================

def crear_prompt(
    pregunta,
    historial,
    modo_desarrollador
):

    personalidad = (
        DEVELOPER_PROMPT
        if modo_desarrollador
        else SYSTEM_PROMPT
    )

    contexto = ""

    if historial:

        contexto = "\n\nCONVERSACIÓN ANTERIOR:\n\n"

        for mensaje in historial:

            contexto += (
                mensaje["rol"]
                + ": "
                + mensaje["contenido"]
                + "\n"
            )

    prompt = (
        personalidad
        + contexto
        + "\n\nMENSAJE ACTUAL DEL USUARIO:\n"
        + pregunta
        + "\n\n"
        + "Responde al mensaje actual utilizando "
        + "el contexto cuando sea necesario."
    )

    return prompt


# =========================================================
# STREAMING
# =========================================================

@app.get("/preguntar-stream")
def preguntar_stream(
    pregunta: str,
    conversation_id: str = "",
    token: str = ""
):

    print()
    print("====================================")
    print("🦖 NUEVA PREGUNTA")
    print(pregunta)
    print("====================================")

    # -----------------------------------------------------
    # API KEY
    # -----------------------------------------------------

    if not API_KEY or client is None:

        def error_api():

            yield json.dumps({
                "tipo": "error",
                "mensaje":
                    "❌ PaleoIA no tiene configurada "
                    "la GEMINI_API_KEY."
            }) + "\n"

        return StreamingResponse(
            error_api(),
            media_type="application/x-ndjson"
        )


    # -----------------------------------------------------
    # CONVERSACIÓN
    # -----------------------------------------------------

    if not conversation_id:

        conversation_id = crear_conversacion_db()

    elif not existe_conversacion(
        conversation_id
    ):

        # Si el frontend tiene un ID viejo,
        # creamos una conversación válida.
        conversation_id = crear_conversacion_db()


    # -----------------------------------------------------
    # MODO DESARROLLADOR
    # -----------------------------------------------------

    modo_desarrollador = (
        bool(token)
        and token in sesiones_desarrollador
    )


    # -----------------------------------------------------
    # HISTORIAL
    # -----------------------------------------------------

    historial = obtener_historial(
        conversation_id
    )


    # -----------------------------------------------------
    # PROMPT
    # -----------------------------------------------------

    prompt = crear_prompt(
        pregunta,
        historial,
        modo_desarrollador
    )


    # -----------------------------------------------------
    # GUARDAR PREGUNTA
    # -----------------------------------------------------

    guardar_mensaje(
        conversation_id,
        "Usuario",
        pregunta
    )


    # -----------------------------------------------------
    # GENERADOR
    # -----------------------------------------------------

    def generar():

        texto_completo = ""

        try:

            print(
                "🧠 Generando con "
                + MODEL_NAME
                + "..."
            )

            # IMPORTANTE:
            # Solo un intento.
            # No hacemos 3 reintentos porque
            # eso empeora el límite 429.

            respuesta = (
                client.models.generate_content_stream(
                    model=MODEL_NAME,
                    contents=prompt
                )
            )

            for fragmento in respuesta:

                texto = getattr(
                    fragmento,
                    "text",
                    None
                )

                if not texto:
                    continue

                texto_completo += texto

                yield json.dumps({
                    "tipo": "texto",
                    "texto": texto
                }, ensure_ascii=False) + "\n"


            # -------------------------------------------------
            # GUARDAR RESPUESTA COMPLETA
            # -------------------------------------------------

            if texto_completo:

                guardar_mensaje(
                    conversation_id,
                    "PaleoIA",
                    texto_completo
                )

            yield json.dumps({
                "tipo": "final",
                "conversation_id":
                    conversation_id,
                "modo_desarrollador":
                    modo_desarrollador
            }, ensure_ascii=False) + "\n"


            print(
                "✅ Respuesta terminada"
            )


        except Exception as error:

            error_texto = str(error)

            print(
                "❌ Error streaming:"
            )

            print(
                error_texto
            )


            # -------------------------------------------------
            # ERROR 429
            # -------------------------------------------------

            if (
                "429" in error_texto
                or
                "RESOURCE_EXHAUSTED"
                in error_texto
            ):

                mensaje = (
                    "⏳ Se alcanzó el límite "
                    "gratuito de Gemini. "
                    "Espera unos segundos y "
                    "vuelve a intentarlo."
                )

            # -------------------------------------------------
            # ERROR 404
            # -------------------------------------------------

            elif (
                "404" in error_texto
                or
                "NOT_FOUND" in error_texto
            ):

                mensaje = (
                    "❌ El modelo de Gemini "
                    "no está disponible. "
                    "PaleoIA está configurado "
                    "para usar "
                    + MODEL_NAME
                    + "."
                )

            # -------------------------------------------------
            # OTROS ERRORES
            # -------------------------------------------------

            else:

                mensaje = (
                    "❌ Ocurrió un error al "
                    "generar la respuesta."
                )


            yield json.dumps({
                "tipo": "error",
                "mensaje": mensaje
            }, ensure_ascii=False) + "\n"


    return StreamingResponse(
        generar(),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


# =========================================================
# ENDPOINT NORMAL
# =========================================================

@app.get("/preguntar")
def preguntar(
    pregunta: str,
    conversation_id: str = "",
    token: str = ""
):

    if not conversation_id:

        conversation_id = crear_conversacion_db()

    elif not existe_conversacion(
        conversation_id
    ):

        conversation_id = crear_conversacion_db()


    modo_desarrollador = (
        bool(token)
        and token in sesiones_desarrollador
    )


    historial = obtener_historial(
        conversation_id
    )


    prompt = crear_prompt(
        pregunta,
        historial,
        modo_desarrollador
    )


    guardar_mensaje(
        conversation_id,
        "Usuario",
        pregunta
    )


    try:

        respuesta = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt
        )

        texto = respuesta.text or ""

        guardar_mensaje(
            conversation_id,
            "PaleoIA",
            texto
        )

        return {
            "pregunta": pregunta,
            "respuesta": texto,
            "modo_desarrollador":
                modo_desarrollador,
            "conversation_id":
                conversation_id
        }


    except Exception as error:

        error_texto = str(error)

        if (
            "429" in error_texto
            or
            "RESOURCE_EXHAUSTED"
            in error_texto
        ):

            mensaje = (
                "⏳ Se alcanzó el límite "
                "gratuito de Gemini. "
                "Espera unos segundos y "
                "vuelve a intentarlo."
            )

        else:

            mensaje = (
                "❌ Ocurrió un error al "
                "consultar Gemini."
            )

        return {
            "pregunta": pregunta,
            "respuesta": mensaje,
            "modo_desarrollador":
                modo_desarrollador,
            "conversation_id":
                conversation_id
        }