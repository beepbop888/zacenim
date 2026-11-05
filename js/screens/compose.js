// «Новый пост»: a place, text, an optional photo and who sees it.
import { esc, ICON, metroLine, toast } from "../ui.js";
import { query } from "../search.js";
import { errorText } from "../api.js";
import { shrinkImage } from "../image.js";

const AUDIENCE = [["all", "Все"], ["friends", "Друзья"], ["me", "Только я"]];

export default function compose(ctx, { place } = {}) {
  let placeId = place && ctx.data.venue(place) ? place : null;
  let aud = "friends";
  let file = null;
  let preview = null;
  let busy = false;

  const nameLine = (row) => `<span class="body"><span class="name">${esc(row[1])}</span>${metroLine(ctx.data.stations, row[6], row[7], "span")}</span>`;
  const placeBox = () => (placeId
    ? `<div class="card"><div class="row">${nameLine(ctx.data.venue(placeId))}</div><button type="button" class="btn btn-link" data-action="change">Другое место</button></div>`
    : `<div class="field-wrap">${ICON.search}<label class="sr" for="pq">Где были?</label><input id="pq" class="field" type="search" placeholder="Где были? Название места" autocomplete="off"></div><div class="list" id="picks"></div>`);
  const picks = (text) => query(ctx.data.index, { text }).slice(0, 6)
    .map((i) => `<button type="button" class="row" data-pick="${esc(ctx.data.rows[i][0])}">${nameLine(ctx.data.rows[i])}</button>`).join("");
  const audSeg = () => AUDIENCE.map(([k, label]) =>
    `<button type="button" data-aud="${k}" class="${aud === k ? "on" : ""}" aria-pressed="${aud === k}">${k === "me" ? ICON.lock : ""}<span>${label}</span></button>`).join("");
  const photoBox = () => (preview
    ? `<div class="photo-preview"><img src="${preview}" alt="Выбранное фото"><button type="button" class="iconbtn" data-action="unphoto" aria-label="Убрать фото">${ICON.close}</button></div>`
    : `<label class="btn btn-secondary">${ICON.photo}<span>Добавить фото</span><input id="photo" type="file" accept="image/*" class="sr"></label>`);

  return {
    title: "Новый пост",
    hideTabs: true,
    html: `<h1 class="h1">Новый пост</h1>
<div class="stack" id="place-box">${placeBox()}</div>
<label class="label" for="text">Что брали и как оно?</label>
<textarea id="text" class="field" maxlength="1000" placeholder="Например: хинкали с бараниной и лимонад с тархуном"></textarea>
<div id="photo-box">${photoBox()}</div>
<p class="label" id="aud-label">Кто увидит</p>
<div class="seg" role="group" aria-labelledby="aud-label" id="aud">${audSeg()}</div>
<p class="meta">Пока посты видишь только ты: друзья появятся после запуска.</p>
<button type="button" class="btn btn-primary btn-block" data-action="publish" disabled>Опубликовать</button>
<p class="error" id="err" role="alert"></p>`,
    bind(el) {
      const text = el.querySelector("#text");
      const publish = el.querySelector("[data-action='publish']");
      const err = el.querySelector("#err");
      const ready = () => { publish.disabled = busy || !placeId || !text.value.trim(); };
      const drawPlace = () => {
        el.querySelector("#place-box").innerHTML = placeBox();
        const pq = el.querySelector("#pq");
        pq?.addEventListener("input", () => { el.querySelector("#picks").innerHTML = picks(pq.value); });
        ready();
      };
      const drawPhoto = () => {
        el.querySelector("#photo-box").innerHTML = photoBox();
        el.querySelector("#photo")?.addEventListener("change", (e) => {
          file = e.target.files?.[0] || null;
          preview = file ? URL.createObjectURL(file) : null;
          drawPhoto();
        });
      };

      async function send() {
        if (busy) return;
        busy = true;
        ready();
        err.textContent = "";
        publish.textContent = "Публикуем…";
        let photo = null;
        try {
          if (file) photo = (await ctx.api.uploadPhoto(await shrinkImage(file))).key;
        } catch (e) {
          err.textContent = e.status === 401 ? errorText(e)
            : e.status === 429 ? "На сегодня лимит фото: 20. Убери фото или попробуй завтра."
              : "Не удалось загрузить фото. Убери фото или попробуй ещё раз.";
          busy = false;
          publish.textContent = "Опубликовать";
          ready();
          return;
        }
        await ctx.store.addPost({ id: `p${Date.now().toString(36)}`, at: Date.now(), text: text.value.trim(), v: placeId, aud, photo });
        ctx.tg.haptic("success");
        toast("Опубликовали");
        ctx.replace("/feed");
      }

      drawPlace();
      drawPhoto();
      text.addEventListener("input", ready);
      el.addEventListener("click", async (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        if (b.dataset.pick) {
          placeId = b.dataset.pick;
          drawPlace();
        } else if (b.dataset.action === "change") {
          placeId = null;
          drawPlace();
          el.querySelector("#pq").focus();
        } else if (b.dataset.aud) {
          aud = b.dataset.aud;
          el.querySelector("#aud").innerHTML = audSeg();
        } else if (b.dataset.action === "unphoto") {
          URL.revokeObjectURL(preview);
          preview = null;
          file = null;
          drawPhoto();
        } else if (b.dataset.action === "publish") {
          await send();
        }
      });
    },
    unmount() {
      if (preview) URL.revokeObjectURL(preview);
    },
  };
}
