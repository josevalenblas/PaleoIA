/* =========================================================
   PALEOIA
   MODO DESARROLLADOR
========================================================= */


/* =========================================================
   CONFIGURACIÓN
========================================================= */

const BACKEND_URL_DEV =
    "https://paleoia-backend.onrender.com";


/* =========================================================
   ELEMENTOS
========================================================= */

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


/* =========================================================
   TOKEN
========================================================= */

let tokenDesarrollador = null;


try {

    tokenDesarrollador =
        sessionStorage.getItem(
            "paleoia_dev_token"
        );

} catch (error) {

    console.warn(
        "No se pudo leer el token."
    );

}


/* =========================================================
   ABRIR MODAL
========================================================= */

if (botonDesarrollador) {

    botonDesarrollador.addEventListener(
        "click",
        function() {

            if (modalDesarrollador) {

                modalDesarrollador
                    .classList
                    .add("activo");

            }


            actualizarInterfazDev();


            setTimeout(
                function() {

                    if (
                        !tokenDesarrollador &&
                        passwordDesarrollador
                    ) {

                        passwordDesarrollador
                            .focus();

                    }

                },
                100
            );

        }
    );

}


/* =========================================================
   CERRAR MODAL
========================================================= */

if (cerrarDesarrollador) {

    cerrarDesarrollador.addEventListener(
        "click",
        cerrarModalDev
    );

}


if (modalDesarrollador) {

    modalDesarrollador.addEventListener(
        "click",
        function(evento) {

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

    if (modalDesarrollador) {

        modalDesarrollador
            .classList
            .remove("activo");

    }

}


/* =========================================================
   ACTIVAR DESARROLLADOR
========================================================= */

if (activarDesarrollador) {

    activarDesarrollador.addEventListener(
        "click",
        activarModoDesarrollador
    );

}


/* =========================================================
   ENTER EN CONTRASEÑA
========================================================= */

if (passwordDesarrollador) {

    passwordDesarrollador.addEventListener(
        "keydown",
        function(evento) {

            if (
                evento.key === "Enter"
            ) {

                evento.preventDefault();

                activarModoDesarrollador();

            }

        }
    );

}


/* =========================================================
   LOGIN
========================================================= */

async function activarModoDesarrollador() {

    if (!passwordDesarrollador) {
        return;
    }


    const password =
        passwordDesarrollador
            .value
            .trim();


    if (!password) {

        mostrarMensajeDev(
            "Introduce la contraseña.",
            "error"
        );

        return;

    }


    if (activarDesarrollador) {

        activarDesarrollador.disabled =
            true;

        activarDesarrollador.textContent =
            "Verificando...";

    }


    try {

        const respuesta =
            await fetch(
                BACKEND_URL_DEV +
                "/activar-desarrollador",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            password:
                                password
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


            try {

                sessionStorage.setItem(
                    "paleoia_dev_token",
                    tokenDesarrollador
                );

            } catch (error) {

                console.error(
                    "No se pudo guardar el token:",
                    error
                );

            }


            passwordDesarrollador
                .value = "";


            mostrarMensajeDev(
                "✓ Modo desarrollador activado.",
                "exito"
            );


            actualizarInterfazDev();


            setTimeout(
                function() {

                    cerrarModalDev();

                },
                800
            );


        } else {

            mostrarMensajeDev(
                datos.mensaje ||
                "❌ Contraseña incorrecta.",
                "error"
            );

        }


    } catch (error) {

        console.error(
            "❌ Error activando desarrollador:",
            error
        );


        mostrarMensajeDev(
            "❌ No se pudo conectar con PaleoIA.",
            "error"
        );

    }


    if (activarDesarrollador) {

        activarDesarrollador.disabled =
            false;

        activarDesarrollador.textContent =
            "Activar modo desarrollador";

    }

}


/* =========================================================
   DESACTIVAR
========================================================= */

if (desactivarDesarrollador) {

    desactivarDesarrollador.addEventListener(
        "click",
        desactivarModoDesarrollador
    );

}


async function desactivarModoDesarrollador() {

    const token =
        tokenDesarrollador;


    if (token) {

        try {

            await fetch(
                BACKEND_URL_DEV +
                "/desactivar-desarrollador?token=" +
                encodeURIComponent(token),
                {
                    method: "POST"
                }
            );

        } catch (error) {

            console.error(
                "Error cerrando sesión:",
                error
            );

        }

    }


    try {

        sessionStorage.removeItem(
            "paleoia_dev_token"
        );

    } catch (error) {

        console.error(error);

    }


    tokenDesarrollador =
        null;


    actualizarInterfazDev();


    mostrarMensajeDev(
        "Modo desarrollador cerrado.",
        "exito"
    );

}


/* =========================================================
   ACTUALIZAR INTERFAZ
========================================================= */

function actualizarInterfazDev() {

    const activo =
        Boolean(
            tokenDesarrollador
        );


    if (
        activo
    ) {

        if (loginDesarrollador) {

            loginDesarrollador.hidden =
                true;

        }


        if (panelActivoDesarrollador) {

            panelActivoDesarrollador.hidden =
                false;

        }


        if (botonDesarrollador) {

            botonDesarrollador
                .classList
                .add("activo");

        }

    } else {

        if (loginDesarrollador) {

            loginDesarrollador.hidden =
                false;

        }


        if (panelActivoDesarrollador) {

            panelActivoDesarrollador.hidden =
                true;

        }


        if (botonDesarrollador) {

            botonDesarrollador
                .classList
                .remove("activo");

        }

    }

}


/* =========================================================
   MENSAJES
========================================================= */

function mostrarMensajeDev(
    texto,
    tipo
) {

    if (!mensajeDesarrollador) {
        return;
    }


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


/* =========================================================
   INICIO
========================================================= */

actualizarInterfazDev();

console.log(
    "👨‍💻 Módulo de desarrollador cargado."
);