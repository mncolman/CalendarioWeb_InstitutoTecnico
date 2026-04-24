import { cerrarSesion } from '../modules/Auth.js';

const URL_BACKEND = 'https://script.google.com/macros/s/AKfycbxjOsQFzfmdF_ihIdl6ipezdhkk1ogxRg1QeFghYAu9exAavBYbiZD2qeF8ezsPrFIb/exec';

export async function fetchDatosIniciales(tokenUsuario) {
    try {
        const urlConSeguridad = `${URL_BACKEND}?token=${tokenUsuario}`;

        const respuesta = await fetch(urlConSeguridad);

        if (!respuesta.ok) {
            throw new Error(`Error HTTP: ${respuesta.status}`);
        }

        const datos = await respuesta.json();

        if (datos.error) {
            if (datos.sesionExpirada) {

                Swal.fire({
                    icon: 'warning',
                    title: 'Sesión Expirada',
                    text: 'Tu sesión ha expirado por seguridad. Por favor, volvé a ingresar.',
                    confirmButtonText: 'Entendido',
                    allowOutsideClick: false,
                    allowEscapeKey: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        cerrarSesion();
                    }
                });

                return null; // Salimos para que no siga ejecutando el resto de la app

            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Oops...',
                    text: 'Hubo un problema de servidor: ' + datos.error
                });
                console.error("Error de la API:", datos.error);
                return null;
            }
        }

        return datos;

    } catch (error) {
        console.error("Falló la comunicación con Google:", error);

        Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: 'No se pudo contactar con el servidor. Revisá tu internet.'
        });

        throw error;
    }
}

export async function verificarCredenciales(usuario, password) {
    try {
        const opciones = {
            method: 'POST',
            // Le agregamos estos headers para que Google no rechace el paquete
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
            // Le decimos que siga el redireccionamiento interno de Google
            redirect: "follow",
            body: JSON.stringify({
                accion: 'login',
                usuario: usuario,
                pass: password
            })
        };

        const respuesta = await fetch(URL_BACKEND, opciones);

        if (!respuesta.ok) {
            throw new Error(`HTTP error! status: ${respuesta.status}`);
        }

        return await respuesta.json();

    } catch (error) {
        console.error("Fallo la comunicación de Login con Google:", error);
        throw error;
    }
}