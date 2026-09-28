import { useMemo } from "react";
import { useCourseGrades, useCourses, useShownIds } from "../lib/data";
import { ago, gradePercent } from "../lib/format";
import { CourseChip, ErrorNote, Skeleton } from "../ui/bits";
import { Cover, courseVar } from "../ui/Cover";
import { KindIcon } from "../ui/kinds";
import { TopBar } from "../ui/Shell";

export function Grades() {
  const { shown, byId, loading, error } = useCourses();
  const ids = useShownIds();
  const grades = useCourseGrades(ids);

  const recent = useMemo(() => {
    const out: { course: number; name: string; grade: string; percent: string; module: string; when: number; id: number }[] = [];
    for (const id of ids)
      for (const r of grades[`grades:${id}`]?.data ?? [])
        if (r.graded && r.type !== "course" && r.type !== "category") out.push({ course: id, name: r.name, grade: r.grade, percent: r.percent, module: r.module, when: r.graded, id: r.id });
    return out.sort((a, b) => b.when - a.when).slice(0, 8);
  }, [ids, grades]);

  return (
    <>
      <TopBar title="Grades" />
      <main className="page narrow" id="main">
        {error != null && <ErrorNote error={error} stale={shown.length > 0} />}
        <h2 className="page-title">Grades</h2>
        <p className="page-sub">Course totals as your lecturers have released them. Tap a course for every item.</p>
        {loading ? (
          <Skeleton lines={6} />
        ) : (
          <section className="panel panel-pad">
            {shown.map((c) => {
              const total = grades[`grades:${c.id}`]?.data?.find((r) => r.type === "course");
              const text = total?.percent && total.percent !== "-" ? total.percent.replace(" %", "%") : c.grade ?? "Not graded";
              const pct = gradePercent(total?.percent) ?? gradePercent(c.grade);
              return (
                <a key={c.id} className="grade-row" href={`#/course/${c.id}/grades`} style={courseVar(c.color)}>
                  <Cover color={c.color} pattern={c.pattern} className="gsquare" />
                  <span style={{ minWidth: 0 }}>
                    <b style={{ display: "block" }}>{c.name}</b>
                    <span className="muted" style={{ fontSize: "0.86rem" }}>
                      {c.code}
                    </span>
                  </span>
                  <span className="gbar" aria-hidden="true">
                    <i style={{ width: `${pct ?? 0}%` }} />
                  </span>
                  <span className="grade-val">{text}</span>
                </a>
              );
            })}
          </section>
        )}
        <section className="sect">
          <div className="sect-head">
            <h2>Recently graded</h2>
          </div>
          {!recent.length ? (
            <p className="empty">Nothing graded recently.</p>
          ) : (
            <div className="panel panel-pad">
              {recent.map((r) => (
                <a key={`${r.course}-${r.id}`} className="todo" href={`#/course/${r.course}/grades`} style={{ ...courseVar(byId.get(r.course)?.color ?? 0), textDecoration: "none" }}>
                  <KindIcon modname={r.module} />
                  <span>
                    <span className="todo-name">{r.name}</span>
                    <span className="todo-sub">
                      <CourseChip course={byId.get(r.course)} />
                      <span>Graded {ago(r.when)}</span>
                    </span>
                  </span>
                  <span className="todo-time" style={{ color: "var(--ink)", fontWeight: 700 }}>
                    {r.grade}
                    {r.percent && r.percent !== "-" && (
                      <>
                        <br />
                        <span className="muted" style={{ fontWeight: 400 }}>
                          {r.percent.replace(" %", "%")}
                        </span>
                      </>
                    )}
                  </span>
                </a>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
