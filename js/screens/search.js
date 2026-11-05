// Search over all places: text, metro station, walking time and kind, as a list or on the map.
import { query, normalize } from "../search.js";
import { esc, ICON, chip, dot, placeRow, emptyState } from "../ui.js";
import { plural } from "../format.js";
import { mapAvailable, mapNote, mountMap } from "../map.js";

const KINDS = [["all", "Все"], ["rest", "Рестораны"], ["bar", "Бары"], ["cafe", "Кофейни"], ["fast", "Быстро"]];
const POPULAR = ["Чистые пруды", "Китай-город", "Маяковская", "Курская", "Новослободская", "Тверская"];
const PAGE = 50;

export default function search(ctx) {
  const s = ctx.search;
  const { rows, stations } = ctx.data;
  let map = null;
  let timer = null;
  let drawSeq = 0;

  const score = (id) => ctx.store.rating(id)?.score ?? null;
  const stationChip = () => (s.station === null
    ? chip("Метро: любое", 'data-action="stations"')
    : chip(`${dot(stations[s.station][1])}${esc(stations[s.station][0])}`, 'data-action="stations"', true));
  const filters = () => stationChip() + (s.station === null ? ""
    : [5, 10, 15].map((w) => chip(`до ${w} мин`, `data-walk="${w}"`, s.walk === w)).join(""));
  const kinds = () => KINDS.map(([k, label]) => chip(esc(label), `data-kind="${k}"`, s.kind === k)).join("");
  const seg = () => [["list", "Список", ICON.list], ["map", "Карта", ICON.map]].map(([v, label, icon]) =>
    `<button type="button" data-view="${v}" class="${s.view === v ? "on" : ""}" aria-pressed="${s.view === v}">${icon}<span>${label}</span></button>`).join("");

  function stationList(text) {
    const n = normalize(text);
    return `<button type="button" class="row" data-station="-1"><span class="body"><span class="name">Любая станция</span></span></button>${
      stations.map((st, i) => [st, i]).filter(([st]) => !n || normalize(st[0]).includes(n))
        .map(([st, i]) => `<button type="button" class="row" data-station="${i}">${dot(st[1])}<span class="body"><span class="name">${esc(st[0])}</span></span></button>`).join("")}`;
  }

  function idle() {
    const chips = POPULAR.map((name) => stations.findIndex((st) => st[0] === name)).filter((i) => i >= 0)
      .map((i) => chip(`${dot(stations[i][1])}${esc(stations[i][0])}`, `data-station="${i}"`)).join("");
    return `<p class="muted">Начни вводить название или выбери станцию метро.</p><div class="chips chips-wrap">${chips}</div>`;
  }

  function suggestions() {
    const n = normalize(s.text);
    if (n.length < 3 || s.station !== null) return "";
    const hits = stations.map((st, i) => [normalize(st[0]), i]).filter(([name]) => name.startsWith(n)).slice(0, 3);
    return hits.length
      ? `<div class="chips">${hits.map(([, i]) => chip(`${dot(stations[i][1])}Метро ${esc(stations[i][0])}`, `data-station="${i}"`)).join("")}</div>`
      : "";
  }

  async function draw(el) {
    const token = ++drawSeq;
    map?.destroy();
    map = null;
    const out = el.querySelector("#results");
    const count = el.querySelector("#count");
    if (!s.text.trim() && s.station === null) {
      count.textContent = "";
      out.innerHTML = idle();
      return;
    }
    const found = query(ctx.data.index, { text: s.text, station: s.station, walk: s.station === null ? null : s.walk, kind: s.kind });
    count.textContent = found.length ? `Нашли ${found.length} ${plural(found.length, "место", "места", "мест")}` : "";
    const top = suggestions();
    if (!found.length) {
      out.innerHTML = top + emptyState("Ничего не нашли", "Попробуй другое слово, станцию или время пешком.");
      return;
    }
    if (s.view === "list") {
      const more = found.length > s.shown ? '<button type="button" class="btn btn-secondary btn-block" data-action="more">Показать ещё</button>' : "";
      out.innerHTML = `${top}<div class="list">${found.slice(0, s.shown).map((i) => placeRow(rows[i], stations, { score: score(rows[i][0]) })).join("")}</div>${more}`;
      return;
    }
    if (!mapAvailable()) {
      out.innerHTML = top + mapNote();
      return;
    }
    out.innerHTML = `${top}<div class="map" id="map"></div><div id="picked"></div>`;
    const points = found.map((i) => rows[i]).map((r) => ({ id: r[0], name: r[1], lat: r[4], lon: r[5], score: score(r[0]) }));
    const center = s.station === null ? null : { lat: stations[s.station][2], lon: stations[s.station][3] };
    try {
      const m = await mountMap(out.querySelector("#map"), {
        points,
        center,
        onPick: (id) => {
          out.querySelector("#picked").innerHTML = `<div class="card">${placeRow(ctx.data.venue(id), stations, { score: score(id) })}</div>`;
        },
      });
      if (token === drawSeq) map = m;
      else m.destroy();
    } catch {
      if (token === drawSeq) out.innerHTML = top + mapNote("Карта не загрузилась. Посмотри места списком.");
    }
  }

  return {
    title: "Поиск",
    html: `<div class="bar"><h1 class="h1">Поиск</h1><div class="seg" role="group" aria-label="Вид результатов" data-tour="view">${seg()}</div></div>
<div class="field-wrap">${ICON.search}<label class="sr" for="q">Место, кухня или метро</label><input id="q" class="field" type="search" placeholder="Место, кухня или метро" value="${esc(s.text)}" autocomplete="off" enterkeyhint="search"></div>
<div class="chips" id="filters" data-tour="station">${filters()}</div>
<div class="chips" id="kinds">${kinds()}</div>
<p class="meta" id="count" aria-live="polite"></p>
<div id="results"></div>
<div class="sheet" id="stations" role="dialog" aria-modal="true" aria-labelledby="stations-title" hidden>
<div class="bar"><h2 class="h1" id="stations-title">Метро</h2><button type="button" class="iconbtn" data-action="close" aria-label="Закрыть">${ICON.close}</button></div>
<div class="field-wrap">${ICON.search}<label class="sr" for="st-q">Станция</label><input id="st-q" class="field" type="search" placeholder="Станция" autocomplete="off"></div>
<div class="list" id="st-list"></div>
</div>`,
    bind(el) {
      const input = el.querySelector("#q");
      const sheet = el.querySelector("#stations");
      const closeSheet = () => {
        sheet.hidden = true;
        el.querySelector("[data-action='stations']").focus();
      };
      const pick = () => {
        s.shown = PAGE;
        el.querySelector("#filters").innerHTML = filters();
        el.querySelector("#kinds").innerHTML = kinds();
        draw(el);
      };
      input.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          s.text = input.value;
          s.shown = PAGE;
          draw(el);
        }, 150);
      });
      el.querySelector("#st-q").addEventListener("input", (e) => {
        el.querySelector("#st-list").innerHTML = stationList(e.target.value);
      });
      sheet.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeSheet();
      });
      el.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        const d = b.dataset;
        if (d.view) {
          s.view = d.view;
          el.querySelector(".seg").innerHTML = seg();
          draw(el);
        } else if (d.action === "stations") {
          el.querySelector("#st-q").value = "";
          el.querySelector("#st-list").innerHTML = stationList("");
          sheet.hidden = false;
          el.querySelector("#st-q").focus();
        } else if (d.action === "close") {
          closeSheet();
        } else if (d.station !== undefined) {
          const i = Number(d.station);
          s.station = i < 0 ? null : i;
          if (b.closest("#results")) {
            s.text = "";
            input.value = "";
          }
          sheet.hidden = true;
          pick();
        } else if (d.walk) {
          s.walk = Number(d.walk);
          pick();
        } else if (d.kind) {
          s.kind = d.kind;
          pick();
        } else if (d.action === "more") {
          s.shown += PAGE;
          draw(el);
        }
      });
      draw(el);
    },
    unmount() {
      clearTimeout(timer);
      map?.destroy();
    },
  };
}
