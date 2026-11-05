import { test } from "node:test";
import assert from "node:assert/strict";
import { metres, limitPoints, bbox } from "../../js/geo.js";

test("metres between two points a kilometre apart", () => {
  const d = metres({ lat: 55.75, lon: 37.6 }, { lat: 55.759, lon: 37.6 });
  assert.ok(Math.abs(d - 1001) < 5, String(d));
});

test("limitPoints keeps the nearest ones", () => {
  const pts = [0, 5, 1, 4, 2, 3].map((k) => ({ id: `p${k}`, lat: 55.75 + k * 0.001, lon: 37.6 }));
  assert.deepEqual(limitPoints(pts, { lat: 55.75, lon: 37.6 }, 3).map((p) => p.id), ["p0", "p1", "p2"]);
  assert.equal(limitPoints(pts, null, 10).length, 6);
});

test("bbox wraps all points", () => {
  assert.deepEqual(bbox([{ lat: 55.7, lon: 37.5 }, { lat: 55.8, lon: 37.7 }, { lat: 55.75, lon: 37.6 }]),
    [[55.7, 37.5], [55.8, 37.7]]);
});
