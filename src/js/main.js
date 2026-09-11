// ============================================================
//  URAKAO — Scripts generales de la página principal
// ============================================================

// Animación de entrada para tarjetas
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.classList.add("visible");
            }, i * 100);
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll(".producto-card, .punto-card").forEach(el => {
    el.style.transition = "opacity 0.6s ease, transform 0.6s ease, box-shadow 0.4s ease";
    observer.observe(el);
});
