// «Забронировать»: the server checks the place's website for online booking.
import { esc, ICON, metroLine, notFound } from "../ui.js";
import { errorText } from "../api.js";

export default function book(ctx, { id }) {
  const row = ctx.data.venue(id);
  if (!row) return notFound();
  const [, name, kind, , , , st, m, , phone, website] = row;
  const who = kind === "restaurant" ? "У этого ресторана" : "У этого места";
  const call = phone
    ? `<a class="btn btn-secondary btn-block" href="tel:${esc(phone.replace(/[^+\d]/g, ""))}">${ICON.phone}<span>Позвонить</span></a>` : "";
  const site = website
    ? `<button type="button" class="btn btn-secondary btn-block" data-action="site">${ICON.globe}<span>Сайт</span></button>` : "";
  const none = `<h2 class="h2">${who} пока нет онлайн-брони</h2><p class="muted">${
    phone || website ? "Позвони или загляни на сайт." : "Контактов в базе нет."}</p>${call}${site}`;
  const checking = '<p class="muted" role="status">Проверяем сайт…</p>';
  let alive = true;
  let url = null;

  return {
    title: "Бронь стола",
    hideTabs: true,
    html: `<p class="meta">Бронь стола</p>
<h1 class="h1">${esc(name)}</h1>
${metroLine(ctx.data.stations, st, m)}
<div class="stack" id="state" aria-live="polite">${website ? checking : none}</div>`,
    bind(el) {
      const box = el.querySelector("#state");
      async function check() {
        box.innerHTML = checking;
        try {
          const r = await ctx.api.getBooking(id);
          if (!alive) return;
          if (r?.status === "found" && /^https?:\/\//.test(r.url || "")) {
            url = r.url;
            box.innerHTML = `<h2 class="h2">Есть онлайн-бронь</h2><p class="muted">Бронь откроется на сайте${
              r.system ? ` (${esc(r.system)})` : ""}, там её и подтвердишь.</p><button type="button" class="btn btn-primary btn-block" data-action="open">Забронировать</button>${call}`;
          } else {
            box.innerHTML = none;
          }
        } catch (err) {
          if (alive) box.innerHTML = `<p class="muted">${esc(errorText(err))}</p><button type="button" class="btn btn-secondary" data-action="retry">Повторить</button>${call}${site}`;
        }
      }
      el.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        if (b.dataset.action === "open") ctx.tg.openLink(url);
        else if (b.dataset.action === "site") ctx.tg.openLink(website);
        else if (b.dataset.action === "retry") check();
      });
      if (website) check();
    },
    unmount() {
      alive = false;
    },
  };
}
