import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize, translit, buildIndex, query } from "../../js/search.js";

const rows = [
  ["n1", "Шербет", "restaurant", "арабская, грузинская, восточная", 55.7637, 37.6357, 0, 317, "круглосуточно", "", ""],
  ["n2", "Probka", "restaurant", "итальянская", 55.7689, 37.6229, 1, 208, "", "", ""],
  ["n3", "Хинкали & Vino", "restaurant", "грузинская", 55.7631, 37.6351, 0, 393, "", "", ""],
  ["n4", "Black Milk", "cafe", "кофейня", 55.7621, 37.6425, 0, 471, "", "", ""],
  ["n5", "Ёлки-палки", "restaurant", "русская", 55.75, 37.6, 0, 900, "", "", ""],
  ["n6", "Кофемания", "cafe", "", 55.76, 37.63, 1, 100, "", "", ""],
  ["n7", "Дом кофе", "cafe", "", 55.76, 37.63, 1, 150, "", "", ""],
];
const index = buildIndex(rows);

test("normalize lowercases, folds ё and strips punctuation", () => {
  assert.equal(normalize("  ЁЛКИ-Палки!! "), "елки палки");
  assert.equal(normalize(null), "");
});

test("translit turns Latin into Cyrillic and keeps Cyrillic", () => {
  assert.equal(translit("Probka"), "пробка");
  assert.equal(translit("Shchuka"), "щука");
  assert.equal(translit("шербет"), "шербет");
});

test("empty text without a station finds nothing", () => {
  assert.deepEqual(query(index, { text: "   " }), []);
});

test("name prefix ranks before word in name before cuisine", () => {
  assert.deepEqual(query(index, { text: "кофе" }), [5, 6, 3]);
});

test("ё and case do not matter", () => {
  assert.deepEqual(query(index, { text: "ЕЛКИ" }), [4]);
});

test("Latin names match when typed in Cyrillic", () => {
  assert.deepEqual(query(index, { text: "пробка" }), [1]);
});

test("station and walking time filter, sorted by distance", () => {
  assert.deepEqual(query(index, { station: 0, walk: 5 }), [0, 2]);
  assert.deepEqual(query(index, { station: 0, walk: 15 }), [0, 2, 3, 4]);
});

test("kind group filters", () => {
  assert.deepEqual(query(index, { station: 0, walk: 10, kind: "cafe" }), [3]);
});
