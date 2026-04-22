# Sistema de Facturación Electrónica - El Salvador

Sistema de facturación electrónica que cumple con las normativas del Ministerio de Hacienda de El Salvador. Desarrollado en PHP con frontend JavaScript vanilla.

## Características

### Gestión Base
- CRUD completo de clientes y productos
- Control automático de inventario
- Validación de stock antes de facturar
- Descuento automático de productos al emitir DTEs

### Emisión de DTEs
- **Factura (01)**: Con o sin cliente registrado
- **Crédito Fiscal (03)**: Con validación de NRC obligatorio
- **Nota de Crédito (05)**: Vinculada a DTE original
- Cliente al vuelo (opción de guardar o no)
- Catálogos de Hacienda integrados
- Formularios diferenciados según tipo de DTE

### PDFs e Invalidación
- Generación de PDFs profesionales con FPDF
- Sistema de invalidación según normativa (72 horas)
- Marca de agua en DTEs invalidados
- Registro completo de eventos de invalidación

### Simulaciones de Hacienda
El sistema simula las siguientes funcionalidades del Ministerio de Hacienda:
- Generación de código de generación (UUID)
- Numeración de control automática
- Validación de estructura JSON según normativa
- Sello de recepción simulado
- Eventos de invalidación
- Estados de DTEs (procesado, invalidado)


## Requisitos

- PHP 7.4 o superior
- MySQL 5.7 o superior
- Apache/Nginx con mod_rewrite
- Composer
- FPDF (incluido en config/fpdf/)

## Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/sistema-facturacion-sv.git
cd sistema-facturacion-sv
```

### 2. Instalar dependencias
```bash
composer install
```

### 3. Configurar base de datos
```bash
# Crear base de datos en phpMyAdmin o MySQL
mysql -u root -p < database/schema.sql
```

### 4. Configurar conexión
Editar `config/config.php`:
```php
'database' => [
    'host' => 'localhost',
    'dbname' => 'facturacion_sv',
    'username' => 'root',
    'password' => ''
]
```

### 5. Configurar servidor web
Apuntar el DocumentRoot a la carpeta `public/`

Para XAMPP en Windows:
```
http://localhost/sistema-facturacion-php/public/
```

### 6. Acceder al sistema
```
URL: http://localhost/sistema-facturacion-php/public/frontend/
Usuario: admin@empresa.com
Contraseña: admin123
```

## Estructura del Proyecto

```
sistema-facturacion-sv/
├── config/
│   ├── config.php          # Configuración principal
│   └── fpdf/               # Librería FPDF
├── database/
│   └── schema.sql          # Schema completo de BD
├── public/
│   ├── frontend/           # Interfaz web
│   └── logos/              # Logo para PDFs
├── src/
│   ├── controllers/        # Controladores
│   ├── models/             # Modelos
│   ├── services/           # Servicios (PDF, DTE)
│   ├── middlewares/        # Middlewares
│   ├── utils/              # Utilidades
│   └── routes.php          # Rutas de la API
├── storage/
│   └── pdfs/               # PDFs generados
└── vendor/                 # Dependencias Composer
```

## Uso del Sistema

### Crear una Factura
1. Ir a "Nueva Factura"
2. Seleccionar cliente (opcional) o crear uno al vuelo
3. Agregar productos
4. El sistema calcula IVA automáticamente
5. Generar factura

### Crear un CCF
1. Ir a "Nuevo CCF"
2. Cliente con NRC es obligatorio
3. Agregar productos
4. Generar documento

### Invalidar un DTE
1. Ir a "Invalidar DTE"
2. Seleccionar documento (máximo 72 horas)
3. Indicar motivo
4. Confirmar invalidación

### Descargar PDF
1. Ir a "Ver DTEs"
2. Click en el icono de PDF
3. Se descarga automáticamente

## Módulos Pendientes

- Contingencia y lotes
- Reportes avanzados
- Dashboard con gráficas

## Tecnologías Utilizadas

- **Backend**: PHP 7.4+, Slim Framework 4
- **Base de datos**: MySQL 8.0
- **Frontend**: JavaScript vanilla, Bootstrap 5
- **PDFs**: FPDF
- **Otros**: SweetAlert2, Bootstrap Icons
