
const URL_BACKEND = 'https://script.google.com/macros/s/AKfycbzA2Ahr0wI91h2bNOaNpeJGvVYZwT_QBCgQOECx1Ge6xBEuEDt2q4olbxnUTGnpImfvMw/exec';

export async function fetchDatosIniciales(tokenUsuario) {
    try {
        const urlConSeguridad = `${URL_BACKEND}?token=${tokenUsuario}`;

        const respuesta = await fetch(urlConSeguridad);

        if (!respuesta.ok) {
            throw new Error(`HTTP error! status: ${respuesta.status}`);
        }

        const datos = await respuesta.json();
        return datos;

    } catch (error) {
        console.error("Fallo la comunicación con Google:", error);
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