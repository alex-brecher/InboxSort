# InboxSort -- Privacy Policy

*Last updated: November 16, 2026*

## Overview

InboxSort is a Chrome extension that adds sorting, filtering, and organizational tools to the Gmail web interface. This privacy policy explains what data InboxSort accesses, how it is used, and what protections are in place.

**The short version: InboxSort does not collect, transmit, or share any of your data. Everything stays in your browser.**

## What Data InboxSort Accesses

InboxSort reads the following information from the Gmail page currently displayed in your browser:

- **Email metadata visible on screen** -- sender names, subject lines, snippet previews, read/unread status, starred status, and whether an email has attachments. This information is read directly from the HTML elements Gmail renders on the page.
- **Gmail interface elements** -- toolbar areas, pagination controls, and label/category navigation, used to position InboxSort's toolbar and respond to page changes.

InboxSort does **not** access:
- The body or full content of any email
- Your Gmail password or authentication credentials
- Your contacts, calendar, or any other Google services
- Any data from pages outside of `mail.google.com`

## How Data Is Used

All data accessed by InboxSort is used exclusively to provide sorting, filtering, and visual organization features within your browser tab. Specifically:

- **Sender names** are read to enable alphabetical sorting and group-by-sender functionality.
- **Timestamps** (derived from email row positions) are used for date-based sorting.
- **Read/unread status, starred status, and attachment indicators** are used for filtering and stats display.
- **Search input text** you type into the InboxSort filter bar is compared against visible sender names, subjects, and snippets to filter the current page. This text is never stored or transmitted.

## Data Storage

InboxSort stores your preferences (sort order, accent color, toggle states, per-label settings, hidden tabs, and snooze state) using Chrome's built-in `chrome.storage.sync` API. This data:

- Is stored locally on your device
- May be synced across your Chrome browsers if you are signed into Chrome with sync enabled (this is standard Chrome behavior for extension storage)
- Contains only your InboxSort settings -- never email content, sender information, or any personal data
- Can be exported to a JSON file and imported on another device using the Backup & Restore feature in the popup

## What InboxSort Does NOT Do

- **No external network requests.** The extension makes zero HTTP requests to any server. It does not phone home, ping analytics endpoints, or communicate with any external service. (The optional feedback form below is a separate web page you open yourself.)
- **No analytics or tracking.** There is no Google Analytics, Mixpanel, Segment, or any other tracking tool embedded in InboxSort.
- **No telemetry.** Usage patterns, feature usage, error reports, and crash data are not collected.
- **No third-party scripts.** InboxSort contains no third-party libraries, SDKs, or dependencies. All code is first-party.
- **No data sharing.** Your information is never sold, rented, shared, or disclosed to any third party.
- **No email modification.** InboxSort does not move, delete, archive, label, mark, or modify any email. All sorting and filtering is purely visual, using CSS transforms to reorder how emails appear on screen. Your actual Gmail inbox remains untouched.

## Optional Feedback Form

The popup has **Suggest an idea** and **Report a problem** links. They open a feedback form at `https://feedback.netrition.com` in a new browser tab. InboxSort itself sends nothing to that page except the extension name, the version number and the type of feedback, which are placed in the page address fragment (the part after `#`, which browsers do not send to servers).

Anything you type or attach on that form is sent only when you click Send. Reports are stored by the developer on Cloudflare and emailed to the developer through SparkPost. They are used only to read, answer and act on your feedback. They are not sold or shared for advertising. Do not include email contents, addresses or other personal details that you do not want to share. To ask for a report to be deleted, open an issue at https://github.com/alex-brecher/InboxSort.

## Permissions Explained

InboxSort requests two Chrome permissions:

| Permission | Why It Is Needed |
|---|---|
| `activeTab` | Allows InboxSort to interact with the Gmail page in your active tab -- reading email row elements and injecting the sort toolbar. This permission only activates on `mail.google.com`. |
| `storage` | Allows InboxSort to save and retrieve your preferences (sort order, accent color, settings toggles) so they persist between browser sessions. |

InboxSort does **not** request the `identity`, `cookies`, `history`, `bookmarks`, `downloads`, or any other sensitive Chrome permissions.

## Children's Privacy

InboxSort does not knowingly collect any personal information from children under the age of 13.

## Changes to This Policy

If this privacy policy is updated, the changes will be reflected in the "Last updated" date at the top of this document. Material changes will be noted in the extension's changelog.

## Contact

If you have questions about this privacy policy or InboxSort's data practices, please contact:

**Alex Brecher**
Email: abrecher@gmail.com

## Open Source

InboxSort's source code is fully auditable. You can review every line of code to verify the privacy claims made in this policy.
