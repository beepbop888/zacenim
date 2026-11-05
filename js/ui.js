// HTML helpers shared by the screens. Every value that comes from the data or from a person
// goes through esc().
import { fmtScore, scoreClass, walkMin, KIND_RU } from "./format.js";

const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ENTITIES[c]);

const svg = (paths) => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
const HEART = '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"';
const MARK = '<path d="M7 4h10v16l-5-3.5L7 20z"';

export const ICON = {
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
  list: svg('<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>'),
  map: svg('<path d="M9 4L3 6.5V20l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>'),
  calendar: svg('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>'),
  bell: svg('<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
  comment: svg('<path d="M5 19V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8z"/>'),
  heart: svg(`${HEART}/>`),
  heartOn: svg(`${HEART} fill="currentColor"/>`),
  bookmark: svg(`${MARK}/>`),
  bookmarkOn: svg(`${MARK} fill="currentColor"/>`),
  send: svg('<path d="M4 12l16-7-6 16-3-7z"/>'),
  photo: svg('<rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/>'),
  phone: svg('<path d="M6.5 4h3L11 8 9 9.5a11 11 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 6a2 2 0 0 1 2-2z"/>'),
  globe: svg('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z"/>'),
  clock: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  pen: svg('<path d="M4 20l4-1L19 8l-3-3L5 16z"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
};

export const scoreBadge = (x, size = "m") => `<span class="score score-${size} ${scoreClass(x)}">${fmtScore(x)}</span>`;
export const emptyScore = (size = "l") => `<span class="score score-${size} none">—</span>`;
export const dot = (colour) => `<span class="dot" style="background:${esc(colour)}"></span>`;

export function metroLine(stations, st, m, tag = "p") {
  const s = stations[st];
  return s ? `<${tag} class="meta">${dot(s[1])}${esc(s[0])}, ${walkMin(m)} мин пешком</${tag}>` : "";
}

export function kindLine(row) {
  const kind = KIND_RU[row[2]] || "Заведение";
  return row[3] ? `${kind}, ${row[3]}` : kind;
}

// label is HTML: escape text before passing it in.
export const chip = (label, attrs = "", on = false) =>
  `<button type="button" class="chip${on ? " on" : ""}" aria-pressed="${on}" ${attrs}>${label}</button>`;

export function tabs(items, active) {
  return `<div class="tabs" role="tablist">${items.map(([key, label]) => {
    const on = key === active;
    return `<button type="button" role="tab" class="tab${on ? " on" : ""}" aria-selected="${on}" data-tab-key="${esc(key)}">${esc(label)}</button>`;
  }).join("")}</div>`;
}

export function placeRow(row, stations, { score = null, rank = null, href = null, sub = null } = {}) {
  return `<a class="row" href="${esc(href || `#/place/${row[0]}`)}" data-place="${esc(row[0])}">${
    rank === null ? "" : `<span class="rank">${rank}</span>`}<span class="body"><span class="name">${esc(row[1])}</span><span class="kind">${
    esc(sub ?? kindLine(row))}</span>${metroLine(stations, row[6], row[7], "span")}</span>${score === null ? "" : scoreBadge(score)}</a>`;
}

export const emptyState = (title, text, actionHtml = "") =>
  `<div class="empty"><p class="h2">${esc(title)}</p><p class="muted">${esc(text)}</p>${actionHtml}</div>`;

export const notFound = (title = "Место не найдено") => ({
  title,
  html: emptyState(title, "Возможно, его убрали из базы.", '<a class="btn btn-secondary" href="#/search">К поиску</a>'),
});

let toastTimer = null;
export function toast(text) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    document.body.append(el);
  }
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
}
