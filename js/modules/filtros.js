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

export function aplicarFiltros(todosLosEventos, calendar, rol, filtro) {
    calendar.removeAllEventSources();

    let selectorDivision = document.getElementById('filtro-division');
    let selectorGabinete = document.getElementById('selectorEspacio');
    let contenedorFiltros = document.getElementById('controles-busqueda');


    if (rol && rol !== 'admi') {
        if (rol === 'doce') {
            window.tomSelectDocente.setValue(filtro);
        } else if (rol === 'alum') {
            selectorDivision.value = filtro;
        }
    } else {
        let textoDocenteTemp = window.tomSelectDocente
            ? window.tomSelectDocente.getValue().toLowerCase().trim()
            : document.getElementById('buscar-docente').value.toLowerCase().trim();

        if (selectorDivision.value === '' && selectorGabinete.value === '' && textoDocenteTemp === '') {
            let primeraOpcion = Array.from(selectorDivision.options).find(op => op.value !== '');
            if (primeraOpcion) {
                selectorDivision.value = primeraOpcion.value;
            }
        }
    }

    let textoDocente = window.tomSelectDocente
        ? window.tomSelectDocente.getValue().toLowerCase().trim()
        : document.getElementById('buscar-docente').value.toLowerCase().trim();

    let textoDivision = selectorDivision.value.toLowerCase();
    let textogabinete = selectorGabinete.value.toLowerCase();

    let eventosFiltrados = todosLosEventos.filter(evento => {
        let docenteDelEvento = (evento.extendedProps.responsable || '').toLowerCase();
        let divisionDelEvento = (evento.extendedProps.division || '').toLowerCase();
        let gabineteDelEvento = (evento.extendedProps.gabinete || '').toLowerCase();

        let coincideDocente = textoDocente === '' || docenteDelEvento.includes(textoDocente);
        let coincideDivision = textoDivision === '' || divisionDelEvento === textoDivision;
        let coincidegabinete = textogabinete === '' || gabineteDelEvento === textogabinete;

        return coincideDocente && coincideDivision && coincidegabinete;
    });

    calendar.addEventSource(eventosFiltrados);
}

// Configuramos todos los listeners de una sola vez
export function configurarListenersFiltros(todosLosEventos, calendar) {

    const dispararFiltro = () => aplicarFiltros(todosLosEventos, calendar);

    document.getElementById('selectorEspacio').addEventListener('change', dispararFiltro);
    document.getElementById('filtro-division').addEventListener('change', dispararFiltro);
    document.getElementById('buscar-docente').addEventListener('change', dispararFiltro);

    document.getElementById('btn-limpiar').addEventListener('click', function () {
        if (window.tomSelectDocente) window.tomSelectDocente.clear();
        document.getElementById('filtro-division').value = '';
        document.getElementById('selectorEspacio').value = '';

        const selectorTurno = document.getElementById('selector-turno');
        selectorTurno.value = 'mañana/tarde';

        //truco auxiliar para simular un clic del usuario
        selectorTurno.dispatchEvent(new Event('change'))

        dispararFiltro();
    });
}

export function ajustarInterfazPorRol() {
    const rol = localStorage.getItem('rolUsuario')
    const panelFiltros = document.getElementById("controles-busqueda");
    const btnLimpiar = document.getElementById("btn-limpiar");


    if (!panelFiltros) {
        return;
    }
    panelFiltros.style.display = 'none';

    if (rol === 'admi') {
        panelFiltros.style.display = "flex";
    } else {
        btnLimpiar.style.display = 'none';
    }

}
