from tests.e2e.harness import BASE, AppTest


class PlaceTest(AppTest):
    def open_sherbet(self):
        self.open("/feed")
        self.pid = self.place_id("Шербет", "Чистые пруды")
        self.go("/place/" + self.pid)

    def test_details_and_both_scores(self):
        self.open_sherbet()
        self.page.wait_for_selector("#others-badge .score.good")
        t = self.text()
        for part in ("Шербет", "Ресторан", "Чистые пруды, 4 мин пешком", "Твой балл", "Ещё не оценено", "У остальных",
                     "9,2", "по отзывам 2ГИС, 1 234", "круглосуточно", "Забронировать", "Напомнить", "Написать пост"):
            self.assertIn(part, t)
        self.assertTrue(self.page.evaluate("Telegram.WebApp.BackButton.isVisible"))
        call = [c for c in self.api.calls if c["path"] == "/api/rating"][0]
        self.assertEqual(call["query"]["id"], [self.pid])
        self.assertTrue(call["auth"].startswith("tma query_id=TEST"))
        self.shot("place")

    def test_no_rating_and_a_failed_rating(self):
        self.api.rating = {"rating": None, "count": 0}
        self.open_sherbet()
        self.page.wait_for_selector("text=пока нет оценок")
        self.api.fail["/api/rating"] = 500
        self.reload()
        self.page.wait_for_selector("#others-sub:has-text('Сервер не отвечает')")
        del self.api.fail["/api/rating"]
        self.api.rating = {"rating": 8.8, "count": 87}
        self.page.click("[data-action='retry-rating']")
        self.page.wait_for_selector("#others-badge .score.good")
        self.assertIn("8,8", self.text("#others-badge"))

    def test_an_expired_session_says_reopen_from_telegram(self):
        self.api.fail["/api/rating"] = 401
        self.open_sherbet()
        self.page.wait_for_selector("#others-sub:has-text('Открой «Заценим» заново из Telegram')")

    def test_want_toggles_and_survives_reload(self):
        self.open_sherbet()
        self.page.click("[data-action='want']")
        self.page.wait_for_selector("[data-action='want'][aria-pressed='true']")
        self.assertEqual(self.cloud("w"), [self.pid])
        self.assertIn("impact:light", self.tg_calls())
        self.reload()
        self.page.wait_for_selector("[data-action='want'][aria-pressed='true']")
        self.page.click("[data-action='want']")
        self.page.wait_for_selector("[data-action='want'][aria-pressed='false']")
        self.assertEqual(self.cloud("w"), [])

    def test_website_opens_through_telegram(self):
        self.open_sherbet()
        site = self.page.evaluate("id => window.zc.data.venue(id)[10]", self.pid)
        self.page.click("[data-action='site']")
        self.assertIn("openLink:" + site, self.tg_calls())

    def test_unknown_place(self):
        self.open("/place/n1")
        self.assertIn("Место не найдено", self.text())

    def test_place_name_is_text_not_html(self):
        self.inject_venue(["n999999999", '<img src=x onerror="window.__xss=1">', "restaurant", "",
                           55.765, 37.638, 0, 100, "", "", ""])
        self.open("/place/n999999999")
        self.assertIn('<img src=x onerror="window.__xss=1">', self.text())
        self.assertIsNone(self.page.evaluate("window.__xss"))

    def test_link_from_the_bot_opens_the_place(self):
        self.open("/feed")
        pid = self.place_id("Шербет", "Чистые пруды")
        self.page.goto(BASE + "?place=" + pid)
        self.page.wait_for_selector("body[data-ready='1']")
        self.wait_route("/place/" + pid)

    def test_search_result_opens_the_place_and_back_keeps_the_search(self):
        self.open("/search")
        self.page.fill("#q", "шербет")
        self.page.click("#results .row:has-text('Шербет')")
        self.page.wait_for_function("() => document.body.dataset.route.startsWith('/place/')")
        self.press_back()
        self.wait_route("/search")
        self.assertEqual(self.page.input_value("#q"), "шербет")
        self.page.wait_for_selector("#results .row")
