/* =====================================================
   PALEOIA
   SCRIPT PRINCIPAL
   MEMORIA + HISTORIAL + BORRADO + STREAMING
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

let conversacionParaBorrar = "";


/* =====================================================
   ELEMENTOS
===================================================== */

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

const listaConversaciones =
    document.getElementById(
        "listaConversaciones"
    );


/* =====================================================
   MODAL BORRAR
===================================================== */

const modalBorrar =
    document.getElementById("modalBorrar");

const cancelarBorrar =
    document.getElementById("cancelarBorrar");

const confirmarBorrar =
    document.getElementById("confirmarBorrar");


/* =====================================================
   ICONO
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
        document.createElement("canvas");

    canvas.width = 64;
    canvas.height = 64;

    const ctx =
        canvas.getContext("2d");

    ctx.fillStyle = "#243f25";

    ctx.fillRect(
        0,
        0,
        64,
        64
    );

    ctx.beginPath();

    ctx.arc(
        32,
        32,
        27,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = "#b7d67c";

    ctx.fill();

    ctx.font =
        "32px Arial";

    ctx.textAlign =
        "center";

    ctx.textBaseline =
        "middle";

    ctx.fillText(
        "🦖",
        32,
        33
    );

    const icono =
        document.createElement("link");

    icono.rel = "icon";
    icono.type = "image/png";

    icono.href =
        canvas.toDataURL("image/png");

    document.head.appendChild(icono);
}

crearIconoPaleoIA();


/* =====================================================
   ESCAPAR HTML
===================================================== */

function escaparHTML(texto) {

    const div =
        document.createElement("div");

    div.textContent =
        texto ?? "";

    return div.innerHTML;
}


/* =====================================================
   FORMATEAR RESPUESTA
===================================================== */

function formatearRespuesta(texto) {

    if (!texto) {
        return "";
    }

    texto = String(texto);

    /*
       Quitar fences de Markdown.
    */

    texto = texto.replace(
        /```[a-zA-Z0-9_-]*/g,
        ""
    );

    texto = texto.replace(
        /```/g,
        ""
    );

    /*
       Quitar etiquetas HTML peligrosas
       que puedan aparecer por error.
    */

    texto = texto.replace(
        /<html[^>]*>/gi,
        ""
    );

    texto = texto.replace(
        /<\/html>/gi,
        ""
    );

    texto = texto.replace(
        /<head[^>]*>[\s\S]*?<\/head>/gi,
        ""
    );

    texto = texto.replace(
        /<body[^>]*>/gi,
        ""
    );

    texto = texto.replace(
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

    texto = texto.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );

    /*
       Cursivas.
    */

    texto = texto.replace(
        /\*(.*?)\*/g,
        "<em>$1</em>"
    );

    /*
       Saltos.
    */

    texto = texto.replace(
        /\n/g,
        "<br>"
    );

    return texto;
}


/* =====================================================
   SCROLL
===================================================== */

function desplazarChatAbajo() {

    if (!conversacion) {
        return;
    }

    requestAnimationFrame(() => {

        conversacion.scrollTop =
            conversacion.scrollHeight;

    });
}


/* =====================================================
   MENSAJE DEL USUARIO
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

    return mensaje;
}


/* =====================================================
   MENSAJE DE PALEOIA
===================================================== */

function agregarMensajeIA(texto = "") {

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

    const respuesta =
        mensaje.querySelector(
            ".respuesta-stream"
        );

    if (texto) {

        respuesta.innerHTML =
            formatearRespuesta(texto);

    }

    desplazarChatAbajo();

    return respuesta;
}


/* =====================================================
   BIENVENIDA
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
   NORMALIZAR ROL
===================================================== */

function obtenerTipoMensaje(rol) {

    if (!rol) {
        return "ia";
    }

    const rolNormalizado =
        String(rol)
            .trim()
            .toLowerCase();

    /*
       TODOS estos significan usuario.
    */

    if (
        rolNormalizado === "usuario" ||
        rolNormalizado === "user" ||
        rolNormalizado === "human"
    ) {
        return "usuario";
    }

    /*
       TODOS estos significan IA.
    */

    if (
        rolNormalizado === "paleoia" ||
        rolNormalizado === "ia" ||
        rolNormalizado === "assistant" ||
        rolNormalizado === "ai" ||
        rolNormalizado === "modelo"
    ) {
        return "ia";
    }

    /*
       Si no conocemos el rol,
       no asumimos que es usuario.
    */

    return "ia";
}


/* =====================================================
   CARGAR HISTORIAL
===================================================== */

async function cargarHistorial(id) {

    if (!id) {
        return false;
    }

    try {

        const respuesta =
            await fetch(
                `${BACKEND_URL}/historial/${encodeURIComponent(id)}`
            );

        if (!respuesta.ok) {
            return false;
        }

        const datos =
            await respuesta.json();

        if (
            !datos.exito ||
            !Array.isArray(datos.mensajes)
        ) {
            return false;
        }

        conversacion.innerHTML = "";

        if (
            datos.mensajes.length === 0
        ) {

            mostrarBienvenida();

            return true;
        }


        /*
           Reconstruir TODOS los mensajes
           respetando su rol real.
        */

        for (
            const mensaje
            of datos.mensajes
        ) {

            const tipo =
                obtenerTipoMensaje(
                    mensaje.rol
                );


            if (
                tipo === "usuario"
            ) {

                agregarMensajeUsuario(
                    mensaje.contenido
                );

            } else {

                agregarMensajeIA(
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

        if (!respuesta.ok) {
            return false;
        }

        const datos =
            await respuesta.json();

        if (
            datos.exito &&
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
   ABRIR CHAT
===================================================== */

async function abrirConversacion(id) {

    if (!id) {
        return;
    }

    conversationId = id;

    localStorage.setItem(
        "paleoia_conversation_id",
        conversationId
    );

    const cargado =
        await cargarHistorial(
            conversationId
        );

    if (!cargado) {

        alert(
            "No se pudo cargar esta conversación."
        );

        return;
    }

    cerrarMenu();

    await cargarListaConversaciones();

    if (preguntaInput) {
        preguntaInput.focus();
    }
}


/* =====================================================
   MODAL DE BORRADO
===================================================== */

function mostrarModalBorrar(id) {

    if (!modalBorrar) {
        return;
    }

    conversacionParaBorrar =
        id;

    modalBorrar.classList.add(
        "activo"
    );
}


function cerrarModalBorrar() {

    if (!modalBorrar) {
        return;
    }

    modalBorrar.classList.remove(
        "activo"
    );

    conversacionParaBorrar =
        "";
}


/* =====================================================
   BORRAR CONVERSACIÓN
===================================================== */

async function borrarConversacion(id) {

    if (!id) {
        return;
    }

    try {

        const respuesta =
            await fetch(
                `${BACKEND_URL}/conversacion/${encodeURIComponent(id)}`,
                {
                    method: "DELETE"
                }
            );

        if (!respuesta.ok) {

            throw new Error(
                `HTTP ${respuesta.status}`
            );

        }

        const datos =
            await respuesta.json();

        if (!datos.exito) {

            throw new Error(
                "El servidor rechazó el borrado."
            );
        }


        /*
           Si borramos el chat actual,
           crear uno nuevo.
        */

        if (
            id === conversationId
        ) {

            conversationId = "";

            localStorage.removeItem(
                "paleoia_conversation_id"
            );

            await crearNuevaConversacion();

            mostrarBienvenida();

        }


        cerrarModalBorrar();

        await cargarListaConversaciones();

    } catch (error) {

        console.error(
            "Error borrando conversación:",
            error
        );

        alert(
            "No se pudo borrar la conversación."
        );
    }
}


/* =====================================================
   CONFIRMAR BORRADO
===================================================== */

if (confirmarBorrar) {

    confirmarBorrar.addEventListener(
        "click",
        async () => {

            if (
                !conversacionParaBorrar
            ) {
                return;
            }

            const id =
                conversacionParaBorrar;

            await borrarConversacion(
                id
            );

        }
    );
}


if (cancelarBorrar) {

    cancelarBorrar.addEventListener(
        "click",
        cerrarModalBorrar
    );
}


if (modalBorrar) {

    modalBorrar.addEventListener(
        "click",
        evento => {

            if (
                evento.target ===
                modalBorrar
            ) {

                cerrarModalBorrar();

            }

        }
    );
}


/* =====================================================
   LISTA DE CONVERSACIONES
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
            !datos.exito ||
            !Array.isArray(
                datos.conversaciones
            )
        ) {
            return;
        }

        listaConversaciones.innerHTML =
            "";


        if (
            datos.conversaciones.length === 0
        ) {

            const vacio =
                document.createElement(
                    "div"
                );

            vacio.textContent =
                "No hay conversaciones.";

            vacio.style.opacity =
                ".5";

            vacio.style.fontSize =
                "13px";

            vacio.style.padding =
                "10px";

            listaConversaciones.appendChild(
                vacio
            );

            return;
        }


        for (
            const item
            of datos.conversaciones
        ) {

            /*
               IMPORTANTE:
               El backend usa conversation_id.
            */

            const id =
                item.conversation_id;


            if (!id) {
                continue;
            }


            /*
               CONTENEDOR
            */

            const contenedor =
                document.createElement(
                    "div"
                );

            contenedor.className =
                "conversacion-item";


            /*
               BOTÓN CHAT
            */

            const boton =
                document.createElement(
                    "button"
                );

            boton.type =
                "button";

            boton.className =
                "boton-conversacion";

            boton.textContent =
                item.titulo ||
                "Nueva conversación";

            boton.title =
                item.titulo ||
                "Nueva conversación";

            boton.dataset.id =
                id;


            /*
               CHAT ACTUAL
            */

            if (
                id === conversationId
            ) {

                boton.classList.add(
                    "seleccionado"
                );

            }


            boton.addEventListener(
                "click",
                () => {

                    abrirConversacion(
                        id
                    );

                }
            );


            /*
               BOTÓN ELIMINAR
            */

            const botonBorrar =
                document.createElement(
                    "button"
                );

            botonBorrar.type =
                "button";

            botonBorrar.className =
                "boton-borrar-chat";

            botonBorrar.textContent =
                "🗑️";

            botonBorrar.title =
                "Eliminar conversación";

            botonBorrar.setAttribute(
                "aria-label",
                "Eliminar conversación"
            );


            botonBorrar.addEventListener(
                "click",
                evento => {

                    evento.preventDefault();

                    evento.stopPropagation();

                    mostrarModalBorrar(
                        id
                    );

                }
            );


            /*
               ARMAR ELEMENTO
            */

            contenedor.appendChild(
                boton
            );

            contenedor.appendChild(
                botonBorrar
            );

            listaConversaciones.appendChild(
                contenedor
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
   PREGUNTAR
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


    /*
       Asegurar conversación.
    */

    if (!conversationId) {

        const creada =
            await crearNuevaConversacion();

        if (!creada) {

            botonPreguntar.disabled =
                false;

            preguntaInput.disabled =
                false;

            return;
        }
    }


    /*
       Mostrar pregunta.
    */

    agregarMensajeUsuario(
        pregunta
    );

    preguntaInput.value =
        "";


    /*
       Crear respuesta vacía.
    */

    const respuestaElemento =
        agregarMensajeIA();


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

            if (
                resultado.done
            ) {
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


                    /*
                       TEXTO
                    */

                    if (
                        datos.tipo ===
                        "texto"
                    ) {

                        /*
                           Para streaming no
                           escapamos el texto
                           completo acumulado.
                        */

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

                        await cargarListaConversaciones();
                    }


                    /*
                       ERROR
                    */

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
                        "Línea inválida:",
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

    await cargarListaConversaciones();
}


/* =====================================================
   ENTER
===================================================== */

if (preguntaInput) {

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
                () => {

                    if (!preguntaInput) {
                        return;
                    }

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
        async () => {

            const creado =
                await crearNuevaConversacion();

            if (!creado) {
                return;
            }

            mostrarBienvenida();

            cerrarMenu();

            await cargarListaConversaciones();

            if (preguntaInput) {
                preguntaInput.focus();
            }

        }
    );
}


/* =====================================================
   ESCAPE
===================================================== */

document.addEventListener(
    "keydown",
    evento => {

        if (
            evento.key === "Escape"
        ) {

            cerrarModalBorrar();

        }

    }
);


/* =====================================================
   INICIO
===================================================== */

async function iniciarPaleoIA() {

    /*
       Intentar recuperar el chat
       que estaba abierto.
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
       Cargar lista lateral.
    */

    await cargarListaConversaciones();


    /*
       Cursor.
    */

    if (preguntaInput) {

        preguntaInput.focus();

    }
}


iniciarPaleoIA();