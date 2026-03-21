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
        // 👇 ACÁ VA TU LLAMADA A GAS cuando lo implementes
        // const res   = await fetch(`URL_GAS?accion=login&dni=${usuario}&pass=${pass}`);
        // const datos = await res.json();

        // --- SIMULACIÓN PARA LA PRESENTACIÓN ---
        await new Promise(r => setTimeout(r, 1000)); // simula latencia
        const datos = (usuario === '42547066' && pass === '42547066col')
            ? { ok: true, token: 'token-simulado-abc123' }
            : { ok: false, mensaje: 'Credenciales incorrectas' };
        // ----------------------------------------

        if (datos.ok) {
            sessionStorage.setItem('token', datos.token);
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