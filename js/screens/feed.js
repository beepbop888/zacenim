// The feed: your own posts first, then friends' posts (demo).
import { ICON } from "../ui.js";
import { allPosts, postCard, bindPosts } from "../posts.js";

export default function feed(ctx) {
  const { own, demo } = allPosts(ctx);
  const prompt = own.length ? ""
    : '<div class="card"><p class="h2">Что брали и где?</p><p class="muted">Напиши первый пост: место, пара слов и фото.</p><a class="btn btn-primary" href="#/compose">Написать пост</a></div>';
  return {
    title: "Лента",
    html: `<div class="bar"><span class="wordmark">заценим</span><a class="iconbtn" href="#/search" aria-label="Поиск">${ICON.search}</a></div>
${prompt}
<section class="list" aria-label="Лента">
${own.map((v) => postCard(ctx, v)).join("")}
<p class="demo-tag">Демо: посты друзей и фото для примера</p>
${demo.map((v) => postCard(ctx, v)).join("")}
</section>`,
    bind(el) {
      el.querySelector(".post")?.setAttribute("data-tour", "feed");
      bindPosts(ctx, el);
    },
  };
}
