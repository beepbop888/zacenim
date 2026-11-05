from tests.e2e.harness import AppTest


class RateTest(AppTest):
    def begin(self, fire_count=0):
        self.open("/feed")
        self.pid = self.place_id("Шербет", "Чистые пруды")
        self.fire = self.ids_of_kind("restaurant", fire_count, skip=(self.pid,))
        if fire_count:
            self.set_cloud("r", {"rest": {"fire": self.fire, "ok": [], "miss": []}})
            self.reload()
        self.go("/place/" + self.pid)
        self.page.click("[data-tour='rate']")
        self.wait_route("/rate/" + self.pid)

    def test_first_place_needs_no_comparison(self):
        self.begin()
        self.assertTrue(self.page.is_hidden("#tabbar"))
        self.assertIn("Пойдёшь сюда ещё раз?", self.text())
        self.shot("rate-again")
        self.page.click("[data-group='ok']")
        self.page.wait_for_selector("text=Готово, оценку запомнили")
        self.assertIn("5,0", self.text())
        self.assertIn("1-е место из 1 в лиге «Рестораны»", self.text())
        self.assertIn("notify:success", self.tg_calls())
        self.assertEqual(self.cloud("r")["rest"]["ok"], [self.pid])
        self.wait_for(lambda: self.api.scores == {self.pid: 5.0})
        self.shot("rate-done")

    def test_scores_go_to_the_server_on_launch_and_after_each_change(self):
        self.open("/feed")
        a, b = self.ids_of_kind("restaurant", 2)
        self.set_cloud("r", {"rest": {"fire": [a], "ok": [], "miss": [b]}})
        self.reload()
        self.wait_for(lambda: self.api.scores == {a: 8.4, b: 1.7})
        sent = len([c for c in self.api.calls if c["path"] == "/api/scores"])
        self.reload()
        self.page.wait_for_timeout(500)
        self.assertEqual(len([c for c in self.api.calls if c["path"] == "/api/scores"]), sent)
        self.page.evaluate("id => window.zc.store.unrate(id)", b)
        self.wait_for(lambda: self.api.scores == {a: 8.4})

    def test_better_than_all_seven_takes_three_comparisons(self):
        self.begin(fire_count=7)
        self.page.click("[data-group='fire']")
        for k in (1, 2, 3):
            self.page.wait_for_selector("text=Сравнение %d из 3" % k)
            if k == 1:
                self.shot("rate-compare")
            self.page.click("[data-answer='better']")
        self.page.wait_for_selector("text=Готово, оценку запомнили")
        self.assertIn("9,8", self.text())
        self.assertIn("1-е место из 8", self.text())
        self.assertEqual(self.cloud("r")["rest"]["fire"], [self.pid] + self.fire)
        self.assertGreaterEqual(self.tg_calls().count("impact:light"), 4)
        self.page.click("[data-action='back']")
        self.wait_route("/place/" + self.pid)
        self.assertIn("1-е место из 8", self.text())
        self.assertIn("Оценить заново", self.text())

    def test_too_hard_to_choose_lands_right_after(self):
        self.begin(fire_count=3)
        self.page.click("[data-group='fire']")
        self.page.wait_for_selector("text=Сравнение 1 из 2")
        self.page.click("[data-answer='same']")
        self.page.wait_for_selector("text=Готово, оценку запомнили")
        self.assertEqual(self.cloud("r")["rest"]["fire"], self.fire[:2] + [self.pid] + self.fire[2:])
        self.assertIn("7,9", self.text())
        self.assertIn("3-е место из 4", self.text())

    def test_rating_again_keeps_one_entry_and_survives_reload(self):
        self.begin()
        self.page.click("[data-group='ok']")
        self.page.wait_for_selector("text=Готово, оценку запомнили")
        self.page.click("[data-action='back']")
        self.wait_route("/place/" + self.pid)
        self.page.click("[data-tour='rate']")
        self.page.click("[data-group='fire']")
        self.page.wait_for_selector("text=Готово, оценку запомнили")
        r = self.cloud("r")["rest"]
        self.assertEqual((r["fire"], r["ok"]), ([self.pid], []))
        self.go("/place/" + self.pid)
        self.reload()
        self.assertIn("8,4", self.text())
