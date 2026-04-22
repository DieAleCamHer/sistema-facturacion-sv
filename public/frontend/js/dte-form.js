/**
 * Lógica compartida para formularios de DTEs
 * (Factura, CCF, Nota de Crédito)
 */

let productosSeleccionados = [];
let clientes = [];
let productos = [];

/**
 * Inicializar formulario de DTE
 */
async function inicializarFormularioDTE() {
    await cargarClientes();
    await cargarProductos();
    configurarEventos();
}

/**
 * Cargar clientes desde la API
 */
async function cargarClientes() {
    try {
        const response = await ClientesAPI.listar();
        clientes = response.data;

        const selectCliente = document.getElementById('cliente_id');
        selectCliente.innerHTML = '<option value="">Seleccione un cliente...</option>';

        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = `${cliente.nombre} - ${cliente.num_documento}`;
            selectCliente.appendChild(option);
        });
    } catch (error) {
        Swal.fire('Error', 'No se pudieron cargar los clientes', 'error');
    }
}

/**
 * Cargar productos desde la API
 */
async function cargarProductos() {
    try {
        const response = await ProductosAPI.listar();
        productos = response.data;

        const selectProducto = document.getElementById('producto_id');
        selectProducto.innerHTML = '<option value="">Seleccione un producto...</option>';

        productos.forEach(producto => {
            const option = document.createElement('option');
            option.value = producto.id;
            option.textContent = `${producto.codigo} - ${producto.descripcion} ($${producto.precio})`;
            selectProducto.appendChild(option);
        });
    } catch (error) {
        Swal.fire('Error', 'No se pudieron cargar los productos', 'error');
    }
}

/**
 * Configurar eventos del formulario
 */
function configurarEventos() {
    // Botón agregar producto
    document.getElementById('btnAgregarProducto').addEventListener('click', agregarProducto);

    // Botón crear DTE
    document.getElementById('btnCrearDTE').addEventListener('click', crearDTE);
}

/**
 * Agregar producto a la tabla
 */
function agregarProducto() {
    const productoId = parseInt(document.getElementById('producto_id').value);
    const cantidad = parseFloat(document.getElementById('cantidad').value);

    if (!productoId || !cantidad || cantidad <= 0) {
        Swal.fire('Error', 'Seleccione un producto y una cantidad válida', 'warning');
        return;
    }

    // Buscar producto
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return;

    // Verificar si ya existe
    const existe = productosSeleccionados.find(p => p.producto_id === productoId);
    if (existe) {
        Swal.fire('Aviso', 'Este producto ya fue agregado', 'info');
        return;
    }

    // Agregar a la lista
    productosSeleccionados.push({
        producto_id: productoId,
        codigo: producto.codigo,
        descripcion: producto.descripcion,
        cantidad: cantidad,
        precio_unitario: parseFloat(producto.precio)
    });

    // Actualizar tabla
    actualizarTablaProductos();

    // Limpiar campos
    document.getElementById('producto_id').value = '';
    document.getElementById('cantidad').value = '1';
}

/**
 * Eliminar producto de la tabla
 */
function eliminarProducto(index) {
    productosSeleccionados.splice(index, 1);
    actualizarTablaProductos();
}

/**
 * Actualizar tabla de productos
 */
function actualizarTablaProductos() {
    const tbody = document.getElementById('tablaProductosBody');
    tbody.innerHTML = '';

    let subtotal = 0;

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

    // Calcular totales
    const iva = subtotal * 0.13;
    const total = subtotal + iva;

    document.getElementById('subtotal').textContent = formatearMoneda(subtotal);
    document.getElementById('iva').textContent = formatearMoneda(iva);
    document.getElementById('total').textContent = formatearMoneda(total);
}

/**
 * Crear DTE (con confirmación)
 */
async function crearDTE() {
    const clienteId = parseInt(document.getElementById('cliente_id').value);
    const tipoDTE = document.getElementById('tipo_dte').value;

    // Validaciones
    if (!clienteId) {
        Swal.fire('Error', 'Debe seleccionar un cliente', 'warning');
        return;
    }

    if (productosSeleccionados.length === 0) {
        Swal.fire('Error', 'Debe agregar al menos un producto', 'warning');
        return;
    }

    // Determinar nombre del documento
    const nombreDocumento = {
        '01': 'Factura',
        '03': 'Comprobante de Crédito Fiscal',
        '05': 'Nota de Crédito'
    }[tipoDTE];

    // ⭐ CONFIRMACIÓN - Requisito del profesor
    const confirmacion = await Swal.fire({
        title: '¿Estás seguro?',
        html: `¿Deseas crear esta <strong>${nombreDocumento}</strong>?<br>
               <small class="text-muted">Esta acción generará un DTE simulado</small>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#0d6efd',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, crear',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) {
        return;
    }

    // Preparar datos
    const datos = {
        tipo_dte: tipoDTE,
        cliente_id: clienteId,
        productos: productosSeleccionados
    };

    // Enviar a la API
    showLoading('Creando DTE...');

    try {
        const response = await DTEsAPI.crear(datos);

        hideLoading();

        if (response.success) {
            await Swal.fire({
                icon: 'success',
                title: '¡DTE Creado!',
                html: `
                    <p><strong>Número de Control:</strong> ${response.data.numero_control}</p>
                    <p><strong>Código de Generación:</strong><br><small>${response.data.codigo_generacion}</small></p>
                    <p><strong>Total:</strong> ${formatearMoneda(response.data.total)}</p>
                `,
                confirmButtonText: 'Ver DTEs'
            });

            // Redirigir a lista de DTEs
            window.location.href = 'lista-dtes.html';
        }
    } catch (error) {
        hideLoading();
        Swal.fire('Error', error.message || 'No se pudo crear el DTE', 'error');
    }
}

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', inicializarFormularioDTE);
