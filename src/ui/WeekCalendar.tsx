import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalEvent } from "../lib/api";
import { useCalendar, useCourses } from "../lib/data";
import { dayKey, startOfDay, timeOf, weekdayShort } from "../lib/format";
import { courseVar } from "./Cover";
import { useUi } from "./ui";

/** One week, Sunday to Saturday, with every deadline and course event. */
export function WeekCalendar() {
  const { byId } = useCourses();
  const { openActivity } = useUi();
  const [offset, setOffset] = useState(0);

  const start = startOfDay(new Date());
  start.setDate(start.getDate() - start.getDay() + offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const from = Math.floor(start.getTime() / 1000);
  const cal = useCalendar(from, Math.floor(end.getTime() / 1000));
  const events = (cal.data ?? []).filter((e) => e.course === 0 || byId.get(e.course)?.shown).sort((a, b) => a.start - b.start);
  const todayKey = dayKey(Date.now() / 1000);

  const range = `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${days[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  const label = offset === 0 ? "This week" : offset === 1 ? "Next week" : offset === -1 ? "Last week" : range;

  const open = (e: CalEvent) =>
    openActivity({ course: e.course, module: e.module, instance: e.instance, name: e.name, time: e.module ? e.start : undefined, url: e.url, event: e.module ? undefined : { type: e.type, start: e.start, duration: e.duration } });

  return (
    <section className="week-cal" aria-labelledby="h-week">
      <div className="week-head">
        <h2 id="h-week">{label}</h2>
        <span className="muted week-range">{range}</span>
        <button className="icon-btn" type="button" aria-label="Previous week" onClick={() => setOffset((o) => o - 1)}>
          <ChevronLeft />
        </button>
        <button className="icon-btn" type="button" aria-label="Next week" onClick={() => setOffset((o) => o + 1)}>
          <ChevronRight />
        </button>
        {offset !== 0 && (
          <button className="btn sm" type="button" onClick={() => setOffset(0)}>
            Today
          </button>
        )}
        <a className="week-all" href="#/calendar">
          Open calendar
        </a>
      </div>
      <div className="week-grid" aria-busy={cal.loading}>
        {days.map((d) => {
          const k = dayKey(d.getTime() / 1000);
          const list = events.filter((e) => dayKey(e.start) === k);
          return (
            <div key={k} className={`week-day ${k === todayKey ? "today" : ""} ${list.length ? "" : "no-events"}`}>
              <a className="week-date" href={`#/calendar?d=${k}`}>
                <span>{weekdayShort(d)}</span>
                <b>{d.getDate()}</b>
              </a>
              <div className="week-events">
                {list.map((e) => {
                  const c = byId.get(e.course);
                  return (
                    <button key={`${e.type}${e.id}`} type="button" className="week-ev" style={courseVar(c?.color ?? 7)} onClick={() => open(e)}>
                      <span className="week-ev-time">{timeOf(e.start)}</span>
                      <span className="week-ev-name">{e.name.replace(/ (is due|closes|opens)$/i, "")}</span>
                      <span className="week-ev-course">{c ? c.code : "Personal"}</span>
                    </button>
                  );
                })}
                {!list.length && !cal.loading && <span className="week-none">Nothing</span>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
