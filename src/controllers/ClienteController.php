<?php

namespace App\Controllers;

use App\Models\Cliente;
use App\Utils\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Controlador de Clientes
 */
class ClienteController
{
    private $clienteModel;

    public function __construct()
    {
        $this->clienteModel = new Cliente();
    }

    /**
     * GET /api/clientes
     * Listar todos los clientes
     */
    public function listar(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $clientes = $this->clienteModel->listarTodos();
        return Response::success($response, $clientes, 'Clientes obtenidos exitosamente');
    }

    /**
     * POST /api/clientes
     * Crear nuevo cliente
     */
    public function crear(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $data = $request->getParsedBody();

        // Validaciones
        if (empty($data['nombre']) || empty($data['tipo_documento']) || empty($data['num_documento'])) {
            return Response::error(
                $response,
                'Nombre, tipo de documento y número de documento son requeridos',
                400
            );
        }

        try {
            $clienteId = $this->clienteModel->crear($data);

            return Response::success(
                $response,
                ['id' => $clienteId],
                'Cliente creado exitosamente',
                201
            );
        } catch (\Exception $e) {
            return Response::error($response, $e->getMessage(), 400);
        }
    }

    /**
     * GET /api/clientes/{id}
     * Obtener cliente por ID
     */
    public function obtener(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = (int) $args['id'];
        $cliente = $this->clienteModel->findById($id);

        if (!$cliente) {
            return Response::notFound($response, 'Cliente no encontrado');
        }

        return Response::success($response, $cliente);
    }

    /**
     * PUT /api/clientes/{id}
     * Actualizar cliente
     */
    public function actualizar(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = (int) $args['id'];
        $data = $request->getParsedBody();

        // Verificar que existe
        $cliente = $this->clienteModel->findById($id);
        if (!$cliente) {
            return Response::notFound($response, 'Cliente no encontrado');
        }

        try {
            $resultado = $this->clienteModel->actualizar($id, $data);

            if (!$resultado) {
                return Response::error($response, 'Error al actualizar cliente', 500);
            }

            return Response::success($response, ['id' => $id], 'Cliente actualizado exitosamente');
        } catch (\Exception $e) {
            return Response::error($response, $e->getMessage(), 400);
        }
    }

    /**
     * DELETE /api/clientes/{id}
     * Eliminar cliente (soft delete)
     */
    public function eliminar(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = (int) $args['id'];

        $cliente = $this->clienteModel->findById($id);
        if (!$cliente) {
            return Response::notFound($response, 'Cliente no encontrado');
        }

        try {
            $resultado = $this->clienteModel->eliminar($id);

            if (!$resultado) {
                return Response::error($response, 'Error al eliminar cliente', 500);
            }

            return Response::success($response, ['id' => $id], 'Cliente eliminado exitosamente');
        } catch (\Exception $e) {
            return Response::error($response, $e->getMessage(), 400);
        }
    }

    /**
     * POST /api/clientes/crear-o-actualizar
     * Crear cliente en el momento o actualizar si ya existe
     */
    public function crearOActualizar(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $data = $request->getParsedBody();

        // Validaciones
        if (empty($data['nombre']) || empty($data['tipo_documento']) || empty($data['num_documento'])) {
            return Response::error(
                $response,
                'Nombre, tipo de documento y número de documento son requeridos',
                400
            );
        }

        try {
            $clienteId = $this->clienteModel->crearOActualizar($data);

            return Response::success(
                $response,
                ['id' => $clienteId],
                'Cliente guardado exitosamente',
                200
            );
        } catch (\Exception $e) {
            return Response::error($response, $e->getMessage(), 400);
        }
    }
}
