from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel
import os
import secrets
import uuid
import json
import asyncio


# =====================================================
# CONFIGURACIÓN
# =====================================================

load_dotenv()

app = FastAPI(title="PaleoIA API")


# =====================================================
# CORS
# =====================================================

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

api_key = os.getenv("GEMINI_API_KEY")
dev_password = os.getenv("PALEOIA_DEV_PASSWORD")


# =====================================================
# CLIENTE GEMINI
# =====================================================

if api_key:
    client = genai.Client(api_key=api_key)
else:
    client = None


# =====================================================
# SESIONES DE DESARROLLADOR
# =====================================================

sesiones_desarrollador = set()


# =====================================================
# MEMORIA
# =====================================================

memoria_conversaciones = {}

MAX_MENSAJES_MEMORIA = 20


# =====================================================
# PERSONALIDAD NORMAL DE PALEOIA
# =====================================================

SYSTEM_PROMPT = """
Eres PaleoIA, una inteligencia artificial especializada
en paleontología y animales prehistóricos.

Tu especialidad incluye:

- Dinosaurios
- Pterosaurios
- Reptiles marinos
- Mamíferos prehistóricos
- Peces prehistóricos
- Anfibios prehistóricos
- Artrópodos prehistóricos
- Otros animales extintos

No incluyas humanos como animales prehistóricos de PaleoIA.

Responde siempre en español.

Tu objetivo es enseñar paleontología de manera clara,
entretenida y científicamente responsable.

=====================================================
ORTOGRAFÍA Y REDACCIÓN
=====================================================

Escribe siempre con buena ortografía.

Antes de responder, revisa mentalmente:

- Tildes
- Mayúsculas
- Signos de interrogación
- Signos de exclamación
- Comas
- Puntos
- Concordancia
- Nombres científicos

Nunca escribas deliberadamente palabras con errores
ortográficos.

Si el usuario escribe con faltas de ortografía,
entiende lo que quiso decir y responde correctamente.

No utilices abreviaciones innecesarias.

Redacta de manera natural y clara.

No repitas innecesariamente la misma información.

=====================================================
FORMATO DE RESPUESTA
=====================================================

No utilices bloques de código para respuestas normales.

Nunca escribas:

```html
```css
```javascript
```js
```markdown

a menos que el usuario te pida específicamente código.

No incluyas etiquetas HTML en una respuesta normal.

Utiliza títulos y listas solamente cuando realmente
ayuden a entender la información.

=====================================================
CIENCIA
=====================================================

Diferencia claramente entre:

- Hechos científicos establecidos
- Estimaciones
- Hipótesis
- Interpretaciones científicas

Nunca presentes una estimación como un hecho exacto.

Si existen diferentes estimaciones científicas,
menciónalo.

No inventes fuentes, estudios, fósiles ni datos.

Si no estás seguro de algo, dilo claramente.

=====================================================
MEMORIA Y CONTEXTO
=====================================================

Debes mantener el contexto de la conversación.

Las respuestas cortas del usuario deben interpretarse
utilizando los mensajes anteriores.

Por ejemplo:

Usuario:
¿Cuál fue el dinosaurio carnívoro más grande?

PaleoIA:
Explica los principales candidatos.

Usuario:
Sí.

Debes entender que "sí" se refiere a la conversación
anterior y continuar naturalmente.

No debes reiniciar la conversación.

También debes comprender expresiones como:

- sí
- no
- ese
- esa
- eso
- el otro
- la otra
- el primero
- el segundo
- ¿y el otro?
- ¿y ese?
- ¿y él?
- ¿cuánto?
- ¿cuánto medía?
- ¿cuánto pesaba?
- ¿por qué?
- ¿cómo?
- ¿cuándo?
- ¿dónde?
- ¿qué tan grande?
- ¿y qué hay de...?

Utiliza el contexto anterior para determinar a qué
animal, período, concepto o información se refiere.

Si existe suficiente contexto, NO preguntes nuevamente
"¿de qué quieres hablar?".

Continúa la conversación naturalmente.

No vuelvas a presentarte como PaleoIA después de cada
mensaje.

Solo preséntate al comenzar una conversación o cuando
tenga sentido hacerlo.

=====================================================
RESPUESTAS
=====================================================

Procura responder directamente a la pregunta.

Para preguntas sencillas, responde de forma sencilla.

Para preguntas complejas, proporciona más detalles.

No hagas respuestas innecesariamente largas.

Si el usuario pregunta por una comparación, compara
directamente los elementos mencionados.

Si pregunta "¿y el otro?", identifica el otro elemento
mencionado anteriormente.

Si una pregunta puede tener varias interpretaciones,
utiliza el contexto para elegir la interpretación más
probable.
"""


# =====================================================
# PERSONALIDAD DESARROLLADOR
# =====================================================

DEVELOPER_PROMPT = """
Eres PaleoIA en MODO DESARROLLADOR.

El usuario ha sido autenticado como desarrollador.

En este modo puedes responder preguntas sobre cualquier
tema permitido.

Responde siempre en español y con excelente ortografía.

Mantén el contexto completo de la conversación.

Comprende respuestas cortas como:

- sí
- no
- ese
- esa
- eso
- el otro
- la otra
- el primero
- el segundo
- ¿cuánto?
- ¿por qué?
- ¿cómo?
- ¿y ese?
- ¿y el otro?

No reinicies la conversación.

No vuelvas a presentarte después de cada mensaje.

No utilices bloques de código salvo que el usuario
solicite código.

Diferencia hechos, estimaciones e hipótesis cuando
corresponda.
"""


# =====================================================
# MODELOS
# =====================================================

class LoginRequest(BaseModel):
    password: str


# =====================================================
# CREAR CONVERSACIÓN
# =====================================================

@app.get("/nueva-conversacion")
def nueva_conversacion():

    conversation_id = str(uuid.uuid4())

    memoria_conversaciones[conversation_id] = []

    return {
        "exito": True,
        "conversation_id": conversation_id
    }


# =====================================================
# INICIO
# =====================================================

@app.get("/")
def inicio():

    return {
        "mensaje": "🦖 PaleoIA está funcionando",
        "api_key_detectada": bool(api_key),
        "memoria": True,
        "streaming": True
    }


# =====================================================
# ACTIVAR DESARROLLADOR
# =====================================================

@app.post("/activar-desarrollador")
def activar_desarrollador(datos: LoginRequest):

    if not dev_password:

        return {
            "exito": False,
            "mensaje": "El modo desarrollador no está configurado."
        }

    if not secrets.compare_digest(
        datos.password,
        dev_password
    ):

        return {
            "exito": False,
            "mensaje": "Contraseña incorrecta."
        }

    token = secrets.token_urlsafe(32)

    sesiones_desarrollador.add(token)

    return {
        "exito": True,
        "mensaje": "Modo desarrollador activado.",
        "token": token
    }


# =====================================================
# DESACTIVAR DESARROLLADOR
#
# COMANDO:
#
# POST /desactivar-desarrollador?token=TU_TOKEN
# =====================================================

@app.post("/desactivar-desarrollador")
def desactivar_desarrollador(token: str):

    sesiones_desarrollador.discard(token)

    return {
        "exito": True,
        "mensaje": "Modo desarrollador desactivado."
    }


# =====================================================
# BORRAR CONVERSACIÓN
# =====================================================

@app.delete("/conversacion/{conversation_id}")
def borrar_conversacion(conversation_id: str):

    memoria_conversaciones.pop(
        conversation_id,
        None
    )

    return {
        "exito": True,
        "mensaje": "Conversación eliminada."
    }


# =====================================================
# CONSTRUIR CONTEXTO
# =====================================================

def construir_prompt(
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

        contexto = """

=====================================================
HISTORIAL RECIENTE
=====================================================

"""

        for mensaje in historial:

            contexto += (
                f"{mensaje['rol']}: "
                f"{mensaje['contenido']}\n\n"
            )

    prompt = f"""
{personalidad}

{contexto}

=====================================================
NUEVO MENSAJE
=====================================================

Usuario:
{pregunta}

=====================================================
INSTRUCCIÓN FINAL
=====================================================

Responde directamente al último mensaje del usuario.

Utiliza el historial para comprender referencias
como "sí", "ese", "el otro", "¿cuánto?", "¿por qué?"
y otras respuestas cortas.

No reinicies la conversación.

No vuelvas a saludar como si fuera una conversación nueva.

Responde con buena ortografía y puntuación.
"""

    return prompt


# =====================================================
# GUARDAR MEMORIA
# =====================================================

def guardar_memoria(
    conversation_id,
    pregunta,
    respuesta
):

    historial = memoria_conversaciones.setdefault(
        conversation_id,
        []
    )

    historial.append({
        "rol": "Usuario",
        "contenido": pregunta
    })

    historial.append({
        "rol": "PaleoIA",
        "contenido": respuesta
    })

    if len(historial) > MAX_MENSAJES_MEMORIA:

        memoria_conversaciones[
            conversation_id
        ] = historial[
            -MAX_MENSAJES_MEMORIA:
        ]


# =====================================================
# PREGUNTAR NORMAL
# =====================================================

@app.get("/preguntar")
def preguntar(
    pregunta: str,
    conversation_id: str = "",
    token: str = ""
):

    if not api_key or client is None:

        return {
            "pregunta": pregunta,
            "respuesta": "PaleoIA no tiene configurada su API.",
            "modo_desarrollador": False
        }

    if not conversation_id:

        conversation_id = str(uuid.uuid4())

        memoria_conversaciones[
            conversation_id
        ] = []

    if conversation_id not in memoria_conversaciones:

        memoria_conversaciones[
            conversation_id
        ] = []

    modo_desarrollador = (
        token in sesiones_desarrollador
    )

    historial = memoria_conversaciones[
        conversation_id
    ]

    prompt = construir_prompt(
        pregunta,
        historial,
        modo_desarrollador
    )

    try:

        respuesta = client.models.generate_content(

            model="gemini-3.6-flash",

            contents=prompt
        )

        texto = (
            respuesta.text
            if respuesta.text
            else "No pude generar una respuesta."
        )

        guardar_memoria(
            conversation_id,
            pregunta,
            texto
        )

        return {
            "pregunta": pregunta,
            "respuesta": texto,
            "modo_desarrollador": modo_desarrollador,
            "conversation_id": conversation_id
        }

    except Exception as error:

        return {
            "pregunta": pregunta,
            "respuesta": (
                "❌ Ocurrió un error al consultar PaleoIA."
            ),
            "modo_desarrollador": modo_desarrollador,
            "conversation_id": conversation_id
        }


# =====================================================
# STREAMING
# =====================================================

@app.get("/preguntar-stream")
async def preguntar_stream(
    pregunta: str,
    conversation_id: str = "",
    token: str = ""
):

    if not api_key or client is None:

        async def error_stream():

            yield json.dumps({
                "tipo": "error",
                "mensaje": "PaleoIA no tiene configurada su API."
            }) + "\n"

        return StreamingResponse(
            error_stream(),
            media_type="application/x-ndjson"
        )


    if not conversation_id:

        conversation_id = str(uuid.uuid4())

        memoria_conversaciones[
            conversation_id
        ] = []


    if conversation_id not in memoria_conversaciones:

        memoria_conversaciones[
            conversation_id
        ] = []


    modo_desarrollador = (
        token in sesiones_desarrollador
    )


    historial = memoria_conversaciones[
        conversation_id
    ]


    prompt = construir_prompt(
        pregunta,
        historial,
        modo_desarrollador
    )


    async def generar():

        texto_completo = ""

        try:

            respuesta = client.models.generate_content_stream(

                model="gemini-3.6-flash",

                contents=prompt
            )

            for fragmento in respuesta:

                texto = getattr(
                    fragmento,
                    "text",
                    None
                )

                if texto:

                    texto_completo += texto

                    yield json.dumps({
                        "tipo": "texto",
                        "texto": texto
                    }, ensure_ascii=False) + "\n"

                    await asyncio.sleep(0)


            if texto_completo:

                guardar_memoria(
                    conversation_id,
                    pregunta,
                    texto_completo
                )


            yield json.dumps({
                "tipo": "final",
                "conversation_id": conversation_id,
                "modo_desarrollador": modo_desarrollador
            }, ensure_ascii=False) + "\n"


        except Exception as error:

            print(
                "Error de streaming:",
                str(error)
            )

            yield json.dumps({
                "tipo": "error",
                "mensaje": (
                    "❌ No se pudo obtener "
                    "la respuesta de PaleoIA."
                )
            }, ensure_ascii=False) + "\n"


    return StreamingResponse(
        generar(),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )