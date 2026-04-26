<?php
error_reporting(0); // Para ocultar los warnings que pueden romper el pdf

$id = $_GET['id'] ?? null;

if (!$id) {
    die('ID no proporcionado');
}

try {
    $config = require __DIR__ . '/../config/database.php';
    $pdo = new PDO(
        "mysql:host={$config['host']};dbname={$config['dbname']};charset={$config['charset']}",
        $config['username'],
        $config['password']
    );
    
    $stmt = $pdo->prepare("SELECT ruta_pdf FROM dte WHERE id = ?");
    $stmt->execute([$id]);
    $dte = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$dte || empty($dte['ruta_pdf'])) {
        die('DTE no encontrado');
    }
    
    $pdfFile = __DIR__ . '/pdfs/' . basename($dte['ruta_pdf']);
    
    if (!file_exists($pdfFile)) {
        die('PDF no existe: ' . basename($dte['ruta_pdf']));
    }
    
    // Limpiar cualquier output previo
    if (ob_get_level()) ob_end_clean();
    
    // Headers simples
    header('Content-Type: application/pdf');
    header('Content-Length: ' . filesize($pdfFile));
    header('Content-Disposition: inline; filename="' . basename($pdfFile) . '"');
    
    // Enviar archivo
    readfile($pdfFile);
    exit;
    
} catch (Exception $e) {
    die('Error: ' . $e->getMessage());
}