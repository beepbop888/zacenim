// Formatting helpers. Pure functions.

export const fmtScore = (x) => (Math.round(x * 10 + 1e-9) / 10).toFixed(1).replace(".", ",");
export const walkMin = (m) => Math.max(1, Math.round(m / 80));
export const scoreClass = (x) => (x >= 6.7 ? "good" : x >= 3.4 ? "mid" : "bad");

export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}

export const KIND_RU = {
  restaurant: "Ресторан", cafe: "Кафе", bar: "Бар", pub: "Паб", fast_food: "Фастфуд",
  food_court: "Фудкорт", ice_cream: "Мороженое", biergarten: "Пивной сад",
};

const MONTHS_SHORT = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

export function ago(ms, now = Date.now()) {
  const min = Math.floor((now - ms) / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин`;
  if (min < 24 * 60) return `${Math.floor(min / 60)} ч`;
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}
