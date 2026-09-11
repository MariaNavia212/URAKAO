// ============================================================
//  URAKAO — Autenticación con Google
// ============================================================

import { auth, db } from "./firebase.js";
import {
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const provider = new GoogleAuthProvider();
const errorEl  = document.getElementById("login-error");
const btn      = document.getElementById("btn-google");

// Si ya está autenticado, redirigir a la tienda
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = "/tienda";
    }
});

// ── Login con Google al hacer clic ───────────────────────────
btn.addEventListener("click", async () => {
    errorEl.classList.add("hidden");
    btn.disabled    = true;
    btn.textContent = "Conectando...";

    try {
        const result = await signInWithPopup(auth, provider);
        const user   = result.user;

        // Si es la primera vez, guardar datos en Firestore
        const userRef  = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            await setDoc(userRef, {
                nombre:   user.displayName || "",
                email:    user.email,
                telefono: "",
                foto:     user.photoURL || "",
                rol:      "comprador",
                creadoEn: serverTimestamp()
            });
        }

        window.location.href = "/tienda";

    } catch (err) {
        console.error(err);
        errorEl.textContent = traducirError(err.code);
        errorEl.classList.remove("hidden");
        btn.disabled = false;
        // Restaurar contenido del botón con el SVG
        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continuar con Google`;
    }
});

function traducirError(code) {
    const errores = {
        "auth/popup-closed-by-user":      "Cerraste la ventana antes de completar el login.",
        "auth/cancelled-popup-request":   "Operación cancelada.",
        "auth/popup-blocked":             "El navegador bloqueó la ventana emergente. Permite popups para este sitio.",
        "auth/account-exists-with-different-credential": "Ya existe una cuenta con ese correo.",
        "auth/unauthorized-domain":       "Este dominio no está autorizado en Firebase. Verifica la configuración."
    };
    return errores[code] || `Error: ${code}`;
}
