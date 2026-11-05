import { test } from "node:test";
import assert from "node:assert/strict";
import { fmtScore, walkMin, plural, scoreClass } from "../../js/format.js";

test("scores use a comma and one decimal", () => {
  assert.equal(fmtScore(8.35), "8,4");
  assert.equal(fmtScore(9), "9,0");
});

test("walking minutes at 80 m a minute, at least one", () => {
  assert.equal(walkMin(30), 1);
  assert.equal(walkMin(317), 4);
});

test("Russian plurals", () => {
  assert.equal(plural(1, "место", "места", "мест"), "место");
  assert.equal(plural(3, "место", "места", "мест"), "места");
  assert.equal(plural(11, "место", "места", "мест"), "мест");
  assert.equal(plural(22, "место", "места", "мест"), "места");
  assert.equal(plural(70, "место", "места", "мест"), "мест");
});

test("score colour classes", () => {
  assert.deepEqual([9.1, 6.7, 6.6, 3.4, 3.3].map(scoreClass), ["good", "good", "mid", "mid", "bad"]);
});
