<?php

namespace App\Models;

use App\Utils\Database;
use PDO;

/**
 * Modelo Usuario
 * Representa facturadores y administradores
 */
class Usuario
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * Buscar usuario por email
     * 
     * @param string $email
     * @return array|null
     */
    public function findByEmail(string $email): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM usuario WHERE email = ? AND activo = TRUE"
        );
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    /**
     * Buscar usuario por ID
     * 
     * @param int $id
     * @return array|null
     */
    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT id, nombre_completo, email, numero_caja, nombre_caja, rol, activo 
             FROM usuario WHERE id = ?"
        );
        $stmt->execute([$id]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    /**
     * Listar todos los usuarios activos
     * 
     * @return array
     */
    public function listarTodos(): array
    {
        $stmt = $this->db->query(
            "SELECT id, nombre_completo, email, numero_caja, nombre_caja, rol, activo, creado_en 
             FROM usuario 
             ORDER BY numero_caja ASC"
        );
        
        return $stmt->fetchAll();
    }

    /**
     * Crear nuevo usuario
     * 
     * @param array $datos
     * @return int ID del usuario creado
     */
    public function crear(array $datos): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO usuario 
             (nombre_completo, email, password_hash, numero_caja, nombre_caja, rol) 
             VALUES (?, ?, ?, ?, ?, ?)"
        );

        $passwordHash = password_hash($datos['password'], PASSWORD_BCRYPT);

        $stmt->execute([
            $datos['nombre_completo'],
            $datos['email'],
            $passwordHash,
            $datos['numero_caja'],
            $datos['nombre_caja'],
            $datos['rol'] ?? 'facturador'
        ]);

        return (int) $this->db->lastInsertId();
    }

    /**
     * Verificar password
     * 
     * @param string $password Password en texto plano
     * @param string $hash Hash almacenado
     * @return bool
     */
    public function verificarPassword(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }
}
