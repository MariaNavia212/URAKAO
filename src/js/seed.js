// ============================================================
//  URAKAO — Script para cargar productos iniciales en Firestore
//  Abre seed.html en el navegador UNA sola vez para poblar la BD
// ============================================================

import { db } from "./firebase.js";
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const productos = [
    {
        nombre:          "Barra de Chocolate 100%",
        descripcion:     "Chocolate puro al 100% de cacao. Sin azúcar, sin aditivos. Solo el sabor auténtico del cacao del Urabá en su expresión más pura.",
        precio:          22000,
        imagen:          "/Fotos de Urakao Oficial/Barra de chocolate p1.png",
        imagenes:        [
            "/Fotos de Urakao Oficial/Barra de chocolate p1.png",
            "/Fotos de Urakao Oficial/Barra de chocolate p2.png",
            "/Fotos de Urakao Oficial/Tabletas de chocolate y bombones sobre mesa.png"
        ],
        disponible:      true,
        categoria:       "Tabletas",
        porcentajeCacao: 100,
        origenGrano:     "Urabá, Antioquia"
    },
    {
        nombre:          "Barra de Chocolate 75%",
        descripcion:     "Equilibrio perfecto entre intensidad y dulzura. Notas frutales y terrosas del Urabá.",
        precio:          20000,
        imagen:          "/Fotos de Urakao Oficial/Barra de chocolate p2.png",
        imagenes:        [
            "/Fotos de Urakao Oficial/Barra de chocolate p2.png",
            "/Fotos de Urakao Oficial/Barra de chocolate p1.png",
            "/Fotos de Urakao Oficial/Tabletas de chocolate y bombones sobre mesa.png"
        ],
        disponible:      true,
        categoria:       "Tabletas",
        porcentajeCacao: 75,
        origenGrano:     "Urabá, Antioquia"
    },
    {
        nombre:          "Barra de Chocolate 65%",
        descripcion:     "Nuestra entrada al mundo del chocolate oscuro. Notas dulces, frutales y textura suave.",
        precio:          18000,
        imagen:          "/Fotos de Urakao Oficial/Tabletas de chocolate y bombones sobre mesa.png",
        imagenes:        [
            "/Fotos de Urakao Oficial/Tabletas de chocolate y bombones sobre mesa.png",
            "/Fotos de Urakao Oficial/Barra de chocolate p1.png",
            "/Fotos de Urakao Oficial/Barra de chocolate p2.png"
        ],
        disponible:      true,
        categoria:       "Tabletas",
        porcentajeCacao: 65,
        origenGrano:     "Urabá, Antioquia"
    },
    {
        nombre:          "Caja de Bombones",
        descripcion:     "Bombones artesanales rellenos con ingredientes locales del Urabá. Elaborados a mano con chocolate de origen. Presentación ideal para regalo.",
        precio:          35000,
        imagen:          "/Fotos de Urakao Oficial/caja de chocolate cerrada p1.png",
        imagenes:        [
            "/Fotos de Urakao Oficial/caja de chocolate cerrada p1.png",
            "/Fotos de Urakao Oficial/caja de chocolate con bombones p2.png",
            "/Fotos de Urakao Oficial/como se rellenan los bombones.png"
        ],
        disponible:      true,
        categoria:       "Bombones",
        porcentajeCacao: 55,
        origenGrano:     "Urabá, Antioquia"
    },
    {
        nombre:          "Cacao en Polvo",
        descripcion:     "Cocoa pura sin azúcar ni conservantes. Ideal para bebidas, postres y recetas. Conserva todos los antioxidantes del grano del Urabá.",
        precio:          15000,
        imagen:          "/Fotos de Urakao Oficial/Chocolate en polvo.png",
        imagenes:        [
            "/Fotos de Urakao Oficial/Chocolate en polvo.png",
            "/Fotos de Urakao Oficial/Cacao secandose en marquesina.png",
            "/Fotos de Urakao Oficial/Nuestro arbol de cacao.png"
        ],
        disponible:      true,
        categoria:       "Bebidas",
        porcentajeCacao: 100,
        origenGrano:     "Urabá, Antioquia"
    }
];

async function cargarProductos() {
    const statusEl = document.getElementById("status");

    // Verificar si ya hay productos
    const snap = await getDocs(collection(db, "productos"));
    if (!snap.empty) {
        statusEl.innerHTML = `<p class="ok">✓ Ya existen ${snap.size} productos en Firestore. No se cargaron duplicados.</p>`;
        return;
    }

    statusEl.innerHTML = "<p>Cargando productos...</p>";

    try {
        for (const producto of productos) {
            await addDoc(collection(db, "productos"), producto);
        }
        statusEl.innerHTML = `
            <p class="ok">✓ ${productos.length} productos cargados exitosamente en Firestore.</p>
            <p>Ahora puedes <a href="index.html">ir a la página principal</a> o <a href="tienda.html">ver la tienda</a>.</p>
        `;
    } catch (err) {
        statusEl.innerHTML = `<p class="error">✗ Error: ${err.message}</p>`;
        console.error(err);
    }
}

// Ejecutar al cargar
cargarProductos();
