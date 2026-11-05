// The group chat (demo): the bot suggests places, friends vote, the winner gets a booking button.
import { esc, ICON } from "../ui.js";
import { voteRows } from "./group.js";

export default function chat(ctx) {
  const winner = ctx.data.find("Шербет", "Чистые пруды");
  return {
    title: "Чат компании",
    hideTabs: true,
    html: `<div class="bar"><span class="body"><span class="strong">Пятница</span><span class="meta">4 участника и бот</span></span><span class="demo-tag">Демо</span></div>
<div class="chat">
<div class="bubble"><span class="who">Аня</span>Ну что, куда в пятницу?</div>
<div class="bubble own">Сейчас заценим</div>
<div class="bubble wide"><span class="who bot">Заценим</span><span class="strong">Три места, куда хотите вы все</span><span class="meta">Пятница вечером, у Чистых прудов и Китай-города</span>${voteRows(ctx)}</div>
<div class="bubble"><span class="who">Тимур</span>Я за Шербет. Стол на 19:30?</div>
${winner ? `<div class="bubble wide"><span class="who bot">Заценим</span>Шербет победил. Проверим онлайн-бронь?<a class="btn btn-primary btn-block" href="#/book/${esc(winner[0])}">${ICON.calendar}<span>Забронировать</span></a></div>` : ""}
</div>
<div class="composer"><label class="sr" for="msg">Сообщение</label><input id="msg" class="field" type="text" placeholder="Чат появится после запуска" disabled></div>`,
  };
}
