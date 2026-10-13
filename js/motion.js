/* ===== Motion system: tilt, scroll progress, terminal pulse =====
 * No framework. Respects prefers-reduced-motion. All passive listeners.
 */

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Scroll progress bar (thin line under header).
if (!reduced) {
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

// Subtle 3D tilt on cards (desktop, fine pointer only).
if (!reduced && window.matchMedia('(pointer: fine)').matches) {
  const cards = document.querySelectorAll('.project-card, .focus-card, .service-card, .why-card');
  cards.forEach((card) => {
    card.classList.add('tilt');
    let raf = 0;
    card.addEventListener('pointermove', (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 7).toFixed(2)}deg) translateY(-4px)`;
      });
    }, { passive: true });
    card.addEventListener('pointerleave', () => {
      cancelAnimationFrame(raf);
      card.style.transform = '';
    });
  });
}

// Let the 3D scene react to terminal commands — pass the command through
// so the scene can answer differently (top surges, uptime breathes, ...).
const terminalInput = document.getElementById('terminal-input');
terminalInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && terminalInput.value.trim()) {
    window.dispatchEvent(new CustomEvent('matt:terminal-command', {
      detail: { command: terminalInput.value.trim().toLowerCase() },
    }));
  }
});
