import "./interactions.js";
import "./logo.js";
const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector("#site-nav");

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.textContent = isOpen ? "Close" : "Menu";
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.textContent = "Menu";
    });
  });
}

import lottie from "lottie-web";

const themeToggle = document.getElementById("theme-toggle");
const animationContainer = document.getElementById("theme-animation");
const root = document.documentElement;

if (themeToggle && animationContainer) {
  const currentTheme = root.dataset.theme || "dark";

  let targetFrame = currentTheme === "dark" ? 72 : 164;

  const animation = lottie.loadAnimation({
    container: animationContainer,
    renderer: "svg",
    loop: false,
    autoplay: false,
    path: "/theme-dial.json",
  });

  // Apply the correct theme to both the CSS variables and browser controls.
  function setTheme(theme) {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    const favicon = document.getElementById("site-favicon");
    if (favicon)
      favicon.setAttribute(
        "href",
        theme === "light" ? "/vector-logo-black.svg" : "/vector-logo-white.svg",
      );
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* Theme switching also works without storage. */
    }

    themeToggle.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
    );

    themeToggle.setAttribute("aria-pressed", String(theme === "light"));
  }

  animation.addEventListener("DOMLoaded", () => {
    // Start on the frame matching the currently active theme.
    animation.goToAndStop(targetFrame, true);

    themeToggle.addEventListener("click", () => {
      const currentTheme = root.dataset.theme || "dark";
      const newTheme = currentTheme === "dark" ? "light" : "dark";

      setTheme(newTheme);

      if (newTheme === "light") {
        // Moon → Sun
        targetFrame = 164;
        animation.playSegments([93, 165], true);
      } else {
        // Sun → Moon
        targetFrame = 72;
        animation.playSegments([14, 72], true);
      }
    });
  });

  // Make sure the button reflects the active theme.
  setTheme(currentTheme);
}
