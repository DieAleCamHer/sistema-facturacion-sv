<?php

namespace App\Controllers;

use App\Models\Producto;
use App\Utils\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Controlador de Productos
 */
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
    public function listar(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $productos = $this->productoModel->listarTodos();
        return Response::success($response, $productos, 'Productos obtenidos exitosamente');
    }

    /**
     * POST /api/productos
     * Crear nuevo producto
     */
    public function crear(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $data = $request->getParsedBody();

        // Validaciones
        if (empty($data['codigo']) || empty($data['descripcion']) || !isset($data['precio'])) {
            return Response::error(
                $response,
                'Código, descripción y precio son requeridos',
                400
            );
        }

        // Validar que el precio sea numérico y positivo
        if (!is_numeric($data['precio']) || $data['precio'] < 0) {
            return Response::error($response, 'El precio debe ser un número positivo', 400);
        }

        // Validar que el stock sea numérico y no negativo
        if (isset($data['stock']) && (!is_numeric($data['stock']) || $data['stock'] < 0)) {
            return Response::error($response, 'El stock debe ser un número positivo', 400);
        }

        // Verificar si el código ya existe
        if ($this->productoModel->existeCodigo($data['codigo'])) {
            return Response::error($response, 'Ya existe un producto con ese código', 400);
        }

        try {
            $productoId = $this->productoModel->crear($data);

            return Response::success(
                $response,
                ['id' => $productoId],
                'Producto creado exitosamente',
                201
            );
        } catch (\Exception $e) {
            return Response::error($response, $e->getMessage(), 400);
        }
    }

    /**
     * GET /api/productos/{id}
     * Obtener producto por ID
     */
    public function obtener(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = (int) $args['id'];
        $producto = $this->productoModel->findById($id);

        if (!$producto) {
            return Response::notFound($response, 'Producto no encontrado');
        }

        return Response::success($response, $producto);
    }

    /**
     * PUT /api/productos/{id}
     * Actualizar producto
     */
    public function actualizar(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = (int) $args['id'];
        $data = $request->getParsedBody();

        // Verificar que existe
        $producto = $this->productoModel->findById($id);
        if (!$producto) {
            return Response::notFound($response, 'Producto no encontrado');
        }

        // Validaciones
        if (isset($data['precio']) && (!is_numeric($data['precio']) || $data['precio'] < 0)) {
            return Response::error($response, 'El precio debe ser un número positivo', 400);
        }

        if (isset($data['stock']) && (!is_numeric($data['stock']) || $data['stock'] < 0)) {
            return Response::error($response, 'El stock debe ser un número positivo', 400);
        }

        // Verificar si el código ya existe en otro producto
        if (isset($data['codigo']) && $this->productoModel->existeCodigo($data['codigo'], $id)) {
            return Response::error($response, 'Ya existe otro producto con ese código', 400);
        }

        try {
            $resultado = $this->productoModel->actualizar($id, $data);

            if (!$resultado) {
                return Response::error($response, 'Error al actualizar producto', 500);
            }

            return Response::success($response, ['id' => $id], 'Producto actualizado exitosamente');
        } catch (\Exception $e) {
            return Response::error($response, $e->getMessage(), 400);
        }
    }

    /**
     * DELETE /api/productos/{id}
     * Eliminar producto (soft delete)
     */
    public function eliminar(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = (int) $args['id'];

        $producto = $this->productoModel->findById($id);
        if (!$producto) {
            return Response::notFound($response, 'Producto no encontrado');
        }

        try {
            $resultado = $this->productoModel->eliminar($id);

            if (!$resultado) {
                return Response::error($response, 'Error al eliminar producto', 500);
            }

            return Response::success($response, ['id' => $id], 'Producto eliminado exitosamente');
        } catch (\Exception $e) {
            return Response::error($response, $e->getMessage(), 400);
        }
    }
}
