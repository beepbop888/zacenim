// «Планы»: your reminders from the server and the demo «Куда идём?».
import { esc, emptyState, toast } from "../ui.js";
import { errorText } from "../api.js";
import { whenText } from "../time.js";

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default function plans(ctx) {
  let alive = true;
  return {
    title: "Планы",
    html: `<h1 class="h1">Планы</h1>
<h2 class="h2">Напоминания</h2>
<div id="rem" aria-live="polite"><p class="muted" role="status">Загружаем…</p></div>
<h2 class="h2">Куда идём?</h2>
<a class="card" href="#/group" data-tour="group"><span class="demo-tag">Демо</span><span class="strong">Пятница: Аня, Тимур, Лиза и ты</span><span class="muted">Шербет лидирует: 3 голоса из 4</span></a>`,
    bind(el) {
      const box = el.querySelector("#rem");
      const draw = (items) => {
        box.innerHTML = items.length
          ? `<div class="list">${items.map((r) => `<div class="row" data-rem="${esc(r.id)}"><span class="body"><a class="name" href="#/place/${esc(r.place)}">${esc(r.name)}</a><span class="kind">${esc(cap(whenText(r.at)))}</span></span><button type="button" class="btn btn-secondary" data-cancel="${esc(r.id)}">Отменить</button></div>`).join("")}</div>`
          : emptyState("Пока пусто", "Открой место и нажми «Напомнить»: бот напишет в нужный день.");
      };
      async function load() {
        if (!ctx.tg.inTelegram()) {
          box.innerHTML = '<p class="muted">Напоминания приходят от бота в Telegram. Открой «Заценим» из @zacenim_bot.</p>';
          return;
        }
        box.innerHTML = '<p class="muted" role="status">Загружаем…</p>';
        try {
          const { items } = await ctx.api.listReminders();
          if (alive) draw(items);
        } catch (err) {
          if (alive) box.innerHTML = `<p class="muted">${esc(errorText(err))}</p><button type="button" class="btn btn-secondary" data-action="retry">Повторить</button>`;
        }
      }
      el.addEventListener("click", async (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        if (b.dataset.action === "retry") {
          load();
        } else if (b.dataset.cancel) {
          b.disabled = true;
          try {
            await ctx.api.deleteReminder(b.dataset.cancel);
            b.closest("[data-rem]").remove();
            toast("Напоминание отменили");
            if (!box.querySelector("[data-rem]")) draw([]);
          } catch (err) {
            b.disabled = false;
            toast(errorText(err));
          }
        }
      });
      load();
    },
    unmount() {
      alive = false;
    },
  };
}
