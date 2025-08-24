// Attach spotlight coordinates to CSS variables
(function () {
  if (typeof window === "undefined") return;
  document.addEventListener("mousemove", (e) => {
    const root = document.documentElement;
    root.style.setProperty("--x", e.clientX + "px");
    root.style.setProperty("--y", e.clientY + "px");
  });
})();
