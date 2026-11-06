import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryBackend, createStorage, cloudBackend, CHUNK } from "../../js/storage.js";
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
  assert.equal(again.rating("n1").score, 10);
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

function failingReads(backend) {
  return { ...backend, async get() { throw new Error("network"); } };
}

test("a read error reaches the caller instead of looking like an empty account", async () => {
  const backend = memoryBackend();
  const store = createStore(backend, null);
  await store.load();
  await store.rate("n1", "restaurant", "fire", 0);
  const flaky = createStore(failingReads(backend), null);
  await assert.rejects(flaky.load(), /network/);
});

test("the device copy is read next launch after a failed save, then returns to the cloud", async () => {
  const cloud = memoryBackend();
  const device = memoryBackend();
  const realSet = cloud.set;
  cloud.set = async () => { throw new Error("quota"); };
  const first = createStore(cloud, device, () => {});
  await first.load();
  await first.rate("n9", "bar", "ok", 0);

  const stillBroken = createStore(cloud, device, () => {});
  await stillBroken.load();
  assert.equal(stillBroken.rating("n9").league, "bar");

  cloud.set = realSet;
  const healed = createStore(cloud, device, () => {});
  await healed.load();
  assert.equal(healed.rating("n9").league, "bar");
  assert.equal(await device.get("pending"), null);
  const cloudOnly = createStore(cloud, null);
  await cloudOnly.load();
  assert.equal(cloudOnly.rating("n9").league, "bar");
});

test("unreadable cloud data is restored from the device copy, not replaced by nothing", async () => {
  const cloud = memoryBackend();
  const device = memoryBackend();
  const store = createStore(cloud, device, () => {});
  await store.load();
  await store.rate("n1", "restaurant", "fire", 0);
  await cloud.set("r_0", "{half a write");
  const again = createStore(cloud, device, () => {});
  await again.load();
  assert.equal(again.rating("n1").league, "rest");
});

test("Telegram storage that never answers gives up", async () => {
  const silent = { getItem() {}, setItem() {}, removeItems() {} };
  await assert.rejects(cloudBackend(silent, 20).get("r_n"), /timeout/);
});

test("two quick «Хочу» taps leave storage matching the screen", async () => {
  // Telegram's storage answers in any order: here the first write is the slowest.
  const backend = memoryBackend();
  const set = backend.set.bind(backend);
  let calls = 0;
  backend.set = async (k, v) => {
    calls += 1;
    if (calls === 1) await new Promise((r) => setTimeout(r, 30));
    return set(k, v);
  };
  const store = createStore(backend, null);
  await store.load();
  const [first, second] = await Promise.all([store.toggleWant("n2"), store.toggleWant("n2")]);
  assert.deepEqual([first, second], [true, false]);
  const again = createStore(backend, null);
  await again.load();
  assert.equal(again.isWant("n2"), false);
});
