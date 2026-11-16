// InboxSort: Gmail URL and view helpers (pure; no extension state).
(function () {
  "use strict";

  // ── Current Gmail label ─────────────────────────────────────────
  // Gmail thread ids are long base64-ish strings (>= 15 chars). A tail only
  // counts as a thread when the path shape can hold one: three or more
  // segments, or two segments under a built-in root such as inbox/<id>.
  // Two-segment custom labels like label/Work stay list views.
  const THREAD_ID_MIN_LENGTH = 15;
  const SINGLE_ROOT_THREAD_LABELS = {
    inbox: true, all: true, sent: true, starred: true, important: true,
    drafts: true, snoozed: true, spam: true, trash: true, scheduled: true,
    chats: true
  };

  function hasThreadTail(parts) {
    let lastPart = parts[parts.length - 1];
    let looksLikeId = !!(lastPart && lastPart.length >= THREAD_ID_MIN_LENGTH && /^[A-Za-z0-9_-]+$/.test(lastPart));
    if (!looksLikeId) return false;
    return parts.length >= 3 || (parts.length >= 2 && !!SINGLE_ROOT_THREAD_LABELS[parts[0]]);
  }


  function getCurrentLabel() {
    let hash = location.hash;
    if (!hash || hash === "#" || hash === "#inbox" || /^#inbox\/p\d+$/.test(hash)) return "inbox";

    let cleaned = hash.replace(/^#/, "").replace(/\/p\d+$/, "");
    if (!cleaned) return "inbox";

    // In thread view hashes (e.g. inbox/<threadId>), normalize to the list label
    // so per-label prefs don't get stored under transient thread IDs.
    let parts = cleaned.split("/");
    if (hasThreadTail(parts)) parts.pop();

    let normalized = parts.join("/");
    return normalized || "inbox";
  }

  // Labels where the toolbar is hidden — these folders contain too many
  // emails for client-side sorting to work well.
  // ── View detection ────────────────────────────────────────────────

  /**
   * isListView — Determines whether the current Gmail view is a message list
   * (inbox, label, category) vs. a single-message/thread view.
   *
   * Gmail encodes normal thread IDs in the URL hash as the last path segment.
   * Messages opened in their own window use a `/popout` route (or an older
   * query-string message view) and must also be treated as thread views.
   * Thread IDs are long (≥15 chars), Base64-ish strings (alphanumeric + dash + underscore).
   * Examples:  #inbox/FMfcgzQXKhbfGqQlChrCxfZVSvxBpmJB   ← thread view
   *            #inbox/p2                                   ← list view, page 2
   *            #label/Work                                 ← list view
   *
   * See hasThreadTail() for the thread-id heuristic.
   */
  function isListView() {
    // Gmail's "Open in new window" route does not use the normal hash-based
    // thread URL. Current Gmail uses /popout; older/alternate message-only
    // routes use view=btop, view=pt, or view=om.
    if (/\/popout\/?$/.test(location.pathname)) return false;

    let standaloneView = "";
    try {
      standaloneView = new URLSearchParams(location.search).get("view") || "";
    } catch (_) { /* fall through to hash detection */ }
    if (standaloneView === "btop" || standaloneView === "pt" || standaloneView === "om") {
      return false;
    }

    let hash = location.hash;
    if (hash === "" || hash === "#" || hash === "#inbox") return true;
    if (/^#inbox\/p\d+$/.test(hash)) return true;
    let parts = hash.replace(/^#/, "").split("/");
    let lastPart = parts[parts.length - 1];
    if (/^p\d+$/.test(lastPart)) return true;

    return !hasThreadTail(parts);
  }

  function isSearchView() {
    return /^#search\//.test(location.hash);
  }

  // Strip Gmail overlay params (compose, reply, forward, etc.) so
  // opening/closing Compose doesn't trigger a full sort reset.
  function stripGmailOverlayParams(url) {
    return url.replace(/[\?&](compose|view|tf|fs|to|su|body|source|sz|simpl|rm|ms|search|th|cvid|qs|cs)=[^&]*/g, "")
              .replace(/[?&]$/, "");
  }

  globalThis.InboxSort = globalThis.InboxSort || {};
  Object.assign(globalThis.InboxSort, {
    getCurrentLabel: getCurrentLabel,
    isListView: isListView,
    isSearchView: isSearchView,
    stripGmailOverlayParams: stripGmailOverlayParams
  });
})();
