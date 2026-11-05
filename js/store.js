// The person's own data: ratings, «Хочу», posts, comments, likes, tips seen.
import { createStorage } from "./storage.js";
import { emptyRatings, insertRating, removeRating, findRating, leagueOf } from "./rating.js";

// onRatings() runs after every saved change to the ratings.
export function createStore(primary, fallbackBackend, onFallback = () => {}, onRatings = () => {}) {
  const cloud = createStorage(primary);
  const device = fallbackBackend ? createStorage(fallbackBackend) : null;
  let storage = cloud;
  let fellBack = false;
  const state = { ratings: emptyRatings(), want: [], posts: [], comments: {}, likes: [], tipsDone: false };

  const entries = () => [["r", state.ratings], ["w", state.want], ["p", state.posts],
    ["c", state.comments], ["l", state.likes], ["tips", state.tipsDone]];
  const saveAll = (to) => Promise.all(entries().map(([k, v]) => to.saveJSON(k, v)));

  function apply(r, w, p, c, l, t) {
    state.ratings = r ? { ...emptyRatings(), ...r } : emptyRatings();
    state.want = Array.isArray(w) ? w : [];
    state.posts = Array.isArray(p) ? p : [];
    state.comments = c && typeof c === "object" ? c : {};
    state.likes = Array.isArray(l) ? l : [];
    state.tipsDone = t === true;
  }

  async function read(from, key, fallback) {
    const got = await from.readJSON(key);
    if (got.broken && device && from !== device) return device.loadJSON(key, fallback);
    return got.value === undefined ? fallback : got.value;
  }

  const readAll = async (from) => Promise.all([read(from, "r", null), read(from, "w", []), read(from, "p", []),
    read(from, "c", {}), read(from, "l", []), read(from, "tips", false)]);

  async function save(key, value) {
    try {
      await storage.saveJSON(key, value);
      if (device && storage !== device) await device.saveJSON(key, value).catch(() => {});
    } catch (err) {
      if (fellBack || !device) throw err;
      fellBack = true;
      storage = device;
      await fallbackBackend.set("pending", "1");
      onFallback();
      await saveAll(device);
    }
  }

  const toggle = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [id, ...list]);

  return {
    state,
    async load() {
      // The last session could not save to Telegram: the device copy is the newest one.
      if (device && await fallbackBackend.get("pending")) {
        apply(...await readAll(device));
        try {
          await saveAll(cloud);
          await fallbackBackend.remove(["pending"]);
        } catch {
          fellBack = true;
          storage = device;
        }
        return;
      }
      apply(...await readAll(cloud));
    },
    rating(id) { return findRating(state.ratings, id); },
    async rate(id, kind, group, pos) {
      state.ratings = insertRating(state.ratings, leagueOf(kind), group, id, pos);
      await save("r", state.ratings);
      onRatings();
    },
    async unrate(id) {
      state.ratings = removeRating(state.ratings, id);
      await save("r", state.ratings);
      onRatings();
    },
    isWant(id) { return state.want.includes(id); },
    async toggleWant(id) {
      state.want = toggle(state.want, id);
      await save("w", state.want);
      return state.want.includes(id);
    },
    isLiked(postId) { return state.likes.includes(postId); },
    async toggleLike(postId) {
      state.likes = toggle(state.likes, postId);
      await save("l", state.likes);
      return state.likes.includes(postId);
    },
    async addPost(post) {
      state.posts = [post, ...state.posts].slice(0, 100);
      await save("p", state.posts);
    },
    async addComment(postId, text) {
      const list = state.comments[postId] || [];
      state.comments = { ...state.comments, [postId]: [...list, { at: Date.now(), text }] };
      await save("c", state.comments);
    },
    async setTipsDone(value = true) {
      state.tipsDone = value;
      await save("tips", value);
    },
  };
}
