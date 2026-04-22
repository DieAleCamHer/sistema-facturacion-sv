<?php

namespace App\Models;

use App\Utils\Database;
use PDO;

/**
 * Modelo de Producto
 */
class Producto
{
    private $conn;

    public function __construct()
    {
        $db = Database::getInstance();
        $this->conn = $db->getConnection();
    }

    /**
     * Listar todos los productos activos
     */
    public function listarTodos()
    {
        $sql = "SELECT * FROM producto WHERE activo = 1 ORDER BY descripcion ASC";
        $stmt = $this->conn->query($sql);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Obtener producto por ID
     */
    public function findById($id)
    {
        $sql = "SELECT * FROM producto WHERE id = ? AND activo = 1";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Crear nuevo producto
     */
    public function crear($data)
    {
        $sql = "INSERT INTO producto (codigo, descripcion, precio, stock, tipo_item, unidad_medida, tributo) 
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            $data['codigo'],
            $data['descripcion'],
            $data['precio'],
            $data['stock'] ?? 0,
            $data['tipo_item'] ?? 1, // 1=Bien, 2=Servicio
            $data['unidad_medida'] ?? 59, // 59=Unidad
            $data['tributo'] ?? '20' // 20=IVA
        ]);

        return $this->conn->lastInsertId();
    }

    /**
     * Actualizar producto
     */
    public function actualizar($id, $data)
    {
        $sql = "UPDATE producto 
                SET codigo = ?, descripcion = ?, precio = ?, stock = ?, 
                    tipo_item = ?, unidad_medida = ?, tributo = ?
                WHERE id = ? AND activo = 1";
        
        $stmt = $this->conn->prepare($sql);
        return $stmt->execute([
            $data['codigo'],
            $data['descripcion'],
            $data['precio'],
            $data['stock'] ?? 0,
            $data['tipo_item'] ?? 1,
            $data['unidad_medida'] ?? 59,
            $data['tributo'] ?? '20',
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
     * Verificar si hay stock suficiente
     */
    public function verificarStock($productoId, $cantidad)
    {
        $producto = $this->findById($productoId);
        
        if (!$producto) {
            return false;
        }

        return $producto['stock'] >= $cantidad;
    }

    /**
     * Descontar stock
     */
    public function descontarStock($productoId, $cantidad)
    {
        $sql = "UPDATE producto SET stock = stock - ? WHERE id = ? AND activo = 1";
        $stmt = $this->conn->prepare($sql);
        return $stmt->execute([$cantidad, $productoId]);
    }

    /**
     * Devolver stock (cuando se invalida un DTE)
     */
    public function devolverStock($productoId, $cantidad)
    {
        $sql = "UPDATE producto SET stock = stock + ? WHERE id = ? AND activo = 1";
        $stmt = $this->conn->prepare($sql);
        return $stmt->execute([$cantidad, $productoId]);
    }

    /**
     * Verificar si código ya existe
     */
    public function existeCodigo($codigo, $idExcluir = null)
    {
        if ($idExcluir) {
            $sql = "SELECT COUNT(*) FROM producto WHERE codigo = ? AND id != ? AND activo = 1";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$codigo, $idExcluir]);
        } else {
            $sql = "SELECT COUNT(*) FROM producto WHERE codigo = ? AND activo = 1";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$codigo]);
        }
        
        return $stmt->fetchColumn() > 0;
    }
}