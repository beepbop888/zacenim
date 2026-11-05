from tests.e2e.harness import AppTest


class BookTest(AppTest):
    def open_place(self, name, station):
        self.open("/feed")
        self.pid = self.place_id(name, station)
        self.go("/book/" + self.pid)

    def test_no_website_means_no_online_booking(self):
        self.open_place("Twins Garden", "Чеховская")
        self.assertIn("У этого ресторана пока нет онлайн-брони", self.text())
        self.assertIn("Позвони, чтобы забронировать.", self.text())
        self.assertNotIn("сайт", self.text().lower())
        tel = self.page.get_attribute("a[href^='tel:']", "href")
        self.assertRegex(tel, r"^tel:\+?\d+$")
        self.assertEqual([c for c in self.api.calls if c["path"] == "/api/booking"], [])
        self.shot("book-none")

    def test_known_booking_system_opens_in_telegram(self):
        self.api.booking = {"status": "found", "url": "https://remarked.ru/r/123", "system": "Remarked"}
        self.open_place("Шербет", "Чистые пруды")
        self.page.wait_for_selector("text=Есть онлайн-бронь")
        self.assertIn("(Remarked)", self.text())
        self.shot("book-found")
        self.page.click("[data-action='open']")
        self.assertIn("openLink:https://remarked.ru/r/123", self.tg_calls())

    def test_website_without_booking_offers_site_and_call(self):
        self.open_place("Шербет", "Чистые пруды")
        self.page.wait_for_selector("text=пока нет онлайн-брони")
        site = self.page.evaluate("id => window.zc.data.venue(id)[10]", self.pid)
        self.page.click("[data-action='site']")
        self.assertIn("openLink:" + site, self.tg_calls())

    def test_server_error_offers_retry(self):
        self.api.fail["/api/booking"] = 500
        self.open_place("Шербет", "Чистые пруды")
        self.page.wait_for_selector("text=Сервер не отвечает")
        del self.api.fail["/api/booking"]
        self.api.booking = {"status": "found", "url": "https://cafe.example/booking", "system": None}
        self.page.click("[data-action='retry']")
        self.page.wait_for_selector("text=Есть онлайн-бронь")

    def test_a_non_web_address_is_ignored(self):
        self.api.booking = {"status": "found", "url": "javascript:alert(1)", "system": None}
        self.open_place("Шербет", "Чистые пруды")
        self.page.wait_for_selector("text=пока нет онлайн-брони")
