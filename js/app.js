// ----------------- LÓGICA JAVASCRIPT ---------------------------------
import { fetchDatosIniciales } from './api/api.js';
import { generarPDF } from './utils/generadorPDF.js';
import { cerrarSesion } from './modules/Auth.js';
import { ajustarInterfazPorRol } from './modules/filtros.js';
import {
    llenarBuscadorDocentes,
    llenarSelectorGabinetes,
    aplicarFiltros,
    configurarListenersFiltros
} from './modules/filtros.js';

var todosLosEventos = [];
var calendar = null;

document.addEventListener('DOMContentLoaded', function () {

    const tokenGuardado = localStorage.getItem('token');
    const rolGuardado = localStorage.getItem('rolUsuario');
    const filtroGuardado = localStorage.getItem('filtroUsuario');

    if (!tokenGuardado) {
        cerrarSesion();
        return;
    }


    var calendarEl = document.getElementById('calendar');

    calendar = new FullCalendar.Calendar(calendarEl, {

        initialView: 'timeGridWeek',
        locale: 'es',
        height: '100%', // Usar el 100% del contenedor padre
        buttonText: {
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            day: 'Día',
            list: 'Lista'
        },
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: ''
        },
        weekends: false,
        views: {
            timeGridTresDias: {
                type: 'timeGrid',
                duration: { days: 3 },
                buttonText: '3 días'
            },

            timeGridDay: {
                buttonText: '1 día'
            },
            timeGridWeek: {
                buttonText: 'semana'
            },
            listWeek: {
                buttonText: 'agenda'
            }
        },

        firstDay: 1,

        displayEventTime: false,
        allDaySlot: false,

        eventClassNames: function (arg) {
            let actividad = arg.event.title.toLowerCase();
            let gabinete = arg.event.extendedProps.gabinete;

            if (gabinete && gabinete !== '') {
                gabinete = gabinete.toLowerCase();

                if (gabinete.includes('taller')) return ['evento-taller'];
            }

            if (actividad.includes('taller')) return ['evento-taller'];
            if (actividad.includes('ed. fisica')) return ['evento-ed-fisica'];
            if (actividad.includes('attp')) return ['evento-attp'];

            return ['evento-default'];
        },

        eventContent: function (arg) {
            let actividad = arg.event.title;
            let docente = arg.event.extendedProps.responsable || '';
            let gabinete = arg.event.extendedProps.gabinete;
            let textoGabinete = (gabinete && gabinete.trim() !== '') ? gabinete + ' - ' : '';

            var horaInicio = arg.event.start.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
            var horaFin = arg.event.end.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

            let customHtml = `
        <div class="tarjeta-evento">
          <div class="titulo-actividad"> ${actividad}</div>
          <div class="detalle-evento">${textoGabinete + docente}</div>
          <div class="detalle-evento">Horario: ${horaInicio} a ${horaFin}</div>
        </div>
      `;

            return { html: customHtml };
        },

        eventClick: function (info) {
            var props = info.event.extendedProps;
            var horaInicio = info.event.start.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
            var horaFin = info.event.end.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

            Swal.fire({
                title: info.event.title,
                scrollbarPadding: false,
                allowOutsideClick: true,
                heightAuto: false,
                html: `
              <p>Profesor: <b>${props.responsable || ''}</b></p>
              <p>Horario: ${horaInicio} a ${horaFin}</p>
              <p>Gabinete: ${props.gabinete || ''}</p>
            `,
                confirmButtonText: 'Cerrar'
            });
        },

        slotLabelFormat: {
            hour: '2-digit',      // 'numeric' para 1, 2... | '2-digit' para 01, 02...
            minute: '2-digit',    // Mostrar minutos: 00
            hour12: false,        // false = 13:00 | true = 1:00 pm
            meridiem: false       // Ocultar am/pm si usas 24hs
        },
        slotDuration: '00:15:00',
        slotMinTime: '07:00:00',
        slotMaxTime: '19:00:01',

        events: []
    });


    // Función principal de carga
    async function cargarDatos(tokensito, rol, filtro) {

        Swal.fire({
            title: 'Cargando el calendario...',


            background: `
        linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), 
        url("./assets/it-logo-grande.png") center / cover no-repeat
    `,

            color: '#ffffff',

            customClass: {
                popup: 'alerta-cuadrada'
            },
            html: 'Espere unos segundos..',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const datos = await fetchDatosIniciales(tokensito);

            if (!datos) return;

            todosLosEventos = datos.eventos;

            llenarBuscadorDocentes(datos.docentes);
            llenarSelectorGabinetes(datos.gabinetes);

            aplicarFiltros(todosLosEventos, calendar, rol, filtro);

            configurarListenersFiltros(todosLosEventos, calendar);


            Swal.close();

        } catch (error) {
            console.log(error)
            const loadingEl = document.getElementById('contenedor-carga');
            if (loadingEl) loadingEl.innerHTML = '<span style="color: red;">Error de conexión</span>';
        }
    }

    cargarDatos(tokenGuardado, rolGuardado, filtroGuardado);
    ajustarInterfazPorRol();


    calendar.render();

    document.getElementById('btn-descargar').addEventListener('click', async function () {
        await generarPDF(this, calendar, todosLosEventos);
    });

    document.getElementById('selector-vista').addEventListener('change', function () {
        if (this.value === 'timeGridSemanaLaboral') {
            calendar.setOption('weekends', false);
            calendar.changeView('timeGridWeek');
        } else {
            calendar.setOption('weekends', true);
            calendar.changeView(this.value);
        }
    });

    document.getElementById('btn-cerrar-sesion').addEventListener('click', (e) => {
        e.preventDefault(); // Evitamos que el link haga cosas raras

        Swal.fire({
            title: '¿Cerrar sesión?',
            text: "Tendrás que volver a ingresar tus credenciales la próxima vez.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#043161',
            cancelButtonColor: 'rgb(199, 9, 9)',
            confirmButtonText: 'Sí, salir',
            cancelButtonText: 'Cancelar',
            backdrop: `rgba(0,0,0,0.6)`
        }).then((result) => {
            if (result.isConfirmed) {
                cerrarSesion();
            }
        });
    });

    // Lógica del botón hamburguesa
    const btnMenu = document.getElementById('btn-menu');
    const menuColapsable = document.getElementById('menu-colapsable');

    if (btnMenu && menuColapsable) {
        btnMenu.addEventListener('click', () => {
            // "toggle" le pone la clase si no la tiene, y se la saca si ya la tiene
            menuColapsable.classList.toggle('abierto');
        });
    }


    document.getElementById('selector-turno').addEventListener('change', function (e) {
        const turno = e.target.value;
        const contenedorCalendario = document.getElementById('calendar');

        if (turno === 'mañana') {
            calendar.setOption('slotMinTime', '07:00:00');
            calendar.setOption('slotMaxTime', '14:00:01');
            contenedorCalendario.style.minHeight = '830px';
            contenedorCalendario.classList.remove('modo-completo'); // Apagamos las líneas

        } else if (turno === 'tarde') {
            calendar.setOption('slotMinTime', '14:00:00');
            calendar.setOption('slotMaxTime', '19:00:01');
            contenedorCalendario.style.minHeight = '630px';
            contenedorCalendario.classList.remove('modo-completo'); // Apagamos las líneas

        } else if (turno === 'noche') {
            calendar.setOption('slotMinTime', '19:00:00');
            calendar.setOption('slotMaxTime', '23:00:01');
            contenedorCalendario.style.minHeight = '530px';
            contenedorCalendario.classList.remove('modo-completo'); // Apagamos las líneas

        } else if (turno === 'completo') {
            calendar.setOption('slotMinTime', '07:00:00');
            calendar.setOption('slotMaxTime', '23:00:01');
            contenedorCalendario.style.minHeight = '1100px';
            contenedorCalendario.classList.add('modo-completo');

        } else {
            // turno mañana/tarde
            calendar.setOption('slotMinTime', '07:00:00');
            calendar.setOption('slotMaxTime', '19:00:01');
            contenedorCalendario.style.minHeight = '850px';
            contenedorCalendario.classList.add('modo-completo');
        }

        setTimeout(() => { calendar.updateSize(); }, 10);
    });


});



