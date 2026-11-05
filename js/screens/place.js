// One place: your score and everyone else's, actions, details and a small map.
import { esc, ICON, scoreBadge, emptyScore, metroLine, kindLine, notFound, toast } from "../ui.js";
import { mapAvailable, mountMap } from "../map.js";

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export default function place(ctx, { id }) {
  const row = ctx.data.venue(id);
  if (!row) return notFound();
  const [, name, , , lat, lon, st, m, hours, phone, website] = row;
  const mine = ctx.store.rating(id);
  const want = ctx.store.isWant(id);
  let map = null;
  let alive = true;

  const mineCell = `${mine ? scoreBadge(mine.score, "l") : emptyScore("l")}<span class="txt"><span class="label">Твой балл</span><span class="val">${
    mine ? `${mine.place}-е место из ${mine.total}` : "Ещё не оценено"}</span></span>`;
  const othersCell = `<span id="others-badge">${emptyScore("l")}</span><span class="txt"><span class="label">У остальных</span><span class="val" id="others-sub">Загружаем…</span></span>`;
  const wantInner = (on) => `${on ? ICON.bookmarkOn : ICON.bookmark}<span>Хочу</span>`;

  return {
    title: name,
    html: `<h1 class="h1" tabindex="-1">${esc(name)}</h1>
<p class="muted">${esc(kindLine(row))}</p>
${metroLine(ctx.data.stations, st, m)}
<div class="scores" data-tour="scores"><div class="score-cell">${mineCell}</div><div class="score-cell">${othersCell}</div></div>
<a class="btn btn-primary btn-block" href="#/rate/${esc(id)}" data-tour="rate">${mine ? "Оценить заново" : "Оценить"}</a>
<div class="actions">
<button type="button" class="action${want ? " on" : ""}" data-action="want" aria-pressed="${want}">${wantInner(want)}</button>
<a class="action" href="#/book/${esc(id)}" data-tour="book">${ICON.calendar}<span>Забронировать</span></a>
<a class="action" href="#/remind/${esc(id)}">${ICON.bell}<span>Напомнить</span></a>
</div>
<div class="info">
${hours ? `<div class="info-row">${ICON.clock}<span>${esc(hours)}</span></div>` : ""}
${phone ? `<a class="info-row" href="tel:${esc(phone.replace(/[^+\d]/g, ""))}">${ICON.phone}<span>${esc(phone)}</span></a>` : ""}
${website ? `<button type="button" class="info-row" data-action="site">${ICON.globe}<span>${esc(hostOf(website))}</span></button>` : ""}
<a class="info-row" href="#/compose/${esc(id)}">${ICON.pen}<span>Написать пост</span></a>
</div>
${mapAvailable() ? '<div class="map map-small" id="place-map"></div>' : ""}`,
    bind(el) {
      const badge = el.querySelector("#others-badge");
      const sub = el.querySelector("#others-sub");
      ctx.api.getRating(id).then((r) => {
        if (!alive) return;
        if (r && typeof r.rating === "number") {
          badge.innerHTML = scoreBadge(r.rating, "l");
          sub.textContent = `по отзывам 2ГИС, ${Number(r.count || 0).toLocaleString("ru-RU")}`;
        } else {
          sub.textContent = "пока нет оценок";
        }
      }).catch(() => {
        if (alive) sub.textContent = "не загрузилось";
      });
      el.querySelector("[data-action='want']").addEventListener("click", async (e) => {
        const b = e.currentTarget;
        const on = await ctx.store.toggleWant(id);
        ctx.tg.haptic("light");
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", String(on));
        b.innerHTML = wantInner(on);
        toast(on ? "Добавили в «Хочу»" : "Убрали из «Хочу»");
      });
      el.querySelector("[data-action='site']")?.addEventListener("click", () => ctx.tg.openLink(website));
      const box = el.querySelector("#place-map");
      if (box) {
        mountMap(box, { points: [{ id, name, lat, lon, score: mine ? mine.score : null }], center: { lat, lon }, zoom: 16, selected: id })
          .then((mm) => {
            if (alive) map = mm;
            else mm.destroy();
          })
          .catch(() => box.remove());
      }
    },
    unmount() {
      alive = false;
      map?.destroy();
    },
  };
}
