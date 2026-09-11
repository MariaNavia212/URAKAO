// ============================================================
//  URAKAO — Configuración de Firebase
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey:            "AIzaSyDjtxTIzWPNYdQQTHxNzKXf3DJ76nqHYhc",
    authDomain:        "urakao.firebaseapp.com",
    projectId:         "urakao",
    storageBucket:     "urakao.firebasestorage.app",
    messagingSenderId: "407610284432",
    appId:             "1:407610284432:web:d0c267c2905058e866bb15"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

export { auth, db };
