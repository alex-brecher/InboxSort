// Stand-in chrome.* API for visual checks in a normal browser tab.
// Query params seed storage: ?appearance=dark&group=1&sort=senderAZ
(function () {
  const q = new URLSearchParams(location.search);
  const state = {
    sortMode: q.get("sort") || "newest",
    groupEnabled: q.get("group") === "1",
    accentColor: q.get("accent") || "blue",
    appearance: q.get("appearance") || "system",
    autoSort: true, perLabel: false, labelPrefs: {}, hiddenTabs: {}
  };
  const listeners = [];
  const msgListeners = [];
  function subset(k) {
    if (k == null) return Object.assign({}, state);
    if (typeof k === "string") return k in state ? { [k]: state[k] } : {};
    if (Array.isArray(k)) return Object.fromEntries(k.filter((x) => x in state).map((x) => [x, state[x]]));
    return Object.assign({}, k, Object.fromEntries(Object.keys(k).filter((x) => x in state).map((x) => [x, state[x]])));
  }
  function setter(area) {
    return function (v, cb) {
      const ch = {};
      for (const key of Object.keys(v)) { ch[key] = { oldValue: state[key], newValue: v[key] }; state[key] = v[key]; }
      setTimeout(() => { if (cb) cb(); listeners.forEach((l) => l(ch, area)); }, 0);
    };
  }
  window.chrome = {
    runtime: { id: "visual", lastError: null, getManifest: () => ({ version: "1.4.1" }), onMessage: { addListener: (f) => msgListeners.push(f) } },
    storage: {
      sync: { get: (k, cb) => setTimeout(() => cb(subset(k)), 0), set: setter("sync") },
      local: { get: (k, cb) => setTimeout(() => cb(subset(k)), 0), set: setter("local") },
      onChanged: { addListener: (f) => listeners.push(f) }
    },
    tabs: {
      query: (_q, cb) => cb([{ id: 1, url: "https://mail.google.com/mail/u/0/#inbox" }]),
      sendMessage: (_id, msg, cb) => {
        let out;
        msgListeners.forEach((f) => f(msg, {}, (r) => { out = r; }));
        if (msg.action === "getState" && !out) out = { sortMode: state.sortMode, groupEnabled: state.groupEnabled, isSnoozed: false };
        if (cb) cb(out || { ok: true });
      }
    }
  };
})();
