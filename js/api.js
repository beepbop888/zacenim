// Calls to the server. Each request carries Telegram's initData, so the server knows who asks.
import { CONFIG } from "../config.js";
import { initData } from "./tg.js";

export class ApiError extends Error {
  constructor(status, message = "") {
    super(message || `HTTP ${status}`);
    this.status = status;
  }
}

export async function call(path, { method = "GET", body, raw = false, timeout = 10000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  const headers = { Authorization: `tma ${initData()}` };
  let payload;
  if (raw) {
    headers["Content-Type"] = body.type || "application/octet-stream";
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  try {
    const res = await fetch(CONFIG.API_BASE + path, { method, headers, body: payload, signal: ctrl.signal });
    if (!res.ok) throw new ApiError(res.status);
    return res.status === 204 ? null : await res.json();
  } catch (err) {
    throw err instanceof ApiError ? err : new ApiError(0, String(err));
  } finally {
    clearTimeout(timer);
  }
}

const q = encodeURIComponent;
export const getRating = (id) => call(`/api/rating?id=${q(id)}`);
export const putScores = (scores) => call("/api/scores", { method: "PUT", body: { scores } });
export const getBooking = (id) => call(`/api/booking?id=${q(id)}`);
export const listReminders = () => call("/api/reminders");
export const addReminder = (place, at) => call("/api/reminders", { method: "POST", body: { place, at } });
export const deleteReminder = (rid) => call(`/api/reminders/${q(rid)}`, { method: "DELETE" });
export const uploadPhoto = (blob) => call("/api/photos", { method: "POST", body: blob, raw: true, timeout: 30000 });
export const photoUrl = (key) => `${CONFIG.API_BASE}/api/photos/${q(key)}`;

export function errorText(err) {
  if (err?.status === 401) return "Открой «Заценим» заново из Telegram";
  return "Сервер не отвечает";
}
