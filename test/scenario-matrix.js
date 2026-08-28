const fs = require("node:fs");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");

const source = fs.readFileSync(require("node:path").join(__dirname, "..", "content.js"), "utf8");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function row(id, sender, date, options = {}) {
  const unread = options.unread ? " zE" : "";
  const starClass = options.starred ? "T-KT T-KT-Jp" : "T-KT";
  const starLabel = options.starred ? "Starred" : "Not starred";
  const attachment = options.attachment ? '<span class="aZo"></span>' : "";
  return `<tr class="zA${unread}" data-id="${id}" data-height="${options.height || 40}">
    <td><div role="checkbox" aria-checked="false"></div></td>
    <td class="apU"><span class="${starClass}" aria-label="${starLabel}"></span></td>
    <td><span class="zF">${sender}</span></td>
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

function makeChrome(window, state) {
  const listeners = [];
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
      getManifest: () => ({ version: "1.2.2" }),
      onMessage: { addListener() {} }
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
          for (const listener of listeners) listener(changes, "sync");
        }
      },
      local: {
        get(keys, callback) { callback(subset(keys)); },
        set(value, callback) { Object.assign(state, value); if (callback) callback(); }
      },
      onChanged: { addListener(listener) { listeners.push(listener); } }
    }
  };
}

async function createApp(url = "https://mail.google.com/mail/u/0/#inbox") {
  const rows = [
    row("unstar-new", "Zulu", "Aug 28, 2026, 11:00 AM", { unread: true, height: 42 }),
    row("star-old", "Beta", "Aug 26, 2026, 9:00 AM", { starred: true, height: 36 }),
    row("unstar-old", "Alpha", "Aug 25, 2026, 8:00 AM", { attachment: true, height: 48 }),
    row("star-new", "Gamma", "Aug 28, 2026, 10:00 AM", { starred: true, unread: true, height: 40 })
  ].join("");
  const dom = new JSDOM(
    `<!doctype html><html><body><div gh="tm"></div><div role="main"><table><tbody>${rows}</tbody></table></div></body></html>`,
    { url, runScripts: "outside-only", pretendToBeVisual: true }
  );
  const { window } = dom;
  installLayout(window);
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  const state = { sortMode: "newest", groupEnabled: false, autoSort: true, perLabel: false, accentColor: "blue", hiddenTabs: {} };
  window.chrome = makeChrome(window, state);
  window.eval(source);
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
  await wait(700);
  return { dom, window, state };
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
  pass("Alt+7 Starred and Alt+6 Group shortcuts");

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
