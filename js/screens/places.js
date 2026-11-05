// «Мои места»: your ranking by league and the «Хочу» list, as a list or on the map.
import { esc, ICON, chip, tabs, placeRow, emptyState } from "../ui.js";
import { LEAGUE_NAMES, leagueList } from "../rating.js";
import { mapAvailable, mapNote, mountMap } from "../map.js";

export default function places(ctx) {
  const p = ctx.places;
  const { stations } = ctx.data;
  const size = (league) => leagueList(ctx.store.state.ratings, league).length;
  if (!size(p.league)) p.league = Object.keys(LEAGUE_NAMES).find((k) => size(k)) || p.league;
  let map = null;
  let seq = 0;

  const ranking = () => leagueList(ctx.store.state.ratings, p.league)
    .map((x, i) => ({ row: ctx.data.venue(x.id), score: x.score, rank: i + 1 }))
    .filter((x) => x.row);
  const wanted = () => ctx.store.state.want.map((id) => ctx.data.venue(id)).filter(Boolean)
    .map((row) => ({ row, score: ctx.store.rating(row[0])?.score ?? null, rank: null }));
  const items = () => (p.tab === "rating" ? ranking() : wanted());

  const seg = () => [["list", "Список", ICON.list], ["map", "Карта", ICON.map]].map(([v, label, icon]) =>
    `<button type="button" data-view="${v}" class="${p.view === v ? "on" : ""}" aria-pressed="${p.view === v}">${icon}<span>${label}</span></button>`).join("");
  const head = () => tabs([["rating", "Рейтинг"], ["want", "Хочу"]], p.tab) + (p.tab !== "rating" ? ""
    : `<div class="chips">${Object.entries(LEAGUE_NAMES).map(([k, label]) => chip(`${esc(label)} ${size(k)}`, `data-league="${k}"`, p.league === k)).join("")}</div>`);

  function empty() {
    const search = '<a class="btn btn-primary" href="#/search">К поиску</a>';
    if (p.tab === "want") return emptyState("Список «Хочу» пуст", "Нажимай «Хочу» на странице места, и оно появится здесь.", search);
    const total = Object.keys(LEAGUE_NAMES).reduce((n, k) => n + size(k), 0);
    return total
      ? emptyState(`В лиге «${LEAGUE_NAMES[p.league]}» пока пусто`, "Оцени место этого типа, и оно появится здесь.", search)
      : emptyState("Здесь будет твой рейтинг", "Найди место, где уже было вкусно (или нет), и оцени его.", search);
  }

  async function draw(el) {
    const token = ++seq;
    map?.destroy();
    map = null;
    const body = el.querySelector("#body");
    const list = items();
    if (!list.length) {
      body.innerHTML = empty();
      return;
    }
    if (p.view === "list") {
      body.innerHTML = `<div class="list">${list.map((x) => placeRow(x.row, stations, { score: x.score, rank: x.rank })).join("")}</div>`;
      return;
    }
    if (!mapAvailable()) {
      body.innerHTML = mapNote();
      return;
    }
    body.innerHTML = '<div class="map" id="map"></div><div id="picked"></div>';
    const points = list.map((x) => ({ id: x.row[0], name: x.row[1], lat: x.row[4], lon: x.row[5], score: x.score }));
    try {
      const m = await mountMap(body.querySelector("#map"), {
        points,
        onPick: (id) => {
          const x = list.find((y) => y.row[0] === id);
          body.querySelector("#picked").innerHTML = `<div class="card">${placeRow(x.row, stations, { score: x.score, rank: x.rank })}</div>`;
        },
      });
      if (token === seq) map = m;
      else m.destroy();
    } catch {
      if (token === seq) body.innerHTML = mapNote("Карта не загрузилась. Посмотри места списком.");
    }
  }

  return {
    title: "Мои места",
    html: `<div class="bar"><h1 class="h1">Мои места</h1><div class="seg" role="group" aria-label="Вид">${seg()}</div></div>
<div class="stack" id="head" data-tour="places">${head()}</div>
<div id="body"></div>`,
    bind(el) {
      el.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        const d = b.dataset;
        if (d.view) {
          p.view = d.view;
          el.querySelector(".seg").innerHTML = seg();
        } else if (d.tabKey) {
          p.tab = d.tabKey;
          el.querySelector("#head").innerHTML = head();
        } else if (d.league) {
          p.league = d.league;
          el.querySelector("#head").innerHTML = head();
        } else {
          return;
        }
        draw(el);
      });
      draw(el);
    },
    unmount() {
      map?.destroy();
    },
  };
}
