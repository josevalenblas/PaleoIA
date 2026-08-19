from fastapi import FastAPI, HTTPException
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

API_KEY = os.getenv("GEMINI_API_KEY")
DEV_PASSWORD = os.getenv("PALEOIA_DEV_PASSWORD")

MODEL_NAME = "gemini-3.6-flash"

DB_FILE = "paleoia.db"

MAX_MENSAJES_MEMORIA = 12


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
# CLIENTE GEMINI
# =========================================================

client = None

if API_KEY:
    client = genai.Client(api_key=API_KEY)


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

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS
        idx_mensajes_conversation
        ON mensajes(conversation_id, id)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS
        idx_conversaciones_actualizada
        ON conversaciones(actualizada)
    """)

    conexion.commit()
    conexion.close()


inicializar_db()


# =========================================================
# FECHA
# =========================================================

def ahora():
    return datetime.utcnow().isoformat()


# =========================================================
# CONVERSACIONES
# =========================================================

def crear_conversacion_db():

    conversation_id = str(uuid.uuid4())

    fecha = ahora()

    conexion = conectar_db()

    conexion.execute(
        """
        INSERT INTO conversaciones
        (id, creada, actualizada)
        VALUES (?, ?, ?)
        """,
        (
            conversation_id,
            fecha,
            fecha
        )
    )

    conexion.commit()
    conexion.close()

    return conversation_id


def existe_conversacion(conversation_id):

    if not conversation_id:
        return False

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

    if not contenido:
        return

    fecha = ahora()

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
            fecha
        )
    )

    conexion.execute(
        """
        UPDATE conversaciones
        SET actualizada = ?
        WHERE id = ?
        """,
        (
            fecha,
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

    filas = conexion.execute(
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

    filas = list(reversed(filas))

    return [
        {
            "rol": fila["rol"],
            "contenido": fila["contenido"]
        }
        for fila in filas
    ]


def obtener_todos_los_mensajes(
    conversation_id
):

    conexion = conectar_db()

    filas = conexion.execute(
        """
        SELECT
            id,
            rol,
            contenido,
            fecha
        FROM mensajes
        WHERE conversation_id = ?
        ORDER BY id ASC
        """,
        (conversation_id,)
    ).fetchall()

    conexion.close()

    return [
        {
            "id": fila["id"],
            "rol": fila["rol"],
            "contenido": fila["contenido"],
            "fecha": fila["fecha"]
        }
        for fila in filas
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

    resultado = conexion.execute(
        """
        DELETE FROM conversaciones
        WHERE id = ?
        """,
        (conversation_id,)
    )

    conexion.commit()
    conexion.close()

    return resultado.rowcount > 0


# =========================================================
# PERSONALIDAD
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

Si el usuario utiliza palabras como:

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

Si la pregunta es sencilla,
responde de forma sencilla.
"""


DEVELOPER_PROMPT = """
Eres PaleoIA en MODO DESARROLLADOR.

El usuario está autorizado como desarrollador.

Puedes responder preguntas sobre cualquier tema
permitido.

Responde siempre en español.

Sé claro, directo y científicamente responsable.

Mantén el contexto.

Comprende mensajes cortos utilizando
la conversación anterior.

Cuando el usuario pregunte sobre programación,
puedes proporcionar código completo y funcional.
"""


# =========================================================
# PROMPT
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

    partes = [personalidad]

    if historial:

        partes.append(
            "\nCONVERSACIÓN ANTERIOR:\n"
        )

        for mensaje in historial:

            partes.append(
                f'{mensaje["rol"]}: '
                f'{mensaje["contenido"]}\n'
            )

    partes.append(
        "\nMENSAJE ACTUAL DEL USUARIO:\n"
    )

    partes.append(pregunta)

    partes.append(
        "\n\nResponde utilizando el contexto "
        "anterior cuando sea necesario."
    )

    return "".join(partes)


# =========================================================
# MODELOS
# =========================================================

class LoginRequest(BaseModel):
    password: str


class TokenRequest(BaseModel):
    token: str = ""


# =========================================================
# INICIO
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
# LISTAR CONVERSACIONES
# =========================================================

@app.get("/conversaciones")
def listar_conversaciones():

    conexion = conectar_db()

    conversaciones = conexion.execute(
        """
        SELECT
            id,
            creada,
            actualizada
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

        if primer_mensaje:

            titulo = primer_mensaje["contenido"]

            titulo = (
                titulo.replace("\n", " ")
                .strip()
            )

            if len(titulo) > 42:
                titulo = titulo[:42] + "..."

        else:

            titulo = "Nueva conversación"

        resultado.append({
            "conversation_id":
                conversacion["id"],

            "id":
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
            "conversation_id":
                conversation_id,
            "mensajes": []
        }

    mensajes = obtener_todos_los_mensajes(
        conversation_id
    )

    return {
        "exito": True,
        "conversation_id":
            conversation_id,
        "mensajes": mensajes
    }


# =========================================================
# RUTA COMPATIBLE
# =========================================================

@app.get("/conversacion/{conversation_id}")
def conversacion_compatibilidad(
    conversation_id: str
):

    return historial_conversacion(
        conversation_id
    )


# =========================================================
# BORRAR CONVERSACIÓN
# =========================================================

@app.delete(
    "/conversacion/{conversation_id}"
)
def borrar_conversacion(
    conversation_id: str
):

    if not existe_conversacion(
        conversation_id
    ):

        return {
            "exito": False,
            "mensaje":
                "La conversación no existe."
        }

    eliminada = eliminar_conversacion_db(
        conversation_id
    )

    if not eliminada:

        return {
            "exito": False,
            "mensaje":
                "No se pudo eliminar."
        }

    return {
        "exito": True,
        "conversation_id":
            conversation_id,
        "mensaje":
            "Conversación eliminada."
    }


# =========================================================
# MODO DESARROLLADOR
# =========================================================

@app.post("/activar-desarrollador")
def activar_desarrollador(
    datos: LoginRequest
):

    if not DEV_PASSWORD:

        return {
            "exito": False,
            "mensaje":
                "El modo desarrollador "
                "no está configurado."
        }

    if not secrets.compare_digest(
        datos.password,
        DEV_PASSWORD
    ):

        return {
            "exito": False,
            "mensaje":
                "Contraseña incorrecta."
        }

    token = secrets.token_urlsafe(32)

    sesiones_desarrollador.add(token)

    return {
        "exito": True,
        "mensaje":
            "Modo desarrollador activado.",
        "token": token
    }


@app.post("/desactivar-desarrollador")
def desactivar_desarrollador(
    datos: TokenRequest
):

    if datos.token:

        sesiones_desarrollador.discard(
            datos.token
        )

    return {
        "exito": True,
        "mensaje":
            "Modo desarrollador desactivado."
    }


# =========================================================
# STREAMING
# =========================================================

@app.get("/preguntar-stream")
def preguntar_stream(
    pregunta: str,
    conversation_id: str = "",
    token: str = ""
):

    if not pregunta.strip():

        return {
            "exito": False,
            "mensaje":
                "La pregunta está vacía."
        }


    if not API_KEY or client is None:

        def error_api():

            yield json.dumps(
                {
                    "tipo": "error",
                    "mensaje":
                        "PaleoIA no tiene "
                        "GEMINI_API_KEY."
                },
                ensure_ascii=False
            ) + "\n"

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

        # IMPORTANTE:
        # No sustituimos silenciosamente
        # un ID inválido por otro.
        return {
            "exito": False,
            "mensaje":
                "La conversación no existe."
        }


    # -----------------------------------------------------
    # MODO DESARROLLADOR
    # -----------------------------------------------------

    modo_desarrollador = (
        token in sesiones_desarrollador
        if token
        else False
    )


    # -----------------------------------------------------
    # HISTORIAL
    # -----------------------------------------------------

    historial = obtener_historial(
        conversation_id,
        MAX_MENSAJES_MEMORIA
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
    # GUARDAR USUARIO
    # -----------------------------------------------------

    guardar_mensaje(
        conversation_id,
        "Usuario",
        pregunta
    )


    # -----------------------------------------------------
    # STREAM
    # -----------------------------------------------------

    def generar():

        texto_completo = ""

        try:

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

                yield json.dumps(
                    {
                        "tipo": "texto",
                        "texto": texto
                    },
                    ensure_ascii=False
                ) + "\n"


            if texto_completo:

                guardar_mensaje(
                    conversation_id,
                    "PaleoIA",
                    texto_completo
                )


            yield json.dumps(
                {
                    "tipo": "final",
                    "conversation_id":
                        conversation_id,
                    "modo_desarrollador":
                        modo_desarrollador
                },
                ensure_ascii=False
            ) + "\n"


        except Exception as error:

            error_texto = str(error)

            print(
                "ERROR GEMINI:",
                error_texto
            )


            if (
                "429" in error_texto
                or
                "RESOURCE_EXHAUSTED"
                in error_texto
            ):

                mensaje = (
                    "⏳ Gemini alcanzó "
                    "el límite de solicitudes. "
                    "Espera unos segundos "
                    "antes de volver a intentar."
                )

            elif (
                "404" in error_texto
                or
                "NOT_FOUND" in error_texto
            ):

                mensaje = (
                    "❌ El modelo "
                    f"{MODEL_NAME} "
                    "no está disponible."
                )

            else:

                mensaje = (
                    "❌ Error al generar "
                    "la respuesta."
                )


            yield json.dumps(
                {
                    "tipo": "error",
                    "mensaje": mensaje
                },
                ensure_ascii=False
            ) + "\n"


    return StreamingResponse(
        generar(),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control":
                "no-cache, no-store",
            "X-Accel-Buffering":
                "no"
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

    if not API_KEY or client is None:

        return {
            "exito": False,
            "respuesta":
                "PaleoIA no tiene configurada "
                "la GEMINI_API_KEY."
        }


    if not conversation_id:

        conversation_id = crear_conversacion_db()

    elif not existe_conversacion(
        conversation_id
    ):

        return {
            "exito": False,
            "respuesta":
                "La conversación no existe."
        }


    modo_desarrollador = (
        token in sesiones_desarrollador
        if token
        else False
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
            "exito": True,
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
                "⏳ Gemini alcanzó "
                "el límite de solicitudes."
            )

        else:

            mensaje = (
                "❌ Ocurrió un error "
                "al consultar Gemini."
            )

        return {
            "exito": False,
            "pregunta": pregunta,
            "respuesta": mensaje,
            "conversation_id":
                conversation_id
        }