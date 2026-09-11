// ============================================================
//  URAKAO — Panel de Administración
// ============================================================

import { auth, db } from "./firebase.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    collection, getDocs, doc,
    updateDoc, deleteDoc, addDoc,
    query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Cloudinary config ─────────────────────────────────────────
const CLOUDINARY_CLOUD  = "dkouwikge";
const CLOUDINARY_PRESET = "ml_defauld";

// ── Emails con acceso admin ───────────────────────────────────
const ADMINS = [
    "maria.navia212@pascualbravo.edu.co",
    "naviajimenezalejandra04@gmail.com"
];

// ── Estado de la app ──────────────────────────────────────────
let todosPedidos  = [];
let todosProductos = [];
let filtroActual  = "todos";

// ════════════════════════════════════════════════════════════
//  UTILIDADES
// ════════════════════════════════════════════════════════════

/** Muestra una notificación toast */
function toast(mensaje, tipo = "ok") {
    const container = document.getElementById("toast-container");
    const el = document.createElement("div");
    el.className = `toast toast-${tipo}`;
    const iconos = { ok: "✓", error: "✕", info: "ℹ" };
    el.innerHTML = `<span>${iconos[tipo] || "ℹ"}</span><span>${mensaje}</span>`;
    container.appendChild(el);
    setTimeout(() => {
        el.classList.add("toast-out");
        el.addEventListener("animationend", () => el.remove());
    }, 3500);
}

/** Devuelve la clase CSS del badge según estado */
function badgeClass(estado) {
    const mapa = {
        "pendiente":  "badge-pendiente",
        "en camino":  "badge-en-camino",
        "entregado":  "badge-entregado",
        "cancelado":  "badge-cancelado"
    };
    return mapa[estado] ?? "badge-pendiente";
}

/** Formatea fecha desde Firestore Timestamp */
function formatFecha(ts, estilo = "short") {
    if (!ts?.toDate) return "—";
    return ts.toDate().toLocaleString("es-CO", {
        dateStyle: estilo,
        timeStyle: "short"
    });
}

// ════════════════════════════════════════════════════════════
//  MODAL DE CONFIRMACIÓN
// ════════════════════════════════════════════════════════════

/**
 * Muestra un modal de confirmación personalizado.
 * @param {string} titulo  - Título del modal
 * @param {string} mensaje - Descripción de la acción
 * @returns {Promise<boolean>} true si el usuario confirma, false si cancela
 */
function confirmar(titulo, mensaje) {
    return new Promise(resolve => {
        document.getElementById("confirm-titulo").textContent  = titulo;
        document.getElementById("confirm-mensaje").textContent = mensaje;

        const overlay = document.getElementById("modal-confirm-overlay");
        const modal   = document.getElementById("modal-confirm");
        overlay.classList.remove("hidden");
        modal.classList.remove("hidden");

        const btnOk     = document.getElementById("confirm-btn-ok");
        const btnCancel = document.getElementById("confirm-btn-cancelar");

        function cerrar(resultado) {
            overlay.classList.add("hidden");
            modal.classList.add("hidden");
            btnOk.removeEventListener("click", onOk);
            btnCancel.removeEventListener("click", onCancel);
            resolve(resultado);
        }

        const onOk     = () => cerrar(true);
        const onCancel = () => cerrar(false);

        btnOk.addEventListener("click",     onOk);
        btnCancel.addEventListener("click", onCancel);
    });
}


    document.getElementById("modal-overlay").classList.add("hidden");
    document.getElementById("modal-pedido").classList.add("hidden");
    document.getElementById("modal-producto").classList.add("hidden");
}

// ════════════════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════════════════

onAuthStateChanged(auth, user => {
    if (!user)                     { window.location.href = "/login"; return; }
    if (!ADMINS.includes(user.email)) { window.location.href = "/";  return; }

    document.getElementById("admin-email").textContent = user.displayName || user.email;
    cargarPedidos();
    cargarProductos();
});

document.getElementById("btn-salir").addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "/";
});

// ════════════════════════════════════════════════════════════
//  TABS
// ════════════════════════════════════════════════════════════

document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const tab = btn.dataset.tab;
        document.getElementById("tab-pedidos").classList.toggle("hidden",   tab !== "pedidos");
        document.getElementById("tab-productos").classList.toggle("hidden", tab !== "productos");
    });
});

// ════════════════════════════════════════════════════════════
//  PEDIDOS
// ════════════════════════════════════════════════════════════

async function cargarPedidos() {
    try {
        const snap = await getDocs(
            query(collection(db, "pedidos"), orderBy("creadoEn", "desc"))
        );
        todosPedidos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        actualizarStats();
        renderPedidos(todosPedidos);
    } catch (err) {
        document.getElementById("pedidos-grid").innerHTML =
            `<p class="msg-centro" style="color:#c62828">Error al cargar pedidos: ${err.message}</p>`;
    }
}

function actualizarStats() {
    const pend = todosPedidos.filter(p => p.estado === "pendiente").length;
    const entr = todosPedidos.filter(p => p.estado === "entregado").length;
    const ing  = todosPedidos
        .filter(p => p.estado !== "cancelado")
        .reduce((s, p) => s + (p.total || 0), 0);

    document.getElementById("stat-total").textContent      = todosPedidos.length;
    document.getElementById("stat-pendientes").textContent = pend;
    document.getElementById("stat-entregados").textContent = entr;
    document.getElementById("stat-ingresos").textContent   = `$ ${ing.toLocaleString("es-CO")}`;
}

// ── Filtros por estado ────────────────────────────────────────
document.querySelectorAll(".filtro-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".filtro-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        filtroActual = btn.dataset.estado;
        const lista = filtroActual === "todos"
            ? todosPedidos
            : todosPedidos.filter(p => p.estado === filtroActual);
        renderPedidos(lista);
    });
});

function renderPedidos(lista) {
    const grid = document.getElementById("pedidos-grid");

    if (!lista.length) {
        grid.innerHTML = `<p class="msg-centro">No hay pedidos en esta categoría.</p>`;
        return;
    }

    grid.innerHTML = lista.map(p => {
        const estado = p.estado || "pendiente";
        const prods  = (p.productos || []).map(i => `${i.nombre} ×${i.cantidad}`).join(" · ");
        return `
        <article class="pedido-card" data-id="${p.id}" tabindex="0" role="button"
                 aria-label="Ver pedido de ${p.domicilio?.nombre || p.usuarioEmail}">
            <div class="pc-header">
                <div>
                    <p class="pc-nombre">${p.domicilio?.nombre || p.usuarioEmail}</p>
                    <p class="pc-contacto">📞 ${p.domicilio?.telefono || "—"} &nbsp;·&nbsp; ✉️ ${p.usuarioEmail}</p>
                </div>
                <span class="badge ${badgeClass(estado)}">${estado}</span>
            </div>
            <div class="pc-body">
                <p class="pc-dir">📍 ${p.domicilio?.direccion || "—"}, ${p.domicilio?.ciudad || ""}</p>
                <p class="pc-productos">${prods}</p>
            </div>
            <div class="pc-footer">
                <span class="pc-fecha">${formatFecha(p.creadoEn)}</span>
                <span class="pc-total">$ ${Number(p.total || 0).toLocaleString("es-CO")}</span>
            </div>
        </article>`;
    }).join("");

    grid.querySelectorAll(".pedido-card").forEach(card => {
        const abrir = () => abrirModalPedido(card.dataset.id);
        card.addEventListener("click", abrir);
        card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") abrir(); });
    });
}

function abrirModalPedido(id) {
    const p = todosPedidos.find(x => x.id === id);
    if (!p) return;

    const tel    = (p.domicilio?.telefono || "").replace(/\s/g, "");
    const waMsg  = encodeURIComponent(`Hola ${p.domicilio?.nombre || ""}, tu pedido URAKAO está en camino 🍫`);
    const estado = p.estado || "pendiente";

    const prodsHtml = (p.productos || []).map(i => `
        <div class="prod-row">
            <span>${i.nombre} × ${i.cantidad}</span>
            <span>$ ${Number(i.precio * i.cantidad).toLocaleString("es-CO")}</span>
        </div>`).join("");

    document.getElementById("modal-pedido-titulo").textContent =
        p.domicilio?.nombre || p.usuarioEmail;

    document.getElementById("modal-pedido-body").innerHTML = `
        <div class="detalle-bloque">
            <p class="detalle-titulo">Cliente</p>
            <div class="detalle-row"><strong>Nombre</strong><span>${p.domicilio?.nombre || "—"}</span></div>
            <div class="detalle-row"><strong>Correo</strong><span>${p.usuarioEmail}</span></div>
            <div class="detalle-row"><strong>Teléfono</strong><span>${p.domicilio?.telefono || "—"}</span></div>
            <div style="margin-top:0.8rem">
                <a href="tel:${tel}" class="btn-tel">📞 Llamar</a>
                <a href="https://wa.me/57${tel}?text=${waMsg}" target="_blank" rel="noopener" class="btn-wa">💬 WhatsApp</a>
            </div>
        </div>

        <div class="detalle-bloque">
            <p class="detalle-titulo">Entrega</p>
            <div class="detalle-row"><strong>Dirección</strong><span>${p.domicilio?.direccion || "—"}</span></div>
            <div class="detalle-row"><strong>Ciudad</strong><span>${p.domicilio?.ciudad || "—"}</span></div>
            <div class="detalle-row"><strong>Indicaciones</strong><span>${p.domicilio?.indicaciones || "Ninguna"}</span></div>
            <div class="detalle-row"><strong>Pago</strong><span>${p.domicilio?.metodoPago || "—"}</span></div>
            <div class="detalle-row"><strong>Fecha</strong><span>${formatFecha(p.creadoEn, "long")}</span></div>
        </div>

        <div class="detalle-bloque">
            <p class="detalle-titulo">Productos</p>
            ${prodsHtml}
            <div class="prod-total">
                <span>Total</span>
                <span>$ ${Number(p.total || 0).toLocaleString("es-CO")}</span>
            </div>
        </div>

        <div class="detalle-bloque">
            <p class="detalle-titulo">Estado del pedido</p>
            <div class="estado-btns">
                <button class="btn-estado ${estado === 'pendiente'  ? 'activo' : ''}" data-nuevo="pendiente">Pendiente</button>
                <button class="btn-estado ${estado === 'en camino'  ? 'activo' : ''}" data-nuevo="en camino">En camino</button>
                <button class="btn-estado ${estado === 'entregado'  ? 'activo' : ''}" data-nuevo="entregado">Entregado</button>
                <button class="btn-estado btn-cancelar ${estado === 'cancelado' ? 'activo' : ''}" data-nuevo="cancelado">Cancelado</button>
            </div>
            <button class="btn-eliminar-pedido" data-id="${id}">🗑 Eliminar pedido</button>
        </div>
    `;

    // Eventos botones de estado
    document.querySelectorAll(".btn-estado").forEach(btn => {
        btn.addEventListener("click", () => cambiarEstado(id, btn.dataset.nuevo));
    });

    document.querySelector(".btn-eliminar-pedido").addEventListener("click", () => {
        eliminarPedido(id);
    });

    document.getElementById("modal-overlay").classList.remove("hidden");
    document.getElementById("modal-pedido").classList.remove("hidden");
}

async function cambiarEstado(id, nuevoEstado) {
    try {
        await updateDoc(doc(db, "pedidos", id), { estado: nuevoEstado });
        const p = todosPedidos.find(x => x.id === id);
        if (p) p.estado = nuevoEstado;
        actualizarStats();
        cerrarModales();
        const lista = filtroActual === "todos"
            ? todosPedidos
            : todosPedidos.filter(p => p.estado === filtroActual);
        renderPedidos(lista);
        toast(`Estado actualizado: ${nuevoEstado}`, "ok");
    } catch (err) {
        toast("Error al cambiar estado: " + err.message, "error");
    }
}

async function eliminarPedido(id) {
    const p = todosPedidos.find(x => x.id === id);
    const nombre = p?.domicilio?.nombre || p?.usuarioEmail || "este pedido";
    const ok = await confirmar(
        "Eliminar pedido",
        `¿Segura que quieres eliminar el pedido de "${nombre}"? Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    try {
        await deleteDoc(doc(db, "pedidos", id));
        todosPedidos = todosPedidos.filter(x => x.id !== id);
        actualizarStats();
        cerrarModales();
        const lista = filtroActual === "todos"
            ? todosPedidos
            : todosPedidos.filter(p => p.estado === filtroActual);
        renderPedidos(lista);
        toast("Pedido eliminado", "ok");
    } catch (err) {
        toast("Error al eliminar: " + err.message, "error");
    }
}

// ════════════════════════════════════════════════════════════
//  PRODUCTOS
// ════════════════════════════════════════════════════════════

async function cargarProductos() {
    try {
        const snap = await getDocs(query(collection(db, "productos"), orderBy("nombre")));
        todosProductos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderProductos(todosProductos);
    } catch {
        // Fallback sin ordenación si no hay índice
        try {
            const snap2 = await getDocs(collection(db, "productos"));
            todosProductos = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
            renderProductos(todosProductos);
        } catch (err2) {
            document.getElementById("productos-grid").innerHTML =
                `<p class="msg-centro" style="color:#c62828">Error al cargar productos: ${err2.message}</p>`;
        }
    }
}

function renderProductos(lista) {
    const grid = document.getElementById("productos-grid");

    if (!lista.length) {
        grid.innerHTML = `<p class="msg-centro">No hay productos registrados.</p>`;
        return;
    }

    grid.innerHTML = lista.map(p => {
        const imgHtml = p.imagen
            ? `<img class="prod-img" src="${p.imagen}" alt="${p.nombre}"
                    onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : "";
        const placeholder = `<div class="prod-img-placeholder" ${p.imagen ? 'style="display:none"' : ""}>🍫</div>`;
        const dispHtml = p.disponible !== false
            ? `<span class="prod-disponible">● Disponible</span>`
            : `<span class="prod-no-disponible">● No disponible</span>`;

        return `
        <div class="producto-card">
            ${imgHtml}${placeholder}
            <div class="prod-info">
                <p class="prod-nombre">${p.nombre || "Sin nombre"}</p>
                <p class="prod-desc">${p.descripcion || ""}</p>
                <div class="prod-meta">
                    <span class="prod-precio">$ ${Number(p.precio || 0).toLocaleString("es-CO")}</span>
                    <span class="prod-categoria">${p.categoria || "—"}</span>
                </div>
                ${dispHtml}
            </div>
            <div class="prod-actions">
                <button class="btn-editar-prod"   data-id="${p.id}">✏ Editar</button>
                <button class="btn-eliminar-prod" data-id="${p.id}">🗑 Eliminar</button>
            </div>
        </div>`;
    }).join("");

    grid.querySelectorAll(".btn-editar-prod").forEach(btn => {
        btn.addEventListener("click", () => abrirFormProducto(btn.dataset.id));
    });
    grid.querySelectorAll(".btn-eliminar-prod").forEach(btn => {
        btn.addEventListener("click", () => eliminarProducto(btn.dataset.id));
    });
}

async function eliminarProducto(id) {
    const p = todosProductos.find(x => x.id === id);
    const ok = await confirmar(
        "Eliminar producto",
        `¿Segura que quieres eliminar "${p?.nombre || "este producto"}"? Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    try {
        await deleteDoc(doc(db, "productos", id));
        todosProductos = todosProductos.filter(x => x.id !== id);
        renderProductos(todosProductos);
        toast(`"${p?.nombre}" eliminado`, "ok");
    } catch (err) {
        toast("Error al eliminar: " + err.message, "error");
    }
}

// ════════════════════════════════════════════════════════════
//  FORMULARIO PRODUCTO + UPLOAD DE IMAGEN
// ════════════════════════════════════════════════════════════

document.getElementById("btn-nuevo-producto").addEventListener("click", () => abrirFormProducto(null));

function abrirFormProducto(id) {
    const p = id ? todosProductos.find(x => x.id === id) : null;

    document.getElementById("modal-producto-titulo").textContent = p ? "Editar Producto" : "Nuevo Producto";
    document.getElementById("prod-id").value           = p?.id          || "";
    document.getElementById("prod-nombre").value       = p?.nombre      || "";
    document.getElementById("prod-descripcion").value  = p?.descripcion || "";
    document.getElementById("prod-precio").value       = p?.precio      || "";
    document.getElementById("prod-categoria").value    = p?.categoria   || "";
    document.getElementById("prod-imagen-url").value   = p?.imagen      || "";
    document.getElementById("prod-disponible").checked = p?.disponible !== false;

    // Resetear área de upload
    resetUploadArea();

    // Si hay imagen existente, mostrar preview
    if (p?.imagen) {
        mostrarPreview(p.imagen);
    }

    document.getElementById("modal-overlay").classList.remove("hidden");
    document.getElementById("modal-producto").classList.remove("hidden");
}

// ── Upload área ───────────────────────────────────────────────
const fileInput   = document.getElementById("prod-imagen-file");
const uploadArea  = document.getElementById("upload-area");

fileInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) handleFileSelected(file);
});

// Drag & drop
uploadArea.addEventListener("dragover",  e => { e.preventDefault(); uploadArea.classList.add("dragover"); });
uploadArea.addEventListener("dragleave", () => uploadArea.classList.remove("dragover"));
uploadArea.addEventListener("drop", e => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFileSelected(file);
});

document.getElementById("upload-remove").addEventListener("click", e => {
    e.stopPropagation();
    resetUploadArea();
    document.getElementById("prod-imagen-url").value = "";
    fileInput.value = "";
});

function handleFileSelected(file) {
    if (file.size > 5 * 1024 * 1024) {
        toast("La imagen supera los 5 MB", "error");
        return;
    }
    // Mostrar preview local inmediato
    const reader = new FileReader();
    reader.onload = e => mostrarPreview(e.target.result);
    reader.readAsDataURL(file);
}

function mostrarPreview(src) {
    document.getElementById("upload-placeholder").classList.add("hidden");
    document.getElementById("upload-progress").classList.add("hidden");
    document.getElementById("upload-preview").classList.remove("hidden");
    document.getElementById("preview-img").src = src;
}

function resetUploadArea() {
    document.getElementById("upload-placeholder").classList.remove("hidden");
    document.getElementById("upload-preview").classList.add("hidden");
    document.getElementById("upload-progress").classList.add("hidden");
    document.getElementById("progress-fill").style.width = "0%";
    document.getElementById("progress-text").textContent = "Subiendo...";
}

/** Sube el archivo a Cloudinary y devuelve la URL pública */
async function subirImagen(file) {
    const formData = new FormData();
    formData.append("file",           file);
    formData.append("upload_preset",  CLOUDINARY_PRESET);
    formData.append("folder",         "urakao/productos");

    // Mostrar barra de progreso
    document.getElementById("upload-preview").classList.add("hidden");
    document.getElementById("upload-progress").classList.remove("hidden");

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`);

        xhr.upload.addEventListener("progress", e => {
            if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 100);
                document.getElementById("progress-fill").style.width  = `${pct}%`;
                document.getElementById("progress-text").textContent  = `Subiendo... ${pct}%`;
            }
        });

        xhr.addEventListener("load", () => {
            if (xhr.status === 200) {
                const res = JSON.parse(xhr.responseText);
                resolve(res.secure_url);
            } else {
                reject(new Error("Error al subir imagen a Cloudinary"));
            }
        });

        xhr.addEventListener("error", () => reject(new Error("Error de red al subir imagen")));
        xhr.send(formData);
    });
}

// ── Submit del formulario ─────────────────────────────────────
document.getElementById("form-producto").addEventListener("submit", async e => {
    e.preventDefault();

    const id          = document.getElementById("prod-id").value;
    const nombre      = document.getElementById("prod-nombre").value.trim();
    const descripcion = document.getElementById("prod-descripcion").value.trim();
    const precio      = parseFloat(document.getElementById("prod-precio").value);
    const categoria   = document.getElementById("prod-categoria").value;
    const disponible  = document.getElementById("prod-disponible").checked;
    const file        = fileInput.files[0];

    if (!nombre || !descripcion || isNaN(precio) || !categoria) {
        toast("Completa todos los campos obligatorios", "error");
        return;
    }

    const btnGuardar = document.getElementById("btn-guardar-prod");
    btnGuardar.textContent = "Guardando...";
    btnGuardar.disabled    = true;

    try {
        let imagenUrl = document.getElementById("prod-imagen-url").value;

        // Si hay archivo nuevo, subirlo a Storage
        if (file) {
            imagenUrl = await subirImagen(file);
        }

        const datos = { nombre, descripcion, precio, categoria, disponible, imagen: imagenUrl };

        if (id) {
            await updateDoc(doc(db, "productos", id), datos);
            toast(`"${nombre}" actualizado`, "ok");
        } else {
            await addDoc(collection(db, "productos"), datos);
            toast(`"${nombre}" creado`, "ok");
        }

        cerrarModales();
        await cargarProductos();
    } catch (err) {
        toast("Error al guardar: " + err.message, "error");
    } finally {
        btnGuardar.textContent = "Guardar producto";
        btnGuardar.disabled    = false;
    }
});

document.getElementById("btn-cancelar-prod").addEventListener("click", cerrarModales);

// ════════════════════════════════════════════════════════════
//  CERRAR MODALES
// ════════════════════════════════════════════════════════════

document.getElementById("modal-pedido-close").addEventListener("click",   cerrarModales);
document.getElementById("modal-producto-close").addEventListener("click", cerrarModales);
document.getElementById("modal-overlay").addEventListener("click",        cerrarModales);

document.addEventListener("keydown", e => {
    if (e.key === "Escape") cerrarModales();
});
