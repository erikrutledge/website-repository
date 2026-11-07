export const SCREENS = ["today", "history", "stats", "setup"];

export function swipeTarget(screen, dx, dy, elapsed) {
  if (elapsed > 700 || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5)
    return null;
  return SCREENS[SCREENS.indexOf(screen) + (dx < 0 ? 1 : -1)] ?? null;
}

export function setupSwipes(element, { getScreen, setScreen }) {
  let start;
  const dialogOpen = () => document.getElementById("tutorial").open;
  element.addEventListener(
    "touchstart",
    (event) => {
      start = null;
      if (event.touches.length !== 1 || dialogOpen()) return;
      const target = event.target;
      if (
        target.closest("button, input, select, textarea, a, [contenteditable]")
      )
        return;
      // Let the browser keep its edge gestures and horizontally scrolling grids.
      const touch = event.touches[0];
      if (touch.clientX < 24 || touch.clientX > window.innerWidth - 24) return;
      for (
        let node = target;
        node && node !== element;
        node = node.parentElement
      ) {
        if (
          node.scrollWidth > node.clientWidth + 1 &&
          ["auto", "scroll"].includes(getComputedStyle(node).overflowX)
        )
          return;
      }
      start = {
        x: touch.clientX,
        y: touch.clientY,
        time: performance.now(),
        screen: getScreen(),
      };
    },
    { passive: true },
  );
  element.addEventListener(
    "touchmove",
    (event) => {
      if (!start) return;
      if (event.touches.length !== 1) {
        start = null;
        return;
      }
      const dx = event.touches[0].clientX - start.x;
      const dy = event.touches[0].clientY - start.y;
      if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)) start = null;
    },
    { passive: true },
  );
  element.addEventListener(
    "touchend",
    (event) => {
      const gesture = start;
      start = null;
      if (
        !gesture ||
        event.touches.length ||
        dialogOpen() ||
        getScreen() !== gesture.screen
      )
        return;
      const touch = event.changedTouches[0];
      const next = swipeTarget(
        gesture.screen,
        touch.clientX - gesture.x,
        touch.clientY - gesture.y,
        performance.now() - gesture.time,
      );
      if (next) setScreen(next);
    },
    { passive: true },
  );
  element.addEventListener(
    "touchcancel",
    () => {
      start = null;
    },
    { passive: true },
  );
}
