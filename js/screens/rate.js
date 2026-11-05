// Rating a place, Beli-style: «Пойдёшь сюда ещё раз?», then «лучше или хуже» by halving the list.
import { esc, scoreBadge, metroLine, notFound } from "../ui.js";
import { LEAGUE_NAMES, leagueOf, removeRating, startInsert, pivot, answer, maxSteps, scoreAt } from "../rating.js";

const ANSWERS = [["fire", "Да, пойду ещё"], ["ok", "Один раз можно"], ["miss", "Больше не пойду"]];

export default function rate(ctx, { id }) {
  const row = ctx.data.venue(id);
  if (!row) return notFound();
  const league = leagueOf(row[2]);
  const base = removeRating(ctx.store.state.ratings, id);
  const name = esc(row[1]);
  let group = null;
  let list = [];
  let state = null;
  let busy = false;

  const askAgain = () => `<p class="meta">Лига «${esc(LEAGUE_NAMES[league])}»</p>
<p class="h2">${name}</p>
<h1 class="h1" tabindex="-1">Пойдёшь сюда ещё раз?</h1>
<div class="stack">${ANSWERS.map(([g, label]) => `<button type="button" class="btn btn-secondary btn-block btn-tall" data-group="${g}">${label}</button>`).join("")}</div>`;

  function askCompare() {
    const i = pivot(state);
    const other = ctx.data.venue(list[i]);
    const otherName = other ? esc(other[1]) : "место из твоего списка";
    return `<p class="meta">Сравнение ${state.step} из ${maxSteps(list.length)}</p>
<h1 class="h1" tabindex="-1">${name} лучше или хуже, чем ${otherName}?</h1>
<div class="card"><div class="bar"><span class="body"><span class="strong">${otherName}</span>${
  other ? metroLine(ctx.data.stations, other[6], other[7], "span") : ""}</span>${scoreBadge(scoreAt(group, i, list.length))}</div></div>
<div class="grid2"><button type="button" class="btn btn-secondary btn-tall" data-answer="better">Лучше</button><button type="button" class="btn btn-secondary btn-tall" data-answer="worse">Хуже</button></div>
<button type="button" class="btn btn-link" data-answer="same">Сложно выбрать</button>`;
  }

  const done = (r) => `<div class="stack center">
<p class="h2">${name}</p>
<h1 class="h1" tabindex="-1">Готово, оценку запомнили</h1>
${scoreBadge(r.score, "xl")}
<p class="muted">${r.place}-е место из ${r.total} в лиге «${esc(LEAGUE_NAMES[r.league])}»</p>
</div>
<button type="button" class="btn btn-primary btn-block" data-action="back">Готово</button>
<button type="button" class="btn btn-secondary btn-block" data-action="post">Написать пост</button>`;

  return {
    title: "Оценка",
    hideTabs: true,
    html: askAgain(),
    bind(el) {
      const backlink = el.querySelector(".backlink")?.outerHTML || "";
      const show = (html) => {
        el.innerHTML = backlink + html;
        el.querySelector("h1")?.focus();
      };
      async function next() {
        if (!state.done) {
          show(askCompare());
          return;
        }
        await ctx.store.rate(id, row[2], group, state.pos);
        ctx.tg.haptic("success");
        show(done(ctx.store.rating(id)));
      }
      el.addEventListener("click", async (e) => {
        const b = e.target.closest("button");
        if (!b || busy) return;
        busy = true;
        try {
          if (b.dataset.group) {
            ctx.tg.haptic("light");
            group = b.dataset.group;
            list = base[league][group];
            state = startInsert(list.length);
            await next();
          } else if (b.dataset.answer) {
            ctx.tg.haptic("light");
            state = answer(state, b.dataset.answer);
            await next();
          } else if (b.dataset.action === "post") {
            ctx.replace(`/compose/${id}`);
          }
        } finally {
          busy = false;
        }
      });
    },
  };
}
