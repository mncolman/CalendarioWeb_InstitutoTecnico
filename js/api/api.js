
const URL_BACKEND = 'https://script.google.com/macros/s/AKfycby7SUeYknaS9o0MZ_t-ZxYKdcYGskVwGIM1YJzckEy1Nijk4Ff-fKvUPU6nVJfeNxMhNw/exec';

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
        //petición POST
        const opciones = {
            method: 'POST',
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