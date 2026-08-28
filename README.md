# InboxSort

**A privacy-first Chrome extension that visually sorts and filters Gmail by date, sender, star, or unread status.**

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Add%20to%20Chrome-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/inboxsort/mmbbiejiidimjaceddigelomncimdegb)

Gmail gives you labels, stars, and categories — but no way to sort your inbox by sender name or push unread messages to the top. InboxSort adds a clean, native-feeling toolbar directly into Gmail with one-click sorting, real-time filters, live search, keyboard shortcuts, and a stats bar.

Works visually using CSS transforms — your actual inbox is never modified.

---

## Features

### Sort Modes

| Mode | Description |
|------|-------------|
| **Oldest First** | Surface buried emails you may have missed |
| **Newest First** | Restore Gmail's default order with one click |
| **Sender A→Z** | Group conversations alphabetically by sender |
| **Sender Z→A** | Reverse alphabetical order |
| **Unread First** | Push unread messages to the top |
| **Starred First** | Put starred messages first, then sort each group by newest date |

### Group by Sender

A visual overlay that clusters consecutive emails from the same sender, with color-coded badges and email counts (e.g., "Google (3)"). Alternating background tints make sender groups easy to spot at a glance. Works alongside any sort mode.

### Quick Filters

Toggle buttons in the toolbar to show only:
- **Starred** emails
- **Unread** messages
- **Emails with attachments**

Filters can be combined (e.g., unread + attachments). Click any stat in the stats bar to toggle it as a filter.

### Live Search

Type in the filter bar to instantly narrow the current page by sender name, subject line, or snippet. Match count displays as you type. Press `/` to jump to the search bar or `Esc` to clear.

### Stats Bar

A slim bar below your sort tabs showing real-time counts: **total**, **unread**, **starred**, and **attachments** on the current page. Click any stat to toggle it as a quick filter.

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+1` | Sort: Oldest First |
| `Alt+2` | Sort: Newest First |
| `Alt+3` | Sort: Sender A→Z |
| `Alt+4` | Sort: Sender Z→A |
| `Alt+5` | Sort: Unread First |
| `Alt+6` | Toggle Group by Sender |
| `Alt+7` | Sort: Starred First |
| `Alt+0` | Clear all active filters |
| `/` | Focus the filter search bar |
| `?` | Open keyboard shortcut cheat sheet |

### Smart Preferences

- **Auto-sort on load** — Your last-used sort applies automatically when Gmail opens
- **Per-label preferences** — Different sort settings for Inbox, Sent, Promotions, or any label
- **Pause sorting** — Temporarily suspend sorting for 15 minutes, 30 minutes, or 1 hour, with automatic restore when the timer expires

### Customizable Toolbar

Show or hide individual sort tabs to keep the toolbar clean. Manage visibility from the extension popup.

### Accent Colors

Choose from six colors to match your style: **blue**, **green**, **purple**, **red**, **orange**, and **teal**. Applied to the active sort tab, filter highlights, group badges, and other interactive elements.

### Backup & Restore

Export all your settings (sort mode, accent color, toggles, hidden tabs, per-label preferences) to a JSON file. Import them on another browser or machine.

### Dark Mode

Automatic detection of Gmail's dark theme — no configuration needed. Dedicated dark-mode color variants for all accent colors, badges, overlays, and toolbar elements. Follows your system preference and updates instantly when the OS theme changes.

### Privacy First

- **Zero data collection** — No analytics, tracking, or telemetry
- **No network requests** — InboxSort never contacts any external server or API
- **Minimal permissions** — Only `activeTab` (interact with the Gmail page) and `storage` (save preferences locally)
- **Fully local** — All processing happens in your browser. Your data never leaves
- **Open source** — The entire codebase is auditable

---

## Installation

1. Visit the **[InboxSort page on the Chrome Web Store](https://chromewebstore.google.com/detail/inboxsort/mmbbiejiidimjaceddigelomncimdegb)**.
2. Click **Add to Chrome**.
3. Confirm by clicking **Add extension**.
4. Open [Gmail](https://mail.google.com). The sort toolbar appears below Gmail's action bar.

No account creation, sign-up, or configuration required.

---

## How It Works

InboxSort adds a toolbar directly below Gmail's action bar. Click a tab to sort, use the search bar to filter, and glance at the stats bar for a snapshot of your page. Everything happens visually using CSS transforms — emails are reordered on screen without moving, deleting, or modifying anything in your actual inbox.

Works on every Gmail view: Inbox, Sent, Drafts, Spam, Trash, Starred, Important, All Mail, custom labels, and categories like Promotions and Social. Handles pagination seamlessly and re-applies sort settings when navigating between pages or labels.

---

## Permissions

| Permission | Why It's Needed |
|------------|----------------|
| `activeTab` | Read email row elements on the Gmail page and inject the sort toolbar. Only activates on `mail.google.com`. |
| `storage` | Save preferences (sort order, accent color, toggles) locally so they persist between sessions. |

InboxSort does **not** request `identity`, `cookies`, `history`, `bookmarks`, `downloads`, or any other sensitive permissions.

---

## Compatibility

- **Browser:** Google Chrome (Manifest V3)
- **Platform:** `mail.google.com` (desktop web interface)
- **Views:** All Gmail views including Inbox, Sent, Drafts, Spam, Trash, custom labels, and category tabs
- **Not compatible with:** Mobile Gmail app, third-party email clients, Google Workspace custom domains outside `mail.google.com`

---

## Version

**v1.2.3** - See [CHANGELOG.md](CHANGELOG.md) for release history.

---

## License

This project is provided for personal use. All rights reserved.

---

## Contact

**Alex Brecher** — [abrecher@gmail.com](mailto:abrecher@gmail.com)

---

*InboxSort is not affiliated with, endorsed by, or sponsored by Google or Gmail. Gmail is a trademark of Google LLC.*
