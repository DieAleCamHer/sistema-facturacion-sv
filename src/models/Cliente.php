<?php

namespace App\Models;

use App\Utils\Database;
use PDO;

/**
 * Modelo de Cliente
 */
class Cliente
{
    private $conn;

    public function __construct()
    {
        $db = Database::getInstance();
        $this->conn = $db->getConnection();
    }

    /**
     * Listar todos los clientes activos
     */
    public function listarTodos()
    {
        $sql = "SELECT * FROM cliente WHERE activo = 1 ORDER BY nombre ASC";
        $stmt = $this->conn->query($sql);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Obtener cliente por ID
     */
    public function findById($id)
    {
        $sql = "SELECT * FROM cliente WHERE id = ? AND activo = 1";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Buscar cliente por documento
     */
    public function findByDocumento($numDocumento)
    {
        $sql = "SELECT * FROM cliente WHERE num_documento = ? AND activo = 1";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$numDocumento]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Crear nuevo cliente
     */
    public function crear($data)
    {
        if ($this->findByDocumento($data['num_documento'])) {
            throw new \Exception('Ya existe un cliente con ese número de documento');
        }

        $sql = "INSERT INTO cliente (nombre, tipo_documento, num_documento, nrc, email, telefono, direccion, departamento, municipio, actividad_economica) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            $data['nombre'],
            $data['tipo_documento'],
            $data['num_documento'],
            $data['nrc'] ?? null,
            $data['email'] ?? null,
            $data['telefono'] ?? null,
            $data['direccion'] ?? null,
            $data['departamento'] ?? null,
            $data['municipio'] ?? null,
            $data['actividad_economica'] ?? null
        ]);

        return $this->conn->lastInsertId();
    }

    /**
     * Actualizar cliente
     */
    public function actualizar($id, $data)
    {
        $existente = $this->findByDocumento($data['num_documento']);
        if ($existente && $existente['id'] != $id) {
            throw new \Exception('Ya existe otro cliente con ese número de documento');
        }

        $sql = "UPDATE cliente 
                SET nombre = ?, tipo_documento = ?, num_documento = ?, nrc = ?, 
                    email = ?, telefono = ?, direccion = ?, departamento = ?, municipio = ?, actividad_economica = ?
                WHERE id = ? AND activo = 1";
        
        $stmt = $this->conn->prepare($sql);
        return $stmt->execute([
            $data['nombre'],
            $data['tipo_documento'],
            $data['num_documento'],
            $data['nrc'] ?? null,
            $data['email'] ?? null,
            $data['telefono'] ?? null,
            $data['direccion'] ?? null,
            $data['departamento'] ?? null,
            $data['municipio'] ?? null,
            $data['actividad_economica'] ?? null,
            $id
        ]);
    }

    /**
     * Eliminar cliente (soft delete)
     */
    public function eliminar($id)
    {
        $sql = "SELECT COUNT(*) FROM dte WHERE cliente_id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id]);
        
        if ($stmt->fetchColumn() > 0) {
            throw new \Exception('No se puede eliminar: el cliente tiene DTEs registrados');
        }

        $sql = "UPDATE cliente SET activo = 0 WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        return $stmt->execute([$id]);
    }

    /**
     * Crear o actualizar cliente
     */
    public function crearOActualizar($data)
    {
        $existente = $this->findByDocumento($data['num_documento']);
        
        if ($existente) {
            $this->actualizar($existente['id'], $data);
            return $existente['id'];
        } else {
            return $this->crear($data);
        }
    }
}