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
    let selectorEspecialidad = document.getElementById('filtro-tecni-oficio');
    let selectorGabinete = document.getElementById('selectorEspacio');
    let selectorDocente = document.getElementById('buscar-docente');

    // --- Lógica de Roles ---
    if (rol && rol !== 'admi') {
        if (rol === 'doce') {
            window.tomSelectDocente.setValue(filtro);
        } else if (rol === 'alum') {
            let esBasico = Array.from(selectorDivision.options).some(op => op.value === filtro);
            if (esBasico) {
                selectorDivision.value = filtro;
            } else {
                selectorEspecialidad.value = filtro;
            }
        }
    } else {
        // --- PREVENCIÓN DE COLAPSO (Autoselección inicial) ---
        let textoDocenteTemp = window.tomSelectDocente
            ? window.tomSelectDocente.getValue().trim()
            : selectorDocente.value.trim();

        // Si TODO está vacío (es decir, el usuario recién entra a la página)
        if (selectorDivision.value === '' && selectorEspecialidad.value === '' && 
            selectorGabinete.value === '' && textoDocenteTemp === '') {
            
            // Forzamos a que seleccione el primer curso de la lista (ej: 1º AÑO A)
            let primeraOpcion = Array.from(selectorDivision.options).find(op => op.value !== '');
            if (primeraOpcion) {
                selectorDivision.value = primeraOpcion.value;
            }
        }
    }

    let textoDocente = window.tomSelectDocente
        ? window.tomSelectDocente.getValue().toLowerCase().trim()
        : selectorDocente.value.toLowerCase().trim();

    let textoDivision = selectorDivision.value.toLowerCase();
    let textoEspecialidad = selectorEspecialidad.value.toLowerCase();
    let textogabinete = selectorGabinete.value.toLowerCase();

    let eventosFiltrados = todosLosEventos.filter(evento => {
        let docenteDelEvento = (evento.extendedProps.responsable || '').toLowerCase();
        let divisionDelEvento = (evento.extendedProps.division || '').toLowerCase();
        let gabineteDelEvento = (evento.extendedProps.gabinete || '').toLowerCase();

        let coincideDocente = textoDocente === '' || docenteDelEvento.includes(textoDocente);
        let coincideGabinete = textogabinete === '' || gabineteDelEvento === textogabinete;

        let coincideCurso = false;
        
        if (textoDivision !== '') {
            coincideCurso = (divisionDelEvento === textoDivision);
        } else if (textoEspecialidad !== '') {
            coincideCurso = (divisionDelEvento === textoEspecialidad);
        } else {
            // 🎯 MAGIA EN SEGUNDO PLANO: 
            // Si ambos selectores de cursos están en "" (vacíos), significa que 
            // el usuario está filtrando por Docente o por Gabinete. 
            // Ponemos coincideCurso en TRUE para que busque en todo el colegio.
            coincideCurso = true; 
        }

        return coincideDocente && coincideCurso && coincideGabinete;
    });

    calendar.addEventSource(eventosFiltrados);
}

export function configurarListenersFiltros(todosLosEventos, calendar) {
    let selectorDivision = document.getElementById('filtro-division');
    let selectorEspecialidad = document.getElementById('filtro-tecni-oficio'); // <-- NUEVO
    let selectorGabinete = document.getElementById('selectorEspacio');
    let selectorDocente = document.getElementById('buscar-docente');

    const manejarExclusividad = (origen) => {
        
        if (origen !== 'division') {
            selectorDivision.value = ''; // Lo mandamos a la opción "Seleccione..."
        }
        
        if (origen !== 'especialidad') {
            selectorEspecialidad.value = '';
        }

        if (origen !== 'gabinete') {
            selectorGabinete.value = '';
        }

        if (origen !== 'docente') {
            if (window.tomSelectDocente) {
                window.tomSelectDocente.clear(true); 
            } else {
                selectorDocente.value = '';
            }
        }

        aplicarFiltros(todosLosEventos, calendar);
    };

    // Le enchufamos el evento a los 4 selectores
    selectorDivision.addEventListener('change', () => manejarExclusividad('division'));
    selectorEspecialidad.addEventListener('change', () => manejarExclusividad('especialidad'));
    selectorGabinete.addEventListener('change', () => manejarExclusividad('gabinete'));
    selectorDocente.addEventListener('change', () => manejarExclusividad('docente'));
}

export function ajustarInterfazPorRol() {
    const rol = localStorage.getItem('rolUsuario')
    const panelFiltros = document.getElementById("controles-busqueda");


    if (!panelFiltros) {
        return;
    }
    panelFiltros.style.display = 'none';

    if (rol === 'admi') {
        panelFiltros.style.display = "flex";
    }

}
