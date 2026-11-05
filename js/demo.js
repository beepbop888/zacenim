// Demo friends, posts and comments for the investor demo. The places are real and looked up by
// name and station; the photos are illustrative (Wikimedia Commons, see README).
export const FRIENDS = { anya: "Аня", timur: "Тимур", liza: "Лиза", mark: "Марк" };

export const DEMO_POSTS = [
  { id: "d1", who: "anya", ago: "2 ч", place: ["Шербет", "Чистые пруды"], score: 9.1, likes: 14, photo: "img/khinkali.jpg",
    text: "Хинкали с бараниной и лимонад с тархуном. Открыты круглосуточно, после кино самое то." },
  { id: "d2", who: "timur", ago: "5 ч", place: ["Probka", "Трубная"], score: 8.6, likes: 9, photo: "img/pizza.jpg",
    text: "Пицца на тонком тесте и очень внимательный сервис. Стол лучше бронировать заранее." },
  { id: "d3", who: "liza", ago: "вчера", place: ["Хачапури и вино", "Трубная"], score: 7.4, likes: 6, photo: "img/khachapuri.jpg",
    text: "Аджарский хачапури огромный, берите один на двоих. Вино по бокалам недорогое." },
  { id: "d4", who: "mark", ago: "вчера", place: ["Высота 5642", "Китай-город"], score: 6.2, likes: 3, photo: null,
    text: "Красиво, но горячее ждали сорок минут. Один раз сходить можно." },
  { id: "d5", who: "anya", ago: "2 дня", place: ["Black Milk", "Чистые пруды"], score: 8.0, likes: 11, photo: null,
    text: "Флэт уайт и сырники на завтрак. Тихо, можно поработать с ноутбуком." },
];

export const DEMO_COMMENTS = {
  d1: [
    { who: "timur", ago: "1 ч", text: "Лимонад там правда лучший в районе." },
    { who: "liza", ago: "40 мин", text: "Сохранила в «Хочу»!" },
  ],
  d2: [{ who: "anya", ago: "3 ч", text: "А какую пиццу брали?" }],
  d4: [{ who: "timur", ago: "вчера", text: "Зато вид отличный." }],
};
