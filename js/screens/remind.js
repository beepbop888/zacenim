// «Напомнить»: pick a day and a time (Moscow time); the bot sends a message then.
import { esc, chip, notFound } from "../ui.js";
import { errorText } from "../api.js";
import { dayOptions, TIMES, mskToUtc, whenText } from "../time.js";

const SOON = 10 * 60000;

export default function remind(ctx, { id }) {
  const row = ctx.data.venue(id);
  if (!row) return notFound();
  const name = esc(row[1]);
  const days = dayOptions(Date.now());
  const slot = (d, t) => {
    const [hh, mm] = t.split(":").map(Number);
    return mskToUtc(d.y, d.m, d.d, hh, mm);
  };
  const free = (d, t) => slot(d, t) > Date.now() + SOON;
  let day = TIMES.some((t) => free(days[0], t)) ? 0 : 1;
  let time = TIMES.find((t) => t >= "19:00" && free(days[day], t)) || TIMES.find((t) => free(days[day], t));

  const dayChips = () => days.map((d, i) => chip(esc(d.label), `data-day="${i}"`, i === day)).join("");
  const timeChips = () => TIMES.map((t) => chip(t, `data-time="${t}"${free(days[day], t) ? "" : " disabled"}`, t === time)).join("");
  const action = ctx.tg.inTelegram()
    ? '<button type="button" class="btn btn-primary btn-block" data-action="save">Напомнить</button>'
    : '<p class="muted">Напоминания приходят от бота @zacenim_bot. Открой «Заценим» в Telegram.</p>';

  return {
    title: "Напомнить",
    hideTabs: true,
    html: `<p class="meta">Напоминание</p>
<h1 class="h1" tabindex="-1">Напомнить про ${name}</h1>
<p class="muted">Бот напишет тебе в Telegram в выбранное время.</p>
<p class="label">День</p><div class="chips" id="days">${dayChips()}</div>
<p class="label">Время</p><div class="chips chips-wrap" id="times">${timeChips()}</div>
<p class="meta">Время московское.</p>
${action}
<p class="error" id="err" role="alert"></p>`,
    bind(el) {
      const err = el.querySelector("#err");

      async function save(btn) {
        err.textContent = "";
        const at = slot(days[day], time);
        if (at <= Date.now() + SOON) {
          err.textContent = "Это время уже прошло, выбери другое.";
          return;
        }
        btn.disabled = true;
        if (!(await ctx.tg.requestWrite())) {
          err.textContent = "Без разрешения бот не сможет написать. Нажми «Напомнить» и разреши сообщения.";
          btn.disabled = false;
          return;
        }
        try {
          await ctx.api.addReminder(id, at);
        } catch (e) {
          err.textContent = e.status === 429 ? "Уже 50 напоминаний. Отмени лишние в «Планах»." : errorText(e);
          btn.disabled = false;
          return;
        }
        ctx.tg.haptic("success");
        el.innerHTML = `<div class="stack"><p class="meta">Напоминание</p><h1 class="h1" tabindex="-1">Напомним ${esc(whenText(at))}</h1><p class="muted">Бот @zacenim_bot пришлёт сообщение про ${name}.</p></div>
<button type="button" class="btn btn-primary btn-block" data-action="back">Готово</button>
<a class="btn btn-secondary btn-block" href="#/plans">Все напоминания</a>`;
        el.querySelector("h1").focus();
      }

      el.addEventListener("click", async (e) => {
        const b = e.target.closest("button");
        if (!b || b.disabled) return;
        if (b.dataset.day) {
          day = Number(b.dataset.day);
          if (!free(days[day], time)) time = TIMES.find((t) => free(days[day], t)) || time;
          el.querySelector("#days").innerHTML = dayChips();
          el.querySelector("#times").innerHTML = timeChips();
        } else if (b.dataset.time) {
          time = b.dataset.time;
          el.querySelector("#times").innerHTML = timeChips();
        } else if (b.dataset.action === "save") {
          await save(b);
        }
      });
    },
  };
}
