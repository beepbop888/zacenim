// One post with its comments. Your comments are saved in Telegram; friends' comments are demo.
import { esc, ICON, emptyState } from "../ui.js";
import { findPost, postCard, bindPosts, comments } from "../posts.js";

export default function post(ctx, { id }) {
  const v = findPost(ctx, id);
  if (!v) {
    return { title: "Пост", html: emptyState("Пост не найден", "Возможно, его удалили.", '<a class="btn btn-secondary" href="#/feed">В ленту</a>') };
  }
  const list = () => comments(ctx, id).map((c) => `<div class="comment"><span class="avatar" aria-hidden="true">${esc(c.initial)}</span><span class="body"><span class="comment-head"><span class="strong">${esc(c.author)}</span><span class="meta">${esc(c.when)}</span></span><span>${esc(c.text)}</span></span></div>`).join("")
    || '<p class="muted">Комментариев пока нет.</p>';
  return {
    title: "Пост",
    hideTabs: true,
    html: `${postCard(ctx, v, { link: false })}
<h2 class="h2">Комментарии</h2>
<div id="comments">${list()}</div>
<form class="composer" id="comment-form"><label class="sr" for="comment">Комментарий</label><input id="comment" class="field" type="text" maxlength="500" placeholder="Написать комментарий" autocomplete="off"><button type="submit" class="iconbtn on" aria-label="Отправить">${ICON.send}</button></form>`,
    bind(el) {
      bindPosts(ctx, el);
      const input = el.querySelector("#comment");
      el.querySelector("#comment-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        await ctx.store.addComment(id, text);
        input.value = "";
        el.querySelector("#comments").innerHTML = list();
        el.querySelector("[data-count]").textContent = String(comments(ctx, id).length);
      });
    },
  };
}
