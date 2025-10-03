// Base de datos en memoria (Centralizada para todas las páginas)
let ninos = JSON.parse(localStorage.getItem('ninos')) || [];
let maestros = JSON.parse(localStorage.getItem('maestros')) || [];
let clases = JSON.parse(localStorage.getItem('clases')) || [];
let asistencias = JSON.parse(localStorage.getItem('asistencias')) || [];
let asistenciasMaestros = JSON.parse(localStorage.getItem('asistenciasMaestros')) || []; 

// ==========================================================
// NUEVA FUNCIÓN: BORRADO TOTAL DE DATOS
// ==========================================================

function borrarTodoLocalStorage() {
    // Primera confirmación
    if (confirm('⚠️ ADVERTENCIA: Esta acción BORRARÁ permanentemente TODOS los datos (Niños, Maestros, Clases y Asistencias) guardados en tu navegador. ¿Estás absolutamente seguro de continuar?')) {
        
        // Segunda confirmación con clave (para mayor seguridad)
        const claveIngresada = prompt("CONFIRMA LA ACCIÓN: Ingresa la clave de acceso para borrar todos los datos.");
        const claveCorrecta = "admin";

        if (claveIngresada === claveCorrecta) {
            localStorage.clear();
            alert('✅ Todos los datos han sido eliminados correctamente.');
            // Recargar la página para reflejar el cambio (volviendo al estado inicial)
            window.location.reload(); 
        } else if (claveIngresada !== null) {
            alert('🚫 Clave incorrecta. Borrado cancelado.');
        }
    }
}


// ==========================================================
// FUNCIONES DE ESTADÍSTICAS (Usadas por index.html)
// ==========================================================

function calcularAusenciasNinos() {
    return asistencias.filter(a => a.estado === 'ausente').length;
}

function calcularAusenciasMaestros() {
    return asistenciasMaestros.filter(a => a.estado === 'ausente').length;
}

/**
 * Calcula y devuelve un objeto con el total de horas trabajadas por maestro en la semana actual.
 * @returns {Object} { maestroId: { nombre: string, total: number, dias: object } }
 */
function calcularHorasTrabajadasPorSemana() {
    const horasPorMaestro = {};
    const hoy = new Date();
    // Obtener el lunes de la semana actual
    const inicioSemana = new Date(hoy.setDate(hoy.getDate() - hoy.getDay() + (hoy.getDay() === 0 ? -6 : 1))); 
    inicioSemana.setHours(0, 0, 0, 0);

    // Inicializar la estructura
    maestros.forEach(m => {
        horasPorMaestro[m.id] = {
            nombre: m.nombre,
            dias: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, // Lunes a Viernes
            total: 0
        };
    });

    // Usar la tabla de asistenciasMaestros para calcular horas
    asistenciasMaestros.forEach(a => {
        const fecha = new Date(a.fecha);
        fecha.setHours(0, 0, 0, 0);
        
        // Simulación de horas: Si está presente, asignamos 4 horas fijas 
        if (fecha >= inicioSemana && fecha.getDay() >= 1 && fecha.getDay() <= 5 && a.estado === 'presente') {
            
            const maestroId = a.maestroId;
            const horasTrabajadas = 4; // Asumimos 4 horas de jornada

            const diaSemana = fecha.getDay(); // 1 = Lunes, 5 = Viernes
            
            if (horasPorMaestro[maestroId]) {
                horasPorMaestro[maestroId].dias[diaSemana] += horasTrabajadas;
                horasPorMaestro[maestroId].total += horasTrabajadas;
            }
        }
    });

    // Formatear la tabla en index.html
    const tbody = document.getElementById('bodyHorasTrabajadas');
    if (tbody) { 
        tbody.innerHTML = Object.values(horasPorMaestro).map(data => `
            <tr>
                <td>${data.nombre}</td>
                <td>${data.dias[1].toFixed(1)}h</td>
                <td>${data.dias[2].toFixed(1)}h</td>
                <td>${data.dias[3].toFixed(1)}h</td>
                <td>${data.dias[4].toFixed(1)}h</td>
                <td>${data.dias[5].toFixed(1)}h</td>
                <td><strong>${data.total.toFixed(1)}h</strong></td>
            </tr>
        `).join('');
    }
    
    return horasPorMaestro; // Devolver los datos para el reporte CSV
}


function mostrarEstadisticas() {
    const totalNinos = ninos.length;
    const totalMaestros = maestros.length;
    const faltasNinos = calcularAusenciasNinos();
    const faltasMaestros = calcularAusenciasMaestros();

    const dashboard = [
        { title: "Niños Inscritos", value: totalNinos, icon: "👶", action: '' },
        { title: "Maestros Contratados", value: totalMaestros, icon: "👨‍🏫", action: '' },
        { title: "Faltas de Niños (Total)", value: faltasNinos, icon: "❌", action: '' },
        { title: "Faltas de Maestros (Total)", value: faltasMaestros, icon: "🚫", 
          action: `onclick="window.location.href='asistencia.html?view=reporteMaestros'"` },
    ];

    const resumenDiv = document.getElementById('resumenEstadisticas');
    if (!resumenDiv) return; 

    resumenDiv.innerHTML = dashboard.map(item => `
        <div 
            class="card" 
            style="text-align: center; cursor: ${item.action ? 'pointer' : 'default'};" 
            ${item.action}
        >
            <div class="card-info">
                <h3 style="font-size: 2.5em; margin-bottom: 5px;">${item.value}</h3>
                <p style="color: #6c757d;">${item.icon} ${item.title}</p>
            </div>
        </div>
    `).join('');
    
    calcularHorasTrabajadasPorSemana();
}

// ==========================================================
// FUNCIÓN DE DESCARGA DE REPORTE PDF
// ==========================================================

function descargarReportePDF() {
    const horasMaestros = calcularHorasTrabajadasPorSemana(); 
    const fechaActual = new Date().toLocaleDateString('es-ES');

    // --- 1. Faltas de Maestros ---
    let faltasMaestrosHTML = `
        <h3>1. Faltas de Maestros (Total: ${asistenciasMaestros.filter(a => a.estado !== 'presente').length})</h3>
        <table class="report-table">
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Maestro</th>
                    <th>Estado</th>
                    <th>Descripción Breve</th>
                </tr>
            </thead>
            <tbody>`;
    
    const faltasMaestros = asistenciasMaestros.filter(a => a.estado !== 'presente').sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    if (faltasMaestros.length === 0) {
        faltasMaestrosHTML += '<tr><td colspan="4">No se registraron faltas de maestros.</td></tr>';
    } else {
        faltasMaestrosHTML += faltasMaestros.map(a => {
            const descripcion = a.estado === 'ausente' ? 'Ausencia total ese día' : 'Llegó con tardanza';
            return `
                <tr>
                    <td>${new Date(a.fecha).toLocaleDateString('es-ES')}</td>
                    <td>${a.maestroNombre}</td>
                    <td>${a.estado.toUpperCase()}</td>
                    <td>${descripcion}</td>
                </tr>`;
        }).join('');
    }
    faltasMaestrosHTML += '</tbody></table><div class="page-break"></div>';

    // --- 2. Faltas de Niños ---
    let faltasNinosHTML = `
        <h3>2. Faltas de Niños (Ausencias/Tardanzas: ${asistencias.filter(a => a.estado !== 'presente').length})</h3>
        <table class="report-table">
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Niño</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>`;
    
    const faltasNinos = asistencias.filter(a => a.estado !== 'presente').sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    if (faltasNinos.length === 0) {
        faltasNinosHTML += '<tr><td colspan="3">No se registraron faltas de niños.</td></tr>';
    } else {
        faltasNinosHTML += faltasNinos.map(a => `
            <tr>
                <td>${new Date(a.fecha).toLocaleDateString('es-ES')}</td>
                <td>${a.ninoNombre}</td>
                <td>${a.estado.toUpperCase()}</td>
            </tr>`).join('');
    }
    faltasNinosHTML += '</tbody></table><div class="page-break"></div>';

    // --- 3. Horas Trabajadas ---
    let horasTrabajadasHTML = `
        <h3>3. Horas Trabajadas por Maestro (Total Semanal)</h3>
        <table class="report-table">
            <thead>
                <tr>
                    <th>Maestro</th>
                    <th>Total Horas Trabajadas (Semana)</th>
                </tr>
            </thead>
            <tbody>`;
            
    if (Object.keys(horasMaestros).length === 0) {
        horasTrabajadasHTML += '<tr><td colspan="2">No hay datos de maestros o asistencias para esta semana.</td></tr>';
    } else {
        horasTrabajadasHTML += Object.values(horasMaestros).map(data => `
            <tr>
                <td>${data.nombre}</td>
                <td>${data.total.toFixed(1)} horas</td>
            </tr>`).join('');
    }
    horasTrabajadasHTML += '</tbody></table>';

    // --- Estilos para la impresión (PDF) ---
    const printStyles = `
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #003366; border-bottom: 2px solid #FF6900; padding-bottom: 5px; }
            h2 { color: #FF6900; margin-top: 30px; }
            h3 { color: #003366; margin-top: 20px; font-size: 1.2em; }
            .report-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .report-table th, .report-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            .report-table th { background-color: #f2f2f2; color: #003366; }
            .date-info { margin-bottom: 20px; font-style: italic; }
            @media print {
                /* Asegura un salto de página después de cada sección (si es necesario) */
                .page-break { page-break-after: always; }
                body { margin: 0; }
                h1 { margin-top: 0; }
            }
        </style>
    `;

    // --- Estructura completa del HTML del reporte ---
    const reportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Reporte de Gestión Bambini - ${fechaActual}</title>
            ${printStyles}
        </head>
        <body>
            <h1>Reporte de Gestión Detallado - Jardín Bambini</h1>
            <p class="date-info">Generado el: ${fechaActual}</p>
            
            ${faltasMaestrosHTML}
            ${faltasNinosHTML}
            ${horasTrabajadasHTML}
            
        </body>
        </html>
    `;

    // Abrir una nueva ventana, escribir el contenido y mandar a imprimir
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(reportHTML);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    } else {
        alert('Por favor, permite las ventanas emergentes para generar el PDF.');
    }
}


// ==========================================================
// FUNCIONES DE REPORTE DE FALTAS (Asistencia.html)
// ==========================================================

function generarReporteFaltasMaestros() {
    const mesAnio = document.getElementById('selectorMesFaltasMaestros').value; // Formato YYYY-MM
    const tbody = document.getElementById('bodyReporteFaltasMaestros');
    
    if (!tbody || !mesAnio) {
        if(tbody) {
             tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 40px; color: #dc3545;">Por favor, selecciona un mes.</td></tr>';
        }
        return; 
    }
    
    const [anioStr, mesStr] = mesAnio.split('-');
    const anio = parseInt(anioStr);
    const mes = parseInt(mesStr); // Mes 1-12

    const faltasFiltradas = asistenciasMaestros.filter(a => {
        const fecha = new Date(a.fecha + 'T00:00:00'); 
        return fecha.getFullYear() === anio && 
               (fecha.getMonth() + 1) === mes && 
               (a.estado === 'ausente' || a.estado === 'tardanza');
    }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha)); 

    if (faltasFiltradas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 40px; color: #6c757d;">🎉 ¡No se registraron faltas de maestros en el mes seleccionado!</td></tr>';
        return;
    }

    tbody.innerHTML = faltasFiltradas.map(a => {
        const estadoText = a.estado.charAt(0).toUpperCase() + a.estado.slice(1);
        const badgeClass = a.estado === 'ausente' ? 'btn-danger' : 'badge-warning';
        
        let descripcion;
        switch(a.estado) {
            case 'ausente':
                descripcion = 'Ausencia total ese día.';
                break;
            case 'tardanza':
                descripcion = 'Llegó con retraso (tardanza).';
                break;
            default:
                descripcion = 'N/A';
        }

        return `
            <tr>
                <td>${new Date(a.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td><strong>${a.maestroNombre}</strong></td>
                <td>
                    <span class="badge ${badgeClass}">${estadoText.toUpperCase()}</span>
                </td>
                <td>${descripcion}</td>
            </tr>
        `;
    }).join('');
}


// ==========================================================
// FUNCIONES DE GESTIÓN (Resto del script sin cambios)
// ==========================================================

// --- NIÑOS ---
function guardarNino(e) {
    e.preventDefault();
    const fotoInput = document.getElementById('fotoNino');
    let fotoBase64 = null;
    if (fotoInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = function(event) {
            fotoBase64 = event.target.result;
            crearNino(fotoBase64);
        };
        reader.readAsDataURL(fotoInput.files[0]);
    } else {
        crearNino(null);
    }
}
function crearNino(foto) {
    const nino = {
        id: Date.now(),
        nombre: document.getElementById('nombreNino').value,
        fechaNac: document.getElementById('fechaNacNino').value,
        tutor: document.getElementById('tutorNino').value,
        telefono: document.getElementById('telefonoNino').value,
        direccion: document.getElementById('direccionNino').value,
        foto: foto,
        observaciones: document.getElementById('observacionesNino').value
    };
    ninos.push(nino);
    localStorage.setItem('ninos', JSON.stringify(ninos));
    document.getElementById('formNino').reset();
    mostrarNinos();
    alert('✅ Niño guardado correctamente');
}
function mostrarNinos() {
    const lista = document.getElementById('listaNinos');
    if (!lista) return; 
    if (ninos.length === 0) {
        lista.innerHTML = '<div class="empty-state"><h3>No hay niños registrados</h3><p>Agrega el primer niño usando el formulario</p></div>';
        return;
    }
    lista.innerHTML = ninos.map(nino => `
        <div class="card">
            <div class="card-header">
                ${nino.foto ? `<img src="${nino.foto}" class="card-image" alt="${nino.nombre}">` : `<div class="card-image placeholder">${nino.nombre.charAt(0).toUpperCase()}</div>`}
                <div class="card-info">
                    <h3>${nino.nombre}</h3>
                    <p>👶 ${calcularEdad(nino.fechaNac)} años</p>
                </div>
            </div>
            <div class="card-body">
                <p><strong>Tutor:</strong> ${nino.tutor}</p>
                <p><strong>Teléfono:</strong> ${nino.telefono}</p>
                ${nino.direccion ? `<p><strong>Dirección:</strong> ${nino.direccion}</p>` : ''}
                ${nino.observaciones ? `<p><strong>Obs:</strong> ${nino.observaciones}</p>` : ''}
            </div>
            <div class="card-actions">
                <button class="btn btn-danger" onclick="eliminarNino(${nino.id})">🗑️ Eliminar</button>
            </div>
        </div>
    `).join('');
}
function calcularEdad(fechaNac) {
    const hoy = new Date();
    const nacimiento = new Date(fechaNac);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) { edad--; }
    return edad;
}
function eliminarNino(id) {
    if (confirm('¿Estás seguro de eliminar este niño?')) {
        ninos = ninos.filter(n => n.id !== id);
        localStorage.setItem('ninos', JSON.stringify(ninos));
        mostrarNinos();
    }
}

// --- MAESTROS ---
function guardarMaestro(e) {
    e.preventDefault();
    const fotoInput = document.getElementById('fotoMaestro');
    let fotoBase64 = null;
    if (fotoInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = function(event) {
            fotoBase64 = event.target.result;
            crearMaestro(fotoBase64);
        };
        reader.readAsDataURL(fotoInput.files[0]);
    } else {
        crearMaestro(null);
    }
}
function crearMaestro(foto) {
    const maestro = {
        id: Date.now(),
        nombre: document.getElementById('nombreMaestro').value,
        cedula: document.getElementById('cedulaMaestro').value,
        telefono: document.getElementById('telefonoMaestro').value,
        email: document.getElementById('emailMaestro').value,
        especialidad: document.getElementById('especialidadMaestro').value,
        foto: foto
    };
    maestros.push(maestro);
    localStorage.setItem('maestros', JSON.stringify(maestros));
    document.getElementById('formMaestro').reset();
    mostrarMaestros();
    alert('✅ Maestro guardado correctamente');
}
function mostrarMaestros() {
    const lista = document.getElementById('listaMaestros');
    if (!lista) return; 
    if (maestros.length === 0) {
        lista.innerHTML = '<div class="empty-state"><h3>No hay maestros registrados</h3><p>Agrega el primer maestro usando el formulario</p></div>';
        return;
    }
    lista.innerHTML = maestros.map(maestro => `
        <div class="card">
            <div class="card-header">
                ${maestro.foto ? `<img src="${maestro.foto}" class="card-image" alt="${maestro.nombre}">` : `<div class="card-image placeholder">${maestro.nombre.charAt(0).toUpperCase()}</div>`}
                <div class="card-info">
                    <h3>${maestro.nombre}</h3>
                    <p>📋 ${maestro.cedula}</p>
                </div>
            </div>
            <div class="card-body">
                <p><strong>Teléfono:</strong> ${maestro.telefono}</p>
                ${maestro.email ? `<p><strong>Email:</strong> ${maestro.email}</p>` : ''}
                ${maestro.especialidad ? `<p><strong>Especialidad:</strong> ${maestro.especialidad}</p>` : ''}
            </div>
            <div class="card-actions">
                <button class="btn btn-danger" onclick="eliminarMaestro(${maestro.id})">🗑️ Eliminar</button>
            </div>
        </div>
    `).join('');
}
function eliminarMaestro(id) {
    if (confirm('¿Estás seguro de eliminar este maestro?')) {
        maestros = maestros.filter(m => m.id !== id);
        localStorage.setItem('maestros', JSON.stringify(maestros));
        mostrarMaestros();
    }
}

// --- CLASES ---
function actualizarSelectMaestros() {
    const select = document.getElementById('maestroClase');
    if (!select) return;
    select.innerHTML = '<option value="">Seleccionar maestro</option>' + maestros.map(m => `<option value="${m.id}">${m.nombre}</option>`).join('');
}
function guardarClase(e) {
    e.preventDefault();
    const maestroId = parseInt(document.getElementById('maestroClase').value);
    const maestro = maestros.find(m => m.id === maestroId);

    const clase = {
        id: Date.now(),
        nombre: document.getElementById('nombreClase').value,
        maestroId: maestroId,
        maestroNombre: maestro ? maestro.nombre : '',
        horaEntrada: document.getElementById('horaEntrada').value,
        horaSalida: document.getElementById('horaSalida').value,
        capacidad: document.getElementById('capacidadClase').value
    };
    clases.push(clase);
    localStorage.setItem('clases', JSON.stringify(clases));
    document.getElementById('formClase').reset();
    mostrarClases();
    alert('✅ Clase guardada correctamente');
}
function mostrarClases() {
    const lista = document.getElementById('listaClases');
    if (!lista) return;
    if (clases.length === 0) {
        lista.innerHTML = '<div class="empty-state"><h3>No hay clases registradas</h3><p>Agrega la primera clase usando el formulario</p></div>';
        return;
    }
    lista.innerHTML = clases.map(clase => `
        <div class="card">
            <div class="card-header">
                <div class="card-image placeholder">📚</div>
                <div class="card-info">
                    <h3>${clase.nombre}</h3>
                    <p>👨‍🏫 ${clase.maestroNombre}</p>
                </div>
            </div>
            <div class="card-body">
                <p><strong>Horario:</strong> ${clase.horaEntrada} - ${clase.horaSalida}</p>
                ${clase.capacidad ? `<p><strong>Capacidad:</strong> ${clase.capacidad}</p>` : ''}
            </div>
            <div class="card-actions">
                <button class="btn btn-danger" onclick="eliminarClase(${clase.id})">🗑️ Eliminar</button>
            </div>
        </div>
    `).join('');
}
function eliminarClase(id) {
    if (confirm('¿Estás seguro de eliminar esta clase?')) {
        clases = clases.filter(c => c.id !== id);
        localStorage.setItem('clases', JSON.stringify(clases));
        mostrarClases();
    }
}

// --- ASISTENCIA NIÑOS ---
function actualizarSelectNinos() {
    const select = document.getElementById('ninoAsistencia');
    if (!select) return;
    select.innerHTML = '<option value="">Seleccionar niño</option>' + ninos.map(n => `<option value="${n.id}">${n.nombre}</option>`).join('');
    document.getElementById('fechaAsistencia').valueAsDate = new Date();
}
function guardarAsistencia(e) {
    e.preventDefault();
    const ninoId = parseInt(document.getElementById('ninoAsistencia').value);
    const nino = ninos.find(n => n.id === ninoId);

    const asistencia = {
        id: Date.now(),
        ninoId: ninoId,
        ninoNombre: nino ? nino.nombre : '',
        fecha: document.getElementById('fechaAsistencia').value,
        horaEntrada: document.getElementById('horaEntradaAsistencia').value,
        horaSalida: document.getElementById('horaSalidaAsistencia').value,
        estado: document.getElementById('estadoAsistencia').value
    };
    asistencias.push(asistencia);
    localStorage.setItem('asistencias', JSON.stringify(asistencias));
    document.getElementById('formAsistencia').reset();
    document.getElementById('fechaAsistencia').valueAsDate = new Date();
    mostrarAsistencias();
    alert('✅ Asistencia registrada correctamente');
}
function mostrarAsistencias() {
    const tbody = document.getElementById('bodyAsistencia');
    if (!tbody) return;
    if (asistencias.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 40px; color: #6c757d;">No hay registros de asistencia</td></tr>';
        return;
    }
    tbody.innerHTML = asistencias.slice().reverse().map(a => `
        <tr>
            <td>${new Date(a.fecha).toLocaleDateString('es-ES')}</td>
            <td>${a.ninoNombre}</td>
            <td>${a.horaEntrada || '-'}</td>
            <td>${a.horaSalida || '-'}</td>
            <td>
                <span class="badge ${a.estado === 'presente' ? 'badge-success' : a.estado === 'tardanza' ? 'badge-warning' : ''}">
                    ${a.estado.toUpperCase()}
                </span>
            </td>
            <td>
                <button class="btn btn-danger" style="padding: 5px 10px; font-size: 0.85em;" onclick="eliminarAsistencia(${a.id})">🗑️</button>
            </td>
        </tr>
    `).join('');
}
function eliminarAsistencia(id) {
    if (confirm('¿Estás seguro de eliminar este registro?')) {
        asistencias = asistencias.filter(a => a.id !== id);
        localStorage.setItem('asistencias', JSON.stringify(asistencias));
        mostrarAsistencias();
    }
}

// --- ASISTENCIA MAESTROS ---
function actualizarSelectMaestrosAsistencia() {
    const select = document.getElementById('maestroAsistencia');
    if (!select) return;
    select.innerHTML = '<option value="">Seleccionar maestro</option>' + maestros.map(m => `<option value="${m.id}">${m.nombre}</option>`).join('');
    document.getElementById('fechaAsistenciaMaestro').valueAsDate = new Date();
}
function guardarAsistenciaMaestro(e) {
    e.preventDefault();
    const maestroId = parseInt(document.getElementById('maestroAsistencia').value);
    const maestro = maestros.find(m => m.id === maestroId);

    const asistencia = {
        id: Date.now(),
        maestroId: maestroId,
        maestroNombre: maestro ? maestro.nombre : '',
        fecha: document.getElementById('fechaAsistenciaMaestro').value,
        estado: document.getElementById('estadoAsistenciaMaestro').value
    };

    asistenciasMaestros.push(asistencia);
    localStorage.setItem('asistenciasMaestros', JSON.stringify(asistenciasMaestros));
    document.getElementById('formAsistenciaMaestro').reset();
    document.getElementById('fechaAsistenciaMaestro').valueAsDate = new Date();
    mostrarAsistenciasMaestros();
    alert('✅ Asistencia de maestro registrada correctamente');
}
function mostrarAsistenciasMaestros() {
    const tbody = document.getElementById('bodyAsistenciaMaestro');
    if (!tbody) return;
    if (asistenciasMaestros.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 40px; color: #6c757d;">No hay registros de asistencia de maestros</td></tr>';
        return;
    }
    tbody.innerHTML = asistenciasMaestros.slice().reverse().map(a => `
        <tr>
            <td>${new Date(a.fecha).toLocaleDateString('es-ES')}</td>
            <td>${a.maestroNombre}</td>
            <td>
                <span class="badge ${a.estado === 'presente' ? 'badge-success' : a.estado === 'tardanza' ? 'badge-warning' : ''}">
                    ${a.estado.toUpperCase()}
                </span>
            </td>
            <td>
                <button class="btn btn-danger" style="padding: 5px 10px; font-size: 0.85em;" onclick="eliminarAsistenciaMaestro(${a.id})">🗑️</button>
            </td>
        </tr>
    `).join('');
}
function eliminarAsistenciaMaestro(id) {
    if (confirm('¿Estás seguro de eliminar este registro de asistencia?')) {
        asistenciasMaestros = asistenciasMaestros.filter(a => a.id !== id);
        localStorage.setItem('asistenciasMaestros', JSON.stringify(asistenciasMaestros));
        mostrarAsistenciasMaestros();
    }
}