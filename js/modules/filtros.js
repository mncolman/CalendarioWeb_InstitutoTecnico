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

// Reemplazá tu configurarListenersFiltros por esta versión
export function configurarListenersFiltros(todosLosEventos, calendar) {
    let selectorDivision = document.getElementById('filtro-division');
    let selectorGabinete = document.getElementById('selectorEspacio');
    let selectorDocente = document.getElementById('buscar-docente');

    // Función centralizada para manejar la exclusividad
    const manejarExclusividad = (origen) => {
        // 1. Vaciamos silenciosamente los selectores que NO fueron los que el usuario tocó
        if (origen !== 'division') {
            selectorDivision.value = '';
        }
        if (origen !== 'gabinete') {
            selectorGabinete.value = '';
        }
        if (origen !== 'docente') {
            if (window.tomSelectDocente) {
                // El "true" es vital: lo limpia sin avisar, evitando bucles infinitos
                window.tomSelectDocente.clear(true); 
            } else {
                selectorDocente.value = '';
            }
        }

        // 2. Ahora que solo hay uno activo, disparamos tu filtro original
        aplicarFiltros(todosLosEventos, calendar);
    };

    // Le decimos a cada selector que avise "quién es" cuando lo cambian
    selectorDivision.addEventListener('change', () => manejarExclusividad('division'));
    selectorGabinete.addEventListener('change', () => manejarExclusividad('gabinete'));
    selectorDocente.addEventListener('change', () => manejarExclusividad('docente'));

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
