// Keep pointer effects decorative: normal links, focus, and touch behavior remain native.
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const buttons = '.button, .nav-cta, .carousel-arrow, .package-help';
const cards = '.service-card, .project-card, .package-card, .platform-card, .note-panel';
const elements = [...document.querySelectorAll(`${buttons}, ${cards}`)];
const pending = new Map();
let frame = 0;

function flush() {
  frame = 0;
  for (const [element, point] of pending) {
    if (element.matches(cards)) {
      element.style.setProperty('--pointer-x', `${point.x}px`);
      element.style.setProperty('--pointer-y', `${point.y}px`);
    }
    if (element.matches(buttons) && !element.matches(':disabled')) {
      element.style.setProperty('--magnet-x', `${point.dx}px`);
      element.style.setProperty('--magnet-y', `${point.dy}px`);
    }
  }
  pending.clear();
}
function reset(element) {
  pending.delete(element);
  element.style.removeProperty('--magnet-x');
  element.style.removeProperty('--magnet-y');
  element.classList.remove('is-pointer-active');
}
for (const element of elements) {
  element.addEventListener('pointermove', event => {
    if (reducedMotion.matches || !finePointer.matches || event.pointerType === 'touch') return;
    // offsetWidth/Height remain stable while the button follows the pointer.
    const bounds = element.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const clamp = value => Math.max(-1, Math.min(1, value));
    pending.set(element, {
      x, y,
      dx: clamp((x / element.offsetWidth - 0.5) * 2) * 4,
      dy: clamp((y / element.offsetHeight - 0.5) * 2) * 3,
    });
    element.classList.add('is-pointer-active');
    if (!frame) frame = requestAnimationFrame(flush);
  });
  element.addEventListener('pointerleave', () => reset(element));
  element.addEventListener('pointercancel', () => reset(element));
}
function resetAll() {
  cancelAnimationFrame(frame);
  frame = 0;
  pending.clear();
  elements.forEach(reset);
}
reducedMotion.addEventListener('change', resetAll);
finePointer.addEventListener('change', resetAll);
window.addEventListener('blur', resetAll);
document.addEventListener('visibilitychange', () => { if (document.hidden) resetAll(); });
