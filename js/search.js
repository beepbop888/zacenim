// Search over the places data. Pure functions, no browser APIs.

const MULTI = [["shch", "щ"], ["sch", "щ"], ["sh", "ш"], ["ch", "ч"], ["zh", "ж"], ["kh", "х"],
  ["ts", "ц"], ["ya", "я"], ["yu", "ю"], ["yo", "е"], ["ye", "е"]];
const SINGLE = { a: "а", b: "б", c: "к", d: "д", e: "е", f: "ф", g: "г", h: "х", i: "и", j: "дж", k: "к",
  l: "л", m: "м", n: "н", o: "о", p: "п", q: "к", r: "р", s: "с", t: "т", u: "у", v: "в", w: "в", x: "кс",
  y: "и", z: "з" };

export function normalize(text) {
  return String(text ?? "").toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/g, " ").trim();
}

export function translit(text) {
  const s = normalize(text);
  let out = "";
  let i = 0;
  while (i < s.length) {
    const pair = MULTI.find(([lat]) => s.startsWith(lat, i));
    if (pair) {
      out += pair[1];
      i += pair[0].length;
    } else {
      out += SINGLE[s[i]] || s[i];
      i += 1;
    }
  }
  return out;
}

export const KIND_GROUPS = {
  all: null,
  rest: ["restaurant"],
  bar: ["bar", "pub", "biergarten"],
  cafe: ["cafe"],
  fast: ["fast_food", "food_court", "ice_cream"],
};

export function buildIndex(rows) {
  return rows.map((r, i) => ({
    i, name: normalize(r[1]), alt: translit(r[1]), cuisine: normalize(r[3]), kind: r[2], st: r[6], m: r[7],
  }));
}

const startsWord = (hay, token) => hay.startsWith(token) || hay.includes(` ${token}`);

// all: true gives every place of the kind (the map before any search), in data order.
export function query(index, { text = "", station = null, walk = null, kind = "all", all = false } = {}) {
  const q = normalize(text);
  const tokens = q ? q.split(" ") : [];
  const kinds = KIND_GROUPS[kind] || null;
  if (all) return index.filter((e) => !kinds || kinds.includes(e.kind)).map((e) => e.i);
  if (!tokens.length && station === null) return [];
  const maxM = walk ? walk * 80 : Infinity;
  const hits = [];
  for (const e of index) {
    if (kinds && !kinds.includes(e.kind)) continue;
    if (station !== null && (e.st !== station || e.m > maxM)) continue;
    let rank = 0;
    if (tokens.length) {
      if (e.name.startsWith(q) || e.alt.startsWith(q)) rank = 0;
      else if (tokens.every((t) => startsWord(e.name, t) || startsWord(e.alt, t) || e.name.includes(t) || e.alt.includes(t))) rank = 1;
      else if (tokens.every((t) => startsWord(e.cuisine, t) || startsWord(e.name, t) || startsWord(e.alt, t))) rank = 2;
      else continue;
    }
    hits.push([rank, e]);
  }
  hits.sort((a, b) => (station !== null
    ? a[1].m - b[1].m || a[0] - b[0] || a[1].name.localeCompare(b[1].name, "ru")
    : a[0] - b[0] || a[1].name.localeCompare(b[1].name, "ru")));
  return hits.map(([, e]) => e.i);
}
