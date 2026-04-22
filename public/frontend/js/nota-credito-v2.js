/**
 * Nota de Crédito - Sistema de Facturación SV
 */

let dtesDisponibles = [];
let productosOriginales = [];
let productosSeleccionados = [];
let catalogos = {};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    cargarDTEs();
    cargarCatalogos();
    configurarEventos();
});

// Cargar DTEs disponibles para referencia
async function cargarDTEs() {
    try {
        const response = await DTEsAPI.listar();
        dtesDisponibles = response.data.filter(dte => 
            dte.estado === 'procesado' && (dte.tipo_dte === '01' || dte.tipo_dte === '03')
        );
        
        const select = document.getElementById('dte_relacionado_id');
        select.innerHTML = '<option value="">Seleccione DTE a referenciar...</option>';
        
        dtesDisponibles.forEach(dte => {
            const tipoNombre = dte.tipo_dte === '01' ? 'Factura' : 'CCF';
            const option = document.createElement('option');
            option.value = dte.id;
            option.textContent = `${tipoNombre} - ${dte.numero_control} - $${parseFloat(dte.total).toFixed(2)}`;
            option.dataset.clienteId = dte.cliente_id;
            option.dataset.clienteNombre = dte.cliente_nombre || 'Sin cliente';
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando DTEs:', error);
        Swal.fire('Error', 'No se pudieron cargar los DTEs', 'error');
    }
}

// Cargar catálogos
async function cargarCatalogos() {
    try {
        const response = await CatalogosAPI.obtenerTodos();
        catalogos = response.data;
        
        poblarSelect('condicion_operacion', catalogos.condicion_operacion);
        poblarSelect('forma_pago', catalogos.forma_pago);
    } catch (error) {
        console.error('Error cargando catálogos:', error);
    }
}

function poblarSelect(selectId, datos) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Seleccione...</option>';
    
    if (!datos) return;
    
    datos.forEach(item => {
        const option = document.createElement('option');
        option.value = item.codigo;
        option.textContent = item.valor;
        select.appendChild(option);
    });
}

// Configurar eventos
function configurarEventos() {
    // Al seleccionar DTE, mostrar info del cliente
    document.getElementById('dte_relacionado_id').addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const clienteNombre = selectedOption.dataset.clienteNombre || '';
        
        const infoCliente = document.getElementById('info_cliente');
        if (this.value) {
            infoCliente.textContent = `Cliente: ${clienteNombre}`;
            infoCliente.classList.remove('d-none');
        } else {
            infoCliente.classList.add('d-none');
            limpiarProductos();
        }
    });
    
    // Cargar productos del DTE
    document.getElementById('btnCargarProductos').addEventListener('click', cargarProductosDTE);
    
    // Crear NC
    document.getElementById('btnCrearNC').addEventListener('click', crearNotaCredito);
}

// Cargar productos del DTE seleccionado
async function cargarProductosDTE() {
    const dteId = document.getElementById('dte_relacionado_id').value;
    
    if (!dteId) {
        Swal.fire('Error', 'Seleccione un DTE primero', 'warning');
        return;
    }
    
    showLoading('Cargando productos...');
    
    try {
        const response = await DTEsAPI.obtener(dteId);
        const dte = response.data;
        
        productosOriginales = dte.detalles || [];
        
        if (productosOriginales.length === 0) {
            hideLoading();
            Swal.fire('Advertencia', 'Este DTE no tiene productos registrados', 'warning');
            return;
        }
        
        renderizarTablaProductos();
        hideLoading();
        
        Swal.fire({
            icon: 'success',
            title: 'Productos cargados',
            text: `Se cargaron ${productosOriginales.length} productos`,
            timer: 1500,
            showConfirmButton: false
        });
        
    } catch (error) {
        hideLoading();
        console.error('Error:', error);
        Swal.fire('Error', 'No se pudieron cargar los productos del DTE', 'error');
    }
}

// Renderizar tabla de productos
function renderizarTablaProductos() {
    const tbody = document.getElementById('tablaProductosBody');
    tbody.innerHTML = '';
    
    if (productosOriginales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay productos cargados</td></tr>';
        return;
    }
    
    productosOriginales.forEach((prod, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <input type="checkbox" class="form-check-input" id="check_${index}" 
                       onchange="toggleProducto(${index})">
            </td>
            <td>${prod.codigo || prod.producto_id}</td>
            <td>${prod.descripcion}</td>
            <td>${prod.cantidad}</td>
            <td class="text-end">$${parseFloat(prod.precio_unitario).toFixed(2)}</td>
            <td>
                <input type="number" class="form-control form-control-sm" 
                       id="cantidad_${index}" 
                       min="1" 
                       max="${prod.cantidad}" 
                       value="${prod.cantidad}"
                       step="1"
                       disabled>
            </td>
            <td class="text-end" id="subtotal_${index}">
                $${parseFloat(prod.subtotal).toFixed(2)}
            </td>
        `;
        tbody.appendChild(tr);
        
        // Evento para recalcular subtotal al cambiar cantidad
        document.getElementById(`cantidad_${index}`).addEventListener('input', function() {
            this.value = Math.floor(this.value);
            recalcularSubtotal(index);
        });
    });
}

// Toggle producto seleccionado
function toggleProducto(index) {
    const checkbox = document.getElementById(`check_${index}`);
    const cantidadInput = document.getElementById(`cantidad_${index}`);
    
    cantidadInput.disabled = !checkbox.checked;
    
    if (!checkbox.checked) {
        cantidadInput.value = productosOriginales[index].cantidad;
        recalcularSubtotal(index);
    }
    
    calcularTotales();
}

// Recalcular subtotal de un producto
function recalcularSubtotal(index) {
    const cantidad = parseInt(document.getElementById(`cantidad_${index}`).value) || 0;
    const precioUnitario = parseFloat(productosOriginales[index].precio_unitario);
    const subtotal = cantidad * precioUnitario;
    
    document.getElementById(`subtotal_${index}`).textContent = `$${subtotal.toFixed(2)}`;
    calcularTotales();
}

// Calcular totales
function calcularTotales() {
    let subtotal = 0;
    
    productosOriginales.forEach((prod, index) => {
        const checkbox = document.getElementById(`check_${index}`);
        if (checkbox && checkbox.checked) {
            const cantidad = parseInt(document.getElementById(`cantidad_${index}`).value) || 0;
            const precioUnitario = parseFloat(prod.precio_unitario);
            subtotal += cantidad * precioUnitario;
        }
    });
    
    const iva = subtotal * 0.13;
    const total = subtotal + iva;
    
    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('iva').textContent = `$${iva.toFixed(2)}`;
    document.getElementById('total').textContent = `$${total.toFixed(2)}`;
}

// Limpiar productos
function limpiarProductos() {
    productosOriginales = [];
    productosSeleccionados = [];
    document.getElementById('tablaProductosBody').innerHTML = 
        '<tr><td colspan="7" class="text-center text-muted">Seleccione un DTE y haga clic en "Cargar Productos"</td></tr>';
    
    document.getElementById('subtotal').textContent = '$0.00';
    document.getElementById('iva').textContent = '$0.00';
    document.getElementById('total').textContent = '$0.00';
}

// Crear Nota de Crédito
async function crearNotaCredito() {
    // Validar DTE relacionado
    const dteRelacionadoId = document.getElementById('dte_relacionado_id').value;
    if (!dteRelacionadoId) {
        Swal.fire('Error', 'Debe seleccionar un DTE', 'warning');
        return;
    }
    
    // Obtener productos seleccionados
    productosSeleccionados = [];
    productosOriginales.forEach((prod, index) => {
        const checkbox = document.getElementById(`check_${index}`);
        if (checkbox && checkbox.checked) {
            const cantidad = parseInt(document.getElementById(`cantidad_${index}`).value);
            productosSeleccionados.push({
                producto_id: prod.producto_id,
                cantidad: cantidad,
                precio: parseFloat(prod.precio_unitario)
            });
        }
    });
    
    if (productosSeleccionados.length === 0) {
        Swal.fire('Error', 'Debe seleccionar al menos un producto', 'warning');
        return;
    }
    
    // Validar motivo
    const motivo = document.getElementById('motivo').value.trim();
    if (!motivo) {
        Swal.fire('Error', 'Debe ingresar el motivo de la Nota de Crédito', 'warning');
        return;
    }
    
    // Validar condiciones
    if (!document.getElementById('condicion_operacion').value) {
        Swal.fire('Error', 'Seleccione condición de operación', 'warning');
        return;
    }
    
    if (!document.getElementById('forma_pago').value) {
        Swal.fire('Error', 'Seleccione forma de pago', 'warning');
        return;
    }
    
    // Obtener cliente del DTE original
    const selectedOption = document.getElementById('dte_relacionado_id').options[document.getElementById('dte_relacionado_id').selectedIndex];
    const clienteId = parseInt(selectedOption.dataset.clienteId);
    
    // Confirmación
    const confirmacion = await Swal.fire({
        title: '¿Estás seguro?',
        html: `¿Deseas crear esta <strong>Nota de Crédito</strong>?<br><small>Motivo: ${motivo}</small>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#ffc107',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, crear',
        cancelButtonText: 'Cancelar'
    });
    
    if (!confirmacion.isConfirmed) return;
    
    // Preparar datos
    const datos = {
        tipo_dte: '05',
        cliente_id: clienteId,
        dte_relacionado_id: parseInt(dteRelacionadoId),
        condicion_operacion: document.getElementById('condicion_operacion').value,
        forma_pago: document.getElementById('forma_pago').value,
        productos: productosSeleccionados,
        motivo: motivo
    };
    
    showLoading('Creando Nota de Crédito...');
    
    try {
        const response = await DTEsAPI.crear(datos);
        hideLoading();
        
        if (response.success) {
            await Swal.fire({
                icon: 'success',
                title: '¡Nota de Crédito Creada!',
                html: `
                    <p><strong>Número de Control:</strong> ${response.data.numero_control}</p>
                    <p><strong>Total:</strong> $${response.data.total.toFixed(2)}</p>
                    <p><small>Referencia: DTE #${dteRelacionadoId}</small></p>
                `,
                confirmButtonText: 'Ver DTEs'
            });
            
            window.location.href = 'lista-dtes.html';
        }
    } catch (error) {
        hideLoading();
        console.error('Error completo:', error);
        Swal.fire('Error', error.message || 'Error al crear la Nota de Crédito', 'error');
    }
}