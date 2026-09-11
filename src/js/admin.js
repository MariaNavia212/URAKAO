// ============================================================
//  URAKAO — Panel de Administración
//  Acceso restringido a: maria.navia212@pascualbravo.edu.co
// ============================================================

import { auth, db } from "./firebase.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const ADMIN_EMAILS = [
    "maria.navia212@pascualbravo.edu.co",
    "naviajimenezalejandra04@gmail.com"
];

let todosPedidos = [];
let filtroActual = "todos";

// ── Proteger ruta ─────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
    if (!user)                         { window.location.href = "/login"; return; }
    if (!ADMIN_EMAILS.includes(user.email)) { window.location.href = "/";     return; }
    document.getElementById("admin-email").textContent = user.email;
    cargarPedidos();
});

window.cerrarSesion = async () => {
    await signOut(auth);
    window.location.href = "/";
};

// ── Cargar todos los pedidos ──────────────────────────────────
async function cargarPedidos() {
    const lista = document.getElementById("pedidos-lista");
    try {
        const q    = query(collection(db, "pedidos"), orderBy("creadoEn", "desc"));
        const snap = await getDocs(q);

        todosPedidos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        actualizarStats();
        renderPedidos(todosPedidos);
    } catch (err) {
        lista.innerHTML = `<p class="error-admin">Error al cargar pedidos: ${err.message}</p>`;
    }
}

// ── Estadísticas ──────────────────────────────────────────────
function actualizarStats() {
    const pendientes  = todosPedidos.filter(p => p.estado === "pendiente").length;
    const entregados  = todosPedidos.filter(p => p.estado === "entregado").length;
    const ingresos    = todosPedidos
        .filter(p => p.estado !== "cancelado")
        .reduce((sum, p) => sum + (p.total || 0), 0);

    document.getElementById("stat-total").textContent      = todosPedidos.length;
    document.getElementById("stat-pendientes").textContent = pendientes;
    document.getElementById("stat-entregados").textContent = entregados;
    document.getElementById("stat-ingresos").textContent   = `$${Number(ingresos).toLocaleString("es-CO")}`;
}

// ── Filtros ───────────────────────────────────────────────────
document.querySelectorAll(".filtro-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".filtro-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        filtroActual = btn.dataset.estado;
        const filtrados = filtroActual === "todos"
            ? todosPedidos
            : todosPedidos.filter(p => p.estado === filtroActual);
        renderPedidos(filtrados);
    });
});

// ── Render lista de pedidos ───────────────────────────────────
function renderPedidos(pedidos) {
    const lista = document.getElementById("pedidos-lista");

    if (pedidos.length === 0) {
        lista.innerHTML = "<p class='sin-pedidos'>No hay pedidos en esta categoría.</p>";
        return;
    }

    lista.innerHTML = pedidos.map(p => {
        const fecha  = p.creadoEn?.toDate
            ? p.creadoEn.toDate().toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })
            : "—";
        const estado = p.estado || "pendiente";

        return `
        <div class="pedido-card" onclick="verDetalle('${p.id}')">
            <div class="pedido-card-header">
                <div>
                    <p class="pedido-cliente">${p.domicilio?.nombre || p.usuarioEmail}</p>
                    <p class="pedido-contacto">
                        📞 ${p.domicilio?.telefono || "—"} &nbsp;·&nbsp;
                        ✉️ ${p.usuarioEmail}
                    </p>
                </div>
                <span class="estado-badge estado-${estado}">${estado}</span>
            </div>
            <div class="pedido-card-body">
                <p class="pedido-dir">📍 ${p.domicilio?.direccion || "—"}, ${p.domicilio?.ciudad || ""}</p>
                <p class="pedido-productos">${(p.productos || []).map(i => `${i.nombre} ×${i.cantidad}`).join(" · ")}</p>
            </div>
            <div class="pedido-card-footer">
                <span class="pedido-fecha">${fecha}</span>
                <span class="pedido-total">$${Number(p.total || 0).toLocaleString("es-CO")}</span>
            </div>
        </div>
        `;
    }).join("");
}

// ── Ver detalle completo ──────────────────────────────────────
window.verDetalle = function (id) {
    const p = todosPedidos.find(x => x.id === id);
    if (!p) return;

    const fecha = p.creadoEn?.toDate
        ? p.creadoEn.toDate().toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" })
        : "—";

    const productosHtml = (p.productos || []).map(i => `
        <div class="detalle-producto">
            <span>${i.nombre} × ${i.cantidad}</span>
            <span>$${Number(i.precio * i.cantidad).toLocaleString("es-CO")}</span>
        </div>
    `).join("");

    document.getElementById("modal-titulo").textContent = `Pedido — ${p.domicilio?.nombre || p.usuarioEmail}`;
    document.getElementById("modal-body").innerHTML = `
        <div class="detalle-seccion">
            <h4>Cliente</h4>
            <p><strong>Nombre:</strong> ${p.domicilio?.nombre || "—"}</p>
            <p><strong>Teléfono:</strong>
                <a href="tel:${p.domicilio?.telefono}" class="link-tel">
                    📞 ${p.domicilio?.telefono || "—"}
                </a>
                <a href="https://wa.me/57${(p.domicilio?.telefono || "").replace(/\s/g,"")}?text=Hola%20${encodeURIComponent(p.domicilio?.nombre || "")}%2C%20tu%20pedido%20URAKAO%20est%C3%A1%20en%20camino%20%F0%9F%8D%AB"
                   target="_blank" class="link-wa">💬 WhatsApp</a>
            </p>
            <p><strong>Correo:</strong> ${p.usuarioEmail}</p>
        </div>

        <div class="detalle-seccion">
            <h4>Entrega</h4>
            <p><strong>Dirección:</strong> ${p.domicilio?.direccion || "—"}</p>
            <p><strong>Ciudad:</strong> ${p.domicilio?.ciudad || "—"}</p>
            <p><strong>Indicaciones:</strong> ${p.domicilio?.indicaciones || "Ninguna"}</p>
            <p><strong>Pago:</strong> ${p.domicilio?.metodoPago || "—"}</p>
        </div>

        <div class="detalle-seccion">
            <h4>Productos</h4>
            ${productosHtml}
            <div class="detalle-total">
                <span>Total</span>
                <span>$${Number(p.total || 0).toLocaleString("es-CO")}</span>
            </div>
        </div>

        <div class="detalle-seccion">
            <h4>Cambiar estado</h4>
            <p class="pedido-fecha">Pedido recibido: ${fecha}</p>
            <div class="estado-botones">
                <button onclick="cambiarEstado('${p.id}', 'pendiente')"
                    class="btn-estado ${p.estado === 'pendiente' ? 'active' : ''}">Pendiente</button>
                <button onclick="cambiarEstado('${p.id}', 'en camino')"
                    class="btn-estado ${p.estado === 'en camino' ? 'active' : ''}">En camino</button>
                <button onclick="cambiarEstado('${p.id}', 'entregado')"
                    class="btn-estado ${p.estado === 'entregado' ? 'active' : ''}">Entregado</button>
                <button onclick="cambiarEstado('${p.id}', 'cancelado')"
                    class="btn-estado btn-cancelar ${p.estado === 'cancelado' ? 'active' : ''}">Cancelado</button>
            </div>
        </div>
    `;

    document.getElementById("modal-overlay").classList.remove("hidden");
    document.getElementById("modal-pedido").classList.remove("hidden");
};

// ── Cambiar estado del pedido ─────────────────────────────────
window.cambiarEstado = async function (id, nuevoEstado) {
    try {
        await updateDoc(doc(db, "pedidos", id), { estado: nuevoEstado });
        const pedido = todosPedidos.find(p => p.id === id);
        if (pedido) pedido.estado = nuevoEstado;
        actualizarStats();
        cerrarModal();
        const filtrados = filtroActual === "todos"
            ? todosPedidos
            : todosPedidos.filter(p => p.estado === filtroActual);
        renderPedidos(filtrados);
    } catch (err) {
        alert("Error al actualizar: " + err.message);
    }
};

window.cerrarModal = function () {
    document.getElementById("modal-overlay").classList.add("hidden");
    document.getElementById("modal-pedido").classList.add("hidden");
};
