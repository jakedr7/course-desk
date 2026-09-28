import { useMemo, useState } from "react";
import { RECENT, useAllFiles, useCourses, useTodo } from "../lib/data";
import { dayLabel, dayKey, plural } from "../lib/format";
import { go, useRoute } from "../lib/router";
import { CourseCard, ErrorNote, FileRow, Skeleton } from "../ui/bits";
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
          <h2>{tab === "files" ? "Recent files" : "Courses"}</h2>
          <div className="segmented" role="group" aria-label="View">
            <button type="button" aria-pressed={tab === "courses"} onClick={() => go("/courses")}>
              Courses
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
            <div className="ccards">
              {shown.map((c) => (
                <CourseCard
                  key={c.id}
                  course={c}
                  next={todo.items.find((e) => e.course === c.id && e.time >= Date.now() / 1000)}
                  newFiles={files.filter((f) => f.course === c.id && f.modified >= since).length}
                />
              ))}
            </div>
            {!shown.length && (
              <div className="empty-big">
                <h3>No courses switched on</h3>
                <p className="muted">
                  Choose which of your enrolments to show in <a href="#/settings">Settings</a>.
                </p>
              </div>
            )}
            {hidden > 0 && (
              <p className="muted" style={{ marginTop: 22, fontSize: "0.92rem" }}>
                {plural(hidden, "other enrolment")} (earlier semesters and non-course pages) {hidden === 1 ? "is" : "are"} hidden. <a href="#/settings">Change which courses show</a>
              </p>
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
