const LOCAL = ["127.0.0.1", "localhost"].includes(location.hostname);

export const CONFIG = {
  API_BASE: LOCAL ? "http://127.0.0.1:8787" : "https://zacenim-api.leonardabramov888.workers.dev",
  YANDEX_KEY: "946d02bd-cb64-49d1-b2b8-05bcf5183035",
  VERSION: "0.1.0",
};
