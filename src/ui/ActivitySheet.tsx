import { useEffect, useRef } from "react";
import { CircleAlert, CircleCheck, CircleDashed, Clock, ExternalLink, X } from "lucide-react";
import { useAssignments, useAssignStatus, useCourseContents, useCourses, useQuizzes, useSession } from "../lib/data";
import { usefulFiles, type AssignStatus } from "../lib/api";
import { DAY, dayLong, plural, timeOf, toDate, whenLabel } from "../lib/format";
import { CourseChip, FileRow, Html, OutLink, Skeleton } from "./bits";
import { courseVar } from "./Cover";
import { kindOf } from "./kinds";
import { useUi } from "./ui";

function full(t: number) {
  return `${dayLong(toDate(t))}, ${timeOf(t)}`;
}

export function ActivitySheet() {
  const { activity: a, closeActivity } = useUi();
  const { byId } = useCourses();
  const { t } = useSession();
  const contents = useCourseContents(a?.course || null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<Element | null>(null);

  useEffect(() => {
    if (!a) return;
    lastFocus.current = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeActivity();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      (lastFocus.current as HTMLElement | null)?.focus?.();
    };
  }, [a, closeActivity]);

  if (!a) return null;
  const course = byId.get(a.course);
  const { label } = kindOf(a.module);
  const mod = contents.data?.flatMap((s) => s.mods).find((m) => (a.cmid ? m.id === a.cmid : m.modname === a.module && m.instance === a.instance));
  const href = a.url || mod?.url || (a.event ? `${t.site}/calendar/view.php?view=day&time=${a.event.start}` : null);

  return (
    <>
      <div className="scrim" onClick={closeActivity} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" style={course ? courseVar(course.color) : undefined}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <div>
            <div className="hero-meta">
              <CourseChip course={course} solid />
              <span>{a.event && !a.module ? eventLabel(a.event.type) : label}</span>
            </div>
            <h2 id="sheet-title">{a.name}</h2>
          </div>
          <button ref={closeRef} className="icon-btn" type="button" onClick={closeActivity} aria-label="Close">
            <X />
          </button>
        </div>
        <div className="sheet-body">
          <Details />
        </div>
        <div className="sheet-foot">
          <OutLink href={href} className="btn primary">
            <ExternalLink /> Open in Moodle
          </OutLink>
        </div>
      </div>
    </>
  );
}

function eventLabel(type: string) {
  return type === "user" ? "Personal event" : type === "site" ? "Site event" : type === "course" ? "Course event" : "Event";
}

function Details() {
  const { activity: a } = useUi();
  const { t } = useSession();
  const isAssign = a?.module === "assign";
  const isQuiz = a?.module === "quiz";
  const assigns = useAssignments();
  const quizzes = useQuizzes();
  const contents = useCourseContents(a?.course || null);
  const assign = isAssign ? assigns.data?.find((x) => x.id === a!.instance) : undefined;
  const status = useAssignStatus(isAssign && a ? a.instance : null);
  const quiz = isQuiz ? quizzes.data?.find((x) => x.id === a!.instance) : undefined;
  const mod = contents.data?.flatMap((s) => s.mods).find((m) => (a?.cmid ? m.id === a.cmid : m.modname === a?.module && m.instance === a?.instance));
  if (!a) return null;

  const now = Date.now() / 1000;
  const due = assign?.due || (isAssign ? a.time : 0) || 0;
  const facts: [string, string][] = [];
  if (a.event && !a.module) {
    facts.push(["When", full(a.event.start)]);
    if (a.event.duration) facts.push(["Until", timeOf(a.event.start + a.event.duration)]);
  }
  if (isAssign) {
    if (assign?.opens && assign.opens > now) facts.push(["Opens", full(assign.opens)]);
    if (due) facts.push(["Due", full(due)]);
    if (assign?.cutoff && assign.cutoff !== due) facts.push(["Last chance", full(assign.cutoff)]);
  } else if (isQuiz) {
    if (quiz?.opens) facts.push([quiz.opens > now ? "Opens" : "Opened", full(quiz.opens)]);
    if (quiz?.closes || a.time) facts.push(["Closes", full(quiz?.closes || a.time!)]);
    if (quiz?.timelimit) facts.push(["Time limit", `${Math.round(quiz.timelimit / 60)} minutes`]);
    if (quiz) facts.push(["Attempts", quiz.attempts ? plural(quiz.attempts, "attempt") : "Unlimited"]);
  } else if (a.time) {
    facts.push(["Due", full(a.time)]);
  }
  for (const d of mod?.dates ?? []) {
    const label = d.label.replace(/:$/, "");
    if (!facts.some(([k]) => k === label)) facts.push([label, full(d.time)]);
  }

  const description = assign?.intro || quiz?.intro || mod?.description || "";
  const attachments = assign?.files.length ? assign.files : mod ? usefulFiles(mod) : [];
  const loading = (isAssign && assigns.loading) || (isQuiz && quizzes.loading) || (!isAssign && !isQuiz && !a.event && contents.loading);

  return (
    <>
      {isAssign && <SubmissionStatus due={due} status={status.data} loading={status.loading} />}
      {isAssign && status.data?.feedback && (
        <div className="panel panel-pad" style={{ marginBottom: 18 }}>
          <p className="muted" style={{ fontSize: "0.86rem", marginBottom: 6 }}>
            Feedback
          </p>
          <Html html={status.data.feedback} />
        </div>
      )}
      {!isAssign && a.time && a.time < now && !a.event && (
        <div className="status danger">
          <CircleAlert />
          <span>
            This was due {whenLabel(a.time)}
            <small>Check Moodle for whether late work is accepted.</small>
          </span>
        </div>
      )}
      {facts.length > 0 && (
        <dl className="facts">
          {facts.map(([k, v]) => (
            <div key={k} style={{ display: "contents" }}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {loading ? <Skeleton lines={4} /> : description ? <Html html={description} /> : !facts.length && <p className="muted">No description on Moodle for this.</p>}
      {attachments.length > 0 && (
        <div className="sect" style={{ marginTop: 24 }}>
          <div className="sect-head">
            <h2 style={{ fontSize: "1.05rem" }}>Files</h2>
          </div>
          {attachments.map((f) => (
            <FileRow key={f.url} file={{ ...f, course: a.course, section: "", module: "", cmid: 0 }} />
          ))}
        </div>
      )}
      {t.demo && <p className="muted" style={{ marginTop: 20, fontSize: "0.86rem" }}>Sample data. Nothing here is a real course.</p>}
    </>
  );
}

function SubmissionStatus({ due, status, loading }: { due: number; status?: AssignStatus; loading: boolean }) {
  const now = Date.now() / 1000;
  if (loading && !status) return <div className="skel" style={{ height: 48, marginBottom: 18, borderRadius: 12 }} />;
  if (!status) return null;
  if (status.graded)
    return (
      <div className="status ok">
        <CircleCheck />
        <span>
          Graded: {status.grade}
        </span>
      </div>
    );
  if (status.status === "submitted")
    return (
      <div className="status ok">
        <CircleCheck />
        <span>
          Submitted{status.submittedAt ? ` ${whenLabel(status.submittedAt)}` : ""}
          <small>Waiting for grading.</small>
        </span>
      </div>
    );
  const late = due && due < now;
  const soon = due && due - now < 2 * DAY;
  return (
    <div className={`status ${late ? "danger" : status.status === "draft" || soon ? "warn" : "plain"}`}>
      {late ? <CircleAlert /> : status.status === "draft" ? <Clock /> : <CircleDashed />}
      <span>
        {status.status === "draft" ? "Draft saved, not submitted yet" : late ? "Not submitted, and the due date has passed" : "Not submitted yet"}
        {status.status === "draft" && <small>Open it in Moodle and press Submit to hand it in.</small>}
      </span>
    </div>
  );
}
