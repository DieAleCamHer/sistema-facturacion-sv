<?php

namespace App\Controllers;

use App\Models\Usuario;
use App\Utils\JWTHandler;
use App\Utils\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Controlador de Autenticación
 */
class AuthController
{
    private $usuarioModel;

    public function __construct()
    {
        $this->usuarioModel = new Usuario();
    }

    /**
     * POST /api/login
     * Autenticar usuario y generar token JWT
     * 
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @return ResponseInterface
     */
    public function login(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $data = $request->getParsedBody();

        // Validar campos requeridos
        if (empty($data['email']) || empty($data['password'])) {
            return Response::error(
                $response,
                'Email y contraseña son requeridos',
                400
            );
        }

        // Buscar usuario
        $usuario = $this->usuarioModel->findByEmail($data['email']);

        if (!$usuario) {
            return Response::error(
                $response,
                'Credenciales inválidas',
                401
            );
        }

        // Verificar contraseña
        if (!$this->usuarioModel->verificarPassword($data['password'], $usuario['password_hash'])) {
            return Response::error(
                $response,
                'Credenciales inválidas',
                401
            );
        }

        // Verificar que el usuario esté activo
        if (!$usuario['activo']) {
            return Response::error(
                $response,
                'Usuario inactivo',
                403
            );
        }

        // Generar token JWT
        $payload = [
            'user_id' => $usuario['id'],
            'email' => $usuario['email'],
            'rol' => $usuario['rol'],
            'numero_caja' => $usuario['numero_caja'],
            'nombre_caja' => $usuario['nombre_caja'],
        ];

        $token = JWTHandler::encode($payload);

        // Responder con token y datos del usuario
        return Response::success(
            $response,
            [
                'access_token' => $token,
                'token_type' => 'Bearer',
                'expires_in' => 86400, // 24 horas
                'user' => [
                    'id' => $usuario['id'],
                    'nombre_completo' => $usuario['nombre_completo'],
                    'email' => $usuario['email'],
                    'rol' => $usuario['rol'],
                    'numero_caja' => $usuario['numero_caja'],
                    'nombre_caja' => $usuario['nombre_caja'],
                ],
            ],
            'Login exitoso',
            200
        );
    }
}