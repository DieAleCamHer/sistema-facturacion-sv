<?php

namespace App\Models;

use App\Utils\Database;
use PDO;

/**
 * Modelo EventoInvalidacion
 * Maneja los eventos de invalidación de DTEs
 */
class EventoInvalidacion
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * Crear evento de invalidación
     * 
     * @param array $datos
     * @return int ID del evento creado
     */
    public function crear(array $datos): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO evento_invalidacion 
             (dte_id, usuario_id, motivo, fecha_evento, json_evento, codigo_generacion, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );

        $stmt->execute([
            $datos['dte_id'],
            $datos['usuario_id'],
            $datos['motivo'],
            $datos['fecha_evento'] ?? date('Y-m-d H:i:s'),
            $datos['json_evento'] ?? null,
            $datos['codigo_generacion'],
            $datos['estado'] ?? 'procesado'
        ]);

        return (int) $this->db->lastInsertId();
    }

    /**
     * Buscar eventos por DTE
     * 
     * @param int $dteId
     * @return array
     */
    public function findByDte(int $dteId): array
    {
        $stmt = $this->db->prepare(
            "SELECT e.*, u.nombre_completo as usuario_nombre
             FROM evento_invalidacion e
             INNER JOIN usuario u ON e.usuario_id = u.id
             WHERE e.dte_id = ?
             ORDER BY e.fecha_evento DESC"
        );
        
        $stmt->execute([$dteId]);
        return $stmt->fetchAll();
    }

    /**
     * Verificar si un DTE ya tiene evento de invalidación
     * 
     * @param int $dteId
     * @return bool
     */
    public function existeEvento(int $dteId): bool
    {
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) FROM evento_invalidacion WHERE dte_id = ?"
        );
        
        $stmt->execute([$dteId]);
        return $stmt->fetchColumn() > 0;
    }

    /**
     * Listar todos los eventos
     * 
     * @param int $limit
     * @return array
     */
    public function listar(int $limit = 100): array
    {
        $stmt = $this->db->prepare(
            "SELECT e.*, 
                    u.nombre_completo as usuario_nombre,
                    d.numero_control as dte_numero_control,
                    d.tipo_dte
             FROM evento_invalidacion e
             INNER JOIN usuario u ON e.usuario_id = u.id
             INNER JOIN dte d ON e.dte_id = d.id
             ORDER BY e.fecha_evento DESC
             LIMIT ?"
        );
        
        $stmt->execute([$limit]);
        return $stmt->fetchAll();
    }
}
