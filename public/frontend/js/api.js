/**
 * API Client para Sistema de Facturación SV
 * Maneja todas las peticiones HTTP al backend
 */

// IMPORTANTE: Ajusta esta URL según tu instalación
const API_BASE_URL = '/sistema-facturacion-php/public/index.php/api';

/**
 * Obtener token de autenticación
 */
function getToken() {
    return localStorage.getItem('token');
}

/**
 * Obtener datos del usuario del localStorage
 */
function getUserData() {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
}

/**
 * Petición HTTP genérica
 */
async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    
    const defaultHeaders = {
        'Content-Type': 'application/json'
    };

    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error en la petición');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ==========================================
// API DE AUTENTICACIÓN
// ==========================================
const AuthAPI = {
    /**
     * Iniciar sesión
     */
    login: (email, password) => {
        return apiRequest('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }
};

// ==========================================
// API DE DTEs
// ==========================================
const DTEsAPI = {
    /**
     * Crear nuevo DTE
     */
    crear: (datos) => {
        return apiRequest('/dte', {
            method: 'POST',
            body: JSON.stringify(datos)
        });
    },

    /**
     * Listar todos los DTEs
     */
    listar: () => {
        return apiRequest('/dte');
    },

    /**
     * Obtener DTE por ID
     */
    obtener: (id) => {
        return apiRequest(`/dte/${id}`);
    },

    /**
     * Invalidar DTE
     */
    invalidar: (id, motivo) => {
        return apiRequest(`/dte/${id}/invalidar`, {
            method: 'POST',
            body: JSON.stringify({ motivo })
        });
    },

    /**
     * Descargar PDF
     */
    descargarPDF: (id) => {
        const token = getToken();
        window.open(
            `${API_BASE_URL}/dte/${id}/pdf?token=${token}`,
            '_blank'
        );
    }
};

// ==========================================
// API DE CLIENTES
// ==========================================
const ClientesAPI = {
    /**
     * Listar todos los clientes
     */
    listar: () => {
        return apiRequest('/clientes');
    },

    /**
     * Crear nuevo cliente
     */
    crear: (datos) => {
        return apiRequest('/clientes', {
            method: 'POST',
            body: JSON.stringify(datos)
        });
    },

    /**
     * Obtener cliente por ID
     */
    obtener: (id) => {
        return apiRequest(`/clientes/${id}`);
    },

    /**
     * Actualizar cliente
     */
    actualizar: (id, datos) => {
        return apiRequest(`/clientes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(datos)
        });
    },

    /**
     * Eliminar cliente
     */
    eliminar: (id) => {
        return apiRequest(`/clientes/${id}`, {
            method: 'DELETE'
        });
    },

    /**
     * Crear o actualizar cliente (para clientes "al vuelo")
     */
    crearOActualizar: (datos) => {
        return apiRequest('/clientes/crear-o-actualizar', {
            method: 'POST',
            body: JSON.stringify(datos)
        });
    }
};

// ==========================================
// API DE PRODUCTOS
// ==========================================
const ProductosAPI = {
    /**
     * Listar todos los productos
     */
    listar: () => {
        return apiRequest('/productos');
    },

    /**
     * Crear nuevo producto
     */
    crear: (datos) => {
        return apiRequest('/productos', {
            method: 'POST',
            body: JSON.stringify(datos)
        });
    },

    /**
     * Obtener producto por ID
     */
    obtener: (id) => {
        return apiRequest(`/productos/${id}`);
    },

    /**
     * Actualizar producto
     */
    actualizar: (id, datos) => {
        return apiRequest(`/productos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(datos)
        });
    },

    /**
     * Eliminar producto
     */
    eliminar: (id) => {
        return apiRequest(`/productos/${id}`, {
            method: 'DELETE'
        });
    }
};

// ==========================================
// API DE CATÁLOGOS DE HACIENDA (Módulo 2)
// ==========================================
const CatalogosAPI = {
    /**
     * Obtener todos los catálogos organizados por tipo
     */
    obtenerTodos: () => {
        return apiRequest('/catalogos');
    },

    /**
     * Obtener catálogo por tipo específico
     * @param {number} tipo - Tipo de catálogo (13, 17, 18, 19, 20)
     */
    obtenerPorTipo: (tipo) => {
        return apiRequest(`/catalogos/${tipo}`);
    }
};

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

/**
 * Formatear moneda
 */
function formatearMoneda(valor) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(valor);
}

/**
 * Mostrar loading
 */
function showLoading(mensaje = 'Procesando...') {
    Swal.fire({
        title: mensaje,
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
}

/**
 * Ocultar loading
 */
function hideLoading() {
    Swal.close();
}