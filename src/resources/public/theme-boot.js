/**
 * Runs before the app bundle so reloads never flash the wrong background.
 * Kept as a static file (served from /theme-boot.js) because the production
 * CSP blocks inline scripts.
 */
(() => {
  const root = document.documentElement;

  try {
    const stored = localStorage.getItem("app-theme");
    const mode = stored === "light" || stored === "dark" ? stored : "light";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = mode === "auto" ? (prefersDark ? "dark" : "light") : mode;

    root.setAttribute("data-bs-theme", resolved);

    document.addEventListener("DOMContentLoaded", () => {
      if (document.body) document.body.classList.add(`theme-${mode}`);
    });
  } catch (error) {
    root.setAttribute("data-bs-theme", "light");
  }
})();
