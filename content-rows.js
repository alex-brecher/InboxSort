// InboxSort: reading Gmail rows and comparing them (pure DOM reads).
(function () {
  "use strict";

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

  globalThis.InboxSort = globalThis.InboxSort || {};
  Object.assign(globalThis.InboxSort, {
    parseGmailDate: parseGmailDate,
    getDateFromRow: getDateFromRow,
    getSenderFromRow: getSenderFromRow,
    isUnread: isUnread,
    isRowStarred: isRowStarred,
    isRowHasAttachment: isRowHasAttachment,
    getComparator: getComparator,
    wrapWithGroupSort: wrapWithGroupSort
  });
})();
