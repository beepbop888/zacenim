from tests.e2e.harness import AppTest


class PlacesTest(AppTest):
    def seed(self):
        self.open("/feed")
        self.rest = self.ids_of_kind("restaurant", 4)
        self.bar = self.ids_of_kind("bar", 1)
        self.set_cloud("r", {"rest": {"fire": self.rest[:2], "ok": self.rest[2:3], "miss": []},
                             "bar": {"fire": self.bar, "ok": [], "miss": []}})
        self.set_cloud("w", [self.rest[3], self.rest[0]])
        self.reload()
        self.go("/places")

    def test_empty_states(self):
        self.open("/places")
        self.assertIn("Здесь будет твой рейтинг", self.text())
        self.page.click("[data-tab-key='want']")
        self.page.wait_for_selector("text=Список «Хочу» пуст")

    def test_ranking_by_league(self):
        self.seed()
        self.assertEqual(self.page.locator("#body .row .score").all_inner_texts(), ["9,2", "7,5", "5,0"])
        self.assertEqual(self.page.locator("#body .row .rank").all_inner_texts(), ["1", "2", "3"])
        self.assertIn("Рестораны 3", self.text())
        self.assertIn("Бары 1", self.text())
        self.shot("places")
        self.page.click("[data-league='bar']")
        self.page.wait_for_selector("[data-league='bar'][aria-pressed='true']")
        self.assertEqual(self.page.locator("#body .row .score").all_inner_texts(), ["8,4"])

    def test_want_list_shows_your_score_when_rated(self):
        self.seed()
        self.page.click("[data-tab-key='want']")
        self.page.wait_for_selector("[data-tab-key='want'][aria-selected='true']")
        rows = self.page.locator("#body .row")
        self.assertEqual(rows.count(), 2)
        self.assertEqual(rows.nth(0).locator(".score").count(), 0)
        self.assertEqual(rows.nth(1).locator(".score").inner_text(), "9,2")
        self.shot("places-want")

    def test_map_view_without_a_key(self):
        self.seed()
        self.page.click("[data-view='map']")
        self.page.wait_for_selector(".map-note")

    def test_map_view_with_a_key(self):
        self.use_map_key()
        self.seed()
        self.page.click("[data-view='map']")
        self.page.wait_for_function("() => window.__map && window.__map.markers === 3")
        self.assertEqual(self.page.locator(".pin-score").count(), 3)

    def test_opens_the_first_league_that_has_places(self):
        self.open("/feed")
        self.set_cloud("r", {"bar": {"fire": self.ids_of_kind("bar", 1), "ok": [], "miss": []}})
        self.reload()
        self.go("/places")
        self.assertEqual(self.page.locator("#body .row").count(), 1)
        self.assertEqual(self.page.get_attribute("[data-league='bar']", "aria-pressed"), "true")
