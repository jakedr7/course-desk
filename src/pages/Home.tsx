import { useState } from "react";
import { CircleAlert, ExternalLink } from "lucide-react";
import type { Todo } from "../lib/api";
import type { Course } from "../lib/courses";
import { RECENT, useAllFiles, useAnnouncements, useCourses, useTodo } from "../lib/data";
import { countdown, DAY, dayDiff, dayKey, plural, startOfDay, weekdayShort, whenLabel } from "../lib/format";
import { textOf } from "../lib/html";
import { ago } from "../lib/format";
import { CourseCard, CourseChip, ErrorNote, FileRow, OutLink, Skeleton, TodoRow } from "../ui/bits";
import { courseVar } from "../ui/Cover";
import { useNow } from "../ui/hooks";
import { TopBar } from "../ui/Shell";
import { useUi } from "../ui/ui";

export function Home() {
  const { shown, byId, loading, error } = useCourses();
  const todo = useTodo();
  const now = useNow();
  const late = todo.items.filter((e) => e.time < now);
  const soon = todo.items.filter((e) => e.time >= now);
  const thisWeek = soon.filter((e) => e.time - now < 7 * DAY).length;

  const summary = todo.data
    ? [thisWeek ? `${plural(thisWeek, "thing")} due this week` : "Nothing due this week", late.length ? `${late.length} overdue` : ""].filter(Boolean).join(", ") + "."
    : "";

  return (
    <>
      <TopBar title="Home" />
      <main className="page" id="main">
        {error != null && <ErrorNote error={error} stale={shown.length > 0} />}
        {todo.error != null && !error && <ErrorNote error={todo.error} stale={!!todo.data} onRetry={todo.refresh} />}
        <p className="hello">
          <b>{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}.</b>
          {summary && ` ${summary}`}
        </p>
        <div className="home">
          <div className="home-main">
            <div className="home-hero">
              {todo.loading ? <Skeleton lines={4} /> : <Hero next={soon[0]} course={soon[0] && byId.get(soon[0].course)} late={late.length} />}
              <WeekStrip items={soon} byId={byId} now={now} />
            </div>
            <section className="sect home-courses" aria-labelledby="h-courses">
              <div className="sect-head">
                <h2 id="h-courses">Your courses</h2>
                <a href="#/courses">All courses</a>
              </div>
              {loading ? <Skeleton lines={3} /> : <CourseGrid courses={shown} todo={soon} />}
            </section>
          </div>
          <aside className="home-rail">
            <TodoPanel items={todo.items} byId={byId} now={now} loading={todo.loading} />
            <NewsPanel />
            <FilesPanel />
          </aside>
        </div>
      </main>
    </>
  );
}

function Hero({ next, course, late }: { next?: Todo; course?: Course; late: number }) {
  const { openActivity } = useUi();
  const now = useNow(15_000);
  const open = () => next && openActivity({ course: next.course, module: next.module, instance: next.instance, name: next.name, time: next.time, url: next.url });
  const jumpLate = () => document.getElementById("todo-late")?.scrollIntoView({ behavior: "smooth", block: "center" });

  if (!next)
    return (
      <section className="hero" aria-label="Next deadline">
        <p className="calm">Nothing due in the next few weeks</p>
        <p className="muted">New deadlines show up here as soon as your lecturers set them.</p>
        {late > 0 && (
          <button className="late-pill" type="button" onClick={jumpLate}>
            <CircleAlert /> {plural(late, "overdue item")}
          </button>
        )}
      </section>
    );
  const left = countdown(next.time - now).map(([n, u]) => `${n} ${u}`).join(" ");
  const urgent = next.time - now < 2 * DAY;
  return (
    <section className="next-card panel" aria-label="Next deadline" style={course ? courseVar(course.color) : undefined}>
      <div className="next-top">
        <span>Next due</span>
        <span className={urgent ? "due-soon" : ""}>in {left}</span>
      </div>
      <h2 className="next-title">
        <button type="button" onClick={open}>
          {next.name}
        </button>
      </h2>
      <div className="next-meta">
        <CourseChip course={course} />
        <span>Due {whenLabel(next.time)}</span>
      </div>
      <div className="hero-actions">
        <button className="btn primary" type="button" onClick={open}>
          View details
        </button>
        <OutLink href={next.url} className="btn">
          <ExternalLink /> Open in Moodle
        </OutLink>
        {late > 0 && (
          <button className="late-pill" type="button" onClick={jumpLate}>
            <CircleAlert /> {plural(late, "overdue item")}
          </button>
        )}
      </div>
    </section>
  );
}

function WeekStrip({ items, byId, now }: { items: Todo[]; byId: Map<number, Course>; now: number }) {
  const today = startOfDay(new Date(now * 1000));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
  return (
    <div className="week" role="list" aria-label="The next 7 days">
      {days.map((d, i) => {
        const key = dayKey(d.getTime() / 1000);
        const on = items.filter((e) => dayKey(e.time) === key);
        const label = `${d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}: ${on.length ? plural(on.length, "deadline") : "nothing due"}`;
        return (
          <a role="listitem" key={key} href={`#/calendar?d=${key}`} className={`day-cell ${i === 0 ? "today" : ""}`} aria-label={label}>
            <span aria-hidden="true">{i === 0 ? "Today" : weekdayShort(d)}</span>
            <b aria-hidden="true">{d.getDate()}</b>
            <span className="dots" aria-hidden="true">
              {on.slice(0, 4).map((e) => (
                <i key={e.id} style={courseVar(byId.get(e.course)?.color ?? 0)} />
              ))}
            </span>
          </a>
        );
      })}
    </div>
  );
}

function CourseGrid({ courses, todo }: { courses: Course[]; todo: Todo[] }) {
  const { files } = useAllFiles();
  const since = Date.now() / 1000 - RECENT;
  if (!courses.length)
    return (
      <div className="empty-big">
        <h3>No courses to show</h3>
        <p className="muted">
          Pick which courses appear in <a href="#/settings">Settings</a>.
        </p>
      </div>
    );
  return (
    <div className="ccards compact">
      {courses.map((c) => (
        <CourseCard key={c.id} course={c} next={todo.find((e) => e.course === c.id)} newFiles={files.filter((f) => f.course === c.id && f.modified >= since).length} />
      ))}
    </div>
  );
}

export function groupTodo(items: Todo[], now: number) {
  const groups: { key: string; title: string; items: Todo[]; late?: boolean }[] = [];
  const add = (key: string, title: string, e: Todo, late = false) => {
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, title, items: [], late }));
    g.items.push(e);
  };
  for (const e of items) {
    const n = dayDiff(e.time, now * 1000);
    if (e.time < now) add("late", "Overdue", e, true);
    else if (n === 0) add("today", "Today", e);
    else if (n === 1) add("tomorrow", "Tomorrow", e);
    else if (n < 7) add("week", "This week", e);
    else if (n < 14) add("next", "Next week", e);
    else add("later", "Later", e);
  }
  return groups;
}

function TodoPanel({ items, byId, now, loading }: { items: Todo[]; byId: Map<number, Course>; now: number; loading: boolean }) {
  const [all, setAll] = useState(false);
  const limit = all ? Infinity : 8;
  let shown = 0;
  const groups = groupTodo(items, now);
  return (
    <section className="panel panel-pad home-todo" aria-labelledby="h-todo">
      <div className="sect-head">
        <h2 id="h-todo">To do</h2>
        <a href="#/calendar">Calendar</a>
      </div>
      {loading ? (
        <Skeleton lines={5} />
      ) : !items.length ? (
        <p className="empty">You're all caught up.</p>
      ) : (
        groups.map((g) => {
          const room = limit - shown;
          if (room <= 0) return null;
          const list = g.items.slice(0, room);
          shown += list.length;
          return (
            <div key={g.key} className={`todo-group ${g.late ? "late" : ""}`} id={g.late ? "todo-late" : undefined}>
              <h3>
                <span>{g.title}</span>
                <span>{g.items.length}</span>
              </h3>
              {list.map((e) => (
                <TodoRow key={`${e.module}${e.id}`} item={e} course={byId.get(e.course)} late={g.late} showDate={g.key === "week" || g.key === "next" || g.key === "later"} />
              ))}
            </div>
          );
        })
      )}
      {items.length > 8 && (
        <button className="btn ghost sm block" type="button" onClick={() => setAll((v) => !v)} style={{ marginTop: 8 }}>
          {all ? "Show less" : `Show all ${items.length}`}
        </button>
      )}
    </section>
  );
}

function NewsPanel() {
  const news = useAnnouncements();
  const { byId } = useCourses();
  const list = (news.data ?? []).slice(0, 4);
  return (
    <section className="panel panel-pad home-news" aria-labelledby="h-news">
      <div className="sect-head">
        <h2 id="h-news">Announcements</h2>
        <a href="#/inbox?tab=news">See all</a>
      </div>
      {news.loading ? (
        <Skeleton lines={4} />
      ) : !list.length ? (
        <p className="empty">No announcements yet.</p>
      ) : (
        list.map((n) => (
          <a key={n.id} className="news-item" href="#/inbox?tab=news" style={{ textDecoration: "none" }}>
            <span className="news-top">
              <CourseChip course={byId.get(n.course)} />
              <span>{ago(n.time)}</span>
            </span>
            <span className="news-subject" style={{ display: "block" }}>
              {n.subject}
            </span>
            <span className="news-preview">{textOf(n.message)}</span>
          </a>
        ))
      )}
    </section>
  );
}

function FilesPanel() {
  const { files, loading } = useAllFiles();
  const { byId } = useCourses();
  const since = Date.now() / 1000 - RECENT;
  const list = files.filter((f) => f.modified >= since).slice(0, 5);
  return (
    <section className="panel panel-pad home-files" aria-labelledby="h-files">
      <div className="sect-head">
        <h2 id="h-files">New files</h2>
        <a href="#/courses?tab=files">All recent files</a>
      </div>
      {loading && !files.length ? (
        <Skeleton lines={4} />
      ) : !list.length ? (
        <p className="empty">Nothing new this week.</p>
      ) : (
        list.map((f) => <FileRow key={f.course + f.url} file={f} course={byId.get(f.course)} showCourse />)
      )}
    </section>
  );
}
