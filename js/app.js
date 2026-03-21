// ----------------- LÓGICA JAVASCRIPT ---------------------------------
import { fetchDatosIniciales } from './api/api.js';
import { generarPDF } from './utils/generadorPDF.js';
import { 
    llenarBuscadorDocentes, 
    llenarSelectorGabinetes, 
    aplicarFiltros, 
    configurarListenersFiltros 
} from './modules/filtros.js';

var todosLosEventos = [];
var calendar = null;

document.addEventListener('DOMContentLoaded', function () {
    
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
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
        slotMinTime: '07:00:00',  // El calendario arranca visualmente a las 7 AM
        slotMaxTime: '23:00:00',  // Termina a las 11 PM

        events: []
    });


    // Función principal de carga
    async function cargarDatos() {
        try {
            const datos = await fetchDatosIniciales(token);

            todosLosEventos = datos.eventos;

            llenarBuscadorDocentes(datos.docentes);
            llenarSelectorGabinetes(datos.gabinetes);

            aplicarFiltros(todosLosEventos, calendar);

            configurarListenersFiltros(todosLosEventos, calendar);

            const loadingEl = document.getElementById('contenedor-carga');
            if (loadingEl) loadingEl.style.display = 'none';

        } catch (error) {
            const loadingEl = document.getElementById('contenedor-carga');
            if (loadingEl) loadingEl.innerHTML = '<span style="color: red;">Error de conexión</span>';
        }
    }

    cargarDatos();

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
});






































/*   

// --- LA FUNCIÓN DE FILTRADO ---
function aplicarFiltros() {
    let divListaColegas = document.getElementById('lista-colegas');
   // Solo activamos este cálculo pesado si escribieron al menos 3 letras 
   // (para no buscar coincidencia con la letra "a" y colgar el navegador)
   if (textoDocente.length >= 3) {

       // PASO 1: Encontrar los gabinetes que usa ESTE docente
       let gabinetesDelDocente = new Set();

       todosLosEventos.forEach(evento => {
           let docenteEv = (evento.extendedProps.responsable || '').toLowerCase();
           let ubicacionEv = evento.extendedProps.gabinete;

           if (docenteEv.includes(textoDocente) && ubicacionEv) {
               gabinetesDelDocente.add(ubicacionEv);
           }
       });

       // PASO 2: Si encontramos gabinetes, buscamos a los colegas
       if (gabinetesDelDocente.size > 0) {
           let colegasPorGabinete = {}; // Guardaremos { "GAB 1": Set(["Profe A", "Profe B"]) }

           // Inicializamos los sets vacíos para cada gabinete
           gabinetesDelDocente.forEach(gab => colegasPorGabinete[gab] = new Set());

           // Recorremos la base de datos OTRA VEZ para encontrar a los invasores... digo, colegas
           todosLosEventos.forEach(evento => {
               let gab = evento.extendedProps.gabinete;
               let doc = evento.extendedProps.responsable || 'Sin asignar';

               // Si el evento ocurre en uno de "nuestros" gabinetes, y el profe NO es el que estamos buscando
               if (gabinetesDelDocente.has(gab) && !doc.toLowerCase().includes(textoDocente)) {
                   colegasPorGabinete[gab].add(doc); // Lo agregamos al set (evita duplicados automáticamente)
               }
           });

           // PASO 3: Armar el texto visual para el director
           let htmlResultado = '';
           for (let gabinete in colegasPorGabinete) {
               let arrayColegas = Array.from(colegasPorGabinete[gabinete]).sort();

               if (arrayColegas.length > 0) {
                   // Ejemplo visual: • Gabinete 4: Perillo, Fernandez M.
                   htmlResultado += `<div><b>• ${gabinete}:</b> ${arrayColegas.join(', ')}</div>`;
               } else {
                   htmlResultado += `<div><b>• ${gabinete}:</b> (Nadie más usa este espacio)</div>`;
               }
           }

           // Mostramos el panel y le pegamos el texto
           divListaColegas.innerHTML = htmlResultado;
           panelColegas.style.display = 'block';

       } else {
           // Si escribió un nombre que no tiene clases asignadas
           panelColegas.style.display = 'none';
       }

   } else {
       // Si borró el buscador o hay menos de 3 letras, ocultamos el panel
       panelColegas.style.display = 'none';
   }


    let selectorDivision = document.getElementById('filtro-division');
    let selectorGabinete = document.getElementById('selectorEspacio');

    let textoDocente = window.tomSelectDocente
        ? window.tomSelectDocente.getValue().toLowerCase().trim()
        : document.getElementById('buscar-docente').value.toLowerCase().trim();

    if (selectorDivision.value === '' && selectorGabinete.value === '' && textoDocente === '') {
        let primeraOpcion = Array.from(selectorDivision.options).find(op => op.value !== '');
        if (primeraOpcion) {
            selectorDivision.value = primeraOpcion.value;
        }
    }
    let textoDivision = selectorDivision.value.toLowerCase();
    let textogabinete = selectorGabinete.value.toLowerCase();

    let eventosFiltrados = todosLosEventos.filter(evento => {
        let docenteDelEvento = (evento.extendedProps.responsable || '').toLowerCase();
        let divisionDelEvento = (evento.extendedProps.division || '').toLowerCase();
        let gabineteDelEvento = (evento.extendedProps.gabinete || '').toLowerCase();

        let coincideDocente = docenteDelEvento.includes(textoDocente);
        let coincideDivision = textoDivision === '' || divisionDelEvento === textoDivision;
        let coincidegabinete = textogabinete === '' || gabineteDelEvento === textogabinete;

        return coincideDocente && coincideDivision && coincidegabinete;
    });

    calendar.removeAllEventSources();
    calendar.addEventSource(eventosFiltrados);

}
*/