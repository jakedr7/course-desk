/*
  Typed reads from Moodle's mobile web service, shaped for the interface.
  Every function here works with the standard "Moodle mobile web service" key.
*/
import type { Transport } from "./moodle";
import { DAY, extOf } from "./format";

// ---------- shapes ----------
export interface SiteInfo {
  userid: number;
  fullname: string;
  firstname: string;
  sitename: string;
}
export interface RawCourse {
  id: number;
  shortname: string;
  fullname: string;
  startdate: number;
  enddate: number;
  hidden: boolean;
}
export interface Todo {
  id: number;
  name: string;
  course: number;
  time: number;
  url: string | null;
  module: string;
  instance: number;
  overdue: boolean;
  action: string | null;
}
export interface FileItem {
  name: string;
  size: number;
  modified: number;
  url: string;
  mimetype: string;
  path: string;
}
export interface Mod {
  id: number;
  instance: number;
  modname: string;
  name: string;
  url: string | null;
  description: string;
  dates: { label: string; time: number }[];
  files: FileItem[];
  visible: boolean;
  completed: boolean | null;
}
export interface Section {
  id: number;
  num: number;
  name: string;
  summary: string;
  mods: Mod[];
}
export interface Announcement {
  id: number;
  course: number;
  subject: string;
  message: string;
  author: string;
  time: number;
  pinned: boolean;
  url: string;
}
export interface Notice {
  id: number;
  subject: string;
  text: string;
  html: string;
  time: number;
  read: boolean;
  url: string | null;
  component: string;
}
export interface CalEvent {
  id: number;
  name: string;
  course: number;
  type: string;
  module: string;
  instance: number;
  start: number;
  duration: number;
  url: string | null;
}
export interface GradeRow {
  id: number;
  name: string;
  type: string;
  module: string;
  cmid: number | null;
  grade: string;
  raw: number | null;
  max: number | null;
  range: string;
  percent: string;
  weight: string;
  feedback: string;
  graded: number | null;
  depth: number;
}
export interface Assignment {
  id: number;
  cmid: number;
  course: number;
  name: string;
  due: number;
  cutoff: number;
  opens: number;
  intro: string;
  files: FileItem[];
}
export interface Quiz {
  id: number;
  cmid: number;
  course: number;
  name: string;
  opens: number;
  closes: number;
  timelimit: number;
  attempts: number;
  intro: string;
}
export interface AssignStatus {
  status: "submitted" | "draft" | "new" | "reopened" | "none";
  submittedAt: number | null;
  graded: boolean;
  grade: string | null;
  feedback: string;
}

// ---------- helpers ----------
const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) : 0) || 0;
const str = (v: unknown) => (v == null ? "" : String(v));
const arr = <T = Record<string, unknown>>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
// Moodle responses are loosely typed JSON; every field is checked as it is read.
type R = Record<string, any>;

function files(list: unknown, path = ""): FileItem[] {
  return arr<R>(list)
    .filter((f) => !f.type || f.type === "file")
    .map((f) => ({
      name: str(f.filename),
      size: num(f.filesize),
      modified: num(f.timemodified),
      url: str(f.fileurl),
      mimetype: str(f.mimetype),
      path: str(f.filepath || path),
    }));
}

// ---------- calls ----------
export async function getSite(t: Transport): Promise<SiteInfo> {
  const r = await t.call<R>("core_webservice_get_site_info");
  return { userid: num(r.userid), fullname: str(r.fullname), firstname: str(r.firstname), sitename: str(r.sitename) || "Moodle" };
}

export async function getCourses(t: Transport, userid: number): Promise<RawCourse[]> {
  const r = await t.call<R[]>("core_enrol_get_users_courses", { userid });
  return arr<R>(r).map((c) => ({
    id: num(c.id),
    shortname: str(c.shortname),
    fullname: str(c.fullname || c.displayname || c.shortname),
    startdate: num(c.startdate),
    enddate: num(c.enddate),
    hidden: !!c.hidden || c.visible === 0,
  }));
}

export async function getTodo(t: Transport, now: number): Promise<Todo[]> {
  const r = await t.call<R>("core_calendar_get_action_events_by_timesort", { timesortfrom: now - 14 * DAY, limitnum: 50 });
  return arr<R>(r.events)
    .filter((e) => e && e.course)
    .map((e) => ({
      id: num(e.id),
      name: str(e.activityname || e.name).replace(/\s+is due$/i, ""),
      course: num(e.course.id),
      time: num(e.timesort),
      url: str(e.url) || null,
      module: str(e.modulename),
      instance: num(e.instance),
      overdue: !!e.overdue || num(e.timesort) < now,
      action: e.action && e.action.actionable !== false ? str(e.action.name) || null : null,
    }));
}

export async function getOverviewGrades(t: Transport): Promise<Record<number, string>> {
  const r = await t.call<R>("gradereport_overview_get_course_grades");
  const out: Record<number, string> = {};
  for (const g of arr<R>(r.grades)) if (g.grade && g.grade !== "-") out[num(g.courseid)] = str(g.grade);
  return out;
}

export async function getContents(t: Transport, courseid: number): Promise<Section[]> {
  const r = await t.call<R[]>("core_course_get_contents", { courseid });
  return arr<R>(r).map((s) => ({
    id: num(s.id),
    num: num(s.section),
    name: str(s.name) || (num(s.section) === 0 ? "General" : `Section ${num(s.section)}`),
    summary: str(s.summary),
    mods: arr<R>(s.modules).map((m) => ({
      id: num(m.id),
      instance: num(m.instance),
      modname: str(m.modname),
      name: str(m.name),
      url: str(m.url) || null,
      description: str(m.description),
      dates: arr<R>(m.dates).map((d) => ({ label: str(d.label), time: num(d.timestamp) })).filter((d) => d.time),
      files: files(m.contents),
      visible: m.visible !== 0 && m.uservisible !== false,
      completed: m.completiondata ? num(m.completiondata.state) > 0 : null,
    })),
  }));
}

export async function getAssignments(t: Transport, courseids: number[]): Promise<Assignment[]> {
  if (!courseids.length) return [];
  const r = await t.call<R>("mod_assign_get_assignments", { courseids });
  return arr<R>(r.courses).flatMap((c) =>
    arr<R>(c.assignments).map((a) => ({
      id: num(a.id),
      cmid: num(a.cmid),
      course: num(a.course || c.id),
      name: str(a.name),
      due: num(a.duedate),
      cutoff: num(a.cutoffdate),
      opens: num(a.allowsubmissionsfromdate),
      intro: str(a.intro),
      files: files(a.introattachments),
    })),
  );
}

export async function getQuizzes(t: Transport, courseids: number[]): Promise<Quiz[]> {
  if (!courseids.length) return [];
  const r = await t.call<R>("mod_quiz_get_quizzes_by_courses", { courseids });
  return arr<R>(r.quizzes).map((q) => ({
    id: num(q.id),
    cmid: num(q.coursemodule),
    course: num(q.course),
    name: str(q.name),
    opens: num(q.timeopen),
    closes: num(q.timeclose),
    timelimit: num(q.timelimit),
    attempts: num(q.attempts),
    intro: str(q.intro),
  }));
}

export async function getAssignStatus(t: Transport, assignid: number): Promise<AssignStatus> {
  const r = await t.call<R>("mod_assign_get_submission_status", { assignid });
  const sub = r.lastattempt?.submission || r.lastattempt?.teamsubmission;
  const raw = str(sub?.status);
  const status: AssignStatus["status"] = raw === "submitted" || raw === "draft" || raw === "new" || raw === "reopened" ? raw : "none";
  const fb = r.feedback;
  const comments = arr<R>(fb?.plugins).find((p) => p.type === "comments");
  const text = arr<R>(comments?.editorfields)[0]?.text;
  return {
    status,
    submittedAt: status === "submitted" ? num(sub?.timemodified) || null : null,
    graded: !!fb?.gradefordisplay,
    grade: fb?.gradefordisplay ? str(fb.gradefordisplay) : null,
    feedback: str(text),
  };
}

export async function getAnnouncements(t: Transport, courseids: number[]): Promise<Announcement[]> {
  if (!courseids.length) return [];
  const forums = arr<R>(await t.call<R[]>("mod_forum_get_forums_by_courses", { courseids })).filter((f) => f.type === "news");
  const lists = await Promise.allSettled(
    forums.map((f) => t.call<R>("mod_forum_get_forum_discussions", { forumid: num(f.id), page: 0, perpage: 8 })),
  );
  const out: Announcement[] = [];
  lists.forEach((res, i) => {
    if (res.status !== "fulfilled") return;
    const f = forums[i];
    for (const d of arr<R>(res.value.discussions)) {
      out.push({
        id: num(d.discussion || d.id),
        course: num(f.course),
        subject: str(d.subject || d.name),
        message: str(d.message),
        author: str(d.userfullname),
        time: num(d.created || d.timemodified || d.modified),
        pinned: !!d.pinned,
        url: `${t.site}/mod/forum/discuss.php?d=${num(d.discussion || d.id)}`,
      });
    }
  });
  return out.sort((a, b) => b.time - a.time);
}

export async function getNotices(t: Transport, userid: number): Promise<{ items: Notice[]; unread: number }> {
  const r = await t.call<R>("message_popup_get_popup_notifications", { useridto: userid, newestfirst: 1, limit: 40, offset: 0 });
  const items = arr<R>(r.notifications).map((n) => ({
    id: num(n.id),
    subject: str(n.subject || n.shortenedsubject),
    text: str(n.smallmessage || n.subject),
    html: str(n.fullmessagehtml),
    time: num(n.timecreated),
    read: !!n.read,
    url: str(n.contexturl) || null,
    component: str(n.component),
  }));
  return { items, unread: num(r.unreadcount) || items.filter((n) => !n.read).length };
}

export async function getCalendar(t: Transport, courseids: number[], from: number, to: number): Promise<CalEvent[]> {
  const r = await t.call<R>("core_calendar_get_calendar_events", {
    events: { courseids },
    options: { userevents: 1, siteevents: 1, timestart: from, timeend: to },
  });
  return arr<R>(r.events).map((e) => ({
    id: num(e.id),
    name: str(e.name),
    course: num(e.courseid),
    type: str(e.eventtype),
    module: str(e.modulename),
    instance: num(e.instance),
    start: num(e.timestart),
    duration: num(e.timeduration),
    url: str(e.url) || null,
  }));
}

export async function getCourseGrades(t: Transport, courseid: number, userid: number): Promise<GradeRow[]> {
  const r = await t.call<R>("gradereport_user_get_grade_items", { courseid, userid });
  const items = arr<R>(arr<R>(r.usergrades)[0]?.gradeitems);
  return items.map((g) => ({
    id: num(g.id),
    name: str(g.itemname) || (g.itemtype === "course" ? "Course total" : "Category total"),
    type: str(g.itemtype),
    module: str(g.itemmodule),
    cmid: g.cmid ? num(g.cmid) : null,
    grade: str(g.gradeformatted),
    raw: g.graderaw == null ? null : num(g.graderaw),
    max: g.grademax == null ? null : num(g.grademax),
    range: str(g.rangeformatted),
    percent: str(g.percentageformatted),
    weight: str(g.weightformatted),
    feedback: str(g.feedback),
    graded: g.gradedategraded ? num(g.gradedategraded) : null,
    depth: num(g.depth) || (g.itemtype === "course" ? 1 : 2),
  }));
}

// ---------- noise filter (same rules as the PC sync) ----------
const SKIP_EXT = new Set(["webp"]);
const SKIP_NAMES = new Set([
  "index.html",
  "welcome.png",
  "imsmanifest.xml",
  "extracted_text.json",
  "course.js",
  "course.css",
  "assessment regulations 2020-2021.pdf",
]);
const PACKAGE_JUNK = new Set(["html", "htm", "js", "css", "xml", "json", "xsd", "dtd", "woff", "woff2", "ttf", "eot", "svg", "map", "swf"]);

export function usefulFiles(mod: Mod): FileItem[] {
  return mod.files.filter((f) => {
    const ext = extOf(f.name);
    if (SKIP_EXT.has(ext) || SKIP_NAMES.has(f.name.toLowerCase())) return false;
    if ((mod.modname === "scorm" || mod.modname === "imscp") && PACKAGE_JUNK.has(ext)) return false;
    // a URL module lists its link as "content"; not a file
    if (mod.modname === "url") return false;
    return true;
  });
}
