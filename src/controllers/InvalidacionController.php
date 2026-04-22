<?php

namespace App\Controllers;

use App\Models\DTE;
use App\Models\EventoInvalidacion;
use App\Services\DTEGenerator;
use App\Utils\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Controlador de Invalidación de DTEs
 */
class InvalidacionController
{
    private $dteModel;
    private $eventoModel;
    private $dteGenerator;
    private $config;

    public function __construct()
    {
        $this->dteModel = new DTE();
        $this->eventoModel = new EventoInvalidacion();
        $this->dteGenerator = new DTEGenerator();
        $this->config = require __DIR__ . '/../../config/config.php';
    }

    /**
     * Verificar si un DTE puede ser invalidado
     * 
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @param array $args
     * @return ResponseInterface
     */
    public function puedeInvalidar(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $dteId = (int) $args['id'];

        try {
            $dte = $this->dteModel->findById($dteId);
            
            if (!$dte) {
                return Response::error($response, 'DTE no encontrado', 404);
            }

            // Verificar estado
            if ($dte['estado'] !== 'procesado') {
                return Response::success($response, [
                    'puede_invalidar' => false,
                    'razon' => 'El DTE no está en estado procesado'
                ]);
            }

            // Verificar tiempo límite (72 horas según normativa)
            $tiempoLimite = $this->config['invalidacion']['tiempo_limite_horas'] ?? 72;
            $horasTranscurridas = (time() - strtotime($dte['creado_en'])) / 3600;

            if ($horasTranscurridas > $tiempoLimite) {
                return Response::success($response, [
                    'puede_invalidar' => false,
                    'razon' => "Fuera de tiempo límite ({$tiempoLimite} horas). Han transcurrido " . round($horasTranscurridas) . " horas"
                ]);
            }

            // Verificar si ya tiene evento de invalidación
            if ($this->eventoModel->existeEvento($dteId)) {
                return Response::success($response, [
                    'puede_invalidar' => false,
                    'razon' => 'Ya existe un evento de invalidación para este DTE'
                ]);
            }

            return Response::success($response, [
                'puede_invalidar' => true,
                'horas_transcurridas' => round($horasTranscurridas, 1),
                'tiempo_limite' => $tiempoLimite
            ]);

        } catch (\Exception $e) {
            return Response::error($response, $e->getMessage(), 500);
        }
    }

    /**
     * Verificar internamente si puede invalidarse (sin response)
     * 
     * @param int $dteId
     * @return array ['puede' => bool, 'razon' => string]
     */
    private function verificarValidez(int $dteId): array
    {
        $dte = $this->dteModel->findById($dteId);
        
        if (!$dte) {
            return ['puede' => false, 'razon' => 'DTE no encontrado'];
        }

        // Verificar estado
        if ($dte['estado'] !== 'procesado') {
            return ['puede' => false, 'razon' => 'El DTE no está en estado procesado'];
        }

        // Verificar tiempo límite
        $tiempoLimite = $this->config['invalidacion']['tiempo_limite_horas'] ?? 72;
        $horasTranscurridas = (time() - strtotime($dte['creado_en'])) / 3600;

        if ($horasTranscurridas > $tiempoLimite) {
            return [
                'puede' => false, 
                'razon' => "Fuera de tiempo límite ({$tiempoLimite} horas). Han transcurrido " . round($horasTranscurridas) . " horas"
            ];
        }

        // Verificar si ya tiene evento
        if ($this->eventoModel->existeEvento($dteId)) {
            return ['puede' => false, 'razon' => 'Ya existe un evento de invalidación para este DTE'];
        }

        return ['puede' => true, 'razon' => ''];
    }

    /**
     * Invalidar un DTE
     * 
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @param array $args
     * @return ResponseInterface
     */
    public function invalidar(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $dteId = (int) $args['id'];
        $data = $request->getParsedBody();
        $user = $request->getAttribute('user');

        try {
            // Validar motivo
            if (empty($data['motivo'])) {
                return Response::error($response, 'El motivo es requerido', 400);
            }

            // Obtener DTE
            $dte = $this->dteModel->findById($dteId);
            
            if (!$dte) {
                return Response::error($response, 'DTE no encontrado', 404);
            }

            // Verificar que puede invalidarse (SIN generar response)
            $verificacion = $this->verificarValidez($dteId);
            
            if (!$verificacion['puede']) {
                return Response::error($response, $verificacion['razon'], 400);
            }

            // Generar evento de invalidación
            $codigoEvento = $this->dteGenerator->generarCodigoGeneracion();
            
            $jsonEvento = [
                'identificacion' => [
                    'version' => 1,
                    'ambiente' => '00', // 00 = Pruebas
                    'codigoGeneracion' => $codigoEvento,
                    'fecEmi' => date('Y-m-d'),
                    'horEmi' => date('H:i:s'),
                ],
                'emisor' => [
                    'nit' => '06142023471012',
                    'nombre' => 'EMPRESA EJEMPLO',
                ],
                'documento' => [
                    'tipoDte' => $dte['tipo_dte'],
                    'codigoGeneracion' => $dte['codigo_generacion'],
                    'selloRecibido' => $dte['sello_simulado'],
                    'numeroControl' => $dte['numero_control'],
                    'fecEmi' => date('Y-m-d', strtotime($dte['creado_en'])),
                    'montoIva' => (float) $dte['iva'],
                    'codigoGeneracionR' => null,
                    'tipoInvalidacion' => 1, // 1 = Emisor, 2 = Receptor
                ],
                'motivo' => [
                    'tipoAnulacion' => 1,
                    'motivoAnulacion' => $data['motivo'],
                    'nombreResponsable' => isset($user->nombre) ? $user->nombre : 'Sistema',
                    'tipDocResponsable' => '36', // NIT
                    'numDocResponsable' => '06142023471012',
                ]
            ];

            // Guardar evento
            $eventoId = $this->eventoModel->crear([
                'dte_id' => $dteId,
                'usuario_id' => $user->user_id,
                'motivo' => $data['motivo'],
                'fecha_evento' => date('Y-m-d H:i:s'),
                'json_evento' => json_encode($jsonEvento),
                'codigo_generacion' => $codigoEvento,
                'estado' => 'procesado'
            ]);

            // Actualizar estado del DTE
            $this->dteModel->actualizarEstado($dteId, 'invalidado');

            return Response::success($response, [
                'mensaje' => 'DTE invalidado exitosamente',
                'evento_id' => $eventoId,
                'codigo_evento' => $codigoEvento,
                'dte_id' => $dteId
            ]);

        } catch (\Exception $e) {
            return Response::error($response, $e->getMessage(), 500);
        }
    }
}