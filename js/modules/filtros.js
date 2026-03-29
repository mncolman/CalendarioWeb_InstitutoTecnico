// js/modules/filtros.js

export function llenarBuscadorDocentes(listaDocentes) {
    if (window.tomSelectDocente) window.tomSelectDocente.destroy();

    const select = document.getElementById('buscar-docente');
    select.innerHTML = '<option value="">Todos los docentes</option>';

    listaDocentes.forEach(docente => {
        let opcion = document.createElement('option');
        opcion.value = docente;
        opcion.textContent = docente;
        select.appendChild(opcion);
    });

    window.tomSelectDocente = new TomSelect('#buscar-docente', {
        create: false,
        sortField: 'text',
        placeholder: 'Escribe o selecciona un docente...'
    });
}

export function llenarSelectorGabinetes(listaGabinetes) {
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

// Extraemos la lógica de filtrado. Recibe los eventos crudos y el calendario para actualizarlo.
export function aplicarFiltros(todosLosEventos, calendar) {
    let selectorDivision = document.getElementById('filtro-division');
    let selectorGabinete = document.getElementById('selectorEspacio');

    let textoDocente = window.tomSelectDocente
        ? window.tomSelectDocente.getValue().toLowerCase().trim()
        : document.getElementById('buscar-docente').value.toLowerCase().trim();

   /* if (selectorDivision.value === '' && selectorGabinete.value === '' && textoDocente === '') {
        let primeraOpcion = Array.from(selectorDivision.options).find(op => op.value !== '');
        if (primeraOpcion) {
            selectorDivision.value = primeraOpcion.value;
        }
    }*/
    
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

    // Limpiamos la grilla y le pasamos los eventos sobrevivientes
    calendar.removeAllEventSources();
    calendar.addEventSource(eventosFiltrados);
}

// Configuramos todos los listeners de una sola vez
export function configurarListenersFiltros(todosLosEventos, calendar) {
    // Función auxiliar chiquita para no repetir parámetros
    const dispararFiltro = () => aplicarFiltros(todosLosEventos, calendar);

    document.getElementById('selectorEspacio').addEventListener('change', dispararFiltro);
    document.getElementById('filtro-division').addEventListener('change', dispararFiltro);
    document.getElementById('buscar-docente').addEventListener('change', dispararFiltro);

    document.getElementById('btn-limpiar').addEventListener('click', function () {
        if (window.tomSelectDocente) window.tomSelectDocente.clear();
        document.getElementById('filtro-division').value = '';
        document.getElementById('selectorEspacio').value = '';
        dispararFiltro();
    });
}