import { useMemo, type ReactNode } from "react";
import { ChartNoAxesColumn, CircleAlert, ClipboardList, Folder, Megaphone, WifiOff } from "lucide-react";
import type { Course } from "../lib/courses";
import type { Todo } from "../lib/api";
import { explain, MoodleError } from "../lib/moodle";
import { cleanHtml } from "../lib/html";
import { useSession, type PlacedFile } from "../lib/data";
import { ago, dateOf, dayDiff, fileSize, plural, timeOf, weekdayShort, whenLabel, DAY } from "../lib/format";
import { courseVar } from "./Cover";
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
        <span className="todo-name">{item.name}</span>
        <span className="todo-sub">
          {!hideCourse && <CourseChip course={course} />}
          <span>{label}</span>
        </span>
      </span>
      <span className={`todo-time ${soon ? "due-soon" : ""}`}>
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
        <span className="fname">
          {file.name}
          {fresh && <span className="new-badge">New</span>}
        </span>
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

/** Canvas-style course card: colour block, course name in its colour, shortcut icons. */
export function CourseCard({ course, next, newFiles, news }: { course: Course; next?: Todo; newFiles?: number; news?: number }) {
  const base = `#/course/${course.id}`;
  return (
    <div className="ccard" style={courseVar(course.color)}>
      <a className="ccard-hero" href={base} aria-label={course.name} tabIndex={-1}>
        {course.grade && <span className="ccard-grade">{course.grade}</span>}
      </a>
      <div className="ccard-body">
        <a className="ccard-title" href={base}>
          {course.name}
        </a>
        <span className="ccard-code">{course.code}</span>
        <span className="ccard-next">{next ? `Next: ${next.name}, ${whenLabel(next.time)}` : "Nothing due soon"}</span>
      </div>
      <div className="ccard-icons">
        <a href={`${base}/news`} aria-label={`Announcements${news ? `, ${news} new` : ""}`} title="Announcements">
          <Megaphone />
          {!!news && <span className="ccard-badge">{news}</span>}
        </a>
        <a href={base} aria-label="Modules" title="Modules">
          <ClipboardList />
        </a>
        <a href={`${base}/files`} aria-label={`Files${newFiles ? `, ${newFiles} new` : ""}`} title="Files">
          <Folder />
          {!!newFiles && <span className="ccard-badge">{newFiles}</span>}
        </a>
        <a href={`${base}/grades`} aria-label="Grades" title="Grades">
          <ChartNoAxesColumn />
        </a>
      </div>
    </div>
  );
}

export function countLabel(n: number, one: string, many?: string) {
  return plural(n, one, many);
}
