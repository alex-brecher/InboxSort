# InboxSort -- Comprehensive QA Test Plan

**Extension:** InboxSort v1.1.0
**Manifest Version:** 3
**Target:** Gmail web client (`https://mail.google.com/*`)
**Date:** 2026-03-07
**Tester:** _______________
**Environment:** Chrome / Edge Chromium on macOS / Windows / Linux

---

## Priority Definitions

| Level | Meaning | Criteria |
|-------|---------|----------|
| **P0** | Blocker / Critical | Core functionality broken; data loss; extension crash; Gmail rendered unusable; install failure |
| **P1** | High | Major feature does not work as intended; significant UX degradation; state persistence failure |
| **P2** | Medium | Minor visual issue; edge case; cosmetic defect; performance concern; polish item |

---

## Test Result Legend

| Symbol | Meaning |
|--------|---------|
| `[ ]`  | Not yet tested |
| `[x]`  | Tested -- PASS |
| `[!]`  | Tested -- FAIL (see notes column) |

---

## 1. Installation & First Run

| ID | Test Case | Priority | Status | Notes |
|----|-----------|----------|--------|-------|
| TC-1.01 | Load unpacked extension from project directory -- no errors on `chrome://extensions` page | P0 | `[ ]` | |
| TC-1.02 | Extension appears with name "InboxSort", version "1.1.0", and correct icons (16/48/128px) | P0 | `[ ]` | |
| TC-1.03 | Navigate to `https://mail.google.com/` -- InboxSort toolbar injects above the email list after `div[gh="tm"]` | P0 | `[ ]` | `init()` polls for `div[role="main"]` with safety timeout |
| TC-1.04 | No InboxSort DOM elements or console output on non-Gmail sites (google.com, yahoo mail, outlook) | P0 | `[ ]` | `matches` pattern restricts to `mail.google.com` |
| TC-1.05 | Default state on first run: sort=newest, group=OFF, filters=none, auto-sort=OFF, per-label=OFF, accent=blue (index 0), all tabs visible | P1 | `[ ]` | Clear storage first via `chrome.storage.sync.clear()` |
| TC-1.06 | Popup opens from toolbar icon with correct layout: 340px width, header, all cards, footer with version | P1 | `[ ]` | |
| TC-1.07 | Toolbar is hidden on excluded labels: navigate to Sent (`#sent`) and All Mail (`#all`) -- container has `display: none` | P1 | `[ ]` | `EXCLUDED_LABELS = { sent: true, all: true }` |
| TC-1.08 | Stats bar injects below toolbar showing total, unread, starred, attachment counts | P1 | `[ ]` | |
| TC-1.09 | Toolbar injects within 5 seconds of Gmail page load | P1 | `[ ]` | `INIT_POLL` interval with `INIT_TIMEOUT` safety |
| TC-1.10 | No console errors from `content.js` or `popup.js` during initial load | P2 | `[ ]` | |
| TC-1.11 | Extension icon displays correctly at all three manifest sizes (16px toolbar, 48px extensions page, 128px store) | P2 | `[ ]` | |

---

## 2. Sort Modes

| ID | Test Case | Priority | Status | Notes |
|----|-----------|----------|--------|-------|
| TC-2.01 | Click Date tab once -- activates "oldest" sort; emails reorder with oldest at top | P0 | `[ ]` | |
| TC-2.02 | Click Date tab again -- cycles to "newest" sort; emails reorder with newest at top | P0 | `[ ]` | |
| TC-2.03 | Click Sender tab once -- activates "senderAZ"; emails sort alphabetically by sender (A at top) | P0 | `[ ]` | Uses `localeCompare` on sender from `span[email]` or `span.bA4` |
| TC-2.04 | Click Sender tab again -- cycles to "senderZA"; emails sort Z-A | P0 | `[ ]` | |
| TC-2.05 | Click Unread tab -- activates "unreadFirst"; unread emails (`tr.zE`) appear above read emails | P0 | `[ ]` | Stable sort preserves original order within groups |
| TC-2.06 | Tab cycling: Date tab clicks: oldest -> newest -> deactivate (no highlight). Sender: senderAZ -> senderZA -> deactivate. Unread: unreadFirst -> deactivate | P1 | `[ ]` | `TAB_GROUPS` defines cycle order |
| TC-2.07 | Switching tabs: activate oldest via Date, then click Sender -- Date deactivates, Sender activates senderAZ; only one sort mode active at a time | P1 | `[ ]` | |
| TC-2.08 | Sort uses CSS `transform: translateY()` and does NOT reorder DOM elements | P1 | `[ ]` | Inspect via DevTools Elements panel |
| TC-2.09 | Sort handles variable row heights correctly -- no overlapping or gaps between rows | P1 | `[ ]` | `applySortTransforms()` uses actual `offsetTop`/`offsetHeight` per row |
| TC-2.10 | Sort with mixed date formats: "Mar 7", "Feb 28", "11:30 AM", "2025-12-01" -- all parse correctly | P1 | `[ ]` | `parseGmailDate()` handles 3+ formats |
| TC-2.11 | "Oldest" sort on multi-page inbox navigates to last page before sorting | P1 | `[ ]` | Clicks "oldest" pagination link, then `waitForNewPage()` |
| TC-2.12 | After "Oldest" page navigation, poll waits for new content before sorting (200ms interval, 10s timeout) | P1 | `[ ]` | |
| TC-2.13 | Sort animation: rows transition smoothly with staggered delays (6ms/row, max 300ms total), cubic-bezier easing | P2 | `[ ]` | |
| TC-2.14 | Rapidly switch sort modes (5+ clicks in 2 seconds) -- final sort state correct, no visual corruption | P1 | `[ ]` | Reentrancy guard `_sortInProgress` |
| TC-2.15 | Active sort tab shows `.active` class with accent-color background and correct icon | P2 | `[ ]` | |
| TC-2.16 | Sort tabs display both icon and label text at viewport > 900px | P2 | `[ ]` | |

---

## 3. Group by Sender

| ID | Test Case | Priority | Status | Notes |
|----|-----------|----------|--------|-------|
| TC-3.01 | Click group toggle button -- emails group by sender with alternating background colors (even=accent-light, odd=transparent) | P0 | `[ ]` | |
| TC-3.02 | Sender badge appears on first email of each group showing sender name and count in parentheses | P1 | `[ ]` | `.inboxsort-sender-badge` span element |
| TC-3.03 | Group works with every sort mode: oldest, newest, senderAZ, senderZA, unreadFirst | P0 | `[ ]` | `wrapWithGroupSort()` wraps comparators: primary=sender, secondary=selected sort |
| TC-3.04 | First row of each group has top divider/border (box-shadow) | P2 | `[ ]` | |
| TC-3.05 | Accent-colored left bar (box-shadow on `<td>` elements) appears within grouped rows | P2 | `[ ]` | |
| TC-3.06 | Disable grouping -- all badges, backgrounds, and box-shadow dividers removed cleanly | P1 | `[ ]` | `clearGroupBadges()` + `clearGroupInlineStyles()` |
| TC-3.07 | Group styles persist after Gmail loads new content; adaptive re-application: 400ms fast phase (first 10s) -> 2s slow phase -> auto-stop at 2 minutes | P1 | `[ ]` | `reapplyGroupStyles()` with dirty-checking |
| TC-3.08 | Dirty-check sampling: 3 even-group rows (beginning, middle, end) checked for style presence before re-applying | P2 | `[ ]` | Performance optimization |
| TC-3.09 | Single-timer approach (setTimeout chaining) prevents orphaned interval timers | P2 | `[ ]` | Not using setInterval |
| TC-3.10 | Group badge does not duplicate if `reapplyGroupStyles` fires in quick succession | P1 | `[ ]` | Guard: `querySelector(".gmail-sort-group-badge")` |
| TC-3.11 | Group toggle state persists across page navigation and reloads via `chrome.storage.sync` | P1 | `[ ]` | |
| TC-3.12 | Toggling group cancels any active snooze via `cancelSnooze(false)` | P1 | `[ ]` | |

---

## 4. Filters (Search, Starred, Attachments, Unread)

| ID | Test Case | Priority | Status | Notes |
|----|-----------|----------|--------|-------|
| TC-4.01 | Click search icon or press `/` -- search input expands and receives focus | P0 | `[ ]` | |
| TC-4.02 | Type search text -- emails not matching are dimmed (opacity 0.35, pointer-events none via `.inboxsort-dimmed`) | P0 | `[ ]` | |
| TC-4.03 | Search matches against: sender name, sender email, subject, and snippet text | P1 | `[ ]` | |
| TC-4.04 | Search is case-insensitive (`.toLowerCase()` comparison) | P1 | `[ ]` | |
| TC-4.05 | Search debounces input at 150ms -- no excessive re-filtering during rapid typing | P2 | `[ ]` | `CONFIG.SEARCH_DEBOUNCE_MS` |
| TC-4.06 | Match count badge appears next to search input showing number of matching rows | P2 | `[ ]` | `.gmail-sort-search-count` |
| TC-4.07 | Click X button in search bar -- filter clears, all rows restored to full opacity, input collapses | P1 | `[ ]` | |
| TC-4.08 | Press Escape while search input focused -- clears text and blurs input | P1 | `[ ]` | |
| TC-4.09 | Activate "Starred" filter from popup -- only starred emails remain visible | P1 | `[ ]` | Detection: `aria-label`/`title` containing "Starred" (not "Not starred"), yellow color, `data-tooltip` |
| TC-4.10 | Activate "Has Attachment" filter from popup -- only emails with attachments visible | P1 | `[ ]` | Detection: `span.brd`, `img[src*="attachment"]`, paperclip icon |
| TC-4.11 | Activate "Unread" filter from popup -- only unread emails (`tr.zE`) visible | P1 | `[ ]` | |
| TC-4.12 | Combined filters: starred AND attachment AND search text -- AND logic via `applyAllFilters()` | P1 | `[ ]` | |
| TC-4.13 | Filters work correctly with an active sort -- visible rows appear sorted, dimmed rows hidden | P1 | `[ ]` | |
| TC-4.14 | Filters work correctly with group-by-sender active | P1 | `[ ]` | |
| TC-4.15 | Search works in search view (`#search/` URL prefix) | P2 | `[ ]` | |

---

## 5. Stats Bar

| ID | Test Case | Priority | Status | Notes |
|----|-----------|----------|--------|-------|
| TC-5.01 | Stats bar appears below toolbar showing: total, unread, starred, attachment counts | P1 | `[ ]` | |
| TC-5.02 | Stats update correctly when sort/filter changes | P1 | `[ ]` | `updateStats()` |
| TC-5.03 | Click stat chips (starred/unread/attachments) -- toggles corresponding filter on/off | P1 | `[ ]` | `data-filter` attribute on chips |
| TC-5.04 | Active filter chip shows highlighted/accent styling | P2 | `[ ]` | `.active` class on chip |
| TC-5.05 | Multiple filter chips can be active simultaneously | P1 | `[ ]` | |
| TC-5.06 | Stats bar shows snooze badge with countdown timer when sort is paused | P2 | `[ ]` | |
| TC-5.07 | Stats counts use delta-check caching (key: total/unread/starred/attach/filter/snooze/vis/sel) -- DOM not rebuilt if unchanged | P2 | `[ ]` | Performance optimization |
| TC-5.08 | Dot separators appear between stat items | P2 | `[ ]` | `.gmail-sort-stat-dot` |
| TC-5.09 | Stats bar re-injects if removed by Gmail DOM updates (checked via `isStatsInjected()` connectivity test) | P1 | `[ ]` | |

---

## 6. Bulk Select

| ID | Test Case | Priority | Status | Notes |
|----|-----------|----------|--------|-------|
| TC-6.01 | "Select All Visible" button appears in stats bar when any filter is active and at least one row is visible | P1 | `[ ]` | |
| TC-6.02 | Click "Select All Visible" -- all non-dimmed rows have their checkboxes checked | P1 | `[ ]` | Programmatic click on `div[role="checkbox"]` |
| TC-6.03 | Retry pass at 80ms catches any checkboxes that Gmail's event handling reverted on first pass | P1 | `[ ]` | Two-pass click logic in `bulkSelectVisible()` |
| TC-6.04 | Bulk select ignores dimmed/filtered rows (only selects rows without `.inboxsort-dimmed`) | P1 | `[ ]` | |
| TC-6.05 | Bulk select button is NOT visible when no filters are active | P2 | `[ ]` | Gmail's native "Select All" handles unfiltered case |
| TC-6.06 | Toggle behavior: if all visible already selected, clicking deselects all | P2 | `[ ]` | |

---

## 7. Keyboard Shortcuts

| ID | Test Case | Priority | Status | Notes |
|----|-----------|----------|--------|-------|
| TC-7.01 | `Alt+1` activates "oldest" sort | P0 | `[ ]` | `onDocumentKeydown` handler, capturing phase |
| TC-7.02 | `Alt+2` activates "newest" sort | P0 | `[ ]` | |
| TC-7.03 | `Alt+3` activates "senderAZ" sort | P0 | `[ ]` | |
| TC-7.04 | `Alt+4` activates "senderZA" sort | P0 | `[ ]` | |
| TC-7.05 | `Alt+5` activates "unreadFirst" sort | P0 | `[ ]` | |
| TC-7.06 | `Alt+6` toggles group-by-sender on/off | P1 | `[ ]` | |
| TC-7.07 | `Alt+0` clears all sorts, filters, and grouping | P1 | `[ ]` | |
| TC-7.08 | `/` focuses InboxSort search input (prevents character from being typed via `preventDefault()`) | P1 | `[ ]` | Only when no input/textarea/contenteditable is focused |
| TC-7.09 | `?` opens keyboard shortcut cheat sheet overlay | P1 | `[ ]` | Only when not in editable target |
| TC-7.10 | `Escape` closes cheat sheet overlay if open | P1 | `[ ]` | |
| TC-7.11 | `Escape` clears search bar text and blurs input if search is focused | P1 | `[ ]` | Priority: cheatsheet close > search clear |
| TC-7.12 | `Alt+/` opens cheat sheet (alternative shortcut) | P2 | `[ ]` | |
| TC-7.13 | Pressing same `Alt+N` shortcut twice toggles sort off (cycling behavior) | P1 | `[ ]` | |
| TC-7.14 | `/` and `?` do NOT fire when user is typing in Gmail compose/reply/search fields or contenteditable elements | P0 | `[ ]` | `isEditableTarget()` guard checks active element |
| TC-7.15 | Sort shortcuts (`Alt+N`) still work even when typing in compose/reply (Alt modifier differentiates) | P1 | `[ ]` | |
| TC-7.16 | Cheat sheet content lists all shortcuts accurately and matches implemented behavior | P2 | `[ ]` | |
| TC-7.17 | Cheat sheet closes on backdrop click | P2 | `[ ]` | |

---

## 8. Popup / Settings

| ID | Test Case | Priority | Status | Notes |
|----|-----------|----------|--------|-------|
| TC-8.01 | Click each sort option in popup (Newest, Oldest, Sender A-Z, Sender Z-A, Unread First) -- Gmail applies selected sort | P0 | `[ ]` | Sends `applySort` message via `sendToContent()` |
| TC-8.02 | Selected sort option shows checkmark and accent-light background; optimistic UI update before content script confirms | P1 | `[ ]` | |
| TC-8.03 | Toggle "Group by Sender" switch -- Gmail groups/ungroups emails | P1 | `[ ]` | Sends `toggleGroup` / `setGroupEnabled` message |
| TC-8.04 | Select each of 6 accent colors (blue, green, purple, orange, red, teal) -- toolbar and group visuals update | P1 | `[ ]` | CSS custom properties: `--accent`, `--accent-hover`, `--accent-light`, `--accent-dark` |
| TC-8.05 | Color swatch shows ring/checkmark indicator for selected color | P2 | `[ ]` | |
| TC-8.06 | Enable "Auto-sort on load" -- saved sort applies on Gmail page load | P1 | `[ ]` | `autoSortWhenReady()` fast/slow path |
| TC-8.07 | Disable "Auto-sort on load" -- Gmail loads without sorting | P1 | `[ ]` | |
| TC-8.08 | Enable "Per-label preferences" -- different labels store separate sort modes and group states | P1 | `[ ]` | Keyed by `getCurrentLabel()` in storage |
| TC-8.09 | Snooze: click "15m" -- sort pauses, snooze badge shows countdown, sort restores after 15 minutes | P1 | `[ ]` | `snoozeSort(15)`, tick timer updates badge |
| TC-8.10 | Snooze: click "30m" -- 30-minute pause | P1 | `[ ]` | |
| TC-8.11 | Snooze: click "1h" -- 60-minute pause | P1 | `[ ]` | |
| TC-8.12 | Snooze: click "Cancel Pause" -- snooze ends immediately, previous sort restores | P1 | `[ ]` | `cancelSnooze(true)` |
| TC-8.13 | Applying new sort while snoozed cancels the snooze | P1 | `[ ]` | |
| TC-8.14 | Visible Sort Tabs: uncheck "Sender A-Z" and "Sender Z-A" -- both tabs hidden from toolbar | P1 | `[ ]` | `applyHiddenTabs()` |
| TC-8.15 | If ALL modes in a tab group are hidden, the entire tab group button is hidden | P1 | `[ ]` | |
| TC-8.16 | Hidden tabs configuration persists via `chrome.storage.sync` with retry at 1s and 3s after injection | P2 | `[ ]` | `refreshHiddenTabsFromStorage()` |
| TC-8.17 | Export: downloads JSON with all settings (sortMode, groupEnabled, accentColor, autoSort, perLabel, hiddenTabs, filters) | P1 | `[ ]` | |
| TC-8.18 | Import valid JSON: all settings apply and sync to content script | P1 | `[ ]` | Schema validation via `VALID_SCHEMA` |
| TC-8.19 | Import JSON with invalid sortMode -- rejected with error indicator | P1 | `[ ]` | |
| TC-8.20 | Import non-JSON / malformed file -- error message shown, settings unchanged, no crash | P1 | `[ ]` | |
| TC-8.21 | Import empty file -- error handled gracefully | P2 | `[ ]` | |
| TC-8.22 | Reset to Defaults: all settings revert (newest, no group, blue accent, auto-sort off, per-label off, all tabs visible, no filters) | P1 | `[ ]` | Sends `resetDefault` message |
| TC-8.23 | Reset clears per-label saved preferences | P1 | `[ ]` | |
| TC-8.24 | Live state sync: change sort via keyboard shortcut in Gmail -- popup reflects change within 2 seconds | P1 | `[ ]` | Polling interval sends `getState` message |
| TC-8.25 | Collapsible sections ("Visible Sort Tabs", "Shortcuts & Backup") expand/collapse correctly | P2 | `[ ]` | |
| TC-8.26 | Popup with no Gmail tab open: handles absence gracefully, shows appropriate message | P1 | `[ ]` | `getGmailTab()` returns null |
| TC-8.27 | Filter chips in popup reflect current active filters from content script | P1 | `[ ]` | Live sync |
| TC-8.28 | Footer displays correct version number matching `manifest.json` | P2 | `[ ]` | Currently shows "v1.0.1" in popup.html -- check if matches |

---

## 9. Dark Mode

| ID | Test Case | Priority | Status | Notes |
|----|-----------|----------|--------|-------|
| TC-9.01 | Enable Gmail dark theme -- toolbar auto-detects dark mode and applies dark styling | P0 | `[ ]` | 3-strategy detection: body bg luminance, text color analysis, `prefers-color-scheme` media query |
| TC-9.02 | Dark toolbar: darker background, lighter text, adjusted shadows, `.gmail-sort-dark` class | P1 | `[ ]` | |
| TC-9.03 | Dark mode accent colors switch to `DARK_ACCENT_COLORS` palette | P1 | `[ ]` | |
| TC-9.04 | Popup detects dark mode and applies `body.dark` class: dark cards, light text, adjusted colors | P1 | `[ ]` | |
| TC-9.05 | System theme change (OS dark mode toggle) triggers live dark mode update without reload | P1 | `[ ]` | `matchMedia('(prefers-color-scheme: dark)')` listener |
| TC-9.06 | Dark mode group visuals: semi-transparent accent backgrounds, readable badges, visible box-shadow dividers | P2 | `[ ]` | |
| TC-9.07 | Dark mode color picker swatches remain distinct and visible | P2 | `[ ]` | |
| TC-9.08 | Dark mode cheat sheet overlay is readable | P2 | `[ ]` | |
| TC-9.09 | Dark mode detection result is cached but invalidated on theme changes | P2 | `[ ]` | Performance: avoid repeated DOM queries |

---

## 10. Responsive / Viewport Testing (CRITICAL -- Known Bug Area)

| ID | Test Case | Priority | Status | Notes |
|----|-----------|----------|--------|-------|
| TC-10.01 | Viewport > 900px: full toolbar with icon + text labels on tabs, expanded search bar, stats visible, single line | P0 | `[ ]` | |
| TC-10.02 | Viewport 700-900px: tabs switch to icon-only mode (text labels hidden via `@media (max-width: 900px)`), layout remains single-line | P0 | `[ ]` | |
| TC-10.03 | Viewport 500-700px: further compaction -- smaller tabs, condensed controls, layout still functional | P1 | `[ ]` | `@media (max-width: 700px)` |
| TC-10.04 | **KNOWN BUG AREA** -- Viewport < 500px: `flex-wrap: wrap` applied. Check for visual jitter, overlapping elements, misalignment, toolbar height changes displacing email rows | P0 | `[ ]` | `@media (max-width: 500px)` -- reported instability |
| TC-10.05 | At < 500px: search bar expands to full width on its own line | P1 | `[ ]` | |
| TC-10.06 | At < 500px: all sort tabs remain clickable, not overlapping | P1 | `[ ]` | |
| TC-10.07 | At < 500px: apply each sort mode -- transforms recalculate correctly for new toolbar height | P0 | `[ ]` | Row `offsetTop` changes when toolbar wraps |
| TC-10.08 | At < 500px: toggle group-by-sender -- no visual artifacts | P1 | `[ ]` | |
| TC-10.09 | At < 500px: open and close search -- no layout jumps | P1 | `[ ]` | |
| TC-10.10 | Viewport resize (>10px change) triggers re-sort to recalculate `translateY` values (300ms debounce) | P1 | `[ ]` | `applySortTransforms({silent: true})` |
| TC-10.11 | Viewport resize < 10px (jitter threshold) does NOT trigger re-sort | P2 | `[ ]` | Prevents unnecessary re-sorts from minor adjustments |
| TC-10.12 | Cheat sheet overlay scrollable if content overflows at narrow viewports | P2 | `[ ]` | |
| TC-10.13 | Stats bar wraps gracefully without overflow at narrow viewports | P2 | `[ ]` | |

---

## 11. Performance & Memory

| ID | Test Case | Priority | Status | Notes |
|----|-----------|----------|--------|-------|
| TC-11.01 | Sort 50 emails: completes within 500ms (measure via DevTools Performance tab) | P0 | `[ ]` | `applySortTransforms()` reads all positions once, then writes all |
| TC-11.02 | Sort 100 emails (Gmail "show 100" setting): completes within 1 second | P1 | `[ ]` | Animation stagger capped at 300ms total |
| TC-11.03 | No layout thrashing during sort: geometry reads (offsetTop/offsetHeight) batched before transform writes | P1 | `[ ]` | Read-all-then-write-all pattern |
| TC-11.04 | Sort transition at 60fps target -- no visible frame drops (DevTools Performance > Frames) | P1 | `[ ]` | CSS `will-change: transform` for GPU acceleration |
| TC-11.05 | MutationObserver callback is debounced -- rapid Gmail DOM changes do not cause excessive processing | P1 | `[ ]` | |
| TC-11.06 | MutationObserver scoped to `div[role="main"]`, not entire `<body>` | P2 | `[ ]` | |
| TC-11.07 | Row-change detection uses 500ms throttle to prevent excessive re-sorts | P2 | `[ ]` | `CONFIG.RESORT_THROTTLE_MS` |
| TC-11.08 | WeakMap caches (`_rowMeta`, `_rowTds`) auto-release when row DOM elements are garbage collected | P2 | `[ ]` | No manual cleanup needed |
| TC-11.09 | Row metadata cache TTL: 3000ms. Row TD cache TTL: 500ms. Caches invalidated on meaningful DOM changes | P2 | `[ ]` | |
| TC-11.10 | Storage writes debounced -- 10 rapid sort toggles within 2 seconds produce one storage write | P1 | `[ ]` | Quota error triggers exponential backoff retry |
| TC-11.11 | Search debounce at 150ms -- no filter flash during typing | P2 | `[ ]` | |
| TC-11.12 | Stats bar delta-check prevents DOM rebuild when counts unchanged | P2 | `[ ]` | |
| TC-11.13 | Timer cleanup on navigation: all timers, intervals, observers, event listeners cleared on `beforeunload` | P0 | `[ ]` | Sort timers, group interval, snooze timer, snooze tick, auto-sort poll, MutationObserver, event listeners |
| TC-11.14 | No memory leak after 30 minutes of active use with repeated sort/filter/group toggles | P1 | `[ ]` | DevTools Memory tab heap snapshot comparison |
| TC-11.15 | Adaptive group style interval lifecycle: 400ms -> 2s -> auto-stop at 2min, single-timer approach | P2 | `[ ]` | |

---

## 12. Edge Cases

| ID | Test Case | Priority | Status | Notes |
|----|-----------|----------|--------|-------|
| TC-12.01 | Empty inbox (0 emails): toolbar renders, sort clicks produce no errors, stats show all zeros, search shows "0 found" | P1 | `[ ]` | `applySortTransforms()` returns early |
| TC-12.02 | Single email in inbox: sort has no visible effect (translateY = 0), group shows one group with count "(1)" | P2 | `[ ]` | |
| TC-12.03 | New email arrives during active sort: MutationObserver detects DOM change (row count or element identity), re-applies sort | P0 | `[ ]` | Row-change detection: stored references of first 3 rows vs current DOM |
| TC-12.04 | Open email (thread view), press back: `isListView()` false during thread, toolbar hidden; on return, observer detects URL change, re-applies sort | P1 | `[ ]` | Thread ID heuristic: last hash segment >= 15 chars |
| TC-12.05 | Gmail search view: `isSearchView()` detects `#search/` prefix; toolbar functional in search results | P1 | `[ ]` | |
| TC-12.06 | Gmail compose overlay: MutationObserver strips overlay params (compose/reply/forward) from URL; sort state not disrupted | P2 | `[ ]` | |
| TC-12.07 | Multiple rapid sort changes (5+ in 1 second): reentrancy guard prevents concurrent operations; final sort correct | P1 | `[ ]` | `_sortInProgress` flag |
| TC-12.08 | Very long sender names (50+ chars): badges truncate, sort comparison works, no layout overflow | P2 | `[ ]` | |
| TC-12.09 | Non-Latin characters (CJK, Arabic, Cyrillic, emoji) in sender names: `localeCompare` handles correctly, badges display Unicode | P2 | `[ ]` | |
| TC-12.10 | Extension context invalidation (extension reloaded/updated while Gmail open): full cleanup fires -- all timers, observers, DOM elements, inline styles removed; Gmail returns to native state | P0 | `[ ]` | `isExtensionContextValid()` + `handleContextInvalidated()` |
| TC-12.11 | After context invalidation, no "Extension context invalidated" errors leak to console | P1 | `[ ]` | |
| TC-12.12 | `safeStorageSet`/`safeStorageGet` wrappers handle context invalidation gracefully without throwing | P1 | `[ ]` | |
| TC-12.13 | Starred detection across Gmail themes: custom themes with non-default star colors or non-English locales may affect detection | P2 | `[ ]` | 4-strategy detection: aria-label, title, yellow color, data-tooltip |
| TC-12.14 | `clearSortTransforms()` removes all CSS transforms and transition properties, forces synchronous reflow | P1 | `[ ]` | |

---

## 13. Cross-Tab Behavior

| ID | Test Case | Priority | Status | Notes |
|----|-----------|----------|--------|-------|
| TC-13.01 | Two Gmail tabs open on Inbox: change sort in Tab 1 -- Tab 2 detects change via `chrome.storage.onChanged` listener (if auto-sort enabled) | P1 | `[ ]` | Each tab runs independent content script instance |
| TC-13.02 | Popup targets active Gmail tab: with Tab A and Tab B open, activate Tab A, open popup, change sort -- applies to Tab A only | P1 | `[ ]` | `getGmailTab()` finds active Gmail tab |
| TC-13.03 | Accent color change in Tab 1 syncs to Tab 2 via `chrome.storage.onChanged` | P1 | `[ ]` | |
| TC-13.04 | Per-label preferences: Tab 1 on Inbox saves "oldest", Tab 2 on custom label saves "senderAZ" -- each stores independently | P1 | `[ ]` | |
| TC-13.05 | Both tabs save state simultaneously without storage race conditions | P2 | `[ ]` | Debounced writes mitigate |
| TC-13.06 | Close one Gmail tab -- remaining tab continues functioning normally | P2 | `[ ]` | |

---

## 14. Navigation

| ID | Test Case | Priority | Status | Notes |
|----|-----------|----------|--------|-------|
| TC-14.01 | Inbox to custom label: MutationObserver detects URL hash change; `getCurrentLabel()` returns new label; per-label prefs loaded (if enabled) | P0 | `[ ]` | |
| TC-14.02 | Custom label to Inbox: Inbox preferences restored; toolbar updates; sort transforms recalculated for new rows | P1 | `[ ]` | |
| TC-14.03 | Navigate to next page (pagination): observer detects row change; sort re-applies to new page content | P1 | `[ ]` | |
| TC-14.04 | `parsePagination()` extracts page info using visibility-preferred span parsing (`getBoundingClientRect` check) | P2 | `[ ]` | |
| TC-14.05 | Navigate to Sent (excluded label): toolbar hidden; auto-sort does not activate | P1 | `[ ]` | |
| TC-14.06 | Navigate from excluded label to Inbox: toolbar injects; auto-sort activates if enabled | P1 | `[ ]` | |
| TC-14.07 | Browser back/forward navigation: observer detects hash changes; sort state updates for each view | P1 | `[ ]` | |
| TC-14.08 | URL change detection strips Gmail overlay params (compose, reply, forward) to avoid false navigation triggers | P2 | `[ ]` | |
| TC-14.09 | Thread view navigation: toolbar hides on thread open, reappears on list return | P1 | `[ ]` | `isListView()` detection |
| TC-14.10 | Auto-sort does NOT activate on search views | P1 | `[ ]` | `isSearchView()` check |

---

## 15. Uninstall / Disable Behavior

| ID | Test Case | Priority | Status | Notes |
|----|-----------|----------|--------|-------|
| TC-15.01 | Disable extension via `chrome://extensions` toggle: context invalidation fires; Gmail returns to native unsorted state; toolbar disappears | P0 | `[ ]` | `handleContextInvalidated()` |
| TC-15.02 | After disabling: no console errors from orphaned scripts, no stale event listeners | P0 | `[ ]` | |
| TC-15.03 | Re-enable extension: content script re-injects on Gmail reload; preferences loaded from storage; toolbar appears | P1 | `[ ]` | |
| TC-15.04 | Uninstall extension: full cleanup (same as disable); `chrome.storage.sync` data removed by Chrome automatically | P1 | `[ ]` | |
| TC-15.05 | Extension update (reload unpacked): old content script cleans up; new script injects on next interaction/reload; preferences persist through update | P1 | `[ ]` | `chrome.storage.sync` survives extension updates |
| TC-15.06 | Cleanup completeness: no InboxSort DOM elements remain (toolbar, stats, badges, cheatsheet, toast); no inline styles (box-shadow, background-color) on email rows; no event listeners from extension | P0 | `[ ]` | |
| TC-15.07 | No duplicate toolbars after rapid disable/enable/reload cycles | P1 | `[ ]` | `isButtonInjected()` guard |
| TC-15.08 | `clearSortTransforms()` on cleanup removes transforms, transitions, and clears cache; forces synchronous reflow | P1 | `[ ]` | |
| TC-15.09 | `beforeunload` cleanup fires before context invalidation on tab close | P2 | `[ ]` | |

---

## Known Issues / Bugs Found

### Bug #1: Cheat Sheet Hardcoded Version Mismatch

| Field | Value |
|-------|-------|
| **Severity** | P2 -- Cosmetic |
| **Location** | `content.js`, `toggleCheatSheet()` function |
| **Description** | The keyboard shortcut cheat sheet overlay displays a hardcoded version string `"v1.0.1"` in its footer. However, `manifest.json` declares the current version as `1.1.0`. The two are out of sync. |
| **Expected** | Version shown should match `manifest.json` (v1.1.0), or use `chrome.runtime.getManifest().version` dynamically. |
| **Steps to Reproduce** | 1. Open Gmail with InboxSort active. 2. Press `?` to open cheat sheet. 3. Version in footer shows "v1.0.1" instead of "v1.1.0". |

### Bug #2: Group Badge Potential Duplication Under Rapid Re-Application

| Field | Value |
|-------|-------|
| **Severity** | P2 -- Edge Case |
| **Location** | `content.js`, `injectGroupBadge()` and `reapplyGroupStyles()` |
| **Description** | The `injectGroupBadge()` guard checks `querySelector(".gmail-sort-group-badge")` per row. However, the adaptive `reapplyGroupStyles()` interval runs at 400ms initially. If it detects dirtiness and triggers re-application before the previous badge DOM insertion commits, a theoretical race could produce duplicate badges. The dirty-check sampling (3 rows) may also miss edge cases. |
| **Recommended Fix** | Call `clearGroupBadges()` at start of `applyGroupVisuals()` before injecting new badges, or debounce at class level. |

### Bug #3: Popup Footer Version Mismatch

| Field | Value |
|-------|-------|
| **Severity** | P2 -- Cosmetic |
| **Location** | `popup.html`, footer section |
| **Description** | The popup footer displays "v1.0.1" but `manifest.json` declares version `1.1.0`. |
| **Expected** | Footer should show "v1.1.0" or dynamically read from `chrome.runtime.getManifest().version`. |

### Bug #4: Star Detection May Miss Non-Standard Gmail Themes

| Field | Value |
|-------|-------|
| **Severity** | P2 -- Edge Case |
| **Location** | `content.js`, `isRowStarred()` |
| **Description** | Starred detection uses 4 strategies: `aria-label`, `title`, yellow color (`rgb(240, 180, 0)`), and `data-tooltip`. Custom Gmail themes with non-default star colors or non-English locales (where "Starred"/"Star" text differs) may cause detection failures. |

---

## Test Coverage Summary

| # | Category | P0 | P1 | P2 | Total |
|---|----------|----|----|-----|-------|
| 1 | Installation & First Run | 4 | 5 | 2 | 11 |
| 2 | Sort Modes | 5 | 8 | 3 | 16 |
| 3 | Group by Sender | 2 | 6 | 4 | 12 |
| 4 | Filters | 2 | 10 | 3 | 15 |
| 5 | Stats Bar | 0 | 5 | 4 | 9 |
| 6 | Bulk Select | 0 | 4 | 2 | 6 |
| 7 | Keyboard Shortcuts | 3 | 8 | 6 | 17 |
| 8 | Popup / Settings | 1 | 20 | 7 | 28 |
| 9 | Dark Mode | 1 | 4 | 4 | 9 |
| 10 | Responsive / Viewport | 3 | 5 | 5 | 13 |
| 11 | Performance & Memory | 2 | 6 | 7 | 15 |
| 12 | Edge Cases | 2 | 7 | 5 | 14 |
| 13 | Cross-Tab Behavior | 0 | 4 | 2 | 6 |
| 14 | Navigation | 1 | 7 | 2 | 10 |
| 15 | Uninstall / Disable | 3 | 4 | 2 | 9 |
| | **Totals** | **29** | **107** | **58** | **194** |

---

## Notes for Testers

1. **Gmail DOM is volatile.** Class names and element structures may change with Gmail updates. Tests should be re-validated after Gmail UI changes.

2. **The 500px responsive breakpoint (TC-10.04 through TC-10.09) is a known bug area.** Prioritize regression testing here after any toolbar CSS changes.

3. **Extension context invalidation (TC-12.10) is difficult to test manually.** Consider automating by programmatically reloading the extension via `chrome.management.setEnabled()`.

4. **MutationObserver behavior depends on Gmail's internal DOM update patterns.** Navigation tests (Section 14) may behave differently depending on Gmail's SPA routing implementation.

5. **Pagination tests (TC-14.03, TC-14.04) require 100+ emails.** Ensure the test Gmail account has sufficient volume and Gmail is configured to show 50 per page.

6. **Dark mode detection (Section 9) relies on Gmail's theme CSS.** If Gmail changes its dark mode implementation, detection strategies may need recalibration.

7. **Storage quota testing (TC-11.10) is hard to hit normally.** To test quota errors and retry logic, fill `chrome.storage.sync` near its 100KB limit before testing rapid state changes.

8. **Cross-tab tests (Section 13) require multiple Gmail tabs open simultaneously.** Test with at least 2-3 tabs.

9. **The `beforeunload` cleanup (TC-11.13) can be tested by navigating away from Gmail or closing the tab, then checking the console for orphaned timer warnings.**

---

## Test Execution Log

| Date | Tester | Sections Tested | Pass | Fail | Blocked | Notes |
|------|--------|-----------------|------|------|---------|-------|
| | | | | | | |
| | | | | | | |
| | | | | | | |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Tester | | | |
| Developer | | | |
| Product Owner | | | |

---

*Generated for InboxSort v1.1.0 -- last updated 2026-03-07*
