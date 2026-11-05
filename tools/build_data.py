#!/usr/bin/env python3
"""Builds data/venues.json and data/stations.json for the app. Standard library only.

    python3 tools/build_data.py

Reads data/moscow_venues.csv and data/osm_moscow_stations_raw.json from the
Restaurant project (the folder above miniapp/). Data © OpenStreetMap contributors, ODbL.
"""
import csv
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
SRC = os.path.join(os.path.dirname(APP), "data")
OUT = os.path.join(APP, "data")

LINE_COLOURS = {"red": "#D6083B", "green": "#2DBE2C", "blue": "#0078BE", "lightblue": "#00BFFF",
                "brown": "#8D5B2D", "orange": "#ED9121", "violet": "#943E90", "purple": "#943E90",
                "yellow": "#FFD702", "grey": "#A1A2A3", "gray": "#A1A2A3", "lightgreen": "#B4D445"}

CUISINE_RU = {
    "coffee_shop": "кофейня", "coffee": "кофе", "burger": "бургеры", "pizza": "пицца", "kebab": "кебаб",
    "shawarma": "шаверма", "georgian": "грузинская", "italian": "итальянская", "russian": "русская",
    "chicken": "курица", "sushi": "суши", "japanese": "японская", "asian": "азиатская", "potato": "картошка",
    "vietnamese": "вьетнамская", "seafood": "морепродукты", "fish": "рыба", "regional": "местная",
    "sandwich": "сэндвичи", "crepe": "блины", "pancake": "блины", "cake": "торты", "uzbek": "узбекская",
    "international": "интернациональная", "steak_house": "стейки", "chinese": "китайская",
    "hot_dog": "хот-доги", "sausage": "колбаски", "tea": "чай", "turkish": "турецкая", "donut": "пончики",
    "korean": "корейская", "pie": "пироги", "breakfast": "завтраки", "ice_cream": "мороженое",
    "bubble_tea": "бабл-ти", "greek": "греческая", "indian": "индийская", "american": "американская",
    "european": "европейская", "ramen": "рамен", "noodle": "лапша", "grill": "гриль", "jewish": "еврейская",
    "french": "французская", "spanish": "испанская", "thai": "тайская", "mexican": "мексиканская",
    "lebanese": "ливанская", "armenian": "армянская", "azerbaijani": "азербайджанская",
    "caucasian": "кавказская", "oriental": "восточная", "arab": "арабская", "serbian": "сербская",
    "czech": "чешская", "argentinian": "аргентинская", "vegetarian": "вегетарианская", "vegan": "веганская",
    "pasta": "паста", "dumpling": "пельмени", "pelmeni": "пельмени", "wings": "крылья", "bakery": "выпечка",
    "dessert": "десерты", "brunch": "бранчи", "beer": "пиво", "wine": "вино", "cocktails": "коктейли",
}

DAYS = {"Mo": "Пн", "Tu": "Вт", "We": "Ср", "Th": "Чт", "Fr": "Пт", "Sa": "Сб", "Su": "Вс", "PH": "праздники"}


def colour(value):
    first_part = (value or "").split(";")[0].strip().lower()
    if re.fullmatch(r"#[0-9a-f]{6}", first_part):
        return first_part.upper()
    return LINE_COLOURS.get(first_part, "#A1A2A3")


def cuisine_ru(value):
    labels = []
    for tag in (value or "").split(";"):
        label = CUISINE_RU.get(tag.strip().lower())
        if label and label not in labels:
            labels.append(label)
    return ", ".join(labels)


def hours_ru(value):
    text = (value or "").strip()
    if not text:
        return ""
    if text == "24/7":
        return "круглосуточно"
    text = re.sub(r"\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b", lambda m: DAYS[m.group(1)], text)
    return text.replace(" off", " выходной").replace("; ", ", ").replace(";", ", ")


def short_id(osm_id):
    kind, num = osm_id.split(":")[1].split("/")
    return kind[0] + num


def first(value):
    return (value or "").split(";")[0].strip()


def website(value):
    url = first(value)
    if url and not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url


def main():
    with open(os.path.join(SRC, "osm_moscow_stations_raw.json"), encoding="utf-8") as fh:
        raw = json.load(fh)["elements"]
    stations, seen = [], set()
    for e in raw:
        tags = e.get("tags", {})
        if tags.get("station") != "subway" and tags.get("network") != "МЦК":
            continue
        name = tags.get("name")
        if not name or name in seen:
            continue
        seen.add(name)
        stations.append([name, colour(tags.get("colour")), round(e["lat"], 5), round(e["lon"], 5)])
    stations.sort(key=lambda s: s[0])
    index = {s[0]: i for i, s in enumerate(stations)}

    rows = []
    with open(os.path.join(SRC, "moscow_venues.csv"), encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            st = index.get(r["metro"])
            if st is None:
                continue
            rows.append([short_id(r["id"]), r["name"], r["kind"], cuisine_ru(r["cuisine"]),
                         round(float(r["lat"]), 5), round(float(r["lon"]), 5), st, int(r["metro_m"]),
                         hours_ru(r["opening_hours"]), first(r["phone"]), website(r["website"])])
    os.makedirs(OUT, exist_ok=True)
    for name, data in (("stations.json", stations), ("venues.json", rows)):
        with open(os.path.join(OUT, name), "w", encoding="utf-8") as fh:
            json.dump({"v": 1, "rows": data}, fh, ensure_ascii=False, separators=(",", ":"))
    print("stations: %d, venues: %d" % (len(stations), len(rows)))


if __name__ == "__main__":
    main()
