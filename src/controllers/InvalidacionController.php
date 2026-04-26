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

    public function __construct()
    {
        $this->dteModel = new DTE();
        $this->eventoModel = new EventoInvalidacion();
        $this->dteGenerator = new DTEGenerator();
    }

    /**
     * Obtener tiempo límite según tipo de DTE
     * - Factura (01): 3 meses = 2160 horas
     * - CCF (03): 1 día = 24 horas
     * - Nota Crédito (05): 1 día = 24 horas
     */
    private function obtenerTiempoLimite(string $tipoDte): int
    {
        return match($tipoDte) {
            '01' => 2160,    // Factura: 3 meses
            '03' => 24,      // CCF: 1 día
            '05' => 24,      // Nota Crédito: 1 día
            default => 72
        };
    }

    /**
     * Validar tipo de invalidación según CAT-024
     */
    private function validarTipoInvalidacion(int $tipo): bool
    {
        return in_array($tipo, [1, 2, 3]);
    }

    public function puedeInvalidar(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $dteId = (int) $args['id'];

        try {
            $dte = $this->dteModel->findById($dteId);
            
            if (!$dte) {
                return Response::error($response, 'DTE no encontrado', 404);
            }

            if ($dte['estado'] !== 'procesado') {
                return Response::success($response, [
                    'puede_invalidar' => false,
                    'razon' => 'El DTE no está en estado procesado'
                ]);
            }

            $tiempoLimite = $this->obtenerTiempoLimite($dte['tipo_dte']);
            $horasTranscurridas = (time() - strtotime($dte['creado_en'])) / 3600;

            if ($horasTranscurridas > $tiempoLimite) {
                $nombreDte = match($dte['tipo_dte']) {
                    '01' => 'Factura (3 meses)',
                    '03' => 'CCF (1 día)',
                    '05' => 'Nota de Crédito (1 día)',
                    default => 'DTE'
                };
                
                return Response::success($response, [
                    'puede_invalidar' => false,
                    'razon' => "Fuera de plazo para {$nombreDte}. Transcurridas: " . round($horasTranscurridas) . "h"
                ]);
            }

            if ($this->eventoModel->existeEvento($dteId)) {
                return Response::success($response, [
                    'puede_invalidar' => false,
                    'razon' => 'Ya existe un evento de invalidación'
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

    private function verificarValidez(int $dteId): array
    {
        $dte = $this->dteModel->findById($dteId);
        
        if (!$dte) {
            return ['puede' => false, 'razon' => 'DTE no encontrado'];
        }

        if ($dte['estado'] !== 'procesado') {
            return ['puede' => false, 'razon' => 'DTE no procesado'];
        }

        $tiempoLimite = $this->obtenerTiempoLimite($dte['tipo_dte']);
        $horasTranscurridas = (time() - strtotime($dte['creado_en'])) / 3600;

        if ($horasTranscurridas > $tiempoLimite) {
            return ['puede' => false, 'razon' => 'Fuera de plazo'];
        }

        if ($this->eventoModel->existeEvento($dteId)) {
            return ['puede' => false, 'razon' => 'Ya invalidado'];
        }

        return ['puede' => true, 'razon' => ''];
    }

    public function invalidar(ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $dteId = (int) $args['id'];
        $data = $request->getParsedBody();
        $user = $request->getAttribute('user');

        try {
            // Validar campos requeridos
            if (empty($data['tipo_invalidacion'])) {
                return Response::error($response, 'Tipo de invalidación requerido', 400);
            }

            if (empty($data['motivo'])) {
                return Response::error($response, 'Motivo requerido', 400);
            }

            // Validar tipo según CAT-024
            $tipoInvalidacion = (int) $data['tipo_invalidacion'];
            if (!$this->validarTipoInvalidacion($tipoInvalidacion)) {
                return Response::error($response, 'Tipo de invalidación inválido. Debe ser 1, 2 o 3 (CAT-024)', 400);
            }

            // Validar longitud del motivo
            if (strlen($data['motivo']) < 5 || strlen($data['motivo']) > 250) {
                return Response::error($response, 'El motivo debe tener entre 5 y 250 caracteres', 400);
            }

            $dte = $this->dteModel->findById($dteId);
            
            if (!$dte) {
                return Response::error($response, 'DTE no encontrado', 404);
            }

            $verificacion = $this->verificarValidez($dteId);
            
            if (!$verificacion['puede']) {
                return Response::error($response, $verificacion['razon'], 400);
            }

            $codigoEvento = $this->dteGenerator->generarCodigoGeneracion();
            
            // Generar JSON del evento según schema oficial
            $jsonEvento = [
                'identificacion' => [
                    'version' => 1,
                    'ambiente' => '00',
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
                    'tipoInvalidacion' => 1,
                ],
                'motivo' => [
                    'tipoAnulacion' => $tipoInvalidacion, // CAT-024: 1, 2 o 3
                    'motivoAnulacion' => $data['motivo'],
                    'nombreResponsable' => $user->nombre ?? 'Sistema',
                    'tipDocResponsable' => '36',
                    'numDocResponsable' => '06142023471012',
                ]
            ];

            // Guardar evento
            $eventoId = $this->eventoModel->crear([
                'dte_id' => $dteId,
                'usuario_id' => $user->user_id,
                'tipo_invalidacion' => $tipoInvalidacion,
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
                'tipo_invalidacion' => $tipoInvalidacion,
                'dte_id' => $dteId
            ]);

        } catch (\Exception $e) {
            return Response::error($response, $e->getMessage(), 500);
        }
    }
}