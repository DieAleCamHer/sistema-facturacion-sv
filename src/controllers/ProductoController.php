<?php

namespace App\Controllers;

use App\Models\Producto;
use App\Utils\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Exception;

class ProductoController
{
    private $productoModel;

    public function __construct()
    {
        $this->productoModel = new Producto();
    }

    /**
     * GET /api/productos
     * Listar todos los productos
     */
    public function listar(
        ServerRequestInterface $request,
        ResponseInterface $response
    ): ResponseInterface {
        try {
            $productos = $this->productoModel->listar();
            return Response::success($response, $productos);
        } catch (Exception $e) {
            return Response::error($response, $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/productos/{id}
     * Obtener un producto específico
     */
    public function obtener(
        ServerRequestInterface $request,
        ResponseInterface $response,
        array $args
    ): ResponseInterface {
        $id = (int) $args['id'];

        try {
            $producto = $this->productoModel->findById($id);
            
            if (!$producto) {
                return Response::error($response, 'Producto no encontrado', 404);
            }

            return Response::success($response, $producto);
        } catch (Exception $e) {
            return Response::error($response, $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/productos
     * Crear nuevo producto
     */
    public function crear(
        ServerRequestInterface $request,
        ResponseInterface $response
    ): ResponseInterface {
        $data = $request->getParsedBody();

        // VALIDACIONES
        if (empty($data['codigo'])) {
            return Response::error($response, 'El código es requerido', 400);
        }

        if (empty($data['descripcion'])) {
            return Response::error($response, 'La descripción es requerida', 400);
        }

        if (!isset($data['precio']) || $data['precio'] <= 0) {
            return Response::error($response, 'El precio debe ser mayor a 0', 400);
        }

        if ($data['precio'] > 99999999.99) {
            return Response::error($response, 'El precio excede el límite permitido', 400);
        }

        // VALIDACIÓN CRÍTICA: Servicios NO pueden tener stock > 0
        $tipoItem = isset($data['tipo_item']) ? $data['tipo_item'] : '1';
        $stock = isset($data['stock']) ? (int) $data['stock'] : 0;

        if ($tipoItem === '2' && $stock > 0) {
            return Response::error(
                $response,
                'Los servicios (tipo_item = 2) no pueden tener stock. El stock debe ser 0.',
                400
            );
        }

        // Para bienes, validar que stock no sea negativo
        if ($tipoItem === '1' && $stock < 0) {
            return Response::error($response, 'El stock no puede ser negativo', 400);
        }

        // Forzar stock = 0 para servicios (por si acaso)
        if ($tipoItem === '2') {
            $data['stock'] = 0;
        }

        try {
            $id = $this->productoModel->crear($data);
            
            return Response::success($response, [
                'mensaje' => 'Producto creado exitosamente',
                'id' => $id
            ], 201);
        } catch (Exception $e) {
            return Response::error($response, $e->getMessage(), 500);
        }
    }

    /**
     * PUT /api/productos/{id}
     * Actualizar producto existente
     */
    public function actualizar(
        ServerRequestInterface $request,
        ResponseInterface $response,
        array $args
    ): ResponseInterface {
        $id = (int) $args['id'];
        $data = $request->getParsedBody();

        // Verificar que existe
        $producto = $this->productoModel->findById($id);
        if (!$producto) {
            return Response::error($response, 'Producto no encontrado', 404);
        }

        // VALIDACIÓN CRÍTICA: Servicios NO pueden tener stock > 0
        $tipoItem = isset($data['tipo_item']) ? $data['tipo_item'] : $producto['tipo_item'];
        $stock = isset($data['stock']) ? (int) $data['stock'] : 0;

        if ($tipoItem === '2' && $stock > 0) {
            return Response::error(
                $response,
                'Los servicios no pueden tener stock. Se ajustará a 0.',
                400
            );
        }

        if ($tipoItem === '1' && $stock < 0) {
            return Response::error($response, 'El stock no puede ser negativo', 400);
        }

        // Forzar stock = 0 para servicios
        if ($tipoItem === '2') {
            $data['stock'] = 0;
        }

        // Validar precio si se está actualizando
        if (isset($data['precio'])) {
            if ($data['precio'] <= 0) {
                return Response::error($response, 'El precio debe ser mayor a 0', 400);
            }
            if ($data['precio'] > 99999999.99) {
                return Response::error($response, 'El precio excede el límite', 400);
            }
        }

        try {
            $this->productoModel->actualizar($id, $data);
            
            return Response::success($response, [
                'mensaje' => 'Producto actualizado exitosamente'
            ]);
        } catch (Exception $e) {
            return Response::error($response, $e->getMessage(), 500);
        }
    }

    /**
     * DELETE /api/productos/{id}
     * Eliminar producto (soft delete)
     */
    public function eliminar(
        ServerRequestInterface $request,
        ResponseInterface $response,
        array $args
    ): ResponseInterface {
        $id = (int) $args['id'];

        try {
            $this->productoModel->eliminar($id);
            
            return Response::success($response, [
                'mensaje' => 'Producto eliminado exitosamente'
            ]);
        } catch (Exception $e) {
            return Response::error($response, $e->getMessage(), 400);
        }
    }
};