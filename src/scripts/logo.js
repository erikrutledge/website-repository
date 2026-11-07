// The source WebP plays once (142 frames, 8,099 ms), then holds its final frame.
// Reveal the matching SVG lockup afterwards; never restart on theme changes.
const logo = document.querySelector("[data-logo-animation]");
const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
if (logo && !motion.matches) {
  const image = logo.querySelector(".logo-intro");
  let timer;
  const finish = () => {
    clearTimeout(timer);
    logo.classList.remove("is-playing");
  };
  image.addEventListener(
    "load",
    () => {
      if (motion.matches) return;
      logo.classList.add("is-playing");
      timer = setTimeout(finish, 8099);
    },
    { once: true },
  );
  image.addEventListener("error", finish, { once: true });
  motion.addEventListener("change", finish);
  image.src = image.dataset.src;
}
