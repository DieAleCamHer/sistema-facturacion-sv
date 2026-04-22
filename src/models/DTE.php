<?php

namespace App\Models;

use App\Utils\Database;
use PDO;

/**
 * Modelo DTE
 * Representa Documentos Tributarios Electrónicos
 */
class DTE
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * Listar DTEs con filtros opcionales
     * 
     * @param array $filtros (opcional: tipo_dte, numero_caja, estado, usuario_id)
     * @return array
     */
    public function listar(array $filtros = []): array
    {
        $sql = "SELECT d.*, 
                       u.nombre_completo as usuario_nombre,
                       u.email as usuario_email,
                       u.numero_caja as usuario_numero_caja,
                       c.nombre as cliente_nombre, 
                       c.num_documento as cliente_doc,
                       c.nrc as cliente_nrc
                FROM dte d
                LEFT JOIN usuario u ON d.usuario_id = u.id
                LEFT JOIN cliente c ON d.cliente_id = c.id
                WHERE 1=1";
 
        $params = [];
 
        if (isset($filtros['tipo_dte'])) {
            $sql .= " AND d.tipo_dte = ?";
            $params[] = $filtros['tipo_dte'];
        }
 
        if (isset($filtros['numero_caja'])) {
            $sql .= " AND d.numero_caja = ?";
            $params[] = $filtros['numero_caja'];
        }
 
        if (isset($filtros['estado'])) {
            $sql .= " AND d.estado = ?";
            $params[] = $filtros['estado'];
        }
 
        if (isset($filtros['usuario_id'])) {
            $sql .= " AND d.usuario_id = ?";
            $params[] = $filtros['usuario_id'];
        }
 
        $sql .= " ORDER BY d.creado_en DESC LIMIT 100";
 
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
 
        return $stmt->fetchAll();
    }

    /**
     * Buscar DTE por ID
     * 
     * @param int $id
     * @return array|null
     */
    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT d.*, 
                    u.nombre_completo as usuario_nombre,
                    u.email as usuario_email,
                    u.numero_caja as usuario_numero_caja,
                    c.nombre as cliente_nombre, 
                    c.num_documento as cliente_doc,
                    c.nrc as cliente_nrc,
                    c.tipo_documento as cliente_tipo_documento,
                    c.email as cliente_email
             FROM dte d
             LEFT JOIN usuario u ON d.usuario_id = u.id
             LEFT JOIN cliente c ON d.cliente_id = c.id
             WHERE d.id = ?"
        );
        $stmt->execute([$id]);
        $dte = $stmt->fetch();
 
        if (!$dte) {
            return null;
        }
 
        // Obtener detalles (productos)
        $dte['detalles'] = $this->obtenerDetalles($id);
 
        return $dte;
    }

    /**
     * Obtener detalles (productos) de un DTE
     * 
     * @param int $dteId
     * @return array
     */
    public function obtenerDetalles(int $dteId): array
    {
        $stmt = $this->db->prepare(
            "SELECT dd.*, p.codigo, p.descripcion, p.tipo_item, p.unidad_medida
             FROM detalle_dte dd
             INNER JOIN producto p ON dd.producto_id = p.id
             WHERE dd.dte_id = ?
             ORDER BY dd.numero_item ASC"
        );
        $stmt->execute([$dteId]);

        return $stmt->fetchAll();
    }

    /**
     * Crear nuevo DTE
     * 
     * @param array $datos
     * @return int ID del DTE creado
     */
    public function crear(array $datos): int
    {
        try {
            $this->db->beginTransaction();

            // Insertar DTE
            $stmt = $this->db->prepare(
                "INSERT INTO dte 
                 (codigo_generacion, numero_control, tipo_dte, usuario_id, numero_caja,
                  cliente_id, cliente_temporal, dte_relacionado_id, subtotal, iva, total, json_dte, firma_simulada, 
                  sello_simulado, ruta_pdf, estado) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );

            $stmt->execute([
                $datos['codigo_generacion'],
                $datos['numero_control'],
                $datos['tipo_dte'],
                $datos['usuario_id'],
                $datos['numero_caja'],
                $datos['cliente_id'],
                $datos['cliente_temporal'] ?? null,
                $datos['dte_relacionado_id'] ?? null,
                $datos['subtotal'],
                $datos['iva'],
                $datos['total'],
                json_encode($datos['json_dte'], JSON_UNESCAPED_UNICODE),
                $datos['firma_simulada'],
                $datos['sello_simulado'],
                $datos['ruta_pdf'] ?? null,
                'procesado'
            ]);

            $dteId = (int) $this->db->lastInsertId();

            // Insertar detalles
            if (isset($datos['detalles']) && is_array($datos['detalles'])) {
                $this->insertarDetalles($dteId, $datos['detalles']);
            }

            $this->db->commit();
            return $dteId;

        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Insertar detalles de un DTE
     * 
     * @param int $dteId
     * @param array $detalles
     */
    private function insertarDetalles(int $dteId, array $detalles): void
    {
        $stmt = $this->db->prepare(
            "INSERT INTO detalle_dte 
             (dte_id, producto_id, numero_item, cantidad, precio_unitario, subtotal) 
             VALUES (?, ?, ?, ?, ?, ?)"
        );

        foreach ($detalles as $index => $detalle) {
            $stmt->execute([
                $dteId,
                $detalle['producto_id'],
                $index + 1,
                $detalle['cantidad'],
                $detalle['precio_unitario'],
                $detalle['subtotal']
            ]);
        }
    }

    /**
     * Invalidar un DTE
     * 
     * @param int $id
     * @param string $motivo
     * @param int $usuarioId
     * @return bool
     */
    public function invalidar(int $id, string $motivo, int $usuarioId): bool
    {
        $stmt = $this->db->prepare(
            "UPDATE dte 
             SET estado = 'invalidado', 
                 motivo_invalidacion = ?, 
                 fecha_invalidacion = NOW(),
                 invalidado_por = ?
             WHERE id = ? AND estado = 'procesado'"
        );

        return $stmt->execute([$motivo, $usuarioId, $id]);
    }

    /**
     * Obtener siguiente correlativo para una caja y tipo de DTE
     * 
     * @param string $tipoDTE
     * @param int $numeroCaja
     * @return int
     */
    public function obtenerSiguienteCorrelativo(string $tipoDTE, int $numeroCaja): int
    {
        $stmt = $this->db->prepare(
            "SELECT COALESCE(MAX(CAST(SUBSTRING(numero_control, -8) AS UNSIGNED)), 0) as ultimo
             FROM dte 
             WHERE tipo_dte = ? AND numero_caja = ?"
        );
        $stmt->execute([$tipoDTE, $numeroCaja]);
        $resultado = $stmt->fetch();

        return ((int) $resultado['ultimo']) + 1;
    }

    public function actualizarEstado(int $id, string $estado): bool
    {
        $stmt = $this->db->prepare(
            "UPDATE dte SET estado = ? WHERE id = ?"
        );
        
        return $stmt->execute([$estado, $id]);
    }
}
