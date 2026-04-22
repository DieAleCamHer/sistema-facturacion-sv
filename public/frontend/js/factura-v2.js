/**
 * Factura V2 - Con cliente al vuelo y catálogos
 */

let productosSeleccionados = [];
let clientes = [];
let productos = [];
let catalogos = {};

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
    await cargarCatalogos();
    await cargarClientes();
    await cargarProductos();
    configurarEventos();
});

// Cargar catálogos de Hacienda
async function cargarCatalogos() {
    try {
        const response = await fetch('/sistema-facturacion-php/public/index.php/api/catalogos', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const data = await response.json();
        catalogos = data.data;

        // Poblar selects de catálogos
        poblarSelect('cliente_tipo_doc', catalogos.tipo_documento);
        poblarSelect('condicion_operacion', catalogos.condicion_operacion);
        poblarSelect('forma_pago', catalogos.forma_pago);

    } catch (error) {
        console.error('Error cargando catálogos:', error);
    }
}

// Poblar select con datos de catálogo
function poblarSelect(selectId, datos) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = '<option value="">Seleccione...</option>';
    datos.forEach(item => {
        const option = document.createElement('option');
        option.value = item.codigo;
        option.textContent = item.valor;
        select.appendChild(option);
    });
}

// Cargar clientes
async function cargarClientes() {
    try {
        const response = await ClientesAPI.listar();
        clientes = response.data;

        const select = document.getElementById('cliente_id');
        select.innerHTML = '<option value="">Sin cliente (null)</option>';

        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = `${cliente.nombre} - ${cliente.num_documento}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando clientes:', error);
    }
}

// Cargar productos
async function cargarProductos() {
    try {
        const response = await ProductosAPI.listar();
        productos = response.data;

        const select = document.getElementById('producto_id');
        select.innerHTML = '<option value="">Seleccione un producto...</option>';

        productos.forEach(producto => {
            const option = document.createElement('option');
            option.value = producto.id;
            option.textContent = `${producto.codigo} - ${producto.descripcion} ($${producto.precio})`;
            option.dataset.stock = producto.stock;
            option.dataset.precio = producto.precio;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}

// Toggle tipo de cliente
function toggleTipoCliente() {
    const esExistente = document.getElementById('clienteExistente').checked;
    document.getElementById('seccionClienteExistente').style.display = esExistente ? 'block' : 'none';
    document.getElementById('seccionClienteNuevo').style.display = esExistente ? 'none' : 'block';
}

// Configurar eventos
function configurarEventos() {
    // Mostrar stock al seleccionar producto
    document.getElementById('producto_id').addEventListener('change', function() {
        const stock = this.options[this.selectedIndex]?.dataset.stock || '0';
        document.getElementById('stock_disponible').value = stock;
    });

    // Validar cantidad (solo enteros)
    document.getElementById('cantidad').addEventListener('input', function() {
        if (this.value.includes('.')) {
            this.value = Math.floor(this.value);
            Swal.fire('Aviso', 'La cantidad debe ser un número entero', 'info');
        }
    });

    // Agregar producto
    document.getElementById('btnAgregarProducto').addEventListener('click', agregarProducto);

    // Crear DTE
    document.getElementById('btnCrearDTE').addEventListener('click', crearDTE);
}

// Agregar producto a la tabla
function agregarProducto() {
    const productoId = parseInt(document.getElementById('producto_id').value);
    const cantidad = parseInt(document.getElementById('cantidad').value);

    if (!productoId || !cantidad || cantidad <= 0) {
        Swal.fire('Error', 'Seleccione un producto y cantidad válida', 'warning');
        return;
    }

    // Validar que sea entero
    if (cantidad % 1 !== 0) {
        Swal.fire('Error', 'La cantidad debe ser un número entero (sin decimales)', 'error');
        return;
    }

    const producto = productos.find(p => p.id === productoId);
    if (!producto) return;

    // Verificar stock
    if (cantidad > producto.stock) {
        Swal.fire('Error', `Stock insuficiente. Disponible: ${producto.stock}`, 'error');
        return;
    }

    // Verificar si ya existe
    const existe = productosSeleccionados.find(p => p.producto_id === productoId);
    if (existe) {
        Swal.fire('Aviso', 'Este producto ya fue agregado', 'info');
        return;
    }

    productosSeleccionados.push({
        producto_id: productoId,
        codigo: producto.codigo,
        descripcion: producto.descripcion,
        cantidad: cantidad,
        precio_unitario: parseFloat(producto.precio)
    });

    actualizarTablaProductos();

    // Limpiar
    document.getElementById('producto_id').value = '';
    document.getElementById('cantidad').value = '1';
    document.getElementById('stock_disponible').value = '';
}

// Eliminar producto
function eliminarProducto(index) {
    productosSeleccionados.splice(index, 1);
    actualizarTablaProductos();
}

// Actualizar tabla
function actualizarTablaProductos() {
    const tbody = document.getElementById('tablaProductosBody');
    tbody.innerHTML = '';

    let subtotal = 0;

    if (productosSeleccionados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay productos agregados</td></tr>';
        document.getElementById('subtotal').textContent = '$0.00';
        document.getElementById('iva').textContent = '$0.00';
        document.getElementById('total').textContent = '$0.00';
        return;
    }

    productosSeleccionados.forEach((prod, index) => {
        const total = prod.cantidad * prod.precio_unitario;
        subtotal += total;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${prod.codigo}</td>
            <td>${prod.descripcion}</td>
            <td>${prod.cantidad}</td>
            <td>${formatearMoneda(prod.precio_unitario)}</td>
            <td>${formatearMoneda(total)}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="eliminarProducto(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    const iva = subtotal * 0.13;
    const total = subtotal + iva;

    document.getElementById('subtotal').textContent = formatearMoneda(subtotal);
    document.getElementById('iva').textContent = formatearMoneda(iva);
    document.getElementById('total').textContent = formatearMoneda(total);
}

// Crear DTE
async function crearDTE() {
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

    // Preparar datos del cliente
    let datosCliente = {};
    const esClienteExistente = document.getElementById('clienteExistente').checked;

    if (esClienteExistente) {
        const clienteId = document.getElementById('cliente_id').value;
        if (clienteId) {
            datosCliente.cliente_id = parseInt(clienteId);
        } else {
            datosCliente.cliente_id = null; // Factura sin receptor
        }
    } else {
        // Cliente nuevo (al vuelo)
        const nombre = document.getElementById('cliente_nombre').value.trim();
        const tipoDoc = document.getElementById('cliente_tipo_doc').value;
        const numDoc = document.getElementById('cliente_num_doc').value.trim();

        if (!nombre || !tipoDoc || !numDoc) {
            Swal.fire('Error', 'Complete los datos del cliente', 'warning');
            return;
        }

        datosCliente.cliente_nuevo = {
            nombre: nombre,
            tipo_documento: tipoDoc,
            num_documento: numDoc,
            email: document.getElementById('cliente_email').value.trim() || null,
            telefono: document.getElementById('cliente_telefono').value.trim() || null,
            direccion: document.getElementById('cliente_direccion').value.trim() || null
        };

        datosCliente.guardar_cliente = document.getElementById('guardarCliente').checked;
    }

    // Confirmación
    const confirmacion = await Swal.fire({
        title: '¿Estás seguro?',
        html: '¿Deseas crear esta <strong>Factura</strong>?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#0d6efd',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, crear',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    // Preparar datos
    const datos = {
        tipo_dte: '01',
        ...datosCliente,
        condicion_operacion: document.getElementById('condicion_operacion').value,
        forma_pago: document.getElementById('forma_pago').value,
        productos: productosSeleccionados
    };

    showLoading('Creando Factura...');

    try {
        const response = await DTEsAPI.crear(datos);
        hideLoading();

        if (response.success) {
            await Swal.fire({
                icon: 'success',
                title: '¡Factura Creada!',
                html: `
                    <p><strong>Número de Control:</strong> ${response.data.numero_control}</p>
                    <p><strong>Total:</strong> ${formatearMoneda(response.data.total)}</p>
                `,
                confirmButtonText: 'Ver DTEs'
            });

            window.location.href = 'lista-dtes.html';
        }
    } catch (error) {
        hideLoading();
        Swal.fire('Error', error.message || 'No se pudo crear la Factura', 'error');
    }
}
