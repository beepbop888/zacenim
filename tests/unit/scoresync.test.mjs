import { test } from "node:test";
import assert from "node:assert/strict";
import { createScoreSync } from "../../js/scoresync.js";

const memory = () => {
  const m = new Map();
  return { m, get: async (k) => (m.has(k) ? m.get(k) : null), set: async (k, v) => { m.set(k, v); } };
};

test("sends the scores once, and again only after they change", async () => {
  const sent = [];
  const mem = memory();
  let scores = { n1: 8.4 };
  const sync = createScoreSync(async (s) => { sent.push(s); }, mem, () => scores);
  await sync();
  await sync();
  assert.deepEqual(sent, [{ n1: 8.4 }]);
  scores = { n1: 9.0, n2: 5 };
  await sync();
  assert.deepEqual(sent, [{ n1: 8.4 }, { n1: 9.0, n2: 5 }]);
  // A new launch with the same memory sends nothing.
  await createScoreSync(async (s) => { sent.push(s); }, mem, () => scores)();
  assert.equal(sent.length, 2);
});

test("a failed send is tried again next time and never throws", async () => {
  let fail = true;
  const sent = [];
  const sync = createScoreSync(async (s) => { if (fail) throw new Error("offline"); sent.push(s); }, memory(), () => ({ n1: 1 }));
  await sync();
  fail = false;
  await sync();
  assert.deepEqual(sent, [{ n1: 1 }]);
});

test("quick changes go out in order, the last list last", async () => {
  const sent = [];
  let scores = { n1: 1 };
  let release;
  const gate = new Promise((r) => { release = r; });
  const sync = createScoreSync(async (s) => { if (!sent.length) await gate; sent.push(s); }, memory(), () => scores);
  const first = sync();
  scores = { n1: 2 };
  const second = sync();
  release();
  await Promise.all([first, second]);
  assert.deepEqual(sent.at(-1), { n1: 2 });
});

test("a memory that cannot be read or written does not stop sending", async () => {
  const sent = [];
  const broken = { get: async () => { throw new Error("no storage"); }, set: async () => { throw new Error("no storage"); } };
  await createScoreSync(async (s) => { sent.push(s); }, broken, () => ({ n1: 3 }))();
  assert.deepEqual(sent, [{ n1: 3 }]);
});
