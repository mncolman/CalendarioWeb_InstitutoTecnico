import { verificarCredenciales } from './api/api.js'; 

const btnIngresar = document.getElementById('btn-ingresar');
const inputUsuario = document.getElementById('input-usuario');
const inputPass = document.getElementById('input-password');
const mensajeError = document.getElementById('mensaje-error');

[inputUsuario, inputPass].forEach(input => {
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') intentarLogin();
    });
});

btnIngresar.addEventListener('click', intentarLogin);

async function intentarLogin() {
    const usuario = inputUsuario.value.trim();
    const pass = inputPass.value.trim();

    if (!usuario || !pass) {
        mostrarError('Completá usuario y contraseña.');
        return;
    }

    btnIngresar.disabled = true;
    btnIngresar.textContent = 'Verificando...';
    mensajeError.style.display = 'none';

    try {
  
        const datos = await verificarCredenciales(usuario, pass);

        if (datos.ok) {
            
            localStorage.setItem('token', datos.token);
            window.location.href = 'dashboard.html';
        } else {
            mostrarError(datos.mensaje || 'Usuario o contraseña incorrectos.');
        }

    } catch (err) {
        mostrarError('Error de conexión. Intentá de nuevo.');
    } finally {
        btnIngresar.disabled = false;
        btnIngresar.textContent = 'INGRESAR';
    }
}

function mostrarError(texto) {
    mensajeError.textContent = texto;
    mensajeError.style.display = 'block';
}