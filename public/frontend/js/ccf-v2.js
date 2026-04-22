/**
 * CCF - Comprobante de Crédito Fiscal
 */

let productosDisponibles = [];
let productosSeleccionados = [];
let catalogos = {};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    cargarClientes();
    cargarProductos();
    cargarCatalogos();
    configurarEventos();
});

// Cargar clientes
async function cargarClientes() {
    try {
        const response = await ClientesAPI.listar();
        const select = document.getElementById('cliente_id');
        select.innerHTML = '<option value="">Seleccione un cliente...</option>';
        
        response.data.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = `${cliente.nombre} - ${cliente.num_documento}`;
            option.dataset.nrc = cliente.nrc || '';
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando clientes:', error);
        Swal.fire('Error', 'No se pudieron cargar los clientes', 'error');
    }
}

// Cargar productos
async function cargarProductos() {
    try {
        const response = await ProductosAPI.listar();
        productosDisponibles = response.data;
        
        const select = document.getElementById('producto_id');
        select.innerHTML = '<option value="">Seleccione un producto...</option>';
        
        productosDisponibles.forEach(producto => {
            const option = document.createElement('option');
            option.value = producto.id;
            option.textContent = `${producto.codigo} - ${producto.descripcion} ($${producto.precio})`;
            option.dataset.codigo = producto.codigo;
            option.dataset.descripcion = producto.descripcion;
            option.dataset.precio = producto.precio;
            option.dataset.stock = producto.stock;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}

// Cargar catálogos
async function cargarCatalogos() {
    try {
        const response = await CatalogosAPI.obtenerTodos();
        catalogos = response.data;
        
        // Poblar selects
        poblarSelect('condicion_operacion', catalogos.condicion_operacion);
        poblarSelect('forma_pago', catalogos.forma_pago);
    } catch (error) {
        console.error('Error cargando catálogos:', error);
    }
}

function poblarSelect(selectId, datos) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Seleccione...</option>';
    
    datos.forEach(item => {
        const option = document.createElement('option');
        option.value = item.codigo;
        option.textContent = item.valor;
        select.appendChild(option);
    });
}

// Configurar eventos
function configurarEventos() {
    // Al seleccionar cliente, autocompletar NRC
    document.getElementById('cliente_id').addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const nrc = selectedOption.dataset.nrc || '';
        document.getElementById('nrc').value = nrc;
        
        if (!nrc) {
            Swal.fire('Advertencia', 'Este cliente no tiene NRC registrado', 'warning');
        }
    });
    
    // Al seleccionar producto, mostrar stock
    document.getElementById('producto_id').addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const stock = selectedOption.dataset.stock || 0;
        document.getElementById('stock_disponible').value = stock;
    });
    
    // Agregar producto
    document.getElementById('btnAgregarProducto').addEventListener('click', agregarProducto);
    
    // Crear CCF
    document.getElementById('btnCrearDTE').addEventListener('click', crearCCF);
    
    // Validar cantidad solo enteros
    document.getElementById('cantidad').addEventListener('input', function() {
        this.value = Math.floor(this.value);
    });
}

// Agregar producto a la tabla
function agregarProducto() {
    const productoId = document.getElementById('producto_id').value;
    const cantidad = parseInt(document.getElementById('cantidad').value);
    
    if (!productoId) {
        Swal.fire('Error', 'Seleccione un producto', 'warning');
        return;
    }
    
    if (!cantidad || cantidad < 1) {
        Swal.fire('Error', 'Ingrese una cantidad válida', 'warning');
        return;
    }
    
    const selectedOption = document.getElementById('producto_id').options[document.getElementById('producto_id').selectedIndex];
    const stock = parseInt(selectedOption.dataset.stock);
    
    if (cantidad > stock) {
        Swal.fire('Error', `Stock insuficiente. Disponible: ${stock}`, 'error');
        return;
    }
    
    const producto = {
        producto_id: parseInt(productoId),
        codigo: selectedOption.dataset.codigo,
        descripcion: selectedOption.dataset.descripcion,
        cantidad: cantidad,
        precio: parseFloat(selectedOption.dataset.precio),
        subtotal: cantidad * parseFloat(selectedOption.dataset.precio)
    };
    
    productosSeleccionados.push(producto);
    renderizarTablaProductos();
    calcularTotales();
    
    // Limpiar campos
    document.getElementById('producto_id').value = '';
    document.getElementById('cantidad').value = 1;
    document.getElementById('stock_disponible').value = '';
}

// Renderizar tabla de productos
function renderizarTablaProductos() {
    const tbody = document.getElementById('tablaProductosBody');
    tbody.innerHTML = '';
    
    if (productosSeleccionados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay productos agregados</td></tr>';
        return;
    }
    
    productosSeleccionados.forEach((prod, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${prod.codigo}</td>
            <td>${prod.descripcion}</td>
            <td>${prod.cantidad}</td>
            <td class="text-end">$${prod.precio.toFixed(2)}</td>
            <td class="text-end">$${prod.subtotal.toFixed(2)}</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="eliminarProducto(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Eliminar producto
function eliminarProducto(index) {
    productosSeleccionados.splice(index, 1);
    renderizarTablaProductos();
    calcularTotales();
}

// Calcular totales
function calcularTotales() {
    const subtotal = productosSeleccionados.reduce((sum, prod) => sum + prod.subtotal, 0);
    const iva = subtotal * 0.13;
    const total = subtotal + iva;
    
    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('iva').textContent = `$${iva.toFixed(2)}`;
    document.getElementById('total').textContent = `$${total.toFixed(2)}`;
}

// Crear CCF
async function crearCCF() {
    // Validar cliente OBLIGATORIO
    const clienteId = document.getElementById('cliente_id').value;
    if (!clienteId) {
        Swal.fire('Error', 'El cliente es OBLIGATORIO en el CCF', 'error');
        return;
    }
    
    // Validar NRC
    const nrc = document.getElementById('nrc').value.trim();
    if (!nrc) {
        Swal.fire('Error', 'El NRC es OBLIGATORIO en el CCF', 'error');
        return;
    }
    
    // Validar productos
    if (productosSeleccionados.length === 0) {
        Swal.fire('Error', 'Debe agregar al menos un producto', 'warning');
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
    
    // Confirmación
    const confirmacion = await Swal.fire({
        title: '¿Estás seguro?',
        html: '¿Deseas crear este <strong>CCF</strong>?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#198754',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, crear',
        cancelButtonText: 'Cancelar'
    });
    
    if (!confirmacion.isConfirmed) return;
    
    // Preparar datos
    const datos = {
        tipo_dte: '03',
        cliente_id: parseInt(clienteId),
        condicion_operacion: document.getElementById('condicion_operacion').value,
        forma_pago: document.getElementById('forma_pago').value,
        productos: productosSeleccionados
    };
    
    showLoading('Creando CCF...');
    
    try {
        const response = await DTEsAPI.crear(datos);
        hideLoading();
        
        if (response.success) {
            await Swal.fire({
                icon: 'success',
                title: '¡CCF Creado!',
                html: `
                    <p><strong>Número de Control:</strong> ${response.data.numero_control}</p>
                    <p><strong>Total:</strong> $${response.data.total.toFixed(2)}</p>
                `,
                confirmButtonText: 'Ver DTEs'
            });
            
            window.location.href = 'lista-dtes.html';
        }
    } catch (error) {
        hideLoading();
        Swal.fire('Error', error.message, 'error');
    }
}