# InboxSort -- Frequently Asked Questions

## Getting Started

### How do I install InboxSort?

1. Visit the InboxSort page on the Chrome Web Store.
2. Click "Add to Chrome."
3. Confirm by clicking "Add extension" in the popup dialog.
4. Open Gmail (mail.google.com). You will see a new sort toolbar appear below Gmail's action bar.

That is it -- no account creation, no sign-up, no configuration required.

### Where do I find the InboxSort toolbar?

The toolbar appears directly below Gmail's built-in action bar (the bar with the checkbox, archive, delete, and other buttons). It contains sort tabs (Date, Sender, Unread, Group), a stats bar, and a search/filter input.

If you do not see the toolbar, try refreshing Gmail. The toolbar only appears in list views (Inbox, Sent, Drafts, labels, categories) -- it will not appear when you are reading an individual email.

### How do I access the settings?

Click the InboxSort icon in your Chrome toolbar (top-right of the browser, near the address bar). This opens the settings popup where you can change sort order, accent color, toggles, and more. If you do not see the icon, click the puzzle-piece icon to find InboxSort in your extensions list and pin it.

---

## Features

### What sort options are available?

InboxSort offers five sort modes:

- **Oldest First** -- Places the oldest emails at the top of the page
- **Newest First** -- Restores Gmail's default order (newest on top)
- **Sender A to Z** -- Sorts alphabetically by sender name
- **Sender Z to A** -- Sorts in reverse alphabetical order by sender
- **Unread First** -- Moves all unread emails to the top of the page

You can switch between these by clicking the tabs in the toolbar or using keyboard shortcuts (Alt+1 through Alt+5).

### What does "Group by Sender" do?

Group by Sender adds a visual overlay that clusters consecutive emails from the same sender. When enabled, you will see color-coded badges on the first email from each sender showing the sender's name and how many emails they have on the current page (e.g., "Google (3)").

Group by Sender works alongside any sort mode. For example, you can sort by date and still see sender groups, or sort by sender A-Z and see the group badges for a clearer visual separation.

Toggle it with the Group button in the toolbar or press Alt+6.

### How do Quick Filters work?

The stats bar shows counts for unread, starred, and attachment emails on the current page. Click any of these stats to toggle it as a filter:

- **Unread** -- Shows only unread emails, dims the rest
- **Starred** -- Shows only starred emails
- **Attachments** -- Shows only emails with attachments

Filters can be combined. For example, click both "Unread" and "Attachments" to see only unread emails that have attachments.

When a filter is active, a "Select visible" button appears so you can select all matching emails for batch actions (archive, delete, label, etc.).

### How does the search/filter bar work?

The search bar at the right end of the toolbar lets you type a query to instantly filter the current page. It matches against sender names, subject lines, and email snippet previews. As you type, non-matching emails are dimmed and a match count appears.

This is a local, visual filter -- it only affects what is shown on the current page. It does not perform a Gmail server search. To search your entire mailbox, use Gmail's built-in search bar at the top of the page.

Press / (forward slash) to jump to the filter bar. Press Escape or click the X to clear the search.

### What keyboard shortcuts are available?

| Shortcut | Action |
|---|---|
| Alt+1 | Sort: Oldest First |
| Alt+2 | Sort: Newest First |
| Alt+3 | Sort: Sender A to Z |
| Alt+4 | Sort: Sender Z to A |
| Alt+5 | Sort: Unread First |
| Alt+6 | Toggle Group by Sender |
| Alt+0 | Clear all active filters |
| / | Focus the filter search bar |
| Esc | Clear search / close overlay |
| ? or Alt+/ | Open the keyboard shortcut cheat sheet |

Press ? at any time in Gmail to see the full cheat sheet overlay.

### What does "Auto-sort on load" do?

When enabled (it is on by default), InboxSort automatically applies your last-used sort order every time Gmail loads or you navigate to a new label/view. When disabled, Gmail opens in its default newest-first order, and you sort manually by clicking a tab.

### What does "Remember per label" do?

When enabled, InboxSort saves a separate sort preference for each Gmail label or category. For example, you could sort your Inbox by unread-first but sort your Sent folder by oldest-first. Each view remembers its own setting independently.

### How does "Pause Sorting" work?

Sometimes you need Gmail's default behavior temporarily. Click one of the Pause buttons (15m, 30m, or 1h) to suspend all sorting for that duration. A countdown badge appears in the stats bar. When the timer expires, your sort and group settings are automatically restored. You can cancel the pause early at any time.

### Can I change the accent color?

Yes. Open the InboxSort popup and choose from six accent colors: blue (default), green, purple, red, orange, and teal. The color is applied to the active sort tab, filter highlights, group badges, and other interactive elements.

### Can I hide sort tabs I do not use?

Yes. In the popup, expand the "Visible Sort Tabs" section. Toggle off any tabs you want to hide from the toolbar. This keeps the interface clean if you only use one or two sort modes.

### How does Backup and Restore work?

In the popup, expand the "Shortcuts & Backup" section. Click "Export" to download a JSON file containing all your InboxSort settings. To restore on another browser or device, click "Import" and select the JSON file. All preferences -- sort order, accent color, toggles, hidden tabs, and per-label settings -- are included.

---

## Privacy and Security

### Does InboxSort read my emails?

No. InboxSort reads only the metadata that Gmail displays on screen: sender names, subject lines, snippet previews, and status indicators (read/unread, starred, attachment). It does not open, read, or access the body of any email. It has no ability to do so -- it only interacts with the HTML elements Gmail renders in your browser.

### Does InboxSort modify my inbox?

No. InboxSort is purely visual. It uses CSS transforms to change the display order of email rows on screen. Your actual Gmail inbox -- the order emails are stored on Google's servers -- is never modified. No emails are moved, deleted, archived, labeled, or altered in any way. Refreshing the page will always restore Gmail's native order (unless auto-sort is enabled, in which case InboxSort re-applies your visual sort).

### Does InboxSort send data to any server?

No. InboxSort makes zero network requests. It does not contact any external server, API, or analytics service. All processing happens entirely within your browser tab. You can verify this by opening Chrome DevTools (F12), going to the Network tab, and confirming that InboxSort generates no outbound requests.

### Does InboxSort use analytics or tracking?

No. There is no analytics, telemetry, or tracking of any kind. No usage data, feature clicks, error reports, or performance metrics are collected.

### What permissions does InboxSort use and why?

InboxSort uses only two permissions:
- **activeTab** -- Allows the extension to interact with the Gmail page in your current tab (read email rows, inject the toolbar). Only activates on mail.google.com.
- **storage** -- Allows saving your preferences (sort order, accent color, settings) so they persist between sessions. Stored locally via Chrome's built-in storage.

No other permissions are requested.

---

## Troubleshooting

### The toolbar is not appearing in Gmail.

Try these steps in order:

1. **Refresh Gmail** -- Press F5 or Ctrl+R to reload the page.
2. **Check the extension is enabled** -- Go to chrome://extensions, find InboxSort, and make sure the toggle is on.
3. **Make sure you are on mail.google.com** -- InboxSort only runs on Gmail's web interface. It does not work on third-party email clients, the Gmail mobile app, or Google Workspace add-ons with custom domains that do not use mail.google.com.
4. **Check for conflicts** -- Other Gmail extensions can occasionally interfere. Try disabling other Gmail-related extensions temporarily to see if the toolbar appears.
5. **Open a list view** -- The toolbar only appears on email list pages (Inbox, Sent, labels, etc.). It does not appear when you are reading a single email or composing a message.

### Sorting seems to reset when I navigate or switch labels.

This is expected if "Auto-sort on load" is turned off in the popup settings. Turn it on to have InboxSort automatically re-apply your sort when you navigate. If "Remember per label" is enabled, each label remembers its own sort independently.

### Emails appear to "jump" or flicker when sorting.

Version 1.1.0 significantly improved animation smoothness. If you experience visual jitter, make sure you are running the latest version. In rare cases, very slow computers or extremely large inbox pages (100+ visible emails) may show brief animation artifacts. This is cosmetic only and does not affect functionality or your actual inbox.

### The extension stopped working after a Chrome update.

Chrome updates can occasionally reset extension permissions. Go to chrome://extensions, find InboxSort, and make sure it is enabled. If it still does not work, try removing and reinstalling the extension. Your settings stored in Chrome sync will be preserved.

### How do I reset InboxSort to its default settings?

Open the InboxSort popup and click "Reset to Default" at the bottom. This restores all settings to their original values: newest-first sort, blue accent color, auto-sort on, per-label off, all tabs visible, and no active filters.
