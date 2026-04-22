<?php

namespace App\Middlewares;

use App\Utils\JWTHandler;
use App\Utils\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * Middleware de Autenticación JWT
 * Verifica que el token sea válido en rutas protegidas
 */
class AuthMiddleware implements MiddlewareInterface
{
    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        // Obtener header Authorization
        $authHeader = $request->getHeaderLine('Authorization');

        // Extraer token
        $token = JWTHandler::extractToken($authHeader);

        if (!$token) {
            $response = new \Slim\Psr7\Response();
            return Response::unauthorized($response, 'Token no proporcionado');
        }

        // Decodificar y validar token
        $decoded = JWTHandler::decode($token);

        if (!$decoded) {
            $response = new \Slim\Psr7\Response();
            return Response::unauthorized($response, 'Token inválido o expirado');
        }

        // Agregar datos del usuario al request
        $request = $request->withAttribute('user', $decoded);

        // Continuar con la petición
        return $handler->handle($request);
    }
}
