
//Factura

let productosSeleccionados = [];
let clientes = [];
let productos = [];

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
    await cargarClientes();
    await cargarProductos();
    configurarEventos();
    configurarValidacionesClienteNuevo();
});

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
            option.dataset.tipoItem = producto.tipo_item;
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

// Configurar validaciones de cliente nuevo
function configurarValidacionesClienteNuevo() {
    const tipoDocSelect = document.getElementById('cliente_tipo_doc');
    const numDocInput = document.getElementById('cliente_num_doc');
    const telefonoInput = document.getElementById('cliente_telefono');

    // Cambiar formato cuando cambia tipo documento
    tipoDocSelect.addEventListener('change', function() {
        const tipo = this.value;
        numDocInput.value = '';
        
        switch(tipo) {
            case '36': // NIT
                numDocInput.placeholder = '0000-000000-000-0';
                numDocInput.maxLength = 17;
                break;
            case '13': // DUI
                numDocInput.placeholder = '00000000-0';
                numDocInput.maxLength = 10;
                break;
            case '03': // Pasaporte
                numDocInput.placeholder = 'A12345678';
                numDocInput.maxLength = 10;
                break;
            case '02': // Carnet Residente
                numDocInput.placeholder = '1234567';
                numDocInput.maxLength = 10;
                break;
            case '37': // Otro
                numDocInput.placeholder = 'Sin formato';
                numDocInput.maxLength = 20;
                break;
            default:
                numDocInput.placeholder = '';
                numDocInput.maxLength = 50;
        }
    });

    // Aplicar máscara al escribir
    numDocInput.addEventListener('input', function() {
        const tipo = tipoDocSelect.value;
        aplicarMascaraDocumento(this, tipo);
    });

    // Aplicar máscara a teléfono
    telefonoInput.addEventListener('input', function() {
        aplicarMascaraTelefono(this);
    });
}

// Aplicar máscara según tipo de documento
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

// Aplicar máscara a teléfono: 0000-0000
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
function validarDocumentoFormato(tipo, documento) {
    const patrones = {
        '36': /^\d{4}-\d{6}-\d{3}-\d{1}$/,   // NIT
        '13': /^\d{8}-\d{1}$/,                // DUI
        '03': /^[A-Z]\d{7,9}$/,               // Pasaporte: 1 letra + 7-9 nums
        '02': /^\d{6,10}$/,                   // Carnet: 6-10 números
        '37': /.{1,20}/                       // Otro: cualquier cosa
    };
    
    return patrones[tipo] ? patrones[tipo].test(documento) : false;
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

// Configurar eventos
function configurarEventos() {
    // Mostrar stock al seleccionar producto
    document.getElementById('producto_id').addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const stock = selectedOption?.dataset.stock || '0';
        const tipoItem = selectedOption?.dataset.tipoItem || '1';
        
        if (tipoItem === '2') {
            document.getElementById('stock_disponible').value = 'N/A';
        } else {
            document.getElementById('stock_disponible').value = stock;
        }
    });

    // Validar cantidad (solo enteros)
    document.getElementById('cantidad').addEventListener('input', function() {
        if (this.value.includes('.')) {
            this.value = Math.floor(this.value);
            Swal.fire('Aviso', 'La cantidad debe ser un número entero', 'info');
        }
    });

    document.getElementById('btnAgregarProducto').addEventListener('click', agregarProducto);
    document.getElementById('btnCrearDTE').addEventListener('click', crearDTE);
}

// Agregar producto
function agregarProducto() {
    const productoId = parseInt(document.getElementById('producto_id').value);
    const cantidad = parseInt(document.getElementById('cantidad').value);

    if (!productoId || !cantidad || cantidad <= 0) {
        Swal.fire('Error', 'Seleccione un producto y cantidad válida', 'warning');
        return;
    }

    if (cantidad % 1 !== 0) {
        Swal.fire('Error', 'La cantidad debe ser un número entero', 'error');
        return;
    }

    const producto = productos.find(p => p.id === productoId);
    if (!producto) return;

    // Solo verificar stock para BIENES
    if (producto.tipo_item === '1' && cantidad > producto.stock) {
        Swal.fire('Error', `Stock insuficiente. Disponible: ${producto.stock}`, 'error');
        return;
    }

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
    if (productosSeleccionados.length === 0) {
        Swal.fire('Error', 'Debe agregar al menos un producto', 'warning');
        return;
    }

    // Validar condición de operación (CAT-016: 1, 2, 3)
    const condicion = document.getElementById('condicion_operacion').value;
    if (!condicion || !['1', '2', '3'].includes(condicion)) {
        Swal.fire('Error', 'Seleccione condición de operación válida', 'warning');
        return;
    }

    // Validar forma de pago
    const formaPago = document.getElementById('forma_pago').value;
    if (!formaPago || !['01', '02', '03', '05'].includes(formaPago)) {
        Swal.fire('Error', 'Seleccione forma de pago válida', 'warning');
        return;
    }

    let datosCliente = {};
    const esClienteExistente = document.getElementById('clienteExistente').checked;

    if (esClienteExistente) {
        const clienteId = document.getElementById('cliente_id').value;
        if (clienteId) {
            datosCliente.cliente_id = parseInt(clienteId);
        } else {
            datosCliente.cliente_id = null;
        }
    } else {
        // Validar cliente nuevo
        const nombre = document.getElementById('cliente_nombre').value.trim();
        const tipoDoc = document.getElementById('cliente_tipo_doc').value;
        const numDoc = document.getElementById('cliente_num_doc').value.trim();
        const email = document.getElementById('cliente_email').value.trim();
        const telefono = document.getElementById('cliente_telefono').value.trim();

        if (!nombre || !tipoDoc || !numDoc) {
            Swal.fire('Error', 'Complete los datos obligatorios del cliente (Nombre, Tipo Doc, Número Doc)', 'warning');
            return;
        }

        // Validar tipo documento 
        if (!['36', '13', '37', '03', '02'].includes(tipoDoc)) {
            Swal.fire('Error', 'Tipo de documento inválido', 'warning');
            return;
        }

        // Validar formato de documento
        if (!validarDocumentoFormato(tipoDoc, numDoc)) {
            const mensajes = {
                '36': 'NIT debe tener formato: 0000-000000-000-0',
                '13': 'DUI debe tener formato: 00000000-0',
                '03': 'Pasaporte: 1 letra mayúscula + 7-9 números (Ej: A12345678)',
                '02': 'Carnet Residente: 6-10 números (Ej: 1234567)',
                '37': 'Campo libre (1-20 caracteres)'
            };
            Swal.fire('Error de Formato', mensajes[tipoDoc], 'error');
            return;
        }

        // Validar email si se proporciona
        if (email && !validarEmail(email)) {
            Swal.fire('Error de Formato', 'Email no válido', 'error');
            return;
        }

        // Validar teléfono si se proporciona
        if (telefono && !validarTelefono(telefono)) {
            Swal.fire('Error de Formato', 'Teléfono debe tener formato: 0000-0000', 'error');
            return;
        }

        datosCliente.cliente_nuevo = {
            nombre: nombre,
            tipo_documento: tipoDoc,
            num_documento: numDoc,
            email: email || null,
            telefono: telefono || null,
            direccion: document.getElementById('cliente_direccion').value.trim() || null
        };

        datosCliente.guardar_cliente = document.getElementById('guardarCliente').checked;
    }

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

    const datos = {
        tipo_dte: '01',
        ...datosCliente,
        condicion_operacion: condicion,
        forma_pago: formaPago,
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
