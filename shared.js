// InboxSort: constants and normalizers shared by the popup and the Gmail
// content scripts. Loaded first in both (popup.html, manifest content_scripts).
(function () {
  "use strict";

  // ── Accent colour palette ──────────────────────────────────────────

  const ACCENT_COLORS = {
    blue:   { primary: "#1a73e8", hover: "#1765cc", ink: "#174ea6", light: "#d2e3fc" },
    green:  { primary: "#1e8e3e", hover: "#188038", ink: "#137333", light: "#ceead6" },
    purple: { primary: "#8430ce", hover: "#7627bb", ink: "#5c16a5", light: "#e8d0fe" },
    red:    { primary: "#c5221f", hover: "#b31412", ink: "#a50e0e", light: "#f4c7c3" },
    orange: { primary: "#b85d00", hover: "#a65300", ink: "#8d4900", light: "#fde293" },
    teal:   { primary: "#007b83", hover: "#006d75", ink: "#005f66", light: "#b2ebf2" }
  };

  // Dark mode accent variants — softer, higher-contrast colors for dark backgrounds
  const DARK_ACCENT_COLORS = {
    blue:   { primary: "#8ab4f8", hover: "#aecbfa", light: "rgba(138,180,248,0.18)" },
    green:  { primary: "#81c995", hover: "#a8dab5", light: "rgba(129,201,149,0.18)" },
    purple: { primary: "#c58af9", hover: "#d7aefb", light: "rgba(197,138,249,0.18)" },
    red:    { primary: "#f28b82", hover: "#f6aea9", light: "rgba(242,139,130,0.18)" },
    orange: { primary: "#fdd663", hover: "#fde293", light: "rgba(253,214,99,0.18)" },
    teal:   { primary: "#4ecdc4", hover: "#73d8d0", light: "rgba(78,205,196,0.18)" }
  };

  const SORT_MODE_IDS = ["newest", "oldest", "senderAZ", "senderZA", "unreadFirst", "starredFirst"];

  function normalizeHiddenTabs(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    let normalized = {};
    let allowed = ["date", "sender", "unread", "starred", "groupSender"];
    for (let i = 0; i < allowed.length; i++) {
      if (value[allowed[i]] === true) normalized[allowed[i]] = true;
    }
    // Migrate the pre-1.3 per-mode preferences to the merged toolbar controls.
    if (value.oldest === true && value.newest === true) normalized.date = true;
    if (value.senderAZ === true && value.senderZA === true) normalized.sender = true;
    if (value.unreadFirst === true) normalized.unread = true;
    if (value.starredFirst === true) normalized.starred = true;
    return normalized;
  }

  // Appearance: "system" follows the OS, "light" and "dark" force a theme.
  const APPEARANCE_MODES = { system: true, light: true, dark: true };

  function normalizeAppearance(mode) {
    return APPEARANCE_MODES[mode] ? mode : "system";
  }

  globalThis.InboxSort = globalThis.InboxSort || {};
  Object.assign(globalThis.InboxSort, {
    ACCENT_COLORS: ACCENT_COLORS,
    DARK_ACCENT_COLORS: DARK_ACCENT_COLORS,
    SORT_MODE_IDS: SORT_MODE_IDS,
    APPEARANCE_MODES: APPEARANCE_MODES,
    normalizeHiddenTabs: normalizeHiddenTabs,
    normalizeAppearance: normalizeAppearance
  });
})();
