class ProjectCarousel extends HTMLElement {
  connectedCallback() {
    const track = this.querySelector('.carousel-track');
    const slides = [...this.querySelectorAll('.carousel-slide')];
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let paused = reduced.matches;
    let hovered = false;
    let visible = false;
    let timer;
    const step = () => slides[0].getBoundingClientRect().width + 16;
    const move = direction => {
      const maximum = track.scrollWidth - track.clientWidth;
      let target = track.scrollLeft + direction * step();
      if (direction > 0 && track.scrollLeft >= maximum - 2) target = 0;
      if (direction < 0 && track.scrollLeft <= 2) target = maximum;
      track.scrollTo({ left: Math.max(0, Math.min(maximum, target)), behavior: reduced.matches ? 'instant' : 'smooth' });
    };
    const schedule = () => {
      clearInterval(timer);
      if (!paused && !hovered && visible && !document.hidden) timer = setInterval(() => move(1), 6500);
    };
    const pause = () => { paused = true; schedule(); };
    this.querySelectorAll('.carousel-arrow').forEach(button => { button.hidden = false; });
    this.querySelector('[data-previous]').addEventListener('click', () => { pause(); move(-1); });
    this.querySelector('[data-next]').addEventListener('click', () => { pause(); move(1); });
    this.addEventListener('mouseenter', () => { hovered = true; schedule(); });
    this.addEventListener('mouseleave', () => { hovered = false; schedule(); });
    this.addEventListener('focusin', pause);
    track.addEventListener('pointerdown', pause);
    track.addEventListener('wheel', pause, { passive: true });
    track.addEventListener('keydown', event => {
      if (event.target !== track) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault(); pause(); move(event.key === 'ArrowRight' ? 1 : -1);
      }
    });
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); });
    observer.observe(this);
    const visibility = () => schedule();
    document.addEventListener('visibilitychange', visibility);
    reduced.addEventListener('change', pause);
    this.cleanup = () => { clearInterval(timer); observer.disconnect(); document.removeEventListener('visibilitychange', visibility); reduced.removeEventListener('change', pause); };
  }
  disconnectedCallback() { this.cleanup?.(); }
}
if (!customElements.get('project-carousel')) customElements.define('project-carousel', ProjectCarousel);
