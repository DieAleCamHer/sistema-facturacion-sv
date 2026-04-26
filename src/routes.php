<?php

use Slim\Routing\RouteCollectorProxy;
use App\Controllers\AuthController;
use App\Controllers\DTEController;
use App\Controllers\ClienteController;
use App\Controllers\ProductoController;
use App\Controllers\CatalogoController;
use App\Controllers\InvalidacionController;
use App\Middlewares\AuthMiddleware;
use Slim\App;

return function (App $app) {
    
    // Middleware CORS
    $app->add(function ($request, $handler) {
        $response = $handler->handle($request);
        return $response
            ->withHeader('Access-Control-Allow-Origin', '*')
            ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    });

    // Manejar OPTIONS para CORS
    $app->options('/{routes:.+}', function ($request, $response) {
        return $response;
    });

    // Grupo de rutas de API
    $app->group('/api', function (RouteCollectorProxy $group) {
        
        // AUTENTICACIÓN (sin middleware)
        
        $group->post('/login', [AuthController::class, 'login']);

        // RUTAS PROTEGIDAS (requieren autenticación)
        
        $group->group('', function (RouteCollectorProxy $protected) {
            
            // CLIENTES
            $protected->get('/clientes', [ClienteController::class, 'listar']);
            $protected->post('/clientes', [ClienteController::class, 'crear']);
            $protected->get('/clientes/{id}', [ClienteController::class, 'obtener']);
            $protected->put('/clientes/{id}', [ClienteController::class, 'actualizar']);
            $protected->delete('/clientes/{id}', [ClienteController::class, 'eliminar']);
            $protected->post('/clientes/crear-o-actualizar', [ClienteController::class, 'crearOActualizar']);

            // PRODUCTOS
            $protected->get('/productos', [ProductoController::class, 'listar']);
            $protected->post('/productos', [ProductoController::class, 'crear']);
            $protected->get('/productos/{id}', [ProductoController::class, 'obtener']);
            $protected->put('/productos/{id}', [ProductoController::class, 'actualizar']);
            $protected->delete('/productos/{id}', [ProductoController::class, 'eliminar']);

            // DTEs
            $protected->get('/dte', [DTEController::class, 'listar']);
            $protected->post('/dte', [DTEController::class, 'crear']);
            $protected->get('/dte/{id}', [DTEController::class, 'obtener']);
            $protected->get('/dte/{id}/pdf', [DTEController::class, 'descargarPDF']);

            // INVALIDACIÓN (Módulo 3)
            $protected->post('/dte/{id}/invalidar', [InvalidacionController::class, 'invalidar']);
            $protected->get('/dte/{id}/puede-invalidar', [InvalidacionController::class, 'puedeInvalidar']);

            // CATÁLOGOS
            $protected->get('/catalogos', [CatalogoController::class, 'obtenerTodos']);
            $protected->get('/catalogos/{tipo}', [CatalogoController::class, 'obtenerPorTipo']);

        })->add(new AuthMiddleware());
    });

    // Ruta de bienvenida
    $app->get('/', function ($request, $response) {
        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => 'API de Facturación Electrónica SV',
            'version' => '3.0.0',
            'modulos' => [
                'Módulo 1' => 'CRUD Clientes, Productos, Stock',
                'Módulo 2' => 'Formularios diferenciados, Cliente al vuelo, Catálogos',
                'Módulo 3' => 'PDFs reales con FPDF, Invalidación completa'
            ],
            'endpoints' => [
                'POST /api/login' => 'Autenticación',
                'GET /api/clientes' => 'Listar clientes',
                'GET /api/productos' => 'Listar productos',
                'POST /api/dte' => 'Crear DTE',
                'GET /api/dte' => 'Listar DTEs',
                'GET /api/catalogos' => 'Catálogos de Hacienda',
                'POST /api/dte/{id}/invalidar' => 'Invalidar DTE',
                'GET /api/dte/{id}/puede-invalidar' => 'Verificar si puede invalidar'
            ]
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

        return $response->withHeader('Content-Type', 'application/json');
    });
};