from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel

import os
import secrets
import sqlite3
import uuid
import json
import time


# =====================================================
# CONFIGURACIÓN
# =====================================================

load_dotenv()

app = FastAPI(title="PaleoIA")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================
# VARIABLES DE ENTORNO
# =====================================================

API_KEY = os.getenv("GEMINI_API_KEY")

DEV_PASSWORD = os.getenv(
    "PALEOIA_DEV_PASSWORD",
    ""
)

# Puedes cambiar el modelo desde Render usando:
#
# GEMINI_MODEL=gemini-2.5-flash
#
# Si no existe la variable, utilizará este.
GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-2.5-flash"
)


# =====================================================
# CLIENTE GEMINI
# =====================================================

if API_KEY:

    client = genai.Client(
        api_key=API_KEY
    )

else:

    client = None


# =====================================================
# BASE DE DATOS
# =====================================================

DATABASE_FILE = os.getenv(
    "PALEOIA_DATABASE",
    "paleoia.db"
)


def obtener_conexion():

    conexion = sqlite3.connect(
        DATABASE_FILE,
        timeout=30,
        check_same_thread=False
    )

    conexion.row_factory = sqlite3.Row

    return conexion


def preparar_base_datos():

    conexion = obtener_conexion()

    cursor = conexion.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversaciones (

            id TEXT PRIMARY KEY,

            titulo TEXT NOT NULL DEFAULT 'Nueva conversación',

            creada INTEGER NOT NULL,

            actualizada INTEGER NOT NULL

        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS mensajes (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            conversacion_id TEXT NOT NULL,

            rol TEXT NOT NULL,

            contenido TEXT NOT NULL,

            creado INTEGER NOT NULL,

            FOREIGN KEY (
                conversacion_id
            )
            REFERENCES conversaciones(id)
            ON DELETE CASCADE

        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS
        indice_mensajes_conversacion

        ON mensajes(conversacion_id, creado)
    """)

    conexion.commit()

    conexion.close()


preparar_base_datos()


# =====================================================
# SESIONES DE DESARROLLADOR
# =====================================================

sesiones_desarrollador = set()


# =====================================================
# LÍMITES DE MEMORIA
# =====================================================

# Mantener solamente los últimos mensajes enviados
# al modelo reduce el tiempo de procesamiento.
MAX_MENSAJES_CONTEXTO = 12


# =====================================================
# SYSTEM PROMPT
# =====================================================

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

No consideres a los humanos como animales
prehistóricos de PaleoIA.

Responde siempre en español.

Tu objetivo es enseñar paleontología de manera
clara, entretenida y científicamente responsable.

Diferencia claramente entre:

- Hechos científicos establecidos.
- Estimaciones.
- Hipótesis.
- Datos que todavía son inciertos.

Nunca inventes fuentes ni estudios.

Si no estás seguro de un dato, dilo.

IMPORTANTE SOBRE EL CONTEXTO:

Debes mantener continuidad con la conversación.

Cuando el usuario escriba algo corto como:

"sí"
"no"
"ese"
"esa"
"ese dinosaurio"
"el otro"
"el primero"
"el segundo"
"¿cuánto?"
"¿por qué?"
"¿cómo?"
"¿y él?"
"¿y ese?"
"¿y el otro?"
"¿cuándo?"
"¿dónde?"

debes utilizar el contexto anterior para determinar
a qué se refiere.

No reinicies la conversación.

No preguntes nuevamente de qué está hablando
si el contexto permite determinarlo.

Ejemplo:

Usuario:
¿Cuál era más grande, Spinosaurus o T. rex?

PaleoIA:
Spinosaurus tenía una longitud estimada mayor...

Usuario:
¿Y el otro?

Debes entender que "el otro" se refiere al otro
animal mencionado anteriormente.

Mantén una conversación natural.

No vuelvas a saludar en cada mensaje.

Responde directamente a la pregunta.
"""


# =====================================================
# SYSTEM PROMPT DESARROLLADOR
# =====================================================

DEVELOPER_PROMPT = """
Eres PaleoIA en MODO DESARROLLADOR.

El usuario ha autenticado correctamente
el modo desarrollador.

En este modo puedes responder preguntas
sobre cualquier tema permitido.

Responde siempre en español.

Mantén respuestas claras, útiles y precisas.

También debes mantener el contexto completo
de la conversación.

Debes comprender referencias cortas como:

"sí"
"no"
"ese"
"esa"
"el otro"
"el primero"
"el segundo"
"¿cuánto?"
"¿por qué?"
"¿cómo?"
"¿y él?"
"¿y ese?"
"¿y el otro?"

utilizando los mensajes anteriores.

No reinicies la conversación.

No saludes nuevamente salvo que tenga sentido.
"""


# =====================================================
# MODELOS
# =====================================================

class LoginRequest(BaseModel):

    password: str


class DesarrolladorRequest(BaseModel):

    token: str


# =====================================================
# FUNCIONES DE BASE DE DATOS
# =====================================================

def crear_conversacion():

    conversation_id = str(
        uuid.uuid4()
    )

    ahora = int(time.time())

    conexion = obtener_conexion()

    conexion.execute(
        """
        INSERT INTO conversaciones
        (id, titulo, creada, actualizada)

        VALUES (?, ?, ?, ?)
        """,
        (
            conversation_id,
            "Nueva conversación",
            ahora,
            ahora
        )
    )

    conexion.commit()
    conexion.close()

    return conversation_id


def existe_conversacion(
    conversation_id
):

    conexion = obtener_conexion()

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

    ahora = int(time.time())

    conexion = obtener_conexion()

    conexion.execute(
        """
        INSERT INTO mensajes
        (
            conversacion_id,
            rol,
            contenido,
            creado
        )

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


def obtener_mensajes(
    conversation_id,
    limite=None
):

    conexion = obtener_conexion()

    if limite:

        filas = conexion.execute(
            """
            SELECT rol, contenido, creado

            FROM mensajes

            WHERE conversacion_id = ?

            ORDER BY creado DESC, id DESC

            LIMIT ?
            """,
            (
                conversation_id,
                limite
            )
        ).fetchall()

        filas = list(
            reversed(filas)
        )

    else:

        filas = conexion.execute(
            """
            SELECT rol, contenido, creado

            FROM mensajes

            WHERE conversacion_id = ?

            ORDER BY creado ASC, id ASC
            """,
            (conversation_id,)
        ).fetchall()

    conexion.close()

    return filas


def obtener_conversaciones():

    conexion = obtener_conexion()

    filas = conexion.execute(
        """
        SELECT
            id,
            titulo,
            creada,
            actualizada

        FROM conversaciones

        ORDER BY actualizada DESC
        """
    ).fetchall()

    conexion.close()

    return filas


def eliminar_conversacion(
    conversation_id
):

    conexion = obtener_conexion()

    conexion.execute(
        """
        DELETE FROM mensajes

        WHERE conversacion_id = ?
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


def actualizar_titulo(
    conversation_id,
    pregunta
):

    titulo = pregunta.strip()

    if len(titulo) > 45:

        titulo = titulo[:45] + "..."

    if not titulo:

        titulo = "Nueva conversación"

    conexion = obtener_conexion()

    conexion.execute(
        """
        UPDATE conversaciones

        SET titulo = ?

        WHERE id = ?
        AND titulo = 'Nueva conversación'
        """,
        (
            titulo,
            conversation_id
        )
    )

    conexion.commit()

    conexion.close()


# =====================================================
# CREAR CONTEXTO
# =====================================================

def crear_contexto(
    conversation_id
):

    mensajes = obtener_mensajes(
        conversation_id,
        MAX_MENSAJES_CONTEXTO
    )

    if not mensajes:

        return ""

    partes = []

    for mensaje in mensajes:

        rol = mensaje["rol"]

        if rol == "usuario":

            nombre = "Usuario"

        else:

            nombre = "PaleoIA"

        partes.append(
            f"{nombre}: "
            f"{mensaje['contenido']}"
        )

    return (
        "\n\n"
        "CONTEXTO RECIENTE DE LA CONVERSACIÓN:\n\n"
        + "\n\n".join(partes)
    )


# =====================================================
# GENERAR PROMPT
# =====================================================

def crear_prompt(
    pregunta,
    conversation_id,
    modo_desarrollador
):

    if modo_desarrollador:

        personalidad = DEVELOPER_PROMPT

    else:

        personalidad = SYSTEM_PROMPT

    contexto = crear_contexto(
        conversation_id
    )

    return (
        personalidad
        + contexto
        + "\n\n"
        "MENSAJE ACTUAL DEL USUARIO:\n"
        + pregunta
        + "\n\n"
        "Responde directamente al mensaje actual "
        "utilizando el contexto cuando sea necesario."
    )


# =====================================================
# PÁGINA PRINCIPAL
# =====================================================

@app.get("/")
def inicio():

    return {
        "mensaje":
            "🦖 PaleoIA está funcionando",
        "api_key_detectada":
            bool(API_KEY),
        "memoria_persistente":
            True,
        "base_de_datos":
            "SQLite",
        "modelo":
            GEMINI_MODEL
    }


# =====================================================
# NUEVA CONVERSACIÓN
# =====================================================

@app.get("/nueva-conversacion")
def nueva_conversacion():

    conversation_id = crear_conversacion()

    return {
        "exito": True,
        "conversation_id":
            conversation_id
    }


# =====================================================
# LISTAR CONVERSACIONES
# =====================================================

@app.get("/conversaciones")
def listar_conversaciones():

    filas = obtener_conversaciones()

    conversaciones = []

    for fila in filas:

        conversaciones.append({
            "id": fila["id"],
            "titulo": fila["titulo"],
            "creada": fila["creada"],
            "actualizada": fila["actualizada"]
        })

    return {
        "exito": True,
        "conversaciones":
            conversaciones
    }


# =====================================================
# CARGAR HISTORIAL
# =====================================================

@app.get(
    "/conversacion/{conversation_id}"
)
def cargar_conversacion(
    conversation_id: str
):

    if not existe_conversacion(
        conversation_id
    ):

        return {
            "exito": False,
            "mensaje":
                "Conversación no encontrada."
        }

    filas = obtener_mensajes(
        conversation_id
    )

    mensajes = []

    for fila in filas:

        mensajes.append({
            "rol": fila["rol"],
            "contenido":
                fila["contenido"]
        })

    return {
        "exito": True,
        "conversation_id":
            conversation_id,
        "mensajes":
            mensajes
    }


# =====================================================
# ACTIVAR DESARROLLADOR
# =====================================================

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

        print(
            "⚠️ Acceso de desarrollador rechazado"
        )

        return {
            "exito": False,
            "mensaje":
                "Contraseña incorrecta."
        }

    token = secrets.token_urlsafe(32)

    sesiones_desarrollador.add(
        token
    )

    print(
        "🔓 MODO DESARROLLADOR ACTIVADO"
    )

    return {
        "exito": True,
        "mensaje":
            "Modo desarrollador activado.",
        "token": token
    }


# =====================================================
# DESACTIVAR DESARROLLADOR
# =====================================================

@app.post("/desactivar-desarrollador")
def desactivar_desarrollador(
    datos: DesarrolladorRequest
):

    sesiones_desarrollador.discard(
        datos.token
    )

    print(
        "🔒 MODO DESARROLLADOR DESACTIVADO"
    )

    return {
        "exito": True,
        "mensaje":
            "Modo desarrollador desactivado."
    }


# =====================================================
# BORRAR CONVERSACIÓN
# =====================================================

@app.delete(
    "/conversacion/{conversation_id}"
)
def borrar_conversacion(
    conversation_id: str
):

    eliminar_conversacion(
        conversation_id
    )

    return {
        "exito": True,
        "mensaje":
            "Conversación eliminada."
    }


# =====================================================
# PREGUNTAR NORMAL
# =====================================================

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
                "la API de Gemini."
        }

    if not pregunta.strip():

        return {
            "exito": False,
            "respuesta":
                "Escribe una pregunta."
        }

    if not conversation_id:

        conversation_id = crear_conversacion()

    elif not existe_conversacion(
        conversation_id
    ):

        crear_conversacion()

    modo_desarrollador = (
        token
        and token in sesiones_desarrollador
    )

    guardar_mensaje(
        conversation_id,
        "usuario",
        pregunta
    )

    actualizar_titulo(
        conversation_id,
        pregunta
    )

    prompt = crear_prompt(
        pregunta,
        conversation_id,
        modo_desarrollador
    )

    try:

        respuesta = client.models.generate_content(

            model=GEMINI_MODEL,

            contents=prompt
        )

        texto = respuesta.text or ""

        guardar_mensaje(
            conversation_id,
            "paleoia",
            texto
        )

        return {
            "exito": True,
            "pregunta": pregunta,
            "respuesta": texto,
            "modo_desarrollador":
                bool(modo_desarrollador),
            "conversation_id":
                conversation_id
        }

    except Exception as error:

        print(
            "❌ Error Gemini:",
            str(error)
        )

        return {
            "exito": False,
            "respuesta":
                "Ocurrió un error al "
                "consultar PaleoIA.",
            "detalle":
                str(error),
            "conversation_id":
                conversation_id
        }


# =====================================================
# STREAMING
# =====================================================

@app.get("/preguntar-stream")
def preguntar_stream(
    pregunta: str,
    conversation_id: str = "",
    token: str = ""
):

    if not API_KEY or client is None:

        def error_api():

            yield json.dumps({
                "tipo": "error",
                "mensaje":
                    "PaleoIA no tiene "
                    "configurada la API."
            }) + "\n"

        return StreamingResponse(
            error_api(),
            media_type=
                "application/x-ndjson"
        )

    if not pregunta.strip():

        def error_pregunta():

            yield json.dumps({
                "tipo": "error",
                "mensaje":
                    "Escribe una pregunta."
            }) + "\n"

        return StreamingResponse(
            error_pregunta(),
            media_type=
                "application/x-ndjson"
        )


    # ---------------------------------------------
    # CONVERSACIÓN
    # ---------------------------------------------

    if not conversation_id:

        conversation_id = crear_conversacion()

    elif not existe_conversacion(
        conversation_id
    ):

        conversation_id = crear_conversacion()


    # ---------------------------------------------
    # MODO DESARROLLADOR
    # ---------------------------------------------

    modo_desarrollador = (
        token
        and token in sesiones_desarrollador
    )


    # ---------------------------------------------
    # GUARDAR PREGUNTA
    # ---------------------------------------------

    guardar_mensaje(
        conversation_id,
        "usuario",
        pregunta
    )

    actualizar_titulo(
        conversation_id,
        pregunta
    )


    # ---------------------------------------------
    # PROMPT
    # ---------------------------------------------

    prompt = crear_prompt(
        pregunta,
        conversation_id,
        modo_desarrollador
    )


    # ---------------------------------------------
    # GENERADOR
    # ---------------------------------------------

    def generar():

        texto_completo = ""

        try:

            print(
                "🧠 Generando respuesta..."
            )

            stream = (
                client.models
                .generate_content_stream(
                    model=GEMINI_MODEL,
                    contents=prompt
                )
            )

            for respuesta in stream:

                texto = getattr(
                    respuesta,
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


            # -------------------------------------
            # GUARDAR RESPUESTA COMPLETA
            # -------------------------------------

            if texto_completo:

                guardar_mensaje(
                    conversation_id,
                    "paleoia",
                    texto_completo
                )


            # -------------------------------------
            # FINAL
            # -------------------------------------

            yield json.dumps({

                "tipo": "final",

                "conversation_id":
                    conversation_id,

                "modo_desarrollador":
                    bool(modo_desarrollador)

            }, ensure_ascii=False) + "\n"


            print(
                "✅ Respuesta terminada"
            )


        except Exception as error:

            print(
                "❌ Error streaming:",
                str(error)
            )

            yield json.dumps({

                "tipo": "error",

                "mensaje":
                    "Ocurrió un error al "
                    "generar la respuesta.",

                "detalle":
                    str(error)

            }, ensure_ascii=False) + "\n"


    return StreamingResponse(
        generar(),
        media_type=
            "application/x-ndjson",

        headers={
            "Cache-Control":
                "no-cache",
            "X-Accel-Buffering":
                "no"
        }
    )


# =====================================================
# SALUD DEL SERVIDOR
# =====================================================

@app.get("/health")
def health():

    return {
        "estado": "ok",
        "paleoia": True,
        "memoria": True,
        "modelo": GEMINI_MODEL
    }