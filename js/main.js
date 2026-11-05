// Start-up: Telegram setup, places data, the person's saved data, then the first screen.
import { CONFIG } from "../config.js";
import * as tg from "./tg.js";
import * as api from "./api.js";
import { loadData } from "./data.js";
import { cloudBackend, localBackend } from "./storage.js";
import { createStore } from "./store.js";
import { route, start, go, back, replace, refresh } from "./router.js";
import { toast } from "./ui.js";

route("/feed", () => import("./screens/feed.js"));
route("/about", () => import("./screens/about.js"));
route("/search", () => import("./screens/search.js"));
route("/place/:id", () => import("./screens/place.js"));
route("/rate/:id", () => import("./screens/rate.js"));
route("/places", () => import("./screens/places.js"));
route("/post/:id", () => import("./screens/post.js"));
route("/compose", () => import("./screens/compose.js"));
route("/compose/:place", () => import("./screens/compose.js"));

const screen = document.getElementById("screen");

async function boot() {
  screen.innerHTML = '<p class="muted" role="status">Загружаем места…</p>';
  let data;
  try {
    data = await loadData();
  } catch {
    screen.innerHTML = '<div class="empty"><p class="h2">Не удалось загрузить места</p><p class="muted">Проверь интернет и попробуй ещё раз.</p><button type="button" class="btn btn-secondary" id="retry">Повторить</button></div>';
    document.getElementById("retry").addEventListener("click", boot, { once: true });
    return;
  }
  const cloud = tg.cloudStorage();
  const store = createStore(cloud ? cloudBackend(cloud) : localBackend(), cloud ? localBackend() : null,
    () => toast("Не удалось сохранить в Telegram, сохранили на этом устройстве"));
  await store.load();
  const ctx = {
    data, store, api, tg, config: CONFIG, go, back, replace, refresh,
    search: { text: "", station: null, walk: 10, kind: "all", view: "list", shown: 50 },
    places: { tab: "rating", league: "rest", view: "list" },
  };
  window.zc = ctx;
  tg.onSettings(() => go("/about"));
  const deep = new URLSearchParams(location.search).get("place");
  await start(ctx, deep && /^[nwr]\d+$/.test(deep) ? `/place/${deep}` : "/feed");
}

tg.init();
boot();
