export const DAY = 86400;
export const nowSec = () => Math.floor(Date.now() / 1000);
export const toDate = (t: number) => new Date(t * 1000);

const fmt = {
  dayLong: new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }),
  dayShort: new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" }),
  weekday: new Intl.DateTimeFormat(undefined, { weekday: "long" }),
  wk: new Intl.DateTimeFormat(undefined, { weekday: "short" }),
  wkNarrow: new Intl.DateTimeFormat(undefined, { weekday: "narrow" }),
  time: new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }),
  date: new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }),
  dateYear: new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }),
  month: new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }),
};

export const timeOf = (t: number) => fmt.time.format(toDate(t));
export const dateOf = (t: number) => fmt.date.format(toDate(t));
export const weekdayShort = (d: Date) => fmt.wk.format(d);
export const weekdayNarrow = (d: Date) => fmt.wkNarrow.format(d);
export const monthTitle = (d: Date) => fmt.month.format(d);
export const dayLong = (d: Date) => fmt.dayLong.format(d);

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
/** Whole calendar days from today to t (0 today, 1 tomorrow, -1 yesterday). */
export function dayDiff(t: number, now = Date.now()): number {
  return Math.round((startOfDay(toDate(t)).getTime() - startOfDay(new Date(now)).getTime()) / 864e5);
}
export function dayKey(t: number): string {
  const d = toDate(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dayLabel(t: number, now = Date.now()): string {
  const n = dayDiff(t, now);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  return fmt.dayLong.format(toDate(t));
}

/** "today at 4:00 PM", "Thu 1 Oct at 2:00 PM" */
export function whenLabel(t: number, now = Date.now()): string {
  const n = dayDiff(t, now);
  const day = n === 0 ? "today" : n === 1 ? "tomorrow" : n === -1 ? "yesterday" : Math.abs(n) < 7 ? fmt.dayShort.format(toDate(t)) : fmt.date.format(toDate(t));
  return `${day} at ${timeOf(t)}`;
}

export function ago(t: number, now = nowSec()): string {
  const s = now - t;
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < DAY && dayDiff(t, now * 1000) === 0) return `${Math.floor(s / 3600)} h ago`;
  if (dayDiff(t, now * 1000) === -1) return "yesterday";
  if (s < 7 * DAY) return fmt.wk.format(toDate(t));
  return s > 300 * DAY ? fmt.dateYear.format(toDate(t)) : fmt.date.format(toDate(t));
}

export type Part = [number, string];
/** Countdown in the two most useful units: [[1,"day"],[15,"hours"]] */
export function countdown(secs: number): Part[] {
  const out: Part[] = [];
  const unit = (n: number, one: string, many: string): Part => [n, n === 1 ? one : many];
  if (secs >= DAY) {
    const d = Math.floor(secs / DAY);
    const h = Math.floor((secs % DAY) / 3600);
    out.push(unit(d, "day", "days"));
    if (d < 7 && h) out.push(unit(h, "hour", "hours"));
  } else if (secs >= 3600) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    out.push(unit(h, "hour", "hours"));
    if (m) out.push([m, "min"]);
  } else {
    out.push(unit(Math.max(1, Math.floor(secs / 60)), "minute", "minutes"));
  }
  return out;
}

export function fileSize(b: number): string {
  if (!b) return "";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = b;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${i ? n.toFixed(n < 10 ? 1 : 0) : n} ${u[i]}`;
}

export const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

export function greeting(d = new Date()): string {
  const h = d.getHours();
  return h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0][0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** Pull a number out of Moodle's formatted grades ("72.50", "81.00 %", "B+ (78.00 %)"). */
export function gradePercent(formatted: string | null | undefined): number | null {
  if (!formatted) return null;
  const pct = /(-?\d+(?:\.\d+)?)\s*%/.exec(formatted);
  if (pct) return clamp(parseFloat(pct[1]));
  return null;
}
const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function extOf(name: string): string {
  const m = /\.([a-z0-9]{1,6})$/i.exec(name || "");
  return m ? m[1].toLowerCase() : "";
}
