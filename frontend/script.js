/* =====================================================
   PALEOIA
   SCRIPT PRINCIPAL
===================================================== */


const BACKEND_URL =
    "https://paleoia-backend.onrender.com";


/* =====================================================
   ESTADO
===================================================== */

let conversationId =
    localStorage.getItem(
        "paleoia_conversation_id"
    ) || "";

let developerToken =
    localStorage.getItem(
        "paleoia_dev_token"
    ) || "";


/* =====================================================
   ELEMENTOS
===================================================== */

const preguntaInput =
    document.getElementById(
        "pregunta"
    );

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

const listaConversaciones =
    document.getElementById(
        "listaConversaciones"
    );


/* =====================================================
   ICONO DE PALEOIA
===================================================== */

function crearIconoPaleoIA() {

    if (
        document.querySelector(
            'link[rel="icon"]'
        )
    ) {
        return;
    }

    const canvas =
        document.createElement(
            "canvas"
        );

    canvas.width = 64;
    canvas.height = 64;

    const contexto =
        canvas.getContext("2d");


    /* Fondo */

    contexto.fillStyle =
        "#243f25";

    contexto.fillRect(
        0,
        0,
        64,
        64
    );


    /* Círculo */

    contexto.beginPath();

    contexto.arc(
        32,
        32,
        26,
        0,
        Math.PI * 2
    );

    contexto.fillStyle =
        "#b7d67c";

    contexto.fill();


    /* Dino */

    contexto.font =
        "32px Arial";

    contexto.textAlign =
        "center";

    contexto.textBaseline =
        "middle";

    contexto.fillText(
        "🦖",
        32,
        33
    );


    const icono =
        document.createElement(
            "link"
        );

    icono.rel = "icon";

    icono.type =
        "image/png";

    icono.href =
        canvas.toDataURL(
            "image/png"
        );

    document.head.appendChild(
        icono
    );
}


crearIconoPaleoIA();


/* =====================================================
   ESCAPAR HTML
===================================================== */

function escaparHTML(texto) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        texto ?? "";

    return div.innerHTML;
}


/* =====================================================
   FORMATEAR RESPUESTA
===================================================== */

function formatearRespuesta(
    texto
) {

    if (!texto) {
        return "";
    }


    texto =
        String(texto);


    /*
       Eliminar bloques Markdown
       de código.
    */

    texto =
        texto.replace(
            /```html/gi,
            ""
        );

    texto =
        texto.replace(
            /```javascript/gi,
            ""
        );

    texto =
        texto.replace(
            /```typescript/gi,
            ""
        );

    texto =
        texto.replace(
            /```python/gi,
            ""
        );

    texto =
        texto.replace(
            /```json/gi,
            ""
        );

    texto =
        texto.replace(
            /```css/gi,
            ""
        );

    texto =
        texto.replace(
            /```js/gi,
            ""
        );

    texto =
        texto.replace(
            /```markdown/gi,
            ""
        );

    texto =
        texto.replace(
            /```text/gi,
            ""
        );

    texto =
        texto.replace(
            /```/g,
            ""
        );


    /*
       Eliminar etiquetas HTML
       que puedan llegar por error.
    */

    texto =
        texto.replace(
            /<html[^>]*>/gi,
            ""
        );

    texto =
        texto.replace(
            /<\/html>/gi,
            ""
        );

    texto =
        texto.replace(
            /<head[^>]*>[\s\S]*?<\/head>/gi,
            ""
        );

    texto =
        texto.replace(
            /<body[^>]*>/gi,
            ""
        );

    texto =
        texto.replace(
            /<\/body>/gi,
            ""
        );


    /*
       Escapar HTML.
    */

    texto =
        escaparHTML(texto);


    /*
       Negritas.
    */

    texto =
        texto.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );


    /*
       Cursivas.
    */

    texto =
        texto.replace(
            /\*(.*?)\*/g,
            "<em>$1</em>"
        );


    /*
       Saltos de línea.
    */

    texto =
        texto.replace(
            /\n/g,
            "<br>"
        );


    return texto;
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
   CREAR MENSAJE USUARIO
===================================================== */

function agregarMensajeUsuario(
    texto
) {

    const mensaje =
        document.createElement(
            "div"
        );

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


    return mensaje;
}


/* =====================================================
   CREAR MENSAJE IA
===================================================== */

function crearMensajeIA() {

    const mensaje =
        document.createElement(
            "div"
        );

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
   MENSAJE DE BIENVENIDA
===================================================== */

function mostrarBienvenida() {

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
                    ¡Hola, explorador! 🌿
                </p>

                <p>
                    Pregúntame lo que quieras
                    sobre dinosaurios y vida
                    prehistórica.
                </p>

            </div>

        </div>

    `;
}


/* =====================================================
   CARGAR HISTORIAL
===================================================== */

async function cargarHistorial(
    id
) {

    if (!id) {
        return false;
    }


    try {

        const respuesta =
            await fetch(
                `${BACKEND_URL}/conversacion/${encodeURIComponent(id)}`
            );


        if (!respuesta.ok) {

            return false;

        }


        const datos =
            await respuesta.json();


        if (
            !datos.exito
            ||
            !Array.isArray(
                datos.mensajes
            )
        ) {

            return false;

        }


        conversacion.innerHTML =
            "";


        if (
            datos.mensajes.length === 0
        ) {

            mostrarBienvenida();

            return true;

        }


        for (
            const mensaje
            of datos.mensajes
        ) {

            if (
                mensaje.rol ===
                "usuario"
            ) {

                agregarMensajeUsuario(
                    mensaje.contenido
                );

            } else {

                const elemento =
                    crearMensajeIA();

                elemento.innerHTML =
                    formatearRespuesta(
                        mensaje.contenido
                    );

            }

        }


        desplazarChatAbajo();


        return true;


    } catch (error) {

        console.error(
            "Error cargando historial:",
            error
        );

        return false;

    }
}


/* =====================================================
   CREAR NUEVA CONVERSACIÓN
===================================================== */

async function crearNuevaConversacion() {

    try {

        const respuesta =
            await fetch(
                `${BACKEND_URL}/nueva-conversacion`
            );


        const datos =
            await respuesta.json();


        if (
            datos.exito
            &&
            datos.conversation_id
        ) {

            conversationId =
                datos.conversation_id;


            localStorage.setItem(
                "paleoia_conversation_id",
                conversationId
            );


            return true;

        }


    } catch (error) {

        console.error(
            "Error creando conversación:",
            error
        );

    }


    return false;
}


/* =====================================================
   CARGAR LISTA DE CONVERSACIONES
===================================================== */

async function cargarListaConversaciones() {

    if (!listaConversaciones) {
        return;
    }


    try {

        const respuesta =
            await fetch(
                `${BACKEND_URL}/conversaciones`
            );


        if (!respuesta.ok) {
            return;
        }


        const datos =
            await respuesta.json();


        if (
            !datos.exito
            ||
            !Array.isArray(
                datos.conversaciones
            )
        ) {

            return;

        }


        listaConversaciones.innerHTML =
            "";


        for (
            const conversacionItem
            of datos.conversaciones
        ) {

            const boton =
                document.createElement(
                    "button"
                );


            boton.type =
                "button";


            boton.textContent =
                conversacionItem.titulo
                ||
                "Nueva conversación";


            boton.dataset.id =
                conversacionItem.id;


            boton.style.width =
                "100%";

            boton.style.padding =
                "10px";

            boton.style.border =
                "1px solid rgba(255,255,255,.08)";

            boton.style.borderRadius =
                "10px";

            boton.style.background =
                "rgba(255,255,255,.04)";

            boton.style.color =
                "#f5f0d8";

            boton.style.textAlign =
                "left";

            boton.style.cursor =
                "pointer";


            if (
                conversacionItem.id ===
                conversationId
            ) {

                boton.style.background =
                    "rgba(183,214,124,.16)";

            }


            boton.addEventListener(
                "click",
                async function() {

                    conversationId =
                        this.dataset.id;


                    localStorage.setItem(
                        "paleoia_conversation_id",
                        conversationId
                    );


                    await cargarHistorial(
                        conversationId
                    );


                    cerrarMenu();

                    await cargarListaConversaciones();

                }
            );


            listaConversaciones.appendChild(
                boton
            );

        }


    } catch (error) {

        console.error(
            "Error cargando conversaciones:",
            error
        );

    }
}


/* =====================================================
   PREGUNTAR CON STREAMING
===================================================== */

async function preguntar() {

    const pregunta =
        preguntaInput.value.trim();


    if (!pregunta) {
        return;
    }


    if (
        botonPreguntar.disabled
    ) {
        return;
    }


    botonPreguntar.disabled =
        true;

    preguntaInput.disabled =
        true;


    agregarMensajeUsuario(
        pregunta
    );


    preguntaInput.value =
        "";


    const respuestaElemento =
        crearMensajeIA();


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


        let buffer =
            "";


        while (true) {

            const resultado =
                await reader.read();


            const value =
                resultado.value;

            const done =
                resultado.done;


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
                buffer.split(
                    "\n"
                );


            buffer =
                lineas.pop();


            for (
                const linea
                of lineas
            ) {

                if (
                    !linea.trim()
                ) {

                    continue;

                }


                try {

                    const datos =
                        JSON.parse(
                            linea
                        );


                    if (
                        datos.tipo ===
                        "texto"
                    ) {

                        /*
                           Añadimos el texto
                           recibido sin
                           reemplazar lo
                           anterior.
                        */

                        respuestaElemento.innerHTML +=
                            formatearRespuesta(
                                datos.texto
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


                        /*
                           Actualizar historial
                           lateral.
                        */

                        cargarListaConversaciones();

                    }


                    if (
                        datos.tipo ===
                        "error"
                    ) {

                        respuestaElemento.innerHTML =
                            `
                            <span class="error-paleoia">

                                ${escaparHTML(
                                    datos.mensaje ||
                                    "Ocurrió un error."
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
            "Error preguntando:",
            error
        );


        respuestaElemento.innerHTML =
            `
            <span class="error-paleoia">

                ❌ No se pudo conectar
                con PaleoIA.

            </span>
            `;

    }


    botonPreguntar.disabled =
        false;

    preguntaInput.disabled =
        false;


    preguntaInput.focus();


    desplazarChatAbajo();


    /*
       Actualizar lista por si
       cambió el título.
    */

    cargarListaConversaciones();
}


/* =====================================================
   ENTER
===================================================== */

if (preguntaInput) {

    preguntaInput.addEventListener(
        "keydown",
        function(evento) {

            if (
                evento.key ===
                "Enter"
                &&
                !evento.shiftKey
            ) {

                evento.preventDefault();

                preguntar();

            }

        }
    );

}


/* =====================================================
   BOTÓN ENVIAR
===================================================== */

if (botonPreguntar) {

    botonPreguntar.addEventListener(
        "click",
        preguntar
    );

}


/* =====================================================
   SUGERENCIAS
===================================================== */

document
    .querySelectorAll(
        ".sugerencias button"
    )
    .forEach(
        boton => {

            boton.addEventListener(
                "click",
                function() {

                    preguntaInput.value =
                        this.textContent.trim();

                    preguntar();

                }
            );

        }
    );


/* =====================================================
   MENÚ
===================================================== */

function abrirMenu() {

    if (barraLateral) {

        barraLateral.classList.add(
            "activo"
        );

    }


    if (fondoMenu) {

        fondoMenu.classList.add(
            "activo"
        );

    }


    cargarListaConversaciones();
}


function cerrarMenu() {

    if (barraLateral) {

        barraLateral.classList.remove(
            "activo"
        );

    }


    if (fondoMenu) {

        fondoMenu.classList.remove(
            "activo"
        );

    }

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
        async function() {

            const creado =
                await crearNuevaConversacion();


            if (!creado) {

                return;

            }


            mostrarBienvenida();


            cerrarMenu();


            await cargarListaConversaciones();


            preguntaInput.focus();

        }
    );

}


/* =====================================================
   INICIO
===================================================== */

async function iniciarPaleoIA() {

    /*
       Si existe una conversación
       guardada, cargarla.
    */

    if (conversationId) {

        const cargado =
            await cargarHistorial(
                conversationId
            );


        if (!cargado) {

            await crearNuevaConversacion();

            mostrarBienvenida();

        }

    } else {

        await crearNuevaConversacion();

        mostrarBienvenida();

    }


    /*
       Cargar historial lateral.
    */

    await cargarListaConversaciones();


    /*
       Dejar cursor listo.
    */

    if (preguntaInput) {

        preguntaInput.focus();

    }

}


iniciarPaleoIA();