/**
 * Gestión de Productos
 */

let productos = [];
let productoEditando = null;

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
});

// Cargar productos
async function cargarProductos() {
    try {
        const response = await ProductosAPI.listar();
        productos = response.data;
        renderizarTabla();
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'No se pudieron cargar los productos', 'error');
    }
}

// Renderizar tabla
function renderizarTabla() {
    const tbody = document.querySelector('tbody');
    tbody.innerHTML = '';

    if (productos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay productos registrados</td></tr>';
        return;
    }

    productos.forEach(producto => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${producto.codigo}</td>
            <td>${producto.descripcion}</td>
            <td class="text-end">$${parseFloat(producto.precio).toFixed(2)}</td>
            <td class="text-center">${producto.stock}</td>
            <td>${getTipoItemNombre(producto.tipo_item)}</td>
            <td>${getUnidadMedidaNombre(producto.unidad_medida)}</td>
            <td>${getTributoNombre(producto.tributo)}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-warning" onclick="abrirModalEditar(${producto.id})" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-danger" onclick="eliminar(${producto.id})" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Abrir modal nuevo
function abrirModalNuevo() {
    productoEditando = null;
    document.getElementById('modalProductoLabel').textContent = 'Nuevo Producto';
    document.getElementById('formProducto').reset();
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('modalProducto'));
    modal.show();
}

// Abrir modal editar
function abrirModalEditar(id) {
    productoEditando = productos.find(p => p.id === id);
    
    if (!productoEditando) {
        Swal.fire('Error', 'Producto no encontrado', 'error');
        return;
    }

    document.getElementById('modalProductoLabel').textContent = 'Editar Producto';
    
    // Llenar campos
    const codigoInput = document.getElementById('codigo');
    const descripcionInput = document.getElementById('descripcion');
    const precioInput = document.getElementById('precio');
    const stockInput = document.getElementById('stock');
    const tipoItemInput = document.getElementById('tipo_item');
    const unidadMedidaInput = document.getElementById('unidad_medida');
    const tributoInput = document.getElementById('tributo');

    if (codigoInput) codigoInput.value = productoEditando.codigo || '';
    if (descripcionInput) descripcionInput.value = productoEditando.descripcion || '';
    if (precioInput) precioInput.value = productoEditando.precio || '';
    if (stockInput) stockInput.value = productoEditando.stock || 0;
    if (tipoItemInput) tipoItemInput.value = productoEditando.tipo_item || '1';
    if (unidadMedidaInput) unidadMedidaInput.value = productoEditando.unidad_medida || '59';
    if (tributoInput) tributoInput.value = productoEditando.tributo || '20';
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('modalProducto'));
    modal.show();
}

// Guardar (crear o actualizar)
async function guardar() {
    const datos = {
        codigo: document.getElementById('codigo')?.value.trim() || '',
        descripcion: document.getElementById('descripcion')?.value.trim() || '',
        precio: parseFloat(document.getElementById('precio')?.value || 0),
        stock: parseInt(document.getElementById('stock')?.value || 0),
        tipo_item: parseInt(document.getElementById('tipo_item')?.value || 1),
        unidad_medida: document.getElementById('unidad_medida')?.value || '59',
        tributo: document.getElementById('tributo')?.value || '20'
    };

    // Validaciones
    if (!datos.codigo) {
        Swal.fire('Error', 'El código es requerido', 'warning');
        return;
    }

    if (!datos.descripcion) {
        Swal.fire('Error', 'La descripción es requerida', 'warning');
        return;
    }

    if (datos.precio <= 0) {
        Swal.fire('Error', 'El precio debe ser mayor a 0', 'warning');
        return;
    }

    showLoading();

    try {
        if (productoEditando) {
            // Actualizar
            await ProductosAPI.actualizar(productoEditando.id, datos);
            Swal.fire('¡Actualizado!', 'Producto actualizado exitosamente', 'success');
        } else {
            // Crear
            await ProductosAPI.crear(datos);
            Swal.fire('¡Creado!', 'Producto creado exitosamente', 'success');
        }

        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalProducto'));
        if (modal) modal.hide();

        // Recargar
        cargarProductos();

    } catch (error) {
        hideLoading();
        Swal.fire('Error', error.message, 'error');
    }
}

// Eliminar
async function eliminar(id) {
    const confirmacion = await Swal.fire({
        title: '¿Estás seguro?',
        text: 'No podrás revertir esta acción',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    showLoading();

    try {
        await ProductosAPI.eliminar(id);
        hideLoading();
        Swal.fire('¡Eliminado!', 'Producto eliminado exitosamente', 'success');
        cargarProductos();
    } catch (error) {
        hideLoading();
        Swal.fire('Error', error.message, 'error');
    }
}

// Helpers
function getTipoItemNombre(tipo) {
    const tipos = {
        '1': 'Bien',
        '2': 'Servicio',
        '3': 'Bien y Servicio',
        '4': 'Otros Tributos'
    };
    return tipos[tipo] || 'Bien';
}

function getUnidadMedidaNombre(unidad) {
    const unidades = {
        '59': 'Unidad',
        '99': 'Caja',
        '58': 'Docena',
        '57': 'Kilogramo',
        '49': 'Litro'
    };
    return unidades[unidad] || unidad;
}

function getTributoNombre(tributo) {
    const tributos = {
        '20': 'IVA'
    };
    return tributos[tributo] || tributo;
}