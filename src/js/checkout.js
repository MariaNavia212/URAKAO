// ============================================================
//  URAKAO — Checkout: formulario de domicilio + pedido
// ============================================================

import { auth, db } from "./firebase.js";
import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    collection,
    addDoc,
    serverTimestamp,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── EmailJS config ────────────────────────────────────────────
const EMAILJS_SERVICE_ID  = "service_7zwnxz8";
const EMAILJS_TEMPLATE_ID = "template_wjfgh0j";
const EMAILJS_PUBLIC_KEY  = "IZ7TXCAyEhRyu10OA";
const ADMIN_EMAIL         = "naviajimenezalejandra04@gmail.com";

let usuarioActual = null;
let carrito = JSON.parse(localStorage.getItem("urakao_carrito") || "[]");

// ── Proteger ruta ─────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "/login";
        return;
    }
    usuarioActual = user;

    try {
        const snap = await getDoc(doc(db, "usuarios", user.uid));
        if (snap.exists()) {
            const data = snap.data();
            document.getElementById("ch-nombre").value   = data.nombre   || "";
            document.getElementById("ch-telefono").value = data.telefono || "";
        }
    } catch (_) {}

    renderResumen();
});

// ── Renderizar resumen del pedido ─────────────────────────────
function renderResumen() {
    const container = document.getElementById("resumen-items");
    const totalEl   = document.getElementById("resumen-total");

    if (carrito.length === 0) {
        container.innerHTML = "<p>No hay productos en el carrito.</p>";
        document.getElementById("btn-pedido").disabled = true;
        return;
    }

    let total = 0;
    container.innerHTML = carrito.map(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        return `
            <div class="resumen-item">
                <span>${item.nombre} × ${item.cantidad}</span>
                <span>$${Number(subtotal).toLocaleString("es-CO")}</span>
            </div>
        `;
    }).join("");

    totalEl.textContent = `$${Number(total).toLocaleString("es-CO")}`;
}

// ── Enviar notificación por email ─────────────────────────────
async function enviarEmailAdmin(domicilio, productos, total) {
    // Formatear lista de productos
    const productosTexto = productos
        .map(i => `• ${i.nombre} × ${i.cantidad}  —  $${Number(i.precio * i.cantidad).toLocaleString("es-CO")}`)
        .join("\n");

    const templateParams = {
        to_email:         ADMIN_EMAIL,
        cliente_nombre:   domicilio.nombre,
        cliente_telefono: domicilio.telefono,
        cliente_email:    usuarioActual.email,
        direccion:        domicilio.direccion,
        ciudad:           domicilio.ciudad,
        indicaciones:     domicilio.indicaciones || "Ninguna",
        metodo_pago:      domicilio.metodoPago,
        productos:        productosTexto,
        total:            `$${Number(total).toLocaleString("es-CO")}`
    };

    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
}

// ── Enviar pedido ─────────────────────────────────────────────
document.getElementById("form-checkout").addEventListener("submit", async (e) => {
    e.preventDefault();

    const errorEl   = document.getElementById("checkout-error");
    const successEl = document.getElementById("checkout-success");
    const btn       = document.getElementById("btn-pedido");

    errorEl.classList.add("hidden");
    successEl.classList.add("hidden");

    if (carrito.length === 0) {
        errorEl.textContent = "Tu carrito está vacío.";
        errorEl.classList.remove("hidden");
        return;
    }

    const domicilio = {
        nombre:       document.getElementById("ch-nombre").value.trim(),
        telefono:     document.getElementById("ch-telefono").value.trim(),
        ciudad:       document.getElementById("ch-ciudad").value.trim(),
        direccion:    document.getElementById("ch-direccion").value.trim(),
        indicaciones: document.getElementById("ch-indicaciones").value.trim(),
        metodoPago:   document.getElementById("ch-pago").value
    };

    const total = carrito.reduce((sum, i) => sum + i.precio * i.cantidad, 0);

    btn.disabled    = true;
    btn.textContent = "Enviando pedido...";

    try {
        // 1 — Guardar en Firestore
        await addDoc(collection(db, "pedidos"), {
            usuarioId:    usuarioActual.uid,
            usuarioEmail: usuarioActual.email,
            domicilio,
            productos:    carrito,
            total,
            estado:       "pendiente",
            creadoEn:     serverTimestamp()
        });

        // 2 — Enviar email al admin (no bloquea si falla)
        try {
            await enviarEmailAdmin(domicilio, carrito, total);
        } catch (emailErr) {
            console.warn("Email no enviado:", emailErr);
        }

        // 3 — Limpiar carrito y confirmar
        localStorage.removeItem("urakao_carrito");

        successEl.textContent = "¡Pedido confirmado! Nos pondremos en contacto contigo pronto.";
        successEl.classList.remove("hidden");
        btn.textContent = "Pedido enviado ✓";

        setTimeout(() => {
            window.location.href = "/tienda";
        }, 3000);

    } catch (err) {
        console.error(err);
        errorEl.textContent = "Error al enviar el pedido. Intenta de nuevo.";
        errorEl.classList.remove("hidden");
        btn.disabled    = false;
        btn.textContent = "Confirmar Pedido";
    }
});
