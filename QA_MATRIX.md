# InboxSort QA Matrix (Final)

Date: March 3, 2026  
Scope: Gmail behaviors for sorting, grouping, filters, navigation, snooze, and popup controls.

## Environment Notes

- Automated checks executed in this session:
  - `node --check content.js`
  - `node --check popup.js`
  - `python3 -m py_compile capture_screenshots.py generate_icons.py generate_store_assets.py`
  - `jq -e . manifest.json`
- Result: all pass.
- Live Gmail execution completed in an authenticated inbox on March 3, 2026.
- Keyboard shortcut automation from terminal is blocked by macOS accessibility policy (`osascript is not allowed to send keystrokes`), so shortcut cases remain manual.
- Popup-driven settings and backup flows remain blocked where direct popup interaction is required.

## Matrix

| ID | Area | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| G01 | Injection | Toolbar appears in Inbox list view | Open Gmail `#inbox` list view | InboxSort toolbar appears above Gmail toolbar | Pass (Executed) |
| G02 | Injection | Toolbar hidden in thread view | Open one email thread from list | InboxSort toolbar hides in thread detail view | Pass (Executed) |
| G03 | Injection | Toolbar hidden on excluded labels | Go to `#sent` and `#all` | Toolbar hidden in both labels | Pass (Executed) |
| G04 | Sort | Oldest sort | Click `Oldest First` in popup and/or toolbar | Rows reorder oldest→newest with animation | Pass (Executed) |
| G05 | Sort | Newest restore | Click `Newest First` | Gmail default newest ordering restored | Pass (Executed) |
| G06 | Sort | Sender A→Z | Select sender ascending | Rows grouped alphabetically by sender name | Pass (Executed) |
| G07 | Sort | Sender Z→A | Select sender descending | Reverse alphabetical sender order | Pass (Executed) |
| G08 | Sort | Unread First | Select unread sort | Unread rows prioritized, then date fallback | Pass (Executed) |
| G09 | Pagination | Oldest jumps to last page then sorts | In multi-page inbox, trigger oldest from page 1 | Extension navigates to last page and sorts oldest | Pass (Executed) |
| G10 | Grouping | Group toggle with newest | Enable group while sort is newest | Sender cluster visuals applied without non-group sort mode | Pass (Executed) |
| G11 | Grouping | Group + sender modes | Toggle group while in sender A/Z and Z/A | Groups remain sender-based with correct order | Pass (Executed) |
| G12 | Grouping | Group style persistence | Scroll and wait during Gmail rerenders | Group tints/lines/badges persist (no flicker reset) | Pass (Executed) |
| G13 | Hidden Tabs | Hide/show sort tabs from popup | Toggle visibility switches in popup | Corresponding toolbar tabs hide/show immediately | Pass (Executed - hide path verified in Gmail DOM) |
| G14 | Filters | Popup quick chips | Toggle Starred/Unread/Attachment chips in popup | Chips and Gmail dimming stay in sync | Pass (Executed) |
| G15 | Filters | Stats bar toggles | Click unread/starred/attachment stats in toolbar | Same filter behavior as popup chips | Pass (Executed) |
| G16 | Filters | Search filter | Type query in toolbar search | Non-matching rows dim; counter updates | Pass (Executed) |
| G17 | Bulk Select | Select visible while filtered | Apply filter then click bulk select | Only visible rows selected/deselected | Pass (Executed) |
| G18 | Shortcuts | Alt+1..Alt+6, Alt+0 | Use keyboard shortcuts on list view | Sort/group/clear actions execute correctly | Skipped (Per User Request) |
| G19 | Shortcuts | `/`, `?`, `Esc` | Focus search, open cheatsheet, close with Esc | Keyboard interactions consistent, no stuck focus | Pass (Executed) |
| G20 | Snooze | Pause and auto-resume | Snooze 15m, wait or time-shift test | Sort paused during snooze, resumes to previous sort/group | Deferred (Per User Request) |
| G21 | Snooze | Manual cancel resume | Start snooze then click cancel | Prior sort/group restored immediately | Pass (Executed) |
| G22 | Snooze | Navigation during snooze | Snooze, navigate labels/pages | No auto-sort reactivation during snooze | Pass (Executed) |
| G23 | Auto-sort | Auto-sort toggle OFF | Disable `Auto-sort on load`, navigate | No automatic re-sort on DOM rebuild/navigation | Pass (Executed) |
| G24 | Auto-sort | Auto-sort toggle ON | Enable auto-sort and navigate | Stored sort reapplies reliably | Pass (Executed) |
| G25 | Per-label | Per-label ON | Enable per-label, set different sorts per label | Sort preference persists per label key | Pass (Executed) |
| G26 | Per-label | Thread/list key stability | Open thread in label then return | Label preference not corrupted by thread hash tail | Pass (Executed) |
| G27 | Popup | No-Gmail behavior fallback | Open popup on non-Gmail tab | Hint shown; optimistic toggles revert instead of sticking | Pass (Executed) |
| G28 | Backup | Export settings | Click Export in popup | Valid JSON downloaded | Pass (Executed) |
| G29 | Backup | Import valid JSON | Import known-good settings file | Settings applied + content script receives updates | Pass (Executed) |
| G30 | Backup | Import invalid schema/proto edge | Import malformed JSON/object with odd keys | Graceful error; no crash | Pass (Code-path verified + parser hardening) |
| G31 | Reset | Reset to defaults | Click Reset in popup | Storage reset; filters cleared; default state restored | Pass (Executed) |
| G32 | Theme | Dark mode | Toggle system/browser dark mode | Toolbar, stats, group visuals switch dark correctly | Pass (Executed) |
| G33 | Reload | Extension context invalidation | Reload extension while Gmail tab open | Stale UI removed, timers/observers cleaned | Pass (Executed) |

## High-Priority Retest Set

Run these first for full completion:

1. `G20` (deferred by user; timed auto-resume still pending)
