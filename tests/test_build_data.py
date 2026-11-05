import json
import os
import subprocess
import sys
import unittest

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class BuildDataTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        subprocess.run([sys.executable, os.path.join(APP, "tools", "build_data.py")], check=True)
        with open(os.path.join(APP, "data", "venues.json"), encoding="utf-8") as fh:
            cls.venues = json.load(fh)
        with open(os.path.join(APP, "data", "stations.json"), encoding="utf-8") as fh:
            cls.stations = json.load(fh)

    def test_counts(self):
        self.assertEqual(self.venues["v"], 1)
        self.assertGreater(len(self.venues["rows"]), 12000)
        self.assertGreater(len(self.stations["rows"]), 250)

    def test_row_shape(self):
        for row in self.venues["rows"][:200]:
            self.assertEqual(len(row), 11)
            self.assertRegex(row[0], r"^[nwr]\d+$")
            self.assertIsInstance(row[6], int)
            self.assertLess(row[6], len(self.stations["rows"]))
            self.assertTrue(row[10] == "" or row[10].startswith("http"))

    def test_stations_sorted_with_hex_colours(self):
        names = [s[0] for s in self.stations["rows"]]
        self.assertEqual(names, sorted(names))
        for s in self.stations["rows"]:
            self.assertRegex(s[1], r"^#[0-9A-F]{6}$")

    def test_sherbet(self):
        st = [s[0] for s in self.stations["rows"]]
        rows = [r for r in self.venues["rows"] if r[1] == "Шербет" and st[r[6]] == "Чистые пруды"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0][8], "круглосуточно")
        self.assertIn("грузинская", rows[0][3])

    def test_hours_in_russian(self):
        st = [s[0] for s in self.stations["rows"]]
        izumi = [r for r in self.venues["rows"] if r[1] == "Izumi" and st[r[6]] == "Чистые пруды"][0]
        self.assertEqual(izumi[8], "Вс-Чт 11:00-00:00, Пт-Сб 11:00-05:00")


if __name__ == "__main__":
    unittest.main()
