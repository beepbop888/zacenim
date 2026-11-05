# Заценим

Демо Telegram Mini App: рейтинг ресторанов Москвы, «Хочу», поиск по метро, проверка онлайн-брони и напоминания от бота. Открывается из @zacenim_bot.

## Данные и лицензии

- `data/venues.json`, `data/stations.json`: © участники OpenStreetMap, лицензия ODbL 1.0 (https://opendatacommons.org/licenses/odbl/). Выгрузка 2026-10-04.
- Шрифты Lora и Onest: SIL Open Font License 1.1, тексты лицензий в `fonts/`.
- Фото в `img/` с Wikimedia Commons: хинкали, Sandra C, CC BY-SA 2.0; хачапури, Bestalex, CC0; пицца, Bex Walton, CC BY 2.0. Фото для примера, они не из этих заведений.
- Карта и рейтинги мест: 2ГИС.

## Локально

    python3 -m http.server 8765        # затем http://127.0.0.1:8765/
    node --test "tests/unit/*.test.mjs"
    python3 -m unittest discover -s tests -t . -v
