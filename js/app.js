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



    // 1. INICIALIZAR CALENDARIO
    calendar = new FullCalendar.Calendar(calendarEl, {

        initialView: 'dayGridMonth',
        initialDate: '2026-03-01', // FECHA CLAVE: Marzo 2026
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
            right: 'dayGridMonth,timeGridWeek,timeGridTresDias,timeGridDay'
        },
        // 2. DEFINIR LA VISTA DE 3 DÍAS Y LOS TEXTOS
        views: {
            // Creamos la vista personalizada de 3 días
            timeGridTresDias: {
                type: 'timeGrid',
                duration: { days: 3 },
                buttonText: '3 días' // El texto que se lee en el botón
            },
            // Le cambiamos el texto por defecto a los demás botones para que quede prolijo
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

        displayEventTime: false,
        allDaySlot: false,

        eventContent: function (arg) {
            // 1. Capturamos los datos
            let actividad = arg.event.title;
            let docente = arg.event.extendedProps.responsable || 'Sin asignar';
            let gabinete = arg.event.extendedProps.gabinete || '';

            // 2. Armamos el diseño HTML del cuadrito
            let customHtml = `
        <div class="tarjeta-evento">
          <div class="titulo-actividad">  ${actividad}</div>
          <div class="detalle-evento">Docente:  ${docente}</div>
          <div class="detalle-evento">Gabinete:  ${gabinete}</div>
        </div>
      `;

            // 3. Le decimos a FullCalendar que use nuestro HTML
            return { html: customHtml };
        },

        eventClick: function (info) {
            var props = info.event.extendedProps;

            Swal.fire({
                title: info.event.title,
                html: `
              <p>Profesor: <b>${props.responsable}</b></p>
              <p>Horario: ${props.horaInicio} a ${props.horaFin}</p>
              <p>Aula: ${info.event.extendedProps.resourceId}</p>
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

        // IMPORTANTE: Aquí iniciamos SIN eventos. Se cargarán después.
        events: []
    });

    calendar.render();


    // Ejecutamos la carga
    cargarDatos();


    var selector = document.getElementById('selectorEspacio');
    if (selector) {
        selector.addEventListener('change', aplicarFiltros);
    }

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



    // Filtramos la lista maestra
    let eventosFiltrados = todosLosEventos.filter(evento => {

        let docenteDelEvento = (evento.extendedProps.responsable || '').toLowerCase();
        let divisionDelEvento = (evento.extendedProps.division || '').toLowerCase();
        let gabineteDelEvento = (evento.extendedProps.gabinete || '').toLowerCase();

        let coincideDocente = docenteDelEvento.includes(textoDocente);
        let coincideDivision = textoDivision === "" || divisionDelEvento === textoDivision;
        let coincidegabinete = textogabinete === "" || gabineteDelEvento === textogabinete;


        return (coincideDocente && coincideDivision && coincidegabinete);
    });

    // Actualizamos el calendario a la velocidad de la luz
    calendar.removeAllEventSources(); // Borramos lo viejo
    calendar.addEventSource(eventosFiltrados); // Inyectamos lo nuevo
}

// Esta función recibe los datos limpios del servidor y pinta el HTML

function procesarDatosYCrearOpciones(listaDeEspacios) {

    var selector = document.getElementById('selectorEspacio');
    selector.innerHTML = ""; // Limpiamos el "Cargando..."

    var id = "";     // Indice 0 es el ID (para el value)
    var nombre = "Todos los gabinetes"; // Indice 1 es el Nombre (para el texto)
    var option = document.createElement("option");
    option.value = id;      // Lo que el sistema usa
    option.text = nombre;

    selector.appendChild(option);


    listaDeEspacios.forEach(function (pareja) {
        var id = pareja[0];     // Indice 0 es el ID (para el value)
        var nombre = pareja[1]; // Indice 1 es el Nombre (para el texto)
        var option = document.createElement("option");

        option.value = id;      // Lo que el sistema usa
        option.text = nombre;   // Lo que el usuario ve
        selector.appendChild(option);
    });
}
function aplicarFiltro(espacioSeleccionado) {
    calendar.removeAllEvents();
    var eventosFiltrados = (espacioSeleccionado === "")
        ? todosLosEventos
        : todosLosEventos.filter(evt => String(evt.resourceId) === String(espacioSeleccionado));
    calendar.addEventSource(eventosFiltrados);

}


function llenarBuscadorDocentes() {
    let datalist = document.getElementById('opciones-docentes');
    datalist.innerHTML = ''; // Limpiamos por las dudas

    let setDocentes = new Set();

    // Extraemos todos los docentes, ignorando los vacíos
    todosLosEventos.forEach(evento => {
        let nombreDocente = evento.extendedProps.responsable;
        if (nombreDocente && nombreDocente.trim() !== '') {
            setDocentes.add(nombreDocente.trim());
        }
    });

    // Los ordenamos de la A a la Z y creamos las etiquetas <option>
    let arrayDocentes = Array.from(setDocentes).sort();
    arrayDocentes.forEach(docente => {
        let opcion = document.createElement('option');
        opcion.value = docente;
        datalist.appendChild(opcion);
    });
}
