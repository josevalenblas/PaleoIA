/* =========================================================
   PALEOIA - SCRIPT PRINCIPAL
   Chat + historial + memoria + información + desarrollador
========================================================= */

const BACKEND_URL =
    "https://paleoia-backend.onrender.com";


/* =========================================================
   ELEMENTOS
========================================================= */

const pregunta =
    document.getElementById("pregunta");

const botonPreguntar =
    document.getElementById("botonPreguntar");

const conversacion =
    document.getElementById("conversacion");

const listaConversaciones =
    document.getElementById("listaConversaciones");

const nuevoChat =
    document.getElementById("nuevoChat");

const botonInfo =
    document.getElementById("botonInfo");

const botonMenu =
    document.getElementById("botonMenu");

const barraLateral =
    document.getElementById("barraLateral");

const fondoMenu =
    document.getElementById("fondoMenu");


/* =========================================================
   MODAL BORRAR
========================================================= */

const modalBorrar =
    document.getElementById("modalBorrar");

const cancelarBorrar =
    document.getElementById("cancelarBorrar");

const confirmarBorrar =
    document.getElementById("confirmarBorrar");

const tituloBorrar =
    document.getElementById("tituloBorrar");

const textoBorrar =
    document.getElementById("textoBorrar");

const dinoBorrar =
    document.getElementById("dinoBorrar");


/* =========================================================
   VARIABLES
========================================================= */

let conversaciones = [];

let conversacionActualId = null;

let chatPendienteDeBorrar = null;


/* =========================================================
   MEMORIA
========================================================= */

function cargarMemoria() {

    try {

        const datos =
            localStorage.getItem(
                "paleoIA_conversaciones"
            );

        if (!datos) {
            return [];
        }

        const resultado =
            JSON.parse(datos);

        if (!Array.isArray(resultado)) {
            return [];
        }

        return resultado;

    } catch (error) {

        console.error(
            "❌ Error cargando conversaciones:",
            error
        );

        return [];

    }

}


function guardarMemoria() {

    try {

        localStorage.setItem(
            "paleoIA_conversaciones",
            JSON.stringify(conversaciones)
        );

        console.log(
            "💾 Conversaciones guardadas correctamente."
        );

        return true;

    } catch (error) {

        console.error(
            "❌ Error guardando conversaciones:",
            error
        );

        return false;

    }

}


conversaciones =
    cargarMemoria();


/* =========================================================
   CHAT ACTUAL
========================================================= */

function obtenerChatActual() {

    return conversaciones.find(
        function(chat) {

            return (
                chat.id ===
                conversacionActualId
            );

        }
    );

}


/* =========================================================
   MENÚ
========================================================= */

function abrirMenu() {

    if (!barraLateral || !fondoMenu) {
        return;
    }

    barraLateral.classList.add(
        "activo"
    );

    fondoMenu.classList.add(
        "activo"
    );

}


function cerrarMenu() {

    if (!barraLateral || !fondoMenu) {
        return;
    }

    barraLateral.classList.remove(
        "activo"
    );

    fondoMenu.classList.remove(
        "activo"
    );

}


function alternarMenu() {

    if (!barraLateral) {
        return;
    }

    if (
        barraLateral.classList.contains(
            "activo"
        )
    ) {

        cerrarMenu();

    } else {

        abrirMenu();

    }

}


if (botonMenu) {

    botonMenu.addEventListener(
        "click",
        alternarMenu
    );

}


if (fondoMenu) {

    fondoMenu.addEventListener(
        "click",
        cerrarMenu
    );

}


/* =========================================================
   BOTÓN ¿QUÉ ES PALEOIA?
========================================================= */

if (botonInfo) {

    botonInfo.addEventListener(
        "click",
        function() {

            mostrarInformacionPaleoIA();

        }
    );

}


function mostrarInformacionPaleoIA() {

    const existente =
        document.getElementById(
            "modalInfoPaleoIA"
        );

    if (existente) {

        existente.remove();

    }


    const modal =
        document.createElement("div");

    modal.id =
        "modalInfoPaleoIA";


    modal.style.position =
        "fixed";

    modal.style.inset =
        "0";

    modal.style.background =
        "rgba(0,0,0,.70)";

    modal.style.backdropFilter =
        "blur(6px)";

    modal.style.display =
        "flex";

    modal.style.alignItems =
        "center";

    modal.style.justifyContent =
        "center";

    modal.style.padding =
        "20px";

    modal.style.zIndex =
        "10000";


    const contenido =
        document.createElement("div");


    contenido.style.width =
        "100%";

    contenido.style.maxWidth =
        "600px";

    contenido.style.maxHeight =
        "85vh";

    contenido.style.overflowY =
        "auto";

    contenido.style.background =
        "linear-gradient(145deg,#243f25,#162b1b)";

    contenido.style.border =
        "1px solid rgba(183,214,124,.4)";

    contenido.style.borderRadius =
        "22px";

    contenido.style.padding =
        "32px";

    contenido.style.color =
        "#f5f0d8";

    contenido.style.boxShadow =
        "0 20px 70px rgba(0,0,0,.6)";


    contenido.innerHTML = `

        <div style="
            text-align:center;
            font-size:60px;
            margin-bottom:10px;
        ">
            🦖
        </div>

        <h2 style="
            text-align:center;
            color:#b7d67c;
            margin-bottom:20px;
            font-size:30px;
        ">
            ¿Qué es PaleoIA?
        </h2>

        <p style="
            line-height:1.7;
            margin-bottom:15px;
        ">
            <strong>PaleoIA</strong> es una inteligencia
            artificial creada para explorar y aprender
            sobre la vida prehistórica.
        </p>

        <p style="
            line-height:1.7;
            margin-bottom:15px;
        ">
            Está especializada principalmente en
            dinosaurios, pterosaurios, reptiles marinos,
            mamíferos prehistóricos, peces, anfibios,
            artrópodos y otros animales extintos.
        </p>

        <p style="
            line-height:1.7;
            margin-bottom:15px;
        ">
            Su objetivo es explicar la paleontología de
            una manera sencilla, entretenida y
            científicamente responsable.
        </p>

        <p style="
            line-height:1.7;
            margin-bottom:25px;
        ">
            Las respuestas de una inteligencia artificial
            pueden contener errores, por lo que la
            información importante debe comprobarse
            mediante fuentes científicas.
        </p>

        <div style="
            text-align:center;
        ">

            <button
                id="cerrarInfoPaleoIA"
                style="
                    padding:12px 24px;
                    border:none;
                    border-radius:12px;
                    background:#b7d67c;
                    color:#18251a;
                    font-weight:bold;
                    cursor:pointer;
                    font-size:15px;
                "
            >
                Entendido
            </button>

        </div>

    `;


    modal.appendChild(
        contenido
    );

    document.body.appendChild(
        modal
    );


    const cerrar =
        document.getElementById(
            "cerrarInfoPaleoIA"
        );


    if (cerrar) {

        cerrar.addEventListener(
            "click",
            function() {

                modal.remove();

            }
        );

    }


    modal.addEventListener(
        "click",
        function(evento) {

            if (
                evento.target ===
                modal
            ) {

                modal.remove();

            }

        }
    );

}


/* =========================================================
   MOSTRAR CONVERSACIONES
========================================================= */

function mostrarConversaciones() {

    if (!listaConversaciones) {
        return;
    }


    listaConversaciones.innerHTML =
        "";


    conversaciones.forEach(
        function(chat) {

            const fila =
                document.createElement(
                    "div"
                );


            fila.style.display =
                "flex";

            fila.style.gap =
                "5px";

            fila.style.marginBottom =
                "5px";


            const botonChat =
                document.createElement(
                    "button"
                );


            botonChat.textContent =
                chat.titulo;


            botonChat.style.flex =
                "1";

            botonChat.style.padding =
                "10px";

            botonChat.style.border =
                "none";

            botonChat.style.borderRadius =
                "8px";

            botonChat.style.textAlign =
                "left";

            botonChat.style.cursor =
                "pointer";

            botonChat.style.color =
                "#f5f0d8";

            botonChat.style.background =
                chat.id ===
                conversacionActualId

                    ? "rgba(183,214,124,.20)"

                    : "transparent";


            botonChat.addEventListener(
                "click",
                function() {

                    cargarConversacion(
                        chat.id
                    );

                    cerrarMenu();

                }
            );


            const botonBorrar =
                document.createElement(
                    "button"
                );


            botonBorrar.textContent =
                "🗑️";


            botonBorrar.style.width =
                "40px";

            botonBorrar.style.border =
                "none";

            botonBorrar.style.borderRadius =
                "8px";

            botonBorrar.style.background =
                "transparent";

            botonBorrar.style.cursor =
                "pointer";


            botonBorrar.addEventListener(
                "click",
                function(evento) {

                    evento.stopPropagation();

                    abrirModalBorrar(
                        chat.id
                    );

                }
            );


            fila.appendChild(
                botonChat
            );

            fila.appendChild(
                botonBorrar
            );


            listaConversaciones.appendChild(
                fila
            );

        }
    );


    if (
        conversaciones.length > 0
    ) {

        const borrarTodo =
            document.createElement(
                "button"
            );


        borrarTodo.textContent =
            "🗑️ Borrar todas las conversaciones";


        borrarTodo.style.width =
            "100%";

        borrarTodo.style.padding =
            "10px";

        borrarTodo.style.marginTop =
            "15px";

        borrarTodo.style.borderRadius =
            "8px";

        borrarTodo.style.border =
            "1px solid rgba(255,255,255,.15)";

        borrarTodo.style.background =
            "transparent";

        borrarTodo.style.color =
            "#f5f0d8";

        borrarTodo.style.cursor =
            "pointer";


        borrarTodo.addEventListener(
            "click",
            function() {

                abrirModalBorrar(
                    "TODAS"
                );

            }
        );


        listaConversaciones.appendChild(
            borrarTodo
        );

    }

}


/* =========================================================
   MODAL BORRAR
========================================================= */

function abrirModalBorrar(id) {

    if (!modalBorrar) {
        return;
    }


    chatPendienteDeBorrar =
        id;


    if (
        id === "TODAS"
    ) {

        dinoBorrar.textContent =
            "😭🦖";

        tituloBorrar.textContent =
            "¿En serio quieres extinguir toda nuestra aventura?";

        textoBorrar.textContent =
            "Todas tus conversaciones desaparecerán para siempre.";

        confirmarBorrar.textContent =
            "Sí, extinguir todo";

    } else {

        dinoBorrar.textContent =
            "😱🦖";

        tituloBorrar.textContent =
            "¡¿Seguro que quieres borrar esta conversación?!";

        textoBorrar.textContent =
            "Esta aventura prehistórica desaparecerá para siempre.";

        confirmarBorrar.textContent =
            "Sí, borrarla";

    }


    modalBorrar.classList.add(
        "activo"
    );

}


function cerrarModalBorrar() {

    chatPendienteDeBorrar =
        null;


    if (modalBorrar) {

        modalBorrar.classList.remove(
            "activo"
        );

    }

}


if (cancelarBorrar) {

    cancelarBorrar.addEventListener(
        "click",
        cerrarModalBorrar
    );

}


if (confirmarBorrar) {

    confirmarBorrar.addEventListener(
        "click",
        function() {

            if (
                chatPendienteDeBorrar ===
                "TODAS"
            ) {

                conversaciones =
                    [];

                conversacionActualId =
                    null;

                guardarMemoria();

                mostrarPantallaInicial();

            } else {

                conversaciones =
                    conversaciones.filter(
                        function(chat) {

                            return (
                                chat.id !==
                                chatPendienteDeBorrar
                            );

                        }
                    );


                if (
                    conversacionActualId ===
                    chatPendienteDeBorrar
                ) {

                    conversacionActualId =
                        null;

                    mostrarPantallaInicial();

                }


                guardarMemoria();

            }


            cerrarModalBorrar();

            mostrarConversaciones();

        }
    );

}


/* =========================================================
   PANTALLA INICIAL
========================================================= */

function mostrarPantallaInicial() {

    if (!conversacion) {
        return;
    }


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
                    sobre nuestros amigos
                    prehistóricos.
                </p>

            </div>

        </div>

    `;

}


/* =========================================================
   NUEVO CHAT
========================================================= */

function crearNuevoChat() {

    conversacionActualId =
        null;

    pregunta.value =
        "";

    mostrarPantallaInicial();

    mostrarConversaciones();

    cerrarMenu();

    pregunta.focus();

}


if (nuevoChat) {

    nuevoChat.addEventListener(
        "click",
        crearNuevoChat
    );

}


/* =========================================================
   CARGAR CONVERSACIÓN
========================================================= */

function cargarConversacion(id) {

    const chat =
        conversaciones.find(
            function(item) {

                return (
                    item.id === id
                );

            }
        );


    if (!chat) {
        return;
    }


    conversacionActualId =
        chat.id;


    conversacion.innerHTML =
        "";


    chat.mensajes.forEach(
        function(mensaje) {

            mostrarMensaje(
                mensaje.tipo,
                mensaje.texto
            );

        }
    );


    mostrarConversaciones();

    cerrarMenu();

}


/* =========================================================
   MOSTRAR MENSAJE
========================================================= */

function mostrarMensaje(
    tipo,
    texto
) {

    const mensaje =
        document.createElement(
            "div"
        );


    mensaje.className =
        "mensaje " + tipo;


    if (
        tipo === "usuario"
    ) {

        mensaje.innerHTML = `

            <div class="burbuja">

                <strong>
                    Tú
                </strong>

                <p></p>

            </div>

        `;

    } else {

        mensaje.innerHTML = `

            <div class="avatar">
                🦖
            </div>

            <div class="burbuja">

                <strong>
                    PaleoIA
                </strong>

                <p></p>

            </div>

        `;

    }


    const parrafo =
        mensaje.querySelector(
            "p"
        );


    if (parrafo) {

        parrafo.textContent =
            texto;

    }


    conversacion.appendChild(
        mensaje
    );


    conversacion.scrollTop =
        conversacion.scrollHeight;

}


/* =========================================================
   ENVIAR PREGUNTA
========================================================= */

async function enviarPregunta() {

    const texto =
        pregunta.value.trim();


    if (!texto) {
        return;
    }


    /* -----------------------------------------
       CREAR CHAT SI NO EXISTE
    ----------------------------------------- */

    if (
        conversacionActualId ===
        null
    ) {

        const nuevoChatObjeto = {

            id: Date.now(),

            titulo:
                texto.length > 35

                    ? texto.substring(
                        0,
                        35
                    ) + "..."

                    : texto,

            mensajes: []

        };


        conversaciones.push(
            nuevoChatObjeto
        );


        conversacionActualId =
            nuevoChatObjeto.id;


        guardarMemoria();

    }


    const chat =
        obtenerChatActual();


    if (!chat) {

        console.error(
            "No se encontró el chat actual."
        );

        return;

    }


    /* -----------------------------------------
       GUARDAR PREGUNTA
    ----------------------------------------- */

    chat.mensajes.push({

        tipo: "usuario",

        texto: texto

    });


    guardarMemoria();

    mostrarConversaciones();

    mostrarMensaje(
        "usuario",
        texto
    );


    pregunta.value =
        "";


    /* -----------------------------------------
       MENSAJE DE CARGA
    ----------------------------------------- */

    const mensajeIA =
        document.createElement(
            "div"
        );


    mensajeIA.className =
        "mensaje ia";


    mensajeIA.innerHTML = `

        <div class="avatar">
            🦖
        </div>

        <div class="burbuja">

            <strong>
                PaleoIA
            </strong>

            <p>
                🔬 Estoy preparando
                la respuesta...
            </p>

        </div>

    `;


    conversacion.appendChild(
        mensajeIA
    );


    conversacion.scrollTop =
        conversacion.scrollHeight;


    const idChat =
        conversacionActualId;


    /* -----------------------------------------
       TOKEN DESARROLLADOR
    ----------------------------------------- */

    let token = null;

    try {

        token =
            sessionStorage.getItem(
                "paleoia_dev_token"
            );

    } catch (error) {

        console.warn(
            "No se pudo acceder al token."
        );

    }


    /* -----------------------------------------
       CONSTRUIR URL
    ----------------------------------------- */

    const parametros =
        new URLSearchParams();


    parametros.set(
        "pregunta",
        texto
    );


    if (token) {

        parametros.set(
            "token",
            token
        );

    }


    const url =
        BACKEND_URL +
        "/preguntar?" +
        parametros.toString();


    /* -----------------------------------------
       PETICIÓN
    ----------------------------------------- */

    try {

        console.log(
            "🦖 Enviando pregunta a PaleoIA..."
        );


        const respuesta =
            await fetch(
                url,
                {
                    method: "GET",
                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        if (!respuesta.ok) {

            throw new Error(
                "Error del servidor: " +
                respuesta.status
            );

        }


        const datos =
            await respuesta.json();


        const respuestaTexto =
            datos.respuesta ||
            "PaleoIA no recibió una respuesta.";


        /* -----------------------------------------
           MOSTRAR RESPUESTA
        ----------------------------------------- */

        const parrafoIA =
            mensajeIA.querySelector(
                "p"
            );


        if (parrafoIA) {

            parrafoIA.textContent =
                respuestaTexto;

        }


        /* -----------------------------------------
           GUARDAR RESPUESTA
        ----------------------------------------- */

        const chatGuardar =
            conversaciones.find(
                function(item) {

                    return (
                        item.id ===
                        idChat
                    );

                }
            );


        if (chatGuardar) {

            chatGuardar.mensajes.push({

                tipo: "ia",

                texto:
                    respuestaTexto

            });


            guardarMemoria();

            mostrarConversaciones();

        }


        console.log(
            "✅ Respuesta guardada."
        );


    } catch (error) {

        console.error(
            "❌ Error enviando pregunta:",
            error
        );


        const parrafoIA =
            mensajeIA.querySelector(
                "p"
            );


        if (parrafoIA) {

            parrafoIA.textContent =
                "❌ No pude conectar con PaleoIA. " +
                "Es posible que el servidor esté despertando. " +
                "Intenta nuevamente en unos segundos.";

        }

    }

}


/* =========================================================
   BOTÓN ENVIAR
========================================================= */

if (botonPreguntar) {

    botonPreguntar.addEventListener(
        "click",
        enviarPregunta
    );

}


/* =========================================================
   ENTER PARA ENVIAR
========================================================= */

if (pregunta) {

    pregunta.addEventListener(
        "keydown",
        function(evento) {

            if (
                evento.key === "Enter"
            ) {

                evento.preventDefault();

                enviarPregunta();

            }

        }
    );

}


/* =========================================================
   SUGERENCIAS
========================================================= */

document
    .querySelectorAll(
        ".sugerencias button"
    )
    .forEach(
        function(boton) {

            boton.addEventListener(
                "click",
                function() {

                    pregunta.value =
                        boton.textContent
                            .trim();

                    enviarPregunta();

                }
            );

        }
    );


/* =========================================================
   INICIALIZAR
========================================================= */

mostrarConversaciones();

mostrarPantallaInicial();

console.log(
    "🦖 PaleoIA cargado correctamente."
);