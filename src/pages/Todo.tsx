import { useCourses, useTodo } from "../lib/data";
import { ErrorNote, Skeleton, TodoRow } from "../ui/bits";
import { useNow } from "../ui/hooks";
import { TopBar } from "../ui/Shell";
import { groupTodo } from "./Home";

/** Everything with a deadline, overdue first: Canvas's To Do list. */
export function Todo() {
  const todo = useTodo();
  const { byId } = useCourses();
  const now = useNow();
  const groups = groupTodo(todo.items, now);
  return (
    <>
      <TopBar title="To Do" />
      <main className="page narrow" id="main">
        <h2 className="page-title">To Do</h2>
        {todo.error != null && <ErrorNote error={todo.error} stale={!!todo.data} onRetry={todo.refresh} />}
        {todo.loading ? (
          <Skeleton lines={8} />
        ) : !todo.items.length ? (
          <p className="empty">Nothing to do right now.</p>
        ) : (
          groups.map((g) => (
            <section key={g.key} className={`todo-group todo-page ${g.late ? "late" : ""}`}>
              <h3>
                <span>{g.title}</span>
                <span>{g.items.length}</span>
              </h3>
              {g.items.map((e) => (
                <TodoRow key={`${e.module}${e.id}`} item={e} course={byId.get(e.course)} late={g.late} showDate={!["today", "tomorrow", "late"].includes(g.key)} />
              ))}
            </section>
          ))
        )}
      </main>
    </>
  );
}
