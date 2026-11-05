// «Куда идём?» (demo): a group of friends votes for a place.
import { esc, metroLine } from "../ui.js";
import { plural } from "../format.js";

export const OPTIONS = [["Шербет", "Чистые пруды", 3], ["Высота 5642", "Китай-город", 1], ["Flâner", "Чистые пруды", 0]];

export function voteRows(ctx) {
  return OPTIONS.map(([name, station, n]) => [ctx.data.find(name, station), n]).filter(([row]) => row)
    .map(([row, n], i) => `<a class="vote${i === 0 ? " on" : ""}" href="#/place/${esc(row[0])}"><span class="body"><span class="strong">${esc(row[1])}</span>${
      metroLine(ctx.data.stations, row[6], row[7], "span")}</span><span class="n">${n} ${plural(n, "голос", "голоса", "голосов")}</span></a>`).join("");
}

export default function group(ctx) {
  const me = (ctx.tg.firstName() || "Т").slice(0, 1).toUpperCase();
  return {
    title: "Куда идём?",
    html: `<p class="demo-tag">Демо</p>
<h1 class="h1">Куда идём?</h1>
<p class="muted">Пятница вечером, у Чистых прудов и Китай-города</p>
<div class="members" aria-label="Участники">${["А", "Т", "Л", me].map((x) => `<span class="avatar">${esc(x)}</span>`).join("")}</div>
<div class="stack">${voteRows(ctx)}</div>
<p class="muted">Шербет выбрали трое из четырёх. Можно бронировать.</p>
<a class="btn btn-primary btn-block" href="#/chat">Открыть чат компании</a>`,
  };
}
