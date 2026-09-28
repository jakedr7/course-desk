/*
  React hooks over the Moodle API, cached per account. Components ask for what
  they need; the cache decides whether to show saved data and refresh it.
*/
import { createContext, useContext, useMemo } from "react";
import * as api from "./api";
import type { Transport } from "./moodle";
import { shapeCourses, type Course } from "./courses";
import { useQueries, useQuery } from "./query";
import type { Account, Prefs } from "./store";
import { DAY, nowSec } from "./format";

export interface Session {
  account: Account;
  t: Transport;
  prefs: Prefs;
}
export const SessionContext = createContext<Session | null>(null);
export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error("No session");
  return s;
}

const MIN = 60_000;

export function useCourses() {
  const { account, t, prefs } = useSession();
  const raw = useQuery("courses", () => api.getCourses(t, account.userid), 30 * MIN);
  const grades = useQuery("overview-grades", () => api.getOverviewGrades(t), 30 * MIN);
  const all = useMemo<Course[]>(
    () => (raw.data ? shapeCourses(raw.data, t.site, prefs, grades.data ?? {}, nowSec()) : []),
    [raw.data, grades.data, prefs, t.site],
  );
  const shown = useMemo(() => all.filter((c) => c.shown), [all]);
  const byId = useMemo(() => new Map(all.map((c) => [c.id, c])), [all]);
  return { all, shown, byId, loading: raw.loading, error: raw.error, refresh: raw.refresh };
}

export function useShownIds(): number[] {
  const { shown } = useCourses();
  return useMemo(() => shown.map((c) => c.id).sort((a, b) => a - b), [shown]);
}

export function useTodo() {
  const { t } = useSession();
  const { byId } = useCourses();
  const q = useQuery("todo", () => api.getTodo(t, nowSec()), 5 * MIN);
  const items = useMemo(
    () => (q.data ?? []).filter((e) => byId.get(e.course)?.shown).sort((a, b) => a.time - b.time),
    [q.data, byId],
  );
  return { ...q, items };
}

export function useContents(ids: number[]) {
  const { t } = useSession();
  return useQueries(ids.map((id) => `contents:${id}`), (k) => api.getContents(t, Number(k.split(":")[1])), 30 * MIN);
}
export function useCourseContents(id: number | null | undefined) {
  const { t } = useSession();
  return useQuery(id ? `contents:${id}` : null, () => api.getContents(t, id!), 30 * MIN);
}

export function useAssignments() {
  const { t } = useSession();
  const ids = useShownIds();
  return useQuery(ids.length ? `assign:${ids.join(",")}` : null, () => api.getAssignments(t, ids), 30 * MIN);
}
export function useQuizzes() {
  const { t } = useSession();
  const ids = useShownIds();
  return useQuery(ids.length ? `quiz:${ids.join(",")}` : null, () => api.getQuizzes(t, ids), 30 * MIN);
}
export function useAssignStatus(assignid: number | null) {
  const { t } = useSession();
  return useQuery(assignid ? `status:assign:${assignid}` : null, () => api.getAssignStatus(t, assignid!), 2 * MIN);
}

export function useAnnouncements() {
  const { t } = useSession();
  const ids = useShownIds();
  return useQuery(ids.length ? `news:${ids.join(",")}` : null, () => api.getAnnouncements(t, ids), 15 * MIN);
}

export function useNotices() {
  const { t, account } = useSession();
  return useQuery("notices", () => api.getNotices(t, account.userid), 5 * MIN);
}

export function useCalendar(from: number, to: number) {
  const { t } = useSession();
  const ids = useShownIds();
  return useQuery(ids.length ? `cal:${from}:${ids.join(",")}` : null, () => api.getCalendar(t, ids, from, to), 15 * MIN);
}

export function useCourseGrades(ids: number[]) {
  const { t, account } = useSession();
  return useQueries(ids.map((id) => `grades:${id}`), (k) => api.getCourseGrades(t, Number(k.split(":")[1]), account.userid), 15 * MIN);
}

/** Every file across the shown courses, with where it lives. */
export interface PlacedFile extends api.FileItem {
  course: number;
  section: string;
  module: string;
  cmid: number;
}
export function useAllFiles(): { files: PlacedFile[]; loading: boolean } {
  const ids = useShownIds();
  const res = useContents(ids);
  return useMemo(() => {
    const files: PlacedFile[] = [];
    let loading = false;
    for (const id of ids) {
      const r = res[`contents:${id}`];
      if (!r?.data) {
        if (r?.loading) loading = true;
        continue;
      }
      for (const s of r.data) for (const m of s.mods) for (const f of api.usefulFiles(m)) files.push({ ...f, course: id, section: s.name, module: m.name, cmid: m.id });
    }
    return { files: files.sort((a, b) => b.modified - a.modified), loading };
  }, [ids, res]);
}

export const RECENT = 7 * DAY;
