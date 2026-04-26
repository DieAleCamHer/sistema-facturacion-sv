<?php

namespace App\Models;

use App\Utils\Database;
use PDO;
use Exception;

class Producto
{
    private $conn;
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
        $this->conn = $this->db; 
    }

    /**
     * Listar todos los productos activos
     */
    public function listar()
    {
        $sql = "SELECT * FROM producto WHERE activo = 1 ORDER BY descripcion ASC";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Buscar producto por ID
     */
    public function findById($id)
    {
        $sql = "SELECT * FROM producto WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    /**
     * Crear nuevo producto
     */
    public function crear($datos)
    {
        $sql = "INSERT INTO producto (
            codigo, descripcion, precio, stock, tipo_item, 
            unidad_medida, tributo, activo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            $datos['codigo'],
            $datos['descripcion'],
            $datos['precio'],
            isset($datos['stock']) ? $datos['stock'] : 0,
            isset($datos['tipo_item']) ? $datos['tipo_item'] : '1',
            isset($datos['unidad_medida']) ? $datos['unidad_medida'] : '59',
            isset($datos['tributo']) ? $datos['tributo'] : '20'
        ]);
        
        return $this->conn->lastInsertId();
    }

    /**
     * Actualizar producto
     */
    public function actualizar($id, $datos)
    {
        $sql = "UPDATE producto SET
            codigo = ?,
            descripcion = ?,
            precio = ?,
            stock = ?,
            tipo_item = ?,
            unidad_medida = ?,
            tributo = ?
        WHERE id = ?";
        
        $stmt = $this->conn->prepare($sql);
        return $stmt->execute([
            $datos['codigo'],
            $datos['descripcion'],
            $datos['precio'],
            $datos['stock'],
            $datos['tipo_item'],
            $datos['unidad_medida'],
            $datos['tributo'],
            $id
        ]);
    }

    /**
     * Eliminar producto (soft delete)
     */
    public function eliminar($id)
    {
        $sql = "UPDATE producto SET activo = 0 WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        return $stmt->execute([$id]);
    }

    /**
     * Verificar stock disponible
     */
    public function verificarStock($productoId, $cantidad)
    {
        $producto = $this->findById($productoId);
        
        if (!$producto) {
            return false;
        }

        // Servicios
        if ($producto['tipo_item'] == '2') {
            return true;
        }

        // verifica stock de bienes
        return $producto['stock'] >= $cantidad;
    }

    /**
     * Descontar stock al emitir DTE
     */
    public function descontarStock($productoId, $cantidad)
    {
       
        $sql = "UPDATE producto 
                SET stock = stock - ? 
                WHERE id = ? 
                  AND activo = 1 
                  AND tipo_item != '2'";
        
        $stmt = $this->conn->prepare($sql);
        return $stmt->execute([$cantidad, $productoId]);
    }

    /**
     * Incrementar stock (para devoluciones/notas de crédito)
     * Pero no incrementa servicios
     */
    public function incrementarStock($productoId, $cantidad)
    {
        // Solo incrementar stock de BIENES
        $sql = "UPDATE producto 
                SET stock = stock + ? 
                WHERE id = ? 
                  AND activo = 1 
                  AND tipo_item != '2'";
        
        $stmt = $this->conn->prepare($sql);
        return $stmt->execute([$cantidad, $productoId]);
    }

    /**
     * Buscar productos por código
     */
    public function findByCodigo($codigo)
    {
        $sql = "SELECT * FROM producto WHERE codigo = ? AND activo = 1";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$codigo]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    /**
     * Buscar productos por descripción (búsqueda parcial)
     */
    public function buscarPorDescripcion($termino)
    {
        $sql = "SELECT * FROM producto 
                WHERE descripcion LIKE ? 
                  AND activo = 1 
                ORDER BY descripcion 
                LIMIT 20";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute(['%' . $termino . '%']);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}