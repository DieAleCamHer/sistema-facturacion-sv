/**
 * Gestión de Clientes
 */

let modalCliente;
let clienteEditando = null;

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    modalCliente = new bootstrap.Modal(document.getElementById('modalCliente'));
    cargarClientes();
});

// Cargar lista de clientes
async function cargarClientes() {
    const tbody = document.getElementById('tablaClientes');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner-border text-primary"></div></td></tr>';

    try {
        const response = await ClientesAPI.listar();
        const clientes = response.data;

        if (clientes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay clientes registrados</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        clientes.forEach(cliente => {
            const tipoDoc = {
                '13': 'DUI',
                '36': 'NIT',
                '37': 'Pasaporte',
                '2': 'Carnet Residente'
            }[cliente.tipo_documento] || cliente.tipo_documento;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${cliente.nombre}</td>
                <td>${tipoDoc}</td>
                <td>${cliente.num_documento}</td>
                <td>${cliente.nrc || '-'}</td>
                <td>${cliente.email || '-'}</td>
                <td>${cliente.telefono || '-'}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-warning" onclick="editarCliente(${cliente.id})" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-danger" onclick="eliminarCliente(${cliente.id}, '${cliente.nombre}')" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}

// Abrir modal para nuevo cliente
function abrirModalNuevo() {
    clienteEditando = null;
    document.getElementById('modalTitulo').textContent = 'Nuevo Cliente';
    document.getElementById('formCliente').reset();
    document.getElementById('clienteId').value = '';
    modalCliente.show();
}

// Editar cliente
async function editarCliente(id) {
    try {
        const response = await ClientesAPI.obtener(id);
        const cliente = response.data;

        clienteEditando = id;
        document.getElementById('modalTitulo').textContent = 'Editar Cliente';
        document.getElementById('clienteId').value = cliente.id;
        document.getElementById('nombre').value = cliente.nombre;
        document.getElementById('tipo_documento').value = cliente.tipo_documento;
        document.getElementById('num_documento').value = cliente.num_documento;
        document.getElementById('nrc').value = cliente.nrc || '';
        document.getElementById('email').value = cliente.email || '';
        document.getElementById('telefono').value = cliente.telefono || '';
        document.getElementById('direccion').value = cliente.direccion || '';
        document.getElementById('departamento').value = cliente.departamento || '';
        document.getElementById('municipio').value = cliente.municipio || '';
        document.getElementById('actividad_economica').value = cliente.actividad_economica || '';

        modalCliente.show();

    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
}

// Guardar cliente (crear o actualizar)
async function guardarCliente() {
    const form = document.getElementById('formCliente');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const datos = {
        nombre: document.getElementById('nombre').value.trim(),
        tipo_documento: document.getElementById('tipo_documento').value,
        num_documento: document.getElementById('num_documento').value.trim(),
        nrc: document.getElementById('nrc').value.trim() || null,
        email: document.getElementById('email').value.trim() || null,
        telefono: document.getElementById('telefono').value.trim() || null,
        direccion: document.getElementById('direccion').value.trim() || null,
        departamento: document.getElementById('departamento').value.trim() || null,
        municipio: document.getElementById('municipio').value.trim() || null,
        actividad_economica: document.getElementById('actividad_economica').value.trim() || null
    };

    try {
        if (clienteEditando) {
            // Actualizar
            await ClientesAPI.actualizar(clienteEditando, datos);
            Swal.fire('¡Actualizado!', 'Cliente actualizado exitosamente', 'success');
        } else {
            // Crear
            await ClientesAPI.crear(datos);
            Swal.fire('¡Creado!', 'Cliente creado exitosamente', 'success');
        }

        modalCliente.hide();
        cargarClientes();

    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
}

// Eliminar cliente
async function eliminarCliente(id, nombre) {
    const confirmacion = await Swal.fire({
        title: '¿Eliminar cliente?',
        html: `¿Estás seguro de eliminar a <strong>${nombre}</strong>?<br><small class="text-muted">Esta acción no se puede deshacer</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    try {
        await ClientesAPI.eliminar(id);
        Swal.fire('¡Eliminado!', 'Cliente eliminado exitosamente', 'success');
        cargarClientes();

    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
}
