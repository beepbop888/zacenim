import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryBackend, createStorage, CHUNK } from "../../js/storage.js";
import { createStore } from "../../js/store.js";

test("round trip of a value larger than one chunk", async () => {
  const backend = memoryBackend();
  const storage = createStorage(backend);
  const value = { ids: Array.from({ length: 900 }, (_, i) => `n${1000000 + i}`) };
  await storage.saveJSON("r", value);
  assert.ok(Number(await backend.get("r_n")) > 1);
  assert.deepEqual(await storage.loadJSON("r", null), value);
  for (const [, v] of backend.m) assert.ok(v.length <= CHUNK);
});

test("shrinking a value removes stale chunks", async () => {
  const backend = memoryBackend();
  const storage = createStorage(backend);
  await storage.saveJSON("p", "x".repeat(9000));
  await storage.saveJSON("p", "small");
  assert.equal(await backend.get("p_n"), "1");
  assert.equal(await backend.get("p_1"), null);
  assert.equal(await storage.loadJSON("p", null), "small");
});

test("missing or broken data gives the fallback", async () => {
  const backend = memoryBackend();
  const storage = createStorage(backend);
  assert.deepEqual(await storage.loadJSON("w", []), []);
  await backend.set("w_n", "1");
  await backend.set("w_0", "{broken");
  assert.deepEqual(await storage.loadJSON("w", []), []);
});

test("store rates, lists and reloads", async () => {
  const backend = memoryBackend();
  const store = createStore(backend, null);
  await store.load();
  await store.rate("n1", "restaurant", "fire", 0);
  assert.equal(await store.toggleWant("n2"), true);
  await store.addPost({ id: "p1", at: 1, text: "Вкусно", v: "n1", aud: "friends", photo: null });
  await store.addComment("d1", "Согласен");
  assert.equal(await store.toggleLike("d1"), true);
  await store.setTipsDone(true);
  const again = createStore(backend, null);
  await again.load();
  assert.equal(again.rating("n1").score, 8.4);
  assert.equal(again.isWant("n2"), true);
  assert.equal(again.state.posts[0].text, "Вкусно");
  assert.equal(again.state.comments.d1[0].text, "Согласен");
  assert.equal(again.isLiked("d1"), true);
  assert.equal(again.state.tipsDone, true);
});

test("a failing primary storage falls back to the device and says so", async () => {
  const broken = { async get() { return null; }, async set() { throw new Error("quota"); }, async remove() {} };
  const device = memoryBackend();
  let told = 0;
  const store = createStore(broken, device, () => { told += 1; });
  await store.load();
  await store.rate("n9", "bar", "ok", 0);
  await store.toggleWant("n8");
  assert.equal(told, 1);
  const fromDevice = createStore(device, null);
  await fromDevice.load();
  assert.equal(fromDevice.rating("n9").league, "bar");
  assert.equal(fromDevice.isWant("n8"), true);
});
