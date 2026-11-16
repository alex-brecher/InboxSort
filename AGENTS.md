# InboxSort: notes for agents

Chrome MV3 extension that sorts Gmail rows visually (CSS transforms). No build step.

## Layout
- `manifest.json` loads content scripts in order: `shared.js`, `content-icons.js`, `content-rows.js`, `content-views.js`, `content.js`. They meet on `globalThis.InboxSort`.
- `shared.js` is also loaded by `popup.html` before `popup.js`. Put constants used by both there.
- `content.js` holds state, sorting, UI and observers. `content-rows.js` and `content-views.js` are pure helpers.
- `theme-boot.js` sets the popup theme before first paint from a localStorage cache; `chrome.storage.sync` key `appearance` is the source of truth.
- Group-by-sender styling lives in `styles.css` keyed on `data-inboxsort-group` attributes. Do not reintroduce inline-style repaint timers.

## Rules that bite
- Silent re-applies (`applySort(mode, true)`) must never navigate or call `saveState()`.
- Gmail swaps row elements; anything stored on a row is lost. Re-mark rows from the observer's identity check.
- Gmail's page world enforces Trusted Types. Extension content scripts are exempt, but a page-world harness needs a policy.

## Checks
- `npm run check` runs ESLint and both jsdom suites. Add a regression test with every fix.
- Visual check: start `.claude/launch.json` config `inboxsort-visual`, open `/test/visual/gmail.html?appearance=dark&group=1&sort=senderAZ` and `/test/visual/popup.html?appearance=light`.
- Release: bump `manifest.json` and `package.json`, add a CHANGELOG entry, zip the extension files (not tests or node_modules), upload in the Chrome Web Store dashboard (item `mmbbiejiidimjaceddigelomncimdegb`).
