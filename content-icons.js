// InboxSort: inline SVG icons for the Gmail toolbar (static markup only).
(function () {
  "use strict";

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

  globalThis.InboxSort = globalThis.InboxSort || {};
  globalThis.InboxSort.ICONS = ICONS;
})();
