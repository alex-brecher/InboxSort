(function () {
  "use strict";

  /* ================================================================
   *  InboxSort — Content Script (v1.0.0)
   *  Made by Alex Brecher
   *  Sorts Gmail inbox visually using CSS transforms.
   *  Features: 5 sort modes, group-by-sender toggle, stats bar, filters,
   *  keyboard shortcuts, snooze, per-label prefs, auto-sort toggle.
   * ================================================================ */

  // ── SVG icon library ──────────────────────────────────────────────

  var ICONS = {
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

  var SORT_MODES = [
    { id: "oldest",      label: "Sorted oldest first",    tabLabel: "Oldest",  icon: "oldest",      group: "date" },
    { id: "newest",      label: "Default order",           tabLabel: "Newest",  icon: "newest",      group: "date" },
    { id: "senderAZ",    label: "Sorted sender A\u2192Z",  tabLabel: "A\u2192Z", icon: "senderAZ",  group: "sender" },
    { id: "senderZA",    label: "Sorted sender Z\u2192A",  tabLabel: "Z\u2192A", icon: "senderZA",  group: "sender" },
    { id: "unreadFirst", label: "Unread first",            tabLabel: "Unread",  icon: "unreadFirst" }
  ];

  // Tab groups: merge related sort modes into single toggle buttons.
  // "newest" (default Gmail order) is NOT in any group — it's the inactive state.
  // Click cycle: inactive → mode[0] → mode[1] → … → inactive (newest).
  // NOTE: Group is a separate toggle (not a sort mode). See groupEnabled state.
  var TAB_GROUPS = [
    { id: "date",   modes: ["oldest"],                 defaultLabel: "Date",   defaultIcon: "newest" },
    { id: "sender", modes: ["senderAZ", "senderZA"],   defaultLabel: "Sender", defaultIcon: "senderAZ" },
    { id: "unread", modes: ["unreadFirst"],             defaultLabel: "Unread", defaultIcon: "unreadFirst" }
  ];

  // ── Accent colour palette ─────────────────────────────────────────

  var ACCENT_COLORS = {
    blue:   { primary: "#1a73e8", hover: "#1765cc", light: "#d2e3fc", dark: "#174ea6" },
    green:  { primary: "#1e8e3e", hover: "#188038", light: "#ceead6", dark: "#137333" },
    purple: { primary: "#9334e6", hover: "#7627bb", light: "#e8d0fe", dark: "#5c16a5" },
    red:    { primary: "#d93025", hover: "#c5221f", light: "#f4c7c3", dark: "#a50e0e" },
    orange: { primary: "#e8710a", hover: "#d56e0c", light: "#fde293", dark: "#b06000" },
    teal:   { primary: "#007b83", hover: "#006d75", light: "#b2ebf2", dark: "#005f66" }
  };

  // ── Runtime state ─────────────────────────────────────────────────

  var currentSort      = "newest";
  var groupEnabled     = false;   // Group-by-sender overlay (combinable with any sort)
  var accentColor      = "blue";
  var isDarkMode       = false;
  var isNavigating     = false;
  var originalPage     = null;
  var hasAutoSorted    = false;
  var container        = null;
  var statsBar         = null;
  var searchQuery      = "";
  var autoSortInterval = null;
  var filterStarred    = false;
  var filterAttachment = false;
  var filterUnread     = false;
  var autoSortEnabled  = true;
  var perLabelEnabled  = false;
  var snoozeTimer      = null;
  var snoozedSort      = null;
  var snoozeEndTime    = 0;
  var lastStatsUpdate  = 0;
  var snoozeTickTimer  = null;
  var _lastStatsKey    = "";
  var cheatsheetEl     = null;
  var hiddenTabs       = {};
  var _currentGroupData = null;   // saved group data for interval re-apply
  var _groupStyleInterval = null; // interval ID for persistent group re-apply
  var _autoSortPending = false;   // mutex: prevents duplicate autoSortWhenReady calls
  var _observer = null;           // MutationObserver reference for cleanup
  var _observerDebounce = null;   // observer debounce timer for cleanup
  var _initWaitInterval = null;   // init() polling interval for cleanup
  var _initSafetyTimeout = null;  // init() 30s failsafe timeout for cleanup
  var _waitForNewPage = null;     // pagination poll interval for cleanup

  // ── Current Gmail label ─────────────────────────────────────────

  function getCurrentLabel() {
    var hash = location.hash;
    if (!hash || hash === "#" || hash === "#inbox" || /^#inbox\/p\d+$/.test(hash)) return "inbox";
    return hash.replace(/^#/, "").replace(/\/p\d+$/, "") || "inbox";
  }

  // ── Persistence (chrome.storage.sync — syncs across devices) ─────

  function saveState() {
    try {
      var data = { accentColor: accentColor, sortMode: currentSort, groupEnabled: groupEnabled };
      if (perLabelEnabled) {
        // Per-label: also save to label-specific prefs
        chrome.storage.sync.get({ labelPrefs: {} }, function (stored) {
          var prefs = stored.labelPrefs || {};
          prefs[getCurrentLabel()] = currentSort;
          data.labelPrefs = prefs;
          chrome.storage.sync.set(data);
        });
      } else {
        // Global: save sortMode + accentColor + groupEnabled
        chrome.storage.sync.set(data);
      }
    } catch (e) {
      console.warn("[InboxSort] saveState error:", e);
    }
  }

  function loadState(callback) {
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
        accentColor = data.accentColor || "blue";
        autoSortEnabled = data.autoSort !== false;
        perLabelEnabled = !!data.perLabel;
        hiddenTabs = data.hiddenTabs || {};
        groupEnabled = !!data.groupEnabled;
        if (perLabelEnabled && data.labelPrefs && data.labelPrefs[getCurrentLabel()]) {
          currentSort = data.labelPrefs[getCurrentLabel()];
        } else {
          currentSort = data.sortMode || "newest";
        }
        // Migrate old groupSender sort mode to new group toggle
        if (currentSort === "groupSender") {
          currentSort = "newest";
          groupEnabled = true;
        }
        callback();
      });
    } catch (e) {
      console.warn("[InboxSort] loadState error:", e);
      callback();
    }
  }

  chrome.storage.onChanged.addListener(function (changes) {
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
      hiddenTabs = changes.hiddenTabs.newValue || {};
      applyHiddenTabs();
    }
  });

  // ── Dark-mode detection ───────────────────────────────────────────

  var _darkModeDetectedAt = 0;

  function detectDarkMode() {
    // PERF: Cache detection result for 2s to avoid forced style recalc on every call
    var now = Date.now();
    if (_darkModeDetectedAt && (now - _darkModeDetectedAt) < 2000) return;
    _darkModeDetectedAt = now;

    var bg = window.getComputedStyle(document.body).backgroundColor;
    if (bg) {
      var match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        isDarkMode = ((parseInt(match[1]) + parseInt(match[2]) + parseInt(match[3])) / 3) < 100;
      } else {
        isDarkMode = !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
      }
    } else {
      isDarkMode = !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
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
      });
    } catch (_) { /* older browsers */ }
  }

  // ── Accent colour application ─────────────────────────────────────

  function applyAccentColor() {
    var c = ACCENT_COLORS[accentColor] || ACCENT_COLORS.blue;
    var root = document.documentElement.style;
    root.setProperty("--sort-accent", c.primary);
    root.setProperty("--sort-accent-hover", c.hover);
    root.setProperty("--sort-accent-light", c.light);
  }

  // ── Date parsing ──────────────────────────────────────────────────

  function parseGmailDate(text) {
    if (!text) return null;
    var cleaned = text.replace(/\u200e/g, "").trim();
    var d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d;

    var monthDay = cleaned.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})$/i);
    if (monthDay) {
      var year = new Date().getFullYear();
      d = new Date(monthDay[1] + " " + monthDay[2] + ", " + year);
      // If parsed date is in the future, it's likely from last year
      if (!isNaN(d.getTime()) && d > new Date()) {
        d = new Date(monthDay[1] + " " + monthDay[2] + ", " + (year - 1));
      }
      if (!isNaN(d.getTime())) return d;
    }

    var timeOnly = cleaned.match(/^\d{1,2}:\d{2}\s*(AM|PM)$/i);
    if (timeOnly) {
      d = new Date(new Date().toDateString() + " " + cleaned);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }

  // ── Row-data extractors ───────────────────────────────────────────

  function getDateFromRow(row) {
    var spans = row.querySelectorAll("td span[title]");
    for (var i = 0; i < spans.length; i++) {
      var d = parseGmailDate(spans[i].getAttribute("title"));
      if (d) return d;
    }
    return null;
  }

  function getSenderFromRow(row) {
    var el = row.querySelector("span.zF") || row.querySelector("span.bA4");
    return el ? el.textContent.trim().toLowerCase() : "";
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
      var starCell = row.querySelector("td.apU");
      if (!starCell) return false;

      // Check for T-KT subclasses (indicates active star state)
      var starSpans = starCell.getElementsByClassName("T-KT");
      for (var k = 0; k < starSpans.length; k++) {
        var cl = starSpans[k].classList;
        for (var m = 0; m < cl.length; m++) {
          if (cl[m] !== "T-KT" && cl[m].indexOf("T-KT-") === 0) return true;
        }
      }

      // Check aria-label / title on elements within the star cell
      var allEls = starCell.querySelectorAll("[aria-label], [title]");
      for (var i = 0; i < allEls.length; i++) {
        var lbl = (allEls[i].getAttribute("aria-label") || allEls[i].getAttribute("title") || "").toLowerCase();
        if (lbl === "starred") return true;
        if (lbl.indexOf("starred") !== -1 && lbl.indexOf("not") === -1) return true;
      }

      // Check SVG fills (some themes use SVG stars)
      var svgs = starCell.getElementsByTagName("svg");
      for (var n = 0; n < svgs.length; n++) {
        var paths = svgs[n].querySelectorAll("path, polygon");
        for (var p = 0; p < paths.length; p++) {
          var fill = paths[p].getAttribute("fill");
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
      var tooltipEls = row.querySelectorAll("[data-tooltip]");
      for (var j = 0; j < tooltipEls.length; j++) {
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

  var _rowCache = null;
  var _rowCacheTime = 0;

  function getVisibleEmailRows(forceRefresh) {
    var now = Date.now();
    if (!forceRefresh && _rowCache && (now - _rowCacheTime) < 500) return _rowCache;

    var allRows = document.querySelectorAll("tr.zA");
    var result = [];
    for (var i = 0; i < allRows.length; i++) {
      var row = allRows[i];
      if (row.offsetHeight === 0) continue;
      var table = row.closest("table");
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
  }

  // ── Cached <td> query per row (avoids querySelectorAll("td") in hot loops) ─

  var _rowTds = new WeakMap();

  function getRowTds(row) {
    var cached = _rowTds.get(row);
    if (cached) return cached;
    var tds = row.querySelectorAll("td");
    _rowTds.set(row, tds);
    return tds;
  }

  // ── Row metadata cache (avoids repeated expensive DOM queries) ────

  var _rowMeta = new WeakMap();

  function getRowMeta(row) {
    var cached = _rowMeta.get(row);
    if (cached) return cached;
    var meta = {
      sender: getSenderFromRow(row),
      date: getDateFromRow(row),
      unread: isUnread(row),
      starred: isRowStarred(row),
      attachment: isRowHasAttachment(row)
    };
    _rowMeta.set(row, meta);
    return meta;
  }

  // ── Sort comparators ──────────────────────────────────────────────

  function getComparator(mode) {
    switch (mode) {
      case "oldest":
        return function (a, b) {
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return a.date.getTime() - b.date.getTime();
        };
      case "newest":
        return function (a, b) {
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return b.date.getTime() - a.date.getTime();
        };
      case "senderAZ":
        return function (a, b) { return a.sender.localeCompare(b.sender); };
      case "senderZA":
        return function (a, b) { return b.sender.localeCompare(a.sender); };
      case "unreadFirst":
        return function (a, b) {
          if (a.unread !== b.unread) return a.unread ? -1 : 1;
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return b.date.getTime() - a.date.getTime();
        };
      default:
        return function () { return 0; };
    }
  }

  // Wraps any comparator with a group-by-sender primary sort.
  // Within each sender group, the inner comparator determines order.
  function wrapWithGroupSort(innerComparator) {
    return function (a, b) {
      var cmp = a.sender.localeCompare(b.sender);
      if (cmp !== 0) return cmp;
      return innerComparator(a, b);
    };
  }

  // ── CSS-transform sorting ─────────────────────────────────────────

  function applySortTransforms(mode, animate, skipClear) {
    if (animate === undefined) animate = true;
    var rows = getVisibleEmailRows(true);
    if (rows.length === 0) return 0;

    // PERF: Read geometry FIRST before any style mutations to avoid layout thrashing.
    // getBoundingClientRect() forces synchronous layout; doing it before writes
    // means we only trigger one reflow instead of N.
    var items = new Array(rows.length);
    for (var r = 0; r < rows.length; r++) {
      var meta = getRowMeta(rows[r]);
      var rect = rows[r].getBoundingClientRect();
      items[r] = {
        row: rows[r],
        date: meta.date,
        sender: meta.sender,
        unread: meta.unread,
        origIndex: r,
        origTop: rect.top,
        height: rect.height
      };
    }

    // Clear old group markers and inline styles (writes only, after all reads)
    if (!skipClear) {
      for (var c = 0; c < rows.length; c++) {
        rows[c].classList.remove("gmail-sort-group-start", "gmail-sort-group-even", "gmail-sort-group-first");
        rows[c].removeAttribute("data-sort-group");
        rows[c].style.removeProperty("box-shadow");
        rows[c].style.removeProperty("background-color");
        var ctds = getRowTds(rows[c]);
        for (var ct = 0; ct < ctds.length; ct++) {
          ctds[ct].style.removeProperty("background");
          ctds[ct].style.removeProperty("background-color");
        }
      }
    }

    // Build comparator: wrap with group sort if groupEnabled
    var comparator = getComparator(mode);
    if (groupEnabled) {
      comparator = wrapWithGroupSort(comparator);
    }
    var sorted = items.slice().sort(comparator);

    // Compute base transforms
    var transforms = new Array(sorted.length);
    for (var i = 0; i < sorted.length; i++) {
      transforms[i] = items[i].origTop - sorted[i].origTop;
    }

    // Group visuals: compute group metadata when groupEnabled
    var groupData = null;
    if (groupEnabled) {
      var ac = ACCENT_COLORS[accentColor] || ACCENT_COLORS.blue;

      // Count emails per sender for badge numbers
      var senderCounts = {};
      for (var sc = 0; sc < sorted.length; sc++) {
        var sk = sorted[sc].sender || "";
        senderCounts[sk] = (senderCounts[sk] || 0) + 1;
      }

      // Compute per-row group info
      var prevSender = "";
      var groupIndex = -1;
      var isFirstGroup = true;
      var perRow = new Array(sorted.length);
      for (var g = 0; g < sorted.length; g++) {
        var senderKey = sorted[g].sender || "";
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
    // Since getBoundingClientRect() above already forced a reflow (committing
    // the cleared state), we can safely set transitions + transforms here and
    // the browser will animate from the committed "cleared" positions.
    try {
      if (groupData) {
        applyGroupVisuals(sorted, groupData);
      }
    } catch (groupErr) {
      console.warn("[InboxSort] Group styling error:", groupErr);
    }

    for (var j = 0; j < sorted.length; j++) {
      var el = sorted[j].row;
      el.style.position = "relative";
      el.style.zIndex = "1";
      if (animate) {
        el.style.transition = "transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)";
        el.style.transitionDelay = Math.min(j * 6, 300) + "ms";
      } else {
        el.style.transition = "none";
        el.style.transitionDelay = "0ms";
      }
      el.style.transform = "translateY(" + transforms[j] + "px)";
    }

    return rows.length;
  }

  // ── Group badge helpers ──────────────────────────────────────────

  function injectGroupBadge(row, count) {
    if (count <= 1) return;
    var senderEl = row.querySelector("span.zF") || row.querySelector("span.bA4");
    if (!senderEl || !senderEl.parentNode) return;
    // Prevent duplicate badges (can happen if reapplyGroupStyles fires while badges exist)
    if (senderEl.parentNode.querySelector(".gmail-sort-group-badge")) return;
    var badge = document.createElement("span");
    badge.className = "gmail-sort-group-badge";
    if (isDarkMode) badge.classList.add("gmail-sort-group-badge-dark");
    badge.textContent = count;
    badge.title = count + " emails from this sender";
    senderEl.parentNode.insertBefore(badge, senderEl.nextSibling);
  }

  function clearGroupBadges() {
    var badges = document.querySelectorAll(".gmail-sort-group-badge");
    for (var b = 0; b < badges.length; b++) badges[b].remove();
  }

  // ── Unified group visual applicator ──────────────────────────────
  // Applies CSS classes, inline styles, and badges to sorted rows.
  // Used by rAF, microtask, and interval-based re-applications.

  function applyGroupVisuals(sortedArr, gData) {
    var gac = gData.ac;
    var gpr = gData.perRow;
    var styledCount = 0;
    var badgedCount = 0;
    var skippedCount = 0;

    for (var gi = 0; gi < sortedArr.length; gi++) {
      var row = sortedArr[gi].row || sortedArr[gi];
      if (!row || !row.isConnected) { skippedCount++; continue; }
      var info = gpr[gi];
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
      var shadows = [];
      if (info.isEven) {
        shadows.push("inset 4px 0 0 0 " + gac.primary);
        // Background tint on every <td> for even groups
        row.style.setProperty("background-color", gac.light, "important");
        var tds = getRowTds(row);
        for (var t = 0; t < tds.length; t++) {
          tds[t].style.setProperty("background-color", gac.light, "important");
          tds[t].style.setProperty("background", gac.light, "important");
        }
        styledCount++;
      } else {
        shadows.push("inset 4px 0 0 0 rgba(0,0,0,0.10)");
      }
      if (info.isGroupStart && !info.isVeryFirst) {
        shadows.push("0 -2px 0 0 " + gac.primary);
      }
      row.style.setProperty("box-shadow", shadows.join(", "), "important");
    }

  }

  function clearGroupInlineStyles() {
    var rows = document.querySelectorAll("tr.zA");
    for (var i = 0; i < rows.length; i++) {
      rows[i].style.removeProperty("box-shadow");
      rows[i].style.removeProperty("background-color");
      var tds = getRowTds(rows[i]);
      for (var t = 0; t < tds.length; t++) {
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
      var gac = _currentGroupData.ac;
      var gpr = _currentGroupData.perRow;
      var rows = _currentGroupData.sortedRows;

      // PERF: Dirty-check — sample the first even-group row's box-shadow.
      // If it's still intact, Gmail hasn't wiped our styles, so skip.
      for (var dc = 0; dc < rows.length; dc++) {
        if (gpr[dc] && gpr[dc].isEven && rows[dc] && rows[dc].isConnected) {
          var curShadow = rows[dc].style.getPropertyValue("box-shadow");
          if (curShadow && curShadow.indexOf(gac.primary) !== -1) return; // still intact
          break; // found an even row but style is missing — proceed with re-apply
        }
      }

      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        if (!row || !row.isConnected) continue;
        var info = gpr[i];
        if (!info) continue;

        // Re-add CSS classes (Gmail may strip them)
        if (info.isGroupStart) {
          row.classList.add("gmail-sort-group-start");
          if (info.isVeryFirst) row.classList.add("gmail-sort-group-first");
        }
        if (info.isEven) row.classList.add("gmail-sort-group-even");

        // Re-apply box-shadow + background in one pass
        var shadows = [];
        if (info.isEven) {
          shadows.push("inset 4px 0 0 0 " + gac.primary);
          row.style.setProperty("background-color", gac.light, "important");
          var tds = getRowTds(row);
          for (var t = 0; t < tds.length; t++) {
            tds[t].style.setProperty("background-color", gac.light, "important");
            tds[t].style.setProperty("background", gac.light, "important");
          }
        } else {
          shadows.push("inset 4px 0 0 0 rgba(0,0,0,0.10)");
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
  var _groupStyleTick = 0;
  var _GROUP_FAST_TICKS = 25;   // 25 × 400ms = 10s of fast checking
  var _GROUP_MAX_TICKS  = 85;   // 25 fast + 60 slow (60 × 2s = 2min) then stop

  function startGroupStyleInterval() {
    stopGroupStyleInterval();
    _groupStyleTick = 0;
    _groupStyleInterval = setInterval(function () {
      _groupStyleTick++;
      if (!groupEnabled) {
        stopGroupStyleInterval();
        return;
      }
      reapplyGroupStyles();
      // After fast phase, slow down to 2s
      if (_groupStyleTick === _GROUP_FAST_TICKS) {
        clearInterval(_groupStyleInterval);
        _groupStyleInterval = setInterval(function () {
          _groupStyleTick++;
          if (!groupEnabled || _groupStyleTick >= _GROUP_MAX_TICKS) {
            stopGroupStyleInterval();
            return;
          }
          reapplyGroupStyles();
        }, 2000);
      }
    }, 400);
  }

  function stopGroupStyleInterval() {
    if (_groupStyleInterval) {
      clearInterval(_groupStyleInterval);
      _groupStyleInterval = null;
    }
    _groupStyleTick = 0;
  }

  function clearSortTransforms() {
    stopGroupStyleInterval();
    _currentGroupData = null;
    clearGroupBadges();
    clearGroupInlineStyles();
    var rows = document.querySelectorAll("tr.zA");
    for (var i = 0; i < rows.length; i++) {
      var s = rows[i].style;
      // Clear transition BEFORE transform to prevent animation during reset
      s.transition = "none";
      s.transitionDelay = "0ms";
      s.transform = "";
      s.position = "";
      s.zIndex = "";
      rows[i].classList.remove("gmail-sort-group-start", "gmail-sort-group-even", "gmail-sort-group-first");
      rows[i].removeAttribute("data-sort-group");
    }
    invalidateRowCache();
  }

  // ── Search & filter ───────────────────────────────────────────────

  function applyAllFilters() {
    var rows = getVisibleEmailRows(false);
    var matchCount = 0;
    var totalCount = 0;
    var q = searchQuery ? searchQuery.toLowerCase() : "";
    var anyFilter = !!(q || filterStarred || filterAttachment || filterUnread);

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      try {
        if (!row || !row.classList) continue;
        totalCount++;

        var pass = true;

        var meta = getRowMeta(row);
        if (q && pass) {
          var subjectEl = row.querySelector("span.bog, span.bqe");
          var subject = subjectEl ? subjectEl.textContent.toLowerCase() : "";
          var snippetEl = row.querySelector("span.y2");
          var snippet = snippetEl ? snippetEl.textContent.toLowerCase() : "";
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
      var countEl = container && container.querySelector(".gmail-sort-search-count");
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

    var rows = getVisibleEmailRows(false);
    for (var i = 0; i < rows.length; i++) {
      rows[i].classList.remove("gmail-sort-dim");
      rows[i].style.display = "";
    }

    if (container) {
      var input = container.querySelector(".gmail-sort-search-input");
      if (input) input.value = "";
      var countEl = container.querySelector(".gmail-sort-search-count");
      if (countEl) countEl.textContent = "";
    }
    updateStatsHighlight();
  }

  // ── Stats bar ─────────────────────────────────────────────────────

  function createStatsBar() {
    statsBar = document.createElement("div");
    statsBar.className = "gmail-sort-stats";
    if (isDarkMode) statsBar.classList.add("gmail-sort-dark");
    return statsBar;
  }

  function updateStats() {
    if (!statsBar || !statsBar.isConnected) return;

    var rows = getVisibleEmailRows(false);
    var total = rows.length;
    var unreadCount = 0, starredCount = 0, attachCount = 0;

    for (var i = 0; i < total; i++) {
      var meta = getRowMeta(rows[i]);
      if (meta.unread) unreadCount++;
      if (meta.starred) starredCount++;
      if (meta.attachment) attachCount++;
    }

    // Delta check — skip DOM rebuild if counts and filter state unchanged
    var hasSnooze = !!(snoozeTimer && snoozeEndTime > Date.now());
    var snoozeMin = hasSnooze ? Math.max(1, Math.ceil((snoozeEndTime - Date.now()) / 60000)) : 0;
    var key = [total, unreadCount, starredCount, attachCount,
               filterUnread ? 1 : 0, filterStarred ? 1 : 0, filterAttachment ? 1 : 0,
               snoozeMin].join(",");
    if (_lastStatsKey === key) return;
    _lastStatsKey = key;

    // Build HTML (all trusted content, no user input)
    var parts = [];

    // Snooze indicator
    if (snoozeTimer && snoozeEndTime > Date.now()) {
      var remaining = Math.max(1, Math.ceil((snoozeEndTime - Date.now()) / 60000));
      parts.push('<span class="gmail-sort-snooze-badge">\u23F8 ' + remaining + 'm</span>');
    }

    parts.push(
      '<span class="gmail-sort-stat" data-stat="total">' +
      '<span class="gmail-sort-stat-num">' + total + '</span> email' + (total !== 1 ? 's' : '') + '</span>'
    );
    parts.push(
      '<span class="gmail-sort-stat gmail-sort-stat-clickable' +
      (filterUnread ? ' gmail-sort-stat-active' : '') +
      '" data-stat="unread" title="Toggle unread filter">' +
      '<span class="gmail-sort-stat-icon">' + ICONS.unreadFirst + '</span>' +
      '<span class="gmail-sort-stat-num">' + unreadCount + '</span> unread</span>'
    );
    parts.push(
      '<span class="gmail-sort-stat gmail-sort-stat-clickable' +
      (filterStarred ? ' gmail-sort-stat-active' : '') +
      '" data-stat="starred" title="Toggle starred filter">' +
      '<span class="gmail-sort-stat-icon">' + ICONS.starred + '</span>' +
      '<span class="gmail-sort-stat-num">' + starredCount + '</span> starred</span>'
    );
    parts.push(
      '<span class="gmail-sort-stat gmail-sort-stat-clickable' +
      (filterAttachment ? ' gmail-sort-stat-active' : '') +
      '" data-stat="attachment" title="Toggle attachment filter">' +
      '<span class="gmail-sort-stat-icon">' + ICONS.attachment + '</span>' +
      '<span class="gmail-sort-stat-num">' + attachCount + '</span> attachment' + (attachCount !== 1 ? 's' : '') + '</span>'
    );

    // Build stats HTML — join stat items with dot separators
    var html = parts.join('<span class="gmail-sort-stat-sep">\u00b7</span>');

    // Bulk-select button when any filter is active (appended without dot separator)
    var anyFilter = !!(searchQuery || filterStarred || filterAttachment || filterUnread);
    if (anyFilter) {
      // Check if all visible (non-dimmed) are already selected
      var visCount = 0, selCount = 0;
      for (var bi = 0; bi < rows.length; bi++) {
        if (rows[bi].classList.contains("gmail-sort-dim")) continue;
        visCount++;
        var bcb = rows[bi].querySelector('div[role="checkbox"]');
        if (bcb && bcb.getAttribute("aria-checked") === "true") selCount++;
      }
      var allSelected = visCount > 0 && selCount === visCount;
      html +=
        '<button class="gmail-sort-bulk-select' + (allSelected ? ' gmail-sort-bulk-deselect' : '') +
        '" data-action="bulk-select" title="' + (allSelected ? 'Deselect all visible emails' : 'Select all visible emails') + '">' +
        ICONS.selectAll + (allSelected ? ' Deselect all' : ' Select visible') + '</button>';
    }

    statsBar.innerHTML = html;
  }

  function updateStatsHighlight() {
    if (!statsBar) return;
    var unreadEl = statsBar.querySelector('[data-stat="unread"]');
    var starredEl = statsBar.querySelector('[data-stat="starred"]');
    var attachEl = statsBar.querySelector('[data-stat="attachment"]');
    if (unreadEl) unreadEl.classList.toggle("gmail-sort-stat-active", filterUnread);
    if (starredEl) starredEl.classList.toggle("gmail-sort-stat-active", filterStarred);
    if (attachEl) attachEl.classList.toggle("gmail-sort-stat-active", filterAttachment);
  }

  // ── Pagination helpers ────────────────────────────────────────────

  function parsePagination() {
    var spans = document.querySelectorAll("span.Dj");
    for (var i = 0; i < spans.length; i++) {
      var m = spans[i].textContent.match(/(\d+)[–\-](\d+)\s+of\s+(\d+)/);
      if (m) return { start: parseInt(m[1], 10), end: parseInt(m[2], 10), total: parseInt(m[3], 10) };
    }
    return null;
  }

  function getLastPageNumber() {
    var pag = parsePagination();
    if (!pag) return 1;
    var perPage = pag.end - pag.start + 1;
    return perPage > 0 ? Math.ceil(pag.total / perPage) : 1;
  }

  function isOnLastPage() {
    var pag = parsePagination();
    return !pag || pag.end >= pag.total;
  }

  function getCurrentPaginationText() {
    var spans = document.querySelectorAll("span.Dj");
    for (var i = 0; i < spans.length; i++) {
      if (/\d+.*of/.test(spans[i].textContent)) return spans[i].textContent.trim();
    }
    return "";
  }

  function waitForNewPage(oldPagText, callback) {
    // Clear any previous pagination poll
    if (_waitForNewPage) { clearInterval(_waitForNewPage); _waitForNewPage = null; }

    var start = Date.now();
    _waitForNewPage = setInterval(function () {
      if (Date.now() - start > 10000) {
        clearInterval(_waitForNewPage);
        _waitForNewPage = null;
        callback(false);
        return;
      }
      var current = getCurrentPaginationText();
      if (current && current !== oldPagText) {
        clearInterval(_waitForNewPage);
        _waitForNewPage = null;
        setTimeout(function () { callback(true); }, 800);
      }
    }, 200);
  }

  // ── Keyboard shortcut cheat sheet overlay ─────────────────────────

  function toggleCheatSheet() {
    if (cheatsheetEl && cheatsheetEl.isConnected) {
      cheatsheetEl.classList.remove("gmail-sort-cheatsheet-visible");
      setTimeout(function () { if (cheatsheetEl && cheatsheetEl.parentNode) cheatsheetEl.remove(); cheatsheetEl = null; }, 200);
      return;
    }

    var backdrop = document.createElement("div");
    backdrop.className = "gmail-sort-cheatsheet-backdrop";
    if (isDarkMode) backdrop.classList.add("gmail-sort-dark");

    var panel = document.createElement("div");
    panel.className = "gmail-sort-cheatsheet";

    var shortcuts = [
      { section: "Sort Modes" },
      { key: "Alt + 1", label: "Oldest First" },
      { key: "Alt + 2", label: "Newest First" },
      { key: "Alt + 3", label: "Sender A\u2192Z" },
      { key: "Alt + 4", label: "Sender Z\u2192A" },
      { key: "Alt + 5", label: "Unread First" },
      { key: "Alt + 6", label: "Toggle Group by Sender" },
      { section: "Filters & Search" },
      { key: "/", label: "Focus search bar" },
      { key: "Esc", label: "Clear search / close" },
      { key: "Alt + 0", label: "Clear all filters" },
      { section: "Other" },
      { key: "?", label: "Toggle this cheat sheet" }
    ];

    var html = '<div class="gmail-sort-cheatsheet-title">' + ICONS.keyboard + ' Keyboard Shortcuts</div>' +
               '<div class="gmail-sort-cheatsheet-subtitle">InboxSort v1.0.0 — Made by Alex Brecher</div>';

    for (var i = 0; i < shortcuts.length; i++) {
      var s = shortcuts[i];
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

    requestAnimationFrame(function () {
      backdrop.classList.add("gmail-sort-cheatsheet-visible");
    });

    // Click backdrop to close
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) toggleCheatSheet();
    });
  }

  // ── Bulk select / deselect visible (non-dimmed) emails ─────────────

  function bulkSelectVisible() {
    var rows = getVisibleEmailRows(false);
    var visibleRows = [];
    var alreadySelected = 0;

    for (var i = 0; i < rows.length; i++) {
      if (rows[i].classList.contains("gmail-sort-dim")) continue;
      visibleRows.push(rows[i]);
      var cb = rows[i].querySelector('div[role="checkbox"]');
      if (cb && cb.getAttribute("aria-checked") === "true") alreadySelected++;
    }

    if (visibleRows.length === 0) {
      showNotification("No visible emails");
      return;
    }

    // Toggle: if all visible are selected → deselect; otherwise → select all
    var shouldDeselect = alreadySelected === visibleRows.length;
    var changed = 0;

    for (var j = 0; j < visibleRows.length; j++) {
      var checkbox = visibleRows[j].querySelector('div[role="checkbox"]');
      if (!checkbox) continue;
      var isChecked = checkbox.getAttribute("aria-checked") === "true";
      if (shouldDeselect && isChecked) { checkbox.click(); changed++; }
      else if (!shouldDeselect && !isChecked) { checkbox.click(); changed++; }
    }

    if (shouldDeselect) {
      showNotification(changed + " email" + (changed !== 1 ? "s" : "") + " deselected");
    } else {
      showNotification(changed + " email" + (changed !== 1 ? "s" : "") + " selected");
    }
  }

  // ── Refresh all UI elements ──────────────────────────────────────

  function refreshUI() {
    updateUI();
    updateStats();
    applyAllFilters();
  }

  // ── Apply sort (main entry point) ─────────────────────────────────

  function applySort(mode, silent) {
    if (isNavigating) return;

    // Cancel snooze if user explicitly changes sort during snooze
    if (!silent && snoozeTimer) {
      cancelSnooze();
    }

    clearSortTransforms();

    if (mode === "newest") {
      currentSort = "newest";
      saveState();
      refreshUI();
      if (!silent) {
        showNotification(groupEnabled ? "Grouped by sender" : "Default order restored");
      }

      // If group is enabled, still need to apply transforms for grouping
      if (groupEnabled) {
        var gc = applySortTransforms("newest", !silent, true);
        if (gc > 0) startGroupStyleInterval();
      } else if (originalPage && location.hash !== originalPage) {
        isNavigating = true;
        location.hash = originalPage;
        originalPage = null;
        setTimeout(function () { isNavigating = false; }, 2000);
      }
      return;
    }

    if (mode === "oldest") {
      var pag = parsePagination();
      var lastPage = getLastPageNumber();

      if (!pag || lastPage <= 1 || isOnLastPage()) {
        var count = applySortTransforms("oldest", !silent, true);
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

      var oldPag = getCurrentPaginationText();
      var baseHash = location.hash.replace(/\/p\d+$/, "");
      location.hash = baseHash + "/p" + lastPage;

      waitForNewPage(oldPag, function (loaded) {
        isNavigating = false;
        if (loaded) {
          var cnt = applySortTransforms("oldest", !silent);
          currentSort = "oldest";
          saveState();
          refreshUI();
          if (cnt > 0 && !silent) showNotification(groupEnabled ? "Grouped, oldest first" : "Sorted oldest first");
          if (groupEnabled && cnt > 0) startGroupStyleInterval();
        } else {
          if (!silent) showNotification("Timed out. Try again.");
        }
      });
      return;
    }

    // senderAZ, senderZA, unreadFirst
    var modeObj = null;
    for (var mi = 0; mi < SORT_MODES.length; mi++) {
      if (SORT_MODES[mi].id === mode) { modeObj = SORT_MODES[mi]; break; }
    }
    var sortedCount = applySortTransforms(mode, !silent, true);
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
  }

  // ── Toggle group overlay ───────────────────────────────────────────

  function toggleGroup() {
    groupEnabled = !groupEnabled;
    saveState();
    // Re-apply current sort with or without group overlay
    clearSortTransforms();
    if (currentSort === "newest" && !groupEnabled) {
      // Just turning off group while on default order — simple refresh
      refreshUI();
      showNotification("Grouping off");
      return;
    }
    var sortedCount = applySortTransforms(currentSort === "newest" ? "newest" : currentSort, true, true);
    refreshUI();
    if (groupEnabled) {
      showNotification("Grouped by sender");
      if (sortedCount > 0) startGroupStyleInterval();
    } else {
      showNotification("Grouping off");
    }
  }

  // ── Snooze sort ───────────────────────────────────────────────────

  function snoozeSort(minutes) {
    // Cancel any existing snooze
    cancelSnooze();

    snoozedSort = currentSort;
    snoozeEndTime = Date.now() + minutes * 60000;

    // Revert to default visually, but do NOT save "newest" to storage
    clearSortTransforms();
    currentSort = "newest";
    refreshUI();
    showNotification("Sorting paused for " + minutes + " min");

    // Set timer to restore sort
    snoozeTimer = setTimeout(function () {
      var restore = snoozedSort;
      cancelSnooze();
      if (restore && restore !== "newest") {
        applySort(restore, false);
        showNotification("Sorting resumed");
      }
    }, minutes * 60000);

    // Tick timer to update the snooze badge every minute
    snoozeTickTimer = setInterval(function () {
      updateStats();
      if (!snoozeTimer || snoozeEndTime <= Date.now()) {
        clearInterval(snoozeTickTimer);
        snoozeTickTimer = null;
      }
    }, 30000);

    updateStats();
  }

  function cancelSnooze() {
    if (snoozeTimer) { clearTimeout(snoozeTimer); snoozeTimer = null; }
    if (snoozeTickTimer) { clearInterval(snoozeTickTimer); snoozeTickTimer = null; }
    snoozedSort = null;
    snoozeEndTime = 0;
  }

  // ── UI state updates ──────────────────────────────────────────────

  function updateUI() {
    if (!container) return;

    // Update sort mode tabs (skip group toggle — handled separately below)
    var tabs = container.querySelectorAll(".gmail-sort-tab:not(.gmail-sort-group-toggle)");
    for (var i = 0; i < tabs.length; i++) {
      var modes = (tabs[i].getAttribute("data-modes") || "").split(",");
      var isActive = modes.indexOf(currentSort) !== -1;
      tabs[i].classList.toggle("gmail-sort-tab-active", isActive);

      var iconEl = tabs[i].querySelector(".gmail-sort-tab-icon");
      var labelEl = tabs[i].querySelector(".gmail-sort-tab-label");

      if (isActive) {
        var modeObj = null;
        for (var m = 0; m < SORT_MODES.length; m++) {
          if (SORT_MODES[m].id === currentSort) { modeObj = SORT_MODES[m]; break; }
        }
        if (modeObj) {
          if (iconEl) iconEl.innerHTML = ICONS[modeObj.icon];
          if (labelEl) labelEl.textContent = modeObj.tabLabel;
        }
      } else {
        var tgId = tabs[i].getAttribute("data-tab-group");
        for (var tgi = 0; tgi < TAB_GROUPS.length; tgi++) {
          if (TAB_GROUPS[tgi].id === tgId) {
            if (iconEl) iconEl.innerHTML = ICONS[TAB_GROUPS[tgi].defaultIcon];
            if (labelEl) labelEl.textContent = TAB_GROUPS[tgi].defaultLabel;
            break;
          }
        }
      }
    }

    // Update group toggle button
    var groupBtn = container.querySelector(".gmail-sort-group-toggle");
    if (groupBtn) {
      groupBtn.classList.toggle("gmail-sort-tab-active", groupEnabled);
    }
  }

  // ── Toast notification ────────────────────────────────────────────

  function showNotification(message) {
    var existing = document.querySelector(".gmail-sort-toast");
    if (existing) existing.remove();

    var toast = document.createElement("div");
    toast.className = "gmail-sort-toast";
    if (isDarkMode) toast.classList.add("gmail-sort-dark");
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add("gmail-sort-toast-visible");
    });
    setTimeout(function () {
      toast.classList.remove("gmail-sort-toast-visible");
      setTimeout(function () { if (toast.parentNode) toast.remove(); }, 250);
    }, 2000);
  }

  // ── View detection ────────────────────────────────────────────────

  function isListView() {
    var hash = location.hash;
    if (hash === "" || hash === "#" || hash === "#inbox") return true;
    if (/^#inbox\/p\d+$/.test(hash)) return true;
    var parts = hash.split("/");
    var lastPart = parts[parts.length - 1];
    if (/^p\d+$/.test(lastPart)) return true;
    if (lastPart.length >= 15 && /^[A-Za-z0-9_-]+$/.test(lastPart)) return false;
    return true;
  }

  function isSearchView() {
    return /^#search\//.test(location.hash);
  }

  // ── Button injection & visibility ─────────────────────────────────

  function isButtonInjected() {
    return !!(container && container.isConnected);
  }

  function isStatsInjected() {
    return !!(statsBar && statsBar.isConnected);
  }

  function updateButtonVisibility() {
    if (!container) return;
    var inList = isListView();
    container.classList.toggle("gmail-sort-hidden", !inList);
    if (!inList) clearFilters();
  }

  function applyHiddenTabs() {
    if (!container) return;
    var tabs = container.querySelectorAll(".gmail-sort-tab");
    for (var i = 0; i < tabs.length; i++) {
      // Group toggle: check hiddenTabs.groupSender directly
      if (tabs[i].classList.contains("gmail-sort-group-toggle")) {
        tabs[i].style.display = hiddenTabs["groupSender"] ? "none" : "";
        continue;
      }
      var tabGroup = tabs[i].getAttribute("data-tab-group");
      var modes = (tabs[i].getAttribute("data-modes") || "").split(",");
      // Hide if ALL modes in the group are hidden
      var allHidden = modes.length > 0;
      for (var m = 0; m < modes.length; m++) {
        if (!hiddenTabs[modes[m]]) { allHidden = false; break; }
      }
      if (tabGroup && allHidden) {
        tabs[i].style.display = "none";
      } else {
        tabs[i].style.display = "";
      }
    }
  }

  function injectButton() {
    if (isButtonInjected()) return;

    var old = document.querySelectorAll(".gmail-sort-container");
    for (var x = 0; x < old.length; x++) old[x].remove();
    var oldStats = document.querySelectorAll(".gmail-sort-stats");
    for (var y = 0; y < oldStats.length; y++) oldStats[y].remove();

    var toolbar = document.querySelector('div[gh="tm"]');
    if (!toolbar) return;

    detectDarkMode();

    container = document.createElement("div");
    container.className = "gmail-sort-container";
    container.setAttribute("role", "toolbar");
    container.setAttribute("aria-label", "InboxSort — email sorting and filtering");
    if (isDarkMode) container.classList.add("gmail-sort-dark");

    // ─ Sort tabs (merged toggles) ─
    for (var i = 0; i < TAB_GROUPS.length; i++) {
      var tg = TAB_GROUPS[i];
      var tab = document.createElement("button");
      tab.className = "gmail-sort-tab";
      tab.type = "button";
      tab.setAttribute("data-tab-group", tg.id);
      tab.setAttribute("data-modes", tg.modes.join(","));
      tab.setAttribute("aria-label", "Sort by " + tg.defaultLabel);
      tab.setAttribute("title", "Sort by " + tg.defaultLabel);
      tab.innerHTML =
        '<span class="gmail-sort-tab-icon">' + ICONS[tg.defaultIcon] + "</span>" +
        '<span class="gmail-sort-tab-label">' + tg.defaultLabel + "</span>";
      container.appendChild(tab);
    }

    // ─ Group toggle (independent of sort mode) ─
    var groupBtn = document.createElement("button");
    groupBtn.className = "gmail-sort-tab gmail-sort-group-toggle";
    groupBtn.type = "button";
    groupBtn.setAttribute("aria-label", "Group emails by sender");
    groupBtn.setAttribute("title", "Group emails by sender");
    groupBtn.innerHTML =
      '<span class="gmail-sort-tab-icon">' + ICONS.groupSender + "</span>" +
      '<span class="gmail-sort-tab-label">Group</span>';
    container.appendChild(groupBtn);

    // ─ Divider ─
    container.appendChild(createDivider());

    // ─ Search bar ─
    var searchWrap = document.createElement("div");
    searchWrap.className = "gmail-sort-search-wrap";

    var searchIcon = document.createElement("span");
    searchIcon.className = "gmail-sort-search-icon";
    searchIcon.innerHTML = ICONS.search;
    searchWrap.appendChild(searchIcon);

    var searchInput = document.createElement("input");
    searchInput.className = "gmail-sort-search-input";
    searchInput.type = "text";
    searchInput.placeholder = "Filter emails\u2026";
    searchInput.setAttribute("aria-label", "Filter visible emails by sender, subject, or snippet");
    searchInput.spellcheck = false;
    searchInput.autocomplete = "off";
    searchWrap.appendChild(searchInput);

    var searchCount = document.createElement("span");
    searchCount.className = "gmail-sort-search-count";
    searchWrap.appendChild(searchCount);

    var searchClose = document.createElement("button");
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

    // Insert container above toolbar
    toolbar.parentNode.insertBefore(container, toolbar);

    applyAccentColor();
    applyHiddenTabs();
    updateUI();
    updateButtonVisibility();
    updateStats();
  }

  function createDivider() {
    var d = document.createElement("span");
    d.className = "gmail-sort-divider";
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

  document.addEventListener("click", function (e) {
    if (!e.target) return;

    try {
      // Stats bar click (filter toggle + bulk select)
      if (statsBar && statsBar.isConnected) {
        // Bulk select button
        var bulkBtn = safeClosest(e.target, ".gmail-sort-bulk-select");
        if (bulkBtn && statsBar.contains(bulkBtn)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          bulkSelectVisible();
          // Refresh stats so button text updates (select ↔ deselect)
          setTimeout(updateStats, 50);
          return;
        }

        var stat = safeClosest(e.target, ".gmail-sort-stat-clickable");
        if (stat && statsBar.contains(stat)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          var statType = stat.getAttribute("data-stat");
          if (statType === "unread") filterUnread = !filterUnread;
          else if (statType === "starred") filterStarred = !filterStarred;
          else if (statType === "attachment") filterAttachment = !filterAttachment;
          applyAllFilters();
          updateStats();
          return;
        }
      }

      if (!container || !container.isConnected) return;

      // Group toggle click
      var groupToggle = safeClosest(e.target, ".gmail-sort-group-toggle");
      if (groupToggle && container.contains(groupToggle)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        toggleGroup();
        return;
      }

      // Sort tab click (cycle through modes in the tab group)
      var tab = safeClosest(e.target, ".gmail-sort-tab:not(.gmail-sort-group-toggle)");
      if (tab && container.contains(tab)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var modes = (tab.getAttribute("data-modes") || "").split(",");
        if (modes.length > 0) {
          var curIdx = modes.indexOf(currentSort);
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
      var sClose = safeClosest(e.target, ".gmail-sort-search-close");
      if (sClose && container.contains(sClose)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        searchQuery = "";
        var input = container.querySelector(".gmail-sort-search-input");
        if (input) input.value = "";
        applyAllFilters();
        return;
      }

      // Search input / wrap
      var sWrap = safeClosest(e.target, ".gmail-sort-search-input") ||
                  safeClosest(e.target, ".gmail-sort-search-wrap");
      if (sWrap && container.contains(sWrap)) {
        e.stopImmediatePropagation();
        return;
      }
    } catch (err) {
      console.warn("[InboxSort] click handler error:", err);
    }
  }, true);

  document.addEventListener("mousedown", function (e) {
    if (!e.target) return;
    try {
      // Stats bar
      if (statsBar && statsBar.isConnected) {
        var bulkHit = safeClosest(e.target, ".gmail-sort-bulk-select");
        if (bulkHit && statsBar.contains(bulkHit)) { e.stopImmediatePropagation(); return; }
        var statHit = safeClosest(e.target, ".gmail-sort-stat-clickable");
        if (statHit && statsBar.contains(statHit)) {
          e.stopImmediatePropagation();
          return;
        }
      }
      if (!container || !container.isConnected) return;
      var hit = safeClosest(e.target, ".gmail-sort-tab") ||
                safeClosest(e.target, ".gmail-sort-search-close") ||
                safeClosest(e.target, ".gmail-sort-search-input") ||
                safeClosest(e.target, ".gmail-sort-search-wrap");
      if (hit && container.contains(hit)) {
        e.stopImmediatePropagation();
      }
    } catch (err) {
      console.warn("[InboxSort] mousedown handler error:", err);
    }
  }, true);

  // Search input (bubbling phase, debounced 150ms)
  var _searchDebounce = null;
  document.addEventListener("input", function (e) {
    if (!e.target || !e.target.classList || !e.target.classList.contains("gmail-sort-search-input")) return;
    searchQuery = e.target.value;
    if (_searchDebounce) clearTimeout(_searchDebounce);
    _searchDebounce = setTimeout(function () {
      _searchDebounce = null;
      applyAllFilters();
    }, 150);
  }, false);

  // Escape key in search input (capturing phase)
  document.addEventListener("keydown", function (e) {
    if (!e.target || !e.target.classList) return;

    // Search input: Escape clears search text only, stop propagation always
    if (e.target.classList.contains("gmail-sort-search-input")) {
      if (e.key === "Escape") {
        e.preventDefault();
        searchQuery = "";
        e.target.value = "";
        applyAllFilters();
        e.target.blur();
      }
      e.stopImmediatePropagation();
      return;
    }

    // "?" to toggle cheat sheet (Shift+/ on US layout, or raw ?)
    if (e.key === "?" && !e.altKey && !e.ctrlKey && !e.metaKey) {
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

    // "/" to focus search (when not in any input)
    if (e.key === "/" && !e.altKey && !e.ctrlKey && !e.metaKey) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
      if (!container || !container.isConnected) return;
      var searchEl = container.querySelector(".gmail-sort-search-input");
      if (searchEl) {
        e.preventDefault();
        e.stopPropagation();
        searchEl.focus();
        return;
      }
    }

    // Keyboard shortcuts: Alt+number (when not in any input)
    if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
      if (!container || !container.isConnected) return;

      var handled = true;
      switch (e.code) {
        case "Digit1": applySort("oldest", false); break;
        case "Digit2": applySort("newest", false); break;
        case "Digit3": applySort("senderAZ", false); break;
        case "Digit4": applySort("senderZA", false); break;
        case "Digit5": applySort("unreadFirst", false); break;
        case "Digit6": toggleGroup(); break;
        case "Digit0": clearFilters(); refreshUI(); break;
        default: handled = false;
      }
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }, true);

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
    _autoSortPending = true;

    loadState(function () {
      applyAccentColor();

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

      // Wait for rows, then apply sort
      var attempts = 0;
      var maxAttempts = 40;
      autoSortInterval = setInterval(function () {
        attempts++;
        var rows = getVisibleEmailRows(true);
        if (rows.length > 0 && !hasAutoSorted) {
          clearInterval(autoSortInterval);
          autoSortInterval = null;
          hasAutoSorted = true;
          _autoSortPending = false;
          setTimeout(function () { applySort(currentSort, true); }, 300);
        }
        if (attempts >= maxAttempts) {
          clearInterval(autoSortInterval);
          autoSortInterval = null;
          _autoSortPending = false;
        }
      }, 500);
    });
  }

  // ── MutationObserver ──────────────────────────────────────────────

  // Strip Gmail overlay params (compose, reply, forward, etc.) so
  // opening/closing Compose doesn't trigger a full sort reset.
  function stripGmailOverlayParams(url) {
    return url.replace(/[\?&](compose|view|tf|fs|to|su|body|source|sz|simpl|rm|ms|search|th|cvid|qs|cs)=[^&]*/g, "")
              .replace(/[?&]$/, "");
  }

  function observe() {
    var lastUrl = stripGmailOverlayParams(location.href);

    _observer = new MutationObserver(function () {
      if (_observerDebounce) clearTimeout(_observerDebounce);
      _observerDebounce = setTimeout(function () {
        _observerDebounce = null;

        if (!isButtonInjected()) {
          injectButton();
          // DOM was rebuilt — reset auto-sort flag so we re-sort
          if (hasAutoSorted && isListView() && autoSortEnabled && currentSort !== "newest") {
            hasAutoSorted = false;
            autoSortWhenReady();
          }
        }
        if (!isStatsInjected() && container && container.isConnected) {
          // Clean up any orphaned stats bars
          var oldS = container.querySelectorAll(".gmail-sort-stats");
          for (var si = 0; si < oldS.length; si++) oldS[si].remove();
          createStatsBar();
          // Insert before search wrap so layout order is preserved
          var searchWrapEl = container.querySelector(".gmail-sort-search-wrap");
          if (searchWrapEl) {
            container.insertBefore(statsBar, searchWrapEl);
          } else {
            container.appendChild(statsBar);
          }
          updateStats();
        }

        // Throttled stats update
        var now = Date.now();
        if (now - lastStatsUpdate > 1500) {
          lastStatsUpdate = now;
          updateStats();
        }

        // Compare URLs ignoring Gmail overlay params (compose, reply, etc.)
        // so opening Compose / Reply / Forward doesn't flash-reset the sort.
        var currentUrl = stripGmailOverlayParams(location.href);
        if (currentUrl !== lastUrl) {
          lastUrl = currentUrl;
          fullInvalidateRowCache();
          updateButtonVisibility();
          // Clear search debounce on navigation — prevents stale filter applying to new page
          if (_searchDebounce) { clearTimeout(_searchDebounce); _searchDebounce = null; }
          if (!isNavigating) {
            clearSortTransforms();
            originalPage = null;  // User navigated manually — clear stale page ref
            clearFilters();
            hasAutoSorted = false;

            if (isListView()) {
              autoSortWhenReady();
            }
          }
        }
      }, 250);
    });

    _observer.observe(document.body, { childList: true, subtree: true });
  }

  // ── Message listener (from popup) ─────────────────────────────────

  chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
    if (!msg) return;

    switch (msg.action) {
      case "applySort":
        if (msg.mode === "groupSender") {
          // Legacy: popup sends groupSender → toggle group overlay
          toggleGroup();
        } else if (msg.mode) {
          applySort(msg.mode, false);
        }
        break;

      case "toggleGroup":
        toggleGroup();
        break;

      case "resetDefault":
        cancelSnooze();
        filterStarred = false;
        filterUnread = false;
        filterAttachment = false;
        groupEnabled = false;
        applySort("newest", false);
        break;

      case "setAccentColor":
        if (msg.color) {
          accentColor = msg.color;
          applyAccentColor();
        }
        break;

      case "toggleFilter":
        if (msg.filter === "starred") filterStarred = !filterStarred;
        else if (msg.filter === "unread") filterUnread = !filterUnread;
        else if (msg.filter === "attachment") filterAttachment = !filterAttachment;
        applyAllFilters();
        updateStats();
        break;

      case "snoozeSort":
        if (msg.minutes) snoozeSort(msg.minutes);
        break;

      case "cancelSnooze":
        cancelSnooze();
        showNotification("Snooze cancelled");
        updateStats();
        break;

      case "setHiddenTabs":
        if (msg.hiddenTabs) {
          hiddenTabs = msg.hiddenTabs;
          applyHiddenTabs();
        }
        break;

      case "getState":
        sendResponse({
          sortMode: currentSort,
          groupEnabled: groupEnabled,
          filterStarred: filterStarred,
          filterUnread: filterUnread,
          filterAttachment: filterAttachment,
          autoSort: autoSortEnabled,
          perLabel: perLabelEnabled,
          hiddenTabs: hiddenTabs,
          isSnoozed: !!snoozeTimer,
          snoozeRemaining: snoozeTimer ? Math.max(0, Math.ceil((snoozeEndTime - Date.now()) / 60000)) : 0,
          snoozedSort: snoozedSort
        });
        return true; // async response
    }
  });

  // ── Cleanup on page unload ──────────────────────────────────────
  window.addEventListener("beforeunload", function () {
    if (autoSortInterval)    { clearInterval(autoSortInterval);    autoSortInterval = null; }
    if (_groupStyleInterval) { clearInterval(_groupStyleInterval); _groupStyleInterval = null; }
    if (_observerDebounce)   { clearTimeout(_observerDebounce);    _observerDebounce = null; }
    if (_searchDebounce)     { clearTimeout(_searchDebounce);      _searchDebounce = null; }
    if (snoozeTimer)         { clearTimeout(snoozeTimer);          snoozeTimer = null; }
    if (snoozeTickTimer)     { clearInterval(snoozeTickTimer);     snoozeTickTimer = null; }
    if (_observer)           { _observer.disconnect();             _observer = null; }
    if (_initWaitInterval)   { clearInterval(_initWaitInterval);   _initWaitInterval = null; }
    if (_initSafetyTimeout)  { clearTimeout(_initSafetyTimeout);   _initSafetyTimeout = null; }
    if (_waitForNewPage)     { clearInterval(_waitForNewPage);     _waitForNewPage = null; }
  });

  // ── Initialisation ────────────────────────────────────────────────

  function init() {
    _initWaitInterval = setInterval(function () {
      if (document.querySelector('div[role="main"]')) {
        clearInterval(_initWaitInterval);
        _initWaitInterval = null;
        if (_initSafetyTimeout) { clearTimeout(_initSafetyTimeout); _initSafetyTimeout = null; }
        injectButton();
        observe();
        autoSortWhenReady(true); // force=true: always restore stored sort on initial load
      }
    }, 500);

    _initSafetyTimeout = setTimeout(function () {
      if (_initWaitInterval) { clearInterval(_initWaitInterval); _initWaitInterval = null; }
      _initSafetyTimeout = null;
    }, 30000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
