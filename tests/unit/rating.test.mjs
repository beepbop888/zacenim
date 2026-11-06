import { test } from "node:test";
import assert from "node:assert/strict";
import { leagueOf, scoreAt, maxSteps, startInsert, pivot, answer, emptyRatings, insertRating,
  removeRating, findRating, leagueList } from "../../js/rating.js";

test("leagues by kind", () => {
  assert.equal(leagueOf("restaurant"), "rest");
  assert.equal(leagueOf("pub"), "bar");
  assert.equal(leagueOf("cafe"), "cafe");
  assert.equal(leagueOf("ice_cream"), "fast");
  assert.equal(leagueOf("unknown"), "rest");
});

test("the best place of an answer gets the top of its range, the rest evenly below", () => {
  assert.equal(scoreAt("fire", 0, 1), 10.0);
  assert.deepEqual([0, 1].map((i) => scoreAt("fire", i, 2)), [10.0, 8.4]);
  assert.deepEqual([0, 1, 2].map((i) => scoreAt("fire", i, 3)), [10.0, 8.9, 7.8]);
  assert.equal(scoreAt("fire", 0, 8), 10.0);
  assert.equal(scoreAt("fire", 2, 8), 9.2);
  assert.equal(scoreAt("fire", 7, 8), 7.1);
  assert.equal(scoreAt("ok", 0, 1), 6.6);
  assert.equal(scoreAt("miss", 0, 1), 3.3);
});

test("comparisons needed grow with the log of the list", () => {
  assert.deepEqual([0, 1, 2, 3, 7, 10, 100].map(maxSteps), [0, 1, 2, 2, 3, 4, 7]);
});

test("first place in a group needs no comparison", () => {
  assert.deepEqual(startInsert(0), { lo: 0, hi: 0, step: 0, done: true, pos: 0 });
});

test("better than everyone lands first in three steps for seven places", () => {
  let s = startInsert(7);
  assert.equal(pivot(s), 3);
  s = answer(s, "better");
  s = answer(s, "better");
  s = answer(s, "better");
  assert.equal(s.done, true);
  assert.equal(s.pos, 0);
  assert.equal(s.step, 4);
});

test("worse than everyone lands last", () => {
  let s = startInsert(3);
  while (!s.done) s = answer(s, "worse");
  assert.equal(s.pos, 3);
});

test("too hard to choose lands right after the compared place", () => {
  const s = answer(startInsert(7), "same");
  assert.equal(s.done, true);
  assert.equal(s.pos, 4);
});

test("insert, find, re-rate and remove", () => {
  let r = emptyRatings();
  r = insertRating(r, "rest", "fire", "a", 0);
  r = insertRating(r, "rest", "fire", "b", 1);
  r = insertRating(r, "rest", "ok", "c", 0);
  assert.deepEqual(findRating(r, "b"), { league: "rest", group: "fire", index: 1, n: 2, score: 8.4, place: 2, total: 3 });
  assert.equal(findRating(r, "c").place, 3);
  const before = r;
  r = insertRating(r, "rest", "fire", "c", 0);
  assert.deepEqual(r.rest.fire, ["c", "a", "b"]);
  assert.deepEqual(r.rest.ok, []);
  assert.deepEqual(before.rest.ok, ["c"]);
  r = removeRating(r, "a");
  assert.equal(findRating(r, "a"), null);
  assert.deepEqual(leagueList(r, "rest").map((x) => x.id), ["c", "b"]);
});

test("all scores: every rated place with its current score", async () => {
  const { allScores } = await import("../../js/rating.js");
  let r = insertRating(emptyRatings(), "rest", "fire", "n1", 0);
  r = insertRating(r, "rest", "fire", "n2", 1);
  r = insertRating(r, "bar", "miss", "n3", 0);
  assert.deepEqual(allScores(r), { n1: scoreAt("fire", 0, 2), n2: scoreAt("fire", 1, 2), n3: 3.3 });
  assert.deepEqual(allScores(emptyRatings()), {});
});
