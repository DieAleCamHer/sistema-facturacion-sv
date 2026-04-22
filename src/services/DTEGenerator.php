<?php

namespace App\Services;

use App\Models\Cliente;
use App\Models\Producto;

/**
 * Servicio DTEGenerator
 * Genera JSON de DTEs según schemas oficiales de Hacienda
 */
class DTEGenerator
{
    private $config;
    private $clienteModel;
    private $productoModel;

    public function __construct()
    {
        $this->config = require __DIR__ . '/../../config/config.php';
        $this->clienteModel = new Cliente();
        $this->productoModel = new Producto();
    }

    /**
     * Generar UUID v4 para codigo_generacion
     * 
     * @return string
     */
    public function generarCodigoGeneracion(): string
    {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    /**
     * Generar numero_control
     * Formato: DTE-[TIPO]-CAJA[###]-[########]
     * 
     * @param string $tipoDTE
     * @param int $numeroCaja
     * @param int $correlativo
     * @return string
     */
    public function generarNumeroControl(string $tipoDTE, int $numeroCaja, int $correlativo): string
    {
        return sprintf('DTE-%s-CAJA%03d-%08d', $tipoDTE, $numeroCaja, $correlativo);
    }

    /**
     * Generar JSON de Factura (01)
     * 
     * @param array $datos
     * @return array
     */
    public function generarFactura(array $datos): array
    {
        $cliente = $this->clienteModel->findById($datos['cliente_id']);
        if (!$cliente) {
            throw new \Exception("Cliente no encontrado");
        }

        $cuerpoDocumento = [];
        $subtotalGeneral = 0;

        foreach ($datos['productos'] as $index => $prod) {
            $producto = $this->productoModel->findById($prod['producto_id']);
            if (!$producto) {
                throw new \Exception("Producto no encontrado: " . $prod['producto_id']);
            }

            $cantidad = (float) $prod['cantidad'];
            $precioUni = (float) $producto['precio'];
            $ventaNoSuj = 0;
            $ventaExenta = 0;
            $ventaGravada = $precioUni * $cantidad;

            $item = [
                'numItem' => $index + 1,
                'tipoItem' => (int) $producto['tipo_item'],
                'numeroDocumento' => null,
                'cantidad' => $cantidad,
                'codigo' => $producto['codigo'],
                'codTributo' => null,
                'uniMedida' => (int) $producto['unidad_medida'],
                'descripcion' => $producto['descripcion'],
                'precioUni' => $precioUni,
                'montoDescu' => 0,
                'ventaNoSuj' => $ventaNoSuj,
                'ventaExenta' => $ventaExenta,
                'ventaGravada' => $ventaGravada,
                'tributos' => null,
                'psv' => 0,
                'noGravado' => 0,
            ];

            $cuerpoDocumento[] = $item;
            $subtotalGeneral += $ventaGravada;
        }

        $ivaTotal = round($subtotalGeneral * 0.13, 2);
        $totalPagar = $subtotalGeneral + $ivaTotal;

        $dte = [
            'identificacion' => [
                'version' => 1,
                'ambiente' => '00', // Simulado
                'tipoDte' => '01',
                'numeroControl' => $datos['numero_control'],
                'codigoGeneracion' => $datos['codigo_generacion'],
                'tipoModelo' => 1,
                'tipoOperacion' => 1,
                'tipoContingencia' => null,
                'motivoContin' => null,
                'fecEmi' => date('Y-m-d'),
                'horEmi' => date('H:i:s'),
                'tipoMoneda' => 'USD',
            ],
            'documentoRelacionado' => null,
            'emisor' => [
                'nit' => $this->config['empresa']['nit'],
                'nrc' => '123456-7',
                'nombre' => $this->config['empresa']['nombre'],
                'codActividad' => '62010',
                'descActividad' => $this->config['empresa']['actividad_economica'],
                'nombreComercial' => $this->config['empresa']['nombre_comercial'],
                'tipoEstablecimiento' => '01',
                'direccion' => [
                    'departamento' => '06',
                    'municipio' => '14',
                    'complemento' => $this->config['empresa']['direccion'],
                ],
                'telefono' => $this->config['empresa']['telefono'],
                'correo' => $this->config['empresa']['email'],
                'codEstableMH' => null,
                'codEstable' => null,
                'codPuntoVentaMH' => null,
                'codPuntoVenta' => $datos['numero_caja'],
            ],
            'receptor' => [
                'tipoDocumento' => $cliente['tipo_documento'],
                'numDocumento' => $cliente['num_documento'],
                'nrc' => null,
                'nombre' => $cliente['nombre'],
                'codActividad' => null,
                'descActividad' => null,
                'direccion' => [
                    'departamento' => '06',
                    'municipio' => '14',
                    'complemento' => $cliente['direccion'] ?? 'N/A',
                ],
                'telefono' => $cliente['telefono'] ?? 'N/A',
                'correo' => $cliente['email'] ?? 'cliente@email.com',
            ],
            'otrosDocumentos' => null,
            'ventaTercero' => null,
            'cuerpoDocumento' => $cuerpoDocumento,
            'resumen' => [
                'totalNoSuj' => 0,
                'totalExenta' => 0,
                'totalGravada' => $subtotalGeneral,
                'subTotalVentas' => $subtotalGeneral,
                'descuNoSuj' => 0,
                'descuExenta' => 0,
                'descuGravada' => 0,
                'porcentajeDescuento' => 0,
                'totalDescu' => 0,
                'tributos' => [
                    [
                        'codigo' => '20',
                        'descripcion' => 'Impuesto al Valor Agregado 13%',
                        'valor' => $ivaTotal,
                    ]
                ],
                'subTotal' => $subtotalGeneral,
                'ivaPerci1' => 0,
                'ivaRete1' => 0,
                'reteRenta' => 0,
                'montoTotalOperacion' => $totalPagar,
                'totalNoGravado' => 0,
                'totalPagar' => $totalPagar,
                'totalLetras' => $this->numeroALetras($totalPagar),
                'saldoFavor' => 0,
                'condicionOperacion' => 1, // Contado
                'pagos' => [
                    [
                        'codigo' => '01',
                        'montoPago' => $totalPagar,
                        'referencia' => null,
                        'plazo' => null,
                        'periodo' => null,
                    ]
                ],
                'numPagoElectronico' => null,
            ],
            'extension' => null,
            'apendice' => null,
        ];

        return $dte;
    }

    /**
     * Generar JSON de CCF (03)
     * Similar a Factura pero con más campos de crédito fiscal
     */
    public function generarCCF(array $datos): array
    {
        // La estructura es muy similar a Factura
        // Por brevedad, usa la misma base
        $dte = $this->generarFactura($datos);
        
        // Cambiar tipo
        $dte['identificacion']['tipoDte'] = '03';
        
        return $dte;
    }

    /**
     * Generar JSON de Nota de Crédito (05)
     * 
     * @param array $datos
     * @return array
     */
    public function generarNotaCredito(array $datos): array
{
    // Obtener el DTE original que se está creditando
    $dteModel = new \App\Models\DTE();
    $dteOriginal = $dteModel->findById($datos['dte_relacionado_id']); // ← CAMBIO AQUÍ
    
    if (!$dteOriginal) {
        throw new \Exception("DTE original no encontrado");
    }

    // Usar misma base de factura
    $nc = $this->generarFactura($datos);
    
    // Cambiar tipo
    $nc['identificacion']['tipoDte'] = '05';
    
    // Agregar documento relacionado
    $nc['documentoRelacionado'] = [
        [
            'tipoDocumento' => $dteOriginal['tipo_dte'],
            'tipoGeneracion' => 1,
            'numeroDocumento' => $dteOriginal['numero_control'],
            'fechaEmision' => date('Y-m-d', strtotime($dteOriginal['creado_en'])),
        ]
    ];

    return $nc;
}

    /**
     * Convertir número a letras (simplificado)
     * 
     * @param float $numero
     * @return string
     */
    private function numeroALetras(float $numero): string
    {
        // Implementación simplificada
        $entero = floor($numero);
        $decimales = round(($numero - $entero) * 100);
        
        return strtoupper("$entero DOLARES CON $decimales/100");
    }
}
