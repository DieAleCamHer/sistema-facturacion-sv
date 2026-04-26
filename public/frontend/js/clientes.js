/**
 * Gestión de Clientes
 */

let modalCliente;
let clienteEditando = null;

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    modalCliente = new bootstrap.Modal(document.getElementById('modalCliente'));
    cargarClientes();
    configurarValidaciones();
});

// Configurar validaciones
function configurarValidaciones() {
    const numDocInput = document.getElementById('num_documento');
    const tipoDocSelect = document.getElementById('tipo_documento');
    const nrcInput = document.getElementById('nrc');
    const telInput = document.getElementById('telefono');

    tipoDocSelect.addEventListener('change', cambiarTipoDocumento);

    numDocInput.addEventListener('input', function(e) {
        const tipo = tipoDocSelect.value;
        aplicarMascaraDocumento(e.target, tipo);
    });

    nrcInput.addEventListener('input', function(e) {
        aplicarMascaraNRC(e.target);
    });

    telInput.addEventListener('input', function(e) {
        aplicarMascaraTelefono(e.target);
    });

    cambiarTipoDocumento();
}

// Cambiar tipo de documento
function cambiarTipoDocumento() {
    const tipo = document.getElementById('tipo_documento').value;
    const input = document.getElementById('num_documento');
    const help = document.getElementById('helpDocumento');
    
    // NO limpiar el valor si estamos editando
    if (!clienteEditando) {
        input.value = '';
    }
    
    switch(tipo) {
        case '36': // NIT
            input.placeholder = '0000-000000-000-0';
            help.textContent = 'Formato: 0000-000000-000-0';
            input.maxLength = 17;
            break;
        case '13': // DUI
            input.placeholder = '00000000-0';
            help.textContent = 'Formato: 00000000-0';
            input.maxLength = 10;
            break;
        case '03': // Pasaporte
            input.placeholder = 'A12345678';
            help.textContent = '1 letra + 7-9 números';
            input.maxLength = 10;
            break;
        case '02': // Carnet Residente
            input.placeholder = '1234567';
            help.textContent = '6-10 números';
            input.maxLength = 10;
            break;
        case '37': // Otro
            input.placeholder = 'Sin formato';
            help.textContent = 'Campo libre';
            input.maxLength = 20;
            break;
    }
}

// Aplicar máscara según tipo
function aplicarMascaraDocumento(input, tipo) {
    let valor = input.value;
    let resultado = '';
    
    switch(tipo) {
        case '36': // NIT: 0000-000000-000-0
            valor = valor.replace(/[^0-9]/g, '');
            if (valor.length <= 4) {
                resultado = valor;
            } else if (valor.length <= 10) {
                resultado = valor.substring(0, 4) + '-' + valor.substring(4);
            } else if (valor.length <= 13) {
                resultado = valor.substring(0, 4) + '-' + valor.substring(4, 10) + '-' + valor.substring(10);
            } else {
                resultado = valor.substring(0, 4) + '-' + valor.substring(4, 10) + '-' + valor.substring(10, 13) + '-' + valor.substring(13, 14);
            }
            break;
            
        case '13': // DUI: 00000000-0
            valor = valor.replace(/[^0-9]/g, '');
            if (valor.length <= 8) {
                resultado = valor;
            } else {
                resultado = valor.substring(0, 8) + '-' + valor.substring(8, 9);
            }
            break;
            
        case '03': // Pasaporte: A12345678 (1 letra + 7-9 números)
            valor = valor.replace(/[^A-Za-z0-9]/g, '');
            if (valor.length === 0) {
                resultado = '';
            } else {
                const letra = valor.charAt(0).toUpperCase();
                const numeros = valor.substring(1).replace(/[^0-9]/g, '');
                resultado = letra + numeros.substring(0, 9);
            }
            break;
            
        case '02': // Carnet Residente: 1234567 (6-10 números)
            valor = valor.replace(/[^0-9]/g, '');
            resultado = valor.substring(0, 10);
            break;
            
        case '37': // Otro: sin máscara
            resultado = valor.substring(0, 20);
            break;
            
        default:
            resultado = valor;
    }
    
    input.value = resultado;
}

// Aplicar máscara NRC: 000000-0
function aplicarMascaraNRC(input) {
    let valor = input.value.replace(/[^0-9]/g, '');
    let resultado = '';
    
    if (valor.length <= 6) {
        resultado = valor;
    } else {
        resultado = valor.substring(0, 6) + '-' + valor.substring(6, 7);
    }
    
    input.value = resultado;
}

// Aplicar máscara teléfono: 0000-0000
function aplicarMascaraTelefono(input) {
    let valor = input.value.replace(/[^0-9]/g, '');
    let resultado = '';
    
    if (valor.length <= 4) {
        resultado = valor;
    } else {
        resultado = valor.substring(0, 4) + '-' + valor.substring(4, 8);
    }
    
    input.value = resultado;
}

// Validar formato de documento
function validarDocumento(tipo, documento) {
    const patrones = {
        '36': /^\d{4}-\d{6}-\d{3}-\d{1}$/,      // NIT
        '13': /^\d{8}-\d{1}$/,                   // DUI
        '03': /^[A-Z]\d{7,9}$/,                  // Pasaporte: 1 letra + 7-9 nums
        '02': /^\d{6,10}$/,                      // Carnet: 6-10 números
        '37': /.{1,20}/                          // Otro: cualquier cosa
    };
    
    return patrones[tipo] ? patrones[tipo].test(documento) : false;
}

// Validar NRC
function validarNRC(nrc) {
    if (!nrc || nrc.trim() === '') return true;
    return /^\d{6}-\d{1}$/.test(nrc);
}

// Validar teléfono
function validarTelefono(telefono) {
    if (!telefono || telefono.trim() === '') return true;
    return /^\d{4}-\d{4}$/.test(telefono);
}

// Validar email
function validarEmail(email) {
    if (!email || email.trim() === '') return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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
            // MAPEO CORREGIDO - Debe coincidir EXACTAMENTE con los códigos en BD
            const tipoDoc = {
                '02': 'Carnet de Residente',
                '03': 'Pasaporte',
                '13': 'DUI',
                '36': 'NIT',
                '37': 'Otro'
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

// Abrir modal nuevo
function abrirModalNuevo() {
    clienteEditando = null;
    document.getElementById('modalTitulo').textContent = 'Nuevo Cliente';
    document.getElementById('formCliente').reset();
    document.getElementById('clienteId').value = '';
    document.getElementById('tipo_documento').value = '36'; // Default NIT
    cambiarTipoDocumento();
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
        
        // IMPORTANTE: Establecer el tipo ANTES de cambiar formato
        document.getElementById('tipo_documento').value = cliente.tipo_documento;
        
        // Llamar a cambiarTipoDocumento para actualizar placeholder
        cambiarTipoDocumento();
        
        // DESPUÉS establecer el valor del documento
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

// Guardar cliente
async function guardarCliente() {
    const form = document.getElementById('formCliente');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const tipo = document.getElementById('tipo_documento').value;
    const numDoc = document.getElementById('num_documento').value.trim();
    const nrc = document.getElementById('nrc').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefono = document.getElementById('telefono').value.trim();

    if (!validarDocumento(tipo, numDoc)) {
        const mensajes = {
            '36': 'NIT debe tener formato: 0000-000000-000-0',
            '13': 'DUI debe tener formato: 00000000-0',
            '03': 'Pasaporte: 1 letra mayúscula + 7-9 números (Ej: A12345678)',
            '02': 'Carnet Residente: 6-10 números (Ej: 1234567)',
            '37': 'Campo libre (1-20 caracteres)'
        };
        Swal.fire('Error de Formato', mensajes[tipo], 'error');
        return;
    }

    if (nrc && !validarNRC(nrc)) {
        Swal.fire('Error de Formato', 'NRC debe tener formato: 000000-0', 'error');
        return;
    }

    if (email && !validarEmail(email)) {
        Swal.fire('Error de Formato', 'Email no válido', 'error');
        return;
    }

    if (telefono && !validarTelefono(telefono)) {
        Swal.fire('Error de Formato', 'Teléfono debe tener formato: 0000-0000', 'error');
        return;
    }

    const datos = {
        nombre: document.getElementById('nombre').value.trim(),
        tipo_documento: tipo,
        num_documento: numDoc,
        nrc: nrc || null,
        email: email || null,
        telefono: telefono || null,
        direccion: document.getElementById('direccion').value.trim() || null,
        departamento: document.getElementById('departamento').value.trim() || null,
        municipio: document.getElementById('municipio').value.trim() || null,
        actividad_economica: document.getElementById('actividad_economica').value.trim() || null
    };

    try {
        if (clienteEditando) {
            await ClientesAPI.actualizar(clienteEditando, datos);
            Swal.fire('¡Actualizado!', 'Cliente actualizado exitosamente', 'success');
        } else {
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
