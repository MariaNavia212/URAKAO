// ============================================================
//  URAKAO — Prueba de Carga Automática (Node.js)
//  Ejecutar: node prueba-carga.js
// ============================================================

const BASE_URL = "https://urakao.web.app";
const USUARIOS_SIMULTANEOS = 20;
const SOLICITUDES_POR_USUARIO = 10;
const INTERVALO_MS = 100;

const ENDPOINTS = [
    { path: "/", nombre: "Inicio" },
    { path: "/login", nombre: "Login" },
    { path: "/tienda", nombre: "Tienda" },
    { path: "/checkout", nombre: "Checkout" }
];

// ── Resultados ──
let resultados = [];
let inicio = Date.now();

// ── Función principal ──
async function ejecutarPrueba() {
    console.log("╔══════════════════════════════════════════════════╗");
    console.log("║   URAKAO — Prueba de Balanceo de Cargas         ║");
    console.log("╚══════════════════════════════════════════════════╝");
    console.log("");
    console.log(`  URL Base:     ${BASE_URL}`);
    console.log(`  Usuarios:     ${USUARIOS_SIMULTANEOS}`);
    console.log(`  Solicitudes:  ${SOLICITUDES_POR_USUARIO} por usuario`);
    console.log(`  Total:        ${USUARIOS_SIMULTANEOS * SOLICITUDES_POR_USUARIO} requests`);
    console.log(`  Intervalo:    ${INTERVALO_MS}ms`);
    console.log("");
    console.log("  Iniciando prueba...");
    console.log("");

    inicio = Date.now();

    // Crear promesas para cada usuario
    const promesasUsuarios = [];
    for (let u = 0; u < USUARIOS_SIMULTANEOS; u++) {
        promesasUsuarios.push(simularUsuario(u + 1));
    }

    await Promise.all(promesasUsuarios);

    // Mostrar resultados
    mostrarResultados();
}

async function simularUsuario(userId) {
    for (let i = 0; i < SOLICITUDES_POR_USUARIO; i++) {
        const ep = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
        const url = BASE_URL + ep.path;

        const inicioReq = Date.now();
        try {
            const res = await fetch(url);
            const tiempo = Date.now() - inicioReq;
            const status = res.status;

            resultados.push({
                usuario: userId,
                url: ep.path,
                nombre: ep.nombre,
                tiempo,
                status,
                ok: status >= 200 && status < 400
            });

            const indicador = status < 300 ? "✓" : status < 400 ? "→" : "✗";
            process.stdout.write(`  ${indicador} U${userId.toString().padStart(2)} | ${ep.nombre.padEnd(10)} | ${status} | ${tiempo}ms\n`);

        } catch (err) {
            const tiempo = Date.now() - inicioReq;
            resultados.push({
                usuario: userId,
                url: ep.path,
                nombre: ep.nombre,
                tiempo,
                status: 0,
                ok: false,
                error: err.message
            });
            process.stdout.write(`  ✗ U${userId.toString().padStart(2)} | ${ep.nombre.padEnd(10)} | ERROR | ${err.message}\n`);
        }

        // Esperar intervalo
        await new Promise(r => setTimeout(r, INTERVALO_MS));
    }
}

function mostrarResultados() {
    const duracion = (Date.now() - inicio) / 1000;
    const total = resultados.length;
    const exitosas = resultados.filter(r => r.ok).length;
    const fallidas = total - exitosas;
    const tiempos = resultados.filter(r => r.ok).map(r => r.tiempo);
    const promedio = tiempos.length > 0 ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length) : 0;
    const maximo = tiempos.length > 0 ? Math.max(...tiempos) : 0;
    const minimo = tiempos.length > 0 ? Math.min(...tiempos) : 0;
    const p95 = tiempos.length > 0 ? tiempos.sort((a, b) => a - b)[Math.floor(tiempos.length * 0.95)] : 0;
    const rps = (total / duracion).toFixed(1);

    // Resultados por endpoint
    const porEndpoint = {};
    ENDPOINTS.forEach(ep => {
        const reqs = resultados.filter(r => r.url === ep.path);
        const t = reqs.filter(r => r.ok).map(r => r.tiempo);
        porEndpoint[ep.nombre] = {
            total: reqs.length,
            exitosas: reqs.filter(r => r.ok).length,
            promedio: t.length > 0 ? Math.round(t.reduce((a, b) => a + b, 0) / t.length) : 0
        };
    });

    console.log("");
    console.log("╔══════════════════════════════════════════════════╗");
    console.log("║              RESULTADOS DE LA PRUEBA             ║");
    console.log("╠══════════════════════════════════════════════════╣");
    console.log(`║  Duración total:        ${duracion.toFixed(1)}s`);
    console.log(`║  Solicitudes totales:   ${total}`);
    console.log(`║  Exitosas:              ${exitosas} (${Math.round(exitosas/total*100)}%)`);
    console.log(`║  Fallidas:              ${fallidas} (${Math.round(fallidas/total*100)}%)`);
    console.log(`║  Requests/segundo:      ${rps}`);
    console.log("╠══════════════════════════════════════════════════╣");
    console.log(`║  Tiempo promedio:       ${promedio}ms`);
    console.log(`║  Tiempo mínimo:         ${minimo}ms`);
    console.log(`║  Tiempo máximo:         ${maximo}ms`);
    console.log(`║  Percentil 95:          ${p95}ms`);
    console.log("╠══════════════════════════════════════════════════╣");
    console.log("║  POR ENDPOINT:");

    Object.entries(porEndpoint).forEach(([nombre, data]) => {
        console.log(`║    ${nombre.padEnd(12)} → ${data.promedio}ms prom | ${data.exitosas}/${data.total} ok`);
    });

    console.log("╠══════════════════════════════════════════════════╣");

    if (promedio < 300) {
        console.log("║  ✓ VEREDICTO: RENDIMIENTO EXCELENTE             ║");
    } else if (promedio < 800) {
        console.log("║  ⚠ VEREDICTO: RENDIMIENTO ACEPTABLE             ║");
    } else {
        console.log("║  ✗ VEREDICTO: REQUIERE OPTIMIZACIÓN             ║");
    }

    console.log("╚══════════════════════════════════════════════════╝");
}

// Ejecutar
ejecutarPrueba().catch(console.error);
