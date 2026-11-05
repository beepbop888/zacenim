from tests.e2e.harness import MAP_CONFIG, AppTest


class SearchTest(AppTest):
    def pick_station(self, name):
        self.page.click("[data-action='stations']")
        self.page.fill("#st-q", name)
        self.page.click("#st-list [data-station]:not([data-station='-1'])")
        self.page.wait_for_selector("#results .row")

    def minutes(self):
        metas = self.page.locator("#results .row .meta").all_inner_texts()
        return [int(m.split(", ")[1].split(" ")[0]) for m in metas]

    def test_idle_screen_suggests_stations(self):
        self.open("/search")
        self.assertIn("Начни вводить название", self.text())
        self.assertEqual(self.page.locator("#results [data-station]").count(), 6)
        self.shot("search-idle")

    def test_text_search_finds_sherbet(self):
        self.open("/search")
        self.page.fill("#q", "шербет")
        self.page.wait_for_selector("#results .row")
        self.assertIn("Шербет", self.page.locator("#results .row .name").all_inner_texts())
        self.assertIn("Нашли", self.text("#count"))
        self.shot("search-text")

    def test_latin_name_found_when_typed_in_cyrillic(self):
        self.open("/search")
        self.page.fill("#q", "пробка")
        self.page.wait_for_selector("#results .row")
        self.assertIn("Probka", self.page.locator("#results .row .name").all_inner_texts())

    def test_station_and_walking_time(self):
        self.open("/search")
        self.pick_station("чистые")
        metas = self.page.locator("#results .row .meta").all_inner_texts()
        self.assertTrue(all("Чистые пруды" in m for m in metas))
        self.assertEqual(self.minutes(), sorted(self.minutes()))
        self.assertLessEqual(max(self.minutes()), 10)
        self.page.click("[data-walk='5']")
        self.page.wait_for_function(
            "() => [...document.querySelectorAll('#results .row .meta')].every(m => parseInt(m.textContent.split(', ')[1]) <= 5)")
        self.shot("search-station")

    def test_kind_filter(self):
        self.open("/search")
        self.pick_station("чистые")
        self.page.click("[data-kind='bar']")
        self.page.wait_for_selector("[data-kind='bar'][aria-pressed='true']")
        kinds = self.page.locator("#results .row .kind").all_inner_texts()
        self.assertTrue(kinds)
        self.assertTrue(all(k.split(",")[0] in ("Бар", "Паб", "Пивной сад") for k in kinds), kinds)

    def test_metro_suggestion_from_text(self):
        self.open("/search")
        self.page.fill("#q", "курска")
        self.page.click("#results [data-station]:has-text('Метро Курская')")
        self.page.wait_for_function("() => document.querySelector('#q').value === ''")
        self.assertIn("Курская", self.text("#filters"))
        self.page.wait_for_selector("#results .row")

    def test_show_more(self):
        self.open("/search")
        self.page.fill("#q", "кофе")
        self.page.wait_for_selector("[data-action='more']")
        self.assertEqual(self.page.locator("#results .row").count(), 50)
        self.page.click("[data-action='more']")
        self.page.wait_for_function("() => document.querySelectorAll('#results .row').length > 50")

    def test_map_without_a_key_shows_a_note(self):
        self.open("/search")
        self.page.fill("#q", "шербет")
        self.page.wait_for_selector("#results .row")
        self.page.click("[data-view='map']")
        self.page.wait_for_selector(".map-note")
        self.assertIn("Карта пока не подключена", self.text())
        self.page.click(".map-note [data-view='list']")
        self.page.wait_for_selector("#results .row")

    def test_map_with_a_key_draws_pins_and_picks_a_place(self):
        self.use_map_key()
        self.open("/search")
        self.pick_station("чистые")
        self.page.click("[data-view='map']")
        self.page.wait_for_function("() => window.__map && window.__map.markers > 0")
        found = int(self.text("#count").split()[1])
        self.assertEqual(self.page.evaluate("window.__map.markers"), min(found, 300))
        self.assertEqual(self.page.evaluate("window.__map.key"), "test-key")
        lat, lon = self.page.evaluate("window.__map.first")
        self.assertTrue(55 < lat < 56.5 and 36.5 < lon < 38.5, (lat, lon))
        self.page.locator(".pin").first.dispatch_event("click")
        self.page.wait_for_selector("#picked .row")
        self.shot("search-map")
        self.page.click("[data-view='list']")
        self.page.wait_for_function("() => window.__map.markers === 0")

    def test_map_before_any_search_shows_moscow_and_follows_the_map(self):
        self.use_map_key()
        self.open("/search")
        self.page.click("[data-view='map']")
        self.page.wait_for_function("() => window.__map && window.__map.markers === 300")
        self.assertNotIn("Начни вводить", self.text("#results"))
        lat, lon = self.page.evaluate("window.__map.center")
        self.assertTrue(abs(lat - 55.7558) < 0.01 and abs(lon - 37.6176) < 0.01, (lat, lon))
        self.shot("search-map-idle")
        # Drag the map to Курская: the pins become the places around there.
        self.page.evaluate("window.__map.move(55.7586, 37.6611)")
        self.page.wait_for_function("() => { const f = window.__map.first; return f && Math.abs(f[0] - 55.7586) < 0.01 && Math.abs(f[1] - 37.6611) < 0.01; }")
        self.assertEqual(self.page.evaluate("window.__map.markers"), 300)
        self.page.locator(".pin").first.dispatch_event("click")
        self.page.wait_for_selector("#picked .row")

    def test_the_map_fills_the_screen_and_a_tapped_pin_opens_a_card_on_it(self):
        self.use_map_key()
        self.open("/search")
        self.page.click("[data-view='map']")
        self.page.wait_for_function("() => window.__map && window.__map.markers === 300")
        wrap = self.page.locator(".map-wrap").bounding_box()
        bar = self.page.locator("#tabbar").bounding_box()
        self.assertLess(abs(wrap["y"] + wrap["height"] - bar["y"]), 2, (wrap, bar))
        self.assertTrue(self.page.is_hidden("#picked"))
        self.page.locator(".pin").nth(5).dispatch_event("click")
        self.page.wait_for_selector("#picked .row")
        self.assertEqual(self.page.locator(".pin.on").count(), 1)
        card = self.page.locator("#picked").bounding_box()
        self.assertLessEqual(card["y"] + card["height"], bar["y"])
        self.assertGreaterEqual(card["y"], wrap["y"])
        self.shot("search-map-picked")
        self.page.evaluate("window.__map.tapMap()")
        self.page.wait_for_selector("#picked", state="hidden")
        self.assertEqual(self.page.locator(".pin.on").count(), 0)

    def test_the_map_reports_how_it_loaded(self):
        self.use_map_key()
        self.open("/search")
        self.page.click("[data-view='map']")
        self.page.wait_for_function("() => window.__map && window.__map.markers === 300")
        self.wait_for(lambda: self.api.logs, ms=9000)
        log = self.api.logs[0]
        self.assertEqual((log["kind"], log["version"]), ("map", "test"))
        self.assertIn("pins 300", log["detail"])
        self.assertRegex(log["detail"], r"box 390x\d+")
        self.assertIn("tiles 0", log["detail"])
        self.assertFalse(log["ok"])  # the stub draws no tiles

    def test_a_blocked_map_says_so_and_reports_it(self):
        self.context.route("**/config.js", lambda r: r.fulfill(status=200, content_type="application/javascript", body=MAP_CONFIG))
        self.context.route("https://api-maps.yandex.ru/**", lambda r: r.abort("addressunreachable"))
        self.open("/search")
        self.page.click("[data-view='map']")
        self.page.wait_for_selector("text=Карта не загрузилась")
        self.wait_for(lambda: self.api.logs)
        self.assertFalse(self.api.logs[0]["ok"])
        self.assertIn("map script failed", self.api.logs[0]["detail"])

    def test_place_names_are_text_not_html(self):
        self.inject_venue(["n999999999", '<img src=x onerror="window.__xss=1">', "restaurant", '"><b>жирный</b>',
                           55.765, 37.638, 0, 100, "", "", ""])
        self.open("/search")
        self.page.fill("#q", "img")
        self.page.wait_for_selector("#results .row")
        self.assertIn('<img src=x onerror="window.__xss=1">', self.text("#results"))
        self.assertIn('"><b>жирный</b>', self.text("#results"))
        self.assertIsNone(self.page.evaluate("window.__xss"))
        self.assertEqual(self.page.locator("#results img, #results b").count(), 0)
