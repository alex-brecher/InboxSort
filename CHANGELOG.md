# InboxSort -- Changelog

All notable changes to InboxSort are documented here.
This project follows the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

---

## [1.3.2] -- 2026-08-31

### Fixed
- Prevented Group mode from briefly stacking Gmail row content during its transition by applying the new row positions atomically.
- Added a regression assertion that Group mode has no row transition and no overlap.

---

## [1.3.1] -- 2026-08-30

### Added
- Added a redesigned popup with direct sort controls, clear settings, and keyboard access.
- Added live status text that shows when Gmail is ready, needs a refresh, or is not open.
- Added tests for the popup, accessibility states, read messages, 24-hour times, multiple tabs, and pause recovery.

### Changed
- Replaced decorative gradients and elastic motion with a restrained interface that matches Gmail.
- Improved text contrast, focus indicators, dark mode, and reduced-motion support.
- Changed the reset control to require two clicks.
- Matched toolbar visibility settings to the five controls in the Gmail toolbar.

### Fixed
- Fixed sender sorting for read messages that use Gmail's `.yP` sender element.
- Fixed sender sorting for multi-participant conversations that include nested Gmail sender elements.
- Placed messages without a sender after named senders in both sender sort directions.
- Preserved a paused sort after Gmail reloads.
- Synchronized sort, group, pause, and resume changes across open Gmail tabs.
- Prevented a delayed settings write from replacing the sort that must return after a pause.
- Added support for 24-hour Gmail time values.
- Changed stats filters to keyboard-accessible buttons with correct state labels.
- Fixed the popup status for non-Gmail tabs.
- Made Reset all settings clear a saved pause timer when Gmail is not open.

## [1.2.3] -- 2026-08-28

### Fixed
- Kept the filter field visible when the Gmail navigation panel reduces the message-list width.
- Made the toolbar respond to its available width instead of the full browser width.
- Restored the button reset rules that Gmail styles could override.
- Restored the visible keyboard-focus outline on sort buttons.

## [1.2.2] -- 2026-08-28

### Fixed
- Restored the InboxSort toolbar after Gmail replaces its main view.
- Restored the toolbar after Gmail rebuilds only its action area.
- Reconnected the Gmail observer after inbox, thread, label, and chat transitions.
- Prevented duplicate observers and stopped the recovery timer during extension cleanup.

## [1.2.1] -- 2026-08-22

### Fixed
- Prevented the InboxSort toolbar from appearing over messages opened in their own Gmail window.
- Prevented the toolbar from briefly flashing during Gmail thread-view navigation.

## [1.2.0] -- 2026-08-21

### Added
- Added a Starred First sort mode. It puts starred messages first and sorts each star group by newest date.
- Added the Alt+7 shortcut for Starred First. Alt+6 still controls Group by Sender.

---

## [1.1.0] -- 2026-03-07

### Added
- GPU compositing hints (`will-change: transform`) for smoother sort animations on all hardware.
- Reentrancy guard to prevent overlapping sort operations when Gmail triggers rapid DOM changes.
- Automatic retry with exponential backoff when saving settings to Chrome storage during quota pressure.
- URL verification in popup-to-content messaging to prevent sending messages to non-Gmail tabs.
- Responsive toolbar layout improvements for narrow browser windows and split-screen usage.

### Changed
- Scoped MutationObserver to `div[role="main"]` instead of `document.body`, significantly reducing unnecessary DOM processing and improving page responsiveness.
- Increased filtered-out row opacity from 0.15 to 0.35 for better readability while still clearly distinguishing filtered results.
- Replaced all `transition: all` declarations with specific property transitions (`transform`, `opacity`, `background-color`) to eliminate animation interference.
- Removed all `all: unset` declarations that were breaking CSS inheritance and causing visual jitter.
- Refined dark mode accent color variants for better contrast on dark backgrounds.
- Improved context invalidation cleanup: all event listeners, timers, intervals, and CSS custom properties are now properly removed when the extension context is destroyed.

### Fixed
- Fixed email rows visually "jumping" or flying to incorrect positions during sort animation. Root cause was `transition: all` interacting with Gmail's own style changes.
- Eliminated a two-frame visual jump when re-applying the current sort mode after Gmail refreshes the email list.
- Fixed a nested interval leak in the Group by Sender style maintenance loop that could accumulate timers over long sessions.
- Fixed `_suppressObserver` race condition by replacing `setTimeout(0)` with `queueMicrotask` for synchronous observer suppression.
- Fixed newly arriving emails not being picked up by active filters until the next manual sort.
- Improved reliability of "Select visible" bulk-select -- checkbox clicks now register consistently on first attempt with a retry pass.
- Fixed the stats bar "Select visible" / "Deselect all" button not updating its label after the selection state changed.
- Fixed Alt+0 (clear filters) accidentally typing "0" into the search bar when the search input was focused.

---

## [1.0.1] -- 2026-02-28

### Changed
- Internal stability improvements for extension context handling and toolbar reinjection after Chrome restores a suspended tab.

### Fixed
- Minor code cleanup and removal of leftover debug `console.log` statements.

---

## [1.0.0] -- 2026-02-27

### Added

**Core Sorting**
- Five sort modes: Oldest First, Newest First, Sender A-Z, Sender Z-A, and Unread First.
- Smooth CSS transform animations with staggered per-row delays for a polished sorting effect.
- Purely visual sorting -- no emails are moved, deleted, archived, or modified.

**Group by Sender**
- Visual overlay that clusters consecutive emails from the same sender.
- Color-coded sender badges with email counts (e.g., "Google (3)").
- Alternating background tinting for clear visual separation between sender groups.
- Works alongside any sort mode.

**Filtering and Search**
- Quick Filters: toggle to show only starred, unread, or emails with attachments.
- Filters are combinable (e.g., unread + attachments).
- Live search bar that filters the current page by sender name, subject line, or snippet.
- Match count display while searching.
- Bulk Select: select all visible filtered emails for batch Gmail actions.

**Stats Bar**
- Real-time counts for total emails, unread, starred, and attachments on the current page.
- Clickable stats to toggle corresponding filters.

**Keyboard Shortcuts**
- Alt+1 through Alt+5 for sort modes.
- Alt+6 to toggle Group by Sender.
- Alt+0 to clear all active filters.
- / (slash) to jump to the filter search bar.
- ? to open the keyboard shortcut cheat sheet overlay.

**Settings and Preferences**
- Auto-sort on load: automatically apply the last-used sort when Gmail opens.
- Per-label preferences: different sort settings for each Gmail label or category.
- Customizable toolbar: show or hide individual sort tabs.
- Accent color picker with six options: blue, green, purple, red, orange, and teal.

**Pause / Snooze Sorting**
- Temporarily suspend sorting for 15 minutes, 30 minutes, or 1 hour.
- Countdown badge in the stats bar showing remaining snooze time.
- Automatic restore of sort and group settings when the timer expires.
- Manual cancel available at any time.

**Backup and Restore**
- Export all settings to a JSON file.
- Import settings from a JSON file on another machine or browser.
- Validated import with schema checking to prevent invalid data.

**Dark Mode**
- Automatic detection of Gmail's dark theme.
- Dedicated dark-mode color variants for all accent colors, badges, overlays, and toolbar elements.

**Compatibility**
- Works on all Gmail views: Inbox, Sent, Drafts, Spam, Trash, Starred, Important, All Mail, custom labels, and categories.
- Handles pagination and re-applies sort when navigating between pages.
- Automatic toolbar reinjection when Gmail rebuilds the page.

**Privacy**
- Zero data collection, analytics, telemetry, or external network requests.
- Only two Chrome permissions: `activeTab` and `storage`.
- No third-party libraries or dependencies.
