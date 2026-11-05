const LOCAL = ["127.0.0.1", "localhost"].includes(location.hostname);

export const CONFIG = {
  API_BASE: LOCAL ? "http://127.0.0.1:8787" : "https://zacenim-api.leonardabramov888.workers.dev",
  MAPGL_KEY: "",
  VERSION: "0.1.0",
};
