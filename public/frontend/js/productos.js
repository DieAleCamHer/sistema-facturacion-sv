/**
 * Gestión de Productos
 */

let modalProducto;
let productoEditando = null;

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    modalProducto = new bootstrap.Modal(document.getElementById('modalProducto'));
    cargarProductos();
});

// Cargar lista de productos
async function cargarProductos() {
    const tbody = document.getElementById('tablaProductos');
    tbody.innerHTML = '<tr><td colspan="8" class="text-center"><div class="spinner-border text-primary"></div></td></tr>';

    try {
        const response = await ProductosAPI.listar();
        const productos = response.data;

        if (productos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay productos registrados</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        productos.forEach(producto => {
            const tipoTexto = producto.tipo_item === '1' ? 'Bien' : 'Servicio';
            const stockTexto = producto.tipo_item === '2' ? 'N/A' : producto.stock;
            const unidadTexto = {
                '59': 'Unidad',
                '99': 'Caja',
                '58': 'Docena',
                '57': 'Kg',
                '49': 'Litro'
            }[producto.unidad_medida] || producto.unidad_medida;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${producto.codigo}</td>
                <td>${producto.descripcion}</td>
                <td>$${parseFloat(producto.precio).toFixed(2)}</td>
                <td>${stockTexto}</td>
                <td>${tipoTexto}</td>
                <td>${unidadTexto}</td>
                <td>IVA 13%</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-warning" onclick="editarProducto(${producto.id})" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-danger" onclick="eliminarProducto(${producto.id}, '${producto.descripcion}')" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}

// Abrir modal para nuevo producto
function abrirModalNuevo() {
    productoEditando = null;
    document.getElementById('modalTitulo').textContent = 'Nuevo Producto';
    document.getElementById('formProducto').reset();
    document.getElementById('productoId').value = '';
    document.getElementById('tipoItem').value = '1';
    toggleStock();
    modalProducto.show();
}

// Toggle stock según tipo
function toggleStock() {
    const tipoItem = document.getElementById('tipoItem').value;
    const divStock = document.getElementById('divStock');
    const inputStock = document.getElementById('stock');
    
    if (tipoItem === '2') {
        divStock.style.display = 'none';
        inputStock.value = 0;
    } else {
        divStock.style.display = 'block';
    }
}

// Editar producto
async function editarProducto(id) {
    try {
        const response = await ProductosAPI.obtener(id);
        const producto = response.data;

        productoEditando = id;
        document.getElementById('modalTitulo').textContent = 'Editar Producto';
        document.getElementById('productoId').value = producto.id;
        document.getElementById('codigo').value = producto.codigo;
        document.getElementById('descripcion').value = producto.descripcion;
        document.getElementById('precio').value = producto.precio;
        document.getElementById('tipoItem').value = producto.tipo_item;
        document.getElementById('stock').value = producto.stock || 0;
        document.getElementById('unidadMedida').value = producto.unidad_medida;
        document.getElementById('tributo').value = producto.tributo;

        toggleStock();
        modalProducto.show();

    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
}

// Guardar producto
async function guardarProducto() {
    const form = document.getElementById('formProducto');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const tipoItem = document.getElementById('tipoItem').value;
    const stock = parseInt(document.getElementById('stock').value);

    if (tipoItem === '2' && stock > 0) {
        Swal.fire('Error', 'Los servicios no pueden tener stock', 'error');
        document.getElementById('stock').value = 0;
        return;
    }

    const datos = {
        codigo: document.getElementById('codigo').value.trim(),
        descripcion: document.getElementById('descripcion').value.trim(),
        precio: parseFloat(document.getElementById('precio').value),
        tipo_item: tipoItem,
        stock: tipoItem === '2' ? 0 : stock,
        unidad_medida: document.getElementById('unidadMedida').value,
        tributo: document.getElementById('tributo').value
    };

    try {
        if (productoEditando) {
            await ProductosAPI.actualizar(productoEditando, datos);
            Swal.fire('¡Actualizado!', 'Producto actualizado exitosamente', 'success');
        } else {
            await ProductosAPI.crear(datos);
            Swal.fire('¡Creado!', 'Producto creado exitosamente', 'success');
        }

        modalProducto.hide();
        cargarProductos();

    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
}

// Eliminar producto
async function eliminarProducto(id, descripcion) {
    const confirmacion = await Swal.fire({
        title: '¿Eliminar producto?',
        html: `¿Estás seguro de eliminar <strong>${descripcion}</strong>?<br><small class="text-muted">Esta acción no se puede deshacer</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    try {
        await ProductosAPI.eliminar(id);
        Swal.fire('¡Eliminado!', 'Producto eliminado exitosamente', 'success');
        cargarProductos();

    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
}

function logout() {
    AuthAPI.logout();
}