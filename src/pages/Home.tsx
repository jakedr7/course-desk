import type { Todo } from "../lib/api";
import type { Course } from "../lib/courses";
import { RECENT, useAllFiles, useAnnouncements, useCourses, useTodo } from "../lib/data";
import { dayDiff } from "../lib/format";
import { textOf } from "../lib/html";
import { ago } from "../lib/format";
import { CourseCard, CourseChip, ErrorNote, FileRow, Skeleton, TodoRow } from "../ui/bits";
import { useNow } from "../ui/hooks";
import { TopBar } from "../ui/Shell";

export function Home() {
  const { shown, byId, loading, error } = useCourses();
  const todo = useTodo();
  const now = useNow();
  const soon = todo.items.filter((e) => e.time >= now);

  const news = useAnnouncements();
  const weekAgo = Date.now() / 1000 - RECENT;
  const { files } = useAllFiles();
  return (
    <>
      <TopBar title="Dashboard" />
      <main className="page" id="main">
        {error != null && <ErrorNote error={error} stale={shown.length > 0} />}
        {todo.error != null && !error && <ErrorNote error={todo.error} stale={!!todo.data} onRetry={todo.refresh} />}
        <h2 className="dash-title">Dashboard</h2>
        <div className="home">
          <div className="home-main">
            <section className="home-courses" aria-label="Your courses">
              {loading ? (
                <Skeleton lines={4} />
              ) : !shown.length ? (
                <div className="empty-big">
                  <h3>No courses to show</h3>
                  <p className="muted">
                    Pick which courses appear in <a href="#/settings">Settings</a>.
                  </p>
                </div>
              ) : (
                <div className="ccards">
                  {shown.map((c) => (
                    <CourseCard
                      key={c.id}
                      course={c}
                      next={soon.find((e) => e.course === c.id)}
                      newFiles={files.filter((f) => f.course === c.id && f.modified >= weekAgo).length}
                      news={(news.data ?? []).filter((n) => n.course === c.id && n.time >= weekAgo).length}
                    />
                  ))}
                </div>
              )}
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
  const limit = 7;
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
      {items.length > 7 && (
        <a className="show-all" href="#/todo">
          Show all {items.length}
        </a>
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
