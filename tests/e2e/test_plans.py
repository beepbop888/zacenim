import json
from datetime import datetime, timedelta, timezone

from tests.e2e.harness import AppTest


def tomorrow_at_moscow(hh, mm):
    msk = datetime.now(timezone.utc) + timedelta(hours=3)
    day = (msk + timedelta(days=1)).date()
    moscow_midnight_utc = datetime(day.year, day.month, day.day, tzinfo=timezone.utc) - timedelta(hours=3)
    return int((moscow_midnight_utc + timedelta(hours=hh, minutes=mm)).timestamp() * 1000)


class RemindTest(AppTest):
    timezone = "America/New_York"  # the phone is far from Moscow; reminders must still use Moscow time

    def open_remind(self):
        self.open("/feed")
        self.pid = self.place_id("Шербет", "Чистые пруды")
        self.api.place_names[self.pid] = "Шербет"
        self.go("/remind/" + self.pid)

    def test_tomorrow_at_19_is_moscow_time(self):
        self.open_remind()
        self.assertIn("Время московское", self.text())
        self.page.click("[data-day='1']")
        self.page.click("[data-time='19:00']")
        self.shot("remind")
        self.page.click("[data-action='save']")
        self.page.wait_for_selector("text=Напомним завтра в 19:00")
        self.assertIn("requestWriteAccess", self.tg_calls())
        post = [c for c in self.api.calls if c["path"] == "/api/reminders" and c["method"] == "POST"][0]
        self.assertEqual(json.loads(post["body"]), {"place": self.pid, "at": tomorrow_at_moscow(19, 0)})
        self.shot("remind-done")

    def test_refused_write_access_sends_nothing(self):
        self.open_remind()
        self.page.evaluate("window.__tgWriteAllowed = false")
        self.page.click("[data-day='1']")
        self.page.click("[data-action='save']")
        self.page.wait_for_selector("text=Без разрешения бот не сможет написать")
        self.assertEqual([c for c in self.api.calls if c["method"] == "POST"], [])

    def test_fifty_reminders_is_the_limit(self):
        self.api.fail["/api/reminders"] = 429
        self.open_remind()
        self.page.click("[data-day='1']")
        self.page.click("[data-action='save']")
        self.page.wait_for_selector("text=Уже 50 напоминаний")


class PlansTest(AppTest):
    def test_lists_and_cancels_reminders(self):
        self.open("/feed")
        pid = self.place_id("Шербет", "Чистые пруды")
        self.api.reminders = [{"id": "r1", "place": pid, "name": "Шербет", "at": tomorrow_at_moscow(19, 30)}]
        self.go("/plans")
        self.page.wait_for_selector("[data-cancel='r1']")
        self.assertIn("Завтра в 19:30", self.text())
        self.shot("plans")
        self.page.click("[data-cancel='r1']")
        self.page.wait_for_selector("text=Пока пусто")
        self.assertTrue(any(c["method"] == "DELETE" and c["path"] == "/api/reminders/r1" for c in self.api.calls))

    def test_an_expired_session_says_reopen_from_telegram(self):
        self.api.fail["/api/reminders"] = 401
        self.open("/plans")
        self.page.wait_for_selector("text=Открой «Заценим» заново из Telegram")
        self.assertNotIn("Сервер не отвечает", self.text())

    def test_outside_telegram_explains_where_reminders_come_from(self):
        self.open("/plans", tg=False)
        self.assertIn("Напоминания приходят от бота", self.text())

    def test_group_and_chat_demo_lead_to_booking(self):
        self.open("/plans")
        self.page.click("[data-tour='group']")
        self.wait_route("/group")
        self.assertIn("Куда идём?", self.text())
        self.assertIn("3 голоса", self.text())
        self.shot("group")
        self.page.click("a[href='#/chat']")
        self.wait_route("/chat")
        self.assertIn("Сейчас заценим", self.text())
        self.shot("chat")
        self.page.click(".chat a[href^='#/book/']")
        self.page.wait_for_function("() => document.body.dataset.route.startsWith('/book/')")
