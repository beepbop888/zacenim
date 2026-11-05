// «О приложении»: what works, what is demo, credits. Opened from Telegram's «Настройки» item.
import { esc } from "../ui.js";

export default function about(ctx) {
  const count = ctx.data.rows.length.toLocaleString("ru-RU");
  return {
    title: "О приложении",
    hideTabs: true,
    html: `<h1 class="h1">О приложении</h1>
<p class="lead">«Заценим» помогает решить, куда пойти поесть в Москве.</p>
<div class="card"><p class="h2">Работает по-настоящему</p><p class="muted">Поиск по ${esc(count)} местам Москвы, оценки и рейтинг, список «Хочу», напоминания от бота, проверка онлайн-брони.</p></div>
<div class="card"><p class="h2">Пока демо</p><p class="muted">Посты друзей и комментарии, «Куда идём?» и чат компании.</p></div>
<button type="button" class="btn btn-secondary btn-block" data-action="tour">Показать подсказки</button>
<div class="credits">
<p class="meta">Данные о местах: © участники OpenStreetMap, лицензия ODbL.</p>
<p class="meta">Карта и рейтинги мест: 2ГИС.</p>
<p class="meta">Шрифты Lora и Onest: SIL Open Font License.</p>
<p class="meta">Фото еды: Wikimedia Commons, авторы указаны в README.</p>
<p class="meta">Версия ${esc(ctx.config.VERSION)}</p>
</div>`,
    bind(el) {
      el.querySelector("[data-action='tour']").addEventListener("click", async () => {
        const { startTour } = await import("../tour.js");
        startTour(ctx);
      });
    },
  };
}
