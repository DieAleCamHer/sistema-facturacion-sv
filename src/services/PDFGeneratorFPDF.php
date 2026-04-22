<?php

namespace App\Services;

require_once __DIR__ . '/../../config/fpdf/fpdf.php';

use FPDF;

/**
 * Generador de PDFs con FPDF
 * Crea PDFs profesionales para DTEs
 */
class PDFGeneratorFPDF
{
    private $config;

    public function __construct()
    {
        $this->config = require __DIR__ . '/../../config/config.php';
    }

    /**
     * Generar PDF de un DTE
     * 
     * @param array $dte Datos del DTE
     * @return string Nombre del archivo generado
     */
    public function generar(array $dte): string
    {
        $pdf = new PDFExtended('P', 'mm', 'Letter');
        $pdf->AddPage();
        $pdf->SetAutoPageBreak(true, 15);

        // Marca de agua si está invalidado
        if ($dte['estado'] === 'invalidado') {
            $this->agregarMarcaAgua($pdf, 'INVALIDADO');
        }

        // Encabezado
        $this->generarEncabezado($pdf, $dte);

        // Datos del receptor
        $this->generarReceptor($pdf, $dte);

        // Tabla de productos
        $this->generarTablaProductos($pdf, $dte);

        // Totales
        $this->generarTotales($pdf, $dte);

        // Pie de página
        $this->generarPie($pdf, $dte);

        // Guardar
        $nombreArchivo = $this->guardarPDF($pdf, $dte);

        return $nombreArchivo;
    }

    /**
     * Generar encabezado del PDF
     */
    private function generarEncabezado($pdf, $dte)
    {
        // Logo (opcional)
        $logoPath = __DIR__ . '/../../public/logos/logo-empresa.png';
        if (file_exists($logoPath)) {
            $pdf->Image($logoPath, 10, 10, 40);
        }
 
        // Datos del emisor
        $pdf->SetFont('Arial', 'B', 14);
        $pdf->Cell(0, 6, $this->convertir('EMPRESA EJEMPLO S.A. DE C.V.'), 0, 1, 'C');
        
        $pdf->SetFont('Arial', '', 9);
        $pdf->Cell(0, 4, $this->convertir('NIT: 0614-123456-001-5'), 0, 1, 'C');
        $pdf->Cell(0, 4, $this->convertir('NRC: 123456-7'), 0, 1, 'C');
        $pdf->Cell(0, 4, $this->convertir('San Salvador, El Salvador'), 0, 1, 'C');
        $pdf->Ln(5);
 
        // Tipo de documento
        $tipoNombre = $this->getTipoNombre($dte['tipo_dte']);
        $pdf->SetFont('Arial', 'B', 16);
        $pdf->SetFillColor(41, 128, 185);
        $pdf->SetTextColor(255, 255, 255);
        $pdf->Cell(0, 10, $this->convertir($tipoNombre), 0, 1, 'C', true);
        $pdf->SetTextColor(0, 0, 0);
        $pdf->Ln(5);
 
        // Número de control y fecha
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(50, 6, $this->convertir('Número de Control:'), 0, 0);
        $pdf->SetFont('Arial', '', 10);
        $pdf->Cell(0, 6, $dte['numero_control'], 0, 1);
 
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(50, 6, $this->convertir('Código de Generación:'), 0, 0);
        $pdf->SetFont('Arial', '', 8);
        $pdf->Cell(0, 6, $dte['codigo_generacion'], 0, 1);
 
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(50, 6, 'Fecha:', 0, 0);
        $pdf->SetFont('Arial', '', 10);
        $pdf->Cell(0, 6, date('d/m/Y H:i', strtotime($dte['creado_en'])), 0, 1);
 
        // NUEVO: Caja y Facturador
        if (!empty($dte['numero_caja'])) {
            $pdf->SetFont('Arial', 'B', 10);
            $pdf->Cell(50, 6, 'Caja:', 0, 0);
            $pdf->SetFont('Arial', '', 10);
            $pdf->Cell(0, 6, $dte['numero_caja'], 0, 1);
        }
 
        if (!empty($dte['usuario_nombre'])) {
            $pdf->SetFont('Arial', 'B', 10);
            $pdf->Cell(50, 6, 'Facturador:', 0, 0);
            $pdf->SetFont('Arial', '', 10);
            $pdf->Cell(0, 6, $this->convertir($dte['usuario_nombre']), 0, 1);
        }
 
        $pdf->Ln(3);
    }
    
    /**
     * Generar datos del receptor
     */
    private function generarReceptor($pdf, $dte)
    {
        $pdf->SetFont('Arial', 'B', 11);
        $pdf->SetFillColor(230, 230, 230);
        $pdf->Cell(0, 7, 'DATOS DEL RECEPTOR', 0, 1, 'L', true);
        $pdf->Ln(2);

        $pdf->SetFont('Arial', 'B', 9);
        $pdf->Cell(30, 5, 'Cliente:', 0, 0);
        $pdf->SetFont('Arial', '', 9);
        $clienteNombre = $dte['cliente_nombre'] ?? 'Consumidor Final';
        $pdf->Cell(0, 5, $this->convertir($clienteNombre), 0, 1);

        if (!empty($dte['cliente_doc'])) {
            $pdf->SetFont('Arial', 'B', 9);
            $pdf->Cell(30, 5, 'Documento:', 0, 0);
            $pdf->SetFont('Arial', '', 9);
            $pdf->Cell(0, 5, $dte['cliente_doc'], 0, 1);
        }

        $pdf->Ln(5);
    }

    /**
     * Generar tabla de productos
     */
    private function generarTablaProductos($pdf, $dte)
    {
        // Encabezado de tabla
        $pdf->SetFont('Arial', 'B', 9);
        $pdf->SetFillColor(52, 73, 94);
        $pdf->SetTextColor(255, 255, 255);
        
        $pdf->Cell(15, 7, 'Cant.', 1, 0, 'C', true);
        $pdf->Cell(90, 7, $this->convertir('Descripción'), 1, 0, 'C', true);
        $pdf->Cell(30, 7, 'P. Unitario', 1, 0, 'C', true);
        $pdf->Cell(30, 7, 'Subtotal', 1, 1, 'C', true);
        
        $pdf->SetTextColor(0, 0, 0);
        $pdf->SetFont('Arial', '', 9);

        // Productos
        $detalles = $dte['detalles'] ?? [];
        foreach ($detalles as $item) {
            $pdf->Cell(15, 6, $item['cantidad'], 1, 0, 'C');
            $descripcion = $this->convertir($item['descripcion'] ?? 'Producto');
            $pdf->Cell(90, 6, $descripcion, 1, 0, 'L');
            $pdf->Cell(30, 6, '$' . number_format($item['precio_unitario'], 2), 1, 0, 'R');
            $pdf->Cell(30, 6, '$' . number_format($item['subtotal'], 2), 1, 1, 'R');
        }

        $pdf->Ln(3);
    }

    /**
     * Generar totales
     */
    private function generarTotales($pdf, $dte)
    {
        $pdf->SetFont('Arial', 'B', 10);
        
        // Subtotal
        $pdf->Cell(135, 6, '', 0, 0);
        $pdf->Cell(30, 6, 'Subtotal:', 0, 0, 'R');
        $pdf->Cell(30, 6, '$' . number_format($dte['subtotal'], 2), 0, 1, 'R');

        // IVA
        $pdf->Cell(135, 6, '', 0, 0);
        $pdf->Cell(30, 6, 'IVA (13%):', 0, 0, 'R');
        $pdf->Cell(30, 6, '$' . number_format($dte['iva'], 2), 0, 1, 'R');

        // Total
        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell(135, 8, '', 0, 0);
        $pdf->SetFillColor(46, 204, 113);
        $pdf->SetTextColor(255, 255, 255);
        $pdf->Cell(30, 8, 'TOTAL:', 1, 0, 'R', true);
        $pdf->Cell(30, 8, '$' . number_format($dte['total'], 2), 1, 1, 'R', true);
        $pdf->SetTextColor(0, 0, 0);
    }

    /**
     * Generar pie de página
     */
    private function generarPie($pdf, $dte)
    {
        $pdf->Ln(10);
        $pdf->SetFont('Arial', 'I', 8);
        $pdf->SetTextColor(100, 100, 100);
        $pdf->Cell(0, 4, $this->convertir('Documento Tributario Electrónico - Sistema de Facturación'), 0, 1, 'C');
        $pdf->Cell(0, 4, $this->convertir('Este documento tiene validez legal'), 0, 1, 'C');
    }

    /**
     * Agregar marca de agua
     */
    private function agregarMarcaAgua($pdf, $texto)
    {
        $pdf->SetFont('Arial', 'B', 60);
        $pdf->SetTextColor(255, 0, 0);
        $pdf->SetAlpha(0.3);
        
        // Texto rotado
        $pdf->RotatedText(50, 150, $this->convertir($texto), 45);
        
        $pdf->SetAlpha(1);
        $pdf->SetTextColor(0, 0, 0);
    }

    /**
     * Guardar PDF
     */
    private function guardarPDF($pdf, $dte): string
    {
        $nombreArchivo = 'DTE-' . $dte['tipo_dte'] . '-' . $dte['numero_control'] . '.pdf';
        $rutaCompleta = __DIR__ . '/../../storage/pdfs/' . $nombreArchivo;

        // Crear directorio si no existe
        $directorio = dirname($rutaCompleta);
        if (!is_dir($directorio)) {
            mkdir($directorio, 0777, true);
        }

        $pdf->Output('F', $rutaCompleta);

        return $nombreArchivo;
    }

    /**
     * Obtener nombre del tipo de DTE
     */
    private function getTipoNombre($tipo): string
    {
        $tipos = [
            '01' => 'FACTURA',
            '03' => 'COMPROBANTE DE CREDITO FISCAL',
            '05' => 'NOTA DE CREDITO'
        ];

        return $tipos[$tipo] ?? 'DOCUMENTO TRIBUTARIO';
    }

    /**
     * Convertir texto a ISO-8859-1 para FPDF
     */
    private function convertir($texto): string
    {
        return mb_convert_encoding($texto, 'ISO-8859-1', 'UTF-8');
    }
}

/**
 * Extensión de FPDF para texto rotado y transparencia
 */
class PDFExtended extends FPDF
{
    protected $angle = 0;

    function SetAlpha($alpha)
    {
        $this->_out(sprintf('/GS1 gs'));
    }

    function RotatedText($x, $y, $txt, $angle)
    {
        $this->Rotate($angle, $x, $y);
        $this->Text($x, $y, $txt);
        $this->Rotate(0);
    }

    function Rotate($angle, $x = -1, $y = -1)
    {
        if ($x == -1)
            $x = $this->x;
        if ($y == -1)
            $y = $this->y;
        if ($this->angle != 0)
            $this->_out('Q');
        $this->angle = $angle;
        if ($angle != 0) {
            $angle *= M_PI / 180;
            $c = cos($angle);
            $s = sin($angle);
            $cx = $x * $this->k;
            $cy = ($this->h - $y) * $this->k;
            $this->_out(sprintf('q %.5F %.5F %.5F %.5F %.2F %.2F cm 1 0 0 1 %.2F %.2F cm', $c, $s, -$s, $c, $cx, $cy, -$cx, -$cy));
        }
    }

    function _endpage()
    {
        if ($this->angle != 0) {
            $this->angle = 0;
            $this->_out('Q');
        }
        parent::_endpage();
    }
}