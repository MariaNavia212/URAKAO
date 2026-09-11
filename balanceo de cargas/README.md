# Pruebas de Balanceo de Cargas — URAKAO

## ¿Qué es el balanceo de cargas?

El balanceo de cargas es una técnica que distribuye el tráfico de red entre múltiples servidores para:
- Evitar que un solo servidor se sature
- Mejorar la disponibilidad y tiempo de respuesta
- Garantizar que la aplicación siga funcionando si un servidor falla

## ¿Cómo aplica a URAKAO?

URAKAO está alojado en **Firebase Hosting**, que ya incluye balanceo de cargas automático a través de la CDN global de Google. Sin embargo, estas pruebas simulan escenarios de carga para:
1. Medir el rendimiento bajo múltiples usuarios simultáneos
2. Verificar tiempos de respuesta
3. Detectar cuellos de botella
4. Validar que la aplicación soporta picos de tráfico

---

## Estructura de archivos

```
balanceo de cargas/
├── README.md                    ← Este archivo
├── index.html                   ← Panel visual de pruebas (interfaz web)
├── prueba-carga.js              ← Script de pruebas automáticas (Node.js)
├── prueba-endpoints.js          ← Test de endpoints específicos
├── simulador-usuarios.html      ← Simulador visual de usuarios concurrentes
├── reporte.php                  ← Generador de reportes en PHP
├── config.php                   ← Configuración del reporte
└── resultados/
    └── .gitkeep
```

---

## Pruebas incluidas

### 1. Prueba de carga básica (`prueba-carga.js`)
Envía múltiples solicitudes simultáneas a la aplicación y mide:
- Tiempo de respuesta promedio
- Tiempo máximo y mínimo
- Tasa de éxito/error
- Solicitudes por segundo

### 2. Prueba de endpoints (`prueba-endpoints.js`)
Verifica la disponibilidad y rendimiento de cada ruta:
- `/` — Página principal
- `/login` — Autenticación
- `/tienda` — Catálogo de productos
- `/checkout` — Proceso de compra
- `/admin` — Panel administrativo

### 3. Simulador visual (`simulador-usuarios.html`)
Interfaz web que simula múltiples usuarios accediendo simultáneamente y muestra:
- Gráfico en tiempo real de tiempos de respuesta
- Estado de cada "usuario virtual"
- Métricas de rendimiento

### 4. Panel de control (`index.html`)
Dashboard central para ejecutar y visualizar todas las pruebas desde el navegador.

### 5. Reporte PHP (`reporte.php`)
Genera un reporte detallado en HTML con:
- Resumen ejecutivo
- Gráficos de rendimiento
- Recomendaciones de optimización

---

## Cómo ejecutar las pruebas

### Opción A — Desde el navegador (sin instalar nada)
1. Abre `index.html` en tu navegador
2. Configura los parámetros (usuarios, duración)
3. Clic en "Iniciar prueba"
4. Observa los resultados en tiempo real

### Opción B — Desde Node.js (más preciso)
```bash
cd "balanceo de cargas"
node prueba-carga.js
node prueba-endpoints.js
```

### Opción C — Reporte PHP
Requiere un servidor PHP local (XAMPP, WAMP, o `php -S localhost:8080`):
```bash
cd "balanceo de cargas"
php -S localhost:8080
```
Luego abre `http://localhost:8080/reporte.php`

---

## Métricas clave

| Métrica | Descripción | Valor aceptable |
|---------|-------------|-----------------|
| Tiempo de respuesta | Tiempo desde la solicitud hasta la respuesta | < 500ms |
| Throughput | Solicitudes procesadas por segundo | > 50 req/s |
| Tasa de error | Porcentaje de solicitudes fallidas | < 1% |
| Disponibilidad | Porcentaje de tiempo activo | > 99.9% |
| TTFB | Time To First Byte | < 200ms |

---

## Interpretación de resultados

- **Verde (< 300ms)**: Excelente rendimiento
- **Amarillo (300ms - 800ms)**: Aceptable, monitorear
- **Rojo (> 800ms)**: Requiere optimización

---

## Recomendaciones para URAKAO

1. **Firebase Hosting CDN**: Ya distribuye contenido globalmente (balanceo automático)
2. **Caché de imágenes**: Configurado con `Cache-Control: max-age=86400`
3. **Firestore**: Escala automáticamente con la demanda
4. **Lazy loading**: Implementar para imágenes pesadas
5. **Service Worker**: Considerar para caché offline

---

## Notas técnicas

- Las pruebas desde el navegador están limitadas por CORS y el límite de conexiones del navegador (6 por dominio)
- Para pruebas más realistas, usar Node.js o herramientas como Apache JMeter, k6, o Artillery
- Firebase Hosting tiene un límite de 360 MB/día de transferencia en el plan gratuito
