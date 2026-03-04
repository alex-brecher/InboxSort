// ── Accent color definitions ──────────────────────────────────

const ACCENT_COLORS = {
  blue:   { primary: "#1a73e8", hover: "#1765cc", dark: "#174ea6", light: "#d2e3fc" },
  green:  { primary: "#1e8e3e", hover: "#188038", dark: "#137333", light: "#ceead6" },
  purple: { primary: "#9334e6", hover: "#7627bb", dark: "#5c16a5", light: "#e8d0fe" },
  red:    { primary: "#d93025", hover: "#c5221f", dark: "#a50e0e", light: "#f4c7c3" },
  orange: { primary: "#e8710a", hover: "#d56e0c", dark: "#b06000", light: "#fde293" },
  teal:   { primary: "#007b83", hover: "#006d75", dark: "#005f66", light: "#b2ebf2" }
};

const DARK_ACCENT_COLORS = {
  blue:   { primary: "#8ab4f8", hover: "#aecbfa", light: "rgba(138,180,248,0.18)" },
  green:  { primary: "#81c995", hover: "#a8dab5", light: "rgba(129,201,149,0.18)" },
  purple: { primary: "#c58af9", hover: "#d7aefb", light: "rgba(197,138,249,0.18)" },
  red:    { primary: "#f28b82", hover: "#f6aea9", light: "rgba(242,139,130,0.18)" },
  orange: { primary: "#fdd663", hover: "#fde293", light: "rgba(253,214,99,0.18)" },
  teal:   { primary: "#4ecdc4", hover: "#73d8d0", light: "rgba(78,205,196,0.18)" }
};

const VALID_SORT_MODES = {
  newest: true,
  oldest: true,
  senderAZ: true,
  senderZA: true,
  unreadFirst: true
};

function normalizeSortMode(mode) {
  return VALID_SORT_MODES[mode] ? mode : "newest";
}

function normalizeHiddenTabs(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function isContextInvalidatedError(err) {
  let msg = "";
  try {
    msg = String((err && err.message) || err || "");
  } catch (_) {
    msg = "";
  }
  return /extension context invalidated/i.test(msg);
}

function isRuntimeValid() {
  try {
    void chrome.runtime.id;
    return true;
  } catch (_) {
    return false;
  }
}

function hasRuntimeLastError() {
  try {
    return !!(chrome.runtime && chrome.runtime.lastError);
  } catch (_) {
    return true;
  }
}

function safeStorageGet(query, callback, fallbackValue) {
  const fallback = fallbackValue !== undefined
    ? fallbackValue
    : ((query && typeof query === "object") ? query : {});
  if (!isRuntimeValid()) {
    if (callback) callback(fallback);
    return;
  }
  try {
    chrome.storage.sync.get(query, function (data) {
      if (hasRuntimeLastError() || !isRuntimeValid()) {
        if (callback) callback(fallback);
        return;
      }
      if (callback) callback(data || fallback);
    });
  } catch (e) {
    if (!isContextInvalidatedError(e)) {
      console.warn("[InboxSort popup] storage.get error:", e);
    }
    if (callback) callback(fallback);
  }
}

function safeStorageSet(data, callback) {
  if (!isRuntimeValid()) {
    if (callback) callback(false);
    return;
  }
  try {
    chrome.storage.sync.set(data, function () {
      if (hasRuntimeLastError() || !isRuntimeValid()) {
        if (callback) callback(false);
        return;
      }
      if (callback) callback(true);
    });
  } catch (e) {
    if (!isContextInvalidatedError(e)) {
      console.warn("[InboxSort popup] storage.set error:", e);
    }
    if (callback) callback(false);
  }
}

// ── Helper: get active Gmail tab ─────────────────────────────

function getGmailTab(callback) {
  if (!isRuntimeValid()) {
    callback(null);
    return;
  }
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (hasRuntimeLastError() || !isRuntimeValid()) {
        callback(null);
        return;
      }
      const tab = tabs && tabs[0];
      // `tab.url` can be unavailable under `activeTab`-only permission.
      // Use tab.id presence as the routing guard and let sendMessage
      // determine whether a content script is actually reachable.
      if (tab && typeof tab.id === "number") {
        callback(tab);
      } else {
        callback(null);
      }
    });
  } catch (_) {
    callback(null);
  }
}

// ── Helper: send message to content script ───────────────────

function sendToContent(msg, callback) {
  if (!isRuntimeValid()) {
    if (callback) callback(null);
    return;
  }
  getGmailTab(function (tab) {
    if (!tab) {
      if (callback) callback(null);
      return;
    }
    try {
      chrome.tabs.sendMessage(tab.id, msg, function (response) {
        if (hasRuntimeLastError()) {
          // Content script not loaded yet — still call back with null
          if (callback) callback(null);
          return;
        }
        if (callback) callback(response);
      });
    } catch (e) {
      if (callback) callback(null);
    }
  });
}

// ── Apply accent color to popup ──────────────────────────────

function applyAccentColor(color) {
  const c = ACCENT_COLORS[color] || ACCENT_COLORS.blue;
  const dc = DARK_ACCENT_COLORS[color] || DARK_ACCENT_COLORS.blue;
  document.body.style.setProperty("--accent", c.primary);
  document.body.style.setProperty("--accent-hover", c.hover);
  document.body.style.setProperty("--accent-dark", c.dark);
  document.body.style.setProperty("--accent-light", c.light);
  document.body.style.setProperty("--accent-dm", dc.primary);
  document.body.style.setProperty("--accent-dm-light", dc.light);
}

// ── Apply dark mode (with live listener) ─────────────────────

function applyDarkMode() {
  const mq = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
  if (!mq) return;
  document.body.classList.toggle("dark", mq.matches);
  mq.addEventListener("change", function (e) {
    document.body.classList.toggle("dark", e.matches);
  });
}

// ── Update UI to reflect current state ───────────────────────

function updatePopupState() {
  safeStorageGet({
    sortMode: "newest",
    groupEnabled: false,
    accentColor: "blue",
    autoSort: true,
    perLabel: false
  }, function (data) {
    const sortMode = normalizeSortMode(data.sortMode);

    // Apply accent color
    applyAccentColor(data.accentColor);

    // Highlight active sort option (exclude group toggle)
    const options = document.querySelectorAll(".sort-option:not(.group-toggle-option)");
    options.forEach(function (opt) {
      opt.classList.toggle("active", opt.getAttribute("data-sort") === sortMode);
    });

    // Highlight group toggle independently
    const groupBtn = document.getElementById("groupToggleBtn");
    if (groupBtn) {
      groupBtn.classList.toggle("active", !!data.groupEnabled);
    }

    // Highlight active color swatch
    const swatches = document.querySelectorAll(".color-swatch");
    swatches.forEach(function (swatch) {
      swatch.classList.toggle("active", swatch.getAttribute("data-color") === data.accentColor);
    });

    // Update toggle switches
    const autoSortToggle = document.getElementById("toggleAutoSort");
    if (autoSortToggle) {
      autoSortToggle.classList.toggle("on", data.autoSort !== false);
    }

    const perLabelToggle = document.getElementById("togglePerLabel");
    if (perLabelToggle) {
      perLabelToggle.classList.toggle("on", !!data.perLabel);
    }
  });
}

// ── Query content script for live state ──────────────────────

function queryContentState() {
  sendToContent({ action: "getState" }, function (state) {
    if (!state) return;

    // Sync filter chips
    const chips = document.querySelectorAll(".filter-chip");
    chips.forEach(function (chip) {
      const filter = chip.getAttribute("data-filter");
      if (filter === "starred") chip.classList.toggle("active", !!state.filterStarred);
      else if (filter === "unread") chip.classList.toggle("active", !!state.filterUnread);
      else if (filter === "attachment") chip.classList.toggle("active", !!state.filterAttachment);
    });

    // Sync sort mode (content script is source of truth)
    const options = document.querySelectorAll(".sort-option:not(.group-toggle-option)");
    options.forEach(function (opt) {
      opt.classList.toggle("active", opt.getAttribute("data-sort") === state.sortMode);
    });

    // Sync group toggle
    const groupBtn = document.getElementById("groupToggleBtn");
    if (groupBtn) {
      groupBtn.classList.toggle("active", !!state.groupEnabled);
    }

    // Sync snooze status
    const snoozeStatus = document.getElementById("snoozeStatus");
    const snoozeStatusText = document.getElementById("snoozeStatusText");
    if (snoozeStatus && state.isSnoozed) {
      snoozeStatus.classList.add("visible");
      if (snoozeStatusText) {
        snoozeStatusText.textContent = "Paused \u2022 " + state.snoozeRemaining + "m remaining";
      }
    } else if (snoozeStatus) {
      snoozeStatus.classList.remove("visible");
    }
  });
}

// ── Sort option click handlers ───────────────────────────────

document.getElementById("sortOptions").addEventListener("click", function (e) {
  const option = e.target.closest(".sort-option");
  if (!option) return;

  // Group toggle uses a different action path
  if (option.classList.contains("group-toggle-option")) return;

  const sortMode = option.getAttribute("data-sort");
  if (!sortMode) return;

  // Save state
  safeStorageSet({ sortMode: sortMode }, function () {
    updatePopupState();
  });

  // Send to content script
  sendToContent({ action: "applySort", mode: sortMode });
});

// ── Group toggle click handler ────────────────────────────────

document.getElementById("groupToggleBtn").addEventListener("click", function () {
  // Optimistic UI toggle for instant visual feedback
  var groupBtn = document.getElementById("groupToggleBtn");
  if (groupBtn) groupBtn.classList.toggle("active");

  // Content script is sole authority — let it toggle + persist via saveState()
  sendToContent({ action: "toggleGroup" }, function (response) {
    // No Gmail tab / content script unavailable: revert optimistic UI.
    if (response === null && groupBtn) {
      groupBtn.classList.toggle("active");
      return;
    }
    // Re-sync from live page state (authoritative).
    queryContentState();
  });
});

// ── Color picker click handlers ──────────────────────────────

document.getElementById("colorPicker").addEventListener("click", function (e) {
  const swatch = e.target.closest(".color-swatch");
  if (!swatch) return;

  const color = swatch.getAttribute("data-color");
  if (!color) return;

  safeStorageSet({ accentColor: color }, function () {
    updatePopupState();
    sendToContent({ action: "setAccentColor", color: color });
  });
});

// ── Quick filter chip handlers ───────────────────────────────

document.getElementById("filterChips").addEventListener("click", function (e) {
  const chip = e.target.closest(".filter-chip");
  if (!chip) return;

  const filter = chip.getAttribute("data-filter");
  if (!filter) return;

  // Toggle active state locally
  chip.classList.toggle("active");

  // Send to content script
  sendToContent({ action: "toggleFilter", filter: filter }, function (response) {
    // No Gmail tab / content script unavailable: revert optimistic UI.
    if (response === null) {
      chip.classList.toggle("active");
      return;
    }
    queryContentState();
  });
});

// ── Settings toggle handlers ─────────────────────────────────

document.getElementById("toggleAutoSort").addEventListener("click", function () {
  const toggle = this;
  const isOn = toggle.classList.contains("on");
  const newVal = !isOn;
  toggle.classList.toggle("on", newVal);
  safeStorageSet({ autoSort: newVal });
});

document.getElementById("togglePerLabel").addEventListener("click", function () {
  const toggle = this;
  const isOn = toggle.classList.contains("on");
  const newVal = !isOn;
  toggle.classList.toggle("on", newVal);
  safeStorageSet({ perLabel: newVal });
});

// ── Snooze handlers ──────────────────────────────────────────

document.getElementById("snoozeRow").addEventListener("click", function (e) {
  const btn = e.target.closest(".snooze-btn");
  if (!btn) return;

  const minutes = parseInt(btn.getAttribute("data-minutes"), 10);
  if (!minutes) return;

  sendToContent({ action: "snoozeSort", minutes: minutes }, function (response) {
    if (response === null) {
      const snoozeStatus = document.getElementById("snoozeStatus");
      if (snoozeStatus) snoozeStatus.classList.remove("visible");
      return;
    }
    queryContentState();
  });

  // Show optimistic snooze status for snappy UI
  const snoozeStatus = document.getElementById("snoozeStatus");
  const snoozeStatusText = document.getElementById("snoozeStatusText");
  if (snoozeStatus) {
    snoozeStatus.classList.add("visible");
    if (snoozeStatusText) {
      snoozeStatusText.textContent = "Paused \u2022 " + minutes + "m remaining";
    }
  }
});

document.getElementById("snoozeCancel").addEventListener("click", function () {
  const snoozeStatus = document.getElementById("snoozeStatus");
  const wasVisible = !!(snoozeStatus && snoozeStatus.classList.contains("visible"));

  // Optimistic hide for snappy UI
  if (snoozeStatus) snoozeStatus.classList.remove("visible");

  sendToContent({ action: "cancelSnooze" }, function (response) {
    // If no Gmail tab, restore previous visual state.
    if (response === null) {
      if (snoozeStatus && wasVisible) snoozeStatus.classList.add("visible");
      return;
    }
    queryContentState();
  });
});

// ── Visible tabs toggle handlers ─────────────────────────────

function updateTabVisibility() {
  safeStorageGet({ hiddenTabs: {} }, function (data) {
    const hidden = normalizeHiddenTabs(data.hiddenTabs);
    const items = document.querySelectorAll(".tab-vis-item");
    items.forEach(function (item) {
      const tabId = item.getAttribute("data-tab");
      const toggle = item.querySelector(".tab-vis-toggle");
      const isVisible = !hidden[tabId];
      if (toggle) toggle.classList.toggle("on", isVisible);
      item.classList.toggle("hidden", !isVisible);
    });
  });
}

document.getElementById("tabVisList").addEventListener("click", function (e) {
  const toggle = e.target.closest(".tab-vis-toggle");
  if (!toggle) return;

  const tabId = toggle.getAttribute("data-tab");
  if (!tabId) return;

  safeStorageGet({ hiddenTabs: {} }, function (data) {
    const hidden = normalizeHiddenTabs(data.hiddenTabs);
    if (hidden[tabId]) {
      delete hidden[tabId];
    } else {
      hidden[tabId] = true;
    }
    safeStorageSet({ hiddenTabs: hidden }, function () {
      updateTabVisibility();
      sendToContent({ action: "setHiddenTabs", hiddenTabs: hidden });
    });
  });
});

// ── Export / Import handlers ─────────────────────────────────

function showExportImportStatus(msg, isError) {
  const el = document.getElementById("exportImportStatus");
  if (!el) return;
  el.textContent = msg;
  el.className = "export-import-status " + (isError ? "error" : "success");
  setTimeout(function () { el.className = "export-import-status"; el.textContent = ""; }, 3000);
}

document.getElementById("exportBtn").addEventListener("click", function () {
  safeStorageGet(null, function (data) {
    try {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "inboxsort-settings.json";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 100);
      showExportImportStatus("Settings exported!", false);
    } catch (err) {
      showExportImportStatus("Export failed: " + err.message, true);
    }
  }, {});
});

document.getElementById("importBtn").addEventListener("click", function () {
  document.getElementById("importFileInput").click();
});

document.getElementById("importFileInput").addEventListener("change", function (e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (ev) {
    try {
      const data = JSON.parse(ev.target.result);
      if (typeof data !== "object" || data === null || Array.isArray(data)) {
        showExportImportStatus("Invalid settings file", true);
        return;
      }
      // Only import known keys with type validation to prevent junk
      const VALID_SCHEMA = {
        sortMode:     function (v) { return typeof v === "string" && ["newest","oldest","senderAZ","senderZA","unreadFirst"].indexOf(v) !== -1; },
        groupEnabled: function (v) { return typeof v === "boolean"; },
        accentColor:  function (v) { return typeof v === "string" && ["blue","green","purple","red","orange","teal"].indexOf(v) !== -1; },
        autoSort:     function (v) { return typeof v === "boolean"; },
        perLabel:     function (v) { return typeof v === "boolean"; },
        labelPrefs:   function (v) { return typeof v === "object" && v !== null && !Array.isArray(v); },
        hiddenTabs:   function (v) { return typeof v === "object" && v !== null && !Array.isArray(v); }
      };
      const importData = {};
      Object.keys(VALID_SCHEMA).forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(data, key) && VALID_SCHEMA[key](data[key])) {
          importData[key] = data[key];
        }
      });
      if (Object.keys(importData).length === 0) {
        showExportImportStatus("No valid settings found", true);
        return;
      }
      safeStorageSet(importData, function () {
        updatePopupState();
        updateTabVisibility();
        showExportImportStatus("Settings imported!", false);
        // Notify content script of all imported changes
        if (importData.accentColor) sendToContent({ action: "setAccentColor", color: importData.accentColor });
        if (importData.hiddenTabs) sendToContent({ action: "setHiddenTabs", hiddenTabs: importData.hiddenTabs });
        if (importData.sortMode) sendToContent({ action: "applySort", mode: importData.sortMode });
        if (Object.prototype.hasOwnProperty.call(importData, "groupEnabled")) sendToContent({ action: "setGroupEnabled", enabled: importData.groupEnabled });
      });
    } catch (err) {
      showExportImportStatus("Invalid JSON file", true);
    }
  };
  reader.readAsText(file);
  // Reset input so same file can be selected again
  e.target.value = "";
});

// ── Reset button handler ─────────────────────────────────────

document.getElementById("resetBtn").addEventListener("click", function () {
  // Reset storage to defaults (newest = Gmail default order)
  safeStorageSet({
    sortMode: "newest",
    groupEnabled: false,
    accentColor: "blue",
    autoSort: true,
    perLabel: false,
    labelPrefs: {},
    hiddenTabs: {}
  }, function () {
    updatePopupState();
    updateTabVisibility();
  });

  // Clear filter chips visually
  document.querySelectorAll(".filter-chip.active").forEach(function (chip) {
    chip.classList.remove("active");
  });

  // Clear snooze status display
  const snoozeStatus = document.getElementById("snoozeStatus");
  if (snoozeStatus) snoozeStatus.classList.remove("visible");

  // Send reset to content script
  sendToContent({ action: "resetDefault" });
});

// ── Collapsible section handlers ───────────────────────────────

function setupCollapsible(toggleId) {
  const toggle = document.getElementById(toggleId);
  if (!toggle) return;
  toggle.addEventListener("click", function () {
    this.classList.toggle("open");
  });
}

setupCollapsible("toggleTabVis");
setupCollapsible("toggleShortcuts");

// ── Init ─────────────────────────────────────────────────────

applyDarkMode();
updatePopupState();
updateTabVisibility();

// Show a hint if not on a Gmail tab
getGmailTab(function (tab) {
  if (!tab) {
    const hint = document.createElement("div");
    hint.style.cssText = "padding:8px 16px;background:#fef7e0;color:#b06000;font-size:11.5px;text-align:center;font-family:inherit;border-radius:0;";
    hint.textContent = "Open Gmail to use sorting features";
    const header = document.getElementById("header");
    if (header && header.nextSibling) {
      header.parentNode.insertBefore(hint, header.nextSibling);
    }
  }
});

// Query live state from content script after a small delay
// (allows popup to render first for snappy feel)
setTimeout(queryContentState, 100);
