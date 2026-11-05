from tests.e2e.harness import BASE, AppTest

SPOT_COVERS_TARGET = """() => {
    const spot = document.querySelector('.tour-spot');
    const s = spot.getBoundingClientRect();
    const t = document.querySelector(spot.dataset.target).getBoundingClientRect();
    return s.left <= t.left + 1 && s.top <= t.top + 1 && s.right >= t.right - 1 && s.bottom >= t.bottom - 1;
}"""


class TourTest(AppTest):
    def test_first_launch_offers_tips_and_skip_is_remembered(self):
        self.open("/feed", tips_done=False)
        self.page.wait_for_selector(".tour-start")
        self.assertIn("Привет, Аня! Заценим?", self.text(".tour"))
        self.shot("tour-start")
        self.page.click("[data-tour-action='skip']")
        self.assertEqual(self.page.locator(".tour").count(), 0)
        self.page.wait_for_function("() => localStorage.getItem('tgcs_tips_0') === 'true'")
        self.reload()
        self.assertEqual(self.page.locator(".tour").count(), 0)

    def test_nine_tips_each_point_at_their_target(self):
        self.open("/feed", tips_done=False)
        self.page.click("[data-tour-action='next']")
        for k in range(1, 10):
            self.page.wait_for_selector("text=Подсказка %d из 9" % k)
            self.page.wait_for_function(SPOT_COVERS_TARGET, timeout=2000)
            self.shot("tour-%d" % k)
            self.page.click("[data-tour-action='next']")
        self.page.wait_for_function("() => !document.querySelector('.tour')")
        self.wait_route("/feed")
        self.page.wait_for_function("() => localStorage.getItem('tgcs_tips_0') === 'true'")

    def test_spotlight_follows_its_target_when_the_page_shifts(self):
        # Reminders and «У остальных» arrive after the tip is drawn and push the target down.
        self.open("/feed", tips_done=False)
        self.page.click("[data-tour-action='next']")
        self.page.wait_for_selector("text=Подсказка 1 из 9")
        self.page.click("[data-tour-action='next']")
        self.page.wait_for_selector("text=Подсказка 2 из 9")
        self.page.wait_for_function(SPOT_COVERS_TARGET, timeout=2000)
        self.page.evaluate("() => document.querySelector('#screen .view').prepend(Object.assign("
                           "document.createElement('div'), {style: 'height: 120px'}))")
        self.page.wait_for_function(SPOT_COVERS_TARGET, timeout=2000)

    def test_first_tip_leaves_the_post_header_visible(self):
        self.open("/feed", tips_done=False)
        self.page.click("[data-tour-action='next']")
        self.page.wait_for_selector("text=Подсказка 1 из 9")
        self.page.wait_for_function(SPOT_COVERS_TARGET, timeout=2000)
        card = self.page.locator(".tour-card").bounding_box()
        head = self.page.locator("[data-tour='feed'] .post-head").bounding_box()
        self.assertTrue(card["y"] >= head["y"] + head["height"] or card["y"] + card["height"] <= head["y"], (card, head))

    def test_about_reopens_the_tips(self):
        self.open("/about")
        self.page.click("[data-action='tour']")
        self.page.wait_for_selector(".tour-start")

    def test_a_link_from_the_bot_skips_the_tips(self):
        self.open("/feed", tips_done=False)
        pid = self.place_id("Шербет", "Чистые пруды")
        self.page.goto(BASE + "?place=" + pid)
        self.page.wait_for_selector("body[data-ready='1']")
        self.wait_route("/place/" + pid)
        self.page.wait_for_timeout(300)
        self.assertEqual(self.page.locator(".tour").count(), 0)
        self.assertIsNone(self.page.evaluate("localStorage.getItem('tgcs_tips_0')"))
