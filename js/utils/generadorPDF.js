
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

    // Leemos los filtros desde el DOM
    let textoDocente = document.getElementById('buscar-docente').value.toLowerCase().trim();
    let textoDivision = document.getElementById('filtro-division').value.toLowerCase();
    let textoGabinete = document.getElementById('selectorEspacio').value.toLowerCase();

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

    // Contenedor invisible
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = `
        position: fixed; top: -9999px; left: -9999px; width: 1400px; height: 700px; z-index: -1; background: white;
    `;
    document.body.appendChild(tempDiv);

    const turnos = [
        { nombre: 'Mañana', slotMin: '07:00:00', slotMax: '14:05:00' },
        { nombre: 'Tarde', slotMin: '14:00:00', slotMax: '20:05:00' }
    ];
    const capturas = [];

    try {
        for (const turno of turnos) {
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
                height: 750,
                contentHeight: 700,
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

            const canvas = await html2canvas(tempDiv, { scale: 1.7, useCORS: true, width: 1400, height: 700 });
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
            const pdfH = doc.internal.pageSize.getHeight();

            if (i > 0) doc.addPage();
            doc.setFontSize(13);
            doc.text(`Cronograma: ${tipoCronograma.toLocaleUpperCase()}  |  ${etiquetaVista}  |  Horario ${item.nombre}`, 8, 8);
            doc.addImage(imgData, 'JPEG', 5, 20, pdfW - 15, pdfH - 80, '', 'MEDIUM');
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