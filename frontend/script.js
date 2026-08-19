const BACKEND_URL = "https://paleoia-backend.onrender.com";

let conversationId =
    localStorage.getItem("paleoia_conversation_id") || "";

let developerToken =
    localStorage.getItem("paleoia_dev_token") || "";


const preguntaInput =
    document.getElementById("pregunta");

const botonPreguntar =
    document.getElementById("botonPreguntar");

const conversacion =
    document.getElementById("conversacion");

const botonMenu =
    document.getElementById("botonMenu");

const barraLateral =
    document.getElementById("barraLateral");

const fondoMenu =
    document.getElementById("fondoMenu");

const nuevoChat =
    document.getElementById("nuevoChat");


/* =====================================================
   NUEVA CONVERSACIÓN
===================================================== */

async function crearNuevaConversacion() {

    try {

        const respuesta = await fetch(
            `${BACKEND_URL}/nueva-conversacion`
        );

        const datos = await respuesta.json();

        conversationId =
            datos.conversation_id;

    } catch {

        conversationId =
            crypto.randomUUID();
    }

    localStorage.setItem(
        "paleoia_conversation_id",
        conversationId
    );
}


/* =====================================================
   ESCAPAR HTML
===================================================== */

function escaparHTML(texto) {

    const div =
        document.createElement("div");

    div.textContent = texto;

    return div.innerHTML;
}


/* =====================================================
   FORMATEAR RESPUESTA
===================================================== */

function formatearRespuesta(texto) {

    texto = texto
        .replace(/```html/gi, "")
        .replace(/```javascript/gi, "")
        .replace(/```js/gi, "")
        .replace(/```css/gi, "")
        .replace(/```markdown/gi, "")
        .replace(/```/g, "");

    texto = escaparHTML(texto);

    texto = texto.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );

    texto = texto.replace(
        /\*(.*?)\*/g,
        "<em>$1</em>"
    );

    texto = texto.replace(
        /\n/g,
        "<br>"
    );

    return texto;
}


/* =====================================================
   MENSAJE USUARIO
===================================================== */

function agregarMensajeUsuario(texto) {

    const mensaje =
        document.createElement("div");

    mensaje.className =
        "mensaje usuario";

    mensaje.innerHTML = `
        <div class="burbuja">
            ${escaparHTML(texto)}
        </div>
    `;

    conversacion.appendChild(
        mensaje
    );

    desplazarChatAbajo();
}


/* =====================================================
   MENSAJE IA
===================================================== */

function crearMensajeIA() {

    const mensaje =
        document.createElement("div");

    mensaje.className =
        "mensaje ia";

    mensaje.innerHTML = `
        <div class="avatar">
            🦖
        </div>

        <div class="burbuja">

            <strong>
                PaleoIA
            </strong>

            <p class="respuesta-stream"></p>

        </div>
    `;

    conversacion.appendChild(
        mensaje
    );

    desplazarChatAbajo();

    return mensaje.querySelector(
        ".respuesta-stream"
    );
}


/* =====================================================
   SCROLL
===================================================== */

function desplazarChatAbajo() {

    requestAnimationFrame(() => {

        conversacion.scrollTop =
            conversacion.scrollHeight;

    });
}


/* =====================================================
   PREGUNTAR
===================================================== */

async function preguntar() {

    const pregunta =
        preguntaInput.value.trim();

    if (!pregunta) {
        return;
    }


    botonPreguntar.disabled =
        true;

    preguntaInput.disabled =
        true;


    agregarMensajeUsuario(
        pregunta
    );


    preguntaInput.value = "";


    const respuestaElemento =
        crearMensajeIA();


    let respuestaCompleta = "";


    try {

        const parametros =
            new URLSearchParams({

                pregunta,

                conversation_id:
                    conversationId,

                token:
                    developerToken

            });


        const respuesta =
            await fetch(
                `${BACKEND_URL}/preguntar-stream?${parametros}`
            );


        if (!respuesta.ok) {

            throw new Error(
                `HTTP ${respuesta.status}`
            );

        }


        const reader =
            respuesta.body.getReader();

        const decoder =
            new TextDecoder("utf-8");


        let buffer = "";


        while (true) {

            const {
                value,
                done
            } = await reader.read();


            if (done) {
                break;
            }


            buffer +=
                decoder.decode(
                    value,
                    {
                        stream: true
                    }
                );


            const lineas =
                buffer.split("\n");


            buffer =
                lineas.pop();


            for (const linea of lineas) {

                if (!linea.trim()) {
                    continue;
                }


                try {

                    const datos =
                        JSON.parse(linea);


                    if (
                        datos.tipo ===
                        "texto"
                    ) {

                        respuestaCompleta +=
                            datos.texto;

                        respuestaElemento.innerHTML =
                            formatearRespuesta(
                                respuestaCompleta
                            );

                        desplazarChatAbajo();
                    }


                    if (
                        datos.tipo ===
                        "final"
                    ) {

                        if (
                            datos.conversation_id
                        ) {

                            conversationId =
                                datos.conversation_id;

                            localStorage.setItem(
                                "paleoia_conversation_id",
                                conversationId
                            );

                        }

                    }


                    if (
                        datos.tipo ===
                        "error"
                    ) {

                        respuestaElemento.innerHTML =
                            `
                            <span class="error-paleoia">
                                ${escaparHTML(
                                    datos.mensaje
                                )}
                            </span>
                            `;
                    }


                } catch (error) {

                    console.warn(
                        "Respuesta no válida:",
                        linea
                    );

                }

            }

        }


    } catch (error) {

        console.error(
            "Error:",
            error
        );


        respuestaElemento.innerHTML =
            `
            <span class="error-paleoia">
                ❌ No se pudo conectar con PaleoIA.
            </span>
            `;

    }


    botonPreguntar.disabled =
        false;

    preguntaInput.disabled =
        false;

    preguntaInput.focus();

    desplazarChatAbajo();
}


/* =====================================================
   ENTER
===================================================== */

preguntaInput.addEventListener(
    "keydown",
    evento => {

        if (
            evento.key === "Enter" &&
            !evento.shiftKey
        ) {

            evento.preventDefault();

            preguntar();

        }

    }
);


/* =====================================================
   BOTÓN
===================================================== */

botonPreguntar.addEventListener(
    "click",
    preguntar
);


/* =====================================================
   SUGERENCIAS
===================================================== */

document
    .querySelectorAll(
        ".sugerencias button"
    )
    .forEach(boton => {

        boton.addEventListener(
            "click",
            () => {

                preguntaInput.value =
                    boton.textContent.trim();

                preguntar();

            }
        );

    });


/* =====================================================
   MENÚ
===================================================== */

function abrirMenu() {

    barraLateral.classList.add(
        "activo"
    );

    fondoMenu.classList.add(
        "activo"
    );
}


function cerrarMenu() {

    barraLateral.classList.remove(
        "activo"
    );

    fondoMenu.classList.remove(
        "activo"
    );
}


if (botonMenu) {

    botonMenu.addEventListener(
        "click",
        abrirMenu
    );

}


if (fondoMenu) {

    fondoMenu.addEventListener(
        "click",
        cerrarMenu
    );

}


/* =====================================================
   NUEVO CHAT
===================================================== */

if (nuevoChat) {

    nuevoChat.addEventListener(
        "click",
        async () => {

            conversacion.innerHTML = `
                <div class="mensaje ia">

                    <div class="avatar">
                        🦖
                    </div>

                    <div class="burbuja">

                        <strong>
                            PaleoIA
                        </strong>

                        <p>
                            ¡Nueva aventura prehistórica! 🌿
                        </p>

                        <p>
                            ¿Qué quieres descubrir?
                        </p>

                    </div>

                </div>
            `;


            await crearNuevaConversacion();

            cerrarMenu();

        }
    );

}


/* =====================================================
   INICIO
===================================================== */

if (!conversationId) {

    crearNuevaConversacion();

}