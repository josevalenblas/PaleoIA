/* ==========================================
   PALEOIA
   MODO DESARROLLADOR
========================================== */


/* ==========================================
   CONFIGURACIÓN
========================================== */

const BACKEND_URL =
    "https://paleoia-backend.onrender.com";


/* ==========================================
   ELEMENTOS
========================================== */

const botonDesarrollador =
    document.getElementById(
        "botonDesarrollador"
    );


const modalDesarrollador =
    document.getElementById(
        "modalDesarrollador"
    );


const cerrarDesarrollador =
    document.getElementById(
        "cerrarDesarrollador"
    );


const passwordDesarrollador =
    document.getElementById(
        "passwordDesarrollador"
    );


const activarDesarrollador =
    document.getElementById(
        "activarDesarrollador"
    );


const desactivarDesarrollador =
    document.getElementById(
        "desactivarDesarrollador"
    );


const mensajeDesarrollador =
    document.getElementById(
        "mensajeDesarrollador"
    );


const loginDesarrollador =
    document.getElementById(
        "loginDesarrollador"
    );


const panelActivoDesarrollador =
    document.getElementById(
        "panelActivoDesarrollador"
    );



/* ==========================================
   TOKEN
========================================== */

let tokenDesarrollador =
    sessionStorage.getItem(
        "paleoia_dev_token"
    );



/* ==========================================
   ABRIR MODAL
========================================== */

if (botonDesarrollador) {

    botonDesarrollador.addEventListener(
        "click",
        () => {

            modalDesarrollador
                .classList
                .add("activo");

            actualizarInterfazDev();

            setTimeout(() => {

                if (!tokenDesarrollador) {

                    passwordDesarrollador
                        .focus();

                }

            }, 100);

        }
    );

}



/* ==========================================
   CERRAR MODAL
========================================== */

if (cerrarDesarrollador) {

    cerrarDesarrollador.addEventListener(
        "click",
        cerrarModalDev
    );

}


if (modalDesarrollador) {

    modalDesarrollador.addEventListener(
        "click",
        (evento) => {

            if (
                evento.target ===
                modalDesarrollador
            ) {

                cerrarModalDev();

            }

        }
    );

}


function cerrarModalDev() {

    modalDesarrollador
        .classList
        .remove("activo");

}



/* ==========================================
   ACTIVAR MODO DESARROLLADOR
========================================== */

if (activarDesarrollador) {

    activarDesarrollador.addEventListener(
        "click",
        activarModoDesarrollador
    );

}



/* ENTER EN CONTRASEÑA */

if (passwordDesarrollador) {

    passwordDesarrollador.addEventListener(
        "keydown",
        (evento) => {

            if (
                evento.key === "Enter"
            ) {

                activarModoDesarrollador();

            }

        }
    );

}



/* ==========================================
   FUNCIÓN LOGIN
========================================== */

async function activarModoDesarrollador() {

    const password =
        passwordDesarrollador
            .value
            .trim();


    if (!password) {

        mostrarMensaje(
            "Introduce la contraseña.",
            "error"
        );

        return;

    }


    activarDesarrollador.disabled =
        true;


    activarDesarrollador.textContent =
        "Verificando...";


    mostrarMensaje(
        "",
        ""
    );


    try {

        const respuesta =
            await fetch(
                `${BACKEND_URL}/activar-desarrollador`,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        password: password
                    })

                }
            );


        const datos =
            await respuesta.json();


        if (
            datos.exito &&
            datos.token
        ) {

            tokenDesarrollador =
                datos.token;


            sessionStorage.setItem(
                "paleoia_dev_token",
                tokenDesarrollador
            );


            passwordDesarrollador
                .value = "";


            mostrarMensaje(
                "✓ Modo desarrollador activado.",
                "exito"
            );


            actualizarInterfazDev();


            setTimeout(() => {

                cerrarModalDev();

            }, 1000);


        } else {

            mostrarMensaje(
                datos.mensaje ||
                "Contraseña incorrecta.",
                "error"
            );

        }


    } catch (error) {

        console.error(
            "Error activando desarrollador:",
            error
        );


        mostrarMensaje(
            "No se pudo conectar con PaleoIA.",
            "error"
        );

    }


    activarDesarrollador.disabled =
        false;


    activarDesarrollador.textContent =
        "Activar modo desarrollador";

}



/* ==========================================
   DESACTIVAR
========================================== */

if (desactivarDesarrollador) {

    desactivarDesarrollador.addEventListener(
        "click",
        desactivarModoDesarrollador
    );

}


async function desactivarModoDesarrollador() {

    if (tokenDesarrollador) {

        try {

            await fetch(
                `${BACKEND_URL}/desactivar-desarrollador?token=${encodeURIComponent(tokenDesarrollador)}`,
                {
                    method: "POST"
                }
            );

        } catch (error) {

            console.error(error);

        }

    }


    sessionStorage.removeItem(
        "paleoia_dev_token"
    );


    tokenDesarrollador =
        null;


    actualizarInterfazDev();


    mostrarMensaje(
        "Modo desarrollador cerrado.",
        "exito"
    );

}



/* ==========================================
   ACTUALIZAR INTERFAZ
========================================== */

function actualizarInterfazDev() {

    const activo =
        Boolean(tokenDesarrollador);


    if (activo) {

        loginDesarrollador.hidden =
            true;

        panelActivoDesarrollador.hidden =
            false;

        botonDesarrollador
            ?.classList
            .add("activo");

    } else {

        loginDesarrollador.hidden =
            false;

        panelActivoDesarrollador.hidden =
            true;

        botonDesarrollador
            ?.classList
            .remove("activo");

    }

}



/* ==========================================
   MENSAJES
========================================== */

function mostrarMensaje(
    texto,
    tipo
) {

    mensajeDesarrollador.textContent =
        texto;


    mensajeDesarrollador.className =
        "mensaje-desarrollador";


    if (tipo) {

        mensajeDesarrollador
            .classList
            .add(tipo);

    }

}



/* ==========================================
   AGREGAR TOKEN A /PREGUNTAR
==========================================

   Esto permite que tu script.js actual
   siga funcionando.

   Cuando el usuario está autenticado,
   cualquier petición a /preguntar recibe
   automáticamente su token.
========================================== */

const fetchOriginal =
    window.fetch;


window.fetch = function (
    recurso,
    opciones = {}
) {

    try {

        const url =
            typeof recurso === "string"
                ? recurso
                : recurso.url;


        if (
            url &&
            url.includes("/preguntar") &&
            tokenDesarrollador
        ) {

            const separador =
                url.includes("?")
                    ? "&"
                    : "?";


            const nuevaUrl =
                url +
                separador +
                "token=" +
                encodeURIComponent(
                    tokenDesarrollador
                );


            if (
                typeof recurso ===
                "string"
            ) {

                recurso =
                    nuevaUrl;

            } else {

                recurso =
                    new Request(
                        nuevaUrl,
                        recurso
                    );

            }

        }

    } catch (error) {

        console.error(
            "Error agregando token:",
            error
        );

    }


    return fetchOriginal(
        recurso,
        opciones
    );

};



/* ==========================================
   INICIO
========================================== */

actualizarInterfazDev();