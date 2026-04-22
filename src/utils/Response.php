<?php

namespace App\Utils;

use Psr\Http\Message\ResponseInterface;
use Slim\Psr7\Response as SlimResponse;

/**
 * Clase Response
 * Respuestas HTTP estandarizadas en formato JSON
 */
class Response
{
    /**
     * Respuesta de éxito
     * 
     * @param ResponseInterface $response Objeto response de Slim
     * @param mixed $data Datos a retornar
     * @param string $message Mensaje opcional
     * @param int $statusCode Código HTTP (default 200)
     * @return ResponseInterface
     */
    public static function success(
        ResponseInterface $response,
        $data = null,
        string $message = 'Éxito',
        int $statusCode = 200
    ): ResponseInterface {
        $payload = [
            'success' => true,
            'message' => $message,
        ];

        if ($data !== null) {
            $payload['data'] = $data;
        }

        $response->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
        
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($statusCode);
    }

    /**
     * Respuesta de error
     * 
     * @param ResponseInterface $response Objeto response de Slim
     * @param string $message Mensaje de error
     * @param int $statusCode Código HTTP (default 400)
     * @param mixed $errors Errores detallados (opcional)
     * @return ResponseInterface
     */
    public static function error(
        ResponseInterface $response,
        string $message = 'Error',
        int $statusCode = 400,
        $errors = null
    ): ResponseInterface {
        $payload = [
            'success' => false,
            'message' => $message,
        ];

        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        $response->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
        
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($statusCode);
    }

    /**
     * Respuesta de no autorizado (401)
     */
    public static function unauthorized(
        ResponseInterface $response,
        string $message = 'No autorizado'
    ): ResponseInterface {
        return self::error($response, $message, 401);
    }

    /**
     * Respuesta de no encontrado (404)
     */
    public static function notFound(
        ResponseInterface $response,
        string $message = 'Recurso no encontrado'
    ): ResponseInterface {
        return self::error($response, $message, 404);
    }
}
