// ── Accent color definitions ──────────────────────────────────

var ACCENT_COLORS = {
  blue:   { primary: "#1a73e8", dark: "#174ea6", light: "#d2e3fc" },
  green:  { primary: "#1e8e3e", dark: "#137333", light: "#ceead6" },
  purple: { primary: "#9334e6", dark: "#5c16a5", light: "#e8d0fe" },
  red:    { primary: "#d93025", dark: "#a50e0e", light: "#f4c7c3" },
  orange: { primary: "#e8710a", dark: "#b06000", light: "#fde293" },
  teal:   { primary: "#007b83", dark: "#005f66", light: "#b2ebf2" }
};

// ── Helper: get active Gmail tab ─────────────────────────────

function getGmailTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var tab = tabs && tabs[0];
    if (tab && tab.url && tab.url.indexOf("mail.google.com") !== -1) {
      callback(tab);
    } else {
      callback(null);
    }
  });
}

// ── Helper: send message to content script ───────────────────

function sendToContent(msg, callback) {
  getGmailTab(function (tab) {
    if (!tab) return;
    try {
      chrome.tabs.sendMessage(tab.id, msg, function (response) {
        if (chrome.runtime.lastError) {
          // Content script not loaded yet, ignore
        }
        if (callback) callback(response);
      });
    } catch (e) {
      // Tab might not have content script loaded
    }
  });
}

// ── Apply accent color to popup ──────────────────────────────

function applyAccentColor(color) {
  var c = ACCENT_COLORS[color] || ACCENT_COLORS.blue;
  document.body.style.setProperty("--accent", c.primary);
  document.body.style.setProperty("--accent-dark", c.dark);
  document.body.style.setProperty("--accent-light", c.light);
}

// ── Apply dark mode ──────────────────────────────────────────

function applyDarkMode() {
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.body.classList.add("dark");
  }
}

// ── Update UI to reflect current state ───────────────────────

function updatePopupState() {
  chrome.storage.sync.get({
    sortMode: "newest",
    groupEnabled: false,
    accentColor: "blue",
    autoSort: true,
    perLabel: false
  }, function (data) {
    // Apply accent color
    applyAccentColor(data.accentColor);

    // Highlight active sort option (exclude group toggle)
    var options = document.querySelectorAll(".sort-option:not(.group-toggle-option)");
    options.forEach(function (opt) {
      opt.classList.toggle("active", opt.getAttribute("data-sort") === data.sortMode);
    });

    // Highlight group toggle independently
    var groupBtn = document.getElementById("groupToggleBtn");
    if (groupBtn) {
      groupBtn.classList.toggle("active", !!data.groupEnabled);
    }

    // Highlight active color swatch
    var swatches = document.querySelectorAll(".color-swatch");
    swatches.forEach(function (swatch) {
      swatch.classList.toggle("active", swatch.getAttribute("data-color") === data.accentColor);
    });

    // Update toggle switches
    var autoSortToggle = document.getElementById("toggleAutoSort");
    if (autoSortToggle) {
      autoSortToggle.classList.toggle("on", data.autoSort !== false);
    }

    var perLabelToggle = document.getElementById("togglePerLabel");
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
    var chips = document.querySelectorAll(".filter-chip");
    chips.forEach(function (chip) {
      var filter = chip.getAttribute("data-filter");
      if (filter === "starred") chip.classList.toggle("active", !!state.filterStarred);
      else if (filter === "unread") chip.classList.toggle("active", !!state.filterUnread);
      else if (filter === "attachment") chip.classList.toggle("active", !!state.filterAttachment);
    });

    // Sync sort mode (content script is source of truth)
    var options = document.querySelectorAll(".sort-option:not(.group-toggle-option)");
    options.forEach(function (opt) {
      opt.classList.toggle("active", opt.getAttribute("data-sort") === state.sortMode);
    });

    // Sync group toggle
    var groupBtn = document.getElementById("groupToggleBtn");
    if (groupBtn) {
      groupBtn.classList.toggle("active", !!state.groupEnabled);
    }

    // Sync snooze status
    var snoozeStatus = document.getElementById("snoozeStatus");
    var snoozeStatusText = document.getElementById("snoozeStatusText");
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
  var option = e.target.closest(".sort-option");
  if (!option) return;

  // Group toggle uses a different action path
  if (option.classList.contains("group-toggle-option")) return;

  var sortMode = option.getAttribute("data-sort");
  if (!sortMode) return;

  // Save state
  chrome.storage.sync.set({ sortMode: sortMode }, function () {
    updatePopupState();
  });

  // Send to content script, then close popup
  sendToContent({ action: "applySort", mode: sortMode }, function () {
    setTimeout(function () { window.close(); }, 200);
  });
  // Fallback close if message never gets a response
  setTimeout(function () { window.close(); }, 800);
});

// ── Group toggle click handler ────────────────────────────────

document.getElementById("groupToggleBtn").addEventListener("click", function () {
  // Toggle groupEnabled in storage
  chrome.storage.sync.get({ groupEnabled: false }, function (data) {
    var newVal = !data.groupEnabled;
    chrome.storage.sync.set({ groupEnabled: newVal }, function () {
      updatePopupState();
    });
  });

  // Send toggle to content script, then close popup
  sendToContent({ action: "toggleGroup" }, function () {
    setTimeout(function () { window.close(); }, 200);
  });
  // Fallback close
  setTimeout(function () { window.close(); }, 800);
});

// ── Color picker click handlers ──────────────────────────────

document.getElementById("colorPicker").addEventListener("click", function (e) {
  var swatch = e.target.closest(".color-swatch");
  if (!swatch) return;

  var color = swatch.getAttribute("data-color");
  if (!color) return;

  chrome.storage.sync.set({ accentColor: color }, function () {
    updatePopupState();
    sendToContent({ action: "setAccentColor", color: color });
  });
});

// ── Quick filter chip handlers ───────────────────────────────

document.getElementById("filterChips").addEventListener("click", function (e) {
  var chip = e.target.closest(".filter-chip");
  if (!chip) return;

  var filter = chip.getAttribute("data-filter");
  if (!filter) return;

  // Toggle active state locally
  chip.classList.toggle("active");

  // Send to content script
  sendToContent({ action: "toggleFilter", filter: filter });
});

// ── Settings toggle handlers ─────────────────────────────────

document.getElementById("toggleAutoSort").addEventListener("click", function () {
  var toggle = this;
  var isOn = toggle.classList.contains("on");
  var newVal = !isOn;
  toggle.classList.toggle("on", newVal);
  chrome.storage.sync.set({ autoSort: newVal });
});

document.getElementById("togglePerLabel").addEventListener("click", function () {
  var toggle = this;
  var isOn = toggle.classList.contains("on");
  var newVal = !isOn;
  toggle.classList.toggle("on", newVal);
  chrome.storage.sync.set({ perLabel: newVal });
});

// ── Snooze handlers ──────────────────────────────────────────

document.getElementById("snoozeRow").addEventListener("click", function (e) {
  var btn = e.target.closest(".snooze-btn");
  if (!btn) return;

  var minutes = parseInt(btn.getAttribute("data-minutes"), 10);
  if (!minutes) return;

  sendToContent({ action: "snoozeSort", minutes: minutes });

  // Show snooze status
  var snoozeStatus = document.getElementById("snoozeStatus");
  var snoozeStatusText = document.getElementById("snoozeStatusText");
  if (snoozeStatus) {
    snoozeStatus.classList.add("visible");
    if (snoozeStatusText) {
      snoozeStatusText.textContent = "Paused \u2022 " + minutes + "m remaining";
    }
  }
});

document.getElementById("snoozeCancel").addEventListener("click", function () {
  sendToContent({ action: "cancelSnooze" });

  var snoozeStatus = document.getElementById("snoozeStatus");
  if (snoozeStatus) snoozeStatus.classList.remove("visible");
});

// ── Visible tabs toggle handlers ─────────────────────────────

function updateTabVisibility() {
  chrome.storage.sync.get({ hiddenTabs: {} }, function (data) {
    var hidden = data.hiddenTabs || {};
    var items = document.querySelectorAll(".tab-vis-item");
    items.forEach(function (item) {
      var tabId = item.getAttribute("data-tab");
      var toggle = item.querySelector(".tab-vis-toggle");
      var isVisible = !hidden[tabId];
      if (toggle) toggle.classList.toggle("on", isVisible);
      item.classList.toggle("hidden", !isVisible);
    });
  });
}

document.getElementById("tabVisList").addEventListener("click", function (e) {
  var toggle = e.target.closest(".tab-vis-toggle");
  if (!toggle) return;

  var tabId = toggle.getAttribute("data-tab");
  if (!tabId) return;

  chrome.storage.sync.get({ hiddenTabs: {} }, function (data) {
    var hidden = data.hiddenTabs || {};
    if (hidden[tabId]) {
      delete hidden[tabId];
    } else {
      hidden[tabId] = true;
    }
    chrome.storage.sync.set({ hiddenTabs: hidden }, function () {
      updateTabVisibility();
      sendToContent({ action: "setHiddenTabs", hiddenTabs: hidden });
    });
  });
});

// ── Export / Import handlers ─────────────────────────────────

function showExportImportStatus(msg, isError) {
  var el = document.getElementById("exportImportStatus");
  if (!el) return;
  el.textContent = msg;
  el.className = "export-import-status " + (isError ? "error" : "success");
  setTimeout(function () { el.className = "export-import-status"; el.textContent = ""; }, 3000);
}

document.getElementById("exportBtn").addEventListener("click", function () {
  chrome.storage.sync.get(null, function (data) {
    var json = JSON.stringify(data, null, 2);
    var blob = new Blob([json], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "inboxsort-settings.json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 100);
    showExportImportStatus("Settings exported!", false);
  });
});

document.getElementById("importBtn").addEventListener("click", function () {
  document.getElementById("importFileInput").click();
});

document.getElementById("importFileInput").addEventListener("change", function (e) {
  var file = e.target.files && e.target.files[0];
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function (ev) {
    try {
      var data = JSON.parse(ev.target.result);
      if (typeof data !== "object" || data === null || Array.isArray(data)) {
        showExportImportStatus("Invalid settings file", true);
        return;
      }
      // Only import known keys to prevent junk
      var validKeys = ["sortMode", "groupEnabled", "accentColor", "autoSort", "perLabel", "labelPrefs", "hiddenTabs"];
      var importData = {};
      validKeys.forEach(function (key) {
        if (data.hasOwnProperty(key)) importData[key] = data[key];
      });
      if (Object.keys(importData).length === 0) {
        showExportImportStatus("No valid settings found", true);
        return;
      }
      chrome.storage.sync.set(importData, function () {
        updatePopupState();
        updateTabVisibility();
        showExportImportStatus("Settings imported!", false);
        // Notify content script of changes
        if (importData.accentColor) sendToContent({ action: "setAccentColor", color: importData.accentColor });
        if (importData.hiddenTabs) sendToContent({ action: "setHiddenTabs", hiddenTabs: importData.hiddenTabs });
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
  chrome.storage.sync.set({
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
  var snoozeStatus = document.getElementById("snoozeStatus");
  if (snoozeStatus) snoozeStatus.classList.remove("visible");

  // Send reset to content script, then close popup
  sendToContent({ action: "resetDefault" }, function () {
    setTimeout(function () { window.close(); }, 200);
  });
  // Fallback close
  setTimeout(function () { window.close(); }, 800);
});

// ── Collapsible section handlers ───────────────────────────────

function setupCollapsible(toggleId) {
  var toggle = document.getElementById(toggleId);
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
    var hint = document.createElement("div");
    hint.style.cssText = "padding:8px 16px;background:#fef7e0;color:#b06000;font-size:11.5px;text-align:center;font-family:inherit;border-radius:0;";
    hint.textContent = "Open Gmail to use sorting features";
    var header = document.getElementById("header");
    if (header && header.nextSibling) {
      header.parentNode.insertBefore(hint, header.nextSibling);
    }
  }
});

// Query live state from content script after a small delay
// (allows popup to render first for snappy feel)
setTimeout(queryContentState, 100);
