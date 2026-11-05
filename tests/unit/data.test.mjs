import { test } from "node:test";
import assert from "node:assert/strict";
import { buildData } from "../../js/data.js";

const venues = { v: 1, rows: [
  ["n1", "Шербет", "cafe", "", 55.741, 37.627, 1, 465, "", "", ""],
  ["n2", "Шербет", "restaurant", "грузинская", 55.7637, 37.6357, 0, 317, "круглосуточно", "", ""],
] };
const stations = { v: 1, rows: [["Чистые пруды", "#D6083B", 55.765, 37.638], ["Третьяковская", "#ED9121", 55.741, 37.627]] };

test("lookups by id and by name with a station", () => {
  const d = buildData(venues, stations);
  assert.equal(d.venue("n2")[2], "restaurant");
  assert.equal(d.venue("nope"), null);
  assert.equal(d.find("Шербет", "Чистые пруды")[0], "n2");
  assert.equal(d.find("Шербет")[0], "n1");
  assert.equal(d.find("Нет такого"), null);
});

test("the search index is built once, on first use", () => {
  const d = buildData(venues, stations);
  assert.equal(d.index.length, 2);
  assert.equal(d.index, d.index);
});
