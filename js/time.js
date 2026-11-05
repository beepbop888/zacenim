// Moscow time. Moscow is UTC+3 all year, so the phone's own time zone never matters.
const MSK = 3 * 3600 * 1000;
const DAY = 86400000;
const SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const ON_DAY = ["воскресенье", "понедельник", "вторник", "среду", "четверг", "пятницу", "субботу"];
const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

export const TIMES = ["12:00", "13:00", "14:00", "18:00", "19:00", "19:30", "20:00", "21:00"];

export function mskParts(ms) {
  const d = new Date(ms + MSK);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), wd: d.getUTCDay(), hh: d.getUTCHours(), mm: d.getUTCMinutes() };
}

export const mskToUtc = (y, m, d, hh, mm) => Date.UTC(y, m, d, hh, mm) - MSK;

export function dayOptions(now, count = 7) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const p = mskParts(now + i * DAY);
    const label = i === 0 ? "Сегодня" : i === 1 ? "Завтра" : `${SHORT[p.wd]}, ${p.d}`;
    out.push({ label, y: p.y, m: p.m, d: p.d });
  }
  return out;
}

export function whenText(ms, now = Date.now()) {
  const p = mskParts(ms);
  const t = `${String(p.hh).padStart(2, "0")}:${String(p.mm).padStart(2, "0")}`;
  const same = (a, b) => a.y === b.y && a.m === b.m && a.d === b.d;
  if (same(p, mskParts(now))) return `сегодня в ${t}`;
  if (same(p, mskParts(now + DAY))) return `завтра в ${t}`;
  return `${p.wd === 2 ? "во" : "в"} ${ON_DAY[p.wd]}, ${p.d} ${MONTHS[p.m]}, в ${t}`;
}
