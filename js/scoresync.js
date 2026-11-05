// Sends the person's scores to the server for «У остальных», only when they changed since the last send.
// send(scores) talks to the server; memory {get, set} remembers the last list sent; current() gives today's list.
// Sends run one after another, so the server always ends with the newest list. Never throws.
const KEY = "scoresSent";

export function createScoreSync(send, memory, current) {
  let chain = Promise.resolve();
  async function run() {
    const scores = current();
    const text = JSON.stringify(scores);
    try {
      if (await memory.get(KEY) === text) return;
    } catch { /* no memory: send anyway */ }
    try {
      await send(scores);
    } catch {
      return; // offline or server down: tried again on the next change or launch
    }
    try {
      await memory.set(KEY, text);
    } catch { /* sent anyway */ }
  }
  return () => {
    chain = chain.then(run);
    return chain;
  };
}
