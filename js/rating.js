// Ranking maths, Beli-style: an answer group, then binary insertion. Pure functions.

export const LEAGUE_NAMES = { rest: "Рестораны", bar: "Бары", cafe: "Кофейни", fast: "Быстро" };
export const GROUPS = ["fire", "ok", "miss"];
export const RANGES = { fire: [6.7, 10.0], ok: [3.4, 6.6], miss: [0.0, 3.3] };

const LEAGUE_OF = { restaurant: "rest", bar: "bar", pub: "bar", biergarten: "bar", cafe: "cafe",
  fast_food: "fast", food_court: "fast", ice_cream: "fast" };

export const leagueOf = (kind) => LEAGUE_OF[kind] || "rest";
export const round1 = (x) => Math.round(x * 10 + 1e-9) / 10;

export function scoreAt(group, i, n) {
  const [lo, hi] = RANGES[group];
  return round1(lo + ((hi - lo) * (n - i - 0.5)) / n);
}

export const maxSteps = (n) => (n === 0 ? 0 : Math.floor(Math.log2(n)) + 1);

export function startInsert(n) {
  return n === 0
    ? { lo: 0, hi: 0, step: 0, done: true, pos: 0 }
    : { lo: 0, hi: n, step: 1, done: false, pos: null };
}

export const pivot = (s) => Math.floor((s.lo + s.hi) / 2);

export function answer(s, choice) {
  const mid = pivot(s);
  let { lo, hi } = s;
  if (choice === "better") hi = mid;
  else if (choice === "worse") lo = mid + 1;
  else { lo = mid + 1; hi = mid + 1; }
  const done = lo >= hi;
  return { lo, hi, step: s.step + 1, done, pos: done ? lo : null };
}

export function emptyRatings() {
  const out = {};
  for (const league of Object.keys(LEAGUE_NAMES)) out[league] = { fire: [], ok: [], miss: [] };
  return out;
}

export function removeRating(ratings, id) {
  const out = emptyRatings();
  for (const league of Object.keys(out)) {
    for (const g of GROUPS) out[league][g] = (ratings?.[league]?.[g] || []).filter((x) => x !== id);
  }
  return out;
}

export function insertRating(ratings, league, group, id, pos) {
  const out = removeRating(ratings, id);
  const list = out[league][group];
  out[league][group] = [...list.slice(0, pos), id, ...list.slice(pos)];
  return out;
}

export function findRating(ratings, id) {
  for (const league of Object.keys(LEAGUE_NAMES)) {
    const total = GROUPS.reduce((n, g) => n + (ratings?.[league]?.[g]?.length || 0), 0);
    let offset = 0;
    for (const g of GROUPS) {
      const list = ratings?.[league]?.[g] || [];
      const i = list.indexOf(id);
      if (i >= 0) {
        return { league, group: g, index: i, n: list.length, score: scoreAt(g, i, list.length), place: offset + i + 1, total };
      }
      offset += list.length;
    }
  }
  return null;
}

export function leagueList(ratings, league) {
  const out = [];
  for (const g of GROUPS) {
    const list = ratings?.[league]?.[g] || [];
    list.forEach((id, i) => out.push({ id, group: g, score: scoreAt(g, i, list.length) }));
  }
  return out;
}
