import type { RawCourse } from "./api";
import { DAY } from "./format";

export interface Course {
  id: number;
  code: string;
  hasCode: boolean;
  fullname: string;
  /** What the interface shows: the student's nickname, or the course's own name. */
  name: string;
  start: number;
  end: number;
  current: boolean;
  older: boolean;
  byDefault: boolean;
  shown: boolean;
  color: number;
  pattern: number;
  grade: string | null;
  url: string;
}

export interface CoursePrefs {
  shown?: Record<number, boolean>;
  nick?: Record<number, string>;
  color?: Record<number, number>;
}

export const COLOR_COUNT = 8;
export const PATTERN_COUNT = 8;

/** "COMP2611-S1-2026" -> "COMP2611"; falls back to the short name. */
export function courseCode(shortname: string, fullname = ""): string | null {
  const m = /\b([A-Z]{3,4})\s?-?(\d{4}[A-Z]?)\b/.exec(`${shortname} ${fullname}`.toUpperCase());
  return m ? m[1] + m[2] : null;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Decide which enrolments are this semester's courses, dedupe repeat offerings,
 * and give each a colour and cover pattern.
 */
export function shapeCourses(raw: RawCourse[], site: string, prefs: CoursePrefs, grades: Record<number, string>, now: number): Course[] {
  const list = raw.map((c): Course => {
    const code = courseCode(c.shortname, c.fullname);
    const current = c.startdate <= now + 30 * DAY && (!c.enddate || c.enddate >= now - 14 * DAY) && !c.hidden;
    return {
      id: c.id,
      code: code || c.shortname || c.fullname,
      hasCode: !!code,
      fullname: c.fullname,
      name: c.fullname,
      start: c.startdate,
      end: c.enddate,
      current,
      older: false,
      byDefault: false,
      shown: false,
      color: 0,
      pattern: 0,
      grade: grades[c.id] ?? null,
      url: `${site}/course/view.php?id=${c.id}`,
    };
  });

  // several offerings of the same code: the newest is the real one
  const newest = new Map<string, Course>();
  for (const c of list) if (c.hasCode && (!newest.has(c.code) || c.start > newest.get(c.code)!.start)) newest.set(c.code, c);
  for (const c of list) {
    c.older = c.hasCode && newest.get(c.code) !== c;
    c.byDefault = c.hasCode && c.current && !c.older;
  }
  if (!list.some((c) => c.byDefault)) for (const c of list) c.byDefault = !c.older && (c.hasCode || c.current);

  list.sort((a, b) => Number(b.byDefault) - Number(a.byDefault) || a.code.localeCompare(b.code));
  let slot = 0;
  for (const c of list) {
    c.shown = prefs.shown && c.id in prefs.shown ? !!prefs.shown[c.id] : c.byDefault;
    const nick = prefs.nick?.[c.id]?.trim();
    if (nick) c.name = nick;
    c.color = prefs.color?.[c.id] ?? (c.shown ? slot++ % COLOR_COUNT : hash(c.code) % COLOR_COUNT);
    c.pattern = hash(c.code + c.id) % PATTERN_COUNT;
  }
  return list;
}
