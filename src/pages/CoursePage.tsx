import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CircleCheck, ExternalLink } from "lucide-react";
import { usefulFiles, type GradeRow, type Mod, type Section } from "../lib/api";
import type { Course } from "../lib/courses";
import { RECENT, useAnnouncements, useCourseContents, useCourseGrades, useCourses, useTodo, type PlacedFile } from "../lib/data";
import { ago, dateOf, extOf, fileSize, gradePercent, plural, whenLabel } from "../lib/format";
import { useRoute } from "../lib/router";
import { ErrorNote, FileRow, Html, OutLink, Skeleton, TodoRow } from "../ui/bits";
import { Cover, courseVar } from "../ui/Cover";
import { KindIcon, kindOf } from "../ui/kinds";
import { TopBar } from "../ui/Shell";
import { useUi } from "../ui/ui";

const TABS = [
  ["overview", "Overview"],
  ["files", "Files"],
  ["grades", "Grades"],
  ["news", "Announcements"],
] as const;

export function CoursePage() {
  const route = useRoute();
  const { byId, loading } = useCourses();
  const course = route.id ? byId.get(route.id) : undefined;
  const tab = route.tab ?? "overview";
  const back = (
    <a className="icon-btn" href="#/courses" aria-label="All courses" style={{ marginLeft: -8 }}>
      <ChevronLeft />
    </a>
  );
  if (!course)
    return (
      <>
        <TopBar title="Course" left={back} />
        <main className="page">{loading ? <Skeleton lines={6} /> : <p className="empty">That course isn't in your list. <a href="#/courses">See your courses</a></p>}</main>
      </>
    );
  return (
    <>
      <TopBar title={course.code} left={back} />
      <main className="page" id="main" style={courseVar(course.color)}>
        <Cover color={course.color} pattern={course.pattern} className="course-hero">
          <span className="cover-label">
            <b>{course.code}</b>
            <strong>{course.name}</strong>
            {course.name !== course.fullname && <small>{course.fullname}</small>}
          </span>
        </Cover>
        <nav className="ptabs" aria-label="Course sections">
          {TABS.map(([id, label]) => (
            <a key={id} className="ptab" href={`#/course/${course.id}/${id}`} aria-current={tab === id ? "page" : undefined}>
              {label}
            </a>
          ))}
        </nav>
        <div className="course-layout">
          <div>
            {tab === "files" ? <FilesTab course={course} /> : tab === "grades" ? <GradesTab course={course} /> : tab === "news" ? <NewsTab course={course} /> : <Overview course={course} />}
          </div>
          <CourseAside course={course} showTotal={tab !== "grades"} />
        </div>
      </main>
    </>
  );
}

function CourseAside({ course, showTotal }: { course: Course; showTotal: boolean }) {
  const todo = useTodo();
  const upcoming = todo.items.filter((e) => e.course === course.id);
  const pct = gradePercent(course.grade);
  const now = Date.now() / 1000;
  return (
    <aside className="course-aside">
      <section className="panel panel-pad">
        <div className="sect-head" style={{ marginBottom: 8 }}>
          <h2 style={{ fontSize: "1.05rem" }}>Coming up</h2>
        </div>
        {!upcoming.length ? (
          <p className="muted">Nothing due for this course.</p>
        ) : (
          upcoming.slice(0, 5).map((e) => <TodoRow key={e.id} item={e} course={course} late={e.time < now} showDate hideCourse />)
        )}
      </section>
      {showTotal && <section className="panel panel-pad only-wide">
        <p className="muted" style={{ fontSize: "0.86rem" }}>Course total</p>
        <p className="big-grade">{course.grade ?? "Not graded yet"}</p>
        {pct != null && (
          <div className="gbar" aria-hidden="true">
            <i style={{ width: `${pct}%` }} />
          </div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <a className="btn sm" href={`#/course/${course.id}/grades`}>
            All grades
          </a>
          <OutLink href={course.url} className="btn sm">
            <ExternalLink /> Moodle
          </OutLink>
        </div>
      </section>}
    </aside>
  );
}

function Overview({ course }: { course: Course }) {
  const q = useCourseContents(course.id);
  if (q.loading) return <Skeleton lines={8} />;
  if (q.error && !q.data) return <ErrorNote error={q.error} onRetry={q.refresh} />;
  const sections = (q.data ?? []).filter((s) => s.mods.some((m) => m.visible) || s.summary);
  if (!sections.length) return <p className="empty">This course has no content yet.</p>;
  // open the sections with recent or upcoming things; collapse the rest
  const now = Date.now() / 1000;
  const lively = (s: Section) => s.mods.some((m) => m.dates.some((d) => d.time > now - 7 * 86400) || m.files.some((f) => f.modified > now - RECENT));
  const openIdx = new Set(sections.map((s, i) => (lively(s) ? i : -1)).filter((i) => i >= 0));
  if (!openIdx.size) openIdx.add(0);
  return (
    <div>
      {q.error != null && <ErrorNote error={q.error} stale onRetry={q.refresh} />}
      {sections.map((s, i) => (
        <details key={s.id} className="sec-block" open={openIdx.has(i)}>
          <summary>
            <ChevronRight className="chev" aria-hidden="true" />
            <h3>{s.name}</h3>
            <span className="muted">{plural(s.mods.filter((m) => m.visible && m.modname !== "label").length, "item")}</span>
          </summary>
          <div className="sec-body">
            {s.summary && (
              <div className="sec-summary">
                <Html html={s.summary} />
              </div>
            )}
            {s.mods.filter((m) => m.visible).map((m) => <ModRow key={m.id} mod={m} course={course} section={s.name} />)}
          </div>
        </details>
      ))}
    </div>
  );
}

function ModRow({ mod, course, section }: { mod: Mod; course: Course; section: string }) {
  const { openActivity } = useUi();
  const [open, setOpen] = useState(false);
  const files = usefulFiles(mod);
  if (mod.modname === "label")
    return (
      <div className="label-text">
        <Html html={mod.description} />
      </div>
    );
  const due = mod.dates.find((d) => /due|close/i.test(d.label));
  const now = Date.now() / 1000;
  const recent = files.some((f) => f.modified > now - RECENT);
  const meta: string[] = [];
  if (due) meta.push(`${due.label.replace(/:$/, "")} ${whenLabel(due.time)}`);
  if (mod.modname === "resource" && files[0]) meta.push(`${extOf(files[0].name).toUpperCase() || "File"}, ${fileSize(files[0].size)}`);
  if (mod.modname === "folder") meta.push(plural(files.length, "file"));
  if (recent) meta.push(`Updated ${ago(Math.max(...files.map((f) => f.modified)))}`);
  const placed = (f: (typeof files)[number]): PlacedFile => ({ ...f, course: course.id, section, module: mod.name, cmid: mod.id });

  // a single-file resource opens the file itself
  if (mod.modname === "resource" && files.length === 1) return <FileRow file={{ ...placed(files[0]), module: mod.name }} fresh={recent} />;

  const row = (
    <>
      <KindIcon modname={mod.modname} />
      <span>
        <span className="mod-name">{recent ? <span className="mark">{mod.name}</span> : mod.name}</span>
        <span className="mod-meta">
          <span>{kindOf(mod.modname).label}</span>
          {meta.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </span>
      </span>
      {mod.completed ? (
        <span className="mod-done">
          <CircleCheck /> Done
        </span>
      ) : (
        <span />
      )}
    </>
  );
  if (files.length > 1 || mod.modname === "folder")
    return (
      <>
        <button type="button" className="mod" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {row}
        </button>
        {open && (
          <div className="mod-files">
            {files.map((f) => (
              <FileRow key={f.url} file={placed(f)} />
            ))}
          </div>
        )}
      </>
    );
  if (mod.modname === "url")
    return (
      <OutLink href={mod.url} className="mod">
        {row}
      </OutLink>
    );
  return (
    <button type="button" className="mod" onClick={() => openActivity({ course: course.id, module: mod.modname, instance: mod.instance, cmid: mod.id, name: mod.name, time: due?.time, url: mod.url })}>
      {row}
    </button>
  );
}

const TYPES: [string, string, RegExp][] = [
  ["all", "All", /./],
  ["pdf", "PDF", /^pdf$/],
  ["slides", "Slides", /^(ppt|pptx|key|odp)$/],
  ["docs", "Documents", /^(doc|docx|rtf|odt|txt|md)$/],
  ["other", "Other", /^(?!pdf$|pptx?$|key$|odp$|docx?$|rtf$|odt$|txt$|md$)/],
];

function FilesTab({ course }: { course: Course }) {
  const q = useCourseContents(course.id);
  const [needle, setNeedle] = useState("");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState<"new" | "course">("new");
  const files = useMemo(() => {
    const out: PlacedFile[] = [];
    for (const s of q.data ?? []) for (const m of s.mods) for (const f of usefulFiles(m)) out.push({ ...f, course: course.id, section: s.name, module: m.name, cmid: m.id });
    return out;
  }, [q.data, course.id]);
  const re = TYPES.find((t) => t[0] === type)![2];
  const n = needle.trim().toLowerCase();
  const list = files.filter((f) => re.test(extOf(f.name)) && (!n || `${f.name} ${f.module} ${f.section}`.toLowerCase().includes(n)));
  if (sort === "new") list.sort((a, b) => b.modified - a.modified);
  if (q.loading) return <Skeleton lines={8} />;
  if (q.error && !q.data) return <ErrorNote error={q.error} onRetry={q.refresh} />;
  const since = Date.now() / 1000 - RECENT;
  return (
    <div>
      <div className="filterbar">
        <input className="search-input" type="search" placeholder={`Search ${plural(files.length, "file")}`} aria-label="Search files" value={needle} onChange={(e) => setNeedle(e.target.value)} />
        <div className="segmented" role="group" aria-label="Sort">
          <button type="button" aria-pressed={sort === "new"} onClick={() => setSort("new")}>
            Newest
          </button>
          <button type="button" aria-pressed={sort === "course"} onClick={() => setSort("course")}>
            Course order
          </button>
        </div>
      </div>
      <div className="filter-chips" role="group" aria-label="File type" style={{ marginBottom: 14 }}>
        {TYPES.map(([id, label]) => (
          <button key={id} type="button" className="fchip" aria-pressed={type === id} onClick={() => setType(id)}>
            {label}
          </button>
        ))}
      </div>
      {!list.length ? (
        <p className="empty">{files.length ? "No files match." : "This course has no files yet."}</p>
      ) : (
        list.map((f) => <FileRow key={f.url + f.cmid} file={f} fresh={f.modified >= since} course={course} showCourse={false} />)
      )}
      {list.length > 0 && <p className="muted" style={{ fontSize: "0.84rem", marginTop: 14 }}>Newest first. Highlighted files were added or changed this week. Last change {dateOf(Math.max(...files.map((f) => f.modified)))}.</p>}
    </div>
  );
}

function GradesTab({ course }: { course: Course }) {
  const res = useCourseGrades([course.id]);
  const q = res[`grades:${course.id}`];
  if (!q || q.loading) return <Skeleton lines={8} />;
  if (q.error && !q.data) return <ErrorNote error={q.error} onRetry={q.refresh} />;
  return <GradeTable rows={q.data ?? []} />;
}

export function GradeTable({ rows }: { rows: GradeRow[] }) {
  const [openFb, setOpenFb] = useState<number | null>(null);
  const total = rows.find((r) => r.type === "course");
  const items = rows.filter((r) => r.type !== "course");
  const pct = gradePercent(total?.percent);
  if (!rows.length) return <p className="empty">No grade items in this course yet.</p>;
  return (
    <div>
      {total && (
        <div className="panel panel-pad" style={{ marginBottom: 20 }}>
          <p className="muted" style={{ fontSize: "0.86rem" }}>Course total so far</p>
          <p className="big-grade">{total.percent && total.percent !== "-" ? total.percent : total.grade || "Not graded yet"}</p>
          {pct != null && (
            <div className="gbar" aria-hidden="true">
              <i style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      )}
      <div className="table-wrap">
        <table className="gtable">
          <thead>
            <tr>
              <th>Item</th>
              <th className="num">Grade</th>
              <th className="num hide-sm">Out of</th>
              <th className="num">%</th>
              <th className="num hide-sm">Weight</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => {
              const pending = !r.grade || r.grade === "-";
              return (
                <tr key={r.id} className={r.type === "category" ? "total" : ""}>
                  <td>
                    <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      {r.module && <KindIcon modname={r.module} />}
                      <span>
                        <b>{r.name}</b>
                        {r.graded && <span className="muted" style={{ display: "block", fontSize: "0.82rem" }}>Graded {ago(r.graded)}</span>}
                        {r.feedback && (
                          <button className="link-btn" type="button" style={{ fontSize: "0.84rem", display: "block", marginTop: 2 }} onClick={() => setOpenFb(openFb === r.id ? null : r.id)} aria-expanded={openFb === r.id}>
                            {openFb === r.id ? "Hide feedback" : "Feedback"}
                          </button>
                        )}
                      </span>
                    </span>
                    {openFb === r.id && (
                      <div className="fb">
                        <Html html={r.feedback} />
                      </div>
                    )}
                  </td>
                  <td className={`num ${pending ? "pending" : ""}`}>{pending ? "Not graded" : r.grade}</td>
                  <td className="num hide-sm muted">{r.max != null ? r.max.toFixed(r.max % 1 ? 2 : 0) : ""}</td>
                  <td className="num">{r.percent && r.percent !== "-" ? r.percent.replace(" %", "%") : ""}</td>
                  <td className="num hide-sm muted">{r.weight && r.weight !== "-" ? r.weight.replace(" %", "%") : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewsTab({ course }: { course: Course }) {
  const q = useAnnouncements();
  const list = (q.data ?? []).filter((n) => n.course === course.id);
  if (q.loading) return <Skeleton lines={6} />;
  if (q.error && !q.data) return <ErrorNote error={q.error} onRetry={q.refresh} />;
  if (!list.length) return <p className="empty">No announcements in this course yet.</p>;
  return (
    <div>
      {list.map((n) => (
        <article key={n.id} className="panel panel-pad" style={{ marginBottom: 14 }}>
          <div className="news-top">
            <span>{n.author}</span>
            <span>{ago(n.time)}</span>
          </div>
          <h3 className="news-subject" style={{ fontSize: "1.15rem", margin: "6px 0 10px" }}>
            {n.subject}
          </h3>
          <Html html={n.message} />
        </article>
      ))}
    </div>
  );
}
