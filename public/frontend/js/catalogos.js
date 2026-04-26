/**
 * Helper Functions para Catálogos de hacienda
 * Funciones reutilizables para cargar y manejar catálogos
 */

// Variable global para almacenar catálogos
let catalogosHacienda = {};

/**
 * Cargar todos los catálogos de Hacienda
 * @returns {Promise<Object>} Catálogos organizados por tipo
 */
async function cargarCatalogosHacienda() {
    try {
        const response = await CatalogosAPI.obtenerTodos();
        catalogosHacienda = response.data;
        return catalogosHacienda;
    } catch (error) {
        console.error('Error cargando catálogos:', error);
        Swal.fire('Error', 'No se pudieron cargar los catálogos de Hacienda', 'error');
        return null;
    }
}

/**
 * Poblar un select con datos de catálogo
 * @param {string} selectId - ID del elemento select
 * @param {Array} datos - Array de objetos {codigo, valor}
 * @param {string} placeholder - Texto del placeholder (opcional)
 * @param {boolean} incluirVacio - Si debe incluir opción vacía (default: true)
 */
function poblarSelectCatalogo(selectId, datos, placeholder = 'Seleccione...', incluirVacio = true) {
    const select = document.getElementById(selectId);
    if (!select) {
        console.warn(`Select con ID "${selectId}" no encontrado`);
        return;
    }

    // Limpiar select
    select.innerHTML = '';

    // Agregar opción vacía
    if (incluirVacio) {
        const optionVacia = document.createElement('option');
        optionVacia.value = '';
        optionVacia.textContent = placeholder;
        select.appendChild(optionVacia);
    }

    // Agregar opciones del catálogo
    if (!datos || datos.length === 0) {
        console.warn(`No hay datos para el select "${selectId}"`);
        return;
    }

    datos.forEach(item => {
        const option = document.createElement('option');
        option.value = item.codigo;
        option.textContent = item.valor;
        select.appendChild(option);
    });
}

/**
 * Obtener el valor (texto) de un código de catálogo
 * @param {string} tipoCatalogo - Tipo de catálogo (tipo_documento, forma_pago, etc.)
 * @param {string} codigo - Código a buscar
 * @returns {string} Valor del catálogo o el código si no se encuentra
 */
function obtenerValorCatalogo(tipoCatalogo, codigo) {
    if (!catalogosHacienda[tipoCatalogo]) {
        return codigo;
    }

    const item = catalogosHacienda[tipoCatalogo].find(c => c.codigo === codigo);
    return item ? item.valor : codigo;
}

/**
 * Inicializar catálogos en un formulario
 * Carga todos los catálogos y pobla los selects automáticamente
 * @param {Object} selectsMap - Mapeo de selectId => tipoCatalogo
 * Ejemplo: {
 *   'tipo_documento': 'tipo_documento',
 *   'forma_pago': 'forma_pago'
 * }
 */
async function inicializarCatalogosFormulario(selectsMap) {
    try {
        // Cargar catálogos si no están cargados
        if (Object.keys(catalogosHacienda).length === 0) {
            await cargarCatalogosHacienda();
        }

        // Poblar cada select
        for (const [selectId, tipoCatalogo] of Object.entries(selectsMap)) {
            if (catalogosHacienda[tipoCatalogo]) {
                poblarSelectCatalogo(selectId, catalogosHacienda[tipoCatalogo]);
            } else {
                console.warn(`Tipo de catálogo "${tipoCatalogo}" no encontrado`);
            }
        }
    } catch (error) {
        console.error('Error inicializando catálogos:', error);
    }
}

/**
 * Validar que un select de catálogo tenga un valor seleccionado
 * @param {string} selectId - ID del select
 * @param {string} nombreCampo - Nombre del campo para el mensaje de error
 * @returns {boolean} True si es válido
 */
function validarSelectCatalogo(selectId, nombreCampo) {
    const select = document.getElementById(selectId);
    if (!select) return false;

    const valor = select.value.trim();
    if (!valor) {
        Swal.fire('Error', `Debe seleccionar ${nombreCampo}`, 'warning');
        select.focus();
        return false;
    }

    return true;
}

/**
 * Obtener código de catálogo por valor (búsqueda inversa)
 * @param {string} tipoCatalogo - Tipo de catálogo
 * @param {string} valor - Valor a buscar
 * @returns {string|null} Código encontrado o null
 */
function obtenerCodigoPorValor(tipoCatalogo, valor) {
    if (!catalogosHacienda[tipoCatalogo]) {
        return null;
    }

    const item = catalogosHacienda[tipoCatalogo].find(
        c => c.valor.toLowerCase() === valor.toLowerCase()
    );
    return item ? item.codigo : null;
}

/**
 * Formatear select con ícono según tipo
 * @param {string} selectId - ID del select
 * @param {Object} iconos - Mapeo de código => clase de ícono
 */
function agregarIconosASelect(selectId, iconos) {
    const select = document.getElementById(selectId);
    if (!select) return;

    Array.from(select.options).forEach(option => {
        const codigo = option.value;
        if (iconos[codigo]) {
            option.textContent = `${iconos[codigo]} ${option.textContent}`;
        }
    });
}

/**
 * CATÁLOGOS ESPECÍFICOS DE HACIENDA
 * Funciones de acceso rápido a catálogos comunes
 */

const Catalogos = {
    /**
     * Tipo de Documento (13)
     */
    tipoDocumento: {
        DUI: '13',
        NIT: '36',
        PASAPORTE: '37',
        CARNET_RESIDENTE: '2',
        CARNET_DIPLOMATICO: '3',
        OTRO: '39'
    },

    /**
     * Condición de Operación (17)
     */
    condicionOperacion: {
        CONTADO: '1',
        CREDITO: '2',
        OTRO: '3'
    },

    /**
     * Forma de Pago (18)
     */
    formaPago: {
        BILLETES_MONEDAS: '01',
        TARJETA: '02',
        CHEQUE: '03',
        TRANSFERENCIA: '04',
        OTROS: '05'
    },

    /**
     * Tipo de Ítem (19)
     */
    tipoItem: {
        BIEN: '1',
        SERVICIO: '2',
        BIEN_SERVICIO: '3',
        OTROS_TRIBUTOS: '4'
    },

    /**
     * Unidad de Medida (20) - Más comunes
     */
    unidadMedida: {
        UNIDAD: '59',
        CAJA: '99',
        DOCENA: '58',
        KILOGRAMO: '57',
        LITRO: '49',
        METRO: '53',
        METRO_CUADRADO: '54',
        METRO_CUBICO: '55',
        TONELADA: '47',
        QUINTAL: '52',
        LIBRA: '62',
        ONZA: '63'
    }
};
