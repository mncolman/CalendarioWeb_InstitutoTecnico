// ----------------- LÓGICA JAVASCRIPT ---------------------------------

var todosLosEventos = [];
var calendar = null;

document.addEventListener('DOMContentLoaded', function () {
    var calendarEl = document.getElementById('calendar');
    var loadingEl = document.getElementById('loading');
    var selector = document.getElementById('selectorEspacio');

    // 2. Función asíncrona para traer todo de UN SOLO GOLPE
    async function cargarDatos() {
        try {
            const respuesta = await fetch('https://script.google.com/macros/s/AKfycby7SUeYknaS9o0MZ_t-ZxYKdcYGskVwGIM1YJzckEy1Nijk4Ff-fKvUPU6nVJfeNxMhNw/exec');

            const datos = await respuesta.json();

            todosLosEventos = datos.eventos;

            // Llenamos la UI al instante
            llenarBuscadorDocentesNormalizado(datos.docentes);
            llenarSelectorGabinetesNormalizado(datos.gabinetes);

            // Cargamos el calendario
            calendar.addEventSource(datos.eventos);

            // Matamos el spinner
            const loadingEl = document.getElementById('contenedor-carga');
            if (loadingEl) loadingEl.style.display = 'none';

        } catch (error) {
            console.error("Error cargando los datos:", error);
            const loadingEl = document.getElementById('contenedor-carga');
            if (loadingEl) loadingEl.innerHTML = '<span style="color: red;">Error de conexión</span>';
        }
    }

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
            timeGridSemanaLaboral: {
                type: 'timeGrid',
                duration: { days: 6 }, // 5 dias
                buttonText: 'Lun-Vie'
            },
            timeGridTresDias: {
                type: 'timeGrid',
                duration: { days: 3 },  // 3 dias
                buttonText: '3 días'
            },

            timeGridDay: {
                buttonText: '1 día'
            },
            timeGridWeek: {
                buttonText: 'semana'
            },
            dayGridMonth: {
                buttonText: 'mes'
            },
            listWeek: {
                buttonText: 'agenda' // Por si usas la vista de lista en celulares
            }
        },

        firstDay: 1,          // 0 = domingo, 1 = lunes
        weekends: false,      // oculta sábado y domingo

        displayEventTime: false,
        allDaySlot: false,

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
                confirmButtonText: 'Entendido'
            });
        },

        slotLabelFormat: {
            hour: '2-digit',      // 'numeric' para 1, 2... | '2-digit' para 01, 02...
            minute: '2-digit',    // Mostrar minutos: 00
            hour12: false,        // false = 13:00 | true = 1:00 pm
            meridiem: false       // Ocultar am/pm si usas 24hs
        },
        slotDuration: '00:20:00', // Cada celda vale 30 min (por defecto)
        slotMinTime: '07:00:00',  // El calendario arranca visualmente a las 7 AM
        slotMaxTime: '23:00:00',  // Termina a las 11 PM

        events: []
    });

    calendar.render();

    cargarDatos();

    document.getElementById('selectorEspacio')
        .addEventListener('change', aplicarFiltros);

    document.getElementById('filtro-division')
        .addEventListener('change', aplicarFiltros);

    document.getElementById('buscar-docente')
        .addEventListener('input', aplicarFiltros); // 'input' dispara mientras se escribe

    document.getElementById('btn-limpiar')
        .addEventListener('click', function () {
            document.getElementById('buscar-docente').value = '';
            document.getElementById('filtro-division').value = '';
            document.getElementById('selectorEspacio').value = '';
            document.getElementById('panel-colegas').style.display = 'none';
            aplicarFiltros();
        });

});


function llenarBuscadorDocentesNormalizado(listaDocentes) {
    let datalist = document.getElementById('opciones-docentes');
    datalist.innerHTML = '';

    listaDocentes.forEach(docente => {
        let opcion = document.createElement('option');
        opcion.value = docente;
        datalist.appendChild(opcion);
    });
}

function llenarSelectorGabinetesNormalizado(listaGabinetes) {
    let selector = document.getElementById('selectorEspacio');
    selector.innerHTML = "";

    let optionDefault = document.createElement("option");
    optionDefault.value = "";
    optionDefault.text = "Todos los gabinetes";
    selector.appendChild(optionDefault);

    listaGabinetes.forEach(function (pareja) {
        let id = pareja[0];
        let nombre = pareja[1];

        let option = document.createElement("option");
        option.value = id;
        option.text = nombre;

        selector.appendChild(option);
    });
}


// --- LA FUNCIÓN DE FILTRADO ---
function aplicarFiltros() {
    // Capturamos lo que el usuario escribió/eligió (pasado a minúsculas para que no falle)

    let textoDivision = document.getElementById('filtro-division').value.toLowerCase();
    let textogabinete = document.getElementById('selectorEspacio').value.toLowerCase();

    let textoDocente = document.getElementById('buscar-docente').value.toLowerCase().trim();
    let panelColegas = document.getElementById('panel-colegas');
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


    let eventosFiltrados = todosLosEventos.filter(evento => {

        let docenteDelEvento = (evento.extendedProps.responsable || '').toLowerCase();
        let divisionDelEvento = (evento.extendedProps.division || '').toLowerCase();
        let gabineteDelEvento = (evento.extendedProps.gabinete || '').toLowerCase();

        let coincideDocente = docenteDelEvento.includes(textoDocente);
        let coincideDivision = textoDivision === "" || divisionDelEvento === textoDivision;
        let coincidegabinete = textogabinete === "" || gabineteDelEvento === textogabinete;


        return (coincideDocente && coincideDivision && coincidegabinete);
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
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });

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
        height: 500px;
        z-index: -1;
        background: white;
    `;
    document.body.appendChild(tempDiv);

    const pdfW = doc.internal.pageSize.getWidth();
    const pdfH = doc.internal.pageSize.getHeight();
    const turnos = [
        { nombre: 'Mañana', slotMin: '07:00:00', slotMax: '14:00:00' },
        { nombre: 'Tarde', slotMin: '14:00:00', slotMax: '22:00:00' }
    ];
    const capturas = [];

    for (const turno of turnos) {
        // 2. Creamos un calendario temporal con dimensiones fijas
        const calTemp = new FullCalendar.Calendar(tempDiv, {
            initialView: 'timeGridSemanaLaboral',
            initialDate: fechaInicio,
            locale: 'es',
            weekends: false,
            firstDay: 1,
            headerToolbar: false,        // sin toolbar — solo la grilla
            allDaySlot: false,
            slotMinTime: turno.slotMin,
            slotMaxTime: turno.slotMax,
            slotDuration: '00:20:00',
            height: 500,
            contentHeight: 500,
            views: {
                timeGridSemanaLaboral: {
                    type: 'timeGrid',
                    duration: { days: 5 }
                }
            },
            displayEventTime: false,

            events: (() => {
                // Leemos los filtros activos igual que en aplicarFiltros()
                let textoDocente = document.getElementById('buscar-docente').value.toLowerCase().trim();
                let textoDivision = document.getElementById('filtro-division').value.toLowerCase();
                let textoGabinete = document.getElementById('selectorEspacio').value.toLowerCase();

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
            scale: 2,
            useCORS: true,
            width: 1400,
            height: 500,
            scrollX: 0,
            scrollY: 0
        });

        capturas.push({ canvas, nombre: turno.nombre });

        // 4. Destruimos el calendario temporal
        calTemp.destroy();
        tempDiv.innerHTML = '';
    }

    // 5. Limpiamos el contenedor temporal del DOM
    document.body.removeChild(tempDiv);

    // 6. Armamos el PDF
    const headerAltura = 6;
    const margen = 4;
    const espacioPorTurno = (pdfH - (headerAltura + margen) * 2) / 2;

    capturas.forEach((item, i) => {
        const imgData = item.canvas.toDataURL('image/png');
        const offsetY = i * (espacioPorTurno + headerAltura + margen);
        doc.setFontSize(7);
        doc.text(`Semana  |  ${etiquetaVista}  |  Horario ${item.nombre}`, 4, offsetY + headerAltura);
        doc.addImage(imgData, 'PNG', 0, offsetY + headerAltura + 1, pdfW, espacioPorTurno);
    });

    doc.save(`horario-${etiquetaVista}.pdf`);
});

document.getElementById('selector-vista').addEventListener('change', function () {
    calendar.changeView(this.value);
});