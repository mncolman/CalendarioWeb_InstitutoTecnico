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
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
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

    // (Acá va el código del saludo y el SweetAlert que ya teníamos armados)



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


function procesarDatosYCrearOpciones(listaDeEspacios) {

    var selector = document.getElementById('selectorEspacio');
    selector.innerHTML = "";

    var id = "";
    var nombre = "Todos los gabinetes";
    var option = document.createElement("option");
    option.value = id;
    option.text = nombre;

    selector.appendChild(option);


    listaDeEspacios.forEach(function (pareja) {
        var id = pareja[0];
        var nombre = pareja[1];
        var option = document.createElement("option");

        option.value = id;
        option.text = nombre;
        selector.appendChild(option);
    });
}


document.getElementById('btn-descargar').addEventListener('click', async function () {

    const btn = this;
    btn.disabled = true;

    Swal.fire({
        title: 'Generando PDF...',
        text: 'Por favor esperá un momento',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
    });

    const estiloTemporal = document.createElement('style');
    estiloTemporal.id = 'estilo-captura-pdf';
    estiloTemporal.innerHTML = `
    .fc-day-today {
        background-color: white !important;
    }
`;
    document.head.appendChild(estiloTemporal);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });


    let textoDocente = document.getElementById('buscar-docente').value.toLowerCase().trim();
    let textoDivision = document.getElementById('filtro-division').value.toLowerCase();
    let textoGabinete = document.getElementById('selectorEspacio').value.toLowerCase();


    let tipoCronograma = 'Semana';
    if (textoDocente && textoDocente !== '') {
        tipoCronograma = textoDocente
    } else {
        tipoCronograma = (textoGabinete && textoGabinete !== '') ? textoGabinete : textoDivision;
    }

    const fechaInicio = calendar.view.activeStart;
    const vistaOriginal = calendar.view.type;
    const etiquetaVista = {
        'dayGridMonth': fechaInicio.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
        'timeGridWeek': `Semana del ${fechaInicio.toLocaleDateString('es-AR')}`,
        'timeGridSemanaLaboral': `Semana del ${fechaInicio.toLocaleDateString('es-AR')}`,
        'timeGridTresDias': `${fechaInicio.toLocaleDateString('es-AR')} — ${calendar.view.activeEnd.toLocaleDateString('es-AR')}`,
        'timeGridDay': fechaInicio.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    }[vistaOriginal] || fechaInicio.toLocaleDateString('es-AR');

    // 1. Creamos un contenedor invisible con dimensiones fijas de escritorio
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 1400px;
        height: 700px;
        z-index: -1;
        background: white;
    `;
    document.body.appendChild(tempDiv);

    const pdfW = doc.internal.pageSize.getWidth();
    const pdfH = doc.internal.pageSize.getHeight();
    const turnos = [
        { nombre: 'Mañana', slotMin: '07:00:00', slotMax: '14:05:00' },
        { nombre: 'Tarde', slotMin: '14:00:00', slotMax: '20:05:00' }
    ];
    const capturas = [];

    try {

        for (const turno of turnos) {
            // 2. Creamos un calendario temporal con dimensiones fijas
            const calTemp = new FullCalendar.Calendar(tempDiv, {
                initialView: 'timeGridWeek',
                initialDate: fechaInicio,
                locale: 'es',
                weekends: false,
                firstDay: 1,
                headerToolbar: false,        // sin toolbar — solo la grilla
                allDaySlot: false,
                slotMinTime: turno.slotMin,
                slotMaxTime: turno.slotMax,

                slotLabelFormat: {
                    hour: '2-digit',      // 'numeric' para 1, 2... | '2-digit' para 01, 02...
                    minute: '2-digit',    // Mostrar minutos: 00
                    hour12: false,        // false = 13:00 | true = 1:00 pm
                    meridiem: false       // Ocultar am/pm si usas 24hs
                },
                slotDuration: '00:15:00',
                height: 750,
                contentHeight: 700,
                views: {
                    timeGridWeek: {
                        type: 'timeGrid',
                    }
                },
                displayEventTime: false,
                weekends: false,
                firstDay: 1,

                events: (() => {

                    return todosLosEventos.filter(evento => {
                        let docenteEv = (evento.extendedProps.responsable || '').toLowerCase();
                        let divisionEv = (evento.extendedProps.division || '').toLowerCase();
                        let gabineteEv = (evento.extendedProps.gabinete || '').toLowerCase();

                        let coincideDocente = docenteEv.includes(textoDocente);
                        let coincideDivision = textoDivision === '' || divisionEv === textoDivision;
                        let coincideGabinete = textoGabinete === '' || gabineteEv === textoGabinete;

                        return coincideDocente && coincideDivision && coincideGabinete;
                    });
                })(),
                eventClassNames: function (arg) {
                    let actividad = arg.event.title.toLowerCase();
                    let gabinete = arg.event.extendedProps.gabinete.toLowerCase();

                    if (actividad.includes('taller')) return ['evento-taller'];
                    if (gabinete.includes('taller')) return ['evento-taller'];
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
                    return {
                        html: `
                    <div class="tarjeta-evento">
                        <div class="titulo-actividad">${actividad}</div>
                        <div class="detalle-evento">${textoGabinete + docente}</div>
                        <div class="detalle-evento">Horario: ${horaInicio + " a " + horaFin}</div>
                    </div>
                `};
                }
            });

            calTemp.render();
            await new Promise(r => setTimeout(r, 500));

            // 3. Capturamos el calendario temporal
            const canvas = await html2canvas(tempDiv, {
                scale: 1.8,
                useCORS: true,
                width: 1400,
                height: 700,
                scrollX: 0,
                scrollY: 0
            });

            capturas.push({ canvas, nombre: turno.nombre });

            // 4. Destruimos el calendario temporal
            calTemp.destroy();
            tempDiv.innerHTML = '';
        }

        if (tempDiv.parentNode) tempDiv.parentNode.removeChild(tempDiv);
        const estiloABorrar = document.getElementById('estilo-captura-pdf');
        if (estiloABorrar) estiloABorrar.remove();

        capturas.forEach((item, i) => {

            const imgData = item.canvas.toDataURL('image/jpeg', 0.98);
            const pdfW = doc.internal.pageSize.getWidth();
            const pdfH = doc.internal.pageSize.getHeight();

            if (i > 0) doc.addPage();

            doc.setFontSize(13);
            doc.text(`Cronograma: ${tipoCronograma.toLocaleUpperCase()}  |  ${etiquetaVista}  |  Horario ${item.nombre}`, 8, 8);

            const margen = 5;
            doc.addImage(
                imgData, 'JPEG',
                margen,
                20,               // margen superior (respeta el encabezado)
                pdfW - margen * 3,  // ancho - margen derecho e izquierdo
                pdfH - 40 * 2,  // alto - encabezado - margen inferior
                '',
                'MEDIUM'
            );
        });

        Swal.close();
        btn.disabled = false;
        doc.save(`${tipoCronograma + '-' + etiquetaVista}.pdf`);

    } catch (error) {
        console.error('Error completo:', error); // 👈 agregá esto
        Swal.fire('Error', error.message, 'error'); // 👈 muestra el mensaje real
        btn.disabled = false; // 👈 esto también faltaba en tu catch
    }
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
*/
