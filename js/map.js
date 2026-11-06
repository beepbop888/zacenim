// Yandex Maps JS API 2.1, loaded on first use. Without a key the screens show mapNote() instead of a map.
import { CONFIG } from "../config.js";
import { esc } from "./ui.js";
import { fmtScore, scoreClass } from "./format.js";
import { limitPoints, bbox } from "./geo.js";

export const MOSCOW = { lat: 55.7558, lon: 37.6176 };
const MAX_PINS = 300;
let loading = null;
let report = () => {};
// report({ok, detail}) is told once per map: whether Yandex loaded and how many map tiles drew 5 s later.
export const setMapReporter = (fn) => { report = fn; };
const CHECK_AFTER_MS = 4000; // after we know where the tiles come from

// Some VPNs let Yandex's map code through but block its tile server. One tile is tried directly;
// if it fails, the map draws Yandex tiles fetched through our server (CONFIG.TILES) instead.
const DIRECT_TILE = "https://core-renderer-tiles.maps.yandex.net/tiles?l=map&x=309&y=160&z=9&scale=1&lang=ru_RU";
const PROBE_MS = 4000;
const OUR_TYPE = "zc#map";
const HINT = "zcTilesViaUs"; // last time Yandex's tiles were blocked: start with ours
let direct = null; // Promise<boolean>, once per app run
const readHint = () => { try { return localStorage.getItem(HINT) === "1"; } catch { return false; } };
const saveHint = (blocked) => { try { if (blocked) localStorage.setItem(HINT, "1"); else localStorage.removeItem(HINT); } catch { /* private mode */ } };

function directTilesWork() {
  if (!direct) {
    direct = new Promise((resolve) => {
      const img = new Image();
      const done = (ok) => { clearTimeout(timer); img.onload = img.onerror = null; resolve(ok); };
      const timer = setTimeout(() => done(false), PROBE_MS);
      img.onload = () => done(img.naturalWidth > 0);
      img.onerror = () => done(false);
      img.src = DIRECT_TILE;
    }).then((ok) => { saveHint(!ok); return ok; });
  }
  return direct;
}

function ourType(ymaps) {
  if (!ymaps.mapType.storage.get(OUR_TYPE)) {
    const scale = (window.devicePixelRatio || 1) > 1 ? 2 : 1;
    const base = CONFIG.TILES || `${CONFIG.API_BASE}/tiles`;
    ymaps.layer.storage.add("zc#tiles", function ZcTiles() {
      const layer = new ymaps.Layer((tile, zoom) => `${base}/${zoom}/${tile[0]}/${tile[1]}?s=${scale}`, { tileTransparent: false });
      layer.getCopyrights = () => ymaps.vow.resolve(["© Яндекс"]);
      layer.getZoomRange = () => ymaps.vow.resolve([0, 19]);
      return layer;
    });
    ymaps.mapType.storage.add(OUR_TYPE, new ymaps.MapType("Заценим", ["zc#tiles"]));
  }
  return OUR_TYPE;
}

// Makes a box reach from where it starts down to the tab bar, at least 320 px tall.
export function fillToTabbar(box) {
  const bar = document.getElementById("tabbar");
  const bottom = bar && !bar.hidden ? bar.getBoundingClientRect().top : window.innerHeight;
  box.style.height = `${Math.max(320, Math.round(bottom - box.getBoundingClientRect().top))}px`;
}

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
// At most 300 pins at a time: the ones nearest the middle of the map, picked again after every move.
export async function mountMap(el, { points, center = null, zoom = 15, selected = null, onPick = null }) {
  const t0 = performance.now();
  const ms = () => Math.round(performance.now() - t0);
  let ymaps;
  try {
    ymaps = await loadYmaps();
  } catch (err) {
    report({ ok: false, detail: `${err.message} after ${ms()} ms; online ${navigator.onLine}` });
    throw err;
  }
  const loadedIn = ms();
  const first = center || limitPoints(points, null, MAX_PINS)[0] || MOSCOW;
  const probe = directTilesWork();
  const startOurs = readHint();
  const map = new ymaps.Map(el, { center: [first.lat, first.lon], zoom, controls: [], type: startOurs ? ourType(ymaps) : "yandex#map" },
    { suppressMapOpenBlock: true, yandexMapDisablePoiInteractivity: true });
  const layouts = new Map();
  const layout = (p) => {
    const html = pinHtml(p, selected);
    if (!layouts.has(html)) layouts.set(html, ymaps.templateLayoutFactory.createClass(html));
    return layouts.get(html);
  };
  let marks = new Map(); // id -> [placemark, point]
  // Highlights one pin (or none) and tells the screen.
  function select(id) {
    const before = selected;
    selected = id;
    for (const pid of [before, id]) {
      const hit = pid && marks.get(pid);
      if (hit) hit[0].options.set("iconLayout", layout(hit[1]));
    }
    if (onPick) onPick(id);
  }
  function pins(around) {
    const shown = limitPoints(points, around, MAX_PINS);
    map.geoObjects.removeAll();
    marks = new Map();
    for (const p of shown) {
      const mark = new ymaps.Placemark([p.lat, p.lon], {}, {
        iconLayout: layout(p),
        iconShape: { type: "Circle", coordinates: [0, 0], radius: 20 },
      });
      if (onPick) mark.events.add("click", () => select(p.id));
      marks.set(p.id, [mark, p]);
      map.geoObjects.add(mark);
    }
    return shown;
  }
  if (onPick) map.events.add("click", () => select(null));
  const shown = pins(center || first);
  if (points.length > MAX_PINS) {
    map.events.add("boundschange", () => {
      const [lat, lon] = map.getCenter();
      pins({ lat, lon });
    });
  }
  if (!center && points.length <= MAX_PINS && shown.length > 1) map.setBounds(bbox(shown), { checkZoomRange: true, zoomMargin: 48 });
  let gone = false;
  let check = null;
  let via = startOurs ? "our server" : "Yandex";
  probe.then((ok) => {
    if (gone) return;
    via = ok ? "Yandex" : "our server";
    const want = ok ? "yandex#map" : ourType(ymaps);
    if (map.getType() !== want) map.setType(want);
    check = setTimeout(checkTiles, CHECK_AFTER_MS);
  });
  function checkTiles() {
    if (gone) return;
    const imgs = [...el.querySelectorAll("img")];
    const okImgs = imgs.filter((i) => i.complete && i.naturalWidth > 0).length;
    const canvases = el.querySelectorAll("canvas").length;
    const drawn = okImgs + canvases;
    report({ ok: drawn > 0, detail: `loaded in ${loadedIn} ms; tiles ${via === "Yandex" ? "from Yandex" : "via our server"}; box ${el.clientWidth}x${el.clientHeight}; tiles ${drawn} (img ${okImgs}/${imgs.length}, canvas ${canvases}); pins ${shown.length}` });
  }
  return {
    destroy: () => {
      gone = true;
      clearTimeout(check);
      map.destroy();
    },
  };
}
