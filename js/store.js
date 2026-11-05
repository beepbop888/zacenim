// The person's own data: ratings, «Хочу», posts, comments, likes, tips seen.
import { createStorage } from "./storage.js";
import { emptyRatings, insertRating, removeRating, findRating, leagueOf } from "./rating.js";

export function createStore(primary, fallbackBackend, onFallback = () => {}) {
  let storage = createStorage(primary);
  let fellBack = false;
  const state = { ratings: emptyRatings(), want: [], posts: [], comments: {}, likes: [], tipsDone: false };

  async function save(key, value) {
    try {
      await storage.saveJSON(key, value);
    } catch (err) {
      if (fellBack || !fallbackBackend) throw err;
      fellBack = true;
      storage = createStorage(fallbackBackend);
      onFallback();
      await storage.saveJSON(key, value);
      await Promise.all([
        storage.saveJSON("r", state.ratings), storage.saveJSON("w", state.want), storage.saveJSON("p", state.posts),
        storage.saveJSON("c", state.comments), storage.saveJSON("l", state.likes), storage.saveJSON("tips", state.tipsDone),
      ]);
    }
  }

  const toggle = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [id, ...list]);

  return {
    state,
    async load() {
      const [r, w, p, c, l, t] = await Promise.all([
        storage.loadJSON("r", null), storage.loadJSON("w", []), storage.loadJSON("p", []),
        storage.loadJSON("c", {}), storage.loadJSON("l", []), storage.loadJSON("tips", false),
      ]);
      state.ratings = r ? { ...emptyRatings(), ...r } : emptyRatings();
      state.want = Array.isArray(w) ? w : [];
      state.posts = Array.isArray(p) ? p : [];
      state.comments = c && typeof c === "object" ? c : {};
      state.likes = Array.isArray(l) ? l : [];
      state.tipsDone = t === true;
    },
    rating(id) { return findRating(state.ratings, id); },
    async rate(id, kind, group, pos) {
      state.ratings = insertRating(state.ratings, leagueOf(kind), group, id, pos);
      await save("r", state.ratings);
    },
    async unrate(id) {
      state.ratings = removeRating(state.ratings, id);
      await save("r", state.ratings);
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
