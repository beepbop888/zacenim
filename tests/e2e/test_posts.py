import os

from tests.e2e.harness import APP, AppTest

PHOTO = os.path.join(APP, "img", "khinkali.jpg")
PHOTO_KEY = "11111111-2222-3333-4444-555555555555"


class PostsTest(AppTest):
    def test_feed_shows_demo_posts_about_real_places(self):
        self.open("/feed")
        self.assertIn("Демо: посты друзей и фото для примера", self.text())
        self.assertEqual(self.page.locator(".post").count(), 5)
        self.assertIn("Шербет", self.text())
        self.assertIn("Напиши первый пост", self.text())
        self.assertEqual(self.page.locator("[data-tour='feed']").count(), 1)
        self.page.wait_for_function(
            "() => [...document.querySelectorAll('.post-photo')].every(i => i.complete && i.naturalWidth > 0)")
        self.shot("feed")

    def test_like_and_comment_on_a_demo_post(self):
        self.open("/feed")
        self.assertEqual(self.page.locator("[data-like='d1']").inner_text(), "14")
        self.page.click("[data-like='d1']")
        self.page.wait_for_selector("[data-like='d1'][aria-pressed='true']")
        self.assertEqual(self.page.locator("[data-like='d1']").inner_text(), "15")
        self.assertEqual(self.cloud("l"), ["d1"])
        self.page.click("[data-post='d1'] a[href='#/post/d1']")
        self.wait_route("/post/d1")
        self.assertIn("Лимонад там правда лучший", self.text())
        self.page.fill("#comment", "Тоже хочу туда")
        self.page.press("#comment", "Enter")
        self.page.wait_for_selector("text=Тоже хочу туда")
        self.reload()
        self.assertIn("Тоже хочу туда", self.text())
        self.shot("post")

    def test_write_a_post_with_a_photo(self):
        self.open("/feed")
        self.page.click("[data-tour='compose-tab']")
        self.wait_route("/compose")
        publish = "[data-action='publish']"
        self.assertTrue(self.page.is_disabled(publish))
        self.page.fill("#pq", "шербет")
        self.page.click("[data-pick]:has-text('Шербет')")
        self.page.fill("#text", "Хинкали огонь <b>честно</b>")
        self.page.set_input_files("#photo", PHOTO)
        self.page.wait_for_selector(".photo-preview img")
        self.page.click("[data-aud='me']")
        self.shot("compose")
        self.page.click(publish)
        self.wait_route("/feed")
        upload = [c for c in self.api.calls if c["path"] == "/api/photos" and c["method"] == "POST"][0]
        self.assertEqual(upload["type"], "image/jpeg")
        self.assertLessEqual(len(upload["body"]), 300 * 1024)
        first = self.page.locator(".post").first
        self.assertIn("Хинкали огонь <b>честно</b>", first.inner_text())
        self.assertIn("только для тебя", first.inner_text())
        self.assertTrue(first.locator(".post-photo").get_attribute("src").endswith("/api/photos/" + PHOTO_KEY))
        self.reload()
        self.assertIn("Хинкали огонь", self.page.locator(".post").first.inner_text())
        self.assertNotIn("Напиши первый пост", self.text())

    def test_photo_upload_failure_keeps_the_text(self):
        self.api.fail["/api/photos"] = 500
        self.open("/feed")
        pid = self.place_id("Шербет", "Чистые пруды")
        self.go("/compose/" + pid)
        self.assertIn("Шербет", self.text("#place-box"))
        self.page.fill("#text", "Вкусно")
        self.page.set_input_files("#photo", PHOTO)
        self.page.click("[data-action='publish']")
        self.page.wait_for_selector("text=Не удалось загрузить фото")
        self.assertEqual(self.page.input_value("#text"), "Вкусно")
        self.page.click("[data-action='unphoto']")
        self.page.click("[data-action='publish']")
        self.wait_route("/feed")
        self.assertIn("Вкусно", self.page.locator(".post").first.inner_text())

    def test_write_a_post_right_after_rating(self):
        self.open("/feed")
        pid = self.place_id("Шербет", "Чистые пруды")
        self.go("/rate/" + pid)
        self.page.click("[data-group='miss']")
        self.page.click("[data-action='post']")
        self.wait_route("/compose/" + pid)
        self.assertIn("Шербет", self.text("#place-box"))

    def test_a_fresh_photo_that_is_not_ready_yet_is_tried_again(self):
        self.open("/feed")
        pid = self.place_id("Шербет", "Чистые пруды")
        self.set_cloud("p", [{"id": "p1", "at": 1, "text": "С фото", "v": pid, "aud": "all", "photo": PHOTO_KEY}])
        self.api.fail["/api/photos/"] = 404
        self.reload()
        self.page.wait_for_timeout(500)
        del self.api.fail["/api/photos/"]
        self.page.wait_for_function(
            "() => { const i = document.querySelector('[data-post=p1] .post-photo'); return i && i.complete && i.naturalWidth > 0; }",
            timeout=8000)
