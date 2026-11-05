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
