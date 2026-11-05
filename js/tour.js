// First-launch tips: a start box, then nine tips over the real screens. «Пропустить» ends them.
import { esc } from "./ui.js";

const STEPS = [
  { route: "/feed", target: "[data-tour='feed']", title: "Лента", text: "Здесь посты друзей о том, где они ели. Лайкай и комментируй." },
  { route: "/plans", target: "[data-tour='group']", title: "Куда идём?", text: "Выбирайте место всей компанией: голосование прямо в чате." },
  { route: "/search", target: "[data-tour='station']", title: "Поиск по метро", text: "Выбери станцию и сколько минут идти пешком." },
  { route: "/search", target: "[data-tour='view']", title: "Список или карта", text: "Переключай, как удобнее смотреть места." },
  { route: "place", target: "[data-tour='scores']", title: "Два балла", text: "Слева твой балл, справа оценка остальных по отзывам 2ГИС." },
  { route: "place", target: "[data-tour='book']", title: "Бронь стола", text: "Если у ресторана есть онлайн-бронь, откроем её в один тап." },
  { route: "place", target: "[data-tour='rate']", title: "Оценка без цифр", text: "Скажи, пойдёшь ли ещё раз, и сравни с местами из своего списка. Балл посчитаем сами." },
  { route: "/places", target: "[data-tour='places']", title: "Мои места", text: "Твой рейтинг по лигам и список «Хочу»." },
  { route: "/feed", target: "[data-tour='compose-tab']", title: "Новый пост", text: "Что брали, фото и кому показать." },
];

let active = false;

function waitFor(fn, ms = 3000) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const tick = () => {
      const v = fn();
      if (v || performance.now() - t0 > ms) resolve(v || null);
      else requestAnimationFrame(tick);
    };
    tick();
  });
}

export function startTour(ctx) {
  if (active) return;
  active = true;
  const sample = ctx.data.find("Шербет", "Чистые пруды") || ctx.data.rows.find((r) => r[2] === "restaurant");
  const box = document.createElement("div");
  box.className = "tour";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-labelledby", "tour-title");
  document.body.append(box);
  let k = 0;
  let expected = null;
  let busy = false;
  let frame = 0;

  // Runs every frame while a tip shows: ratings and reminders arrive late and move the target.
  function follow() {
    place();
    frame = requestAnimationFrame(follow);
  }

  function place() {
    if (!k) return;
    const target = document.querySelector(STEPS[k - 1].target);
    const spot = box.querySelector(".tour-spot");
    const card = box.querySelector(".tour-card");
    if (!target || !spot || !card) return;
    const r = target.getBoundingClientRect();
    const pad = 6;
    Object.assign(spot.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
    const below = r.bottom + pad + 12;
    const h = card.offsetHeight;
    card.style.top = below + h < window.innerHeight - 8 ? `${below}px` : `${Math.max(8, r.top - pad - 12 - h)}px`;
  }

  function end(goHome = true) {
    if (!active) return;
    active = false;
    expected = null;
    cancelAnimationFrame(frame);
    window.removeEventListener("hashchange", onHash);
    box.remove();
    ctx.store.setTipsDone(true).catch(() => {});
    if (goHome && k > 0) ctx.replace("/feed");
  }

  function onHash() {
    if (expected && location.hash.slice(1) !== expected) end(false);
  }

  async function showTip() {
    const step = STEPS[k - 1];
    const route = step.route === "place" ? `/place/${sample[0]}` : step.route;
    expected = route;
    if (document.body.dataset.route !== route) {
      ctx.replace(route);
      await waitFor(() => document.body.dataset.route === route);
    }
    const target = await waitFor(() => document.querySelector(step.target));
    if (!active) return;
    target?.scrollIntoView({ block: "center" });
    box.innerHTML = `<div class="tour-block"></div><div class="tour-spot" data-target="${esc(step.target)}"></div><div class="tour-card">
<p class="meta">Подсказка ${k} из ${STEPS.length}</p>
<h2 class="h2" id="tour-title">${esc(step.title)}</h2>
<p class="muted">${esc(step.text)}</p>
<div class="bar"><button type="button" class="btn btn-link" data-tour-action="skip">Пропустить</button><button type="button" class="btn btn-primary" data-tour-action="next">${k === STEPS.length ? "Готово" : "Дальше"}</button></div>
</div>`;
    cancelAnimationFrame(frame);
    follow();
    box.querySelector("[data-tour-action='next']").focus();
  }

  function showStart() {
    const name = ctx.tg.firstName();
    box.innerHTML = `<div class="tour-dim"></div><div class="tour-card tour-start">
<span class="wordmark">заценим</span>
<h2 class="h1" id="tour-title">Привет${name ? `, ${esc(name)}` : ""}! Заценим?</h2>
<p class="lead">Покажем, как тут всё устроено: лента, поиск по метро, оценки и бронь. Девять коротких подсказок.</p>
<button type="button" class="btn btn-primary btn-block" data-tour-action="next">Показать</button>
<button type="button" class="btn btn-secondary btn-block" data-tour-action="skip">Пропустить</button>
</div>`;
    box.querySelector("[data-tour-action='next']").focus();
  }

  box.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-tour-action]");
    if (!b || busy) return;
    if (b.dataset.tourAction === "skip" || k === STEPS.length) {
      end();
      return;
    }
    busy = true;
    k += 1;
    await showTip();
    busy = false;
  });
  box.addEventListener("keydown", (e) => {
    if (e.key === "Escape") end();
  });
  window.addEventListener("hashchange", onHash);
  showStart();
}
