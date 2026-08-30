const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "popup.html"), "utf8");
const source = fs.readFileSync(path.join(root, "popup.js"), "utf8");
const css = fs.readFileSync(path.join(root, "popup.css"), "utf8");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function createPopup(options = {}) {
  const dom = new JSDOM(html, {
    url: "chrome-extension://inboxsort/popup.html",
    runScripts: "outside-only",
    pretendToBeVisual: true
  });
  const { window } = dom;
  const storage = {
    sortMode: "starredFirst",
    groupEnabled: true,
    accentColor: "purple",
    autoSort: true,
    perLabel: false,
    hiddenTabs: { sender: true },
    snoozeState: { sortMode: "starredFirst", groupEnabled: true, endTime: Date.now() + 60000 },
    ...(options.storage || {})
  };
  const contentState = {
    sortMode: storage.sortMode,
    groupEnabled: storage.groupEnabled,
    filterStarred: true,
    filterUnread: false,
    filterAttachment: false,
    autoSort: storage.autoSort,
    perLabel: storage.perLabel,
    hiddenTabs: storage.hiddenTabs,
    isSnoozed: true,
    snoozeRemaining: 12,
    ...(options.contentState || {})
  };
  const messages = [];

  function subset(keys) {
    if (keys == null) return { ...storage };
    if (typeof keys === "string") return keys in storage ? { [keys]: storage[keys] } : {};
    if (Array.isArray(keys)) return Object.fromEntries(keys.filter((key) => key in storage).map((key) => [key, storage[key]]));
    return { ...keys, ...Object.fromEntries(Object.keys(keys).filter((key) => key in storage).map((key) => [key, storage[key]])) };
  }

  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.chrome = {
    runtime: {
      id: "inboxsort-popup",
      lastError: null,
      getManifest: () => ({ version: "1.3.1" })
    },
    storage: {
      sync: {
        get(keys, callback) { callback(subset(keys)); },
        set(value, callback) { Object.assign(storage, value); if (callback) callback(); }
      },
      local: {
        get(keys, callback) { callback(subset(keys)); },
        set(value, callback) { Object.assign(storage, value); if (callback) callback(); }
      }
    },
    tabs: {
      query(_query, callback) {
        callback(options.gmail === false ? [{ id: 3, url: "https://example.com/" }] : [{ id: 3, url: "https://mail.google.com/mail/u/0/#inbox" }]);
      },
      sendMessage(_tabId, message, callback) {
        messages.push(message);
        if (message.action === "getState") {
          callback({ ...contentState });
          return;
        }
        if (message.action === "applySort") contentState.sortMode = message.mode;
        if (message.action === "toggleGroup") contentState.groupEnabled = !contentState.groupEnabled;
        if (message.action === "toggleFilter") {
          const key = message.filter === "attachment" ? "filterAttachment" : message.filter === "starred" ? "filterStarred" : "filterUnread";
          contentState[key] = !contentState[key];
        }
        if (message.action === "setHiddenTabs") contentState.hiddenTabs = message.hiddenTabs;
        callback({ ok: true });
      }
    }
  };

  window.eval(source);
  await wait(160);
  return { dom, window, storage, contentState, messages };
}

async function run() {
  const results = [];
  const pass = (name) => results.push({ name, status: "PASS" });
  const popup = await createPopup();
  const { window, storage, contentState } = popup;
  const doc = window.document;

  assert.equal(doc.documentElement.lang, "en");
  assert.equal(doc.querySelector("#sortOptions").getAttribute("role"), "radiogroup");
  assert.equal(doc.querySelectorAll('.sort-option[role="radio"]').length, 6);
  assert.equal(doc.querySelectorAll('[role="switch"]').length >= 8, true);
  assert.equal(doc.querySelector("#groupToggleBtn").getAttribute("aria-checked"), "true");
  assert.equal(doc.querySelector('[data-sort="starredFirst"]').getAttribute("aria-checked"), "true");
  assert.equal(doc.querySelectorAll('.sort-option[aria-checked="true"]').length, 1);
  pass("semantic sort controls and switches");

  assert.equal(doc.querySelector("#connectionStatus").textContent, "Gmail ready");
  assert.equal(doc.querySelector('[data-filter="starred"]').getAttribute("aria-pressed"), "true");
  assert.equal(doc.querySelector("#snoozeStatus").classList.contains("visible"), true);
  assert.match(doc.querySelector("#snoozeStatusText").textContent, /12m remaining/);
  assert.equal(doc.querySelector("#inboxsort-version").textContent, "InboxSort v1.3.1");
  pass("live Gmail state and version rendering");

  const toolbarToggle = doc.querySelector("#toggleTabVis");
  const toolbarBody = doc.querySelector("#tabVisBody");
  assert.equal(toolbarToggle.getAttribute("aria-expanded"), "false");
  assert.equal(toolbarBody.hidden, true);
  toolbarToggle.click();
  assert.equal(toolbarToggle.getAttribute("aria-expanded"), "true");
  assert.equal(toolbarBody.hidden, false);
  pass("collapsible disclosure semantics");

  const senderVisibility = doc.querySelector('[data-tab="sender"]');
  assert.equal(senderVisibility.getAttribute("aria-checked"), "false");
  assert.equal(senderVisibility.classList.contains("hidden"), true);
  senderVisibility.click();
  await wait(10);
  assert.equal(storage.hiddenTabs.sender, undefined);
  assert.equal(senderVisibility.getAttribute("aria-checked"), "true");
  pass("toolbar visibility controls update actual merged settings");

  doc.querySelector('[data-sort="senderAZ"]').click();
  await wait(10);
  assert.equal(storage.sortMode, "senderAZ");
  assert.equal(contentState.sortMode, "senderAZ");
  assert.equal(doc.querySelector('[data-sort="senderAZ"]').getAttribute("aria-checked"), "true");
  assert.equal(doc.querySelectorAll('.sort-option[aria-checked="true"]').length, 1);
  pass("sort interaction keeps storage, Gmail, and ARIA in sync");

  const reset = doc.querySelector("#resetBtn");
  reset.click();
  assert.equal(reset.classList.contains("armed"), true);
  assert.equal(storage.sortMode, "senderAZ");
  reset.click();
  await wait(10);
  assert.equal(storage.sortMode, "newest");
  assert.equal(storage.groupEnabled, false);
  assert.equal(storage.snoozeState, null);
  pass("destructive reset requires a second click");

  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient/);
  assert.doesNotMatch(css, /cubic-bezier\(0\.34,\s*1\.56/);
  pass("visual system avoids gradients and bounce motion");

  window.dispatchEvent(new window.Event("unload"));
  popup.dom.window.close();

  const disconnected = await createPopup({ gmail: false });
  assert.equal(disconnected.window.document.querySelector("#connectionStatus").textContent, "Open Gmail");
  disconnected.window.dispatchEvent(new disconnected.window.Event("unload"));
  disconnected.dom.window.close();
  pass("non-Gmail tab shows a clear connection state");

  console.log(JSON.stringify({ total: results.length, passed: results.length, results }, null, 2));
}

run().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
