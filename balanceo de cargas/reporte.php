<?php
// ============================================================
//  URAKAO — Generador de Reportes de Carga (PHP)
//  Ejecutar: php -S localhost:8080 → abrir http://localhost:8080/reporte.php
// ============================================================

require_once 'config.php';

// ── Ejecutar pruebas ──
function realizarPrueba($url, $repeticiones = REPETICIONES) {
    $resultados = [];
    
    for ($i = 0; $i < $repeticiones; $i++) {
        $inicio = microtime(true);
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => TIMEOUT,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_USERAGENT      => 'URAKAO-LoadTest/1.0'
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error    = curl_error($ch);
        curl_close($ch);
        
        $tiempo = round((microtime(true) - $inicio) * 1000); // ms
        
        $resultados[] = [
            'tiempo'  => $tiempo,
            'status'  => $httpCode,
            'ok'      => ($httpCode >= 200 && $httpCode < 400),
            'error'   => $error,
            'tamaño'  => strlen($response ?: '')
        ];
        
        usleep(INTERVALO_MS * 1000);
    }
    
    return $resultados;
}

function calcularEstadisticas($resultados) {
    $tiempos  = array_column($resultados, 'tiempo');
    $exitosas = count(array_filter($resultados, fn($r) => $r['ok']));
    $total    = count($resultados);
    
    sort($tiempos);
    
    return [
        'total'     => $total,
        'exitosas'  => $exitosas,
        'fallidas'  => $total - $exitosas,
        'promedio'  => $total > 0 ? round(array_sum($tiempos) / $total) : 0,
        'minimo'    => $total > 0 ? min($tiempos) : 0,
        'maximo'    => $total > 0 ? max($tiempos) : 0,
        'p95'       => $total > 0 ? $tiempos[floor($total * 0.95)] : 0,
        'tasa_exito'=> $total > 0 ? round(($exitosas / $total) * 100, 1) : 0
    ];
}

function clasificarRendimiento($promedio) {
    if ($promedio < UMBRAL_EXCELENTE) return ['EXCELENTE', '#2E7D32', '✓'];
    if ($promedio < UMBRAL_ACEPTABLE) return ['ACEPTABLE', '#F57F17', '⚠'];
    return ['LENTO', '#C62828', '✗'];
}

// ── Ejecutar todas las pruebas ──
global $ENDPOINTS;
$reporteData = [];
$inicioTotal = microtime(true);

foreach ($ENDPOINTS as $ep) {
    $url = BASE_URL . $ep['path'];
    $resultados = realizarPrueba($url);
    $stats = calcularEstadisticas($resultados);
    $rendimiento = clasificarRendimiento($stats['promedio']);
    
    $reporteData[] = [
        'endpoint'    => $ep,
        'resultados'  => $resultados,
        'stats'       => $stats,
        'rendimiento' => $rendimiento
    ];
}

$duracionTotal = round((microtime(true) - $inicioTotal), 1);
$fecha = date('Y-m-d H:i:s');

// Estadísticas globales
$todosResultados = [];
foreach ($reporteData as $r) {
    $todosResultados = array_merge($todosResultados, $r['resultados']);
}
$statsGlobal = calcularEstadisticas($todosResultados);
$rendimientoGlobal = clasificarRendimiento($statsGlobal['promedio']);
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>URAKAO — Reporte de Pruebas de Carga</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, sans-serif; background: #F8F4EE; color: #2C1810; padding: 2rem; }
        .container { max-width: 900px; margin: 0 auto; }
        
        .header { background: #2C1810; color: #F8F4EE; padding: 2rem; margin-bottom: 2rem; }
        .header h1 { font-family: Georgia, serif; font-size: 1.8rem; letter-spacing: 4px; margin-bottom: 0.3rem; }
        .header p { font-size: 0.8rem; color: #B8965A; letter-spacing: 1px; }
        .header .fecha { font-size: 0.75rem; color: rgba(248,244,238,0.5); margin-top: 0.5rem; }
        
        .resumen { background: white; border: 1px solid #EDE8DF; padding: 2rem; margin-bottom: 2rem; }
        .resumen h2 { font-family: Georgia, serif; font-size: 1.2rem; margin-bottom: 1.5rem; color: #4A2C1A; }
        
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
        .stat-box { text-align: center; padding: 1rem; background: #F8F4EE; }
        .stat-box .num { font-family: Georgia, serif; font-size: 1.8rem; font-weight: 700; color: #2C1810; }
        .stat-box .lbl { font-size: 0.65rem; letter-spacing: 2px; text-transform: uppercase; color: #8B6347; margin-top: 0.3rem; }
        
        .veredicto { text-align: center; padding: 1rem; font-family: Georgia, serif; font-size: 1.1rem; letter-spacing: 1px; margin-top: 1rem; }
        
        .endpoint-section { background: white; border: 1px solid #EDE8DF; padding: 1.5rem; margin-bottom: 1rem; }
        .ep-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .ep-nombre { font-family: Georgia, serif; font-size: 1rem; color: #2C1810; }
        .ep-badge { font-size: 0.65rem; letter-spacing: 1.5px; padding: 0.25rem 0.7rem; font-weight: 700; }
        .ep-url { font-size: 0.78rem; color: #8B6347; font-family: monospace; margin-bottom: 1rem; }
        
        .ep-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.5rem; font-size: 0.8rem; }
        .ep-stat { text-align: center; padding: 0.5rem; background: #F8F4EE; }
        .ep-stat strong { display: block; font-size: 1rem; color: #2C1810; }
        .ep-stat span { font-size: 0.65rem; letter-spacing: 1px; text-transform: uppercase; color: #8B6347; }
        
        .barra-container { margin-top: 1rem; }
        .barra { display: flex; gap: 2px; height: 30px; align-items: flex-end; }
        .barra-item { flex: 1; background: #B8965A; border-radius: 2px 2px 0 0; transition: height 0.3s; }
        .barra-item.slow { background: #F57F17; }
        .barra-item.error { background: #C62828; }
        
        .footer { text-align: center; padding: 2rem; font-size: 0.75rem; color: #8B6347; }
        
        @media (max-width: 600px) {
            .stats-grid { grid-template-columns: 1fr 1fr; }
            .ep-stats { grid-template-columns: repeat(3, 1fr); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><?= PROYECTO_NOMBRE ?></h1>
            <p>Reporte de Pruebas de Balanceo de Cargas</p>
            <p class="fecha">Generado: <?= $fecha ?> | Duración: <?= $duracionTotal ?>s</p>
        </div>
        
        <!-- Resumen ejecutivo -->
        <div class="resumen">
            <h2>Resumen Ejecutivo</h2>
            <div class="stats-grid">
                <div class="stat-box">
                    <div class="num"><?= $statsGlobal['total'] ?></div>
                    <div class="lbl">Solicitudes</div>
                </div>
                <div class="stat-box">
                    <div class="num"><?= $statsGlobal['promedio'] ?>ms</div>
                    <div class="lbl">Promedio</div>
                </div>
                <div class="stat-box">
                    <div class="num"><?= $statsGlobal['tasa_exito'] ?>%</div>
                    <div class="lbl">Tasa éxito</div>
                </div>
                <div class="stat-box">
                    <div class="num"><?= $statsGlobal['p95'] ?>ms</div>
                    <div class="lbl">Percentil 95</div>
                </div>
            </div>
            <div class="veredicto" style="background:<?= $rendimientoGlobal[1] ?>20; color:<?= $rendimientoGlobal[1] ?>">
                <?= $rendimientoGlobal[2] ?> Rendimiento General: <?= $rendimientoGlobal[0] ?>
            </div>
        </div>
        
        <!-- Detalle por endpoint -->
        <?php foreach ($reporteData as $data): ?>
        <div class="endpoint-section">
            <div class="ep-header">
                <span class="ep-nombre"><?= $data['endpoint']['nombre'] ?></span>
                <span class="ep-badge" style="background:<?= $data['rendimiento'][1] ?>20; color:<?= $data['rendimiento'][1] ?>">
                    <?= $data['rendimiento'][2] ?> <?= $data['rendimiento'][0] ?>
                </span>
            </div>
            <p class="ep-url"><?= BASE_URL . $data['endpoint']['path'] ?></p>
            <div class="ep-stats">
                <div class="ep-stat"><strong><?= $data['stats']['promedio'] ?>ms</strong><span>Promedio</span></div>
                <div class="ep-stat"><strong><?= $data['stats']['minimo'] ?>ms</strong><span>Mínimo</span></div>
                <div class="ep-stat"><strong><?= $data['stats']['maximo'] ?>ms</strong><span>Máximo</span></div>
                <div class="ep-stat"><strong><?= $data['stats']['p95'] ?>ms</strong><span>P95</span></div>
                <div class="ep-stat"><strong><?= $data['stats']['tasa_exito'] ?>%</strong><span>Éxito</span></div>
            </div>
            <div class="barra-container">
                <div class="barra">
                    <?php foreach ($data['resultados'] as $r): ?>
                    <?php 
                        $h = min(max(($r['tiempo'] / 1000) * 30, 3), 30);
                        $clase = !$r['ok'] ? 'error' : ($r['tiempo'] > UMBRAL_ACEPTABLE ? 'slow' : '');
                    ?>
                    <div class="barra-item <?= $clase ?>" style="height:<?= $h ?>px" title="<?= $r['tiempo'] ?>ms (HTTP <?= $r['status'] ?>)"></div>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>
        <?php endforeach; ?>
        
        <div class="footer">
            <p><?= PROYECTO_NOMBRE ?> · <?= PROYECTO_DESC ?></p>
            <p>Reporte generado automáticamente · <?= $fecha ?></p>
        </div>
    </div>
</body>
</html>
