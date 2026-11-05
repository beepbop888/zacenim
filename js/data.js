// Places data: buildData is pure, loadData fetches the two JSON files.
import { buildIndex } from "./search.js";

export function buildData(venues, stations) {
  const rows = venues.rows;
  const byId = new Map(rows.map((r) => [r[0], r]));
  let index = null;
  return {
    rows,
    stations: stations.rows,
    byId,
    venue: (id) => byId.get(id) || null,
    get index() {
      if (!index) index = buildIndex(rows);
      return index;
    },
    find(name, station) {
      const st = station === undefined ? -1 : stations.rows.findIndex((s) => s[0] === station);
      return rows.find((r) => r[1] === name && (st < 0 || r[6] === st)) || null;
    },
  };
}

export async function loadData(base = "data/") {
  const get = async (name) => {
    const res = await fetch(base + name);
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    return res.json();
  };
  const [venues, stations] = await Promise.all([get("venues.json"), get("stations.json")]);
  return buildData(venues, stations);
}
