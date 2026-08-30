// ── Accent color definitions ──────────────────────────────────

const ACCENT_COLORS = {
  blue:   { primary: "#1a73e8", hover: "#1765cc", ink: "#174ea6", light: "#d2e3fc" },
  green:  { primary: "#1e8e3e", hover: "#188038", ink: "#137333", light: "#ceead6" },
  purple: { primary: "#8430ce", hover: "#7627bb", ink: "#5c16a5", light: "#e8d0fe" },
  red:    { primary: "#c5221f", hover: "#b31412", ink: "#a50e0e", light: "#f4c7c3" },
  orange: { primary: "#b85d00", hover: "#a65300", ink: "#8d4900", light: "#fde293" },
  teal:   { primary: "#007b83", hover: "#006d75", ink: "#005f66", light: "#b2ebf2" }
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
  unreadFirst: true,
  starredFirst: true
};

function normalizeSortMode(mode) {
  return VALID_SORT_MODES[mode] ? mode : "newest";
}

function normalizeHiddenTabs(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const normalized = {};
  const allowed = ["date", "sender", "unread", "starred", "groupSender"];
  allowed.forEach(function (key) {
    if (value[key] === true) normalized[key] = true;
  });

  // Migrate the old per-mode visibility settings to the merged Gmail toolbar.
  if (value.oldest === true && value.newest === true) normalized.date = true;
  if (value.senderAZ === true && value.senderZA === true) normalized.sender = true;
  if (value.unreadFirst === true) normalized.unread = true;
  if (value.starredFirst === true) normalized.starred = true;
  return normalized;
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isValidLabelPrefs(value) {
  if (!isPlainObject(value)) return false;
  const entries = Object.entries(value);
  if (entries.length > 250) return false;
  return entries.every(function (entry) {
    return entry[0].length <= 160 && !!VALID_SORT_MODES[entry[1]];
  });
}

function isValidHiddenTabs(value) {
  if (!isPlainObject(value)) return false;
  const allowed = {
    date: true,
    sender: true,
    unread: true,
    starred: true,
    groupSender: true,
    oldest: true,
    newest: true,
    senderAZ: true,
    senderZA: true,
    unreadFirst: true,
    starredFirst: true
  };
  return Object.entries(value).every(function (entry) {
    return !!allowed[entry[0]] && typeof entry[1] === "boolean";
  });
}

function setToggleState(element, isOn, activeClass) {
  if (!element) return;
  element.classList.toggle(activeClass || "on", !!isOn);
  if (element.getAttribute("role") === "switch" || element.getAttribute("role") === "radio") {
    element.setAttribute("aria-checked", isOn ? "true" : "false");
  } else {
    element.setAttribute("aria-pressed", isOn ? "true" : "false");
  }
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

function safeLocalStorageSet(data, callback) {
  if (!isRuntimeValid() || !chrome.storage || !chrome.storage.local) {
    if (callback) callback(false);
    return;
  }
  try {
    chrome.storage.local.set(data, function () {
      if (hasRuntimeLastError() || !isRuntimeValid()) {
        if (callback) callback(false);
        return;
      }
      if (callback) callback(true);
    });
  } catch (e) {
    if (!isContextInvalidatedError(e)) {
      console.warn("[InboxSort popup] local storage.set error:", e);
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
      if (tab && typeof tab.id === "number") {
        // When tab.url is available (activeTab grants it on popup open),
        // verify this is actually a Gmail tab before proceeding.
        if (tab.url && !tab.url.startsWith("https://mail.google.com/")) {
          callback(null);
          return;
        }
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
          // Content script not loaded yet. Still call back with null.
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

let liveStateSyncTimer = null;

function startLiveStateSync() {
  if (liveStateSyncTimer) return;
  liveStateSyncTimer = setInterval(function () {
    queryContentState();
  }, 2000);
}

function stopLiveStateSync() {
  if (!liveStateSyncTimer) return;
  clearInterval(liveStateSyncTimer);
  liveStateSyncTimer = null;
}

// ── Apply accent color to popup ──────────────────────────────

function applyAccentColor(color) {
  const c = ACCENT_COLORS[color] || ACCENT_COLORS.blue;
  const dc = DARK_ACCENT_COLORS[color] || DARK_ACCENT_COLORS.blue;
  document.body.style.setProperty("--accent", c.primary);
  document.body.style.setProperty("--accent-hover", c.hover);
  document.body.style.setProperty("--accent-ink", c.ink);
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

function setConnectionStatus(state) {
  const status = document.getElementById("connectionStatus");
  if (!status) return;
  status.classList.remove("connected", "disconnected");
  if (state === "connected") {
    status.textContent = "Gmail ready";
    status.classList.add("connected");
  } else if (state === "refresh") {
    status.textContent = "Refresh Gmail";
    status.classList.add("disconnected");
  } else {
    status.textContent = "Open Gmail";
    status.classList.add("disconnected");
  }
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
    const options = document.querySelectorAll(".sort-option");
    options.forEach(function (opt) {
      setToggleState(opt, opt.getAttribute("data-sort") === sortMode, "active");
    });

    // Highlight group toggle independently
    const groupBtn = document.getElementById("groupToggleBtn");
    if (groupBtn) {
      setToggleState(groupBtn, !!data.groupEnabled, "active");
    }

    // Highlight active color swatch
    const swatches = document.querySelectorAll(".color-swatch");
    swatches.forEach(function (swatch) {
      setToggleState(swatch, swatch.getAttribute("data-color") === data.accentColor, "active");
    });

    // Update toggle switches
    const autoSortToggle = document.getElementById("toggleAutoSort");
    if (autoSortToggle) {
      setToggleState(autoSortToggle, data.autoSort !== false);
    }

    const perLabelToggle = document.getElementById("togglePerLabel");
    if (perLabelToggle) {
      setToggleState(perLabelToggle, !!data.perLabel);
    }
  });
}

// ── Query content script for live state ──────────────────────

function queryContentState() {
  sendToContent({ action: "getState" }, function (state) {
    if (!state) {
      // Distinguish a Gmail tab that needs a refresh from an unrelated tab.
      getGmailTab(function (tab) {
        setConnectionStatus(tab ? "refresh" : "open");
      });
      return;
    }
    setConnectionStatus("connected");

    // Sync filter chips
    const chips = document.querySelectorAll(".filter-chip");
    chips.forEach(function (chip) {
      const filter = chip.getAttribute("data-filter");
      if (filter === "starred") setToggleState(chip, !!state.filterStarred, "active");
      else if (filter === "unread") setToggleState(chip, !!state.filterUnread, "active");
      else if (filter === "attachment") setToggleState(chip, !!state.filterAttachment, "active");
    });

    // Sync sort mode (content script is source of truth)
    const options = document.querySelectorAll(".sort-option");
    options.forEach(function (opt) {
      setToggleState(opt, opt.getAttribute("data-sort") === state.sortMode, "active");
    });

    // Sync group toggle
    const groupBtn = document.getElementById("groupToggleBtn");
    if (groupBtn) {
      setToggleState(groupBtn, !!state.groupEnabled, "active");
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
  sendToContent({ action: "applySort", mode: sortMode }, function (response) {
    if (response !== null) {
      queryContentState();
    } else {
      updatePopupState();
    }
  });
});

// ── Group toggle click handler ────────────────────────────────

document.getElementById("groupToggleBtn").addEventListener("click", function () {
  // Optimistic UI toggle for instant visual feedback
  var groupBtn = document.getElementById("groupToggleBtn");
  if (groupBtn) {
    setToggleState(groupBtn, groupBtn.getAttribute("aria-checked") !== "true", "active");
  }

  // Content script is the authority. Let it toggle and persist through saveState().
  sendToContent({ action: "toggleGroup" }, function (response) {
    // No Gmail tab / content script unavailable: revert optimistic UI.
    if (response === null && groupBtn) {
      setToggleState(groupBtn, groupBtn.getAttribute("aria-checked") !== "true", "active");
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
    sendToContent({ action: "setAccentColor", color: color }, function (response) {
      if (response !== null) {
        queryContentState();
      } else {
        updatePopupState();
      }
    });
  });
});

// ── Quick filter chip handlers ───────────────────────────────

document.getElementById("filterChips").addEventListener("click", function (e) {
  const chip = e.target.closest(".filter-chip");
  if (!chip) return;

  const filter = chip.getAttribute("data-filter");
  if (!filter) return;

  // Toggle active state locally
  setToggleState(chip, chip.getAttribute("aria-pressed") !== "true", "active");

  // Send to content script
  sendToContent({ action: "toggleFilter", filter: filter }, function (response) {
    // No Gmail tab / content script unavailable: revert optimistic UI.
    if (response === null) {
      setToggleState(chip, chip.getAttribute("aria-pressed") !== "true", "active");
      return;
    }
    queryContentState();
  });
});

// ── Settings toggle handlers ─────────────────────────────────

document.getElementById("toggleAutoSort").addEventListener("click", function () {
  const toggle = this;
  const isOn = toggle.getAttribute("aria-checked") === "true";
  const newVal = !isOn;
  setToggleState(toggle, newVal);
  safeStorageSet({ autoSort: newVal }, function () {
    setTimeout(queryContentState, 80);
  });
});

document.getElementById("togglePerLabel").addEventListener("click", function () {
  const toggle = this;
  const isOn = toggle.getAttribute("aria-checked") === "true";
  const newVal = !isOn;
  setToggleState(toggle, newVal);
  safeStorageSet({ perLabel: newVal }, function () {
    setTimeout(queryContentState, 80);
  });
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
      const isVisible = !hidden[tabId];
      setToggleState(item, isVisible);
      item.classList.toggle("hidden", !isVisible);
    });
  });
}

document.getElementById("tabVisList").addEventListener("click", function (e) {
  const toggle = e.target.closest(".tab-vis-item");
  if (!toggle || !this.contains(toggle)) return;

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
  if (showExportImportStatus.timer) clearTimeout(showExportImportStatus.timer);
  el.textContent = msg;
  el.className = "export-import-status " + (isError ? "error" : "success");
  showExportImportStatus.timer = setTimeout(function () {
    el.className = "export-import-status";
    el.textContent = "";
    showExportImportStatus.timer = null;
  }, 4000);
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
        sortMode:     function (v) { return typeof v === "string" && ["newest","oldest","senderAZ","senderZA","unreadFirst","starredFirst"].indexOf(v) !== -1; },
        groupEnabled: function (v) { return typeof v === "boolean"; },
        accentColor:  function (v) { return typeof v === "string" && ["blue","green","purple","red","orange","teal"].indexOf(v) !== -1; },
        autoSort:     function (v) { return typeof v === "boolean"; },
        perLabel:     function (v) { return typeof v === "boolean"; },
        labelPrefs:   isValidLabelPrefs,
        hiddenTabs:   isValidHiddenTabs
      };
      const importData = {};
      Object.keys(VALID_SCHEMA).forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(data, key) && VALID_SCHEMA[key](data[key])) {
          importData[key] = key === "hiddenTabs" ? normalizeHiddenTabs(data[key]) : data[key];
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
        setTimeout(queryContentState, 120);
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

let resetConfirmTimer = null;

document.getElementById("resetBtn").addEventListener("click", function () {
  const resetBtn = this;
  if (!resetBtn.classList.contains("armed")) {
    resetBtn.classList.add("armed");
    resetBtn.textContent = "Click again to reset everything";
    if (resetConfirmTimer) clearTimeout(resetConfirmTimer);
    resetConfirmTimer = setTimeout(function () {
      resetBtn.classList.remove("armed");
      resetBtn.textContent = "Reset all settings";
      resetConfirmTimer = null;
    }, 4000);
    return;
  }

  resetBtn.classList.remove("armed");
  resetBtn.textContent = "Reset all settings";
  if (resetConfirmTimer) {
    clearTimeout(resetConfirmTimer);
    resetConfirmTimer = null;
  }

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
  safeLocalStorageSet({ snoozeState: null });

  // Clear filter chips visually
  document.querySelectorAll(".filter-chip.active").forEach(function (chip) {
    setToggleState(chip, false, "active");
  });

  // Clear snooze status display
  const snoozeStatus = document.getElementById("snoozeStatus");
  if (snoozeStatus) snoozeStatus.classList.remove("visible");

  // Send reset to content script
  sendToContent({ action: "resetDefault" }, function (response) {
    if (response !== null) {
      queryContentState();
    } else {
      updatePopupState();
    }
  });
  showExportImportStatus("Settings reset", false);
});

// ── Collapsible section handlers ───────────────────────────────

function setupCollapsible(toggleId) {
  const toggle = document.getElementById(toggleId);
  if (!toggle) return;
  const bodyId = toggle.getAttribute("aria-controls");
  const body = bodyId ? document.getElementById(bodyId) : null;
  toggle.addEventListener("click", function () {
    const isOpen = this.getAttribute("aria-expanded") === "true";
    this.setAttribute("aria-expanded", isOpen ? "false" : "true");
    this.classList.toggle("open", !isOpen);
    if (body) body.hidden = isOpen;
  });
}

setupCollapsible("toggleTabVis");
setupCollapsible("toggleShortcuts");

// ── Init ─────────────────────────────────────────────────────

applyDarkMode();
updatePopupState();
updateTabVisibility();

// Set version dynamically from manifest
try {
  var versionEl = document.getElementById("inboxsort-version");
  if (versionEl) versionEl.textContent = "InboxSort v" + chrome.runtime.getManifest().version;
} catch (_) {}

// Surface connection state without inserting layout-shifting content.
getGmailTab(function (tab) {
  if (!tab) {
    setConnectionStatus("open");
  } else {
    setConnectionStatus("connected");
  }
});

// Query live state from content script after a small delay
// (allows popup to render first for snappy feel)
setTimeout(queryContentState, 100);
startLiveStateSync();

window.addEventListener("focus", function () {
  updatePopupState();
  queryContentState();
  startLiveStateSync();
});

window.addEventListener("blur", function () {
  stopLiveStateSync();
});

document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "visible") {
    updatePopupState();
    queryContentState();
    startLiveStateSync();
  } else {
    stopLiveStateSync();
  }
});

window.addEventListener("unload", function () {
  stopLiveStateSync();
});
