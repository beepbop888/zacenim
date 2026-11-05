// Thin wrapper over Telegram.WebApp. Every function is safe to call outside Telegram.
const W = () => window.Telegram?.WebApp;
const at = (v) => Boolean(W()?.isVersionAtLeast?.(v));

export const inTelegram = () => Boolean(W()?.initData);
export const initData = () => W()?.initData || "";
export const firstName = () => W()?.initDataUnsafe?.user?.first_name || "";

export function init() {
  const w = W();
  if (!w) return;
  w.ready();
  w.expand();
  if (at("6.9")) {
    w.setHeaderColor("#FFFFFF");
    w.setBackgroundColor("#FFFFFF");
  }
  if (at("7.10")) w.setBottomBarColor("#FFFFFF");
  if (at("7.7")) w.disableVerticalSwipes();
}

let backHandler = null;
export function setBack(handler) {
  const b = W()?.BackButton;
  if (!b || !at("6.1")) return;
  if (backHandler) b.offClick(backHandler);
  backHandler = handler;
  if (handler) {
    b.onClick(handler);
    b.show();
  } else {
    b.hide();
  }
}

export function onSettings(handler) {
  const s = W()?.SettingsButton;
  if (!s || !at("7.0")) return;
  s.onClick(handler);
  s.show();
}

export function haptic(kind) {
  const h = W()?.HapticFeedback;
  if (!h || !at("6.1")) return;
  if (kind === "light") h.impactOccurred("light");
  else h.notificationOccurred(kind);
}

export function openLink(url) {
  if (inTelegram()) W().openLink(url);
  else window.open(url, "_blank", "noopener");
}

export function requestWrite() {
  if (!inTelegram() || !at("6.9")) return Promise.resolve(true);
  return new Promise((resolve) => W().requestWriteAccess((ok) => resolve(Boolean(ok))));
}

export const cloudStorage = () => (inTelegram() && at("6.9") ? W().CloudStorage : null);
