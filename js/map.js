// Yandex Maps JS API 2.1, loaded on first use. Without a key the screens show mapNote() instead of a map.
import { CONFIG } from "../config.js";
import { esc } from "./ui.js";
import { fmtScore, scoreClass } from "./format.js";
import { limitPoints, bbox } from "./geo.js";

const MOSCOW = { lat: 55.7558, lon: 37.6176 };
let loading = null;

export const mapAvailable = () => Boolean(CONFIG.YANDEX_KEY);

export const mapNote = (text = "Карта пока не подключена. Посмотри места списком.") =>
  `<div class="map-note"><p class="muted">${esc(text)}</p><button type="button" class="btn btn-secondary" data-view="list">Список</button></div>`;

function loadYmaps() {
  if (window.ymaps) return new Promise((resolve) => window.ymaps.ready(() => resolve(window.ymaps)));
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(CONFIG.YANDEX_KEY)}&lang=ru_RU`;
      s.async = true;
      const fail = (why) => {
        loading = null;
        s.remove();
        reject(new Error(why));
      };
      const timer = setTimeout(() => fail("map script timed out"), 15000);
      s.onload = () => {
        clearTimeout(timer);
        if (window.ymaps) window.ymaps.ready(() => resolve(window.ymaps));
        else fail("no ymaps");
      };
      s.onerror = () => {
        clearTimeout(timer);
        fail("map script failed");
      };
      document.head.append(s);
    });
  }
  return loading;
}

// Only fixed classes and formatted numbers go in here: Yandex treats this string as a template.
function pinHtml(p, selected) {
  const inner = p.score === null || p.score === undefined
    ? '<span class="pin-dot"></span>'
    : `<span class="pin-score ${scoreClass(p.score)}">${fmtScore(p.score)}</span>`;
  return `<div class="pin${p.id === selected ? " on" : ""}">${inner}</div>`;
}

// center: {lat, lon} to centre on it, or null to fit all points.
export async function mountMap(el, { points, center = null, zoom = 15, selected = null, onPick = null }) {
  const ymaps = await loadYmaps();
  const shown = limitPoints(points, center, 300);
  const first = center || shown[0] || MOSCOW;
  const map = new ymaps.Map(el, { center: [first.lat, first.lon], zoom, controls: [] },
    { suppressMapOpenBlock: true, yandexMapDisablePoiInteractivity: true });
  const layouts = new Map();
  for (const p of shown) {
    const html = pinHtml(p, selected);
    if (!layouts.has(html)) layouts.set(html, ymaps.templateLayoutFactory.createClass(html));
    const mark = new ymaps.Placemark([p.lat, p.lon], {}, {
      iconLayout: layouts.get(html),
      iconShape: { type: "Circle", coordinates: [0, 0], radius: 20 },
    });
    if (onPick) mark.events.add("click", () => onPick(p.id));
    map.geoObjects.add(mark);
  }
  if (!center && shown.length > 1) map.setBounds(bbox(shown), { checkZoomRange: true, zoomMargin: 48 });
  return { destroy: () => map.destroy() };
}
