// Key-value storage with JSON split into chunks. Telegram CloudStorage keys may use only
// A-Z a-z 0-9 _ - and hold at most 4,096 characters per value.

export const CHUNK = 4000;
const KEY = /^[A-Za-z0-9_-]{1,128}$/;

export function memoryBackend(limit = 4096) {
  const m = new Map();
  return {
    m,
    async get(k) { return m.has(k) ? m.get(k) : null; },
    async set(k, v) {
      if (!KEY.test(k)) throw new Error(`bad key ${k}`);
      if (v.length > limit) throw new Error("value too long");
      m.set(k, v);
    },
    async remove(keys) { keys.forEach((k) => m.delete(k)); },
  };
}

export function localBackend(prefix = "zc_") {
  return {
    async get(k) {
      try { return localStorage.getItem(prefix + k); } catch { return null; }
    },
    async set(k, v) { localStorage.setItem(prefix + k, v); },
    async remove(keys) {
      keys.forEach((k) => { try { localStorage.removeItem(prefix + k); } catch { /* ignore */ } });
    },
  };
}

export function cloudBackend(cs, timeoutMs = 8000) {
  const call = (fn) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    fn((err, value) => {
      clearTimeout(timer);
      if (err) reject(new Error(String(err)));
      else resolve(value);
    });
  });
  return {
    async get(k) {
      const v = await call((cb) => cs.getItem(k, cb));
      return v === "" || v === undefined ? null : v;
    },
    async set(k, v) { await call((cb) => cs.setItem(k, v, cb)); },
    async remove(keys) { if (keys.length) await call((cb) => cs.removeItems(keys, cb)); },
  };
}

export function createStorage(backend) {
  return {
    // Backend errors reach the caller: "could not read" must never look like "nothing saved".
    // {value} if readable, {} if nothing is saved, {broken: true} if saved data does not parse.
    async readJSON(key) {
      const n = Number(await backend.get(`${key}_n`));
      if (!n) return {};
      let s = "";
      for (let i = 0; i < n; i += 1) {
        const part = await backend.get(`${key}_${i}`);
        if (part === null) return { broken: true };
        s += part;
      }
      try {
        return { value: JSON.parse(s) };
      } catch {
        return { broken: true };
      }
    },
    async loadJSON(key, fallback) {
      const { value } = await this.readJSON(key);
      return value === undefined ? fallback : value;
    },
    async saveJSON(key, value) {
      const s = JSON.stringify(value);
      const parts = [];
      for (let i = 0; i < s.length; i += CHUNK) parts.push(s.slice(i, i + CHUNK));
      const old = Number(await backend.get(`${key}_n`)) || 0;
      for (let i = 0; i < parts.length; i += 1) await backend.set(`${key}_${i}`, parts[i]);
      await backend.set(`${key}_n`, String(parts.length));
      const stale = [];
      for (let i = parts.length; i < old; i += 1) stale.push(`${key}_${i}`);
      await backend.remove(stale);
    },
  };
}
