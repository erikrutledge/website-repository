const art = document.querySelector('.hero-art');
const canvas = art?.querySelector('.art-grid-canvas');
const context = canvas?.getContext('2d');

if (art && canvas && context) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let width = 0;
  let height = 0;
  let frame = 0;
  let strength = 0;
  let target = 0;
  let pointerX = 0;
  let pointerY = 0;
  let x = 0;
  let y = 0;

  // Sample each line so the grid bends locally around the pointer.
  function draw() {
    context.clearRect(0, 0, width, height);
    context.strokeStyle = getComputedStyle(canvas).color;
    context.lineWidth = 1;
    context.beginPath();
    const point = (px, py, first) => {
      const dx = px - x;
      const dy = py - y;
      const pull = Math.exp(-(dx * dx + dy * dy) / (2 * 95 * 95)) * strength * 0.2;
      const warpedX = px - dx * pull;
      const warpedY = py - dy * pull;
      if (first) context.moveTo(warpedX, warpedY);
      else context.lineTo(warpedX, warpedY);
    };
    for (let gx = 0; gx <= width + 30; gx += 30) {
      for (let gy = -20; gy <= height + 20; gy += 5) point(gx, gy, gy === -20);
    }
    for (let gy = 0; gy <= height + 30; gy += 30) {
      for (let gx = -20; gx <= width + 20; gx += 5) point(gx, gy, gx === -20);
    }
    context.stroke();
  }
  function tick() {
    frame = 0;
    strength += (target - strength) * 0.1;
    x += (pointerX - x) * 0.16;
    y += (pointerY - y) * 0.16;
    if (Math.abs(target - strength) < 0.001) strength = target;
    draw();
    if (Math.abs(target - strength) > 0.001 || (target && (Math.abs(pointerX - x) > 0.1 || Math.abs(pointerY - y) > 0.1))) {
      frame = requestAnimationFrame(tick);
    }
  }
  function animate() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
  }
  const resize = new ResizeObserver(() => {
    const bounds = art.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
    art.classList.add('has-interactive-grid');
  });
  resize.observe(art);
  art.addEventListener('pointermove', event => {
    if (reduced.matches || !finePointer.matches || event.pointerType === 'touch') return;
    const bounds = art.getBoundingClientRect();
    pointerX = event.clientX - bounds.left;
    pointerY = event.clientY - bounds.top;
    if (!target && !strength) { x = pointerX; y = pointerY; }
    target = 1;
    animate();
  });
  function release() { target = 0; animate(); }
  art.addEventListener('pointerleave', release);
  art.addEventListener('pointercancel', release);
  reduced.addEventListener('change', () => { target = 0; strength = 0; draw(); });
  finePointer.addEventListener('change', release);
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; target = 0; strength = 0; }
    else draw();
  });
}
