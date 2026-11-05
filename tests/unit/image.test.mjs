import { test } from "node:test";
import assert from "node:assert/strict";
import { fitSize } from "../../js/image.js";

test("photos shrink to 1280 px on the long side and never grow", () => {
  assert.deepEqual(fitSize(4000, 3000), [1280, 960]);
  assert.deepEqual(fitSize(1000, 3000), [427, 1280]);
  assert.deepEqual(fitSize(800, 600), [800, 600]);
});
