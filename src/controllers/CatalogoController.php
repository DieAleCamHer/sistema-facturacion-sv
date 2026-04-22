<?php

namespace App\Controllers;

use App\Utils\Database;
use App\Utils\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use PDO;

/**
 * Controlador de Catálogos de Hacienda
 */
class CatalogoController
{
    private $conn;

    public function __construct()
    {
        $db = Database::getInstance();
        $this->conn = $db->getConnection();
    }

    /**
     * GET /api/catalogos/{tipo}
     * Obtener catálogo por tipo
     * 
     * Tipos disponibles:
     * - 13: Tipo de Documento de Identificación
     * - 17: Condición de la Operación
     * - 18: Forma de Pago
     * - 19: Tipo de Ítem
     * - 20: Unidad de Medida
     */
    public function obtenerPorTipo(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $tipo = (int) $args['tipo'];

        $sql = "SELECT codigo, valor FROM catalogo WHERE tipo = ? ORDER BY valor ASC";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$tipo]);
        $catalogos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($catalogos)) {
            return Response::error($response, 'Catálogo no encontrado', 404);
        }

        return Response::success($response, $catalogos);
    }

    /**
     * GET /api/catalogos
     * Obtener todos los catálogos organizados por tipo
     */
    public function obtenerTodos(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $sql = "SELECT tipo, codigo, valor FROM catalogo ORDER BY tipo, valor";
        $stmt = $this->conn->query($sql);
        $todos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Organizar por tipo
        $catalogos = [
            'tipo_documento' => [],      // 13
            'condicion_operacion' => [], // 17
            'forma_pago' => [],          // 18
            'tipo_item' => [],           // 19
            'unidad_medida' => []        // 20
        ];

        foreach ($todos as $item) {
            switch ($item['tipo']) {
                case 13:
                    $catalogos['tipo_documento'][] = ['codigo' => $item['codigo'], 'valor' => $item['valor']];
                    break;
                case 17:
                    $catalogos['condicion_operacion'][] = ['codigo' => $item['codigo'], 'valor' => $item['valor']];
                    break;
                case 18:
                    $catalogos['forma_pago'][] = ['codigo' => $item['codigo'], 'valor' => $item['valor']];
                    break;
                case 19:
                    $catalogos['tipo_item'][] = ['codigo' => $item['codigo'], 'valor' => $item['valor']];
                    break;
                case 20:
                    $catalogos['unidad_medida'][] = ['codigo' => $item['codigo'], 'valor' => $item['valor']];
                    break;
            }
        }

        return Response::success($response, $catalogos);
    }
}
