// Hash router. The path picks a screen module; Telegram's back button walks the app's history.
import * as tg from "./tg.js";
import { ICON } from "./ui.js";

export const ROOTS = ["/feed", "/search", "/places", "/plans"];
const routes = [];
let ctx = null;
let view = null;
let seq = 0;
let depth = 0;
let mode = "push";

export function route(pattern, load) {
  const keys = [];
  const source = pattern.replace(/:(\w+)/g, (_, key) => {
    keys.push(key);
    return "([^/]+)";
  });
  routes.push({ re: new RegExp(`^${source}$`), keys, load });
}

const raw = () => {
  try {
    return decodeURIComponent(location.hash.slice(1));
  } catch {
    return "";
  }
};
export const current = () => (raw().startsWith("/") ? raw() : "/feed");

function match(path) {
  for (const r of routes) {
    const m = r.re.exec(path);
    if (m) return { load: r.load, params: Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]])) };
  }
  return null;
}

export function go(path) {
  if (current() === path) return render();
  location.hash = `#${path}`;
  return undefined;
}

export function replace(path) {
  if (raw() === path) return render();
  mode = "replace";
  location.replace(`#${path}`);
  return undefined;
}

export function back() {
  if (depth > 0) {
    mode = "back";
    history.back();
  } else {
    replace("/feed");
  }
}

export const refresh = () => render();

function onHash() {
  if (mode === "back") depth = Math.max(0, depth - 1);
  else if (mode === "push") depth += 1;
  mode = "push";
  if (ROOTS.includes(current())) depth = 0;
  render();
}

const failed = {
  title: "Ошибка",
  html: '<div class="empty"><p class="h2">Не удалось открыть экран</p><p class="muted">Проверь интернет и попробуй ещё раз.</p><button type="button" class="btn btn-secondary" data-action="retry">Повторить</button></div>',
  bind(el) {
    el.querySelector("[data-action='retry']").addEventListener("click", () => render());
  },
};

async function render() {
  const path = current();
  const m = match(path);
  if (!m) {
    replace("/feed");
    return;
  }
  const token = ++seq;
  let next;
  try {
    const mod = await m.load();
    next = await mod.default(ctx, m.params);
  } catch (err) {
    console.error(err);
    next = failed;
  }
  if (token !== seq) return;
  view?.unmount?.();
  view = next;
  const isRoot = ROOTS.includes(path);
  const el = document.createElement("div");
  el.className = "view";
  el.innerHTML = (!isRoot && !tg.inTelegram()
    ? `<button type="button" class="iconbtn backlink" data-action="back" aria-label="Назад">${ICON.back}</button>` : "") + view.html;
  el.addEventListener("click", (e) => {
    if (e.target.closest("[data-action='back']")) back();
  });
  const screen = document.getElementById("screen");
  screen.replaceChildren(el);
  document.title = view.title || "Заценим";
  const hide = Boolean(view.hideTabs);
  document.body.classList.toggle("no-tabs", hide);
  const bar = document.getElementById("tabbar");
  bar.hidden = hide;
  const tab = path.split("/")[1];
  bar.querySelectorAll("[data-tab]").forEach((a) => {
    const on = a.dataset.tab === tab;
    a.classList.toggle("on", on);
    if (on) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  tg.setBack(isRoot ? null : back);
  window.scrollTo(0, 0);
  screen.focus({ preventScroll: true });
  view.bind?.(el);
  document.body.dataset.route = path;
  document.body.dataset.ready = "1";
}

// first: where to go when the address has no app route (Telegram puts its own data in the hash).
export function start(c, first = "/feed") {
  ctx = c;
  window.addEventListener("hashchange", onHash);
  if (raw().startsWith("/")) return render();
  replace(first);
  return Promise.resolve();
}
