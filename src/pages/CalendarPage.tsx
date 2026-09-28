import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalEvent } from "../lib/api";
import { useCalendar, useCourses } from "../lib/data";
import { dayKey, dayLong, monthTitle, plural, startOfDay, timeOf, weekdayNarrow, weekdayShort } from "../lib/format";
import { go, useRoute } from "../lib/router";
import { CourseChip, ErrorNote } from "../ui/bits";
import { courseVar } from "../ui/Cover";
import { KindIcon, kindOf } from "../ui/kinds";
import { TopBar } from "../ui/Shell";
import { useUi } from "../ui/ui";

function parseDay(s: string | null): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function CalendarPage() {
  const route = useRoute();
  const { byId, shown } = useCourses();
  const picked = parseDay(route.params.get("d")) ?? startOfDay(new Date());
  const [month, setMonth] = useState(() => new Date(picked.getFullYear(), picked.getMonth(), 1));
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const selKey = dayKey(picked.getTime() / 1000);

  // grid runs Sunday to Saturday and covers whole weeks
  const gridStart = new Date(month);
  gridStart.setDate(1 - month.getDay());
  const weeks = Math.ceil((month.getDay() + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7);
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridStart.getDate() + weeks * 7);
  const from = Math.floor(gridStart.getTime() / 1000);
  const to = Math.floor(gridEnd.getTime() / 1000);
  const cal = useCalendar(from, to);

  const events = useMemo(
    () => (cal.data ?? []).filter((e) => (e.course === 0 || byId.get(e.course)?.shown) && !hidden.has(e.course)).sort((a, b) => a.start - b.start),
    [cal.data, byId, hidden],
  );
  const byDay = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of events) {
      const k = dayKey(e.start);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    }
    return m;
  }, [events]);

  const todayKey = dayKey(Date.now() / 1000);
  const pick = (d: Date) => {
    go(`/calendar?d=${dayKey(d.getTime() / 1000)}`);
    if (d.getMonth() !== month.getMonth()) setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  };
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const dayEvents = byDay.get(selKey) ?? [];
  const cells = Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  return (
    <>
      <TopBar title="Calendar" />
      <main className="page" id="main">
        {cal.error != null && <ErrorNote error={cal.error} stale={!!cal.data} onRetry={cal.refresh} />}
        <div className="cal-head">
          <h2>{monthTitle(month)}</h2>
          <button className="btn sm" type="button" onClick={() => pick(startOfDay(new Date()))}>
            Today
          </button>
          <button className="icon-btn" type="button" aria-label="Previous month" onClick={() => shift(-1)}>
            <ChevronLeft />
          </button>
          <button className="icon-btn" type="button" aria-label="Next month" onClick={() => shift(1)}>
            <ChevronRight />
          </button>
        </div>
        {shown.length > 1 && (
          <div className="filter-chips" style={{ marginBottom: 16 }} role="group" aria-label="Show courses">
            {shown.map((c) => (
              <button
                key={c.id}
                type="button"
                className="cchip"
                style={courseVar(c.color)}
                aria-pressed={!hidden.has(c.id)}
                onClick={() => setHidden((h) => {
                  const n = new Set(h);
                  if (n.has(c.id)) n.delete(c.id);
                  else n.add(c.id);
                  return n;
                })}
              >
                <i /> {c.code}
              </button>
            ))}
          </div>
        )}
        <div className="cal-layout">
          <div className="cal" aria-busy={cal.loading}>
            <div className="cal-dows" aria-hidden="true">
              {cells.slice(0, 7).map((d) => (
                <div key={d.getDay()}>
                  <span className="only-wide">{weekdayShort(d)}</span>
                  <span className="only-phone">{weekdayNarrow(d)}</span>
                </div>
              ))}
            </div>
            <div className="cal-grid">
              {cells.map((d) => {
                const k = dayKey(d.getTime() / 1000);
                const evs = byDay.get(k) ?? [];
                const cls = ["cal-cell", d.getMonth() !== month.getMonth() ? "other" : "", k === todayKey ? "today" : ""].join(" ");
                return (
                  <button
                    key={k}
                    type="button"
                    className={cls}
                    aria-pressed={k === selKey}
                    aria-current={k === todayKey ? "date" : undefined}
                    aria-label={`${dayLong(d)}${evs.length ? `, ${plural(evs.length, "event")}` : ""}`}
                    onClick={() => pick(d)}
                  >
                    <span className="cal-num">{d.getDate()}</span>
                    {evs.slice(0, 3).map((e) => (
                      <span key={`${e.type}${e.id}`} className="cal-ev" style={courseVar(byId.get(e.course)?.color ?? 7)}>
                        {e.name.replace(/ (is due|closes|opens)$/i, "")}
                      </span>
                    ))}
                    {evs.length > 3 && <span className="cal-more">{evs.length - 3} more</span>}
                    <span className="cal-dots" aria-hidden="true">
                      {evs.slice(0, 4).map((e) => (
                        <i key={`${e.type}${e.id}`} style={courseVar(byId.get(e.course)?.color ?? 7)} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <section className="agenda panel panel-pad" aria-live="polite">
            <h3>{dayLong(picked)}</h3>
            {cal.loading ? (
              <p className="muted">Loading</p>
            ) : !dayEvents.length ? (
              <>
                <p className="empty">Nothing on this day.</p>
                {events.some((e) => e.start > picked.getTime() / 1000) && <h3 style={{ fontSize: "0.95rem", marginTop: 4 }}>After that</h3>}
                {events
                  .filter((e) => e.start > picked.getTime() / 1000)
                  .slice(0, 4)
                  .map((e) => (
                    <AgendaRow key={`${e.type}${e.id}`} e={e} withDay />
                  ))}
              </>
            ) : (
              dayEvents.map((e) => <AgendaRow key={`${e.type}${e.id}`} e={e} />)
            )}
          </section>
        </div>
      </main>
    </>
  );
}

function AgendaRow({ e, withDay }: { e: CalEvent; withDay?: boolean }) {
  const { byId } = useCourses();
  const { openActivity } = useUi();
  const c = byId.get(e.course);
  const open = () =>
    openActivity({ course: e.course, module: e.module, instance: e.instance, name: e.name, time: e.module ? e.start : undefined, url: e.url, event: e.module ? undefined : { type: e.type, start: e.start, duration: e.duration } });
  return (
    <button type="button" className="todo" style={courseVar(c?.color ?? 7)} onClick={open}>
      <KindIcon modname={e.module || (e.type === "user" ? "attendance" : "label")} />
      <span>
        <span className="todo-name">{e.name}</span>
        <span className="todo-sub">
          {c ? <CourseChip course={c} /> : <span>Personal</span>}
          <span>{e.module ? kindOf(e.module).label : e.type === "course" ? "Course event" : "Event"}</span>
        </span>
      </span>
      <span className="todo-time">
        {withDay && <b>{new Date(e.start * 1000).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</b>}
        {timeOf(e.start)}
        {!withDay && e.duration > 0 && (
          <>
            <br />
            <span className="muted">to {timeOf(e.start + e.duration)}</span>
          </>
        )}
      </span>
    </button>
  );
}
