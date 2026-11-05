// 2GIS MapGL, loaded on first use. Without a key the screens show mapNote() instead of a map.
import { CONFIG } from "../config.js";
import { esc } from "./ui.js";
import { fmtScore, scoreClass } from "./format.js";
import { limitPoints, bbox } from "./geo.js";

const SCRIPT = "https://mapgl.2gis.com/api/js/v1";
const MOSCOW = { lat: 55.7558, lon: 37.6176 };
let loading = null;

export const mapAvailable = () => Boolean(CONFIG.MAPGL_KEY);

export const mapNote = (text = "Карта пока не подключена. Посмотри места списком.") =>
  `<div class="map-note"><p class="muted">${esc(text)}</p><button type="button" class="btn btn-secondary" data-view="list">Список</button></div>`;

function loadMapgl() {
  if (window.mapgl) return Promise.resolve(window.mapgl);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SCRIPT;
      s.async = true;
      const fail = (why) => {
        loading = null;
        s.remove();
        reject(new Error(why));
      };
      const timer = setTimeout(() => fail("map script timed out"), 15000);
      s.onload = () => {
        clearTimeout(timer);
        if (window.mapgl) resolve(window.mapgl);
        else fail("no mapgl");
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

function pin(p, selected, onPick) {
  const wrap = document.createElement("div");
  const b = document.createElement("button");
  b.type = "button";
  b.className = `pin${p.id === selected ? " on" : ""}`;
  b.dataset.place = p.id;
  b.setAttribute("aria-label", p.name || "Место");
  b.innerHTML = p.score === null || p.score === undefined
    ? '<span class="pin-dot"></span>'
    : `<span class="pin-score ${scoreClass(p.score)}">${fmtScore(p.score)}</span>`;
  if (onPick) b.addEventListener("click", () => onPick(p.id));
  wrap.append(b);
  return wrap;
}

// center: {lat, lon} to centre on it, or null to fit all points.
export async function mountMap(el, { points, center = null, zoom = 15, selected = null, onPick = null }) {
  const mapgl = await loadMapgl();
  const shown = limitPoints(points, center, 300);
  const first = center || shown[0] || MOSCOW;
  const map = new mapgl.Map(el, { key: CONFIG.MAPGL_KEY, center: [first.lon, first.lat], zoom, zoomControl: false });
  if (!center && shown.length > 1) map.fitBounds(bbox(shown), { padding: { top: 48, bottom: 48, left: 48, right: 48 } });
  const markers = shown.map((p) => new mapgl.HtmlMarker(map, { coordinates: [p.lon, p.lat], html: pin(p, selected, onPick) }));
  return {
    destroy() {
      markers.forEach((m) => m.destroy());
      map.destroy();
    },
  };
}
