const BACKEND_URL =
    "https://paleoia-backend.onrender.com";


let conversationId =
    localStorage.getItem(
        "paleoia_conversation_id"
    ) || "";


let developerToken =
    localStorage.getItem(
        "paleoia_dev_token"
    ) || "";


const preguntaInput =
    document.getElementById("pregunta");


const botonPreguntar =
    document.getElementById(
        "botonPreguntar"
    );


const conversacion =
    document.getElementById(
        "conversacion"
    );


const botonMenu =
    document.getElementById(
        "botonMenu"
    );


const barraLateral =
    document.getElementById(
        "barraLateral"
    );


const fondoMenu =
    document.getElementById(
        "fondoMenu"
    );


const nuevoChat =
    document.getElementById(
        "nuevoChat"
    );


/* =====================================================
   CREAR CONVERSACIÓN
===================================================== */

async function crearNuevaConversacion() {

    try {

        const respuesta =
            await fetch(
                `${BACKEND_URL}/nueva-conversacion`
            );


        if (!respuesta.ok) {

            throw new Error(
                "No se pudo crear la conversación."
            );

        }


        const datos =
            await respuesta.json();


        conversationId =
            datos.conversation_id;


        localStorage.setItem(
            "paleoia_conversation_id",
            conversationId
        );


    } catch (error) {

        console.error(error);


        if (
            window.crypto &&
            crypto.randomUUID
        ) {

            conversationId =
                crypto.randomUUID();

        } else {

            conversationId =
                Date.now().toString();

        }


        localStorage.setItem(
            "paleoia_conversation_id",
            conversationId
        );

    }

}


/* =====================================================
   ESCAPAR HTML
===================================================== */

function escaparHTML(texto) {

    const div =
        document.createElement("div");


    div.textContent =
        String(texto ?? "");


    return div.innerHTML;

}


/* =====================================================
   LIMPIAR RESPUESTA DE GEMINI
===================================================== */

function limpiarRespuesta(texto) {

    if (!texto) {
        return "";
    }


    texto = String(texto);


    /*
       Elimina bloques de código Markdown
       como:

       ```html
       contenido
       ```

       pero conserva el contenido.
    */

    texto = texto.replace(
        /```(?:html|javascript|js|css|markdown|text)?/gi,
        ""
    );


    texto = texto.replace(
        /```/g,
        ""
    );


    /*
       Elimina etiquetas HTML que Gemini
       pueda devolver accidentalmente.
    */

    texto = texto.replace(
        /<!DOCTYPE[^>]*>/gi,
        ""
    );


    texto = texto.replace(
        /<\/?(html|head|body)[^>]*>/gi,
        ""
    );


    return texto.trim();

}


/* =====================================================
   FORMATEAR RESPUESTA
===================================================== */

function formatearRespuesta(texto) {

    texto =
        limpiarRespuesta(texto);


    texto =
        escaparHTML(texto);


    /*
       Negritas
    */

    texto = texto.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );


    /*
       Cursivas
    */

    texto = texto.replace(
        /(?<!\*)\*([^*]+)\*(?!\*)/g,
        "<em>$1</em>"
    );


    /*
       Saltos de línea
    */

    texto = texto.replace(
        /\n/g,
        "<br>"
    );


    return texto;

}


/* =====================================================
   AGREGAR MENSAJE DEL USUARIO
===================================================== */

function agregarMensajeUsuario(
    texto
) {

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
   CREAR RESPUESTA DE PALEOIA
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

            <p
                class="respuesta-stream"
            ></p>

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
   SCROLL DEL CHAT
===================================================== */

function desplazarChatAbajo() {

    requestAnimationFrame(
        () => {

            conversacion.scrollTop =
                conversacion.scrollHeight;

        }
    );

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


    /*
       Indicador mientras comienza
       la respuesta.
    */

    respuestaElemento.innerHTML =
        "🧠 Pensando...";


    try {

        const parametros =
            new URLSearchParams({

                pregunta:
                    pregunta,

                conversation_id:
                    conversationId,

                token:
                    developerToken

            });


        const respuesta =
            await fetch(
                `${BACKEND_URL}/preguntar-stream?${parametros.toString()}`
            );


        if (!respuesta.ok) {

            throw new Error(
                `HTTP ${respuesta.status}`
            );

        }


        if (!respuesta.body) {

            throw new Error(
                "El servidor no devolvió streaming."
            );

        }


        const reader =
            respuesta.body.getReader();


        const decoder =
            new TextDecoder(
                "utf-8"
            );


        let buffer = "";


        /*
           Quitamos el "Pensando..."
           cuando llega el primer texto.
        */

        let comenzoRespuesta =
            false;


        while (true) {

            const resultado =
                await reader.read();


            if (resultado.done) {
                break;
            }


            buffer +=
                decoder.decode(
                    resultado.value,
                    {
                        stream: true
                    }
                );


            const lineas =
                buffer.split("\n");


            buffer =
                lineas.pop();


            for (
                const linea of lineas
            ) {

                if (!linea.trim()) {
                    continue;
                }


                try {

                    const datos =
                        JSON.parse(
                            linea
                        );


                    /*
                       TEXTO
                    */

                    if (
                        datos.tipo ===
                        "texto"
                    ) {

                        if (
                            !comenzoRespuesta
                        ) {

                            respuestaElemento.innerHTML =
                                "";

                            comenzoRespuesta =
                                true;

                        }


                        respuestaElemento.innerHTML +=
                            formatearRespuesta(
                                datos.texto
                            );


                        desplazarChatAbajo();

                    }


                    /*
                       FINAL
                    */

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


                    /*
                       ERROR
                    */

                    if (
                        datos.tipo ===
                        "error"
                    ) {

                        respuestaElemento.innerHTML = `

                            <span
                                class="error-paleoia"
                            >
                                ${escaparHTML(
                                    datos.mensaje
                                )}
                            </span>

                        `;

                    }

                } catch (error) {

                    console.warn(
                        "Datos no válidos:",
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


        respuestaElemento.innerHTML = `

            <span
                class="error-paleoia"
            >
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
    (evento) => {

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
   BOTÓN ENVIAR
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
    .forEach(
        (boton) => {

            boton.addEventListener(
                "click",
                () => {

                    preguntaInput.value =
                        boton.textContent.trim();


                    preguntar();

                }
            );

        }
    );


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

async function iniciarPaleoIA() {

    if (!conversationId) {

        await crearNuevaConversacion();

    }

}


iniciarPaleoIA();