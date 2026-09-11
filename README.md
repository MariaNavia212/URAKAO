# URAKAO — Chocolatería Artesanal

Sitio web oficial de **URAKAO**, chocolatería artesanal del Urabá colombiano. Permite a los clientes explorar el catálogo, hacer pedidos a domicilio y gestionar órdenes desde un panel de administración.

---

## Páginas

| Ruta | Descripción |
|---|---|
| `/` | Landing page — historia, productos destacados y puntos de venta |
| `/tienda` | Catálogo completo con carrito de compras |
| `/checkout` | Formulario de pedido a domicilio |
| `/login` | Autenticación con Google |
| `/admin` | Panel de administración (acceso restringido) |

---

## Tecnologías

- **HTML · CSS · JavaScript** — sin frameworks
- **Firebase Auth** — autenticación con Google
- **Firebase Firestore** — base de datos de pedidos y productos
- **Firebase Storage** — imágenes de productos
- **Firebase Hosting** — despliegue
- **EmailJS** — notificaciones de pedidos por correo

---

## Panel de Administración

Acceso restringido a emails autorizados. Funcionalidades:

- Ver todos los pedidos con filtros por estado
- Cambiar estado: Pendiente → En camino → Entregado → Cancelado
- Contactar al cliente por teléfono o WhatsApp directamente
- CRUD completo de productos
- Subida de imagen desde el PC a Firebase Storage
- Toast notifications para feedback de acciones
- Modal de confirmación antes de eliminar

---

## Estructura del proyecto

```
src/
├── index.html
├── tienda.html
├── checkout.html
├── login.html
├── admin.html
├── css/
│   ├── admin.css
│   ├── index.css
│   ├── tienda.css
│   ├── checkout.css
│   └── auth.css
└── js/
    ├── firebase.js
    ├── admin.js
    ├── tienda.js
    ├── checkout.js
    └── auth.js
```

---

## Despliegue

```bash
firebase deploy --only hosting
```

URL de producción: **https://urakao.web.app**
