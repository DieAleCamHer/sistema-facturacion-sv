-- ========================================
-- SISTEMA DE FACTURACIÓN ELECTRÓNICA SV
-- Base de datos: facturacion_sv
-- Versión: 3.0.0 (Módulos 1, 2 y 3)
-- ========================================

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS facturacion_sv CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE facturacion_sv;

-- ========================================
-- TABLA: usuario
-- Usuarios del sistema (cajeros, admin)
-- ========================================
CREATE TABLE IF NOT EXISTS usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol ENUM('admin', 'cajero') DEFAULT 'cajero',
    numero_caja VARCHAR(10) NULL COMMENT 'Número de caja asignada',
    activo TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Usuarios del sistema';

-- ========================================
-- TABLA: cliente
-- Clientes (receptores de DTEs)
-- ========================================
CREATE TABLE IF NOT EXISTS cliente (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    tipo_documento VARCHAR(5) NOT NULL DEFAULT '36' COMMENT 'Código catálogo tipo documento',
    num_documento VARCHAR(20) NULL COMMENT 'NIT, DUI, pasaporte, etc',
    nrc VARCHAR(20) NULL COMMENT 'Número de Registro de Contribuyente',
    email VARCHAR(100) NULL,
    telefono VARCHAR(20) NULL,
    direccion TEXT NULL,
    codigo_actividad VARCHAR(10) NULL COMMENT 'Código actividad económica',
    nombre_comercial VARCHAR(200) NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_num_documento (num_documento),
    INDEX idx_nrc (nrc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Clientes del sistema';

-- ========================================
-- TABLA: producto
-- Productos/servicios
-- ========================================
CREATE TABLE IF NOT EXISTS producto (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(500) NOT NULL,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    stock INT NOT NULL DEFAULT 0 COMMENT 'Inventario actual',
    tipo_item CHAR(1) NOT NULL DEFAULT '1' COMMENT '1=Bien, 2=Servicio, 3=Ambos, 4=Otros',
    unidad_medida VARCHAR(5) NOT NULL DEFAULT '59' COMMENT 'Código unidad de medida (catálogo)',
    tributo VARCHAR(5) NOT NULL DEFAULT '20' COMMENT 'Código de tributo (catálogo)',
    activo TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_codigo (codigo),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Productos y servicios';

-- ========================================
-- TABLA: dte
-- Documentos Tributarios Electrónicos
-- ========================================
CREATE TABLE IF NOT EXISTS dte (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo_dte CHAR(2) NOT NULL COMMENT '01=Factura, 03=CCF, 05=Nota Crédito',
    numero_control VARCHAR(50) NOT NULL UNIQUE,
    codigo_generacion VARCHAR(50) NOT NULL UNIQUE COMMENT 'UUID del DTE',
    numero_caja VARCHAR(10) NULL,
    usuario_id INT NOT NULL,
    cliente_id INT NULL COMMENT 'NULL para facturas sin cliente',
    dte_relacionado_id INT NULL COMMENT 'Para Notas de Crédito',
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    iva DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    json_dte JSON NULL COMMENT 'JSON completo según normativa MH',
    sello_simulado VARCHAR(500) NULL COMMENT 'Sello de recepción simulado',
    estado ENUM('procesado', 'invalidado', 'contingencia') DEFAULT 'procesado',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE RESTRICT,
    FOREIGN KEY (cliente_id) REFERENCES cliente(id) ON DELETE SET NULL,
    FOREIGN KEY (dte_relacionado_id) REFERENCES dte(id) ON DELETE RESTRICT,
    INDEX idx_tipo_dte (tipo_dte),
    INDEX idx_numero_control (numero_control),
    INDEX idx_codigo_generacion (codigo_generacion),
    INDEX idx_estado (estado),
    INDEX idx_creado_en (creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Documentos Tributarios Electrónicos';

-- ========================================
-- TABLA: dte_detalle
-- Líneas/productos de cada DTE
-- ========================================
CREATE TABLE IF NOT EXISTS dte_detalle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dte_id INT NOT NULL,
    numero_item INT NOT NULL,
    tipo_item CHAR(1) NOT NULL DEFAULT '1',
    codigo_producto VARCHAR(50) NULL,
    descripcion VARCHAR(500) NOT NULL,
    cantidad INT NOT NULL,
    unidad_medida VARCHAR(5) NOT NULL DEFAULT '59',
    precio_unitario DECIMAL(10,2) NOT NULL,
    monto_descuento DECIMAL(10,2) DEFAULT 0.00,
    subtotal DECIMAL(10,2) NOT NULL,
    tributos JSON NULL COMMENT 'Array de tributos aplicados',
    FOREIGN KEY (dte_id) REFERENCES dte(id) ON DELETE CASCADE,
    INDEX idx_dte_id (dte_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Detalle de productos en DTEs';

-- ========================================
-- TABLA: evento_invalidacion (MÓDULO 3)
-- Registro de eventos de invalidación
-- ========================================
CREATE TABLE IF NOT EXISTS evento_invalidacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dte_id INT NOT NULL,
    usuario_id INT NOT NULL,
    motivo TEXT NOT NULL COMMENT 'Razón de la invalidación',
    fecha_evento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    json_evento JSON NULL COMMENT 'JSON del evento según normativa MH',
    codigo_generacion VARCHAR(50) NOT NULL COMMENT 'UUID del evento',
    estado VARCHAR(20) DEFAULT 'procesado' COMMENT 'Estado del evento',
    FOREIGN KEY (dte_id) REFERENCES dte(id) ON DELETE RESTRICT,
    FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE RESTRICT,
    INDEX idx_dte_id (dte_id),
    INDEX idx_fecha_evento (fecha_evento),
    INDEX idx_codigo_generacion (codigo_generacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Registro de eventos de invalidación de DTEs';

-- ========================================
-- TABLA: catalogo (MÓDULO 2)
-- Catálogos de Hacienda
-- ========================================
CREATE TABLE IF NOT EXISTS catalogo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL COMMENT 'tipo_documento, actividad_economica, etc',
    codigo VARCHAR(10) NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    activo TINYINT(1) DEFAULT 1,
    INDEX idx_tipo (tipo),
    INDEX idx_codigo (codigo),
    UNIQUE KEY unique_tipo_codigo (tipo, codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Catálogos de Hacienda';

-- ========================================
-- DATOS INICIALES
-- ========================================

-- Usuario administrador (password: admin123)
INSERT INTO usuario (nombre_completo, email, password, rol, numero_caja) VALUES
('Administrador', 'admin@empresa.com', '$2y$10$rH8qEYvKqJxKJL5YxB5xLOxKqJxKJL5YxB5xLOxKqJxKJL5YxB5xLO', 'admin', NULL),
('Cajero 1', 'cajero1@empresa.com', '$2y$10$rH8qEYvKqJxKJL5YxB5xLOxKqJxKJL5YxB5xLOxKqJxKJL5YxB5xLO', 'cajero', 'CAJA001');

-- Catálogos básicos
INSERT INTO catalogo (tipo, codigo, descripcion) VALUES
-- Tipo de documento
('tipo_documento', '36', 'NIT'),
('tipo_documento', '13', 'DUI'),
('tipo_documento', '02', 'Carnet de Residente'),
('tipo_documento', '03', 'Pasaporte'),
('tipo_documento', '37', 'Otro'),

-- Unidades de medida
('unidad_medida', '59', 'Unidad'),
('unidad_medida', '99', 'Caja'),
('unidad_medida', '58', 'Docena'),
('unidad_medida', '57', 'Kilogramo'),
('unidad_medida', '49', 'Litro'),

-- Tributos
('tributo', '20', 'Impuesto al Valor Agregado 13%'),

-- Tipo de generación
('tipo_generacion', '1', 'Normal'),
('tipo_generacion', '2', 'Contingencia'),

-- Tipo de transmisión
('tipo_transmision', '1', 'Normal'),
('tipo_transmision', '2', 'Contingencia');

-- Productos de ejemplo
INSERT INTO producto (codigo, descripcion, precio, stock, tipo_item, unidad_medida, tributo) VALUES
('PROD001', 'Producto Ejemplo 1', 10.00, 100, '1', '59', '20'),
('PROD002', 'Producto Ejemplo 2', 25.50, 50, '1', '59', '20'),
('SERV001', 'Servicio Ejemplo 1', 50.00, 0, '2', '59', '20');

-- ========================================
-- VERIFICACIÓN
-- ========================================
SELECT 'Base de datos creada exitosamente' as mensaje;
SELECT COUNT(*) as total_usuarios FROM usuario;
SELECT COUNT(*) as total_catalogos FROM catalogo;
SELECT COUNT(*) as total_productos FROM producto;