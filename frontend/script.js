const pregunta = document.getElementById("pregunta");
const botonPreguntar = document.getElementById("botonPreguntar");
const conversacion = document.getElementById("conversacion");
const listaConversaciones = document.getElementById("listaConversaciones");
const nuevoChat = document.getElementById("nuevoChat");

const modalBorrar = document.getElementById("modalBorrar");
const cancelarBorrar = document.getElementById("cancelarBorrar");
const confirmarBorrar = document.getElementById("confirmarBorrar");

const tituloBorrar = document.getElementById("tituloBorrar");
const textoBorrar = document.getElementById("textoBorrar");
const dinoBorrar = document.getElementById("dinoBorrar");

const botonMenu = document.getElementById("botonMenu");
const barraLateral = document.getElementById("barraLateral");
const fondoMenu = document.getElementById("fondoMenu");

let conversaciones = [];
let conversacionActualId = null;
let chatPendienteDeBorrar = null;



/* ==========================================
   MEMORIA
========================================== */

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
            "Error cargando memoria:",
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
            "💾 Memoria guardada correctamente"
        );

    } catch (error) {

        console.error(
            "Error guardando memoria:",
            error
        );

    }

}


conversaciones = cargarMemoria();



/* ==========================================
   OBTENER CHAT ACTUAL
========================================== */

function obtenerChatActual() {

    return conversaciones.find(
        function (chat) {

            return chat.id ===
                conversacionActualId;

        }
    );

}



/* ==========================================
   MENÚ CELULAR
========================================== */

function abrirMenu() {

    if (!barraLateral || !fondoMenu) {

        return;

    }

    barraLateral.classList.add("activo");

    fondoMenu.classList.add("activo");

}


function cerrarMenu() {

    if (!barraLateral || !fondoMenu) {

        return;

    }

    barraLateral.classList.remove("activo");

    fondoMenu.classList.remove("activo");

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



/* ==========================================
   MOSTRAR CONVERSACIONES
========================================== */

function mostrarConversaciones() {

    if (!listaConversaciones) {

        return;

    }

    listaConversaciones.innerHTML = "";


    conversaciones.forEach(
        function (chat) {

            const fila =
                document.createElement("div");

            fila.style.display = "flex";

            fila.style.gap = "5px";

            fila.style.marginBottom = "5px";


            const botonChat =
                document.createElement("button");

            botonChat.textContent =
                chat.titulo;

            botonChat.style.flex = "1";

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
                function () {

                    cargarConversacion(
                        chat.id
                    );

                    cerrarMenu();

                }
            );


            const botonBorrar =
                document.createElement("button");

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
                function (event) {

                    event.stopPropagation();

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


    if (conversaciones.length > 0) {

        const borrarTodo =
            document.createElement("button");

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
            function () {

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



/* ==========================================
   MODAL DE BORRADO
========================================== */

function abrirModalBorrar(id) {

    if (!modalBorrar) {

        return;

    }

    chatPendienteDeBorrar = id;


    if (id === "TODAS") {

        dinoBorrar.textContent =
            "😭🦖";

        tituloBorrar.textContent =
            "¿En serio quieres extinguir toda nuestra aventura?";

        textoBorrar.textContent =
            "Todas tus conversaciones desaparecerán para siempre. ¡Ni siquiera los fósiles podrán recuperarlas! 🦴🥺";

        confirmarBorrar.textContent =
            "Sí, extinguir todo";

    } else {

        dinoBorrar.textContent =
            "😱🦖";

        tituloBorrar.textContent =
            "¡¿Seguro que quieres borrar esta conversación?!";

        textoBorrar.textContent =
            "Esta aventura prehistórica desaparecerá para siempre. 🥺";

        confirmarBorrar.textContent =
            "Sí, borrarla";

    }


    modalBorrar.classList.add(
        "activo"
    );

}


function cerrarModalBorrar() {

    chatPendienteDeBorrar = null;

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
        function () {

            if (
                chatPendienteDeBorrar ===
                "TODAS"
            ) {

                conversaciones = [];

                conversacionActualId =
                    null;

                guardarMemoria();

                mostrarPantallaInicial();

            } else {

                conversaciones =
                    conversaciones.filter(
                        function (chat) {

                            return chat.id !==
                                chatPendienteDeBorrar;

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



/* ==========================================
   PANTALLA INICIAL
========================================== */

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



/* ==========================================
   NUEVO CHAT
========================================== */

function crearNuevoChat() {

    conversacionActualId =
        null;

    pregunta.value = "";

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



/* ==========================================
   CARGAR CONVERSACIÓN
========================================== */

function cargarConversacion(id) {

    const chat =
        conversaciones.find(
            function (item) {

                return item.id === id;

            }
        );


    if (!chat) {

        return;

    }


    conversacionActualId =
        chat.id;

    conversacion.innerHTML = "";


    chat.mensajes.forEach(
        function (mensaje) {

            mostrarMensaje(
                mensaje.tipo,
                mensaje.texto
            );

        }
    );


    mostrarConversaciones();

    cerrarMenu();

}



/* ==========================================
   MOSTRAR MENSAJE
========================================== */

function mostrarMensaje(
    tipo,
    texto
) {

    const mensaje =
        document.createElement("div");

    mensaje.className =
        "mensaje " + tipo;


    if (tipo === "usuario") {

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
        mensaje.querySelector("p");

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



/* ==========================================
   ENVIAR PREGUNTA
========================================== */

async function enviarPregunta() {

    const texto =
        pregunta.value.trim();


    if (texto === "") {

        return;

    }


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

        return;

    }


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


    pregunta.value = "";


    const mensajeIA =
        document.createElement("div");


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


    try {

        const respuesta =
            await fetch(

                "http://192.168.5.200:8000/preguntar?pregunta=" +

                encodeURIComponent(
                    texto
                )

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


        const parrafoIA =
            mensajeIA.querySelector(
                "p"
            );


        if (parrafoIA) {

            parrafoIA.textContent =
                respuestaTexto;

        }


        const chatGuardar =
            conversaciones.find(
                function (item) {

                    return item.id ===
                        idChat;

                }
            );


        if (!chatGuardar) {

            return;

        }


        chatGuardar.mensajes.push({

            tipo: "ia",

            texto: respuestaTexto

        });


        guardarMemoria();

        mostrarConversaciones();


        console.log(
            "✅ Respuesta guardada correctamente"
        );


    } catch (error) {

        console.error(
            "❌ Error:",
            error
        );


        const parrafoError =
            mensajeIA.querySelector(
                "p"
            );


        if (parrafoError) {

            parrafoError.textContent =
                "❌ No se pudo conectar con PaleoIA. Comprueba que el servidor esté encendido.";

        }

    }

}



/* ==========================================
   BOTÓN PREGUNTAR
========================================== */

if (botonPreguntar) {

    botonPreguntar.addEventListener(
        "click",
        enviarPregunta
    );

}



/* ==========================================
   ENTER PARA ENVIAR
========================================== */

if (pregunta) {

    pregunta.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                enviarPregunta();

            }

        }
    );

}



/* ==========================================
   BOTONES DE SUGERENCIAS
========================================== */

const botonesSugerencias =
    document.querySelectorAll(
        ".sugerencias button"
    );


botonesSugerencias.forEach(
    function (boton) {

        boton.addEventListener(
            "click",
            function () {

                pregunta.value =
                    boton.textContent.trim();

                enviarPregunta();

            }
        );

    }
);



/* ==========================================
   ESC PARA CERRAR MENÚ Y MODAL
========================================== */

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key ===
            "Escape"
        ) {

            cerrarMenu();

            cerrarModalBorrar();

        }

    }
);



/* ==========================================
   INICIAR PALEOIA
========================================== */

mostrarConversaciones();

console.log(
    "🦖 PaleoIA iniciada correctamente"
);