
export async function generarPDF(btnContext, calendarActual, todosLosEventos) {
    btnContext.disabled = true;

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
        .fc-day-today { background-color: white !important; }
    `;
    document.head.appendChild(estiloTemporal);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });

    let textoDocente = document.getElementById('buscar-docente').value.toLowerCase().trim();
    let textoDivision = document.getElementById('filtro-division').value.toLowerCase();
    let textoGabinete = document.getElementById('selectorEspacio').value.toLowerCase();

    let turnoSeleccionado = document.getElementById('selector-turno').value;

    let tipoCronograma = 'Semana';
    if (textoDocente && textoDocente !== '') {
        tipoCronograma = textoDocente;
    } else {
        tipoCronograma = (textoGabinete && textoGabinete !== '') ? textoGabinete : textoDivision;
    }

    const fechaInicio = calendarActual.view.activeStart;
    const vistaOriginal = calendarActual.view.type;
    const etiquetaVista = {
        'dayGridMonth': fechaInicio.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
        'timeGridWeek': `Semana del ${fechaInicio.toLocaleDateString('es-AR')}`,
        'timeGridSemanaLaboral': `Semana del ${fechaInicio.toLocaleDateString('es-AR')}`,
        'timeGridTresDias': `${fechaInicio.toLocaleDateString('es-AR')} — ${calendarActual.view.activeEnd.toLocaleDateString('es-AR')}`,
        'timeGridDay': fechaInicio.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    }[vistaOriginal] || fechaInicio.toLocaleDateString('es-AR');

    // Contenedor invisible (Le sacamos la altura fija de 700px)
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = `
        position: fixed; top: -9999px; left: -9999px; width: 1400px; z-index: -1; background: white;
    `;
    document.body.appendChild(tempDiv);

    // ==========================================
    // 🎯 NUEVO: TURNOS CON TUS ALTURAS EXACTAS
    // ==========================================
    let turnos = [];

    if (turnoSeleccionado === 'mañana') {
        turnos.push({ nombre: 'Mañana', slotMin: '07:00:00', slotMax: '14:00:01', altura: 730 });
    } else if (turnoSeleccionado === 'tarde') {
        turnos.push({ nombre: 'Tarde', slotMin: '14:00:00', slotMax: '19:00:01', altura: 500 });
    } else if (turnoSeleccionado === 'noche') {
        turnos.push({ nombre: 'Noche', slotMin: '19:00:00', slotMax: '23:00:01', altura: 400 });
    } else if (turnoSeleccionado === 'completo') {
        turnos.push({ nombre: 'Mañana', slotMin: '07:00:00', slotMax: '14:00:01', altura: 830 });
        turnos.push({ nombre: 'Tarde', slotMin: '14:00:00', slotMax: '19:00:01', altura: 600 });
        turnos.push({ nombre: 'Noche', slotMin: '19:00:00', slotMax: '23:00:01', altura: 500 });
    } else {
        turnos.push({ nombre: 'Mañana', slotMin: '07:00:00', slotMax: '14:00:01', altura: 830 });
        turnos.push({ nombre: 'Tarde', slotMin: '14:00:00', slotMax: '19:00:01', altura: 600 });
    }

    const capturas = [];

    try {
        for (const turno of turnos) {
            // 1. Le damos al Div contenedor la altura exacta de este turno
            tempDiv.style.height = `${turno.altura}px`;

            const calTemp = new FullCalendar.Calendar(tempDiv, {
                initialView: 'timeGridWeek',
                initialDate: fechaInicio,
                locale: 'es',
                weekends: false,
                firstDay: 1,
                headerToolbar: false,
                allDaySlot: false,
                slotMinTime: turno.slotMin,
                slotMaxTime: turno.slotMax,
                slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false, meridiem: false },
                slotDuration: '00:15:00',

                // 2. Le pasamos tu altura al motor de FullCalendar
                height: turno.altura,
                contentHeight: turno.altura,

                displayEventTime: false,
                events: todosLosEventos.filter(evento => {
                    let docenteEv = (evento.extendedProps.responsable || '').toLowerCase();
                    let divisionEv = (evento.extendedProps.division || '').toLowerCase();
                    let gabineteEv = (evento.extendedProps.gabinete || '').toLowerCase();

                    return (docenteEv.includes(textoDocente)) &&
                        (textoDivision === '' || divisionEv === textoDivision) &&
                        (textoGabinete === '' || gabineteEv === textoGabinete);
                }),
                eventClassNames: function (arg) {
                    let actividad = arg.event.title.toLowerCase();
                    let gabinete = arg.event.extendedProps.gabinete.toLowerCase();
                    if (actividad.includes('taller') || gabinete.includes('taller')) return ['evento-taller'];
                    if (actividad.includes('ed. fisica')) return ['evento-ed-fisica'];
                    if (actividad.includes('attp')) return ['evento-attp'];

                    return ['evento-default'];
                },
                eventContent: function (arg) {
                    let actividad = arg.event.title;
                    let docente = arg.event.extendedProps.responsable || '';
                    let gabinete = arg.event.extendedProps.gabinete;
                    let textoGabinete = (gabinete && gabinete.trim() !== '') ? gabinete + ' - ' : '';
                    let horaInicio = arg.event.start.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
                    let horaFin = arg.event.end.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

                    return { html: `<div class="tarjeta-evento"><div class="titulo-actividad">${actividad}</div><div class="detalle-evento">${textoGabinete + docente}</div><div class="detalle-evento">Horario: ${horaInicio} a ${horaFin}</div></div>` };
                }
            });

            calTemp.render();
            await new Promise(r => setTimeout(r, 500));

            // 3. Le decimos a la "cámara" que saque la foto usando tu altura exacta
            const canvas = await html2canvas(tempDiv, { scale: 1.7, useCORS: true, width: 1400, height: turno.altura });
            capturas.push({ canvas, nombre: turno.nombre });

            calTemp.destroy();
            tempDiv.innerHTML = '';
        }

        if (tempDiv.parentNode) tempDiv.parentNode.removeChild(tempDiv);
        const estiloABorrar = document.getElementById('estilo-captura-pdf');
        if (estiloABorrar) estiloABorrar.remove();

        capturas.forEach((item, i) => {
            const imgData = item.canvas.toDataURL('image/jpeg', 0.92);
            const pdfW = doc.internal.pageSize.getWidth();

            if (i > 0) doc.addPage();
            doc.setFontSize(13);
            doc.text(`Cronograma: ${tipoCronograma.toLocaleUpperCase()}  |  ${etiquetaVista}  |  Horario ${item.nombre}`, 8, 8);

            const imgWidth = pdfW - 10;

            const imgHeight = (item.canvas.height * imgWidth) / item.canvas.width;

            doc.addImage(imgData, 'JPEG', 5, 20, imgWidth, imgHeight, '', 'MEDIUM');
        });

        Swal.close();
        btnContext.disabled = false;
        doc.save(`${tipoCronograma}-${etiquetaVista}.pdf`);

    } catch (error) {
        console.error('Error completo:', error);
        Swal.fire('Error', error.message, 'error');
        btnContext.disabled = false;
        if (tempDiv.parentNode) tempDiv.parentNode.removeChild(tempDiv);
    }
}