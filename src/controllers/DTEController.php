<?php

namespace App\Controllers;

use App\Models\DTE;
use App\Models\Cliente;
use App\Models\Producto;
use App\Services\DTEGenerator;
use App\Services\PDFGeneratorFPDF;
use App\Utils\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Controlador de DTEs
 * Maneja creación, listado e invalidación de documentos tributarios
 */
class DTEController
{
    private $dteModel;
    private $clienteModel;
    private $productoModel;
    private $dteGenerator;
    private $pdfGenerator;

    public function __construct()
    {
        $this->dteModel = new DTE();
        $this->clienteModel = new Cliente();
        $this->productoModel = new Producto();
        $this->dteGenerator = new DTEGenerator();
        $this->pdfGenerator = new PDFGeneratorFPDF();
    }

    /**
     * POST /api/dte
     * Crear nuevo DTE (Factura, CCF o Nota de Crédito)
     * 
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @return ResponseInterface
     */
    public function crear(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $data = $request->getParsedBody();
        $user = $request->getAttribute('user'); // Inyectado por middleware

        try {
            // Validaciones básicas
            if (empty($data['tipo_dte']) || empty($data['productos'])) {
                return Response::error(
                    $response,
                    'Datos incompletos: tipo_dte y productos son requeridos',
                    400
                );
            }

            // Validar tipo de DTE
            if (!in_array($data['tipo_dte'], ['01', '03', '05'])) {
                return Response::error(
                    $response,
                    'Tipo de DTE inválido. Debe ser 01 (Factura), 03 (CCF) o 05 (Nota Crédito)',
                    400
                );
            }

            // ==========================================
            // MANEJAR CLIENTE "AL VUELO"
            // ==========================================
            if (!empty($data['cliente_nuevo'])) {
                // Cliente nuevo desde formulario
                if (!empty($data['guardar_cliente']) && $data['guardar_cliente'] === true) {
                    // Opción 1: Guardar cliente permanentemente
                    $clienteId = $this->clienteModel->crearOActualizar($data['cliente_nuevo']);
                    $data['cliente_id'] = $clienteId;
                    $data['cliente_temporal'] = null;
                } else {
                    // Opción 2: Solo guardar en JSON temporal (no en tabla cliente)
                    $data['cliente_id'] = null;
                    $data['cliente_temporal'] = json_encode($data['cliente_nuevo']);
                }
            }

            // Validar cliente según tipo DTE
            if ($data['tipo_dte'] === '03' && empty($data['cliente_id'])) {
                // CCF requiere cliente obligatorio
                return Response::error($response, 'El CCF requiere un cliente válido registrado', 400);
            }

            if ($data['tipo_dte'] === '05' && empty($data['cliente_id'])) {
                // Nota de Crédito requiere cliente
                return Response::error($response, 'La Nota de Crédito requiere un cliente', 400);
            }

            // Validar cliente existe (si se proporcionó ID)
            $cliente = null;
            if (!empty($data['cliente_id'])) {
                $cliente = $this->clienteModel->findById($data['cliente_id']);
                if (!$cliente) {
                    return Response::error($response, 'Cliente no encontrado', 404);
                }
            }

            // Validar productos
            if (!is_array($data['productos']) || count($data['productos']) === 0) {
                return Response::error($response, 'Debe incluir al menos un producto', 400);
            }

            // Generar identificadores
            $codigoGeneracion = $this->dteGenerator->generarCodigoGeneracion();
            $correlativo = $this->dteModel->obtenerSiguienteCorrelativo(
                $data['tipo_dte'],
                $user->numero_caja
            );
            $numeroControl = $this->dteGenerator->generarNumeroControl(
                $data['tipo_dte'],
                $user->numero_caja,
                $correlativo
            );

            // Preparar datos para generador
            $datosGenerador = [
                'tipo_dte' => $data['tipo_dte'],
                'cliente_id' => $data['cliente_id'],
                'productos' => $data['productos'],
                'codigo_generacion' => $codigoGeneracion,
                'numero_control' => $numeroControl,
                'numero_caja' => $user->numero_caja,
            ];

            // Si es Nota de Crédito, agregar referencia al documento original
            if ($data['tipo_dte'] === '05' && !empty($data['dte_relacionado_id'])) {
                $datosGenerador['dte_relacionado_id'] = $data['dte_relacionado_id'];
            }

            // Generar JSON del DTE según tipo
            $jsonDTE = match ($data['tipo_dte']) {
                '01' => $this->dteGenerator->generarFactura($datosGenerador),
                '03' => $this->dteGenerator->generarCCF($datosGenerador),
                '05' => $this->dteGenerator->generarNotaCredito($datosGenerador),
            };

            // ========================================
            // VALIDAR Y DESCONTAR STOCK
            // ========================================
            foreach ($data['productos'] as $item) {
                $productoId = $item['producto_id'];
                $cantidad = (float) $item['cantidad'];

                // Verificar stock suficiente
                if (!$this->productoModel->verificarStock($productoId, $cantidad)) {
                    $producto = $this->productoModel->findById($productoId);
                    return Response::error(
                        $response,
                        "Stock insuficiente para: {$producto['descripcion']} (Disponible: {$producto['stock']}, Solicitado: {$cantidad})",
                        400
                    );
                }

                // Descontar stock
                $this->productoModel->descontarStock($productoId, $cantidad);
            }

            // Calcular totales
            $detalles = [];
            $subtotal = 0;

            foreach ($data['productos'] as $prod) {
                $producto = $this->productoModel->findById($prod['producto_id']);
                $cantidad = (float) $prod['cantidad'];
                $precioUnitario = (float) $producto['precio'];
                $subtotalItem = $cantidad * $precioUnitario;

                $detalles[] = [
                    'producto_id' => $prod['producto_id'],
                    'cantidad' => $cantidad,
                    'precio_unitario' => $precioUnitario,
                    'subtotal' => $subtotalItem,
                ];

                $subtotal += $subtotalItem;
            }

            $iva = round($subtotal * 0.13, 2);
            $total = $subtotal + $iva;

            // Generar firma y sello simulados
            $firmaSimulada = 'FIRMA-SIMULADA-' . date('YmdHis');
            $selloSimulado = 'SELLO-SIMULADO-' . strtoupper(substr(md5($codigoGeneracion), 0, 10));

            // Preparar datos para insertar en BD
            $datosDTE = [
                'codigo_generacion' => $codigoGeneracion,
                'numero_control' => $numeroControl,
                'tipo_dte' => $data['tipo_dte'],
                'usuario_id' => $user->user_id,
                'numero_caja' => $user->numero_caja,
                'cliente_id' => $data['cliente_id'] ?? null,  // Puede ser null en Factura
                'cliente_temporal' => $data['cliente_temporal'] ?? null,  // NUEVO: Cliente al vuelo
                'dte_relacionado_id' => $data['dte_relacionado_id'] ?? null,  // NUEVO: Para NC
                'subtotal' => $subtotal,
                'iva' => $iva,
                'total' => $total,
                'json_dte' => $jsonDTE,
                'firma_simulada' => $firmaSimulada,
                'sello_simulado' => $selloSimulado,
                'detalles' => $detalles,
            ];

            // Guardar en base de datos
            $dteId = $this->dteModel->crear($datosDTE);

            // Obtener DTE completo para generar PDF
            $dteCompleto = $this->dteModel->findById($dteId);

            // Generar PDF
            $nombrePDF = $this->pdfGenerator->generar($dteCompleto);

            // Actualizar ruta del PDF en BD
            $this->dteModel->findById($dteId); // Aquí podrías actualizar la ruta

            // Respuesta exitosa
            return Response::success(
                $response,
                [
                    'id' => $dteId,
                    'codigo_generacion' => $codigoGeneracion,
                    'numero_control' => $numeroControl,
                    'tipo_dte' => $data['tipo_dte'],
                    'subtotal' => $subtotal,
                    'iva' => $iva,
                    'total' => $total,
                    'firma_simulada' => $firmaSimulada,
                    'sello_simulado' => $selloSimulado,
                    'pdf_url' => '/pdfs/' . $nombrePDF,
                    'estado' => 'procesado',
                ],
                'DTE creado exitosamente',
                201
            );
        } catch (\Exception $e) {
            return Response::error(
                $response,
                'Error al crear DTE: ' . $e->getMessage(),
                500
            );
        }
    }

    /**
     * GET /api/dte
     * Listar DTEs con filtros opcionales
     * 
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @return ResponseInterface
     */
    public function listar(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $user = $request->getAttribute('user');
        $queryParams = $request->getQueryParams();

        $filtros = [];

        // Si es facturador, solo ve sus propios DTEs
        if ($user->rol === 'facturador') {
            $filtros['usuario_id'] = $user->user_id;
        }

        // Filtros opcionales
        if (!empty($queryParams['tipo_dte'])) {
            $filtros['tipo_dte'] = $queryParams['tipo_dte'];
        }

        if (!empty($queryParams['numero_caja'])) {
            $filtros['numero_caja'] = $queryParams['numero_caja'];
        }

        if (!empty($queryParams['estado'])) {
            $filtros['estado'] = $queryParams['estado'];
        }

        $dtes = $this->dteModel->listar($filtros);

        return Response::success($response, $dtes, 'DTEs obtenidos exitosamente');
    }

    /**
     * GET /api/dte/{id}
     * Obtener un DTE específico por ID
     * 
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @param array $args
     * @return ResponseInterface
     */
    public function obtener(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = (int) $args['id'];
        $user = $request->getAttribute('user');

        $dte = $this->dteModel->findById($id);

        if (!$dte) {
            return Response::notFound($response, 'DTE no encontrado');
        }

        // Si es facturador, solo puede ver sus propios DTEs
        if ($user->rol === 'facturador' && $dte['usuario_id'] != $user->user_id) {
            return Response::unauthorized($response, 'No tienes permiso para ver este DTE');
        }

        return Response::success($response, $dte);
    }

    /**
     * POST /api/dte/{id}/invalidar
     * Invalidar un DTE
     * 
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @param array $args
     * @return ResponseInterface
     */
    public function invalidar(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = (int) $args['id'];
        $user = $request->getAttribute('user');
        $data = $request->getParsedBody();

        // Validar motivo
        if (empty($data['motivo'])) {
            return Response::error($response, 'El motivo de invalidación es requerido', 400);
        }

        // Verificar que el DTE existe
        $dte = $this->dteModel->findById($id);
        if (!$dte) {
            return Response::notFound($response, 'DTE no encontrado');
        }

        // Verificar que no esté ya invalidado
        if ($dte['estado'] === 'invalidado') {
            return Response::error($response, 'Este DTE ya está invalidado', 400);
        }

        // Invalidar
        $resultado = $this->dteModel->invalidar($id, $data['motivo'], $user->user_id);

        if (!$resultado) {
            return Response::error($response, 'Error al invalidar el DTE', 500);
        }

        return Response::success(
            $response,
            ['id' => $id, 'estado' => 'invalidado'],
            'DTE invalidado exitosamente'
        );
    }

    /**
     * GET /api/dte/{id}/pdf
     * Descargar PDF de un DTE
     * 
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @param array $args
     * @return ResponseInterface
     */
    public function descargarPDF(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $id = (int) $args['id'];
 
        try {
            // Obtener DTE
            $dte = $this->dteModel->findById($id);
            
            if (!$dte) {
                return Response::error($response, 'DTE no encontrado', 404);
            }
 
            // Obtener detalles
            $dte['detalles'] = $this->dteModel->obtenerDetalles($id);
 
            // Generar PDF
            $nombreArchivo = $this->pdfGenerator->generar($dte);
 
            // Ruta completa del PDF
            $rutaPDF = __DIR__ . '/../../storage/pdfs/' . $nombreArchivo;
 
            // Verificar que el archivo existe
            if (!file_exists($rutaPDF)) {
                return Response::error($response, 'PDF no encontrado', 404);
            }
 
            // Leer contenido
            $contenido = file_get_contents($rutaPDF);
 
            if ($contenido === false) {
                return Response::error($response, 'Error al leer el PDF', 500);
            }
 
            // Escribir al response
            $response->getBody()->write($contenido);
 
            return $response
                ->withHeader('Content-Type', 'application/pdf')
                ->withHeader('Content-Disposition', 'attachment; filename="' . $nombreArchivo . '"')
                ->withHeader('Content-Length', (string) filesize($rutaPDF));
 
        } catch (\Exception $e) {
            return Response::error($response, $e->getMessage(), 500);
        }
    }
}