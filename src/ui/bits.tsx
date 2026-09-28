import { useMemo, type ReactNode } from "react";
import { CircleAlert, WifiOff } from "lucide-react";
import type { Course } from "../lib/courses";
import type { Todo } from "../lib/api";
import { explain, MoodleError } from "../lib/moodle";
import { cleanHtml } from "../lib/html";
import { useSession, type PlacedFile } from "../lib/data";
import { ago, dateOf, dayDiff, fileSize, plural, timeOf, weekdayShort, whenLabel, DAY } from "../lib/format";
import { Cover, courseVar } from "./Cover";
import { FileTile, KindIcon, kindOf } from "./kinds";
import { useUi } from "./ui";

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skel skel-line" style={{ width: `${88 - ((i * 23) % 40)}%` }} />
      ))}
    </div>
  );
}

export function ErrorNote({ error, onRetry, stale }: { error: unknown; onRetry?: () => void; stale?: boolean }) {
  const { title, text } = explain(error);
  const offline = error instanceof MoodleError && (error.code === "offline" || error.code === "network");
  return (
    <div className={`note ${stale ? "" : "danger"}`} role="alert">
      {offline ? <WifiOff /> : <CircleAlert />}
      <div>
        <p>
          <b>{title}</b>
        </p>
        <p>{stale ? `${text} Showing what was loaded earlier.` : text}</p>
      </div>
      {onRetry && (
        <button className="btn sm" type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

/** A link into Moodle. In the sample data there's nowhere to go, so it explains that instead. */
export function OutLink({ href, className, children, label }: { href: string | null | undefined; className?: string; children: ReactNode; label?: string }) {
  const { t } = useSession();
  const { toast } = useUi();
  const url = t.pageUrl(href);
  if (!url)
    return (
      <button type="button" className={className} aria-label={label} onClick={() => toast(t.demo ? "This is sample data, so it doesn't open anything." : "There's no link for this.")}>
        {children}
      </button>
    );
  return (
    <a href={url} className={className} target="_blank" rel="noopener noreferrer" aria-label={label}>
      {children}
    </a>
  );
}

export function Html({ html }: { html: string }) {
  const { t } = useSession();
  const clean = useMemo(() => cleanHtml(html, t), [html, t]);
  if (!clean.trim()) return null;
  return <div className="prose" dangerouslySetInnerHTML={{ __html: clean }} />;
}

export function CourseChip({ course, solid }: { course?: Course; solid?: boolean }) {
  if (!course) return null;
  return (
    <span className={`chip ${solid ? "solid" : ""}`} style={courseVar(course.color)}>
      {course.code}
    </span>
  );
}

export function TodoRow({ item, course, late, showDate, hideCourse }: { item: Todo; course?: Course; late?: boolean; showDate?: boolean; hideCourse?: boolean }) {
  const { openActivity } = useUi();
  const now = Math.floor(Date.now() / 1000);
  const soon = !late && item.time - now < 2 * DAY;
  const { label } = kindOf(item.module);
  return (
    <button
      type="button"
      className="todo"
      style={course ? courseVar(course.color) : undefined}
      onClick={() => openActivity({ course: item.course, module: item.module, instance: item.instance, name: item.name, time: item.time, url: item.url })}
    >
      <KindIcon modname={item.module} />
      <span>
        <span className="todo-name">{soon ? <span className="mark">{item.name}</span> : item.name}</span>
        <span className="todo-sub">
          {!hideCourse && <CourseChip course={course} />}
          <span>{label}</span>
        </span>
      </span>
      <span className="todo-time">
        {late ? (
          lateText(item.time)
        ) : showDate ? (
          <>
            <b>{shortDay(item.time)}</b>
            {timeOf(item.time)}
          </>
        ) : (
          timeOf(item.time)
        )}
      </span>
    </button>
  );
}
function lateText(t: number) {
  const n = -dayDiff(t);
  return n <= 0 ? `Due ${timeOf(t)}` : n === 1 ? "Yesterday" : `${n} days late`;
}
function shortDay(t: number) {
  const n = dayDiff(t);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  const d = new Date(t * 1000);
  return n < 7 ? `${weekdayShort(d)} ${d.getDate()}` : dateOf(t);
}

export function FileRow({ file, course, showCourse, fresh }: { file: PlacedFile | (PlacedFile & { course: number }); course?: Course; showCourse?: boolean; fresh?: boolean }) {
  const { t } = useSession();
  const { toast } = useUi();
  const url = t.fileUrl(file.url);
  const body = (
    <>
      <FileTile name={file.name} />
      <span>
        <span className="fname">{fresh ? <span className="mark">{file.name}</span> : file.name}</span>
        <span className="fmeta">
          {showCourse && <CourseChip course={course} />}
          <span>{showCourse ? file.section : file.module !== file.name ? file.module : ""}</span>
        </span>
      </span>
      <span className="fright">
        {showCourse ? ago(file.modified) : dateOf(file.modified)}
        <br />
        {fileSize(file.size)}
      </span>
    </>
  );
  if (!url)
    return (
      <button type="button" className="frow" onClick={() => toast(t.demo ? "Sample file. Connect your account to open real files." : "This file can't be opened from here.")}>
        {body}
      </button>
    );
  return (
    <a className="frow" href={url} target="_blank" rel="noopener noreferrer">
      {body}
    </a>
  );
}

export function CourseCard({ course, next, newFiles }: { course: Course; next?: Todo; newFiles?: number }) {
  return (
    <a className="ccard" href={`#/course/${course.id}`} style={courseVar(course.color)}>
      <Cover color={course.color} pattern={course.pattern}>
        <span className="cover-label">
          <b>{course.code}</b>
          {course.name !== course.code && <small>{course.name}</small>}
        </span>
      </Cover>
      <span className="ccard-body">
        <span className="ccard-name">{course.name}</span>
        <span className="ccard-next">
          {next ? (
            <>
              Next: <strong>{next.name}</strong>, {whenLabel(next.time)}
            </>
          ) : (
            "Nothing due soon"
          )}
        </span>
        <span className="ccard-foot">
          {!!newFiles && (
            <span>
              <b className="mark">{newFiles}</b> new<span className="word"> {newFiles === 1 ? "file" : "files"}</span>
            </span>
          )}
          {course.grade && (
            <span className="grade">
              <b>{course.grade}</b>
              <small>course total</small>
            </span>
          )}
        </span>
      </span>
    </a>
  );
}

export function countLabel(n: number, one: string, many?: string) {
  return plural(n, one, many);
}
