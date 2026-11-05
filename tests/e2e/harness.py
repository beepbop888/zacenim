"""Shared set-up for the end-to-end tests: the app served on 127.0.0.1:8765, headless Chromium
at 390x844, a Telegram stub and a fake server API. Run from miniapp/:

    python3 -m unittest discover -s tests -t . -v
"""
import functools
import http.server
import json
import os
import threading
import time
import unittest
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(os.path.dirname(HERE))
PORT = 8765
BASE = "http://127.0.0.1:%d/" % PORT
API = "http://127.0.0.1:8787"
SHOTS = os.path.join(APP, "tests", "screenshots")
CORS = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"}
SEED_TIPS = ("try { for (const p of ['tgcs_', 'zc_']) { if (!localStorage.getItem(p + 'tips_n')) {"
             " localStorage.setItem(p + 'tips_n', '1'); localStorage.setItem(p + 'tips_0', 'true'); } } } catch (e) {}")
NO_MAP_CONFIG = 'export const CONFIG = { API_BASE: "http://127.0.0.1:8787", YANDEX_KEY: "", VERSION: "test" };'
MAP_CONFIG = 'export const CONFIG = { API_BASE: "http://127.0.0.1:8787", YANDEX_KEY: "test-key", VERSION: "test" };'
YMAPS_STUB = """
window.__map = { maps: 0, markers: 0, fits: 0, first: null, center: null, live: null,
  // Tests call this to drag the map: it moves the centre and fires "boundschange" like Yandex does.
  move(lat, lon) { const m = window.__map.live; m.center = [lat, lon]; window.__map.center = m.center; m.moved.forEach((f) => f()); },
  key: new URL(document.currentScript.src).searchParams.get("apikey") };
window.ymaps = {
  ready(cb) { cb(); },
  templateLayoutFactory: { createClass: (html) => html },
  Placemark: class {
    constructor(coords, props, opts) {
      this.coords = coords;
      this.layout = opts.iconLayout;
      this.handlers = [];
      this.events = { add: (name, f) => this.handlers.push(f) };
    }
  },
  Map: class {
    constructor(el, state) {
      window.__map.maps += 1;
      window.__map.live = this;
      this.center = state.center;
      window.__map.center = state.center;
      this.moved = [];
      this.events = { add: (name, f) => { if (name === "boundschange") this.moved.push(f); } };
      this.nodes = [];
      this.geoObjects = { add: (pm) => {
        const w = document.createElement("div");
        w.innerHTML = pm.layout;
        w.firstElementChild.addEventListener("click", () => pm.handlers.forEach((f) => f()));
        el.append(w);
        this.nodes.push(w);
        window.__map.markers += 1;
        window.__map.first = window.__map.first || pm.coords;
      }, removeAll: () => {
        this.nodes.forEach((n) => n.remove());
        window.__map.markers -= this.nodes.length;
        this.nodes = [];
        window.__map.first = null;
      } };
    }
    getCenter() { return this.center; }
    setBounds() { window.__map.fits += 1; }
    destroy() { this.nodes.forEach((n) => n.remove()); window.__map.markers -= this.nodes.length; }
  },
};
"""

with open(os.path.join(HERE, "tg_stub.js"), encoding="utf-8") as fh:
    TG_STUB = fh.read()

_server = None


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def ensure_server():
    global _server
    if _server is None:
        http.server.ThreadingHTTPServer.allow_reuse_address = True
        _server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(_QuietHandler, directory=APP))
        threading.Thread(target=_server.serve_forever, daemon=True).start()


class FakeApi:
    """Answers the app's calls to the server and records them. Change the fields to change the answers."""

    def __init__(self):
        self.calls = []
        self.rating = {"rating": 9.2, "count": 1234}
        self.scores = None  # the last list the app sent to PUT /api/scores
        self.booking = {"status": "site"}
        self.reminders = []
        self.place_names = {}
        self.fail = {}  # path prefix -> HTTP status to answer with

    def handle(self, route):
        req = route.request
        url = urlparse(req.url)
        if req.method == "OPTIONS":
            route.fulfill(status=204, headers=CORS)
            return
        body = req.post_data_buffer or b""
        self.calls.append({"method": req.method, "path": url.path, "query": parse_qs(url.query), "body": body,
                           "type": req.headers.get("content-type", ""), "auth": req.headers.get("authorization", "")})
        for prefix, status in self.fail.items():
            if url.path.startswith(prefix):
                route.fulfill(status=status, headers=CORS, json={"error": "test"})
                return
        status, payload = self.answer(req.method, url.path, body)
        if status == 204:
            route.fulfill(status=204, headers=CORS)
        elif isinstance(payload, bytes):
            route.fulfill(status=status, headers=dict(CORS, **{"Content-Type": "image/jpeg"}), body=payload)
        else:
            route.fulfill(status=status, headers=CORS, json=payload)

    def answer(self, method, path, body):
        if path == "/api/rating":
            return 200, self.rating
        if path == "/api/scores" and method == "PUT":
            self.scores = json.loads(body.decode("utf-8"))["scores"]
            return 204, None
        if path == "/api/booking":
            return 200, self.booking
        if path == "/api/reminders" and method == "GET":
            return 200, {"items": self.reminders}
        if path == "/api/reminders" and method == "POST":
            data = json.loads(body.decode("utf-8"))
            item = {"id": "r%d" % (len(self.reminders) + 1), "place": data["place"],
                    "name": self.place_names.get(data["place"], "Место"), "at": data["at"]}
            self.reminders.append(item)
            return 201, item
        if path.startswith("/api/reminders/") and method == "DELETE":
            rid = path.rsplit("/", 1)[1]
            self.reminders = [r for r in self.reminders if r["id"] != rid]
            return 204, None
        if path == "/api/photos" and method == "POST":
            return 201, {"key": "11111111-2222-3333-4444-555555555555"}
        if path.startswith("/api/photos/"):
            with open(os.path.join(APP, "img", "khinkali.jpg"), "rb") as fh:
                return 200, fh.read()
        return 404, {"error": "not-found"}


class AppTest(unittest.TestCase):
    timezone = "Europe/Moscow"

    @classmethod
    def setUpClass(cls):
        ensure_server()
        os.makedirs(SHOTS, exist_ok=True)
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch()

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()

    def setUp(self):
        self.api = FakeApi()
        self.errors = []
        self.context = self.browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                                                locale="ru-RU", timezone_id=self.timezone)
        self.context.route("https://telegram.org/js/telegram-web-app.js",
                           lambda r: r.fulfill(status=200, content_type="application/javascript", body=TG_STUB))
        self.context.route(API + "/**", self.api.handle)
        self.context.route("https://api-maps.yandex.ru/**", lambda r: r.abort())
        self.context.route("**/config.js", lambda r: r.fulfill(status=200, content_type="application/javascript", body=NO_MAP_CONFIG))
        self.page = self.context.new_page()
        self.page.on("pageerror", lambda e: self.errors.append("pageerror: %s" % e))
        self.page.on("console", self._console)

    def _console(self, msg):
        if msg.type == "error" and not msg.text.startswith("Failed to load resource"):
            self.errors.append("console: %s" % msg.text)

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    # Opening and moving around

    def seed_tips(self):
        self.page.add_init_script(SEED_TIPS)

    def open(self, path="/feed", tg=True, tips_done=True, expect=None, query=""):
        if tips_done:
            self.seed_tips()
        search = query or ("" if tg else "?tg=0")
        self.page.goto(BASE + search + "#" + path)
        self.page.wait_for_selector("body[data-ready='1']", timeout=20000)
        self.wait_route(expect or path)

    def wait_route(self, path):
        self.page.wait_for_function("p => document.body.dataset.route === p", arg=path, timeout=10000)

    def wait_for(self, check, ms=5000):
        """Polls a Python condition (for example on what the fake server received) while the page runs."""
        deadline = time.time() + ms / 1000
        while not check():
            if time.time() > deadline:
                self.fail("condition not met in %d ms" % ms)
            self.page.wait_for_timeout(50)

    def go(self, path):
        self.page.evaluate("p => { location.hash = '#' + p; }", path)
        self.wait_route(path)

    def reload(self):
        path = self.page.evaluate("document.body.dataset.route")
        self.page.reload()
        self.page.wait_for_selector("body[data-ready='1']", timeout=20000)
        self.wait_route(path)

    def press_back(self):
        self.page.evaluate("window.__tg.back()")

    # Reading the page

    def text(self, selector="#screen"):
        return self.page.inner_text(selector).replace("\xa0", " ").replace(" ", " ")

    def tg_calls(self):
        return self.page.evaluate("window.__tg ? window.__tg.calls : []")

    def shot(self, name):
        self.page.screenshot(path=os.path.join(SHOTS, name + ".png"))

    # Data and saved state

    def place_id(self, name, station=None):
        return self.page.evaluate("([n, s]) => { const r = window.zc.data.find(n, s === null ? undefined : s); return r && r[0]; }",
                                  [name, station])

    def ids_of_kind(self, kind, count, skip=()):
        ids = self.page.evaluate("([k, c]) => window.zc.data.rows.filter(r => r[2] === k).slice(0, c).map(r => r[0])",
                                 [kind, count + len(skip)])
        return [i for i in ids if i not in skip][:count]

    def cloud(self, key):
        raw = self.page.evaluate("""k => {
            const n = Number(localStorage.getItem('tgcs_' + k + '_n'));
            let s = '';
            for (let i = 0; i < n; i++) s += localStorage.getItem('tgcs_' + k + '_' + i);
            return n ? s : null;
        }""", key)
        return None if raw is None else json.loads(raw)

    def set_cloud(self, key, value):
        self.page.evaluate("""([k, v]) => {
            localStorage.setItem('tgcs_' + k + '_n', '1');
            localStorage.setItem('tgcs_' + k + '_0', JSON.stringify(v));
        }""", [key, value])

    # Changing what the app gets

    def inject_venue(self, row):
        def handle(route):
            response = route.fetch()
            data = response.json()
            data["rows"].append(row)
            route.fulfill(response=response, json=data)
        self.context.route("**/data/venues.json", handle)

    def use_map_key(self):
        self.context.route("**/config.js", lambda r: r.fulfill(status=200, content_type="application/javascript", body=MAP_CONFIG))
        self.context.route("https://api-maps.yandex.ru/**",
                           lambda r: r.fulfill(status=200, content_type="application/javascript", body=YMAPS_STUB))
