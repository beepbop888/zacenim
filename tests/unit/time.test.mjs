import { test } from "node:test";
import assert from "node:assert/strict";
import { mskParts, mskToUtc, dayOptions, whenText, TIMES } from "../../js/time.js";

// 2026-10-05 22:30 UTC is already Tuesday 6 October, 01:30 in Moscow.
const NOW = Date.UTC(2026, 9, 5, 22, 30);

test("Moscow wall time to UTC and back", () => {
  assert.equal(mskToUtc(2026, 9, 9, 19, 0), Date.UTC(2026, 9, 9, 16, 0));
  assert.deepEqual(mskParts(NOW), { y: 2026, m: 9, d: 6, wd: 2, hh: 1, mm: 30 });
});

test("days follow the Moscow date, not UTC", () => {
  const days = dayOptions(NOW);
  assert.equal(days.length, 7);
  assert.deepEqual(days[0], { label: "Сегодня", y: 2026, m: 9, d: 6 });
  assert.deepEqual(days[1], { label: "Завтра", y: 2026, m: 9, d: 7 });
  assert.equal(days[2].label, "Чт, 8");
});

test("reminder time in words", () => {
  assert.equal(whenText(mskToUtc(2026, 9, 6, 19, 0), NOW), "сегодня в 19:00");
  assert.equal(whenText(mskToUtc(2026, 9, 7, 9, 5), NOW), "завтра в 09:05");
  assert.equal(whenText(mskToUtc(2026, 9, 9, 19, 30), NOW), "в пятницу, 9 октября, в 19:30");
  assert.equal(whenText(mskToUtc(2026, 9, 13, 19, 0), NOW), "во вторник, 13 октября, в 19:00");
});

test("time slots are in order", () => {
  assert.deepEqual([...TIMES].sort(), TIMES);
});
