/**
 * Lista de DTEs
 */

let dtesFiltrados = [];
let todosLosDTEs = [];

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    cargarDTEs();
});

// Cargar DTEs
async function cargarDTEs() {
    const tbody = document.getElementById('tablaDTEs');
    tbody.innerHTML = '<tr><td colspan="9" class="text-center"><div class="spinner-border text-primary"></div></td></tr>';

    try {
        const response = await DTEsAPI.listar();
        todosLosDTEs = response.data;
        dtesFiltrados = todosLosDTEs;
        renderizarTabla();
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Error al cargar DTEs</td></tr>';
    }
}

// Renderizar tabla
function renderizarTabla() {
    const tbody = document.getElementById('tablaDTEs');
    tbody.innerHTML = '';

    if (dtesFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No hay DTEs para mostrar</td></tr>';
        return;
    }

    dtesFiltrados.forEach(dte => {
        const tr = document.createElement('tr');
        
        // Badge de estado
        let estadoBadge = '';
        if (dte.estado === 'procesado') {
            estadoBadge = '<span class="badge bg-success">Procesado</span>';
        } else if (dte.estado === 'invalidado') {
            estadoBadge = '<span class="badge bg-danger">Invalidado</span>';
        } else {
            estadoBadge = `<span class="badge bg-secondary">${dte.estado}</span>`;
        }

        tr.innerHTML = `
            <td>${formatearFecha(dte.creado_en)}</td>
            <td>${getTipoNombre(dte.tipo_dte)}</td>
            <td><small>${dte.numero_control}</small></td>
            <td>${dte.numero_caja || '-'}</td>
            <td>${dte.usuario_nombre || '-'}</td>
            <td>${dte.cliente_nombre || 'Sin cliente'}</td>
            <td class="text-end fw-bold">$${parseFloat(dte.total).toFixed(2)}</td>
            <td>${estadoBadge}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-info" onclick="verDetalles(${dte.id})" title="Ver detalles">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-primary" onclick="descargarPDF(${dte.id})" title="Descargar PDF">
                        <i class="bi bi-file-pdf"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Aplicar filtros
function aplicarFiltros() {
    const tipo = document.getElementById('filtroTipo').value;
    const estado = document.getElementById('filtroEstado').value;
    const fechaDesde = document.getElementById('filtroFechaDesde').value;
    const fechaHasta = document.getElementById('filtroFechaHasta').value;

    dtesFiltrados = todosLosDTEs.filter(dte => {
        let cumple = true;

        // Filtro por tipo
        if (tipo && dte.tipo_dte !== tipo) {
            cumple = false;
        }

        // Filtro por estado
        if (estado && dte.estado !== estado) {
            cumple = false;
        }

        // Filtro por fecha desde
        if (fechaDesde) {
            const fechaDte = new Date(dte.creado_en).toISOString().split('T')[0];
            if (fechaDte < fechaDesde) {
                cumple = false;
            }
        }

        // Filtro por fecha hasta
        if (fechaHasta) {
            const fechaDte = new Date(dte.creado_en).toISOString().split('T')[0];
            if (fechaDte > fechaHasta) {
                cumple = false;
            }
        }

        return cumple;
    });

    renderizarTabla();
}

// Limpiar filtros
function limpiarFiltros() {
    document.getElementById('filtroTipo').value = '';
    document.getElementById('filtroEstado').value = '';
    document.getElementById('filtroFechaDesde').value = '';
    document.getElementById('filtroFechaHasta').value = '';
    dtesFiltrados = todosLosDTEs;
    renderizarTabla();
}

// Ver detalles
async function verDetalles(id) {
    try {
        const response = await DTEsAPI.obtener(id);
        const dte = response.data;

        const contenido = document.getElementById('contenidoDetalles');
        contenido.innerHTML = `
            <div class="row mb-3">
                <div class="col-md-6">
                    <h6 class="text-muted">Información General</h6>
                    <p class="mb-1"><strong>Tipo:</strong> ${getTipoNombre(dte.tipo_dte)}</p>
                    <p class="mb-1"><strong>Número de Control:</strong> ${dte.numero_control}</p>
                    <p class="mb-1"><strong>Código de Generación:</strong> <small>${dte.codigo_generacion}</small></p>
                    <p class="mb-1"><strong>Fecha:</strong> ${formatearFecha(dte.creado_en)}</p>
                    <p class="mb-1"><strong>Estado:</strong> <span class="badge bg-${dte.estado === 'procesado' ? 'success' : 'danger'}">${dte.estado}</span></p>
                </div>
                <div class="col-md-6">
                    <h6 class="text-muted">Cliente</h6>
                    <p class="mb-1"><strong>Nombre:</strong> ${dte.cliente_nombre || 'Sin cliente'}</p>
                    <p class="mb-1"><strong>Documento:</strong> ${dte.cliente_doc || '-'}</p>
                    <p class="mb-1"><strong>NRC:</strong> ${dte.cliente_nrc || '-'}</p>
                </div>
            </div>

            <h6 class="text-muted mb-2">Productos</h6>
            <div class="table-responsive mb-3">
                <table class="table table-sm table-bordered">
                    <thead class="table-light">
                        <tr>
                            <th>Cantidad</th>
                            <th>Descripción</th>
                            <th class="text-end">Precio Unit.</th>
                            <th class="text-end">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dte.detalles.map(d => `
                            <tr>
                                <td>${d.cantidad}</td>
                                <td>${d.descripcion}</td>
                                <td class="text-end">$${parseFloat(d.precio_unitario).toFixed(2)}</td>
                                <td class="text-end">$${parseFloat(d.subtotal).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="row">
                <div class="col-md-6 offset-md-6">
                    <table class="table table-sm">
                        <tr>
                            <td><strong>Subtotal:</strong></td>
                            <td class="text-end">$${parseFloat(dte.subtotal).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td><strong>IVA (13%):</strong></td>
                            <td class="text-end">$${parseFloat(dte.iva).toFixed(2)}</td>
                        </tr>
                        <tr class="table-success">
                            <td><strong>TOTAL:</strong></td>
                            <td class="text-end"><strong>$${parseFloat(dte.total).toFixed(2)}</strong></td>
                        </tr>
                    </table>
                </div>
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById('modalDetalles'));
        modal.show();

    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
}

// Descargar PDF
async function descargarPDF(id) {
    try {
        showLoading('Generando PDF...');
        
        const response = await fetch(`${API_BASE_URL}/dte/${id}/pdf`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al generar PDF');
        }

        // Crear blob y descargar
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DTE-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        hideLoading();

    } catch (error) {
        hideLoading();
        Swal.fire('Error', error.message, 'error');
    }
}

// Helpers
function getTipoNombre(tipo) {
    const tipos = {
        '01': 'Factura',
        '03': 'CCF',
        '05': 'Nota de Crédito'
    };
    return tipos[tipo] || tipo;
}

function formatearFecha(fecha) {
    if (!fecha) return '-';
    const date = new Date(fecha);
    return date.toLocaleString('es-SV', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}
