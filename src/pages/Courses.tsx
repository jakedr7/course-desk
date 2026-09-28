import { useMemo, useState } from "react";
import { RECENT, useAllFiles, useCourses, useTodo } from "../lib/data";
import type { Todo } from "../lib/api";
import type { Course } from "../lib/courses";
import { dayLabel, dayKey, plural, whenLabel } from "../lib/format";
import { go, useRoute } from "../lib/router";
import { ErrorNote, FileRow, Skeleton } from "../ui/bits";
import { courseVar } from "../ui/Cover";
import { TopBar } from "../ui/Shell";

export function Courses() {
  const route = useRoute();
  const tab = route.params.get("tab") === "files" ? "files" : "courses";
  const { shown, all, loading, error } = useCourses();
  const todo = useTodo();
  const { files } = useAllFiles();
  const since = Date.now() / 1000 - RECENT;
  const hidden = all.length - shown.length;
  return (
    <>
      <TopBar title="Courses" />
      <main className="page" id="main">
        {error != null && <ErrorNote error={error} stale={all.length > 0} />}
        <div className="cal-head">
          <h2>{tab === "files" ? "Recent files" : "All courses"}</h2>
          <div className="segmented" role="group" aria-label="View">
            <button type="button" aria-pressed={tab === "courses"} onClick={() => go("/courses")}>
              All courses
            </button>
            <button type="button" aria-pressed={tab === "files"} onClick={() => go("/courses?tab=files")}>
              Recent files
            </button>
          </div>
        </div>
        {tab === "files" ? (
          <RecentFiles />
        ) : loading ? (
          <Skeleton lines={6} />
        ) : (
          <>
            <CourseTable title="Current enrolments" courses={shown} todo={todo.items} newFiles={(id) => files.filter((f) => f.course === id && f.modified >= since).length} />
            {!shown.length && (
              <div className="empty-big">
                <h3>No courses switched on</h3>
                <p className="muted">
                  Choose which of your enrolments to show in <a href="#/settings">Settings</a>.
                </p>
              </div>
            )}
            {hidden > 0 && (
              <details className="past-courses">
                <summary>
                  {plural(hidden, "other enrolment")} (earlier semesters and non-course pages)
                </summary>
                <CourseTable courses={all.filter((c) => !c.shown)} todo={[]} newFiles={() => 0} past />
                <p className="muted" style={{ fontSize: "0.88rem", marginTop: 8 }}>
                  To show one of these on your Dashboard, switch it on in <a href="#/settings">Settings</a>.
                </p>
              </details>
            )}
          </>
        )}
      </main>
    </>
  );
}

function RecentFiles() {
  const { files, loading } = useAllFiles();
  const { byId } = useCourses();
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return files.filter((f) => (needle ? `${f.name} ${f.module} ${f.section}`.toLowerCase().includes(needle) : f.modified >= Date.now() / 1000 - 21 * 86400));
  }, [files, q]);
  const groups = useMemo(() => {
    const m = new Map<string, typeof list>();
    for (const f of list) {
      const k = dayKey(f.modified);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(f);
    }
    return [...m.values()];
  }, [list]);
  return (
    <div style={{ maxWidth: 820 }}>
      <div className="filterbar">
        <input className="search-input" type="search" placeholder={`Search all ${files.length} files`} aria-label="Search files" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className="page-sub">{q ? `${plural(list.length, "match", "matches")}` : "Added or changed in the last three weeks, newest first."}</p>
      {loading && !files.length ? (
        <Skeleton lines={6} />
      ) : !list.length ? (
        <p className="empty">{q ? "No files match that search." : "Nothing new in the last three weeks."}</p>
      ) : (
        groups.map((g) => (
          <section key={dayKey(g[0].modified)} className="todo-group" style={{ marginTop: 18 }}>
            <h3>{dayLabel(g[0].modified)}</h3>
            {g.map((f) => (
              <FileRow key={f.course + f.url} file={f} course={byId.get(f.course)} showCourse fresh={f.modified >= Date.now() / 1000 - 3 * 86400} />
            ))}
          </section>
        ))
      )}
    </div>
  );
}

function term(c: Course): string {
  const f = (t: number) => new Date(t * 1000).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  if (!c.start) return "";
  return c.end ? `${f(c.start)} – ${f(c.end)}` : `From ${f(c.start)}`;
}

/** Canvas "All Courses" style table. */
function CourseTable({ title, courses, todo, newFiles, past }: { title?: string; courses: Course[]; todo: Todo[]; newFiles: (id: number) => number; past?: boolean }) {
  if (!courses.length) return null;
  const now = Date.now() / 1000;
  return (
    <div className="table-wrap">
      {title && <h3 className="table-title">{title}</h3>}
      <table className="gtable course-table">
        <thead>
          <tr>
            <th>Course</th>
            <th className="hide-sm">Term</th>
            {!past && <th className="hide-sm">Next due</th>}
            {!past && <th className="num hide-sm">New files</th>}
            <th className="num">Grade</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => {
            const next = todo.find((e) => e.course === c.id && e.time >= now);
            const n = newFiles(c.id);
            return (
              <tr key={c.id}>
                <td>
                  <span className="course-cell" style={courseVar(c.color)}>
                    <i aria-hidden="true" />
                    <span>
                      {past ? <b>{c.name}</b> : <a href={`#/course/${c.id}`}>{c.name}</a>}
                      <small>{c.code}</small>
                    </span>
                  </span>
                </td>
                <td className="hide-sm muted">{term(c)}</td>
                {!past && <td className="hide-sm">{next ? <>{next.name}<small className="muted" style={{ display: "block" }}>{whenLabel(next.time)}</small></> : <span className="muted">Nothing</span>}</td>}
                {!past && <td className="num hide-sm">{n ? <a href={`#/course/${c.id}/files`}>{n}</a> : <span className="muted">0</span>}</td>}
                <td className="num">{c.grade ?? <span className="muted">–</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
