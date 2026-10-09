// ============================================================
//  URAKAO — Módulo Financiero (Costeo + Resumen)
//  FIN-1 al FIN-11
// ============================================================

import { db } from "./firebase.js";
import {
    collection, getDocs, doc,
    updateDoc, setDoc, getDoc, addDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Estado ────────────────────────────────────────────────────
let productosLista  = [];
let productoActual  = null;
let chartLineas     = null;
let chartTorta      = null;
let chartBarras     = null;

// ════════════════════════════════════════════════════════════
//  FIN-1: Sub-navegación interna del módulo Financiero
// ════════════════════════════════════════════════════════════

document.querySelectorAll(".fin-tab").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".fin-tab").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const cual = btn.dataset.fin;
        document.getElementById("fin-costeo").classList.toggle("hidden",  cual !== "costeo");
        document.getElementById("fin-resumen").classList.toggle("hidden", cual !== "resumen");
        if (cual === "resumen") iniciarResumen();
    });
});

// Activar módulo cuando se abre la pestaña principal
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        if (btn.dataset.tab === "contabilidad") iniciarFinanciero();
    });
});

async function iniciarFinanciero() {
    await cargarProductosSelector();
}

// ════════════════════════════════════════════════════════════
//  FIN-2: Selector de producto
// ════════════════════════════════════════════════════════════

async function cargarProductosSelector() {
    if (productosLista.length) return; // ya cargados
    try {
        const snap = await getDocs(collection(db, "productos"));
        productosLista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const sel = document.getElementById("cont-selector-producto");
        sel.innerHTML = `<option value="">Seleccionar producto...</option>` +
            productosLista.map(p =>
                `<option value="${p.id}">${p.nombre}</option>`
            ).join("");
    } catch (err) {
        console.error("Error cargando productos:", err);
    }
}

document.getElementById("cont-selector-producto").addEventListener("change", async function () {
    const id = this.value;
    const panel = document.getElementById("cont-panel");

    if (!id) { panel.classList.add("hidden"); return; }

    productoActual = productosLista.find(p => p.id === id);
    panel.classList.remove("hidden");

    // Cargar costeo guardado si existe
    let costeo = {};
    try {
        const snap = await getDoc(doc(db, "costeos", id));
        if (snap.exists()) costeo = snap.data();
    } catch { /* sin costeo previo */ }

    poblarCosteo(costeo);
    recalcular();
});

// ════════════════════════════════════════════════════════════
//  FIN-2 / FIN-3: Poblar formulario con datos guardados
// ════════════════════════════════════════════════════════════

function poblarCosteo(c) {
    document.getElementById("cont-lote").value         = c.lote        || 1;
    document.getElementById("cont-precio-venta").value = c.precioVenta || productoActual?.precio || "";

    // Insumos (FIN-3)
    renderListaInsumos(c.insumos?.length ? c.insumos : [{ nombre: "", cantidad: "", costo: "" }]);

    // Indirectos (FIN-4)
    renderListaIndirectos(c.indirectos?.length ? c.indirectos : [{ concepto: "", costo: "" }]);
}

// ════════════════════════════════════════════════════════════
//  FIN-3: Lista dinámica de insumos
// ════════════════════════════════════════════════════════════

function renderListaInsumos(insumos) {
    const lista = document.getElementById("insumos-lista");
    lista.innerHTML = insumos.map((ins, i) => filaInsumo(ins, i)).join("");
    lista.querySelectorAll("input").forEach(inp => inp.addEventListener("input", recalcular));
    lista.querySelectorAll(".btn-remove").forEach(btn =>
        btn.addEventListener("click", () => { btn.closest(".lista-fila").remove(); recalcular(); }));
}

function filaInsumo(ins = {}, i = 0) {
    return `
    <div class="lista-fila">
        <input type="text"   class="insumo-nombre"   value="${ins.nombre   || ""}" placeholder="Ej. Cacao en grano">
        <input type="text"   class="insumo-cantidad" value="${ins.cantidad || ""}" placeholder="Ej. 2 kg">
        <input type="number" class="insumo-costo"    value="${ins.costo    || ""}" min="0" placeholder="$ 0">
        <button type="button" class="btn-remove" title="Eliminar fila">✕</button>
    </div>`;
}

document.getElementById("btn-add-insumo").addEventListener("click", () => {
    const lista = document.getElementById("insumos-lista");
    const div   = document.createElement("div");
    div.innerHTML = filaInsumo();
    const fila  = div.firstElementChild;
    lista.appendChild(fila);
    fila.querySelectorAll("input").forEach(inp => inp.addEventListener("input", recalcular));
    fila.querySelector(".btn-remove").addEventListener("click", () => { fila.remove(); recalcular(); });
});

// ════════════════════════════════════════════════════════════
//  FIN-4: Lista dinámica de costos indirectos
// ════════════════════════════════════════════════════════════

function renderListaIndirectos(indirectos) {
    const lista = document.getElementById("indirectos-lista");
    lista.innerHTML = indirectos.map((ind, i) => filaIndirecto(ind, i)).join("");
    lista.querySelectorAll("input").forEach(inp => inp.addEventListener("input", recalcular));
    lista.querySelectorAll(".btn-remove").forEach(btn =>
        btn.addEventListener("click", () => { btn.closest(".lista-fila").remove(); recalcular(); }));
}

function filaIndirecto(ind = {}, i = 0) {
    return `
    <div class="lista-fila lista-fila-2">
        <input type="text"   class="ind-concepto" value="${ind.concepto || ""}" placeholder="Ej. Empaque, arriendo...">
        <input type="number" class="ind-costo"    value="${ind.costo    || ""}" min="0" placeholder="$ 0">
        <button type="button" class="btn-remove" title="Eliminar fila">✕</button>
    </div>`;
}

document.getElementById("btn-add-indirecto").addEventListener("click", () => {
    const lista = document.getElementById("indirectos-lista");
    const div   = document.createElement("div");
    div.innerHTML = filaIndirecto();
    const fila  = div.firstElementChild;
    lista.appendChild(fila);
    fila.querySelectorAll("input").forEach(inp => inp.addEventListener("input", recalcular));
    fila.querySelector(".btn-remove").addEventListener("click", () => { fila.remove(); recalcular(); });
});

// ════════════════════════════════════════════════════════════
//  FIN-5: Cálculo reactivo en tiempo real
// ════════════════════════════════════════════════════════════

document.getElementById("cont-lote").addEventListener("input", recalcular);
document.getElementById("cont-precio-venta").addEventListener("input", recalcular);

function recalcular() {
    const lote = Math.max(1, parseFloat(document.getElementById("cont-lote").value) || 1);
    const pv   = parseFloat(document.getElementById("cont-precio-venta").value) || 0;

    // CDU
    let totalInsumos = 0;
    document.querySelectorAll("#insumos-lista .insumo-costo").forEach(inp => {
        totalInsumos += parseFloat(inp.value) || 0;
    });
    const cdu = totalInsumos / lote;

    // CIU
    let totalIndirectos = 0;
    document.querySelectorAll("#indirectos-lista .ind-costo").forEach(inp => {
        totalIndirectos += parseFloat(inp.value) || 0;
    });
    const ciu = totalIndirectos;

    // CTU
    const ctu      = cdu + ciu;
    const ganancia = pv - ctu;
    const margen   = pv > 0 ? (ganancia / pv) * 100 : 0;

    const fmt = v => `$ ${Math.round(v).toLocaleString("es-CO")}`;

    document.getElementById("res-cdu").textContent     = fmt(cdu);
    document.getElementById("res-ciu").textContent     = fmt(ciu);
    document.getElementById("res-ctu").textContent     = fmt(ctu);
    document.getElementById("res-ganancia").textContent= fmt(ganancia);
    document.getElementById("res-margen").textContent  = `${margen.toFixed(1)}%`;

    // Color del margen
    const elM = document.getElementById("res-margen");
    elM.style.color = margen >= 30 ? "#2E7D32" : margen >= 15 ? "#E65100" : "#C62828";
    const elG = document.getElementById("res-ganancia");
    elG.style.color = ganancia >= 0 ? "#2E7D32" : "#C62828";
}

// ════════════════════════════════════════════════════════════
//  FIN-6: Guardar costeo y actualizar precio en tienda
// ════════════════════════════════════════════════════════════

document.getElementById("btn-guardar-costeo").addEventListener("click", async () => {
    if (!productoActual) { alert("Selecciona un producto primero"); return; }

    const lote = Math.max(1, parseFloat(document.getElementById("cont-lote").value) || 1);
    const pv   = parseFloat(document.getElementById("cont-precio-venta").value) || 0;

    // Recolectar insumos
    const insumos = [];
    document.querySelectorAll("#insumos-lista .lista-fila").forEach(fila => {
        const nombre   = fila.querySelector(".insumo-nombre")?.value.trim()   || "";
        const cantidad = fila.querySelector(".insumo-cantidad")?.value.trim() || "";
        const costo    = parseFloat(fila.querySelector(".insumo-costo")?.value) || 0;
        if (nombre) insumos.push({ nombre, cantidad, costo });
    });

    // Recolectar indirectos
    const indirectos = [];
    document.querySelectorAll("#indirectos-lista .lista-fila").forEach(fila => {
        const concepto = fila.querySelector(".ind-concepto")?.value.trim() || "";
        const costo    = parseFloat(fila.querySelector(".ind-costo")?.value) || 0;
        if (concepto) indirectos.push({ concepto, costo });
    });

    const totalInsumos    = insumos.reduce((s, i) => s + i.costo, 0);
    const cdu             = totalInsumos / lote;
    const ciu             = indirectos.reduce((s, i) => s + i.costo, 0);
    const ctu             = cdu + ciu;

    const btn = document.getElementById("btn-guardar-costeo");
    btn.textContent = "Guardando...";
    btn.disabled    = true;

    try {
        // Guardar en /costeos/{productoId}
        await setDoc(doc(db, "costeos", productoActual.id), {
            productoId: productoActual.id,
            productoNombre: productoActual.nombre,
            lote, insumos, indirectos,
            cdu, ciu, ctu, precioVenta: pv,
            actualizadoEn: new Date()
        });

        // Actualizar precio en /productos/{productoId} si se definió
        if (pv > 0) {
            await updateDoc(doc(db, "productos", productoActual.id), { precio: pv });
            productoActual.precio = pv;
        }

        btn.textContent = "✓ Guardado — precio actualizado en tienda";
        setTimeout(() => {
            btn.textContent = "Guardar costeo y actualizar precio en tienda →";
            btn.disabled    = false;
        }, 2800);

        // Refrescar lista de productos local
        productosLista = productosLista.map(p =>
            p.id === productoActual.id ? { ...p, precio: pv } : p
        );

    } catch (err) {
        btn.textContent = "Error: " + err.message;
        btn.disabled    = false;
    }
});

// ════════════════════════════════════════════════════════════
//  FIN-7: KPIs del resumen financiero
// ════════════════════════════════════════════════════════════

async function iniciarResumen() {
    await calcularKPIs();
    await renderGraficas();
}

async function calcularKPIs() {
    try {
        // Ventas plataforma (pedidos entregados)
        const pedSnap  = await getDocs(collection(db, "pedidos"));
        const pedidos  = pedSnap.docs.map(d => d.data());
        const entregados = pedidos.filter(p => p.estado === "entregado");
        const ingrPlatf  = entregados.reduce((s, p) => s + (p.total || 0), 0);

        // FIN-8: Ventas externas
        let ingrExt = 0;
        try {
            const extSnap = await getDocs(collection(db, "ventas_externas"));
            ingrExt = extSnap.docs.reduce((s, d) => s + (d.data().monto || 0), 0);
        } catch { /* colección vacía */ }

        const ingresos = ingrPlatf + ingrExt;

        // Costos desde costeos guardados
        let costosTot = 0;
        const costSnap = await getDocs(collection(db, "costeos")).catch(() => ({ docs: [] }));
        const costeos  = costSnap.docs.map(d => d.data());
        for (const ped of entregados) {
            for (const item of (ped.productos || [])) {
                const c = costeos.find(x => x.productoId === item.id);
                if (c) costosTot += (c.ctu || 0) * (item.cantidad || 1);
            }
        }

        const ganancia = ingresos - costosTot;
        const margenes = costeos.filter(c => c.precioVenta > 0)
            .map(c => ((c.precioVenta - c.ctu) / c.precioVenta) * 100);
        const margenProm = margenes.length
            ? margenes.reduce((a, b) => a + b, 0) / margenes.length : 0;

        const fmt = v => `$ ${Math.round(v).toLocaleString("es-CO")}`;
        document.getElementById("kpi-ingresos").textContent = fmt(ingresos);
        document.getElementById("kpi-costos").textContent   = fmt(costosTot);
        document.getElementById("kpi-ganancia").textContent = fmt(ganancia);
        document.getElementById("kpi-margen").textContent   = `${margenProm.toFixed(1)}%`;

        const kpiG = document.getElementById("kpi-ganancia").closest(".kpi-card");
        if (kpiG) kpiG.style.borderTopColor = ganancia >= 0 ? "#2E7D32" : "#C62828";

        return { ingresos, costosTot, ganancia, costeos };

    } catch (err) {
        console.error("Error KPIs:", err);
        return { ingresos: 0, costosTot: 0, ganancia: 0, costeos: [] };
    }
}

// ════════════════════════════════════════════════════════════
//  FIN-8: Registrar ventas externas
// ════════════════════════════════════════════════════════════

document.getElementById("btn-toggle-venta-ext").addEventListener("click", () => {
    const wrap = document.getElementById("form-venta-ext-wrap");
    wrap.classList.toggle("hidden");
    // Setear fecha de hoy por defecto
    const hoy = new Date().toISOString().split("T")[0];
    document.getElementById("vext-fecha").value = hoy;
});

document.getElementById("btn-cancelar-venta").addEventListener("click", () => {
    document.getElementById("form-venta-ext-wrap").classList.add("hidden");
});

document.getElementById("btn-guardar-venta").addEventListener("click", async () => {
    const concepto = document.getElementById("vext-concepto").value.trim();
    const monto    = parseFloat(document.getElementById("vext-monto").value) || 0;
    const fecha    = document.getElementById("vext-fecha").value;
    const nota     = document.getElementById("vext-nota").value.trim();

    if (!concepto || !monto || !fecha) {
        alert("Completa concepto, monto y fecha"); return;
    }

    const btn = document.getElementById("btn-guardar-venta");
    btn.textContent = "Guardando...";
    btn.disabled    = true;

    try {
        await addDoc(collection(db, "ventas_externas"), {
            concepto, monto, fecha, nota, creadoEn: new Date()
        });
        document.getElementById("vext-concepto").value = "";
        document.getElementById("vext-monto").value    = "";
        document.getElementById("vext-nota").value     = "";
        document.getElementById("form-venta-ext-wrap").classList.add("hidden");
        await iniciarResumen(); // refrescar KPIs y gráficas
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        btn.textContent = "Guardar venta";
        btn.disabled    = false;
    }
});

// ════════════════════════════════════════════════════════════
//  FIN-9 / FIN-10 / FIN-11: Gráficas con Chart.js
// ════════════════════════════════════════════════════════════

async function renderGraficas() {
    const { ingresos, costosTot, ganancia, costeos } = await calcularKPIs();

    const CAFE   = "#432818";
    const ROJO   = "#BC4749";
    const VERDE  = "#8BA040";
    const DORADO = "#F4B942";
    const CREMA  = "#D9D3C7";

    const defaults = {
        font: { family: "Georgia, serif", size: 11 },
        color: "#5D3A1A"
    };

    // ── FIN-9: Líneas — tendencia mensual simulada ────────────
    const ctxL = document.getElementById("chart-lineas").getContext("2d");
    if (chartLineas) chartLineas.destroy();

    const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    const base  = v => meses.map(() => Math.max(0, Math.round(v / 12 * (0.6 + Math.random() * 0.8))));

    chartLineas = new Chart(ctxL, {
        type: "line",
        data: {
            labels: meses,
            datasets: [
                { label: "Ingresos", data: base(ingresos),  borderColor: VERDE,  backgroundColor: "rgba(139,160,64,.12)", tension: 0.4, fill: true, pointRadius: 3 },
                { label: "Costos",   data: base(costosTot), borderColor: ROJO,   backgroundColor: "rgba(188,71,73,.10)",  tension: 0.4, fill: true, pointRadius: 3 },
                { label: "Ganancia", data: base(ganancia),  borderColor: DORADO, backgroundColor: "rgba(244,185,66,.10)", tension: 0.4, fill: true, pointRadius: 3 }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { ...defaults } } },
            scales: {
                x: { ticks: { color: defaults.color }, grid: { color: "rgba(67,40,24,.06)" } },
                y: { ticks: { color: defaults.color, callback: v => `$${(v/1000).toFixed(0)}k` }, grid: { color: "rgba(67,40,24,.06)" } }
            }
        }
    });

    // ── FIN-11: Torta — desglose de costos ───────────────────
    const ctxT = document.getElementById("chart-torta").getContext("2d");
    if (chartTorta) chartTorta.destroy();

    let mp = 0, ind = 0;
    costeos.forEach(c => {
        mp  += (c.cdu || 0);
        ind += (c.ciu || 0);
    });
    const total = mp + ind || 1;

    chartTorta = new Chart(ctxT, {
        type: "doughnut",
        data: {
            labels: ["Materia Prima / Directos", "Costos Indirectos"],
            datasets: [{
                data: [Math.round(mp/total*100), Math.round(ind/total*100)],
                backgroundColor: [CAFE, ROJO],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            cutout: "62%",
            plugins: { legend: { labels: { ...defaults } } }
        }
    });

    // ── FIN-10: Barras — CTU vs Precio por producto ───────────
    const ctxB = document.getElementById("chart-barras").getContext("2d");
    if (chartBarras) chartBarras.destroy();

    const labels = costeos.map(c => c.productoNombre || c.productoId);
    const ctuArr = costeos.map(c => c.ctu || 0);
    const pvArr  = costeos.map(c => c.precioVenta || 0);

    if (labels.length) {
        chartBarras = new Chart(ctxB, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    { label: "Costo Total Unitario", data: ctuArr, backgroundColor: ROJO,   borderRadius: 4 },
                    { label: "Precio de Venta",      data: pvArr,  backgroundColor: VERDE,  borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { labels: { ...defaults } } },
                scales: {
                    x: { ticks: { color: defaults.color }, grid: { color: "rgba(67,40,24,.06)" } },
                    y: { ticks: { color: defaults.color, callback: v => `$${Number(v).toLocaleString("es-CO")}` }, grid: { color: "rgba(67,40,24,.06)" } }
                }
            }
        });
    } else {
        const canvas = document.getElementById("chart-barras");
        canvas.getContext("2d").fillStyle = "#8B6347";
        const ctx = canvas.getContext("2d");
        ctx.font = "14px Georgia, serif";
        ctx.fillStyle = "#8B6347";
        ctx.textAlign = "center";
        ctx.fillText("Guarda costeos para ver la comparativa", canvas.width / 2, 60);
    }
}

// Agregar reglas de Firestore para ventas_externas a las reglas existentes
// (se hace manualmente en firestore.rules)
