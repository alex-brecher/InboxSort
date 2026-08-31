# InboxSort 1.3.2 QA Report

Date: August 31, 2026
Scope: Gmail list sorting, filtering, grouping, navigation, persistence, popup controls, accessibility, and responsive behavior.

## Release result

- Automated scenarios: 31 passed, 0 failed.
- Live Gmail acceptance: passed across 22 real inbox rows.
- JavaScript syntax, manifest validation, Git whitespace checks, and Impeccable interface checks: passed.
- Chrome Web Store upload package: version 1.3.2, rebuilt after the final live and automated passes.
- Source commit: updated release commit is pushed to GitHub `main`.
- Package SHA-256: `a76eb25e99fca6bb30f85775ac84af19cab44ef3d8b1e181ed9a9e45beb63dff`.

## Live Gmail acceptance

| Area | Scenarios verified | Result |
|---|---|---|
| Injection | Inbox toolbar appears once; it hides in threads, Sent, All Mail, and standalone message windows; it returns without duplication | Pass |
| Starred | Starred First puts starred messages first and sorts each section by newest date | Pass |
| Unread | Unread First puts unread messages first and sorts each section by newest date | Pass |
| Date | Oldest and newest orders match 21 parseable real Gmail dates | Pass |
| Sender | A to Z and Z to A work on 22 rows, including aggregate multi-person names such as `me, Edisa`; rows without a sender stay last | Pass |
| Grouping | Sender groups toggle on and off with correct badges, classes, and row placement; the user-triggered Group transition is atomic with no stacked-text frame | Pass |
| Filters | Unread, starred, attachment, combined quick filters, and text search dim the correct rows | Pass |
| Shortcuts | Alt+7 Starred, Alt+6 Group, Alt+0 Clear, `/` search focus, `?` help, and Escape behaviors | Pass |
| Navigation | Inbox, Promotions, Search, thread detail, and inbox return transitions | Pass |
| Multi-tab | Sort changes synchronize between open Gmail tabs | Pass |
| Responsive | 1200, 900, 700, and 480 pixel widths without toolbar overflow | Pass |
| Stability | New rows can appear during an active session without overlap; no InboxSort console errors were observed in the live pass | Pass |

## Automated regression matrix

The content-script suite contains 23 scenarios:

1. Inbox toolbar injection
2. Responsive toolbar and keyboard focus CSS
3. Starred First with newest secondary sorting and mixed row heights
4. Unread First with newest secondary sorting
5. Sender A to Z and Z to A cycling
6. Oldest sorting and default-order restoration
7. Starred quick-filter toggling
8. Search and clear
9. Thread navigation and inbox restoration
10. Excluded Sent view and supported custom-label view
11. Gmail main-view replacement without duplicate controls
12. New email arrival during an active sort
13. Row removal during an active sort
14. Rapid sort cycling
15. Alt+7 Starred and Alt+6 Group shortcut compatibility, including atomic Group placement
16. Accessible stats-filter button semantics
17. Toolbar visibility settings mapped to real merged controls
18. Read and multi-participant sender detection, including missing-sender placement
19. 24-hour Gmail time parsing
20. Pause state surviving a Gmail reload
21. Pause and resume synchronization across Gmail tabs
22. Sort synchronization across Gmail tabs
23. Synchronous hiding in standalone message windows

The popup suite contains 8 scenarios:

1. Semantic sort controls and switches
2. Live Gmail state and version rendering
3. Accessible collapsible disclosures
4. Toolbar visibility controls updating the actual merged settings
5. Sort changes keeping storage, Gmail, and ARIA state synchronized
6. Two-click destructive reset, including local snooze-state removal
7. No gradients or bounce motion in the interface
8. Clear non-Gmail connection status

## Commands

```sh
npm test
node --check content.js
node --check popup.js
jq -e . manifest.json
git diff --check
```

## Known test boundary

Chrome automation cannot attach to `chrome-extension://` popup pages in this environment. The popup was therefore exercised through its local rendered preview and jsdom regression suite. Content-script behavior was tested independently in the authenticated Gmail interface.
