<?php

namespace App\Utils;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * Clase JWTHandler
 * Manejo de JSON Web Tokens para autenticación
 */
class JWTHandler
{
    private static $secret;
    private static $algorithm;
    private static $expiration;

    /**
     * Inicializar configuración
     */
    public static function init()
    {
        $config = require __DIR__ . '/../../config/config.php';
        self::$secret = $config['jwt']['secret'];
        self::$algorithm = $config['jwt']['algorithm'];
        self::$expiration = $config['jwt']['expiration'];
    }

    /**
     * Generar un nuevo token JWT
     * 
     * @param array $payload Datos a incluir en el token
     * @return string Token JWT
     */
    public static function encode(array $payload): string
    {
        self::init();
        
        $now = time();
        $payload['iat'] = $now; // Issued at
        $payload['exp'] = $now + self::$expiration; // Expiration

        return JWT::encode($payload, self::$secret, self::$algorithm);
    }

    /**
     * Decodificar y validar un token JWT
     * 
     * @param string $token Token a decodificar
     * @return object|null Datos del token o null si es inválido
     */
    public static function decode(string $token): ?object
    {
        self::init();
        
        try {
            $decoded = JWT::decode($token, new Key(self::$secret, self::$algorithm));
            return $decoded;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Extraer token del header Authorization
     * 
     * @param string|null $authHeader Header Authorization
     * @return string|null Token extraído
     */
    public static function extractToken(?string $authHeader): ?string
    {
        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            return null;
        }

        return substr($authHeader, 7); // Remover "Bearer "
    }
}
