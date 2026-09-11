// ============================================================
//  URAKAO — Prueba de Endpoints Específicos (Node.js)
//  Ejecutar: node prueba-endpoints.js
// ============================================================

const BASE_URL = "https://urakao.web.app";
const REPETICIONES = 5;

const ENDPOINTS = [
    { path: "/",         nombre: "Página Principal",  esperado: 200 },
    { path: "/login",    nombre: "Login",             esperado: 200 },
    { path: "/tienda",   nombre: "Tienda",            esperado: 200 },
    { path: "/checkout", nombre: "Checkout",          esperado: 200 },
    { path: "/admin",    nombre: "Admin",             esperado: 200 },
    { path: "/src/seed.html", nombre: "Seed",         esperado: 200 }
];

async function probarEndpoint(endpoint) {
    const tiempos = [];
    let exitosas = 0;
    let statusCodes = [];

    for (let i = 0; i < REPETICIONES; i++) {
        const inicio = Date.now();
        try {
            const res = await fetch(BASE_URL + endpoint.path);
            const tiempo = Date.now() - inicio;
            tiempos.push(tiempo);
            statusCodes.push(res.status);
            if (res.status >= 200 && res.status < 400) exitosas++;
        } catch (err) {
            tiempos.push(Date.now() - inicio);
            statusCodes.push(0);
        }
        await new Promise(r => setTimeout(r, 200));
    }

    const promedio = Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length);
    const minimo = Math.min(...tiempos);
    const maximo = Math.max(...tiempos);

    return {
        ...endpoint,
        promedio,
        minimo,
        maximo,
        exitosas,
        total: REPETICIONES,
        statusCodes,
        estado: promedio < 300 ? "EXCELENTE" : promedio < 800 ? "ACEPTABLE" : "LENTO"
    };
}

async function ejecutar() {
    console.log("╔══════════════════════════════════════════════════════════╗");
    console.log("║     URAKAO — Prueba de Disponibilidad de Endpoints     ║");
    console.log("╚══════════════════════════════════════════════════════════╝");
    console.log("");
    console.log(`  URL Base: ${BASE_URL}`);
    console.log(`  Repeticiones por endpoint: ${REPETICIONES}`);
    console.log(`  Endpoints a probar: ${ENDPOINTS.length}`);
    console.log("");
    console.log("  Ejecutando pruebas...");
    console.log("");

    const resultados = [];

    for (const ep of ENDPOINTS) {
        process.stdout.write(`  Probando ${ep.nombre.padEnd(20)}`);
        const resultado = await probarEndpoint(ep);
        resultados.push(resultado);

        const icono = resultado.estado === "EXCELENTE" ? "✓" :
                      resultado.estado === "ACEPTABLE" ? "⚠" : "✗";
        console.log(`${icono} ${resultado.promedio}ms (${resultado.exitosas}/${resultado.total} ok)`);
    }

    // Resumen
    console.log("");
    console.log("┌──────────────────────────────────────────────────────────┐");
    console.log("│                    RESUMEN DE RESULTADOS                  │");
    console.log("├──────────────────┬────────┬────────┬────────┬────────────┤");
    console.log("│ Endpoint         │ Prom.  │ Mín.   │ Máx.   │ Estado     │");
    console.log("├──────────────────┼────────┼────────┼────────┼────────────┤");

    resultados.forEach(r => {
        const nombre = r.nombre.padEnd(16).substring(0, 16);
        const prom = (r.promedio + "ms").padEnd(6);
        const min = (r.minimo + "ms").padEnd(6);
        const max = (r.maximo + "ms").padEnd(6);
        const estado = r.estado.padEnd(10);
        console.log(`│ ${nombre} │ ${prom} │ ${min} │ ${max} │ ${estado} │`);
    });

    console.log("└──────────────────┴────────┴────────┴────────┴────────────┘");

    // Veredicto general
    const promedioGeneral = Math.round(
        resultados.reduce((s, r) => s + r.promedio, 0) / resultados.length
    );
    const todosOk = resultados.every(r => r.exitosas === r.total);

    console.log("");
    if (todosOk && promedioGeneral < 300) {
        console.log("  ✓ TODOS LOS ENDPOINTS RESPONDEN CORRECTAMENTE");
        console.log(`  ✓ TIEMPO PROMEDIO GENERAL: ${promedioGeneral}ms — EXCELENTE`);
    } else if (todosOk) {
        console.log("  ✓ TODOS LOS ENDPOINTS ESTÁN DISPONIBLES");
        console.log(`  ⚠ TIEMPO PROMEDIO GENERAL: ${promedioGeneral}ms — MONITOREAR`);
    } else {
        console.log("  ✗ ALGUNOS ENDPOINTS PRESENTAN ERRORES");
        console.log(`  ✗ TIEMPO PROMEDIO GENERAL: ${promedioGeneral}ms`);
    }
    console.log("");
}

ejecutar().catch(console.error);
