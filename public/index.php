<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

use Slim\Factory\AppFactory;

require __DIR__ . '/../vendor/autoload.php';

// Para configurar la zona horaria
date_default_timezone_set('America/El_Salvador');

// Esto es importante para mostrar errores detallados
error_reporting(E_ALL);
ini_set('display_errors', '1');

// Para crear la aplicación Slim
$app = AppFactory::create();

// Configurar base path (importante para rutas)
$app->setBasePath('/sistema-facturacion-php/public/index.php');

// Habilitar parsing del body
$app->addBodyParsingMiddleware();

// Agregar middleware de errores (modo desarrollo)
$errorMiddleware = $app->addErrorMiddleware(true, true, true);

// Cargar rutas
$routes = require __DIR__ . '/../src/routes.php';
$routes($app);

// Ejecutar aplicación
$app->run();