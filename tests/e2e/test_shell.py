from tests.e2e.harness import BASE, AppTest


class ShellTest(AppTest):
    def test_feed_opens_with_tab_bar_and_telegram_setup(self):
        self.open("/feed")
        self.assertIn("заценим", self.text())
        self.assertEqual(self.page.get_attribute("[data-tab='feed']", "aria-current"), "page")
        for call in ("ready", "expand", "disableVerticalSwipes", "header:#FFFFFF", "background:#FFFFFF"):
            self.assertIn(call, self.tg_calls())
        self.assertFalse(self.page.evaluate("Telegram.WebApp.BackButton.isVisible"))
        self.shot("shell-feed")

    def test_settings_opens_about_and_back_returns(self):
        self.open("/feed")
        self.page.evaluate("window.__tg.settings()")
        self.wait_route("/about")
        self.assertIn("OpenStreetMap", self.text())
        self.assertIn("Карта: Яндекс", self.text())
        self.assertTrue(self.page.evaluate("Telegram.WebApp.BackButton.isVisible"))
        self.assertTrue(self.page.is_hidden("#tabbar"))
        self.shot("shell-about")
        self.press_back()
        self.wait_route("/feed")
        self.assertFalse(self.page.evaluate("Telegram.WebApp.BackButton.isVisible"))

    def test_unknown_route_lands_on_the_feed(self):
        self.open("/nowhere", expect="/feed")

    def test_telegram_launch_hash_lands_on_the_feed(self):
        self.open("tgWebAppData=abc&tgWebAppVersion=8.0", expect="/feed")

    def test_outside_telegram_the_app_draws_its_own_back_button(self):
        self.open("/about", tg=False)
        self.page.click("[data-action='back']")
        self.wait_route("/feed")

    def test_places_data_failure_offers_retry(self):
        state = {"fail": True}

        def venues(route):
            if state["fail"]:
                route.fulfill(status=500, body="no")
            else:
                route.continue_()

        self.context.route("**/data/venues.json", venues)
        self.seed_tips()
        self.page.goto(BASE + "#/feed")
        self.page.wait_for_selector("#retry")
        self.assertIn("Не удалось загрузить места", self.text())
        state["fail"] = False
        self.page.click("#retry")
        self.page.wait_for_selector("body[data-ready='1']")
        self.wait_route("/feed")

    def test_saved_data_failure_offers_retry_and_keeps_the_data(self):
        self.open("/feed")
        rid = self.ids_of_kind("restaurant", 1)
        self.set_cloud("r", {"rest": {"fire": rid, "ok": [], "miss": []}})
        self.page.add_init_script("window.__tgCloudReadBroken = true;")
        self.page.reload()
        self.page.wait_for_selector("#retry")
        self.assertIn("Не удалось загрузить твои данные", self.text())
        self.assertEqual(self.cloud("r")["rest"]["fire"], rid)
        self.page.evaluate("window.__tgCloudReadBroken = false")
        self.page.click("#retry")
        self.page.wait_for_selector("body[data-ready='1']")
        self.assertEqual(self.page.evaluate("id => window.zc.store.rating(id).place", rid[0]), 1)

    def test_a_failed_save_survives_the_next_launch(self):
        self.open("/feed")
        pid = self.place_id("Шербет", "Чистые пруды")
        self.page.evaluate("window.__tgCloudBroken = true")
        self.go("/rate/" + pid)
        self.page.click("[data-group='ok']")
        self.page.wait_for_selector("text=Готово, оценку запомнили")
        self.assertIn("Не удалось сохранить в Telegram", self.text(".toast"))
        self.page.reload()
        self.page.wait_for_selector("body[data-ready='1']")
        self.assertEqual(self.page.evaluate("id => window.zc.store.rating(id).group", pid), "ok")
        self.wait_cloud_rating(pid)

    def wait_cloud_rating(self, pid):
        self.assertEqual(self.cloud("r")["rest"]["ok"], [pid])
