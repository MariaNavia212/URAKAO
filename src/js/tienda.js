// ============================================================
//  URAKAO — Tienda: productos + carrito
//  RF1: Catálogo dinámico con especificaciones técnicas
//  RF2: Personalización de pedido (endulzante + adiciones)
//  RF3: Gestión de carrito (agregar, editar, eliminar)
// ============================================================

import { auth, db } from "./firebase.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const IMG_DEFAULT = "/Fotos de Urakao Oficial/Barra de chocolate p1.png";

// ── Opciones de personalización (RF2) ─────────────────────────
const ENDULZANTES = [
    { id: "ninguno",    nombre: "Sin endulzante",     precio: 0 },
    { id: "panela",     nombre: "Panela orgánica",    precio: 0 },
    { id: "stevia",     nombre: "Stevia",             precio: 1500 },
    { id: "miel",       nombre: "Miel de abejas",     precio: 2000 },
    { id: "azucar",     nombre: "Azúcar de caña",     precio: 0 }
];

const ADICIONES = [
    { id: "almendras",  nombre: "Almendras",          precio: 3000 },
    { id: "mani",       nombre: "Maní tostado",       precio: 2000 },
    { id: "nueces",     nombre: "Nueces",             precio: 3500 },
    { id: "coco",       nombre: "Coco rallado",       precio: 2000 },
    { id: "canela",     nombre: "Canela",             precio: 1000 },
    { id: "cardamomo",  nombre: "Cardamomo",          precio: 1500 },
    { id: "jengibre",   nombre: "Jengibre",           precio: 1500 },
    { id: "chile",      nombre: "Chile suave",        precio: 1000 }
];

// ── Auth — solo identifica si hay sesión, no bloquea ─────────
let usuarioActual = null;

onAuthStateChanged(auth, (user) => {
    usuarioActual = user;
    const greeting = document.getElementById("user-name");
    const btnLogout = document.getElementById("btn-logout");
    const btnLogin  = document.getElementById("btn-login");

    if (user) {
        if (greeting) greeting.textContent = `Hola, ${user.displayName?.split(" ")[0] || ""}`;
        if (btnLogout) btnLogout.classList.remove("hidden");
        if (btnLogin)  btnLogin.classList.add("hidden");
    } else {
        if (greeting) greeting.textContent = "";
        if (btnLogout) btnLogout.classList.add("hidden");
        if (btnLogin)  btnLogin.classList.remove("hidden");
    }
    cargarProductos();
});

window.cerrarSesion = async function () {
    await signOut(auth);
    window.location.href = "/login";
};

// ── Estado del carrito (RF3) ──────────────────────────────────
let carrito = JSON.parse(localStorage.getItem("urakao_carrito") || "[]");
let productosCache = []; // Para acceder a los datos del producto en el modal

function guardarCarrito() {
    localStorage.setItem("urakao_carrito", JSON.stringify(carrito));
}

// ── RF1: Cargar productos con especificaciones técnicas ───────
async function cargarProductos() {
    const grid = document.getElementById("productos-grid");
    grid.innerHTML = "<p class='loading-spinner'>Cargando productos...</p>";

    try {
        const q    = query(collection(db, "productos"), orderBy("nombre"));
        const snap = await getDocs(q);

        if (snap.empty) {
            grid.innerHTML = "<p class='sin-productos'>No hay productos disponibles por el momento.</p>";
            return;
        }

        productosCache = [];
        snap.forEach((docSnap) => {
            const p = { id: docSnap.id, ...docSnap.data() };
            if (p.disponible !== false) productosCache.push(p);
        });

        renderProductos(productosCache);
        actualizarContadorCarrito();
    } catch (err) {
        console.error("Error cargando productos:", err);
        grid.innerHTML = `<p class='sin-productos'>Error al cargar productos: ${err.message}</p>`;
    }
}

function renderProductos(lista) {
    const grid = document.getElementById("productos-grid");
    grid.innerHTML = "";
    if (!lista.length) {
        grid.innerHTML = "<p class='sin-productos'>No se encontraron productos.</p>";
        return;
    }
    lista.forEach(p => grid.appendChild(crearTarjeta(p)));
}

// ── Buscador ──────────────────────────────────────────────────
document.getElementById("buscador-tienda").addEventListener("input", function () {
    const texto = this.value.trim().toLowerCase();
    if (!texto) {
        renderProductos(productosCache);
        return;
    }
    const filtrados = productosCache.filter(p =>
        (p.nombre        || "").toLowerCase().includes(texto) ||
        (p.descripcion   || "").toLowerCase().includes(texto) ||
        (p.categoria     || "").toLowerCase().includes(texto) ||
        (p.origen        || "").toLowerCase().includes(texto)
    );
    renderProductos(filtrados);
});

// ── RF1: Tarjeta con especificaciones técnicas ────────────────
function crearTarjeta(producto) {
    const card   = document.createElement("div");
    card.className = "producto-card visible";
    const imgUrl = producto.imagen || IMG_DEFAULT;

    // Especificaciones técnicas (RF1)
    const cacao  = producto.porcentajeCacao || producto.cacao || null;
    const origen = producto.origenGrano || producto.origen || "Urabá, Colombia";

    let specsHtml = `<div class="producto-specs">`;
    if (cacao) specsHtml += `<span class="spec-badge">🍫 ${cacao}% Cacao</span>`;
    specsHtml += `<span class="spec-badge">📍 ${origen}</span>`;
    specsHtml += `</div>`;

    card.innerHTML = `
        <div class="producto-img">
            <img src="${imgUrl}" alt="${producto.nombre}" onerror="this.style.opacity='0'">
        </div>
        <div class="producto-info">
            <p class="producto-cat">${producto.categoria || ""}</p>
            <h3>${producto.nombre}</h3>
            <p class="producto-desc">${producto.descripcion || ""}</p>
            ${specsHtml}
            <div class="producto-footer">
                <span class="producto-precio">$${formatPrecio(producto.precio)}</span>
                <button class="btn-agregar">+ Personalizar</button>
            </div>
            <a class="btn-wa-producto"
               href="https://wa.me/573046309168?text=${encodeURIComponent(`Hola URAKAO 🍫 Me interesa el producto: *${producto.nombre}* ($${formatPrecio(producto.precio)}). ¿Está disponible?`)}"
               target="_blank" rel="noopener">
                Consultar disponibilidad
            </a>
        </div>
    `;

    // RF2: Abrir modal de personalización — requiere login
    card.querySelector(".btn-agregar").addEventListener("click", () => {
        if (!usuarioActual) {
            window.location.href = "/login";
            return;
        }
        abrirModalPersonalizacion(producto, imgUrl);
    });

    return card;
}

// ── RF2: Modal de personalización ─────────────────────────────
function abrirModalPersonalizacion(producto, imgUrl) {
    // Crear modal si no existe
    let modal = document.getElementById("modal-personalizar");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-personalizar";
        modal.innerHTML = `
            <div class="modal-pers-overlay" id="pers-overlay"></div>
            <div class="modal-pers-content" id="pers-content"></div>
        `;
        document.body.appendChild(modal);
    }

    const content = document.getElementById("pers-content");
    const cacao   = producto.porcentajeCacao || producto.cacao || null;
    const origen  = producto.origenGrano || producto.origen || "Urabá, Colombia";

    content.innerHTML = `
        <div class="pers-header">
            <h3>Personaliza tu producto</h3>
            <button class="pers-close" id="pers-close">✕</button>
        </div>
        <div class="pers-body">
            <div class="pers-producto">
                <img src="${imgUrl}" alt="${producto.nombre}" onerror="this.style.opacity='0'">
                <div>
                    <h4>${producto.nombre}</h4>
                    <p class="pers-precio-base">$${formatPrecio(producto.precio)}</p>
                    ${cacao ? `<span class="spec-badge-sm">🍫 ${cacao}% Cacao</span>` : ""}
                    <span class="spec-badge-sm">📍 ${origen}</span>
                </div>
            </div>

            <div class="pers-seccion">
                <h5>Tipo de endulzante</h5>
                <div class="pers-opciones" id="pers-endulzantes">
                    ${ENDULZANTES.map(e => `
                        <label class="pers-opcion">
                            <input type="radio" name="endulzante" value="${e.id}" ${e.id === "ninguno" ? "checked" : ""}>
                            <span class="pers-opcion-nombre">${e.nombre}</span>
                            ${e.precio > 0 ? `<span class="pers-opcion-precio">+$${formatPrecio(e.precio)}</span>` : ""}
                        </label>
                    `).join("")}
                </div>
            </div>

            <div class="pers-seccion">
                <h5>Adiciones <span class="pers-hint">(puedes elegir varias)</span></h5>
                <div class="pers-opciones" id="pers-adiciones">
                    ${ADICIONES.map(a => `
                        <label class="pers-opcion">
                            <input type="checkbox" name="adicion" value="${a.id}">
                            <span class="pers-opcion-nombre">${a.nombre}</span>
                            <span class="pers-opcion-precio">+$${formatPrecio(a.precio)}</span>
                        </label>
                    `).join("")}
                </div>
            </div>

            <div class="pers-total">
                <span>Total:</span>
                <span id="pers-total-precio">$${formatPrecio(producto.precio)}</span>
            </div>

            <button class="pers-btn-agregar" id="pers-btn-agregar">
                Agregar al carrito
            </button>
        </div>
    `;

    modal.classList.remove("hidden");
    modal.style.display = "block";

    // Calcular precio dinámico
    const calcularTotal = () => {
        let total = producto.precio;
        const endSel = content.querySelector('input[name="endulzante"]:checked');
        if (endSel) {
            const end = ENDULZANTES.find(e => e.id === endSel.value);
            if (end) total += end.precio;
        }
        content.querySelectorAll('input[name="adicion"]:checked').forEach(cb => {
            const ad = ADICIONES.find(a => a.id === cb.value);
            if (ad) total += ad.precio;
        });
        document.getElementById("pers-total-precio").textContent = `$${formatPrecio(total)}`;
    };

    content.querySelectorAll('input[name="endulzante"]').forEach(r => r.addEventListener("change", calcularTotal));
    content.querySelectorAll('input[name="adicion"]').forEach(c => c.addEventListener("change", calcularTotal));

    // Cerrar modal
    const cerrar = () => { modal.style.display = "none"; };
    document.getElementById("pers-close").addEventListener("click", cerrar);
    document.getElementById("pers-overlay").addEventListener("click", cerrar);

    // Agregar al carrito con personalización
    document.getElementById("pers-btn-agregar").addEventListener("click", () => {
        const endSel = content.querySelector('input[name="endulzante"]:checked');
        const endulzante = endSel ? ENDULZANTES.find(e => e.id === endSel.value) : ENDULZANTES[0];

        const adiciones = [];
        content.querySelectorAll('input[name="adicion"]:checked').forEach(cb => {
            const ad = ADICIONES.find(a => a.id === cb.value);
            if (ad) adiciones.push(ad);
        });

        const precioExtra = (endulzante?.precio || 0) + adiciones.reduce((s, a) => s + a.precio, 0);
        const precioFinal = producto.precio + precioExtra;

        // Crear ID único para esta combinación
        const personalizacionId = `${producto.id}_${endulzante.id}_${adiciones.map(a => a.id).sort().join("-") || "sin"}`;

        const existente = carrito.find(i => i.personalizacionId === personalizacionId);
        if (existente) {
            existente.cantidad++;
        } else {
            carrito.push({
                id: producto.id,
                personalizacionId,
                nombre: producto.nombre,
                precio: precioFinal,
                precioBase: producto.precio,
                imagen: imgUrl,
                cantidad: 1,
                endulzante: endulzante.nombre,
                adiciones: adiciones.map(a => a.nombre),
                personalizacion: {
                    endulzante: endulzante,
                    adiciones: adiciones
                }
            });
        }

        guardarCarrito();
        actualizarContadorCarrito();
        renderCarrito();
        cerrar();

        // Abrir carrito
        document.getElementById("carrito-panel").classList.remove("hidden");
        document.getElementById("carrito-overlay").classList.remove("hidden");
    });
}

function formatPrecio(precio) {
    return Number(precio).toLocaleString("es-CO");
}

// ── RF3: Gestión de carrito (agregar, editar, eliminar) ───────
window.cambiarCantidad = function (persId, delta) {
    const item = carrito.find(i => i.personalizacionId === persId || i.id === persId);
    if (!item) return;
    item.cantidad += delta;
    if (item.cantidad <= 0) {
        carrito = carrito.filter(i => (i.personalizacionId || i.id) !== persId);
    }
    guardarCarrito();
    actualizarContadorCarrito();
    renderCarrito();
};

window.eliminarDelCarrito = function (persId) {
    carrito = carrito.filter(i => (i.personalizacionId || i.id) !== persId);
    guardarCarrito();
    actualizarContadorCarrito();
    renderCarrito();
};

window.abrirCarrito = function () {
    if (!usuarioActual) {
        window.location.href = "/login";
        return;
    }
    document.getElementById("carrito-panel").classList.remove("hidden");
    document.getElementById("carrito-overlay").classList.remove("hidden");
};

window.toggleCarrito = function () {
    if (!usuarioActual) {
        window.location.href = "/login";
        return;
    }
    document.getElementById("carrito-panel").classList.toggle("hidden");
    document.getElementById("carrito-overlay").classList.toggle("hidden");
};

window.irACheckout = function () {
    if (carrito.length === 0) return;
    window.location.href = "/checkout";
};

function actualizarContadorCarrito() {
    const total = carrito.reduce((sum, i) => sum + i.cantidad, 0);
    document.getElementById("carrito-count").textContent = total;
}

function renderCarrito() {
    const container = document.getElementById("carrito-items");
    const totalEl   = document.getElementById("carrito-total");

    if (carrito.length === 0) {
        container.innerHTML = "<p class='carrito-vacio'>Tu carrito está vacío</p>";
        totalEl.textContent = "$0";
        return;
    }

    let total = 0;
    container.innerHTML = carrito.map(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        const itemId = item.personalizacionId || item.id;

        // Mostrar personalización (RF2 + RF3)
        let persHtml = "";
        if (item.endulzante && item.endulzante !== "Sin endulzante") {
            persHtml += `<span class="carrito-pers">🍯 ${item.endulzante}</span>`;
        }
        if (item.adiciones && item.adiciones.length > 0) {
            persHtml += `<span class="carrito-pers">🥜 ${item.adiciones.join(", ")}</span>`;
        }

        return `
            <div class="carrito-item">
                <img src="${item.imagen || IMG_DEFAULT}" alt="${item.nombre}"
                     onerror="this.style.opacity='0'">
                <div class="carrito-item-info">
                    <p class="carrito-item-nombre">${item.nombre}</p>
                    ${persHtml}
                    <p class="carrito-item-precio">$${formatPrecio(item.precio)} c/u</p>
                    <div class="carrito-item-cantidad">
                        <button onclick="cambiarCantidad('${itemId}', -1)">−</button>
                        <span>${item.cantidad}</span>
                        <button onclick="cambiarCantidad('${itemId}', 1)">+</button>
                        <button class="btn-eliminar" onclick="eliminarDelCarrito('${itemId}')">🗑</button>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    totalEl.textContent = `$${formatPrecio(total)}`;
}

// Renderizar carrito al cargar
renderCarrito();
actualizarContadorCarrito();
