// Runs in <head> before first paint. Applies the last saved Appearance from a
// local cache so the popup never flashes the wrong theme; popup.js then
// confirms it against chrome.storage.sync, which stays the source of truth.
(function () {
  let mode = "system";
  try { mode = localStorage.getItem("inboxsort-appearance") || "system"; } catch (_) { /* storage blocked */ }
  let dark = mode === "dark" ||
    (mode !== "light" && !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches));
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
})();
