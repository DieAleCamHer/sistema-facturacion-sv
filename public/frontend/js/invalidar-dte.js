/**
 * Invalidar DTE - Sistema de Facturación SV
 * Usa Catálogo 24 (CAT-024) de Hacienda para tipos de invalidación
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
        const tiempoLimiteTexto = dte.tipo_dte === '01' ? '3 meses' : '1 día';
        
        infoContent.innerHTML = `
            <p class="mb-1"><strong>Número de Control:</strong> ${dte.numero_control}</p>
            <p class="mb-1"><strong>Tipo DTE:</strong> ${getTipoNombre(dte.tipo_dte)}</p>
            <p class="mb-1"><strong>Fecha de Emisión:</strong> ${formatearFecha(dte.creado_en)}</p>
            <p class="mb-1"><strong>Cliente:</strong> ${dte.cliente_nombre || 'Sin cliente'}</p>
            <p class="mb-1"><strong>Total:</strong> $${parseFloat(dte.total).toFixed(2)}</p>
            <hr class="my-2">
            <p class="mb-0 text-success">
                <i class="bi bi-check-circle"></i> 
                <strong>Este DTE puede ser invalidado</strong>
            </p>
            <p class="mb-0 text-muted small">
                Plazo: ${tiempoLimiteTexto} | Transcurridas: ${verificacion.horas_transcurridas}h de ${verificacion.tiempo_limite}h permitidas
            </p>
        `;
        
        formInvalidacion.classList.remove('d-none');

    } else {
        infoContent.innerHTML = `
            <p class="mb-1"><strong>Número de Control:</strong> ${dte.numero_control}</p>
            <p class="mb-1"><strong>Tipo DTE:</strong> ${getTipoNombre(dte.tipo_dte)}</p>
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
    const tipoInvalidacion = document.getElementById('tipoInvalidacion').value;
    const motivoDetalle = document.getElementById('motivoDetalle').value.trim();

    // Validaciones
    if (!dteId) {
        Swal.fire('Error', 'Seleccione un DTE', 'warning');
        return;
    }

    if (!tipoInvalidacion) {
        Swal.fire('Error', 'Seleccione el tipo de invalidación', 'warning');
        return;
    }

    if (!motivoDetalle || motivoDetalle.length < 5) {
        Swal.fire('Error', 'Ingrese la descripción del motivo (mínimo 5 caracteres)', 'warning');
        return;
    }

    if (motivoDetalle.length > 250) {
        Swal.fire('Error', 'La descripción no puede exceder 250 caracteres', 'warning');
        return;
    }

    // Confirmación
    const tipoTexto = {
        '1': 'Error en la Información del DTE',
        '2': 'Rescindir de la operación realizada',
        '3': 'Otro'
    }[tipoInvalidacion];

    const confirmacion = await Swal.fire({
        title: '¿Estás absolutamente seguro?',
        html: `
            <p>Estás a punto de <strong>INVALIDAR</strong> el DTE:</p>
            <p class="text-danger"><strong>${dteSeleccionado.numero_control}</strong></p>
            <p><strong>Tipo:</strong> ${tipoTexto}</p>
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
        const response = await fetch(`${API_BASE_URL}/dte/${dteId}/invalidar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({
                tipo_invalidacion: parseInt(tipoInvalidacion),
                motivo: motivoDetalle
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