// Stand-in for telegram-web-app.js in the end-to-end tests. Open the app with ?tg=0 to
// simulate a normal browser with no Telegram at all.
(() => {
  if (new URLSearchParams(location.search).get("tg") === "0") return;
  const calls = [];
  const handlers = { back: [], settings: [] };
  const key = (k) => `tgcs_${k}`;
  const button = (name) => ({
    isVisible: false,
    show() { this.isVisible = true; },
    hide() { this.isVisible = false; },
    onClick(f) { handlers[name].push(f); },
    offClick(f) { handlers[name] = handlers[name].filter((x) => x !== f); },
  });
  const user = { id: 1001, first_name: "Аня" };
  const initData = window.__tgInitData
    || `query_id=TEST&user=${encodeURIComponent(JSON.stringify(user))}&auth_date=${Math.floor(Date.now() / 1000)}&hash=test`;
  window.Telegram = {
    WebApp: {
      initData,
      initDataUnsafe: { user },
      version: "8.0",
      platform: "ios",
      isVersionAtLeast: () => true,
      ready() { calls.push("ready"); },
      expand() { calls.push("expand"); },
      setHeaderColor(c) { calls.push(`header:${c}`); },
      setBackgroundColor(c) { calls.push(`background:${c}`); },
      setBottomBarColor() {},
      disableVerticalSwipes() { calls.push("disableVerticalSwipes"); },
      BackButton: button("back"),
      SettingsButton: button("settings"),
      HapticFeedback: {
        impactOccurred(s) { calls.push(`impact:${s}`); },
        notificationOccurred(s) { calls.push(`notify:${s}`); },
        selectionChanged() {},
      },
      openLink(url) { calls.push(`openLink:${url}`); },
      requestWriteAccess(cb) { calls.push("requestWriteAccess"); cb(window.__tgWriteAllowed !== false); },
      CloudStorage: {
        getItem(k, cb) { cb(null, localStorage.getItem(key(k)) ?? ""); },
        setItem(k, v, cb) {
          if (window.__tgCloudBroken) { cb("STORAGE_KEY_CLOUD_FULL"); return; }
          localStorage.setItem(key(k), v);
          cb(null, true);
        },
        removeItems(keys, cb) { keys.forEach((k) => localStorage.removeItem(key(k))); cb(null, true); },
      },
    },
  };
  window.__tg = {
    calls,
    back: () => handlers.back.slice().forEach((f) => f()),
    settings: () => handlers.settings.slice().forEach((f) => f()),
  };
})();
