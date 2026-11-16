const fs = require("node:fs");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");

const root = require("node:path").join(__dirname, "..");
// Load the content scripts exactly as the manifest lists them, in order.
const manifest = JSON.parse(fs.readFileSync(require("node:path").join(root, "manifest.json"), "utf8"));
const source = manifest.content_scripts[0].js
  .map((file) => fs.readFileSync(require("node:path").join(root, file), "utf8"))
  .join("\n;\n");
const styles = fs.readFileSync(require("node:path").join(root, "styles.css"), "utf8");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function row(id, sender, date, options = {}) {
  const unread = options.unread ? " zE" : "";
  const senderClass = options.senderClass || "zF";
  const starClass = options.starred ? "T-KT T-KT-Jp" : "T-KT";
  const starLabel = options.starred ? "Starred" : "Not starred";
  const attachment = options.attachment ? '<span class="aZo"></span>' : "";
  const senderMarkup = options.senderMarkup || (options.missingSender
    ? ""
    : `<span class="${senderClass}"${options.senderName ? ` name="${options.senderName}"` : ""}>${sender}</span>`);
  return `<tr class="zA${unread}" data-id="${id}" data-height="${options.height || 40}">
    <td><div role="checkbox" aria-checked="false"></div></td>
    <td class="apU"><span class="${starClass}" aria-label="${starLabel}"></span></td>
    <td>${senderMarkup}</td>
    <td><span class="bog">Subject ${id}</span><span class="y2">Snippet ${id}</span>${attachment}</td>
    <td><span title="${date}">${date}</span></td>
  </tr>`;
}

function installLayout(window) {
  Object.defineProperty(window.HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get() {
      if (this.style.display === "none" || this.hidden) return 0;
      return Number(this.getAttribute("data-height")) || 30;
    }
  });
  Object.defineProperty(window.HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get() { return this.style.display === "none" || this.hidden ? 0 : 300; }
  });
  Object.defineProperty(window.HTMLElement.prototype, "offsetTop", {
    configurable: true,
    get() {
      if (!this.parentElement) return 0;
      let top = 0;
      for (const sibling of this.parentElement.children) {
        if (sibling === this) break;
        top += sibling.offsetHeight || 0;
      }
      return top;
    }
  });
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    const match = /translateY\((-?[\d.]+)px\)/.exec(this.style.transform || "");
    const translate = match ? Number(match[1]) : 0;
    const top = this.offsetTop + translate;
    return { x: 0, y: top, top, left: 0, width: this.offsetWidth, height: this.offsetHeight, right: this.offsetWidth, bottom: top + this.offsetHeight };
  };
}

function makeChrome(window, state, bus) {
  const runtimeListeners = [];
  function subset(keys) {
    if (keys == null) return { ...state };
    if (Array.isArray(keys)) return Object.fromEntries(keys.filter((k) => k in state).map((k) => [k, state[k]]));
    if (typeof keys === "string") return keys in state ? { [keys]: state[keys] } : {};
    if (typeof keys === "object") return { ...keys, ...Object.fromEntries(Object.keys(keys).filter((k) => k in state).map((k) => [k, state[k]])) };
    return {};
  }
  return {
    runtime: {
      id: "inboxsort-matrix",
      lastError: null,
      getManifest: () => ({ version: "1.4.1" }),
      onMessage: { addListener(listener) { runtimeListeners.push(listener); } }
    },
    storage: {
      sync: {
        get(keys, callback) { callback(subset(keys)); },
        set(value, callback) {
          const changes = {};
          for (const [key, next] of Object.entries(value)) {
            changes[key] = { oldValue: state[key], newValue: next };
            state[key] = next;
          }
          if (callback) callback();
          for (const listener of bus.listeners) listener(changes, "sync");
        }
      },
      local: {
        get(keys, callback) { callback(subset(keys)); },
        set(value, callback) {
          const changes = {};
          for (const [key, next] of Object.entries(value)) {
            changes[key] = { oldValue: state[key], newValue: next };
            state[key] = next;
          }
          if (callback) callback();
          for (const listener of bus.listeners) listener(changes, "local");
        }
      },
      onChanged: { addListener(listener) { bus.listeners.push(listener); } }
    },
    _sendMessage(message) {
      return new Promise((resolve) => {
        let settled = false;
        const sendResponse = (response) => {
          if (!settled) {
            settled = true;
            resolve(response);
          }
        };
        for (const listener of runtimeListeners) {
          listener(message, {}, sendResponse);
        }
        if (!settled) resolve(undefined);
      });
    }
  };
}

async function createApp(url = "https://mail.google.com/mail/u/0/#inbox", options = {}) {
  const rows = options.rows || [
    row("unstar-new", "Zulu", "Aug 28, 2026, 11:00 AM", { unread: true, height: 42 }),
    row("star-old", "Beta", "Aug 26, 2026, 9:00 AM", { starred: true, height: 36 }),
    row("unstar-old", "Alpha", "Aug 25, 2026, 8:00 AM", { attachment: true, height: 48 }),
    row("star-new", "Gamma", "Aug 28, 2026, 10:00 AM", { starred: true, unread: true, height: 40 })
  ].join("");
  const dom = new JSDOM(
    `<!doctype html><html><body><div gh="tm">${options.toolbarHtml || ""}</div><div role="main"><table><tbody>${rows}</tbody></table></div></body></html>`,
    { url, runScripts: "outside-only", pretendToBeVisual: true }
  );
  const { window } = dom;
  installLayout(window);
  const media = { matches: !!options.systemDark, listeners: [] };
  window.matchMedia = () => ({
    get matches() { return media.matches; },
    addEventListener(_type, fn) { media.listeners.push(fn); },
    removeEventListener() {}
  });
  const state = options.state || { sortMode: "newest", groupEnabled: false, autoSort: true, perLabel: false, accentColor: "blue", hiddenTabs: {} };
  const bus = options.bus || { listeners: [] };
  window.chrome = makeChrome(window, state, bus);
  window.eval(source);
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
  await wait(700);
  const setSystemDark = (on) => { media.matches = on; media.listeners.forEach((fn) => fn({ matches: on })); };
  return { dom, window, state, bus, setSystemDark };
}

function visualOrder(window) {
  return [...window.document.querySelectorAll("tr.zA")]
    .map((el) => ({ id: el.dataset.id, top: el.getBoundingClientRect().top, height: el.offsetHeight }))
    .sort((a, b) => a.top - b.top);
}

function assertNoOverlap(items) {
  for (let i = 1; i < items.length; i++) {
    assert.ok(items[i].top >= items[i - 1].top + items[i - 1].height, `${items[i].id} overlaps ${items[i - 1].id}`);
  }
}

async function run() {
  const results = [];
  const app = await createApp();
  const { window, state } = app;
  const doc = window.document;
  const pass = (name) => results.push({ name, status: "PASS" });

  assert.equal(doc.querySelectorAll(".gmail-sort-container").length, 1);
  assert.equal(doc.querySelector(".gmail-sort-container").classList.contains("gmail-sort-hidden"), false);
  pass("inbox toolbar injection");

  assert.match(styles, /container-name:\s*inboxsort-toolbar/);
  assert.match(styles, /@container inboxsort-toolbar \(max-width: 950px\)/);
  assert.match(styles, /\.gmail-sort-tab:focus-visible/);
  assert.doesNotMatch(styles, /\.inboxsort-tab:focus-visible/);
  pass("responsive toolbar and keyboard focus CSS");

  doc.querySelector('[data-tab-group="starred"]').click();
  await wait(260);
  assert.deepEqual(visualOrder(window).map((x) => x.id), ["star-new", "star-old", "unstar-new", "unstar-old"]);
  assertNoOverlap(visualOrder(window));
  assert.equal(state.sortMode, "starredFirst");
  pass("starred first with newest secondary sort and mixed row heights");

  doc.querySelector('[data-tab-group="unread"]').click();
  await wait(260);
  assert.deepEqual(visualOrder(window).map((x) => x.id), ["unstar-new", "star-new", "star-old", "unstar-old"]);
  assertNoOverlap(visualOrder(window));
  pass("unread first with newest secondary sort");

  doc.querySelector('[data-tab-group="sender"]').click();
  await wait(20);
  assert.deepEqual(visualOrder(window).map((x) => x.id), ["unstar-old", "star-old", "star-new", "unstar-new"]);
  doc.querySelector('[data-tab-group="sender"]').click();
  await wait(20);
  assert.deepEqual(visualOrder(window).map((x) => x.id), ["unstar-new", "star-new", "star-old", "unstar-old"]);
  pass("sender A-Z and Z-A cycle");

  doc.querySelector('[data-tab-group="date"]').click();
  await wait(20);
  assert.deepEqual(visualOrder(window).map((x) => x.id), ["unstar-old", "star-old", "star-new", "unstar-new"]);
  doc.querySelector('[data-tab-group="date"]').click();
  await wait(20);
  assert.deepEqual(visualOrder(window).map((x) => x.id), ["unstar-new", "star-old", "unstar-old", "star-new"]);
  pass("oldest cycle and default-order restore");

  doc.querySelector('[data-stat="starred"]').click();
  await wait(20);
  assert.deepEqual([...doc.querySelectorAll("tr.zA.gmail-sort-dim")].map((x) => x.dataset.id).sort(), ["unstar-new", "unstar-old"]);
  doc.querySelector('[data-stat="starred"]').click();
  await wait(20);
  assert.equal(doc.querySelectorAll("tr.zA.gmail-sort-dim").length, 0);
  pass("starred quick filter toggle");

  const input = doc.querySelector(".gmail-sort-search-input");
  input.value = "alpha";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  await wait(220);
  assert.deepEqual([...doc.querySelectorAll("tr.zA:not(.gmail-sort-dim)")].map((x) => x.dataset.id), ["unstar-old"]);
  doc.querySelector(".gmail-sort-search-close").click();
  await wait(20);
  assert.equal(doc.querySelectorAll("tr.zA.gmail-sort-dim").length, 0);
  pass("search and clear");

  window.location.hash = "#inbox/FMfcgzQhWBmpNjTMDxspXZdSMcSkPplX";
  doc.querySelector('div[role="main"]').appendChild(doc.createElement("span"));
  await wait(400);
  assert.equal(doc.querySelector(".gmail-sort-container").classList.contains("gmail-sort-hidden"), true);
  window.location.hash = "#inbox";
  doc.querySelector('div[role="main"]').appendChild(doc.createElement("span"));
  await wait(400);
  assert.equal(doc.querySelector(".gmail-sort-container").classList.contains("gmail-sort-hidden"), false);
  pass("thread navigation hides toolbar and inbox return restores it");

  window.location.hash = "#sent";
  doc.querySelector('div[role="main"]').appendChild(doc.createElement("span"));
  await wait(400);
  assert.equal(doc.querySelector(".gmail-sort-container").classList.contains("gmail-sort-hidden"), true);
  window.location.hash = "#label/Work";
  doc.querySelector('div[role="main"]').appendChild(doc.createElement("span"));
  await wait(400);
  assert.equal(doc.querySelector(".gmail-sort-container").classList.contains("gmail-sort-hidden"), false);
  pass("excluded Sent view and custom label view");

  const oldMain = doc.querySelector('div[role="main"]');
  const replacement = oldMain.cloneNode(true);
  oldMain.replaceWith(replacement);
  doc.querySelector(".gmail-sort-container").remove();
  await wait(1700);
  assert.equal(doc.querySelectorAll(".gmail-sort-container").length, 1);
  await wait(1700);
  assert.equal(doc.querySelectorAll(".gmail-sort-container").length, 1);
  pass("main-view replacement recovery without duplicates");

  window.location.hash = "#inbox";
  replacement.appendChild(doc.createElement("span"));
  await wait(400);
  doc.querySelector('[data-tab-group="starred"]').click();
  await wait(30);
  const tbody = replacement.querySelector("tbody");
  tbody.insertAdjacentHTML("afterbegin", row("star-latest", "Delta", "Aug 28, 2026, 12:00 PM", { starred: true, height: 44 }));
  await wait(800);
  assert.equal(visualOrder(window)[0].id, "star-latest");
  assertNoOverlap(visualOrder(window));
  pass("new email during active sort");

  const removeTarget = doc.querySelector('tr[data-id="star-old"]');
  removeTarget.remove();
  await wait(800);
  assertNoOverlap(visualOrder(window));
  assert.equal(doc.querySelectorAll('tr[data-id="star-old"]').length, 0);
  pass("row removal during active sort");

  // Regression: a second archive inside the re-sort throttle window must
  // still be re-sorted, otherwise rows stay overlapped.
  doc.querySelector('tr[data-id="unstar-new"]').remove();
  await wait(300);
  doc.querySelector('tr[data-id="star-latest"]').remove();
  await wait(1200);
  assertNoOverlap(visualOrder(window));
  assert.equal(visualOrder(window)[0].top, 0);
  pass("back-to-back archives inside the throttle window re-sort");

  for (let i = 0; i < 8; i++) {
    doc.querySelector('[data-tab-group="sender"]').click();
  }
  await wait(50);
  assertNoOverlap(visualOrder(window));
  assert.equal(doc.querySelectorAll(".gmail-sort-container").length, 1);
  pass("rapid sort cycling");

  input.blur();
  doc.body.dispatchEvent(new window.KeyboardEvent("keydown", { bubbles: true, altKey: true, code: "Digit7", key: "7" }));
  await wait(20);
  assert.equal(state.sortMode, "starredFirst");
  doc.body.dispatchEvent(new window.KeyboardEvent("keydown", { bubbles: true, altKey: true, code: "Digit6", key: "6" }));
  await wait(260);
  assert.equal(state.groupEnabled, true);
  assert.equal(doc.querySelector("tr.zA").style.transition, "none");
  assertNoOverlap(visualOrder(window));
  pass("Alt+7 Starred and Alt+6 Group shortcuts");

  assert.equal(doc.querySelector('[data-stat="unread"]').tagName, "BUTTON");
  assert.equal(doc.querySelector('[data-stat="starred"]').getAttribute("aria-pressed"), "false");
  doc.querySelector('[data-stat="starred"]').click();
  await wait(20);
  assert.equal(doc.querySelector('[data-stat="starred"]').getAttribute("aria-pressed"), "true");
  pass("stats quick filters use accessible button semantics");

  const hiddenState = {
    sortMode: "newest",
    groupEnabled: false,
    autoSort: true,
    perLabel: false,
    accentColor: "blue",
    hiddenTabs: { sender: true, starred: true }
  };
  const hiddenApp = await createApp(undefined, { state: hiddenState });
  assert.equal(hiddenApp.window.document.querySelector('[data-tab-group="sender"]').style.getPropertyValue("display"), "none");
  assert.equal(hiddenApp.window.document.querySelector('[data-tab-group="starred"]').style.getPropertyValue("display"), "none");
  assert.notEqual(hiddenApp.window.document.querySelector('[data-tab-group="date"]').style.getPropertyValue("display"), "none");
  hiddenApp.window.dispatchEvent(new hiddenApp.window.Event("beforeunload"));
  hiddenApp.dom.window.close();
  pass("merged toolbar visibility settings map to real controls");

  const readRows = [
    row("read-zulu", "Zulu", "Aug 28, 2026, 11:00 AM", { senderClass: "yP" }),
    row("unread-alpha", "Alpha", "Aug 28, 2026, 10:00 AM", { unread: true }),
    row("read-beta", "", "Aug 28, 2026, 9:00 AM", { senderClass: "yP", senderName: "Beta" }),
    row("multi-rox", "", "Aug 28, 2026, 8:30 AM", { senderMarkup: '<span class="bA4">Me, Rox</span><span class="zF" name="Me">Me</span><span class="yP">,</span><span class="zF" name="Rox">Rox</span>' }),
    row("multi-edisa", "", "Aug 28, 2026, 8:15 AM", { senderMarkup: '<span class="bA4">Me, Edisa</span><span class="zF" name="Me">Me</span><span class="yP">,</span><span class="zF" name="Edisa">Edisa</span>' }),
    row("missing", "", "Aug 28, 2026, 8:00 AM", { missingSender: true })
  ];
  const readApp = await createApp(undefined, { rows: readRows });
  readApp.window.document.querySelector('[data-tab-group="sender"]').click();
  await wait(30);
  assert.deepEqual(visualOrder(readApp.window).map((x) => x.id), ["unread-alpha", "read-beta", "multi-edisa", "multi-rox", "read-zulu", "missing"]);
  readApp.window.dispatchEvent(new readApp.window.Event("beforeunload"));
  readApp.dom.window.close();
  pass("read and multi-participant sender detection with missing-sender placement");

  const clockRows = [
    row("late", "Zulu", "23:05"),
    row("early", "Alpha", "07:15")
  ];
  const clockApp = await createApp(undefined, { rows: clockRows });
  clockApp.window.document.querySelector('[data-tab-group="date"]').click();
  await wait(30);
  assert.deepEqual(visualOrder(clockApp.window).map((x) => x.id), ["early", "late"]);
  clockApp.window.dispatchEvent(new clockApp.window.Event("beforeunload"));
  clockApp.dom.window.close();
  pass("24-hour Gmail time parsing");

  const snoozeState = {
    sortMode: "starredFirst",
    groupEnabled: true,
    autoSort: true,
    perLabel: false,
    accentColor: "blue",
    hiddenTabs: {},
    snoozeState: {
      sortMode: "starredFirst",
      groupEnabled: true,
      endTime: Date.now() + 120000
    }
  };
  const snoozeApp = await createApp(undefined, { state: snoozeState });
  const restoredSnooze = await snoozeApp.window.chrome._sendMessage({ action: "getState" });
  assert.equal(restoredSnooze.isSnoozed, true);
  assert.equal(restoredSnooze.sortMode, "newest");
  assert.equal(restoredSnooze.snoozedSort, "starredFirst");
  assert.ok(restoredSnooze.snoozeRemaining >= 1);
  snoozeApp.window.dispatchEvent(new snoozeApp.window.Event("beforeunload"));
  snoozeApp.dom.window.close();
  pass("pause state survives Gmail reload");

  const sharedState = {
    sortMode: "newest",
    groupEnabled: false,
    autoSort: true,
    perLabel: false,
    accentColor: "blue",
    hiddenTabs: {}
  };
  const sharedBus = { listeners: [] };
  const firstTab = await createApp(undefined, { state: sharedState, bus: sharedBus });
  const secondTab = await createApp(undefined, { state: sharedState, bus: sharedBus });
  firstTab.window.document.querySelector('[data-tab-group="starred"]').click();
  await wait(320);
  assert.equal((await secondTab.window.chrome._sendMessage({ action: "getState" })).sortMode, "starredFirst");
  assert.deepEqual(visualOrder(secondTab.window).map((x) => x.id), ["star-new", "star-old", "unstar-new", "unstar-old"]);
  await firstTab.window.chrome._sendMessage({ action: "snoozeSort", minutes: 15 });
  await wait(30);
  const secondTabPaused = await secondTab.window.chrome._sendMessage({ action: "getState" });
  assert.equal(secondTabPaused.isSnoozed, true);
  assert.equal(secondTabPaused.sortMode, "newest");
  await firstTab.window.chrome._sendMessage({ action: "cancelSnooze" });
  await wait(280);
  const secondTabResumed = await secondTab.window.chrome._sendMessage({ action: "getState" });
  assert.equal(secondTabResumed.isSnoozed, false);
  assert.equal(secondTabResumed.sortMode, "starredFirst");
  pass("pause and resume synchronize across open Gmail tabs");
  firstTab.window.dispatchEvent(new firstTab.window.Event("beforeunload"));
  secondTab.window.dispatchEvent(new secondTab.window.Event("beforeunload"));
  firstTab.dom.window.close();
  secondTab.dom.window.close();
  pass("sort changes synchronize across open Gmail tabs");

  // Regression: with Oldest saved, opening page 1 must not bounce to the last page.
  const pagedState = { sortMode: "oldest", groupEnabled: false, autoSort: true, perLabel: false, accentColor: "blue", hiddenTabs: {} };
  const paged = await createApp(undefined, { state: pagedState, toolbarHtml: '<span class="Dj">1–100 of 197</span>' });
  await wait(300);
  assert.equal(paged.window.location.hash, "#inbox");
  assert.deepEqual(visualOrder(paged.window).map((x) => x.id), ["unstar-old", "star-old", "star-new", "unstar-new"]);
  assert.equal(pagedState.sortMode, "oldest");
  paged.window.document.querySelector('[data-tab-group="date"]').click();
  await wait(20);
  paged.window.document.querySelector('[data-tab-group="date"]').click();
  await wait(20);
  assert.equal(paged.window.location.hash, "#inbox/p2");
  paged.window.dispatchEvent(new paged.window.Event("beforeunload"));
  paged.dom.window.close();
  pass("saved Oldest sorts the current page and only jumps when chosen");

  // Regression: shift-click selects the range the user sees, not DOM order.
  const rangeApp = await createApp();
  const rdoc = rangeApp.window.document;
  for (const cb of rdoc.querySelectorAll('div[role="checkbox"]')) {
    cb.addEventListener("click", () => cb.setAttribute("aria-checked", cb.getAttribute("aria-checked") === "true" ? "false" : "true"));
  }
  rdoc.querySelector('[data-tab-group="starred"]').click();
  await wait(300);
  // Visual order: star-new, star-old, unstar-new, unstar-old. DOM order differs.
  const cbFor = (id) => rdoc.querySelector(`tr[data-id="${id}"] div[role="checkbox"]`);
  cbFor("star-new").dispatchEvent(new rangeApp.window.MouseEvent("click", { bubbles: true }));
  cbFor("star-old").dispatchEvent(new rangeApp.window.MouseEvent("click", { bubbles: true, shiftKey: true }));
  await wait(20);
  const checked = [...rdoc.querySelectorAll('tr.zA')].filter((r) => r.querySelector('div[role="checkbox"]').getAttribute("aria-checked") === "true").map((r) => r.dataset.id).sort();
  assert.deepEqual(checked, ["star-new", "star-old"]);
  // A swapped row clears the anchor; the next shift-click toggles only itself
  // instead of falling through to Gmail's DOM-order range.
  const swappedRow = rdoc.querySelector('tr[data-id="unstar-old"]');
  const swapClone = swappedRow.cloneNode(true);
  swappedRow.replaceWith(swapClone);
  const swapCb = swapClone.querySelector('div[role="checkbox"]');
  swapCb.addEventListener("click", () => swapCb.setAttribute("aria-checked", swapCb.getAttribute("aria-checked") === "true" ? "false" : "true"));
  await wait(900);
  cbFor("unstar-new").dispatchEvent(new rangeApp.window.MouseEvent("click", { bubbles: true, shiftKey: true }));
  await wait(20);
  const checkedAfter = [...rdoc.querySelectorAll('tr.zA')].filter((r) => r.querySelector('div[role="checkbox"]').getAttribute("aria-checked") === "true").map((r) => r.dataset.id).sort();
  assert.deepEqual(checkedAfter, ["star-new", "star-old", "unstar-new"]);
  // "/" and "?" must not be captured where the toolbar is hidden.
  rangeApp.window.location.hash = "#inbox/FMfcgzQhWBmpNjTMDxspXZdSMcSkPplX";
  rdoc.querySelector('div[role="main"]').appendChild(rdoc.createElement("span"));
  await wait(400);
  const slash = new rangeApp.window.KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "/" });
  rdoc.body.dispatchEvent(slash);
  assert.equal(slash.defaultPrevented, false);
  const help = new rangeApp.window.KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "?" });
  rdoc.body.dispatchEvent(help);
  assert.equal(help.defaultPrevented, false);
  assert.equal(rdoc.querySelector(".gmail-sort-cheatsheet"), null);
  rangeApp.window.dispatchEvent(new rangeApp.window.Event("beforeunload"));
  rangeApp.dom.window.close();
  pass("shift-click range follows visual order and hidden toolbar leaves / and ? to Gmail");

  // Appearance: System follows the OS live; Light and Dark override it.
  const themeState = { sortMode: "newest", groupEnabled: false, autoSort: true, perLabel: false, accentColor: "blue", hiddenTabs: {} };
  const themeApp = await createApp(undefined, { state: themeState, systemDark: true });
  const tdoc = themeApp.window.document;
  const isDark = () => tdoc.documentElement.classList.contains("gmail-sort-dark-mode") && tdoc.querySelector(".gmail-sort-container").classList.contains("gmail-sort-dark");
  assert.equal(isDark(), true);
  assert.equal(tdoc.documentElement.style.getPropertyValue("--sort-accent"), "#8ab4f8");
  themeApp.setSystemDark(false);
  assert.equal(tdoc.documentElement.classList.contains("gmail-sort-dark-mode"), false);
  assert.equal(tdoc.documentElement.style.getPropertyValue("--sort-accent"), "#1a73e8");
  themeApp.window.chrome.storage.sync.set({ appearance: "dark" });
  assert.equal(isDark(), true);
  themeApp.setSystemDark(false);
  assert.equal(isDark(), true);
  await themeApp.window.chrome._sendMessage({ action: "setAppearance", appearance: "light" });
  assert.equal(tdoc.documentElement.classList.contains("gmail-sort-dark-mode"), false);
  assert.equal((await themeApp.window.chrome._sendMessage({ action: "getState" })).appearance, "light");
  pass("appearance follows system live and Light/Dark override it");

  // Group marks are data attributes and are re-applied when Gmail swaps a row.
  themeApp.window.document.body.dispatchEvent(new themeApp.window.KeyboardEvent("keydown", { bubbles: true, altKey: true, code: "Digit6", key: "6" }));
  await wait(100);
  const marked = () => [...tdoc.querySelectorAll("tr.zA")].filter((r) => r.hasAttribute("data-inboxsort-group")).length;
  assert.equal(marked(), 4);
  assert.equal(tdoc.querySelectorAll('[data-inboxsort-group-start="first"]').length, 1);
  const swapped = tdoc.querySelector('tr[data-id="star-new"]'); // 4th DOM row: outside the old first-3 check
  const fresh = swapped.cloneNode(true);
  for (const attr of ["data-inboxsort-group", "data-inboxsort-group-start", "data-sort-group", "style"]) fresh.removeAttribute(attr);
  swapped.replaceWith(fresh);
  await wait(900);
  assert.ok(fresh.hasAttribute("data-inboxsort-group"));
  assert.equal(marked(), 4);
  assertNoOverlap(visualOrder(themeApp.window));
  assert.match(styles, /tr\.zA\[data-inboxsort-group="even"\]/);
  themeApp.window.dispatchEvent(new themeApp.window.Event("beforeunload"));
  themeApp.dom.window.close();
  pass("group marks survive Gmail swapping a row element");

  // Regression: per-label memory is pruned so it can never outgrow sync's 8 KB item limit.
  const manyPrefs = {};
  for (let i = 0; i < 120; i++) manyPrefs["label/Project-" + i + "-" + "x".repeat(40)] = "senderAZ";
  const prefsState = { sortMode: "newest", groupEnabled: false, autoSort: true, perLabel: true, accentColor: "blue", hiddenTabs: {}, labelPrefs: manyPrefs };
  const prefsApp = await createApp(undefined, { state: prefsState });
  prefsApp.window.document.querySelector('[data-tab-group="starred"]').click();
  await wait(400);
  const savedKeys = Object.keys(prefsState.labelPrefs);
  assert.ok(savedKeys.length <= 60, `kept ${savedKeys.length} labels`);
  assert.ok(JSON.stringify(prefsState.labelPrefs).length <= 6000);
  assert.equal(savedKeys[savedKeys.length - 1], "inbox");
  assert.equal(prefsState.labelPrefs.inbox, "starredFirst");
  assert.equal(prefsState.sortMode, "starredFirst");
  prefsApp.window.dispatchEvent(new prefsApp.window.Event("beforeunload"));
  prefsApp.dom.window.close();
  pass("per-label sort memory is pruned under the sync item limit");

  // Page-size helper: offered only when Gmail shows fewer than 100 per page.
  const smallPage = await createApp(undefined, { toolbarHtml: '<span class="Dj">1–50 of 197</span>' });
  const pageBtn = smallPage.window.document.querySelector('[data-action="page-size"]');
  assert.ok(pageBtn, "page-size button shown at 50 per page");
  assert.match(smallPage.window.document.querySelector('[data-stat="total"]').title, /1–50 of 197/);
  pageBtn.click();
  assert.equal(smallPage.window.location.hash, "#settings/general");
  smallPage.window.dispatchEvent(new smallPage.window.Event("beforeunload"));
  smallPage.dom.window.close();
  const fullPage = await createApp(undefined, { toolbarHtml: '<span class="Dj">1–100 of 197</span>' });
  assert.equal(fullPage.window.document.querySelector('[data-action="page-size"]'), null);
  fullPage.window.dispatchEvent(new fullPage.window.Event("beforeunload"));
  fullPage.dom.window.close();
  pass("page-size helper appears only below 100 per page");

  // Regression: choosing a sort while paused must not save grouping as off.
  const pauseState = { sortMode: "newest", groupEnabled: true, autoSort: true, perLabel: false, accentColor: "blue", hiddenTabs: {} };
  const pauseApp = await createApp(undefined, { state: pauseState });
  await pauseApp.window.chrome._sendMessage({ action: "snoozeSort", minutes: 15 });
  await wait(30);
  pauseApp.window.document.querySelector('[data-tab-group="sender"]').click();
  await wait(400);
  assert.equal(pauseState.groupEnabled, true);
  assert.equal(pauseState.sortMode, "senderAZ");
  const resumed = await pauseApp.window.chrome._sendMessage({ action: "getState" });
  assert.equal(resumed.isSnoozed, false);
  assert.equal(resumed.groupEnabled, true);
  pauseApp.window.dispatchEvent(new pauseApp.window.Event("beforeunload"));
  pauseApp.dom.window.close();
  pass("sorting while paused keeps grouping on");

  const popout = await createApp("https://mail.google.com/mail/u/0/popout?view=pt&th=abc");
  assert.equal(popout.window.document.querySelector(".gmail-sort-container").classList.contains("gmail-sort-hidden"), true);
  popout.window.dispatchEvent(new popout.window.Event("beforeunload"));
  popout.dom.window.close();
  pass("standalone popout hidden synchronously");

  window.dispatchEvent(new window.Event("beforeunload"));
  app.dom.window.close();

  console.log(JSON.stringify({ total: results.length, passed: results.length, results }, null, 2));
}

run().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
