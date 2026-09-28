/*
  Sample data served through the same interface as a real Moodle site, so the
  whole app runs unchanged in the demo. Everything is relative to "now".
*/
import type { Params, Transport } from "./moodle";
import { DAY } from "./format";

const SITE = "https://moodle.example.edu";

function at(days: number, hour: number, min = 0): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  d.setHours(hour, min, 0, 0);
  return Math.floor(d.getTime() / 1000);
}
const ago = (hours: number) => Math.floor(Date.now() / 1000) - Math.round(hours * 3600);

const COURSES = [
  { id: 101, shortname: "COMP2602-S1-2026", fullname: "Computer Networks" },
  { id: 102, shortname: "COMP2605-S1-2026", fullname: "Enterprise Database Systems" },
  { id: 103, shortname: "COMP2611-S1-2026", fullname: "Data Structures" },
  { id: 104, shortname: "INFO2605-S1-2026", fullname: "Professional Ethics and Law" },
  { id: 105, shortname: "MATH2250-S1-2026", fullname: "Industrial Statistics" },
];
const OLD = [
  { id: 90, shortname: "COMP1602-S2-2025", fullname: "Computer Programming II", old: true },
  { id: 91, shortname: "WRITING-CENTRE", fullname: "Writing Centre", old: false },
];

const TOPICS: Record<number, string[]> = {
  101: ["Introduction and the Internet", "Application layer", "Transport layer", "Network layer", "Link layer"],
  102: ["Database architecture", "Relational model review", "SQL in depth", "Normalisation", "Transactions"],
  103: ["Complexity and recursion", "Linked lists", "Stacks and queues", "Trees", "Balanced trees"],
  104: ["Ethical frameworks", "Computing and society", "Privacy", "Intellectual property", "Cybercrime law"],
  105: ["Descriptive statistics", "Probability", "Distributions", "Sampling", "Estimation"],
};

interface A {
  id: number;
  cmid: number;
  course: number;
  name: string;
  due: number;
  week: number;
  status: "submitted" | "draft" | "new";
  grade?: [number, number];
  intro: string;
}
const ASSIGNS: A[] = [
  { id: 1001, cmid: 5001, course: 101, name: "Lab 4: Subnetting worksheet", due: at(-1, 23, 55), week: 4, status: "new", intro: "<p>Complete all twelve subnetting problems in the worksheet. Show your working for questions 7 to 12.</p><p>Submit a single PDF.</p>" },
  { id: 1002, cmid: 5002, course: 103, name: "Assignment 3: AVL trees", due: at(1, 23, 59), week: 5, status: "draft", intro: "<p>Implement an AVL tree in Java supporting <strong>insert</strong>, <strong>delete</strong> and <strong>search</strong>, with all four rotations.</p><ul><li>Use the starter code in <em>avl_starter.zip</em>.</li><li>Include a short report (max 2 pages) with your complexity analysis.</li></ul><p>Late submissions lose 10% per day.</p>" },
  { id: 1003, cmid: 5003, course: 104, name: "Case study essay", due: at(3, 23, 59), week: 3, status: "new", intro: "<p>Write 1,500 words analysing the data-privacy case study from week 3, applying at least two of the ethical frameworks covered in class.</p>" },
  { id: 1004, cmid: 5004, course: 102, name: "ER diagram submission", due: at(5, 12, 0), week: 4, status: "new", intro: "<p>Submit the entity-relationship diagram for your group project. One submission per group.</p>" },
  { id: 1005, cmid: 5005, course: 101, name: "Router configuration lab", due: at(9, 23, 59), week: 5, status: "new", intro: "<p>Configure the three-router topology in Packet Tracer and submit your .pkt file with screenshots of the routing tables.</p>" },
  { id: 1006, cmid: 5006, course: 103, name: "Assignment 2: Linked lists", due: at(-12, 23, 59), week: 2, status: "submitted", grade: [18, 20], intro: "<p>Implement a doubly linked list with iterator support.</p>" },
  { id: 1007, cmid: 5007, course: 105, name: "Problem set 3", due: at(16, 23, 59), week: 5, status: "new", intro: "<p>Questions 7.4 to 7.18 from the textbook.</p>" },
  { id: 1008, cmid: 5008, course: 103, name: "Assignment 1: Recursion", due: at(-26, 23, 59), week: 1, status: "submitted", grade: [17, 20], intro: "<p>Recursive solutions to the five problems in the handout.</p>" },
  { id: 1009, cmid: 5009, course: 104, name: "Reflection 1", due: at(-15, 23, 59), week: 1, status: "submitted", grade: [9, 10], intro: "<p>A 500-word reflection on the week 1 reading.</p>" },
];
interface Q {
  id: number;
  cmid: number;
  course: number;
  name: string;
  closes: number;
  week: number;
  done?: [number, number];
}
const QUIZZES: Q[] = [
  { id: 2001, cmid: 6001, course: 105, name: "Quiz 4: Confidence intervals", closes: at(3, 14, 0), week: 5 },
  { id: 2002, cmid: 6002, course: 105, name: "Midterm practice quiz", closes: at(12, 9, 0), week: 5 },
  { id: 2003, cmid: 6003, course: 102, name: "SQL quiz 2", closes: at(-5, 23, 59), week: 3, done: [8.5, 10] },
  { id: 2004, cmid: 6004, course: 105, name: "Quiz 3: Distributions", closes: at(-9, 14, 0), week: 3, done: [7, 10] },
  { id: 2005, cmid: 6005, course: 101, name: "Quiz 2: Transport layer", closes: at(-8, 23, 59), week: 3, done: [9, 10] },
];
const FORUM_DUE = { id: 3001, cmid: 7001, course: 104, name: "Discussion: Data privacy in the Caribbean", due: at(6, 18, 0), week: 3 };

function file(course: number, name: string, hoursAgo: number, size: number) {
  const ext = name.split(".").pop() || "";
  const mime: Record<string, string> = {
    pdf: "application/pdf",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    zip: "application/zip",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    sql: "text/plain",
    java: "text/plain",
  };
  return { type: "file", filename: name, filesize: size, timemodified: ago(hoursAgo), fileurl: `${SITE}/webservice/pluginfile.php/${course}/${encodeURIComponent(name)}`, mimetype: mime[ext] || "application/octet-stream", filepath: "/" };
}

function contents(course: number) {
  const topics = TOPICS[course];
  const code = COURSES.find((c) => c.id === course)!.shortname.slice(0, 8);
  let cm = course * 100;
  const mod = (modname: string, name: string, extra: Record<string, unknown> = {}) => ({
    id: ++cm,
    instance: cm,
    modname,
    name,
    url: `${SITE}/mod/${modname}/view.php?id=${cm}`,
    visible: 1,
    uservisible: true,
    description: "",
    contents: [],
    ...extra,
  });
  const general = {
    id: course * 10,
    section: 0,
    name: "General",
    summary: `<p>Welcome to ${code}. Check the announcements forum at least twice a week.</p>`,
    modules: [
      mod("forum", "Announcements"),
      mod("resource", "Course outline", { contents: [file(course, `${code} course outline 2026.pdf`, 24 * 40, 240000)] }),
      mod("page", "Lecturer and office hours", { description: "<p>Office hours: Tuesdays 10:00 to 12:00, room 204.</p>" }),
      mod("url", "Lecture recordings", { contents: [{ type: "url", filename: "Lecture recordings", fileurl: "https://example.org/recordings" }] }),
    ],
  };
  const weeks = topics.map((topic, i) => {
    const week = i + 1;
    const age = (5 - week) * 7 * 24 + (week === 5 ? 20 : 30);
    const lectureExt = course === 102 || course === 104 ? "pptx" : "pdf";
    const modules: Record<string, unknown>[] = [
      mod("resource", `Lecture ${week * 2 - 1} and ${week * 2}: ${topic}`, {
        contents: [file(course, `Lecture ${week * 2 - 1} - ${topic}.${lectureExt}`, age, 1_200_000 + week * 310_000)],
      }),
    ];
    if (course === 105 || course === 101) modules.push(mod("resource", `Tutorial ${week}`, { contents: [file(course, `Tutorial sheet ${week}.pdf`, age - 4, 140_000)] }));
    if (course === 103 && week === 5) modules.push(mod("resource", "Assignment 3 starter code", { contents: [file(course, "avl_starter.zip", 52, 34_000)] }));
    if (course === 102 && week === 3) modules.push(mod("resource", "Sample schema", { contents: [file(course, "sample-schema.sql", 24 * 16, 6_000)] }));
    if (course === 105 && week === 3) modules.push(mod("resource", "Statistical tables", { contents: [file(course, "Z and t tables.xlsx", 24 * 18, 45_000)] }));
    if (course === 101 && week === 4) modules.push(mod("folder", "Lab 4 files", { contents: [file(course, "Lab 4 - Subnetting.docx", 70, 88_000), file(course, "Subnet cheat sheet.pdf", 70, 60_000)] }));
    for (const a of ASSIGNS.filter((x) => x.course === course && x.week === week))
      modules.push({ ...mod("assign", a.name), id: a.cmid, instance: a.id, url: `${SITE}/mod/assign/view.php?id=${a.cmid}`, dates: [{ label: "Due:", timestamp: a.due }], completiondata: { state: a.status === "submitted" ? 1 : 0 } });
    for (const q of QUIZZES.filter((x) => x.course === course && x.week === week))
      modules.push({ ...mod("quiz", q.name), id: q.cmid, instance: q.id, url: `${SITE}/mod/quiz/view.php?id=${q.cmid}`, dates: [{ label: "Closes:", timestamp: q.closes }], completiondata: { state: q.done ? 1 : 0 } });
    if (FORUM_DUE.course === course && FORUM_DUE.week === week)
      modules.push({ ...mod("forum", FORUM_DUE.name), id: FORUM_DUE.cmid, instance: FORUM_DUE.id, dates: [{ label: "Due:", timestamp: FORUM_DUE.due }] });
    return { id: course * 10 + week, section: week, name: `Week ${week}: ${topic}`, summary: "", modules };
  });
  return [general, ...weeks];
}

function todo(from: number) {
  const now = Math.floor(Date.now() / 1000);
  const ev = [
    ...ASSIGNS.filter((a) => a.status !== "submitted").map((a) => ({ id: a.id, activityname: a.name, name: `${a.name} is due`, modulename: "assign", instance: a.id, timesort: a.due, course: { id: a.course }, url: `${SITE}/mod/assign/view.php?id=${a.cmid}`, action: { name: "Add submission", actionable: true } })),
    ...QUIZZES.filter((q) => !q.done).map((q) => ({ id: q.id, activityname: q.name, name: `${q.name} closes`, modulename: "quiz", instance: q.id, timesort: q.closes, course: { id: q.course }, url: `${SITE}/mod/quiz/view.php?id=${q.cmid}`, action: { name: "Attempt quiz now", actionable: true } })),
    { id: FORUM_DUE.id, activityname: FORUM_DUE.name, name: `${FORUM_DUE.name} is due`, modulename: "forum", instance: FORUM_DUE.id, timesort: FORUM_DUE.due, course: { id: FORUM_DUE.course }, url: `${SITE}/mod/forum/view.php?id=${FORUM_DUE.cmid}`, action: { name: "Post", actionable: true } },
  ];
  return { events: ev.filter((e) => e.timesort >= from).map((e) => ({ ...e, overdue: e.timesort < now })).sort((a, b) => a.timesort - b.timesort) };
}

function calendar(from: number, to: number) {
  const events: Record<string, unknown>[] = [];
  for (const a of ASSIGNS) events.push({ id: a.id, name: `${a.name} is due`, courseid: a.course, eventtype: "due", modulename: "assign", instance: a.id, timestart: a.due, timeduration: 0 });
  for (const q of QUIZZES) events.push({ id: q.id, name: `${q.name} closes`, courseid: q.course, eventtype: "close", modulename: "quiz", instance: q.id, timestart: q.closes, timeduration: 0 });
  events.push({ id: FORUM_DUE.id, name: `${FORUM_DUE.name} is due`, courseid: FORUM_DUE.course, eventtype: "due", modulename: "forum", instance: FORUM_DUE.id, timestart: FORUM_DUE.due, timeduration: 0 });
  events.push({ id: 8001, name: "Mid-semester exam", courseid: 105, eventtype: "course", modulename: "", instance: 0, timestart: at(20, 9, 0), timeduration: 2 * 3600 });
  events.push({ id: 8002, name: "Group project check-in", courseid: 102, eventtype: "course", modulename: "", instance: 0, timestart: at(8, 13, 0), timeduration: 3600 });
  events.push({ id: 8003, name: "Study group", courseid: 0, eventtype: "user", modulename: "", instance: 0, timestart: at(2, 16, 0), timeduration: 5400 });
  // weekly lab for COMP2602 on Tuesdays
  for (let w = -6; w <= 10; w++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + ((2 - d.getDay() + 7) % 7) + w * 7);
    d.setHours(14, 0, 0, 0);
    events.push({ id: 9000 + w + 10, name: "Networks lab session", courseid: 101, eventtype: "course", modulename: "", instance: 0, timestart: Math.floor(d.getTime() / 1000), timeduration: 7200 });
  }
  return { events: events.filter((e) => (e.timestart as number) >= from && (e.timestart as number) < to) };
}

function gradeItems(course: number) {
  const items: Record<string, unknown>[] = [];
  let id = course * 1000;
  let sum = 0;
  let max = 0;
  const row = (name: string, module: string, cmid: number | null, g: [number, number] | null, weight: string, feedback = "") => {
    if (g) {
      sum += g[0];
      max += g[1];
    }
    items.push({
      id: ++id,
      itemname: name,
      itemtype: "mod",
      itemmodule: module,
      cmid,
      graderaw: g ? g[0] : null,
      gradeformatted: g ? g[0].toFixed(2) : "-",
      grademin: 0,
      grademax: g ? g[1] : 20,
      rangeformatted: `0.00–${(g ? g[1] : 20).toFixed(2)}`,
      percentageformatted: g ? `${((g[0] / g[1]) * 100).toFixed(2)} %` : "-",
      weightformatted: weight,
      feedback,
      gradedategraded: g ? ago(24 * (3 + (id % 9))) : null,
      depth: 2,
    });
  };
  for (const a of ASSIGNS.filter((x) => x.course === course)) row(a.name, "assign", a.cmid, a.grade ?? null, "15.00 %", a.grade && a.grade[0] / a.grade[1] > 0.85 ? "<p>Clean, well-tested work. Watch your naming in the iterator class.</p>" : "");
  for (const q of QUIZZES.filter((x) => x.course === course)) row(q.name, "quiz", q.cmid, q.done ?? null, "5.00 %");
  const pct = max ? (sum / max) * 100 : null;
  items.push({ id: ++id, itemname: "", itemtype: "course", itemmodule: "", cmid: null, graderaw: pct, gradeformatted: pct == null ? "-" : pct.toFixed(2), grademin: 0, grademax: 100, rangeformatted: "0.00–100.00", percentageformatted: pct == null ? "-" : `${pct.toFixed(2)} %`, weightformatted: "-", feedback: "", gradedategraded: null, depth: 1 });
  return { usergrades: [{ courseid: course, userid: 7, gradeitems: items }] };
}

const NEWS = [
  { course: 103, subject: "Assignment 3 deadline reminder", message: "<p>A reminder that Assignment 3 is due <strong>tomorrow at 11:59 PM</strong>. The submission link closes at the deadline, so upload early.</p><p>Office hours are extended to 4 PM today.</p>", author: "Dr. N. Mohammed", hours: 5 },
  { course: 105, subject: "Quiz 4 opens Wednesday", message: "<p>Quiz 4 covers confidence intervals (chapter 7). You'll have 40 minutes and one attempt. Bring a calculator; tables are provided in the quiz.</p>", author: "Prof. K. Ramsaran", hours: 28 },
  { course: 101, subject: "Lab room change this week", message: "<p>This Tuesday's lab moves to <strong>Lab 3</strong> in the Engineering building. Same time.</p>", author: "Mr. D. Charles", hours: 46 },
  { course: 102, subject: "Project groups are final", message: "<p>Group lists are posted in the Project section. If your name is missing, email me before Friday.</p>", author: "Dr. S. Ali", hours: 80 },
  { course: 104, subject: "Guest lecture on the Data Protection Act", message: "<p>Next week's lecture features a guest speaker from the Office of the Information Commissioner. Attendance counts toward participation.</p>", author: "Ms. R. Baptiste", hours: 120 },
  { course: 103, subject: "Assignment 2 grades released", message: "<p>Grades and feedback for Assignment 2 are now available. The class average was 15.2 out of 20.</p>", author: "Dr. N. Mohammed", hours: 190 },
];

const NOTICES = [
  { subject: "Assignment 2: Linked lists has been graded", text: "Your submission has been graded. Grade: 18.00 / 20.00", hours: 30, read: false, component: "mod_assign" },
  { subject: "New announcement in COMP2611", text: "Assignment 3 deadline reminder", hours: 5, read: false, component: "mod_forum" },
  { subject: "Quiz 4: Confidence intervals is due in 3 days", text: "MATH2250 Industrial Statistics", hours: 10, read: false, component: "moodle" },
  { subject: "New announcement in MATH2250", text: "Quiz 4 opens Wednesday", hours: 28, read: true, component: "mod_forum" },
  { subject: "Reply to your post in Discussion: Data privacy in the Caribbean", text: "Kevin replied: Good point about the 2011 Act, but the enforcement gap…", hours: 40, read: true, component: "mod_forum" },
  { subject: "SQL quiz 2 has been graded", text: "Grade: 8.50 / 10.00", hours: 100, read: true, component: "mod_quiz" },
  { subject: "Lab room change this week", text: "COMP2602 Computer Networks", hours: 46, read: true, component: "mod_forum" },
];

export function demoTransport(): Transport {
  const handlers: Record<string, (p: Params) => unknown> = {
    core_webservice_get_site_info: () => ({ userid: 7, fullname: "Maya Persad", firstname: "Maya", sitename: "Sample University" }),
    core_enrol_get_users_courses: () => [
      ...COURSES.map((c) => ({ ...c, startdate: at(-50, 0), enddate: at(70, 0), visible: 1 })),
      ...OLD.map((c) => ({ ...c, startdate: c.old ? at(-400, 0) : at(-900, 0), enddate: c.old ? at(-260, 0) : 0, visible: 1 })),
    ],
    core_calendar_get_action_events_by_timesort: (p) => todo(Number(p.timesortfrom) || 0),
    gradereport_overview_get_course_grades: () => ({ grades: [{ courseid: 101, grade: "81.43" }, { courseid: 102, grade: "85.00" }, { courseid: 103, grade: "87.50" }, { courseid: 104, grade: "90.00" }, { courseid: 105, grade: "70.00" }, { courseid: 90, grade: "B+" }] }),
    core_course_get_contents: (p) => contents(Number(p.courseid)),
    mod_assign_get_assignments: () => ({
      courses: COURSES.map((c) => ({ id: c.id, assignments: ASSIGNS.filter((a) => a.course === c.id).map((a) => ({ id: a.id, cmid: a.cmid, course: a.course, name: a.name, duedate: a.due, cutoffdate: a.due + 2 * DAY, allowsubmissionsfromdate: a.due - 14 * DAY, intro: a.intro, introattachments: a.id === 1002 ? [file(103, "avl_starter.zip", 52, 34_000)] : [] })) })),
    }),
    mod_quiz_get_quizzes_by_courses: () => ({ quizzes: QUIZZES.map((q) => ({ id: q.id, coursemodule: q.cmid, course: q.course, name: q.name, intro: "<p>One attempt. Answers are shown after the quiz closes.</p>", timeopen: q.closes - 2 * DAY, timeclose: q.closes, timelimit: 40 * 60, attempts: 1 })) }),
    mod_assign_get_submission_status: (p) => {
      const a = ASSIGNS.find((x) => x.id === Number(p.assignid));
      return {
        lastattempt: { submission: { status: a?.status ?? "new", timemodified: a && a.status !== "new" ? a.due - DAY : 0 } },
        feedback: a?.grade ? { gradefordisplay: `${a.grade[0].toFixed(2)} / ${a.grade[1].toFixed(2)}`, plugins: [{ type: "comments", editorfields: [{ text: "<p>Clean, well-tested work. Watch your naming in the iterator class.</p>" }] }] } : undefined,
      };
    },
    mod_forum_get_forums_by_courses: () => COURSES.map((c) => ({ id: c.id * 10, course: c.id, type: "news", name: "Announcements" })),
    mod_forum_get_forum_discussions: (p) => ({
      discussions: NEWS.filter((n) => n.course * 10 === Number(p.forumid)).map((n, i) => ({ id: n.course * 100 + i, discussion: n.course * 100 + i, subject: n.subject, message: n.message, userfullname: n.author, created: ago(n.hours), pinned: false })),
    }),
    message_popup_get_popup_notifications: () => ({
      notifications: NOTICES.map((n, i) => ({ id: i + 1, subject: n.subject, smallmessage: n.text, timecreated: ago(n.hours), read: n.read, contexturl: null, component: n.component })),
      unreadcount: NOTICES.filter((n) => !n.read).length,
    }),
    core_calendar_get_calendar_events: (p) => {
      const o = (p.options || {}) as Record<string, number>;
      return calendar(Number(o.timestart), Number(o.timeend));
    },
    gradereport_user_get_grade_items: (p) => gradeItems(Number(p.courseid)),
  };
  return {
    site: SITE,
    demo: true,
    async call<T>(fn: string, params: Params = {}): Promise<T> {
      await new Promise((r) => setTimeout(r, 120 + Math.random() * 180));
      const h = handlers[fn];
      if (!h) throw new Error(`Sample data has no answer for ${fn}`);
      return JSON.parse(JSON.stringify(h(params))) as T;
    },
    fileUrl: () => null,
    pageUrl: () => null,
  };
}
