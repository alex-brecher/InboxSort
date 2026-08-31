(function () {
  "use strict";

  /* ================================================================
   *  InboxSort - Content Script (v1.3.2)
   *  Made by Alex Brecher
   *  Sorts Gmail inbox visually using CSS transforms.
   *  Features: 6 sort modes, group-by-sender toggle, stats bar, filters,
   *  keyboard shortcuts, snooze, per-label prefs, auto-sort toggle.
   * ================================================================ */

  // ── SVG icon library ──────────────────────────────────────────────

  const ICONS = {
    oldest:
      '<svg viewBox="0 0 16 16" width="14" height="14" fill="none">' +
      '<path d="M8 13V3m-3.5 3.5L8 3l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    newest:
      '<svg viewBox="0 0 16 16" width="14" height="14" fill="none">' +
      '<path d="M8 3v10m-3.5-3.5L8 13l3.5-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    senderAZ:
      '<svg viewBox="0 0 16 16" width="14" height="14" fill="none">' +
      '<path d="M2 4h4M2 8h7M2 12h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    senderZA:
      '<svg viewBox="0 0 16 16" width="14" height="14" fill="none">' +
      '<path d="M2 4h10M2 8h7M2 12h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    unreadFirst:
      '<svg viewBox="0 0 16 16" width="14" height="14" fill="none">' +
      '<rect x="2" y="4" width="12" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/>' +
      '<path d="M2 5l6 4 6-4" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>' +
      '<circle cx="12.5" cy="4" r="2" fill="currentColor"/></svg>',
    groupSender:
      '<svg viewBox="0 0 16 16" width="14" height="14" fill="none">' +
      '<path d="M1 3h14M1 6.5h10M1 10h14M1 13.5h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' +
      '<circle cx="13.5" cy="6.5" r="1.2" fill="currentColor"/>' +
      '<circle cx="13.5" cy="13.5" r="1.2" fill="currentColor"/></svg>',
    starred:
      '<svg viewBox="0 0 16 16" width="13" height="13" fill="none">' +
      '<path d="M8 1.5l1.76 3.57 3.94.57-2.85 2.78.67 3.93L8 10.67l-3.52 1.68.67-3.93L2.3 5.64l3.94-.57L8 1.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    attachment:
      '<svg viewBox="0 0 16 16" width="13" height="13" fill="none">' +
      '<path d="M13.5 7.25l-5.75 5.75a3.18 3.18 0 01-4.5-4.5L9.5 2.25a2.12 2.12 0 013 3L6.25 11.5a1.06 1.06 0 01-1.5-1.5L10.5 4.25" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    search:
      '<svg viewBox="0 0 16 16" width="14" height="14" fill="none">' +
      '<circle cx="6.5" cy="6.5" r="4" stroke="currentColor" stroke-width="1.4"/>' +
      '<path d="M10 10l4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    close:
      '<svg viewBox="0 0 16 16" width="12" height="12" fill="none">' +
      '<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    keyboard:
      '<svg viewBox="0 0 16 16" width="14" height="14" fill="none">' +
      '<rect x="1" y="4" width="14" height="8" rx="1.5" stroke="currentColor" stroke-width="1.2"/>' +
      '<path d="M4 6.5h1M7 6.5h2M11 6.5h1M5 9h6" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>',
    selectAll:
      '<svg viewBox="0 0 14 14" width="11" height="11" fill="none">' +
      '<rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.3"/>' +
      '<path d="M4 7l2 2 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  // ── Sort-mode definitions ─────────────────────────────────────────

  const SORT_MODES = [
    { id: "oldest",      label: "Sorted oldest first",    tabLabel: "Oldest",  icon: "oldest",      group: "date" },
    { id: "newest",      label: "Default order",           tabLabel: "Newest",  icon: "newest",      group: "date" },
    { id: "senderAZ",    label: "Sorted sender A\u2192Z",  tabLabel: "A\u2192Z", icon: "senderAZ",  group: "sender" },
    { id: "senderZA",    label: "Sorted sender Z\u2192A",  tabLabel: "Z\u2192A", icon: "senderZA",  group: "sender" },
    { id: "unreadFirst", label: "Unread first",            tabLabel: "Unread",  icon: "unreadFirst" },
    { id: "starredFirst", label: "Starred first, then newest", tabLabel: "Starred", icon: "starred" }
  ];

  function isKnownSortMode(mode) {
    for (let i = 0; i < SORT_MODES.length; i++) {
      if (SORT_MODES[i].id === mode) return true;
    }
    return false;
  }

  function normalizeSortMode(mode) {
    return isKnownSortMode(mode) ? mode : "newest";
  }

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

  // Tab groups: merge related sort modes into single toggle buttons.
  // "newest" (default Gmail order) is NOT in any group — it's the inactive state.
  // Click cycle: inactive → mode[0] → mode[1] → … → inactive (newest).
  // NOTE: Group is a separate toggle (not a sort mode). See groupEnabled state.
  const TAB_GROUPS = [
    { id: "date",   modes: ["oldest"],                 defaultLabel: "Date",   defaultIcon: "newest" },
    { id: "sender", modes: ["senderAZ", "senderZA"],   defaultLabel: "Sender", defaultIcon: "senderAZ" },
    { id: "unread", modes: ["unreadFirst"],             defaultLabel: "Unread", defaultIcon: "unreadFirst" },
    { id: "starred", modes: ["starredFirst"],           defaultLabel: "Starred", defaultIcon: "starred" }
  ];

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

  // ── Timing & threshold constants ────────────────────────────────
  // Centralises all magic numbers for easy tuning and documentation.

  const CONFIG = {
    // Row cache time-to-live (ms) — how long getVisibleEmailRows() reuses cached results
    ROW_CACHE_TTL: 500,
    // Row metadata cache TTL (ms) — volatile values are refreshed in stats/filter paths
    ROW_META_TTL: 3000,
    // Persist state writes are debounced to avoid sync-storage quota spikes
    SAVE_STATE_DEBOUNCE: 200,
    SAVE_STATE_RETRY_BASE: 1000,
    SAVE_STATE_RETRY_MAX: 10000,

    // Sort animation
    SORT_TRANSITION_DURATION: "0.3s",   // CSS transition duration for row transforms
    SORT_DELAY_INCREMENT: 6,            // ms added per-row for stagger effect
    SORT_DELAY_MAX: 300,                // cap on per-row stagger delay (ms)

    // Group-by-sender style-reapply interval (Gmail aggressively wipes inline styles)
    GROUP_FAST_INTERVAL: 400,           // aggressive re-check interval (ms) for first 10s
    GROUP_SLOW_INTERVAL: 2000,          // maintenance interval (ms) after fast phase
    GROUP_FAST_TICKS: 25,               // ticks in fast phase (25 × 400ms = 10s)
    GROUP_MAX_TICKS: 85,                // total ticks before auto-stop (≈2 min)

    // Pagination poll — waits for Gmail to load the next page of results
    PAGINATION_TIMEOUT: 10000,          // give up after 10s
    PAGINATION_POLL: 200,               // poll interval (ms) while waiting for new page
    PAGE_SETTLE_DELAY: 800,             // ms to wait after page change before re-sorting

    // Navigation guard — prevents sort from firing during programmatic hash changes
    NAVIGATION_TIMEOUT: 2000,

    // Snooze (pause sorting temporarily)
    SNOOZE_TICK_INTERVAL: 30000,        // badge countdown refresh interval (ms)

    // Toast notification
    TOAST_DISPLAY: 2000,                // how long the toast stays visible (ms)
    TOAST_FADE: 250,                    // fade-out animation duration (ms)

    // Auto-sort on page load — polls for rows then applies stored sort
    AUTO_SORT_MAX_ATTEMPTS: 40,         // max poll iterations before giving up
    AUTO_SORT_POLL: 100,                // interval between polls (ms)
    // Stats bar throttle — avoids excessive DOM updates
    STATS_THROTTLE: 1500,

    // MutationObserver debounce — batches rapid DOM changes into one handler call
    OBSERVER_DEBOUNCE: 250,
    // Gmail can replace div[role="main"] without mutating the old node. A cheap
    // watchdog reconnects the observer and restores the toolbar when that happens.
    OBSERVER_WATCHDOG: 1500,

    // Search input debounce — waits for typing to pause before filtering
    SEARCH_DEBOUNCE: 150,

    // Initialisation — waits for Gmail's main content area to appear
    INIT_POLL: 500,                     // interval to check for div[role="main"]
    INIT_TIMEOUT: 30000,                // failsafe: stop waiting after 30s

    // Cheat-sheet overlay fade duration (ms)
    CHEATSHEET_FADE: 200,

    // Thread-ID heuristic: strings ≥ this length that are alphanumeric+dash+underscore
    // are treated as Gmail thread IDs (triggers single-message view detection)
    THREAD_ID_MIN_LENGTH: 15
  };

  // ── Runtime state ─────────────────────────────────────────────────
  // Grouped logically for readability. All state lives inside this IIFE.

  // Sort & group mode
  let currentSort      = "newest";
  let groupEnabled     = false;   // Group-by-sender overlay (combinable with any sort)
  let originalPage     = null;    // Hash to return to after "oldest" pagination

  // UI elements & appearance
  let container        = null;    // Toolbar DOM element
  let statsBar         = null;    // Stats bar DOM element
  let cheatsheetEl     = null;    // Keyboard shortcut overlay
  let _cheatsheetReturnFocus = null;
  let accentColor      = "blue";
  let isDarkMode       = false;
  let hiddenTabs       = {};

  // Filters
  let searchQuery      = "";
  let filterStarred    = false;
  let filterAttachment = false;
  let filterUnread     = false;

  // Settings (loaded from chrome.storage)
  let autoSortEnabled  = true;
  let perLabelEnabled  = false;

  // Navigation & auto-sort
  let isNavigating     = false;
  let hasAutoSorted    = false;
  let _autoSortPending = false;   // Mutex: prevents duplicate autoSortWhenReady calls

  // Snooze (pause sorting)
  let snoozeTimer      = null;
  let snoozedSort      = null;
  let snoozedGroup     = false;
  let snoozeEndTime    = 0;
  let snoozeTickTimer  = null;

  // Cache & perf
  let lastStatsUpdate  = 0;
  let _lastStatsKey    = "";
  let _currentGroupData = null;   // Saved group data for interval re-apply

  // Timer & interval references (cleaned up on page unload)
  let autoSortInterval    = null;
  let _groupStyleInterval = null; // Persistent group style re-apply
  let _observer           = null; // MutationObserver instance
  let _observerRoot       = null; // Current Gmail main node observed for changes
  let _observerWatchdog   = null; // Reconnects after Gmail replaces the main node
  let _observerDebounce   = null; // Observer debounce timer
  let _initWaitInterval   = null; // init() polling interval
  let _initSafetyTimeout  = null; // init() 30s failsafe timeout
  let _waitForNewPage     = null; // Pagination poll interval
  let _suppressObserver   = false; // Prevent observer self-triggers during our own DOM writes
  let _lastSortedRowCount = 0;     // Row count at last sort — triggers re-sort when rows change
  let _lastSortedRowElements = null; // First few row elements for identity-change detection
  let _lastRowChangeSort  = 0;     // Timestamp of last row-change re-sort (throttle)
  let _searchDebounce     = null;  // Search input debounce timer
  let _hiddenTabsRetryTimers = []; // Delayed storage re-sync timers for hidden tabs
  let _saveStateTimer     = null;  // Debounced storage write timer
  let _saveStatePending   = false; // Coalesces rapid save requests
  let _saveStateInFlight  = false; // Single in-flight sync write guard
  let _saveStateRetryDelay = CONFIG.SAVE_STATE_RETRY_BASE;
  let _sortInProgress      = false; // Reentrancy guard for applySortTransforms
  let _resizeDebounce      = null;  // Debounce timer for viewport resize re-sort
  let _lastResizeWidth     = 0;     // Track viewport width to ignore height-only resizes
  let _initialized         = false; // Prevent duplicate timers and observers

  // ── Current Gmail label ─────────────────────────────────────────

  function getCurrentLabel() {
    let hash = location.hash;
    if (!hash || hash === "#" || hash === "#inbox" || /^#inbox\/p\d+$/.test(hash)) return "inbox";

    let cleaned = hash.replace(/^#/, "").replace(/\/p\d+$/, "");
    if (!cleaned) return "inbox";

    // In thread view hashes (e.g. inbox/<threadId>), normalize to the list label
    // so per-label prefs don't get stored under transient thread IDs.
    let parts = cleaned.split("/");
    let lastPart = parts[parts.length - 1];
    let threadLikeTail = !!(lastPart &&
      lastPart.length >= CONFIG.THREAD_ID_MIN_LENGTH &&
      /^[A-Za-z0-9_-]+$/.test(lastPart));

    // Two-segment hashes are often list labels (e.g. label/Work). Only treat
    // the last segment as a thread id when the path shape can actually contain
    // a thread tail for that root.
    let singleRootThreadLabels = {
      inbox: true, all: true, sent: true, starred: true, important: true,
      drafts: true, snoozed: true, spam: true, trash: true, scheduled: true,
      chats: true
    };
    let canHaveThreadTail =
      (parts.length >= 3) ||
      (parts.length >= 2 && !!singleRootThreadLabels[parts[0]]);

    if (threadLikeTail && canHaveThreadTail) {
      parts.pop();
    }

    let normalized = parts.join("/");
    return normalized || "inbox";
  }

  // Labels where the toolbar is hidden — these folders contain too many
  // emails for client-side sorting to work well.
  let EXCLUDED_LABELS = { "sent": true, "all": true };

  function isExcludedLabel() {
    let label = getCurrentLabel();
    return !!EXCLUDED_LABELS[label];
  }

  // ── Extension context validity ───────────────────────────────────

  let _contextInvalid = false;

  function isExtensionContextValid() {
    if (_contextInvalid) return false;
    try {
      // chrome.runtime.id is undefined when the extension has been
      // reloaded / uninstalled while this content-script is still alive.
      void chrome.runtime.id;
      return true;
    } catch (e) {
      return false;
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

  function hasRuntimeLastError() {
    try {
      return !!(chrome.runtime && chrome.runtime.lastError);
    } catch (_) {
      return true;
    }
  }

  function getRuntimeLastErrorMessage() {
    try {
      if (!chrome.runtime || !chrome.runtime.lastError) return "";
      return String(chrome.runtime.lastError.message || chrome.runtime.lastError || "");
    } catch (_) {
      return "";
    }
  }

  function isStorageQuotaError(msg) {
    return /quota|max_write_operations|write operations/i.test(String(msg || ""));
  }

  function clearAccentColorVars() {
    let root = document.documentElement && document.documentElement.style;
    if (!root) return;
    root.removeProperty("--sort-accent");
    root.removeProperty("--sort-accent-hover");
    root.removeProperty("--sort-accent-light");
    root.removeProperty("--sort-accent-ink");
    document.documentElement.classList.remove("gmail-sort-dark-mode");
  }

  /** Call when we detect the extension context is dead. Tears down the
   *  observer and removes UI so stale scripts don't keep running. */
  function handleContextInvalidated() {
    if (_contextInvalid) return;          // already handled
    _contextInvalid = true;
    // Expected during extension reload/uninstall; keep this low-noise.
    if (typeof console !== "undefined" && typeof console.debug === "function") {
      console.debug("[InboxSort] Extension context invalidated — cleaning up.");
    }

    // Stop timers/intervals to avoid stale loops after extension reload/uninstall.
    if (autoSortInterval)    { clearInterval(autoSortInterval);    autoSortInterval = null; }
    if (_groupStyleInterval) { clearInterval(_groupStyleInterval); _groupStyleInterval = null; }
    if (_observerDebounce)   { clearTimeout(_observerDebounce);    _observerDebounce = null; }
    if (_observerWatchdog)   { clearInterval(_observerWatchdog);   _observerWatchdog = null; }
    if (_searchDebounce)     { clearTimeout(_searchDebounce);      _searchDebounce = null; }
    if (snoozeTimer)         { clearTimeout(snoozeTimer);          snoozeTimer = null; }
    if (snoozeTickTimer)     { clearInterval(snoozeTickTimer);     snoozeTickTimer = null; }
    if (_initWaitInterval)   { clearInterval(_initWaitInterval);   _initWaitInterval = null; }
    if (_initSafetyTimeout)  { clearTimeout(_initSafetyTimeout);   _initSafetyTimeout = null; }
    if (_waitForNewPage)     { clearInterval(_waitForNewPage);     _waitForNewPage = null; }
    if (_saveStateTimer)     { clearTimeout(_saveStateTimer);      _saveStateTimer = null; }
    _saveStatePending = false;
    _saveStateInFlight = false;
    _saveStateRetryDelay = CONFIG.SAVE_STATE_RETRY_BASE;
    if (_hiddenTabsRetryTimers.length) {
      for (let ti = 0; ti < _hiddenTabsRetryTimers.length; ti++) {
        clearTimeout(_hiddenTabsRetryTimers[ti]);
      }
      _hiddenTabsRetryTimers = [];
    }
    stopGroupStyleInterval();

    if (_observer) { _observer.disconnect(); _observer = null; }
    _observerRoot = null;
    document.removeEventListener("click", onDocumentClick, true);
    document.removeEventListener("mousedown", onDocumentMousedown, true);
    document.removeEventListener("input", onDocumentInput, false);
    document.removeEventListener("keydown", onDocumentKeydown, true);
    // Remove UI elements so users don't see a broken toolbar
    let old = document.querySelectorAll(".gmail-sort-container");
    for (let i = 0; i < old.length; i++) old[i].remove();
    let oldStats = document.querySelectorAll(".gmail-sort-stats");
    for (let i = 0; i < oldStats.length; i++) oldStats[i].remove();
    container = null;
    statsBar = null;
    clearAccentColorVars();
  }

  // ── Persistence (chrome.storage.sync — syncs across devices) ─────

  function scheduleSaveState(delay) {
    if (_contextInvalid) return;
    if (_saveStateTimer) clearTimeout(_saveStateTimer);
    _saveStateTimer = setTimeout(flushSaveState, Math.max(0, delay || 0));
  }

  function finishSaveState(retry) {
    _saveStateInFlight = false;
    if (_contextInvalid) return;
    if (retry) {
      _saveStatePending = true;
      scheduleSaveState(_saveStateRetryDelay);
      _saveStateRetryDelay = Math.min(CONFIG.SAVE_STATE_RETRY_MAX, _saveStateRetryDelay * 2);
      return;
    }
    _saveStateRetryDelay = CONFIG.SAVE_STATE_RETRY_BASE;
    if (_saveStatePending) {
      scheduleSaveState(CONFIG.SAVE_STATE_DEBOUNCE);
    }
  }

  function persistStateSnapshot(data) {
    try {
      chrome.storage.sync.set(data, function () {
        if (!isExtensionContextValid()) {
          handleContextInvalidated();
          return;
        }
        if (hasRuntimeLastError()) {
          let errMsg = getRuntimeLastErrorMessage();
          if (isContextInvalidatedError(errMsg)) {
            handleContextInvalidated();
            return;
          }
          if (isStorageQuotaError(errMsg)) {
            finishSaveState(true);
            return;
          }
          console.warn("[InboxSort] saveState set runtime error:", errMsg);
        }
        finishSaveState(false);
      });
    } catch (setErr) {
      if (isContextInvalidatedError(setErr) || !isExtensionContextValid()) {
        handleContextInvalidated();
        return;
      }
      if (isStorageQuotaError(String(setErr && setErr.message || setErr || ""))) {
        finishSaveState(true);
        return;
      }
      console.warn("[InboxSort] saveState set error:", setErr);
      finishSaveState(false);
    }
  }

  function flushSaveState() {
    _saveStateTimer = null;
    if (!isExtensionContextValid()) { handleContextInvalidated(); return; }
    if (_saveStateInFlight) {
      _saveStatePending = true;
      return;
    }
    if (!_saveStatePending) return;

    _saveStatePending = false;
    _saveStateInFlight = true;
    // While paused, currentSort and groupEnabled intentionally hold Gmail's
    // default visual state. Persist the state that must return after resume.
    let persistedSort = isSnoozedActive() ? (snoozedSort || "newest") : currentSort;
    let persistedGroup = isSnoozedActive() ? !!snoozedGroup : groupEnabled;
    let data = { accentColor: accentColor, sortMode: persistedSort, groupEnabled: persistedGroup };

    if (perLabelEnabled) {
      // Per-label prefs need a read-modify-write pass.
      try {
        chrome.storage.sync.get({ labelPrefs: {} }, function (stored) {
          if (!isExtensionContextValid()) {
            handleContextInvalidated();
            return;
          }
          if (hasRuntimeLastError()) {
            let errMsg = getRuntimeLastErrorMessage();
            if (isContextInvalidatedError(errMsg)) {
              handleContextInvalidated();
              return;
            }
            if (isStorageQuotaError(errMsg)) {
              finishSaveState(true);
              return;
            }
            console.warn("[InboxSort] saveState get runtime error:", errMsg);
            finishSaveState(false);
            return;
          }
          let prefs = stored && stored.labelPrefs && typeof stored.labelPrefs === "object" ? stored.labelPrefs : {};
          prefs[getCurrentLabel()] = persistedSort;
          data.labelPrefs = prefs;
          persistStateSnapshot(data);
        });
      } catch (getErr) {
        if (isContextInvalidatedError(getErr) || !isExtensionContextValid()) {
          handleContextInvalidated();
          return;
        }
        if (isStorageQuotaError(String(getErr && getErr.message || getErr || ""))) {
          finishSaveState(true);
          return;
        }
        console.warn("[InboxSort] saveState get error:", getErr);
        finishSaveState(false);
      }
      return;
    }

    // Global: save sortMode + accentColor + groupEnabled
    persistStateSnapshot(data);
  }

  function saveState() {
    if (!isExtensionContextValid()) { handleContextInvalidated(); return; }
    _saveStatePending = true;
    scheduleSaveState(CONFIG.SAVE_STATE_DEBOUNCE);
  }

  function persistSnoozeState(value) {
    if (!isExtensionContextValid() || !chrome.storage || !chrome.storage.local) return;
    try {
      chrome.storage.local.set({ snoozeState: value || null }, function () {
        if (!isExtensionContextValid()) handleContextInvalidated();
      });
    } catch (e) {
      if (isContextInvalidatedError(e)) handleContextInvalidated();
    }
  }

  function restorePersistedSnooze(callback) {
    if (!chrome.storage || !chrome.storage.local) {
      callback();
      return;
    }
    try {
      chrome.storage.local.get({ snoozeState: null }, function (localData) {
        if (hasRuntimeLastError() || !isExtensionContextValid()) {
          if (!isExtensionContextValid()) handleContextInvalidated();
          callback();
          return;
        }
        let state = localData && localData.snoozeState;
        let endTime = state && Number(state.endTime);
        if (!state || !isFinite(endTime) || endTime <= Date.now()) {
          if (state) persistSnoozeState(null);
          callback();
          return;
        }
        snoozedSort = normalizeSortMode(state.sortMode || currentSort);
        snoozedGroup = !!state.groupEnabled;
        snoozeEndTime = endTime;
        currentSort = "newest";
        groupEnabled = false;
        startSnoozeTimers(endTime - Date.now());
        callback();
      });
    } catch (e) {
      if (isContextInvalidatedError(e)) handleContextInvalidated();
      callback();
    }
  }

  function loadState(callback) {
    if (!isExtensionContextValid()) { handleContextInvalidated(); callback(); return; }
    try {
      chrome.storage.sync.get({
        sortMode: "newest",
        groupEnabled: false,
        accentColor: "blue",
        autoSort: true,
        perLabel: false,
        labelPrefs: {},
        hiddenTabs: {}
      }, function (data) {
        if (hasRuntimeLastError() || !isExtensionContextValid()) {
          handleContextInvalidated();
          callback();
          return;
        }
        accentColor = data.accentColor || "blue";
        autoSortEnabled = data.autoSort !== false;
        perLabelEnabled = !!data.perLabel;
        hiddenTabs = normalizeHiddenTabs(data.hiddenTabs);
        groupEnabled = !!data.groupEnabled;
        let loadedSort = "newest";
        if (perLabelEnabled && data.labelPrefs && data.labelPrefs[getCurrentLabel()]) {
          loadedSort = data.labelPrefs[getCurrentLabel()];
        } else {
          loadedSort = data.sortMode || "newest";
        }
        // Migrate old groupSender sort mode to new group toggle
        if (loadedSort === "groupSender") {
          loadedSort = "newest";
          groupEnabled = true;
        }
        currentSort = normalizeSortMode(loadedSort);
        restorePersistedSnooze(callback);
      });
    } catch (e) {
      if (isContextInvalidatedError(e) || !isExtensionContextValid()) {
        handleContextInvalidated();
      } else {
        console.warn("[InboxSort] loadState error:", e);
      }
      callback();
    }
  }

  chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (_contextInvalid) return;

    // Pause state is stored locally, so mirror it across every open Gmail tab.
    // The tab that originated the change already has matching state and exits
    // through the equality guards below.
    if (areaName === "local") {
      if (!changes.snoozeState) return;
      let nextSnooze = changes.snoozeState.newValue;
      let nextEnd = nextSnooze && Number(nextSnooze.endTime);
      if (nextSnooze && isFinite(nextEnd) && nextEnd > Date.now()) {
        if (snoozeEndTime === nextEnd && snoozedSort !== null) return;
        snoozedSort = normalizeSortMode(nextSnooze.sortMode || currentSort);
        snoozedGroup = !!nextSnooze.groupEnabled;
        snoozeEndTime = nextEnd;
        clearSortTransforms();
        currentSort = "newest";
        groupEnabled = false;
        startSnoozeTimers(nextEnd - Date.now());
        refreshUI();
        updateStats();
        return;
      }

      if (snoozedSort !== null || snoozedGroup || snoozeEndTime || snoozeTimer || snoozeTickTimer) {
        let restoreSort = snoozedSort || "newest";
        let restoreGroup = !!snoozedGroup;
        if (snoozeTimer) { clearTimeout(snoozeTimer); snoozeTimer = null; }
        if (snoozeTickTimer) { clearInterval(snoozeTickTimer); snoozeTickTimer = null; }
        snoozedSort = null;
        snoozedGroup = false;
        snoozeEndTime = 0;
        groupEnabled = restoreGroup;
        applySort(restoreSort, true);
      }
      return;
    }

    if (areaName !== "sync") return;
    let sortStateChanged = false;
    if (changes.accentColor) {
      accentColor = changes.accentColor.newValue;
      applyAccentColor();
    }
    if (changes.autoSort) {
      autoSortEnabled = changes.autoSort.newValue !== false;
    }
    if (changes.perLabel) {
      perLabelEnabled = !!changes.perLabel.newValue;
    }
    if (changes.hiddenTabs) {
      hiddenTabs = normalizeHiddenTabs(changes.hiddenTabs.newValue);
      applyHiddenTabs();
    }

    // Sync sort and grouping changes across open Gmail tabs. The originating
    // tab already holds these values, so the equality checks prevent loops.
    if (changes.groupEnabled && typeof changes.groupEnabled.newValue === "boolean" && isSnoozedActive()) {
      snoozedGroup = changes.groupEnabled.newValue;
    } else if (changes.groupEnabled && typeof changes.groupEnabled.newValue === "boolean") {
      let nextGroup = changes.groupEnabled.newValue;
      if (nextGroup !== groupEnabled) {
        groupEnabled = nextGroup;
        sortStateChanged = true;
      }
    }

    if (!perLabelEnabled && changes.sortMode && isSnoozedActive()) {
      snoozedSort = normalizeSortMode(changes.sortMode.newValue);
    } else if (!perLabelEnabled && changes.sortMode) {
      let nextSort = normalizeSortMode(changes.sortMode.newValue);
      if (nextSort !== currentSort) {
        currentSort = nextSort;
        sortStateChanged = true;
      }
    } else if (perLabelEnabled && changes.labelPrefs) {
      let nextPrefs = changes.labelPrefs.newValue;
      let labelMode = nextPrefs && nextPrefs[getCurrentLabel()];
      if (labelMode && isSnoozedActive()) {
        snoozedSort = normalizeSortMode(labelMode);
      } else if (labelMode) {
        let nextLabelSort = normalizeSortMode(labelMode);
        if (nextLabelSort !== currentSort) {
          currentSort = nextLabelSort;
          sortStateChanged = true;
        }
      }
    }

    if (changes.perLabel) {
      loadState(function () {
        if (container && isListView() && !isExcludedLabel() && !isSnoozedActive()) {
          applySort(currentSort, true);
        } else {
          refreshUI();
        }
      });
    } else if (sortStateChanged && container && isListView() && !isExcludedLabel() && !isSnoozedActive()) {
      applySort(currentSort, true);
    }
  });

  function refreshHiddenTabsFromStorage(callback) {
    if (!isExtensionContextValid()) {
      handleContextInvalidated();
      if (callback) callback();
      return;
    }
    try {
      chrome.storage.sync.get({ hiddenTabs: {} }, function (data) {
        if (hasRuntimeLastError() || !isExtensionContextValid()) {
          handleContextInvalidated();
          if (callback) callback();
          return;
        }
        hiddenTabs = normalizeHiddenTabs(data.hiddenTabs);
        if (callback) callback();
      });
    } catch (e) {
      if (isContextInvalidatedError(e) || !isExtensionContextValid()) {
        handleContextInvalidated();
      } else {
        console.warn("[InboxSort] refreshHiddenTabsFromStorage error:", e);
      }
      if (callback) callback();
    }
  }

  // ── Dark-mode detection ───────────────────────────────────────────

  let _darkModeDetectedAt = 0;

  function detectDarkMode() {
    // PERF: Cache detection result for 2s to avoid forced style recalc on every call
    let now = Date.now();
    if (_darkModeDetectedAt && (now - _darkModeDetectedAt) < 2000) return;
    _darkModeDetectedAt = now;

    let detected = false;

    // Strategy 1: Check body background color (catches some dark themes / system dark mode)
    let bg = window.getComputedStyle(document.body).backgroundColor;
    if (bg) {
      let match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        detected = ((parseInt(match[1]) + parseInt(match[2]) + parseInt(match[3])) / 3) < 100;
      }
    }

    // Strategy 2: Gmail dark themes keep body bg light but flip text to white.
    // Check sender / subject text color — if average RGB > 180, text is light → dark mode.
    if (!detected) {
      let textEl = document.querySelector(".zF, .yP, .bog, .bqe");
      if (textEl) {
        let tc = window.getComputedStyle(textEl).color;
        let m = tc && tc.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (m) {
          detected = ((parseInt(m[1]) + parseInt(m[2]) + parseInt(m[3])) / 3) > 180;
        }
      }
    }

    // Strategy 3: Fall back to prefers-color-scheme media query
    if (!detected && !document.querySelector(".zF, .yP, .bog, .bqe")) {
      detected = !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }

    isDarkMode = detected;
    // Propagate dark mode class to <html> so group-by-sender rows (which are
    // NOT descendants of .gmail-sort-dark container) can be styled properly.
    document.documentElement.classList.toggle("gmail-sort-dark-mode", isDarkMode);
  }

  // Re-detect dark mode on system theme change
  if (window.matchMedia) {
    try {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
        detectDarkMode();
        if (container) container.classList.toggle("gmail-sort-dark", isDarkMode);
        if (statsBar) statsBar.classList.toggle("gmail-sort-dark", isDarkMode);
        applyAccentColor();
        // Re-apply group styles with correct dark/light colors
        if (groupEnabled && _currentGroupData) {
          clearGroupInlineStyles();
          applyGroupVisuals(_currentGroupData.sortedRows, {
            ac: isDarkMode
              ? (DARK_ACCENT_COLORS[accentColor] || DARK_ACCENT_COLORS.blue)
              : (ACCENT_COLORS[accentColor] || ACCENT_COLORS.blue),
            perRow: _currentGroupData.perRow
          });
        }
      });
    } catch (_) { /* older browsers */ }
  }

  // ── Accent colour application ─────────────────────────────────────

  function applyAccentColor() {
    let c = ACCENT_COLORS[accentColor] || ACCENT_COLORS.blue;
    let dc = DARK_ACCENT_COLORS[accentColor] || DARK_ACCENT_COLORS.blue;
    let use = isDarkMode ? dc : c;
    let root = document.documentElement.style;
    root.setProperty("--sort-accent", use.primary);
    root.setProperty("--sort-accent-hover", use.hover);
    root.setProperty("--sort-accent-light", use.light || c.light);
    root.setProperty("--sort-accent-ink", isDarkMode ? use.primary : c.ink);
  }

  // ── Date parsing ──────────────────────────────────────────────────

  function parseGmailDate(text) {
    if (!text) return null;
    let cleaned = text.replace(/\u200e/g, "").trim();
    let d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d;

    let monthDay = cleaned.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})$/i);
    if (monthDay) {
      let year = new Date().getFullYear();
      d = new Date(monthDay[1] + " " + monthDay[2] + ", " + year);
      // If parsed date is in the future, it's likely from last year
      if (!isNaN(d.getTime()) && d > new Date()) {
        d = new Date(monthDay[1] + " " + monthDay[2] + ", " + (year - 1));
      }
      if (!isNaN(d.getTime())) return d;
    }

    let timeOnly = cleaned.match(/^\d{1,2}:\d{2}\s*(AM|PM)$/i);
    if (timeOnly) {
      d = new Date(new Date().toDateString() + " " + cleaned);
      if (!isNaN(d.getTime())) return d;
    }

    let time24 = cleaned.match(/^(\d{1,2}):(\d{2})$/);
    if (time24) {
      let hours = parseInt(time24[1], 10);
      let minutes = parseInt(time24[2], 10);
      if (hours <= 23 && minutes <= 59) {
        d = new Date();
        d.setHours(hours, minutes, 0, 0);
        return d;
      }
    }
    return null;
  }

  // ── Row-data extractors ───────────────────────────────────────────

  function getDateFromRow(row) {
    let spans = row.querySelectorAll("td span[title]");
    for (let i = 0; i < spans.length; i++) {
      let d = parseGmailDate(spans[i].getAttribute("title"));
      if (d) return d;
    }
    return null;
  }

  function getSenderFromRow(row) {
    // Gmail uses .bA4 for the complete visible sender or participant label.
    // Its nested .zF and .yP elements can represent only one participant.
    let el = row.querySelector("span.bA4") ||
             row.querySelector("span.zF") ||
             row.querySelector("span.yP") ||
             row.querySelector("[data-hovercard-id]");
    if (!el) return "";
    let sender = (el.getAttribute("name") || el.textContent || el.getAttribute("data-hovercard-id") || "").trim();
    return sender.toLocaleLowerCase();
  }

  function isUnread(row) {
    return !!(row && row.classList && row.classList.contains("zE"));
  }

  // ── Starred-row detection ─────────────────────────────────────────

  function isRowStarred(row) {
    try {
      // Fast-path: the standard Gmail starred class
      if (row.querySelector("td.apU span.T-KT-Jp")) return true;

      // PERF: Single query for the star cell, then walk its subtree once
      let starCell = row.querySelector("td.apU");
      if (!starCell) return false;

      // Check for T-KT subclasses (indicates active star state)
      let starSpans = starCell.getElementsByClassName("T-KT");
      for (let k = 0; k < starSpans.length; k++) {
        let cl = starSpans[k].classList;
        for (let m = 0; m < cl.length; m++) {
          if (cl[m] !== "T-KT" && cl[m].indexOf("T-KT-") === 0) return true;
        }
      }

      // Check aria-label / title on elements within the star cell
      // Supports English ("starred"/"not starred") and uses data attribute
      // as a locale-agnostic fallback for non-English Gmail
      let allEls = starCell.querySelectorAll("[aria-label], [title], [data-tooltip]");
      for (let i = 0; i < allEls.length; i++) {
        let lbl = (allEls[i].getAttribute("aria-label") || allEls[i].getAttribute("title") || allEls[i].getAttribute("data-tooltip") || "").toLowerCase();
        if (lbl === "starred") return true;
        if (lbl.indexOf("starred") !== -1 && lbl.indexOf("not") === -1) return true;
      }

      // Locale-agnostic fallback: check if the star cell's img/icon has a
      // "checked" or "active" state via ARIA or class naming conventions
      let ariaChecked = starCell.querySelector("[aria-checked='true'], [data-starred='true']");
      if (ariaChecked) return true;

      // Check SVG fills (some themes use SVG stars)
      let svgs = starCell.getElementsByTagName("svg");
      for (let n = 0; n < svgs.length; n++) {
        let paths = svgs[n].querySelectorAll("path, polygon");
        for (let p = 0; p < paths.length; p++) {
          let fill = paths[p].getAttribute("fill");
          if (fill && fill !== "none" && fill !== "transparent" && fill !== "currentColor") return true;
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // ── Attachment-row detection ──────────────────────────────────────

  function isRowHasAttachment(row) {
    try {
      // PERF: Cheapest class-based checks first (most common Gmail versions)
      if (row.querySelector("span.brg, div.brd, span.aZo, span.boo, img.br2")) return true;
      if (row.querySelector("td.yf img.yE")) return true;

      // Narrower attribute checks only if class checks failed
      let tooltipEls = row.querySelectorAll("[data-tooltip]");
      for (let j = 0; j < tooltipEls.length; j++) {
        if ((tooltipEls[j].getAttribute("data-tooltip") || "").toLowerCase().indexOf("attachment") !== -1) return true;
      }

      // Fallback: scoped alt check (cheaper than broad [aria-label],[title])
      if (row.querySelector('img[alt="Has attachment"]')) return true;
      return false;
    } catch (e) {
      return false;
    }
  }

  // ── Visible email rows (cached for perf) ──────────────────────────

  let _rowCache = null;
  let _rowCacheTime = 0;

  function getVisibleEmailRows(forceRefresh) {
    let now = Date.now();
    if (!forceRefresh && _rowCache && (now - _rowCacheTime) < CONFIG.ROW_CACHE_TTL) return _rowCache;

    let allRows = document.querySelectorAll("tr.zA");
    let result = [];
    for (let i = 0; i < allRows.length; i++) {
      let row = allRows[i];
      if (row.offsetHeight === 0) continue;
      let table = row.closest("table");
      if (table && table.offsetHeight === 0) continue;
      result.push(row);
    }
    _rowCache = result;
    _rowCacheTime = now;
    return result;
  }

  // PERF: Light invalidation — clear row array cache but KEEP metadata (WeakMap).
  // Row metadata (sender, date, starred, etc.) is still valid on re-sort.
  function invalidateRowCache() {
    _rowCache = null;
    _rowCacheTime = 0;
    _lastStatsKey = "";
  }

  // Full invalidation — also clears metadata and td cache.
  // Use only on navigation when rows are actually replaced.
  function fullInvalidateRowCache() {
    _rowCache = null;
    _rowCacheTime = 0;
    _rowMeta = new WeakMap();
    _rowTds = new WeakMap();
    _lastStatsKey = "";
    _lastSortedRowCount = 0;
    _lastSortedRowElements = null;
  }

  // ── Cached <td> query per row (avoids querySelectorAll("td") in hot loops) ─

  let _rowTds = new WeakMap();

  function getRowTds(row) {
    let cached = _rowTds.get(row);
    if (cached) return cached;
    let tds = row.querySelectorAll("td");
    _rowTds.set(row, tds);
    return tds;
  }

  // ── Row metadata cache (avoids repeated expensive DOM queries) ────

  let _rowMeta = new WeakMap();

  function getRowMeta(row, forceRefresh) {
    if (forceRefresh === undefined) forceRefresh = false;
    let now = Date.now();
    let cached = _rowMeta.get(row);
    if (!forceRefresh && cached && (now - cached.ts) < CONFIG.ROW_META_TTL) return cached.value;
    let meta = {
      sender: getSenderFromRow(row),
      date: getDateFromRow(row),
      unread: isUnread(row),
      starred: isRowStarred(row),
      attachment: isRowHasAttachment(row)
    };
    _rowMeta.set(row, { value: meta, ts: now });
    return meta;
  }

  // ── Sort comparators ──────────────────────────────────────────────
  // O(1) lookup table mapping sort-mode IDs to comparator functions.
  // Each comparator returns a standard <0 / 0 / >0 sort value.
  // Rows with missing dates are pushed to the bottom of the list.

  const SORT_MODE_MAP = {
    oldest: function (a, b) {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.getTime() - b.date.getTime();
    },
    newest: function (a, b) {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.getTime() - a.date.getTime();
    },
    senderAZ: function (a, b) {
      if (!a.sender && !b.sender) return 0;
      if (!a.sender) return 1;
      if (!b.sender) return -1;
      return a.sender.localeCompare(b.sender);
    },
    senderZA: function (a, b) {
      if (!a.sender && !b.sender) return 0;
      if (!a.sender) return 1;
      if (!b.sender) return -1;
      return b.sender.localeCompare(a.sender);
    },
    unreadFirst: function (a, b) {
      if (a.unread !== b.unread) return a.unread ? -1 : 1;
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.getTime() - a.date.getTime();
    },
    starredFirst: function (a, b) {
      if (a.starred !== b.starred) return a.starred ? -1 : 1;
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.getTime() - a.date.getTime();
    }
  };

  function getComparator(mode) {
    return SORT_MODE_MAP[mode] || function () { return 0; };
  }

  // Wraps any comparator with a group-by-sender primary sort.
  // Within each sender group, the inner comparator determines order.
  // reverseGroups: when true, groups are sorted Z→A (used for senderZA mode).
  function wrapWithGroupSort(innerComparator, reverseGroups) {
    return function (a, b) {
      if (!a.sender && !b.sender) return innerComparator(a, b);
      if (!a.sender) return 1;
      if (!b.sender) return -1;
      let cmp = a.sender.localeCompare(b.sender);
      if (reverseGroups) cmp = -cmp;
      if (cmp !== 0) return cmp;
      return innerComparator(a, b);
    };
  }

  // ── CSS-transform sorting ─────────────────────────────────────────

  function applySortTransforms(mode, animate, skipClear) {
    if (_sortInProgress) return 0;
    _sortInProgress = true;
    try {
    if (animate === undefined) animate = true;
    _lastResizeWidth = window.innerWidth; // Record width for resize detection
    let rows = getVisibleEmailRows(true);
    if (rows.length === 0) { return 0; }

    // PERF: Read geometry FIRST before any style mutations to avoid layout thrashing.
    // Use offsetTop/offsetHeight instead of getBoundingClientRect() because:
    // 1. offsetTop is relative to the offset parent (table/tbody), not the viewport
    // 2. This makes positions stable regardless of scroll position
    // 3. Gmail's lazy rendering at narrow viewports can cause getBoundingClientRect
    //    to return incorrect viewport-relative positions before all rows are painted
    let items = new Array(rows.length);
    for (let r = 0; r < rows.length; r++) {
      let meta = getRowMeta(rows[r]);
      items[r] = {
        row: rows[r],
        date: meta.date,
        sender: meta.sender,
        unread: meta.unread,
        starred: meta.starred,
        origIndex: r,
        origTop: rows[r].offsetTop,
        height: rows[r].offsetHeight
      };
    }

    // Clear old group markers and inline styles (writes only, after all reads)
    if (!skipClear) {
      for (let c = 0; c < rows.length; c++) {
        rows[c].classList.remove("gmail-sort-group-start", "gmail-sort-group-even", "gmail-sort-group-first");
        rows[c].removeAttribute("data-sort-group");
        rows[c].style.removeProperty("box-shadow");
        rows[c].style.removeProperty("background-color");
        let ctds = getRowTds(rows[c]);
        for (let ct = 0; ct < ctds.length; ct++) {
          ctds[ct].style.removeProperty("background");
          ctds[ct].style.removeProperty("background-color");
        }
      }
    }

    // Build comparator: wrap with group sort if groupEnabled
    let comparator = getComparator(mode);
    if (groupEnabled) {
      comparator = wrapWithGroupSort(comparator, mode === "senderZA");
    }
    let sorted = items.slice().sort(comparator);

    // Compute base transforms using cumulative positioning.
    // The old formula (items[i].origTop - sorted[i].origTop) assumed all rows
    // have identical height. When row heights differ (Gmail snippets, labels,
    // density), it creates gaps between rows. Instead, stack each sorted row
    // directly after the previous one based on actual heights.
    let transforms = new Array(sorted.length);
    let targetTop = items[0].origTop; // Start at the top of the first DOM row
    for (let i = 0; i < sorted.length; i++) {
      transforms[i] = targetTop - sorted[i].origTop;
      targetTop += sorted[i].height; // Next position based on THIS row's actual height
    }

    // Group visuals: compute group metadata when groupEnabled
    let groupData = null;
    if (groupEnabled) {
      let ac = isDarkMode
        ? (DARK_ACCENT_COLORS[accentColor] || DARK_ACCENT_COLORS.blue)
        : (ACCENT_COLORS[accentColor] || ACCENT_COLORS.blue);

      // Count emails per sender for badge numbers
      let senderCounts = {};
      for (let sc = 0; sc < sorted.length; sc++) {
        let sk = sorted[sc].sender || "";
        senderCounts[sk] = (senderCounts[sk] || 0) + 1;
      }

      // Compute per-row group info
      let prevSender = "";
      let groupIndex = -1;
      let isFirstGroup = true;
      let perRow = new Array(sorted.length);
      for (let g = 0; g < sorted.length; g++) {
        let senderKey = sorted[g].sender || "";
        if (senderKey !== prevSender) {
          groupIndex++;
          perRow[g] = {
            isEven: (groupIndex % 2 === 1),
            isGroupStart: true,
            isVeryFirst: isFirstGroup,
            badgeNum: senderCounts[senderKey] || 1,
            senderKey: senderKey
          };
          isFirstGroup = false;
        } else {
          perRow[g] = {
            isEven: (groupIndex % 2 === 1),
            isGroupStart: false,
            isVeryFirst: false,
            badgeNum: 0,
            senderKey: senderKey
          };
        }
        prevSender = senderKey;
      }
      groupData = { ac: ac, perRow: perRow, totalGroups: groupIndex + 1 };

      // Save for interval-based re-application
      _currentGroupData = {
        sortedRows: sorted.map(function (s) { return s.row; }),
        perRow: perRow,
        ac: ac
      };
    }

    // Apply group styling and transforms SYNCHRONOUSLY.
    // Previous approach deferred to rAF, which could fail if Gmail's
    // MutationObserver replaced row elements between schedule and callback.
    // Since reading offsetTop/offsetHeight above already forced a reflow
    // (committing the cleared state), we can safely set transitions +
    // transforms here and the browser will animate from the committed
    // "cleared" positions.
    try {
      if (groupData) {
        applyGroupVisuals(sorted, groupData);
      }
    } catch (groupErr) {
      console.warn("[InboxSort] Group styling error:", groupErr);
    }

    for (let j = 0; j < sorted.length; j++) {
      let el = sorted[j].row;
      el.style.zIndex = "1";
      el.style.willChange = "transform";
      if (animate) {
        el.style.transition = "transform " + CONFIG.SORT_TRANSITION_DURATION + " cubic-bezier(0.25, 0.1, 0.25, 1)";
        el.style.transitionDelay = Math.min(j * CONFIG.SORT_DELAY_INCREMENT, CONFIG.SORT_DELAY_MAX) + "ms";
      } else {
        el.style.transition = "none";
        el.style.transitionDelay = "0ms";
      }
      el.style.transform = "translateY(" + transforms[j] + "px)";
    }

    _lastSortedRowCount = rows.length;
    _lastSortedRowElements = rows.slice(0, 3); // Store first few for identity-change detection
    return rows.length;
    } finally { _sortInProgress = false; }
  }

  // ── Group badge helpers ──────────────────────────────────────────

  function injectGroupBadge(row, count) {
    if (count <= 1) return;
    let senderEl = row.querySelector("span.zF") || row.querySelector("span.bA4");
    if (!senderEl || !senderEl.parentNode) return;
    // Prevent duplicate badges (can happen if reapplyGroupStyles fires while badges exist)
    if (senderEl.parentNode.querySelector(".gmail-sort-group-badge")) return;
    let badge = document.createElement("span");
    badge.className = "gmail-sort-group-badge";
    if (isDarkMode) badge.classList.add("gmail-sort-group-badge-dark");
    badge.textContent = count;
    badge.title = count + " emails from this sender";
    senderEl.parentNode.insertBefore(badge, senderEl.nextSibling);
  }

  function clearGroupBadges() {
    let badges = document.querySelectorAll(".gmail-sort-group-badge");
    for (let b = 0; b < badges.length; b++) badges[b].remove();
  }

  // ── Unified group visual applicator ──────────────────────────────
  // Applies CSS classes, inline styles, and badges to sorted rows.
  // Used by rAF, microtask, and interval-based re-applications.

  function applyGroupVisuals(sortedArr, gData) {
    // Clear any existing badges first to prevent duplication on rapid re-application
    clearGroupBadges();

    let gac = gData.ac;
    let gpr = gData.perRow;
    let styledCount = 0;
    let badgedCount = 0;
    let skippedCount = 0;

    for (let gi = 0; gi < sortedArr.length; gi++) {
      let row = sortedArr[gi].row || sortedArr[gi];
      if (!row || !row.isConnected) { skippedCount++; continue; }
      let info = gpr[gi];
      if (!info) continue;

      // CSS classes
      if (info.isGroupStart) {
        row.classList.add("gmail-sort-group-start");
        if (info.senderKey !== undefined) row.setAttribute("data-sort-group", info.senderKey);
        if (info.isVeryFirst) row.classList.add("gmail-sort-group-first");
      }
      if (info.isEven) {
        row.classList.add("gmail-sort-group-even");
      }

      // Badges (only inject if not already present)
      if (info.isGroupStart && info.badgeNum > 1 && !row.querySelector(".gmail-sort-group-badge")) {
        injectGroupBadge(row, info.badgeNum);
        badgedCount++;
      }

      // INLINE STYLES — background tint on every <td> for even groups
      // Use BOTH background-color (longhand) AND background (shorthand)
      // because Gmail may set background-color inline on td elements.
      // Box-shadow: accent left-bar + top divider between groups
      let shadows = [];
      let oddInset = isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";
      if (info.isEven) {
        shadows.push("inset 4px 0 0 0 " + gac.primary);
        // Background tint on every <td> for even groups
        row.style.setProperty("background-color", gac.light, "important");
        let tds = getRowTds(row);
        for (let t = 0; t < tds.length; t++) {
          tds[t].style.setProperty("background-color", gac.light, "important");
          tds[t].style.setProperty("background", gac.light, "important");
        }
        styledCount++;
      } else {
        shadows.push("inset 4px 0 0 0 " + oddInset);
      }
      if (info.isGroupStart && !info.isVeryFirst) {
        shadows.push("0 -2px 0 0 " + gac.primary);
      }
      row.style.setProperty("box-shadow", shadows.join(", "), "important");
    }

  }

  function clearGroupInlineStyles() {
    let rows = document.querySelectorAll("tr.zA");
    for (let i = 0; i < rows.length; i++) {
      rows[i].style.removeProperty("box-shadow");
      rows[i].style.removeProperty("background-color");
      let tds = getRowTds(rows[i]);
      for (let t = 0; t < tds.length; t++) {
        tds[t].style.removeProperty("background");
        tds[t].style.removeProperty("background-color");
      }
    }
  }

  // Persistent re-apply using saved group data (_currentGroupData).
  // Catches Gmail DOM re-renders that wipe inline styles.
  // PERF: includes dirty-check to skip full re-apply when styles are intact.
  function reapplyGroupStyles() {
    if (!groupEnabled || !_currentGroupData) return;
    try {
      // Always use current isDarkMode state (may have changed since group was built)
      let gac = isDarkMode
        ? (DARK_ACCENT_COLORS[accentColor] || DARK_ACCENT_COLORS.blue)
        : (ACCENT_COLORS[accentColor] || ACCENT_COLORS.blue);
      let gpr = _currentGroupData.perRow;
      let rows = _currentGroupData.sortedRows;

      // PERF: Dirty-check — sample up to 3 even-group rows spread across the list.
      // If ALL sampled rows are intact, Gmail hasn't wiped our styles, so skip.
      // Spread sampling (beginning, middle, end) catches partial wipes anywhere in the list.
      let sampledCount = 0;
      let intactCount = 0;
      let dcStarts = [0, Math.floor(rows.length / 2), Math.max(0, rows.length - 5)];
      for (let si = 0; si < dcStarts.length && sampledCount < 3; si++) {
        for (let dc = dcStarts[si]; dc < rows.length && sampledCount < (si + 1); dc++) {
          if (gpr[dc] && gpr[dc].isEven && rows[dc] && rows[dc].isConnected) {
            sampledCount++;
            let curShadow = rows[dc].style.getPropertyValue("box-shadow");
            if (curShadow && curShadow.indexOf(gac.primary) !== -1) intactCount++;
            break;
          }
        }
      }
      if (sampledCount > 0 && intactCount === sampledCount) return; // all sampled intact

      let oddInset = isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";
      for (let i = 0; i < rows.length; i++) {
        let row = rows[i];
        if (!row || !row.isConnected) continue;
        let info = gpr[i];
        if (!info) continue;

        // Re-add CSS classes (Gmail may strip them)
        if (info.isGroupStart) {
          row.classList.add("gmail-sort-group-start");
          if (info.isVeryFirst) row.classList.add("gmail-sort-group-first");
        }
        if (info.isEven) row.classList.add("gmail-sort-group-even");

        // Re-apply box-shadow + background in one pass
        let shadows = [];
        if (info.isEven) {
          shadows.push("inset 4px 0 0 0 " + gac.primary);
          row.style.setProperty("background-color", gac.light, "important");
          let tds = getRowTds(row);
          for (let t = 0; t < tds.length; t++) {
            tds[t].style.setProperty("background-color", gac.light, "important");
            tds[t].style.setProperty("background", gac.light, "important");
          }
        } else {
          shadows.push("inset 4px 0 0 0 " + oddInset);
        }
        if (info.isGroupStart && !info.isVeryFirst) {
          shadows.push("0 -2px 0 0 " + gac.primary);
        }
        row.style.setProperty("box-shadow", shadows.join(", "), "important");
      }
    } catch (e) {
      console.warn("[InboxSort] reapplyGroupStyles error:", e);
    }
  }

  // PERF: Start with aggressive interval (400ms) for the first 10s when Gmail is
  // most likely to wipe styles, then slow down to 2s for maintenance.
  // Auto-stop after 2 minutes to prevent indefinite battery drain.
  let _groupStyleTick = 0;

  function startGroupStyleInterval() {
    stopGroupStyleInterval();
    _groupStyleTick = 0;
    _scheduleGroupStyleTick();
  }

  // Single-timer approach: avoids nested setInterval leak where the inner
  // slow-phase interval could orphan if stopGroupStyleInterval races with
  // the fast→slow transition. Uses setTimeout chaining with adaptive delay.
  function _scheduleGroupStyleTick() {
    var delay = _groupStyleTick < CONFIG.GROUP_FAST_TICKS
      ? CONFIG.GROUP_FAST_INTERVAL
      : CONFIG.GROUP_SLOW_INTERVAL;
    _groupStyleInterval = setTimeout(function () {
      _groupStyleTick++;
      if (!groupEnabled || _groupStyleTick >= CONFIG.GROUP_MAX_TICKS) {
        stopGroupStyleInterval();
        return;
      }
      _suppressObserver = true;
      try { reapplyGroupStyles(); } finally { queueMicrotask(function () { _suppressObserver = false; }); }
      _scheduleGroupStyleTick();
    }, delay);
  }

  function stopGroupStyleInterval() {
    if (_groupStyleInterval) {
      clearTimeout(_groupStyleInterval);
      _groupStyleInterval = null;
    }
    _groupStyleTick = 0;
  }

  function clearSortTransforms() {
    stopGroupStyleInterval();
    _currentGroupData = null;
    let wasSuppressed = _suppressObserver;
    _suppressObserver = true;
    try {
      clearGroupBadges();
      clearGroupInlineStyles();
      let rows = document.querySelectorAll("tr.zA");
      for (let i = 0; i < rows.length; i++) {
        let s = rows[i].style;
        // Clear transition BEFORE transform to prevent animation during reset
        s.transition = "none";
        s.transitionDelay = "0ms";
        s.transform = "";
        s.zIndex = "";
        s.willChange = "";
        rows[i].classList.remove("gmail-sort-group-start", "gmail-sort-group-even", "gmail-sort-group-first");
        rows[i].removeAttribute("data-sort-group");
      }
      invalidateRowCache();
      _lastSortedRowCount = 0;
      _lastSortedRowElements = null;
      // Force synchronous reflow so subsequent geometry reads
      // (offsetTop, offsetHeight) reflect the cleared transforms.
      void document.documentElement.offsetHeight;
    } finally {
      _suppressObserver = wasSuppressed;
    }
  }

  // ── Search & filter ───────────────────────────────────────────────

  function applyAllFilters() {
    let rows = getVisibleEmailRows(false);
    let matchCount = 0;
    let totalCount = 0;
    let q = searchQuery ? searchQuery.toLowerCase() : "";
    let anyFilter = !!(q || filterStarred || filterAttachment || filterUnread);

    for (let i = 0; i < rows.length; i++) {
      let row = rows[i];
      try {
        if (!row || !row.classList) continue;
        totalCount++;

        let pass = true;

        let meta = getRowMeta(row, true);
        if (q && pass) {
          let subjectEl = row.querySelector("span.bog, span.bqe");
          let subject = subjectEl ? subjectEl.textContent.toLowerCase() : "";
          let snippetEl = row.querySelector("span.y2");
          let snippet = snippetEl ? snippetEl.textContent.toLowerCase() : "";
          pass = (meta.sender.indexOf(q) !== -1 || subject.indexOf(q) !== -1 || snippet.indexOf(q) !== -1);
        }
        if (filterStarred && pass) pass = meta.starred;
        if (filterAttachment && pass) pass = meta.attachment;
        if (filterUnread && pass) pass = meta.unread;

        if (pass) {
          row.classList.remove("gmail-sort-dim");
          matchCount++;
        } else {
          row.classList.add("gmail-sort-dim");
        }
      } catch (rowErr) {
        console.warn("[InboxSort] applyAllFilters row error:", rowErr);
      }
    }

    // Update match-count display
    try {
      let countEl = container && container.querySelector(".gmail-sort-search-count");
      if (countEl) countEl.textContent = anyFilter ? (matchCount + "/" + totalCount) : "";
    } catch (_) { /* non-critical */ }

    // Sync stats bar highlights
    updateStatsHighlight();
  }

  function clearFilters() {
    searchQuery = "";
    filterStarred = false;
    filterAttachment = false;
    filterUnread = false;

    let rows = getVisibleEmailRows(false);
    for (let i = 0; i < rows.length; i++) {
      rows[i].classList.remove("gmail-sort-dim");
      rows[i].style.display = "";
    }

    if (container) {
      let input = container.querySelector(".gmail-sort-search-input");
      if (input) input.value = "";
      let countEl = container.querySelector(".gmail-sort-search-count");
      if (countEl) countEl.textContent = "";
    }
    updateStatsHighlight();
  }

  // ── Stats bar ─────────────────────────────────────────────────────

  function createStatsBar() {
    statsBar = document.createElement("div");
    statsBar.className = "gmail-sort-stats";
    statsBar.setAttribute("role", "group");
    statsBar.setAttribute("aria-label", "Inbox message counts and quick filters");
    if (isDarkMode) statsBar.classList.add("gmail-sort-dark");
    return statsBar;
  }

  function updateStats() {
    if (!statsBar || !statsBar.isConnected) return;

    let rows = getVisibleEmailRows(false);
    let total = rows.length;
    let unreadCount = 0, starredCount = 0, attachCount = 0;

    for (let i = 0; i < total; i++) {
      let meta = getRowMeta(rows[i], true);
      if (meta.unread) unreadCount++;
      if (meta.starred) starredCount++;
      if (meta.attachment) attachCount++;
    }

    // Count visible selected (needed for delta key & button text)
    let anyFilter = !!(searchQuery || filterStarred || filterAttachment || filterUnread);
    let visCount = 0, selCount = 0;
    if (anyFilter) {
      for (let bi = 0; bi < rows.length; bi++) {
        if (rows[bi].classList.contains("gmail-sort-dim")) continue;
        visCount++;
        let bcb = rows[bi].querySelector('div[role="checkbox"]');
        if (bcb && bcb.getAttribute("aria-checked") === "true") selCount++;
      }
    }

    // Delta check — skip DOM rebuild if counts, filter state, AND selection unchanged
    let hasSnooze = isSnoozedActive();
    let snoozeMin = hasSnooze ? Math.max(1, Math.ceil((snoozeEndTime - Date.now()) / 60000)) : 0;
    let key = [total, unreadCount, starredCount, attachCount,
               filterUnread ? 1 : 0, filterStarred ? 1 : 0, filterAttachment ? 1 : 0,
               snoozeMin, visCount, selCount].join(",");
    if (_lastStatsKey === key) return;
    _lastStatsKey = key;

    // Build HTML (all trusted content, no user input)
    let parts = [];

    // Snooze indicator
    if (hasSnooze) {
      let remaining = Math.max(1, Math.ceil((snoozeEndTime - Date.now()) / 60000));
      parts.push('<span class="gmail-sort-snooze-badge">\u23F8 ' + remaining + 'm</span>');
    }

    parts.push(
      '<span class="gmail-sort-stat" data-stat="total">' +
      '<span class="gmail-sort-stat-num">' + total + '</span> email' + (total !== 1 ? 's' : '') + '</span>'
    );
    parts.push(
      '<button type="button" class="gmail-sort-stat gmail-sort-stat-clickable' +
      (filterUnread ? ' gmail-sort-stat-active' : '') +
      '" data-stat="unread" aria-pressed="' + (filterUnread ? 'true' : 'false') + '" title="Toggle unread filter">' +
      '<span class="gmail-sort-stat-icon">' + ICONS.unreadFirst + '</span>' +
      '<span class="gmail-sort-stat-num">' + unreadCount + '</span> unread</button>'
    );
    parts.push(
      '<button type="button" class="gmail-sort-stat gmail-sort-stat-clickable' +
      (filterStarred ? ' gmail-sort-stat-active' : '') +
      '" data-stat="starred" aria-pressed="' + (filterStarred ? 'true' : 'false') + '" title="Toggle starred filter">' +
      '<span class="gmail-sort-stat-icon">' + ICONS.starred + '</span>' +
      '<span class="gmail-sort-stat-num">' + starredCount + '</span> starred</button>'
    );
    parts.push(
      '<button type="button" class="gmail-sort-stat gmail-sort-stat-clickable' +
      (filterAttachment ? ' gmail-sort-stat-active' : '') +
      '" data-stat="attachment" aria-pressed="' + (filterAttachment ? 'true' : 'false') + '" title="Toggle attachment filter">' +
      '<span class="gmail-sort-stat-icon">' + ICONS.attachment + '</span>' +
      '<span class="gmail-sort-stat-num">' + attachCount + '</span> attachment' + (attachCount !== 1 ? 's' : '') + '</button>'
    );

    // Build stats HTML — join stat items with dot separators
    let html = parts.join('<span class="gmail-sort-stat-sep">\u00b7</span>');

    // Bulk-select button when any filter is active (appended without dot separator)
    if (anyFilter) {
      let allSelected = visCount > 0 && selCount === visCount;
      html +=
        '<button type="button" class="gmail-sort-bulk-select' + (allSelected ? ' gmail-sort-bulk-deselect' : '') +
        '" data-action="bulk-select" title="' + (allSelected ? 'Deselect all visible emails' : 'Select all visible emails') + '">' +
        ICONS.selectAll + (allSelected ? ' Deselect all' : ' Select visible') + '</button>';
    }

    statsBar.innerHTML = html;
  }

  function updateStatsHighlight() {
    if (!statsBar) return;
    let unreadEl = statsBar.querySelector('[data-stat="unread"]');
    let starredEl = statsBar.querySelector('[data-stat="starred"]');
    let attachEl = statsBar.querySelector('[data-stat="attachment"]');
    if (unreadEl) unreadEl.classList.toggle("gmail-sort-stat-active", filterUnread);
    if (starredEl) starredEl.classList.toggle("gmail-sort-stat-active", filterStarred);
    if (attachEl) attachEl.classList.toggle("gmail-sort-stat-active", filterAttachment);
    if (unreadEl) unreadEl.setAttribute("aria-pressed", filterUnread ? "true" : "false");
    if (starredEl) starredEl.setAttribute("aria-pressed", filterStarred ? "true" : "false");
    if (attachEl) attachEl.setAttribute("aria-pressed", filterAttachment ? "true" : "false");
  }

  // ── Pagination helpers ────────────────────────────────────────────

  function parsePagination() {
    let spans = document.querySelectorAll("span.Dj");
    // Prefer a VISIBLE pagination span — Gmail can leave stale invisible
    // spans from previous pages in the DOM after hash-based navigation.
    let fallback = null;
    for (let i = 0; i < spans.length; i++) {
      let m = spans[i].textContent.match(/(\d+)[–\-](\d+)\s+of\s+(\d+)/);
      if (m) {
        let result = { start: parseInt(m[1], 10), end: parseInt(m[2], 10), total: parseInt(m[3], 10) };
        let rect = spans[i].getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return result;  // visible — use it
        if (!fallback) fallback = result;                        // keep first as fallback
      }
    }
    return fallback;
  }

  function getLastPageNumber() {
    let pag = parsePagination();
    if (!pag) return 1;
    let perPage = pag.end - pag.start + 1;
    return perPage > 0 ? Math.ceil(pag.total / perPage) : 1;
  }

  function isOnLastPage() {
    let pag = parsePagination();
    return !pag || pag.end >= pag.total;
  }

  function getCurrentPaginationText() {
    let spans = document.querySelectorAll("span.Dj");
    // Prefer a VISIBLE pagination span (see parsePagination comment).
    let fallback = "";
    for (let i = 0; i < spans.length; i++) {
      if (/\d+.*of/.test(spans[i].textContent)) {
        let rect = spans[i].getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return spans[i].textContent.trim();
        if (!fallback) fallback = spans[i].textContent.trim();
      }
    }
    return fallback;
  }

  /**
   * waitForNewPage — Polls until Gmail's pagination text changes.
   *
   * Pattern: "poll-until-condition-or-timeout"
   *   1. Starts an interval that reads the pagination <span> on each tick.
   *   2. If the text differs from `oldPagText`, the page has loaded — wait
   *      PAGE_SETTLE_DELAY for Gmail to finish rendering, then call back `true`.
   *   3. If PAGINATION_TIMEOUT elapses first, call back `false`.
   *   4. The interval reference is stored in `_waitForNewPage` so it can be
   *      cleaned up on navigation or page unload (see beforeunload handler).
   *
   * @param {string}   oldPagText  The pagination text BEFORE the page change.
   * @param {function} callback    Receives `true` (loaded) or `false` (timeout).
   */
  function waitForNewPage(oldPagText, callback) {
    // Clear any previous pagination poll
    if (_waitForNewPage) { clearInterval(_waitForNewPage); _waitForNewPage = null; }

    let start = Date.now();
    _waitForNewPage = setInterval(function () {
      if (Date.now() - start > CONFIG.PAGINATION_TIMEOUT) {
        clearInterval(_waitForNewPage);
        _waitForNewPage = null;
        callback(false);
        return;
      }
      let current = getCurrentPaginationText();
      if (current && current !== oldPagText) {
        clearInterval(_waitForNewPage);
        _waitForNewPage = null;
        setTimeout(function () { callback(true); }, CONFIG.PAGE_SETTLE_DELAY);
      }
    }, CONFIG.PAGINATION_POLL);
  }

  // ── Keyboard shortcut cheat sheet overlay ─────────────────────────

  function toggleCheatSheet() {
    if (cheatsheetEl && cheatsheetEl.isConnected) {
      let returnFocus = _cheatsheetReturnFocus;
      cheatsheetEl.classList.remove("gmail-sort-cheatsheet-visible");
      setTimeout(function () {
        if (cheatsheetEl && cheatsheetEl.parentNode) cheatsheetEl.remove();
        cheatsheetEl = null;
        _cheatsheetReturnFocus = null;
        if (returnFocus && returnFocus.isConnected && typeof returnFocus.focus === "function") returnFocus.focus();
      }, CONFIG.CHEATSHEET_FADE);
      return;
    }

    let backdrop = document.createElement("div");
    backdrop.className = "gmail-sort-cheatsheet-backdrop";
    if (isDarkMode) backdrop.classList.add("gmail-sort-dark");

    let panel = document.createElement("div");
    panel.className = "gmail-sort-cheatsheet";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "InboxSort keyboard shortcuts");
    panel.tabIndex = -1;

    let shortcuts = [
      { section: "Sort Modes" },
      { key: "Alt + 1", label: "Oldest First" },
      { key: "Alt + 2", label: "Newest First" },
      { key: "Alt + 3", label: "Sender A\u2192Z" },
      { key: "Alt + 4", label: "Sender Z\u2192A" },
      { key: "Alt + 5", label: "Unread First" },
      { key: "Alt + 6", label: "Toggle Group by Sender" },
      { key: "Alt + 7", label: "Starred First" },
      { section: "Filters & Search" },
      { key: "/", label: "Focus search bar" },
      { key: "Esc", label: "Clear search / close" },
      { key: "Alt + 0", label: "Clear all filters" },
      { section: "Other" },
      { key: "? / Alt+/", label: "Toggle this cheat sheet" }
    ];

    let html = '<div class="gmail-sort-cheatsheet-title">' + ICONS.keyboard + ' Keyboard Shortcuts</div>' +
               '<div class="gmail-sort-cheatsheet-subtitle">InboxSort v' + (chrome.runtime.getManifest().version || '1.3.2') + ' - Made by Alex Brecher</div>';

    for (let i = 0; i < shortcuts.length; i++) {
      let s = shortcuts[i];
      if (s.section) {
        html += '<div class="gmail-sort-cheatsheet-section">' + s.section + '</div>';
      } else {
        html += '<div class="gmail-sort-cheatsheet-row"><span>' + s.label + '</span><span class="gmail-sort-cheatsheet-key">' + s.key + '</span></div>';
      }
    }

    html += '<div class="gmail-sort-cheatsheet-dismiss">Press <strong>?</strong> or <strong>Esc</strong> to close</div>';
    panel.innerHTML = html;
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    cheatsheetEl = backdrop;
    _cheatsheetReturnFocus = document.activeElement;

    requestAnimationFrame(function () {
      backdrop.classList.add("gmail-sort-cheatsheet-visible");
      panel.focus();
    });

    // Click backdrop to close
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) toggleCheatSheet();
    });
  }

  // ── Bulk select / deselect visible (non-dimmed) emails ─────────────

  function bulkSelectVisible() {
    let rows = getVisibleEmailRows(false);
    let visibleRows = [];
    let alreadySelected = 0;

    for (let i = 0; i < rows.length; i++) {
      if (rows[i].classList.contains("gmail-sort-dim")) continue;
      visibleRows.push(rows[i]);
      let cb = rows[i].querySelector('div[role="checkbox"]');
      if (cb && cb.getAttribute("aria-checked") === "true") alreadySelected++;
    }

    if (visibleRows.length === 0) {
      showNotification("No visible emails");
      return;
    }

    // Toggle: if all visible are selected → deselect; otherwise → select all
    let shouldDeselect = alreadySelected === visibleRows.length;
    let changed = 0;

    for (let j = 0; j < visibleRows.length; j++) {
      let checkbox = visibleRows[j].querySelector('div[role="checkbox"]');
      if (!checkbox) continue;
      let isChecked = checkbox.getAttribute("aria-checked") === "true";
      if (shouldDeselect && isChecked) { checkbox.click(); changed++; }
      else if (!shouldDeselect && !isChecked) { checkbox.click(); changed++; }
    }

    // Retry pass — Gmail may swallow rapid programmatic checkbox clicks,
    // especially on newly-arrived rows.  Re-check after a short delay and
    // click any that didn't register the first time.
    var _retryRows = visibleRows;
    var _retryDeselect = shouldDeselect;
    setTimeout(function () {
      for (var rj = 0; rj < _retryRows.length; rj++) {
        var rcb = _retryRows[rj].querySelector('div[role="checkbox"]');
        if (!rcb) continue;
        var rChecked = rcb.getAttribute("aria-checked") === "true";
        if (_retryDeselect && rChecked) rcb.click();
        else if (!_retryDeselect && !rChecked) rcb.click();
      }
      // Force stats refresh after retry so button text reflects final state
      _lastStatsKey = "";
      updateStats();
    }, 80);

    if (shouldDeselect) {
      showNotification(changed + " email" + (changed !== 1 ? "s" : "") + " deselected");
    } else {
      showNotification(changed + " email" + (changed !== 1 ? "s" : "") + " selected");
    }
  }

  // ── Refresh all UI elements ──────────────────────────────────────

  function refreshUI() {
    updateUI();
    // Hidden-tab preferences can arrive asynchronously from sync storage;
    // always enforce visibility during UI refreshes.
    applyHiddenTabs();
    updateStats();
    applyAllFilters();
  }

  // ── Apply sort (main entry point) ─────────────────────────────────

  function applySort(mode, silent) {
    if (isNavigating) return;
    if (isExcludedLabel()) return;
    mode = normalizeSortMode(mode);
    _suppressObserver = true;
    try {

    // Cancel snooze if user explicitly changes sort during snooze
    if (!silent && isSnoozedActive()) {
      cancelSnooze(false);
    }

    clearSortTransforms();
    // Note: clearSortTransforms() internally forces a synchronous reflow
    // after clearing transforms, ensuring applySortTransforms() reads
    // correct post-clear geometry (offsetTop/offsetHeight).

    if (mode === "newest") {
      currentSort = "newest";
      saveState();

      // If group is enabled, still need to apply transforms for grouping
      // Apply transforms BEFORE refreshUI to avoid two-frame jump
      if (groupEnabled) {
        let gc = applySortTransforms("newest", !silent, true);
        refreshUI();
        if (!silent) showNotification("Grouped by sender");
        if (gc > 0) startGroupStyleInterval();
      } else {
        refreshUI();
        if (!silent) showNotification("Default order restored");
        if (originalPage && location.hash !== originalPage) {
          isNavigating = true;
          location.hash = originalPage;
          originalPage = null;
          setTimeout(function () { isNavigating = false; }, CONFIG.NAVIGATION_TIMEOUT);
        }
      }
      return;
    }

    if (mode === "oldest") {
      let pag = parsePagination();
      let lastPage = getLastPageNumber();

      if (!pag || lastPage <= 1 || isOnLastPage()) {
        let count = applySortTransforms("oldest", !silent, true);
        currentSort = "oldest";
        saveState();
        refreshUI();
        if (count > 0 && !silent) showNotification(groupEnabled ? "Grouped, oldest first" : "Sorted oldest first");
        if (groupEnabled && count > 0) startGroupStyleInterval();
        return;
      }

      isNavigating = true;
      originalPage = location.hash;
      if (!silent) showNotification("Going to oldest emails\u2026");

      let oldPag = getCurrentPaginationText();
      let baseHash = location.hash.replace(/\/p\d+$/, "");
      location.hash = baseHash + "/p" + lastPage;

      waitForNewPage(oldPag, function (loaded) {
        isNavigating = false;
        _suppressObserver = true;
        try {
        if (loaded) {
          let cnt = applySortTransforms("oldest", !silent);
          currentSort = "oldest";
          saveState();
          refreshUI();
          if (cnt > 0 && !silent) showNotification(groupEnabled ? "Grouped, oldest first" : "Sorted oldest first");
          if (groupEnabled && cnt > 0) startGroupStyleInterval();
        } else {
          if (!silent) showNotification("Timed out. Try again.");
        }
        } finally { queueMicrotask(function () { _suppressObserver = false; }); }
      });
      return;
    }

    // senderAZ, senderZA, unreadFirst, starredFirst
    let modeObj = null;
    for (let mi = 0; mi < SORT_MODES.length; mi++) {
      if (SORT_MODES[mi].id === mode) { modeObj = SORT_MODES[mi]; break; }
    }
    let sortedCount = applySortTransforms(mode, !silent, true);
    currentSort = mode;
    saveState();
    refreshUI();
    if (sortedCount > 0 && !silent && modeObj) {
      showNotification(groupEnabled ? "Grouped, " + modeObj.label.toLowerCase() : modeObj.label);
    }

    // Start persistent group style interval when grouping is active
    if (groupEnabled && sortedCount > 0) {
      startGroupStyleInterval();
    }

    } finally { queueMicrotask(function () { _suppressObserver = false; }); }
  }

  // ── Toggle group overlay ───────────────────────────────────────────

  function isSnoozedActive() {
    return !!(snoozeTimer && snoozeEndTime > Date.now());
  }

  function startSnoozeTimers(remainingMs) {
    if (snoozeTimer) clearTimeout(snoozeTimer);
    if (snoozeTickTimer) clearInterval(snoozeTickTimer);
    snoozeTimer = setTimeout(function () {
      cancelSnooze(true);
      showNotification("Sorting resumed");
    }, Math.max(1, remainingMs));
    snoozeTickTimer = setInterval(function () {
      updateStats();
      if (!isSnoozedActive()) {
        clearInterval(snoozeTickTimer);
        snoozeTickTimer = null;
      }
    }, CONFIG.SNOOZE_TICK_INTERVAL);
  }

  function toggleGroup() {
    // Manual group changes should end snooze immediately.
    if (isSnoozedActive()) cancelSnooze(false);
    groupEnabled = !groupEnabled;
    saveState();
    _suppressObserver = true;
    try {
    // Full cache invalidation — clears stale geometry/metadata from archived rows
    clearSortTransforms();
    fullInvalidateRowCache();
    if (currentSort === "newest" && !groupEnabled) {
      // Just turning off group while on default order — simple refresh
      refreshUI();
      showNotification("Grouping off");
      return;
    }
    // Grouping changes the visual order and can touch every Gmail row at once.
    // Do this as an atomic placement instead of a staggered transform animation:
    // Gmail composites <tr> layers independently during the transition, which
    // briefly paints old and new row content on top of each other.
    // skipClear=true because we already cleared above.
    let sortedCount = applySortTransforms(currentSort === "newest" ? "newest" : currentSort, false, true);
    refreshUI();
    if (groupEnabled) {
      showNotification("Grouped by sender");
      if (sortedCount > 0) startGroupStyleInterval();
    } else {
      showNotification("Grouping off");
    }
    } finally { queueMicrotask(function () { _suppressObserver = false; }); }
  }

  // ── Snooze sort ───────────────────────────────────────────────────

  function snoozeSort(minutes) {
    if (!minutes || minutes <= 0) return;
    // Cancel any existing snooze
    cancelSnooze(false);

    snoozedSort = currentSort;
    snoozedGroup = groupEnabled;
    snoozeEndTime = Date.now() + minutes * 60000;
    persistSnoozeState({
      endTime: snoozeEndTime,
      sortMode: snoozedSort,
      groupEnabled: snoozedGroup
    });

    // Revert to default visually, but do NOT save "newest" to storage
    clearSortTransforms();
    currentSort = "newest";
    groupEnabled = false;
    refreshUI();
    showNotification("Sorting paused for " + minutes + " min");

    startSnoozeTimers(minutes * 60000);

    updateStats();
  }

  function cancelSnooze(restoreSortState) {
    let hadSnooze = !!(snoozeTimer || snoozeTickTimer || snoozeEndTime || snoozedSort !== null || snoozedGroup);
    let restoreSort = snoozedSort;
    let restoreGroup = !!snoozedGroup;

    if (snoozeTimer) { clearTimeout(snoozeTimer); snoozeTimer = null; }
    if (snoozeTickTimer) { clearInterval(snoozeTickTimer); snoozeTickTimer = null; }
    snoozedSort = null;
    snoozedGroup = false;
    snoozeEndTime = 0;
    persistSnoozeState(null);

    if (restoreSortState && hadSnooze) {
      groupEnabled = restoreGroup;
      applySort(restoreSort || "newest", true);
      return;
    }
    updateStats();
  }

  // ── UI state updates ──────────────────────────────────────────────

  function updateUI() {
    if (!container) return;

    // Update sort mode tabs (skip group toggle — handled separately below)
    let tabs = container.querySelectorAll(".gmail-sort-tab:not(.gmail-sort-group-toggle)");
    for (let i = 0; i < tabs.length; i++) {
      let modes = (tabs[i].getAttribute("data-modes") || "").split(",");
      let isActive = modes.indexOf(currentSort) !== -1;
      tabs[i].classList.toggle("gmail-sort-tab-active", isActive);
      tabs[i].setAttribute("aria-pressed", isActive ? "true" : "false");

      let iconEl = tabs[i].querySelector(".gmail-sort-tab-icon");
      let labelEl = tabs[i].querySelector(".gmail-sort-tab-label");

      if (isActive) {
        let modeObj = null;
        for (let m = 0; m < SORT_MODES.length; m++) {
          if (SORT_MODES[m].id === currentSort) { modeObj = SORT_MODES[m]; break; }
        }
        if (modeObj) {
          if (iconEl) iconEl.innerHTML = ICONS[modeObj.icon];
          if (labelEl) labelEl.textContent = modeObj.tabLabel;
          tabs[i].setAttribute("aria-label", modeObj.label + ". Activate to return to newest.");
          tabs[i].setAttribute("title", modeObj.label + ". Click to return to newest.");
        }
      } else {
        let tgId = tabs[i].getAttribute("data-tab-group");
        for (let tgi = 0; tgi < TAB_GROUPS.length; tgi++) {
          if (TAB_GROUPS[tgi].id === tgId) {
            if (iconEl) iconEl.innerHTML = ICONS[TAB_GROUPS[tgi].defaultIcon];
            if (labelEl) labelEl.textContent = TAB_GROUPS[tgi].defaultLabel;
            tabs[i].setAttribute("aria-label", "Sort by " + TAB_GROUPS[tgi].defaultLabel);
            tabs[i].setAttribute("title", "Sort by " + TAB_GROUPS[tgi].defaultLabel);
            break;
          }
        }
      }
    }

    // Update group toggle button
    let groupBtn = container.querySelector(".gmail-sort-group-toggle");
    if (groupBtn) {
      groupBtn.classList.toggle("gmail-sort-tab-active", groupEnabled);
      groupBtn.setAttribute("aria-pressed", groupEnabled ? "true" : "false");
      groupBtn.setAttribute("title", groupEnabled ? "Turn off sender grouping" : "Group emails by sender");
      groupBtn.setAttribute("aria-label", groupEnabled ? "Turn off sender grouping" : "Group emails by sender");
    }
  }

  // ── Toast notification ────────────────────────────────────────────

  function showNotification(message) {
    let existing = document.querySelector(".gmail-sort-toast");
    if (existing) existing.remove();

    let toast = document.createElement("div");
    toast.className = "gmail-sort-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    if (isDarkMode) toast.classList.add("gmail-sort-dark");
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add("gmail-sort-toast-visible");
    });
    setTimeout(function () {
      toast.classList.remove("gmail-sort-toast-visible");
      setTimeout(function () { if (toast.parentNode) toast.remove(); }, CONFIG.TOAST_FADE);
    }, CONFIG.TOAST_DISPLAY);
  }

  // ── View detection ────────────────────────────────────────────────

  /**
   * isListView — Determines whether the current Gmail view is a message list
   * (inbox, label, category) vs. a single-message/thread view.
   *
   * Gmail encodes normal thread IDs in the URL hash as the last path segment.
   * Messages opened in their own window use a `/popout` route (or an older
   * query-string message view) and must also be treated as thread views.
   * Thread IDs are long (≥15 chars), Base64-ish strings (alphanumeric + dash + underscore).
   * Examples:  #inbox/FMfcgzQXKhbfGqQlChrCxfZVSvxBpmJB   ← thread view
   *            #inbox/p2                                   ← list view, page 2
   *            #label/Work                                 ← list view
   *
   * Heuristic: if the last hash segment is ≥ THREAD_ID_MIN_LENGTH characters
   * and matches [A-Za-z0-9_-]+, treat it as a thread ID → not a list view.
   * This avoids false positives from short label names, pagination tokens, etc.
   */
  function isListView() {
    // Gmail's "Open in new window" route does not use the normal hash-based
    // thread URL. Current Gmail uses /popout; older/alternate message-only
    // routes use view=btop, view=pt, or view=om.
    if (/\/popout\/?$/.test(location.pathname)) return false;

    let standaloneView = "";
    try {
      standaloneView = new URLSearchParams(location.search).get("view") || "";
    } catch (_) { /* fall through to hash detection */ }
    if (standaloneView === "btop" || standaloneView === "pt" || standaloneView === "om") {
      return false;
    }

    let hash = location.hash;
    if (hash === "" || hash === "#" || hash === "#inbox") return true;
    if (/^#inbox\/p\d+$/.test(hash)) return true;
    let parts = hash.replace(/^#/, "").split("/");
    let lastPart = parts[parts.length - 1];
    if (/^p\d+$/.test(lastPart)) return true;

    let threadLikeTail = !!(lastPart &&
      lastPart.length >= CONFIG.THREAD_ID_MIN_LENGTH &&
      /^[A-Za-z0-9_-]+$/.test(lastPart));
    if (!threadLikeTail) return true;

    // Two-segment hashes like "label/Work" are often list labels, not threads.
    // Restrict thread detection to roots that can contain direct thread tails.
    let singleRootThreadLabels = {
      inbox: true, all: true, sent: true, starred: true, important: true,
      drafts: true, snoozed: true, spam: true, trash: true, scheduled: true,
      chats: true
    };
    let canHaveThreadTail =
      (parts.length >= 3) ||
      (parts.length >= 2 && !!singleRootThreadLabels[parts[0]]);
    if (canHaveThreadTail) return false;

    return true;
  }

  function isSearchView() {
    return /^#search\//.test(location.hash);
  }

  // ── Button injection & visibility ─────────────────────────────────

  function isButtonInjected() {
    // Reinjection guard should only care whether our DOM node still exists.
    // Using offsetParent here causes false negatives when Gmail temporarily
    // hides sections (thread/compose transitions), which leads to flicker.
    return !!(container && container.isConnected);
  }

  function isStatsInjected() {
    return !!(statsBar && statsBar.isConnected);
  }

  function updateButtonVisibility() {
    if (!container) return;
    let visible = isListView() && !isExcludedLabel();
    container.classList.toggle("gmail-sort-hidden", !visible);
    if (!visible) clearFilters();
  }

  function applyHiddenTabs() {
    if (!container) return;
    let tabs = container.querySelectorAll(".gmail-sort-tab");
    for (let i = 0; i < tabs.length; i++) {
      // Group toggle: check hiddenTabs.groupSender directly
      if (tabs[i].classList.contains("gmail-sort-group-toggle")) {
        if (hiddenTabs["groupSender"]) {
          tabs[i].style.setProperty("display", "none", "important");
        } else {
          tabs[i].style.removeProperty("display");
        }
        continue;
      }
      let tabGroup = tabs[i].getAttribute("data-tab-group");
      if (tabGroup && hiddenTabs[tabGroup]) {
        tabs[i].style.setProperty("display", "none", "important");
      } else {
        tabs[i].style.removeProperty("display");
      }
    }
  }

  function injectButton() {
    if (isButtonInjected()) return;

    // Prevent retry-timer buildup across rapid Gmail rerenders/reinjections.
    if (_hiddenTabsRetryTimers.length) {
      for (let ti = 0; ti < _hiddenTabsRetryTimers.length; ti++) {
        clearTimeout(_hiddenTabsRetryTimers[ti]);
      }
      _hiddenTabsRetryTimers = [];
    }

    let old = document.querySelectorAll(".gmail-sort-container");
    for (let x = 0; x < old.length; x++) old[x].remove();
    let oldStats = document.querySelectorAll(".gmail-sort-stats");
    for (let y = 0; y < oldStats.length; y++) oldStats[y].remove();

    let toolbar = document.querySelector('div[gh="tm"]');
    if (!toolbar) return;

    detectDarkMode();

    container = document.createElement("div");
    container.className = "gmail-sort-container";
    // Apply visibility synchronously so thread-only views never flash the
    // toolbar while storage preferences are still loading.
    if (!isListView() || isExcludedLabel()) {
      container.classList.add("gmail-sort-hidden");
    }
    container.setAttribute("role", "toolbar");
    container.setAttribute("aria-label", "InboxSort email sorting and filtering");
    if (isDarkMode) container.classList.add("gmail-sort-dark");

    // ─ Sort tabs (merged toggles) ─
    for (let i = 0; i < TAB_GROUPS.length; i++) {
      let tg = TAB_GROUPS[i];
      let tab = document.createElement("button");
      tab.className = "gmail-sort-tab";
      tab.type = "button";
      tab.setAttribute("data-tab-group", tg.id);
      tab.setAttribute("data-modes", tg.modes.join(","));
      tab.setAttribute("aria-label", "Sort by " + tg.defaultLabel);
      tab.setAttribute("aria-pressed", "false");
      tab.setAttribute("title", "Sort by " + tg.defaultLabel);
      tab.innerHTML =
        '<span class="gmail-sort-tab-icon">' + ICONS[tg.defaultIcon] + "</span>" +
        '<span class="gmail-sort-tab-label">' + tg.defaultLabel + "</span>";
      container.appendChild(tab);
    }

    // ─ Group toggle (independent of sort mode) ─
    let groupBtn = document.createElement("button");
    groupBtn.className = "gmail-sort-tab gmail-sort-group-toggle";
    groupBtn.type = "button";
    groupBtn.setAttribute("aria-label", "Group emails by sender");
    groupBtn.setAttribute("aria-pressed", "false");
    groupBtn.setAttribute("title", "Group emails by sender");
    groupBtn.innerHTML =
      '<span class="gmail-sort-tab-icon">' + ICONS.groupSender + "</span>" +
      '<span class="gmail-sort-tab-label">Group</span>';
    container.appendChild(groupBtn);

    // ─ Divider ─
    container.appendChild(createDivider());

    // ─ Search bar ─
    let searchWrap = document.createElement("div");
    searchWrap.className = "gmail-sort-search-wrap";

    let searchIcon = document.createElement("span");
    searchIcon.className = "gmail-sort-search-icon";
    searchIcon.setAttribute("aria-hidden", "true");
    searchIcon.innerHTML = ICONS.search;
    searchWrap.appendChild(searchIcon);

    let searchInput = document.createElement("input");
    searchInput.className = "gmail-sort-search-input";
    searchInput.type = "text";
    searchInput.placeholder = "Filter emails\u2026";
    searchInput.setAttribute("aria-label", "Filter visible emails by sender, subject, or snippet");
    searchInput.spellcheck = false;
    searchInput.autocomplete = "off";
    searchWrap.appendChild(searchInput);

    let searchCount = document.createElement("span");
    searchCount.className = "gmail-sort-search-count";
    searchCount.setAttribute("aria-live", "polite");
    searchCount.setAttribute("aria-atomic", "true");
    searchWrap.appendChild(searchCount);

    let searchClose = document.createElement("button");
    searchClose.className = "gmail-sort-search-close";
    searchClose.type = "button";
    searchClose.setAttribute("aria-label", "Clear search");
    searchClose.setAttribute("title", "Clear search");
    searchClose.innerHTML = ICONS.close;
    searchWrap.appendChild(searchClose);

    // ─ Stats bar (inline) ─
    container.appendChild(createDivider());
    createStatsBar();
    container.appendChild(statsBar);

    // ─ Search (fills remaining space) ─
    container.appendChild(searchWrap);

    // Insert container below Gmail's action bar (between toolbar and email rows)
    toolbar.after(container);

    applyAccentColor();
    // Pull latest hidden-tab prefs at inject time in case storage listeners
    // were missed during prior Gmail rerenders.
    refreshHiddenTabsFromStorage(function () {
      applyHiddenTabs();
      updateUI();
      updateButtonVisibility();
      updateStats();
    });
    // Sync can lag briefly after extension reload/startup; retry a couple times.
    _hiddenTabsRetryTimers.push(setTimeout(function () {
      refreshHiddenTabsFromStorage(function () { applyHiddenTabs(); });
    }, 1000));
    _hiddenTabsRetryTimers.push(setTimeout(function () {
      refreshHiddenTabsFromStorage(function () { applyHiddenTabs(); });
    }, 3000));
  }

  function createDivider() {
    let d = document.createElement("span");
    d.className = "gmail-sort-divider";
    d.setAttribute("aria-hidden", "true");
    return d;
  }


  // ── Safe DOM helper ───────────────────────────────────────────────

  function safeClosest(el, selector) {
    try {
      if (el && typeof el.closest === "function") return el.closest(selector);
    } catch (_) { /* ignore */ }
    return null;
  }

  // ── Event handlers (capturing phase for clicks) ───────────────────

  function onDocumentClick(e) {
    if (_contextInvalid) return;
    if (!e.target) return;

    try {
      // Stats bar click (filter toggle + bulk select)
      if (statsBar && statsBar.isConnected) {
        // Bulk select button
        let bulkBtn = safeClosest(e.target, ".gmail-sort-bulk-select");
        if (bulkBtn && statsBar.contains(bulkBtn)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          bulkSelectVisible();
          // Invalidate delta cache so button text rebuilds (select ↔ deselect)
          _lastStatsKey = "";
          setTimeout(updateStats, 50);
          return;
        }

        let stat = safeClosest(e.target, ".gmail-sort-stat-clickable");
        if (stat && statsBar.contains(stat)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          let statType = stat.getAttribute("data-stat");
          if (statType === "unread") filterUnread = !filterUnread;
          else if (statType === "starred") filterStarred = !filterStarred;
          else if (statType === "attachment") filterAttachment = !filterAttachment;
          applyAllFilters();
          updateStats();
          return;
        }
      }

      // If the container reference is stale (Gmail re-rendered the toolbar area),
      // try to re-acquire the live container before bailing.  This prevents a
      // ~17-second delay where clicks are silently dropped until the MutationObserver
      // re-injects the toolbar and triggers autoSortWhenReady.
      if (!container || !container.isConnected) {
        let liveContainer = document.querySelector(".gmail-sort-container");
        if (liveContainer && liveContainer.isConnected) {
          container = liveContainer;
        } else {
          return;
        }
      }

      // Group toggle click
      let groupToggle = safeClosest(e.target, ".gmail-sort-group-toggle");
      if (groupToggle && container.contains(groupToggle)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        toggleGroup();
        return;
      }

      // Sort tab click (cycle through modes in the tab group)
      let tab = safeClosest(e.target, ".gmail-sort-tab:not(.gmail-sort-group-toggle)");
      if (tab && container.contains(tab)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        let modes = (tab.getAttribute("data-modes") || "").split(",");
        if (modes.length > 0) {
          let curIdx = modes.indexOf(currentSort);
          if (curIdx === -1) {
            // Not currently in this group — activate first mode
            applySort(modes[0], false);
          } else if (curIdx < modes.length - 1) {
            // Cycle to next mode in the group
            applySort(modes[curIdx + 1], false);
          } else {
            // At last mode — deactivate (back to default)
            applySort("newest", false);
          }
        }
        return;
      }

      // Search close button — only clear search text, preserve other filters
      let sClose = safeClosest(e.target, ".gmail-sort-search-close");
      if (sClose && container.contains(sClose)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        searchQuery = "";
        let input = container.querySelector(".gmail-sort-search-input");
        if (input) input.value = "";
        applyAllFilters();
        return;
      }

      // Search input / wrap
      let sWrap = safeClosest(e.target, ".gmail-sort-search-input") ||
                  safeClosest(e.target, ".gmail-sort-search-wrap");
      if (sWrap && container.contains(sWrap)) {
        e.stopImmediatePropagation();
        return;
      }
    } catch (err) {
      console.warn("[InboxSort] click handler error:", err);
    }
  }
  document.addEventListener("click", onDocumentClick, true);

  function onDocumentMousedown(e) {
    if (_contextInvalid) return;
    if (!e.target) return;
    try {
      // Stats bar
      if (statsBar && statsBar.isConnected) {
        let bulkHit = safeClosest(e.target, ".gmail-sort-bulk-select");
        if (bulkHit && statsBar.contains(bulkHit)) { e.stopImmediatePropagation(); return; }
        let statHit = safeClosest(e.target, ".gmail-sort-stat-clickable");
        if (statHit && statsBar.contains(statHit)) {
          e.stopImmediatePropagation();
          return;
        }
      }
      if (!container || !container.isConnected) {
        let liveContainer = document.querySelector(".gmail-sort-container");
        if (liveContainer && liveContainer.isConnected) { container = liveContainer; }
        else { return; }
      }
      let hit = safeClosest(e.target, ".gmail-sort-tab") ||
                safeClosest(e.target, ".gmail-sort-search-close") ||
                safeClosest(e.target, ".gmail-sort-search-input") ||
                safeClosest(e.target, ".gmail-sort-search-wrap");
      if (hit && container.contains(hit)) {
        e.stopImmediatePropagation();
      }
    } catch (err) {
      console.warn("[InboxSort] mousedown handler error:", err);
    }
  }
  document.addEventListener("mousedown", onDocumentMousedown, true);

  // Search input (bubbling phase, debounced 150ms)
  function onDocumentInput(e) {
    if (_contextInvalid) return;
    if (!e.target || !e.target.classList || !e.target.classList.contains("gmail-sort-search-input")) return;
    searchQuery = e.target.value;
    if (_searchDebounce) clearTimeout(_searchDebounce);
    _searchDebounce = setTimeout(function () {
      _searchDebounce = null;
      applyAllFilters();
    }, CONFIG.SEARCH_DEBOUNCE);
  }
  document.addEventListener("input", onDocumentInput, false);

  // Escape key in search input (capturing phase)
  function onDocumentKeydown(e) {
    if (_contextInvalid) return;
    if (!e.target || !e.target.classList) return;

    // Search input: Escape clears search text; Alt+key combos fall through
    // to the global shortcut handler below so Alt+0 etc. work while typing.
    if (e.target.classList.contains("gmail-sort-search-input")) {
      if (e.key === "Escape") {
        e.preventDefault();
        searchQuery = "";
        e.target.value = "";
        applyAllFilters();
        e.target.blur();
        e.stopImmediatePropagation();
        return;
      }
      // Let Alt+key combos pass through so shortcuts (Alt+0, Alt+1, …) work
      if (!(e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey)) {
        e.stopImmediatePropagation();
        return;
      }
      // Alt+key: prevent the character from being typed, blur the input so
      // the shortcut handler treats it as a non-input context, then fall
      // through to the handler below.
      e.preventDefault();
      e.target.blur();
    }

    // "?" to toggle cheat sheet (Shift+/ on US layout, or raw ?)
    // Also match key="/" + shiftKey for browser automation and non-US layouts
    if ((e.key === "?" || (e.key === "/" && e.shiftKey)) && !e.altKey && !e.ctrlKey && !e.metaKey) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
      e.preventDefault();
      e.stopPropagation();
      toggleCheatSheet();
      return;
    }

    // Escape closes cheat sheet if open
    if (e.key === "Escape" && cheatsheetEl && cheatsheetEl.isConnected) {
      e.preventDefault();
      e.stopPropagation();
      toggleCheatSheet();
      return;
    }

    // "/" to focus search (when not in any input; skip when Shift held — that's "?")
    if (e.key === "/" && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
      if (!container || !container.isConnected) {
        let liveContainer = document.querySelector(".gmail-sort-container");
        if (liveContainer && liveContainer.isConnected) { container = liveContainer; }
        else { return; }
      }
      let searchEl = container.querySelector(".gmail-sort-search-input");
      if (searchEl) {
        e.preventDefault();
        e.stopPropagation();
        searchEl.focus();
        return;
      }
    }

    // Keyboard shortcuts: Alt+number (when not in any input)
    if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      // Use activeElement (not e.target) so Alt+key works after search-input blur
      var ae = document.activeElement;
      if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable)) return;
      if (!container || !container.isConnected) {
        let liveContainer = document.querySelector(".gmail-sort-container");
        if (liveContainer && liveContainer.isConnected) { container = liveContainer; }
        else { return; }
      }

      let handled = true;
      switch (e.code) {
        case "Digit1": applySort("oldest", false); break;
        case "Digit2": applySort("newest", false); break;
        case "Digit3": applySort("senderAZ", false); break;
        case "Digit4": applySort("senderZA", false); break;
        case "Digit5": applySort("unreadFirst", false); break;
        case "Digit6": toggleGroup(); break;
        case "Digit7": applySort("starredFirst", false); break;
        case "Slash": toggleCheatSheet(); break;
        case "Digit0":
          clearFilters();
          groupEnabled = false;
          clearSortTransforms();
          fullInvalidateRowCache();
          currentSort = "newest";
          saveState();
          refreshUI();
          showNotification("All cleared");
          break;
        default: handled = false;
      }
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }
  document.addEventListener("keydown", onDocumentKeydown, true);

  // ── Auto-sort on page load ────────────────────────────────────────

  // force=true on initial page load — always restore stored sort.
  // force=false on DOM rebuilds — respect autoSort toggle.
  function autoSortWhenReady(force) {
    if (autoSortInterval) {
      clearInterval(autoSortInterval);
      autoSortInterval = null;
    }
    // Mutex: prevent duplicate calls from rapid MutationObserver firings
    if (_autoSortPending && !force) return;
    // While snoozed, keep inbox in default order regardless of stored sort.
    if (isSnoozedActive()) {
      currentSort = "newest";
      groupEnabled = false;
      refreshUI();
      return;
    }
    _autoSortPending = true;

    loadState(function () {
      applyAccentColor();

      if (isSnoozedActive()) {
        currentSort = "newest";
        groupEnabled = false;
        _autoSortPending = false;
        refreshUI();
        return;
      }

      // Never auto-sort on excluded labels (Sent, All Mail) — too many emails
      if (isExcludedLabel()) {
        _autoSortPending = false;
        refreshUI();
        return;
      }

      // Always skip if mode is already "newest" with no grouping (nothing to do)
      if (currentSort === "newest" && !groupEnabled) {
        _autoSortPending = false;
        refreshUI();
        return;
      }

      // Don't auto-sort or auto-group in search results — respect Google's
      // relevance ranking.  Users can still manually sort/group via the toolbar.
      if (isSearchView()) {
        _autoSortPending = false;
        refreshUI();
        return;
      }

      // On DOM rebuilds (not initial load), respect the autoSort toggle
      if (!force && !autoSortEnabled) {
        _autoSortPending = false;
        refreshUI();
        return;
      }

      // FAST PATH: if rows already exist (common on back-navigation with
      // cached DOM), sort immediately to avoid visible unsorted flash.
      let immediateRows = getVisibleEmailRows(true);
      if (immediateRows.length > 0) {
        hasAutoSorted = true;
        _autoSortPending = false;
        applySort(currentSort, true);
        return;
      }

      // SLOW PATH: rows aren't ready yet — poll until they appear.
      let attempts = 0;
      autoSortInterval = setInterval(function () {
        attempts++;
        let rows = getVisibleEmailRows(true);
        if (rows.length > 0 && !hasAutoSorted) {
          clearInterval(autoSortInterval);
          autoSortInterval = null;
          hasAutoSorted = true;
          _autoSortPending = false;
          // Apply sort immediately — no extra delay needed since the poll
          // already gave Gmail time to build the DOM.
          applySort(currentSort, true);
        }
        if (attempts >= CONFIG.AUTO_SORT_MAX_ATTEMPTS) {
          clearInterval(autoSortInterval);
          autoSortInterval = null;
          _autoSortPending = false;
        }
      }, CONFIG.AUTO_SORT_POLL);
    });
  }

  // ── MutationObserver ──────────────────────────────────────────────

  function attachObserverToCurrentRoot() {
    if (!_observer) return;
    let nextRoot = document.querySelector('div[role="main"]') || document.body;
    if (!nextRoot) return;
    if (_observerRoot === nextRoot && nextRoot.isConnected) return;

    _observer.disconnect();
    _observer.observe(nextRoot, { childList: true, subtree: true });
    _observerRoot = nextRoot;
  }

  function startObserverWatchdog() {
    if (_observerWatchdog) clearInterval(_observerWatchdog);
    _observerWatchdog = setInterval(function () {
      if (!isExtensionContextValid()) {
        handleContextInvalidated();
        return;
      }

      let currentMain = document.querySelector('div[role="main"]');
      if (currentMain && (_observerRoot !== currentMain || !_observerRoot || !_observerRoot.isConnected)) {
        attachObserverToCurrentRoot();
        fullInvalidateRowCache();
        hasAutoSorted = false;
      }

      // Gmail occasionally rebuilds only the top action area. That can remove
      // InboxSort without producing a mutation inside the observed main node.
      if (!isButtonInjected()) {
        injectButton();
        if (isButtonInjected() && isListView() && (currentSort !== "newest" || groupEnabled)) {
          autoSortWhenReady();
        }
      } else {
        updateButtonVisibility();
      }
    }, CONFIG.OBSERVER_WATCHDOG);
  }

  // Strip Gmail overlay params (compose, reply, forward, etc.) so
  // opening/closing Compose doesn't trigger a full sort reset.
  function stripGmailOverlayParams(url) {
    return url.replace(/[\?&](compose|view|tf|fs|to|su|body|source|sz|simpl|rm|ms|search|th|cvid|qs|cs)=[^&]*/g, "")
              .replace(/[?&]$/, "");
  }

  function observe() {
    let lastUrl = stripGmailOverlayParams(location.href);

    _observer = new MutationObserver(function () {
      // Skip self-triggered mutations from our own DOM writes
      if (_suppressObserver) return;
      if (_observerDebounce) clearTimeout(_observerDebounce);
      _observerDebounce = setTimeout(function () {
        _observerDebounce = null;

        // Bail out if the extension was reloaded / uninstalled
        if (!isExtensionContextValid()) { handleContextInvalidated(); return; }

        if (!isButtonInjected()) {
          injectButton();
          // DOM was rebuilt — reset auto-sort flag so we re-sort
          if (hasAutoSorted && isListView() && autoSortEnabled && (currentSort !== "newest" || groupEnabled)) {
            hasAutoSorted = false;
            autoSortWhenReady();
          }
        }
        if (!isStatsInjected() && isButtonInjected()) {
          // Clean up any orphaned stats bars
          let oldS = container.querySelectorAll(".gmail-sort-stats");
          for (let si = 0; si < oldS.length; si++) oldS[si].remove();
          createStatsBar();
          // Insert before search wrap so layout order is preserved
          let searchWrapEl = container.querySelector(".gmail-sort-search-wrap");
          if (searchWrapEl) {
            container.insertBefore(statsBar, searchWrapEl);
          } else {
            container.appendChild(statsBar);
          }
          updateStats();
        }

        // Throttled stats update
        let now = Date.now();
        if (now - lastStatsUpdate > CONFIG.STATS_THROTTLE) {
          lastStatsUpdate = now;
          updateStats();
          // Re-apply filters to newly-arrived rows (e.g. new email while filter active)
          if (searchQuery || filterStarred || filterAttachment || filterUnread) {
            applyAllFilters();
          }
        }

        // Compare URLs ignoring Gmail overlay params (compose, reply, etc.)
        // so opening Compose / Reply / Forward doesn't flash-reset the sort.
        let currentUrl = stripGmailOverlayParams(location.href);
        let handled = false;
        if (currentUrl !== lastUrl) {
          handled = true;
          let prevUrl = lastUrl;
          lastUrl = currentUrl;
          fullInvalidateRowCache();
          updateButtonVisibility();
          // Clear search debounce on navigation — prevents stale filter applying to new page
          if (_searchDebounce) { clearTimeout(_searchDebounce); _searchDebounce = null; }
          if (!isNavigating) {
            // NOTE: Do NOT call clearSortTransforms() here. Clearing transforms
            // causes visible "snap to unsorted → re-sort" jumpiness.  Instead
            // let applySort() (called from autoSortWhenReady) clear + re-apply
            // in one synchronous tick so the browser never paints the unsorted state.

            // Detect pagination within the same view (e.g. #sent/p2 → #sent/p3).
            // When user is paginating with an active sort/group, force re-sort
            // on the new page regardless of the autoSort toggle.
            let isPagination = false;
            if (prevUrl && currentUrl) {
              let prevBase = prevUrl.replace(/\/p\d+$/, "");
              let curBase = currentUrl.replace(/\/p\d+$/, "");
              isPagination = (prevBase === curBase && prevUrl !== currentUrl);
            }
            let hasActiveSort = (currentSort !== "newest" || groupEnabled);

            if (!isPagination) {
              originalPage = null;  // User navigated manually — clear stale page ref
              clearFilters();
            }
            hasAutoSorted = false;

            if (isListView()) {
              if (isPagination && hasActiveSort) {
                // Pagination with active sort — always force re-sort
                autoSortWhenReady(true);
              } else {
                autoSortWhenReady();
              }
            }
          }
        }

        // Row-change detection — re-sort when rows change (archive/delete/new email)
        // OR when Gmail replaces row elements with new ones (same count but different DOM nodes).
        // Without this, stale translateY transforms from the previous sort cause rows
        // to overlap ("bunch") or shift ("jump") after Gmail removes/adds a row.
        // Throttled to at most once per 500ms to avoid rapid sequential re-sorts
        // during bulk operations (e.g. archiving 5 emails at once).
        if (!handled && !isSnoozedActive() && _lastSortedRowCount > 0 && (currentSort !== "newest" || groupEnabled)) {
          let rcNow = Date.now();
          if (rcNow - _lastRowChangeSort >= 500) {
            let nowRows = getVisibleEmailRows(true);
            let nowCount = nowRows.length;
            // Check both count AND element identity — Gmail may replace row elements
            // without changing the count, which silently wipes our translateY transforms.
            let rowsChanged = (nowCount !== _lastSortedRowCount);
            if (!rowsChanged && _lastSortedRowElements && nowCount > 0) {
              for (let ri = 0; ri < _lastSortedRowElements.length && ri < nowRows.length; ri++) {
                if (_lastSortedRowElements[ri] !== nowRows[ri]) { rowsChanged = true; break; }
              }
            }
            if (nowCount > 0 && rowsChanged) {
              _lastRowChangeSort = rcNow;
              _suppressObserver = true;
              try {
                clearSortTransforms();
                fullInvalidateRowCache();
                let resortedCount = applySortTransforms(currentSort, false, true);
                refreshUI();
                if (groupEnabled) startGroupStyleInterval();
              } finally {
                queueMicrotask(function () { _suppressObserver = false; });
              }
            }
          }
        }
      }, CONFIG.OBSERVER_DEBOUNCE);
    });

    // Prefer observing div[role="main"] to avoid firing on compose, sidebars,
    // chat, etc. The watchdog reattaches when Gmail replaces that root.
    attachObserverToCurrentRoot();
    startObserverWatchdog();
  }

  // ── Message listener (from popup) ─────────────────────────────────

  chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
    if (!msg || _contextInvalid) return;

    let handled = false;
    switch (msg.action) {
      case "applySort":
        handled = true;
        if (msg.mode === "groupSender") {
          // Legacy: popup sends groupSender → toggle group overlay
          toggleGroup();
        } else if (msg.mode) {
          applySort(msg.mode, false);
        }
        break;

      case "toggleGroup":
        handled = true;
        toggleGroup();
        break;

      case "setGroupEnabled":
        handled = true;
        // Direct set (not toggle) — used by import to avoid toggle mismatch
        if (typeof msg.enabled === "boolean" && msg.enabled !== groupEnabled) {
          toggleGroup();
        }
        break;

      case "resetDefault":
        handled = true;
        cancelSnooze(false);
        clearFilters();
        groupEnabled = false;
        accentColor = "blue";
        hiddenTabs = {};
        autoSortEnabled = true;
        perLabelEnabled = false;
        applyAccentColor();
        applyHiddenTabs();
        applySort("newest", false);
        break;

      case "setAccentColor":
        handled = true;
        if (msg.color) {
          accentColor = msg.color;
          applyAccentColor();
        }
        break;

      case "toggleFilter":
        handled = true;
        if (msg.filter === "starred") filterStarred = !filterStarred;
        else if (msg.filter === "unread") filterUnread = !filterUnread;
        else if (msg.filter === "attachment") filterAttachment = !filterAttachment;
        applyAllFilters();
        updateStats();
        break;

      case "snoozeSort":
        handled = true;
        if (typeof msg.minutes === "number" && msg.minutes > 0) {
          snoozeSort(msg.minutes);
        }
        break;

      case "cancelSnooze":
        handled = true;
        cancelSnooze(true);
        showNotification("Snooze cancelled");
        break;

      case "setHiddenTabs":
        handled = true;
        if (msg.hiddenTabs && typeof msg.hiddenTabs === "object" && !Array.isArray(msg.hiddenTabs)) {
          hiddenTabs = normalizeHiddenTabs(msg.hiddenTabs);
          applyHiddenTabs();
        }
        break;

      case "getState":
        let snoozed = isSnoozedActive();
        sendResponse({
          sortMode: currentSort,
          groupEnabled: groupEnabled,
          filterStarred: filterStarred,
          filterUnread: filterUnread,
          filterAttachment: filterAttachment,
          autoSort: autoSortEnabled,
          perLabel: perLabelEnabled,
          hiddenTabs: hiddenTabs,
          isSnoozed: snoozed,
          snoozeRemaining: snoozed ? Math.max(0, Math.ceil((snoozeEndTime - Date.now()) / 60000)) : 0,
          snoozedSort: snoozedSort
        });
        return true; // async response
    }
    if (handled) sendResponse({ ok: true });
  });

  // ── Cleanup on page unload ──────────────────────────────────────
  window.addEventListener("beforeunload", function () {
    if (autoSortInterval)    { clearInterval(autoSortInterval);    autoSortInterval = null; }
    if (_groupStyleInterval) { clearInterval(_groupStyleInterval); _groupStyleInterval = null; }
    if (_observerDebounce)   { clearTimeout(_observerDebounce);    _observerDebounce = null; }
    if (_observerWatchdog)   { clearInterval(_observerWatchdog);   _observerWatchdog = null; }
    if (_searchDebounce)     { clearTimeout(_searchDebounce);      _searchDebounce = null; }
    if (_saveStateTimer)     { clearTimeout(_saveStateTimer);      _saveStateTimer = null; }
    _saveStatePending = false;
    _saveStateInFlight = false;
    _saveStateRetryDelay = CONFIG.SAVE_STATE_RETRY_BASE;
    if (snoozeTimer)         { clearTimeout(snoozeTimer);          snoozeTimer = null; }
    if (snoozeTickTimer)     { clearInterval(snoozeTickTimer);     snoozeTickTimer = null; }
    if (_observer)           { _observer.disconnect();             _observer = null; }
    _observerRoot = null;
    if (_initWaitInterval)   { clearInterval(_initWaitInterval);   _initWaitInterval = null; }
    if (_initSafetyTimeout)  { clearTimeout(_initSafetyTimeout);   _initSafetyTimeout = null; }
    if (_waitForNewPage)     { clearInterval(_waitForNewPage);     _waitForNewPage = null; }
    if (_hiddenTabsRetryTimers.length) {
      for (let ti = 0; ti < _hiddenTabsRetryTimers.length; ti++) {
        clearTimeout(_hiddenTabsRetryTimers[ti]);
      }
      _hiddenTabsRetryTimers = [];
    }
    document.removeEventListener("click", onDocumentClick, true);
    document.removeEventListener("mousedown", onDocumentMousedown, true);
    document.removeEventListener("input", onDocumentInput, false);
    document.removeEventListener("keydown", onDocumentKeydown, true);
    if (_resizeDebounce)     { clearTimeout(_resizeDebounce);      _resizeDebounce = null; }
    clearAccentColorVars();
  });

  // ── Viewport resize: re-sort when Gmail changes row heights ──────
  // Gmail switches between compact (~28px) and multi-line (~68px) row
  // formats at different viewport widths. When this happens, the CSS
  // transforms from a previous sort become invalid (wrong heights),
  // causing rows to overlap or disappear. This listener re-applies
  // the current sort after Gmail re-renders at the new width.

  window.addEventListener("resize", function () {
    // Only re-sort if transforms are actively applied
    if (currentSort === "newest" && !groupEnabled) return;

    let w = window.innerWidth;
    // Ignore height-only changes and trivial width jitter (< 10px)
    if (Math.abs(w - _lastResizeWidth) < 10) return;
    _lastResizeWidth = w;

    if (_resizeDebounce) clearTimeout(_resizeDebounce);
    _resizeDebounce = setTimeout(function () {
      _resizeDebounce = null;
      // Gmail may take a moment to re-render rows at the new width.
      // Re-apply current sort silently (no notification, no snooze cancel).
      applySort(currentSort, true);
    }, 300);
  });

  // ── Initialisation ────────────────────────────────────────────────

  function init() {
    if (_initialized) return;
    _initialized = true;
    _initWaitInterval = setInterval(function () {
      if (document.querySelector('div[role="main"]')) {
        clearInterval(_initWaitInterval);
        _initWaitInterval = null;
        if (_initSafetyTimeout) { clearTimeout(_initSafetyTimeout); _initSafetyTimeout = null; }
        injectButton();
        observe();
        autoSortWhenReady(true); // force=true: always restore stored sort on initial load
      }
    }, CONFIG.INIT_POLL);

    _initSafetyTimeout = setTimeout(function () {
      if (_initWaitInterval) { clearInterval(_initWaitInterval); _initWaitInterval = null; }
      _initSafetyTimeout = null;
    }, CONFIG.INIT_TIMEOUT);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
