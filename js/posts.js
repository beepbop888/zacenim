// Posts for the feed and the post page: your own (saved in Telegram) and demo friends' posts.
import { esc, ICON, scoreBadge, metroLine } from "./ui.js";
import { ago } from "./format.js";
import { FRIENDS, DEMO_POSTS, DEMO_COMMENTS } from "./demo.js";

const AUD = { all: "для всех", friends: "для друзей", me: "только для тебя" };

function own(ctx, p) {
  return {
    id: p.id, author: "Ты", initial: (ctx.tg.firstName() || "Т").slice(0, 1).toUpperCase(), when: ago(p.at), aud: p.aud,
    row: ctx.data.venue(p.v), score: ctx.store.rating(p.v)?.score ?? null, text: p.text,
    photo: p.photo ? ctx.api.photoUrl(p.photo) : null, likes: 0,
  };
}

function demo(ctx, d) {
  return {
    id: d.id, author: FRIENDS[d.who], initial: FRIENDS[d.who][0], when: d.ago, aud: null,
    row: ctx.data.find(d.place[0], d.place[1]), score: d.score, text: d.text, photo: d.photo, likes: d.likes,
  };
}

export function allPosts(ctx) {
  return {
    own: ctx.store.state.posts.map((p) => own(ctx, p)),
    demo: DEMO_POSTS.map((d) => demo(ctx, d)).filter((v) => v.row),
  };
}

export function findPost(ctx, id) {
  const p = ctx.store.state.posts.find((x) => x.id === id);
  if (p) return own(ctx, p);
  const d = DEMO_POSTS.find((x) => x.id === id);
  return d ? demo(ctx, d) : null;
}

export function comments(ctx, id) {
  const theirs = (DEMO_COMMENTS[id] || []).map((c) => ({ author: FRIENDS[c.who], initial: FRIENDS[c.who][0], when: c.ago, text: c.text }));
  const mine = (ctx.store.state.comments[id] || []).map((c) => ({ author: "Ты", initial: "Т", when: ago(c.at), text: c.text }));
  return [...theirs, ...mine];
}

export function postCard(ctx, v, { link = true } = {}) {
  const liked = ctx.store.isLiked(v.id);
  const n = comments(ctx, v.id).length;
  const place = v.row
    ? `<a class="post-place" href="#/place/${esc(v.row[0])}"><span class="body"><span class="strong">${esc(v.row[1])}</span>${
      metroLine(ctx.data.stations, v.row[6], v.row[7], "span")}</span>${v.score === null ? "" : scoreBadge(v.score)}</a>`
    : "";
  const talk = link
    ? `<a class="iconbtn" href="#/post/${esc(v.id)}" aria-label="Комментарии">${ICON.comment}<span>${n}</span></a>`
    : `<span class="iconbtn" aria-hidden="true">${ICON.comment}<span data-count>${n}</span></span>`;
  return `<article class="post" data-post="${esc(v.id)}">
<div class="post-head"><span class="avatar" aria-hidden="true">${esc(v.initial)}</span><span class="body"><span class="strong">${esc(v.author)}</span><span class="meta">${esc(v.when)}${v.aud ? `, ${AUD[v.aud]}` : ""}</span></span></div>
${place}
<p class="post-text">${esc(v.text)}</p>
${v.photo ? `<img class="post-photo" src="${esc(v.photo)}" alt="Фото к посту" loading="lazy">` : ""}
<div class="post-actions"><button type="button" class="iconbtn${liked ? " on" : ""}" data-like="${esc(v.id)}" aria-pressed="${liked}" aria-label="Нравится">${
  liked ? ICON.heartOn : ICON.heart}<span>${v.likes + (liked ? 1 : 0)}</span></button>${talk}</div>
</article>`;
}

// Likes, and photos. A fresh photo can take a moment to reach every server, so a failed one is
// tried again; if it still fails (a throttled network) it disappears instead of a broken icon.
export function bindPosts(ctx, el) {
  el.querySelectorAll(".post-photo").forEach((img) => {
    let tries = 0;
    img.addEventListener("error", () => {
      tries += 1;
      if (tries > 2) img.remove();
      else setTimeout(() => { img.src = `${img.src.split("?")[0]}?try=${tries}`; }, 2000);
    });
  });
  el.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-like]");
    if (!b) return;
    const id = b.dataset.like;
    const on = await ctx.store.toggleLike(id);
    ctx.tg.haptic("light");
    const likes = findPost(ctx, id)?.likes || 0;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", String(on));
    b.innerHTML = `${on ? ICON.heartOn : ICON.heart}<span>${likes + (on ? 1 : 0)}</span>`;
  });
}
