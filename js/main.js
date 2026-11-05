// Start-up: Telegram setup, places data, the person's saved data, then the first screen.
import { CONFIG } from "../config.js";
import * as tg from "./tg.js";
import * as api from "./api.js";
import { loadData } from "./data.js";
import { cloudBackend, localBackend } from "./storage.js";
import { createStore } from "./store.js";
import { createScoreSync } from "./scoresync.js";
import { allScores } from "./rating.js";
import { setMapReporter } from "./map.js";
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
route("/book/:id", () => import("./screens/book.js"));
route("/remind/:id", () => import("./screens/remind.js"));
route("/plans", () => import("./screens/plans.js"));
route("/group", () => import("./screens/group.js"));
route("/chat", () => import("./screens/chat.js"));

const screen = document.getElementById("screen");

function failed(what) {
  screen.innerHTML = `<div class="empty"><p class="h2">Не удалось загрузить ${what}</p><p class="muted">Проверь интернет и попробуй ещё раз.</p><button type="button" class="btn btn-secondary" id="retry">Повторить</button></div>`;
  document.getElementById("retry").addEventListener("click", boot, { once: true });
}

async function boot() {
  screen.innerHTML = '<p class="muted" role="status">Загружаем места…</p>';
  let data;
  try {
    data = await loadData();
  } catch {
    failed("места");
    return;
  }
  const cloud = tg.cloudStorage();
  // The device copy is per Telegram account: one phone can hold several.
  const device = localBackend(`zc${tg.userId()}_`);
  // «У остальных» on other people's screens: our scores go to the server after each change and on launch.
  const syncScores = createScoreSync(api.putScores, device, () => allScores(store.state.ratings));
  const store = createStore(cloud ? cloudBackend(cloud) : localBackend(), cloud ? device : null,
    () => toast("Не удалось сохранить в Telegram, сохранили на этом устройстве"), () => { syncScores(); });
  try {
    await store.load();
  } catch {
    failed("твои данные");
    return;
  }
  syncScores();
  setMapReporter((r) => { api.sendLog({ kind: "map", version: CONFIG.VERSION, ...r }).catch(() => {}); });
  const ctx = {
    data, store, api, tg, config: CONFIG, go, back, replace, refresh,
    search: { text: "", station: null, walk: 10, kind: "all", view: "list", shown: 50 },
    places: { tab: "rating", league: "rest", view: "list" },
  };
  window.zc = ctx;
  tg.onSettings(() => go("/about"));
  const deep = new URLSearchParams(location.search).get("place");
  const linked = Boolean(deep && /^[nwr]\d+$/.test(deep));
  await start(ctx, linked ? `/place/${deep}` : "/feed");
  if (!store.state.tipsDone && !linked) {
    const { startTour } = await import("./tour.js");
    startTour(ctx);
  }
}

tg.init();
boot();
