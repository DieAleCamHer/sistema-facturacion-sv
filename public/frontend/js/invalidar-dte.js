/**
 * Invalidar DTE - Sistema de Facturación SV
 */

let dtesDisponibles = [];
let dteSeleccionado = null;

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    cargarDTEs();
    configurarEventos();
});

// Cargar DTEs procesados
async function cargarDTEs() {
    try {
        const response = await DTEsAPI.listar();
        dtesDisponibles = response.data.filter(dte => dte.estado === 'procesado');
        
        const select = document.getElementById('dte_id');
        select.innerHTML = '<option value="">Seleccione un DTE...</option>';
        
        if (dtesDisponibles.length === 0) {
            select.innerHTML = '<option value="">No hay DTEs procesados disponibles</option>';
            return;
        }
        
        dtesDisponibles.forEach(dte => {
            const tipoNombre = getTipoNombre(dte.tipo_dte);
            const option = document.createElement('option');
            option.value = dte.id;
            option.textContent = `${tipoNombre} - ${dte.numero_control} - $${parseFloat(dte.total).toFixed(2)} - ${formatearFecha(dte.creado_en)}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando DTEs:', error);
        Swal.fire('Error', 'No se pudieron cargar los DTEs', 'error');
    }
}

// Configurar eventos
function configurarEventos() {
    document.getElementById('btnVerificar').addEventListener('click', verificarDTE);
    document.getElementById('btnInvalidar').addEventListener('click', invalidarDTE);
}

// Verificar si el DTE puede invalidarse
async function verificarDTE() {
    const dteId = document.getElementById('dte_id').value;
    
    if (!dteId) {
        Swal.fire('Error', 'Seleccione un DTE', 'warning');
        return;
    }

    showLoading('Verificando DTE...');

    try {
        const response = await fetch(`${API_BASE_URL}/dte/${dteId}/puede-invalidar`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        const data = await response.json();
        hideLoading();

        if (!response.ok) {
            throw new Error(data.message || 'Error verificando DTE');
        }

        dteSeleccionado = dtesDisponibles.find(d => d.id == dteId);
        mostrarInfoDTE(data.data, dteSeleccionado);

    } catch (error) {
        hideLoading();
        Swal.fire('Error', error.message, 'error');
    }
}

// Mostrar información del DTE
function mostrarInfoDTE(verificacion, dte) {
    const panelInfo = document.getElementById('panelInfo');
    const formInvalidacion = document.getElementById('formInvalidacion');
    const infoContent = document.getElementById('infoContent');

    panelInfo.classList.remove('d-none');

    if (verificacion.puede_invalidar) {
        // Puede invalidarse
        infoContent.innerHTML = `
            <p class="mb-1"><strong>Número de Control:</strong> ${dte.numero_control}</p>
            <p class="mb-1"><strong>Fecha de Emisión:</strong> ${formatearFecha(dte.creado_en)}</p>
            <p class="mb-1"><strong>Cliente:</strong> ${dte.cliente_nombre || 'Sin cliente'}</p>
            <p class="mb-1"><strong>Total:</strong> $${parseFloat(dte.total).toFixed(2)}</p>
            <hr class="my-2">
            <p class="mb-0 text-success">
                <i class="bi bi-check-circle"></i> 
                <strong>Este DTE puede ser invalidado</strong>
            </p>
            <p class="mb-0 text-muted small">
                Tiempo transcurrido: ${verificacion.horas_transcurridas} horas de ${verificacion.tiempo_limite} permitidas
            </p>
        `;
        
        formInvalidacion.classList.remove('d-none');

    } else {
        // NO puede invalidarse
        infoContent.innerHTML = `
            <p class="mb-1"><strong>Número de Control:</strong> ${dte.numero_control}</p>
            <p class="mb-1"><strong>Fecha de Emisión:</strong> ${formatearFecha(dte.creado_en)}</p>
            <hr class="my-2">
            <p class="mb-0 text-danger">
                <i class="bi bi-x-circle"></i> 
                <strong>Este DTE NO puede ser invalidado</strong>
            </p>
            <p class="mb-0 text-muted small">
                Razón: ${verificacion.razon}
            </p>
        `;
        
        formInvalidacion.classList.add('d-none');
    }
}

// Invalidar DTE
async function invalidarDTE() {
    const dteId = document.getElementById('dte_id').value;
    const tipoMotivo = document.getElementById('tipoMotivo').value;
    const motivo = document.getElementById('motivo').value.trim();

    // Validaciones
    if (!dteId) {
        Swal.fire('Error', 'Seleccione un DTE', 'warning');
        return;
    }

    if (!tipoMotivo) {
        Swal.fire('Error', 'Seleccione el tipo de motivo', 'warning');
        return;
    }

    if (!motivo) {
        Swal.fire('Error', 'Ingrese la descripción del motivo', 'warning');
        return;
    }

    // Confirmación
    const confirmacion = await Swal.fire({
        title: '¿Estás absolutamente seguro?',
        html: `
            <p>Estás a punto de <strong>INVALIDAR</strong> el DTE:</p>
            <p class="text-danger"><strong>${dteSeleccionado.numero_control}</strong></p>
            <p class="text-muted small">Esta acción es <strong>irreversible</strong> y no puede deshacerse.</p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, invalidar',
        cancelButtonText: 'Cancelar',
        input: 'checkbox',
        inputPlaceholder: 'Confirmo que quiero invalidar este DTE',
        inputValidator: (result) => {
            return !result && 'Debe confirmar para continuar'
        }
    });

    if (!confirmacion.isConfirmed) return;

    showLoading('Invalidando DTE...');

    try {
        const motivoCompleto = `${tipoMotivo}: ${motivo}`;

        const response = await fetch(`${API_BASE_URL}/dte/${dteId}/invalidar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({
                motivo: motivoCompleto
            })
        });

        const data = await response.json();
        hideLoading();

        if (!response.ok) {
            throw new Error(data.message || 'Error invalidando DTE');
        }

        await Swal.fire({
            icon: 'success',
            title: '¡DTE Invalidado!',
            html: `
                <p>El DTE ha sido invalidado exitosamente</p>
                <p class="text-muted small">Código de evento: ${data.data.codigo_evento}</p>
            `,
            confirmButtonText: 'Ver DTEs'
        });

        // Redirigir
        window.location.href = 'lista-dtes.html';

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
