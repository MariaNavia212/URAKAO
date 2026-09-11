<?php
// ============================================================
//  URAKAO — Configuración de Pruebas de Carga (PHP)
// ============================================================

// URL base de la aplicación
define('BASE_URL', 'https://urakao.web.app');

// Endpoints a probar
$ENDPOINTS = [
    ['path' => '/',         'nombre' => 'Página Principal'],
    ['path' => '/login',    'nombre' => 'Login'],
    ['path' => '/tienda',   'nombre' => 'Tienda'],
    ['path' => '/checkout', 'nombre' => 'Checkout'],
    ['path' => '/admin',    'nombre' => 'Admin'],
];

// Configuración de la prueba
define('REPETICIONES', 10);        // Solicitudes por endpoint
define('TIMEOUT', 10);             // Timeout en segundos
define('INTERVALO_MS', 200);       // Pausa entre solicitudes (ms)

// Umbrales de rendimiento (ms)
define('UMBRAL_EXCELENTE', 300);
define('UMBRAL_ACEPTABLE', 800);

// Directorio de resultados
define('DIR_RESULTADOS', __DIR__ . '/resultados/');

// Información del proyecto
define('PROYECTO_NOMBRE', 'URAKAO');
define('PROYECTO_DESC', 'Chocolatería Artesanal — Urabá, Colombia');
define('PROYECTO_URL', 'https://urakao.web.app');
