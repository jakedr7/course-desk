import { useEffect, useState } from "react";
import { Bell, Megaphone } from "lucide-react";
import { useAnnouncements, useCourses, useNotices, useSession } from "../lib/data";
import { go, useRoute } from "../lib/router";
import { store } from "../lib/store";
import { ago } from "../lib/format";
import { textOf } from "../lib/html";
import { CourseChip, ErrorNote, Html, OutLink, Skeleton } from "../ui/bits";
import { courseVar } from "../ui/Cover";
import { TopBar } from "../ui/Shell";

export function Inbox() {
  const route = useRoute();
  const tab = route.params.get("tab") === "news" ? "news" : "notices";
  return (
    <>
      <TopBar title="Inbox" />
      <main className="page narrow" id="main">
        <div className="cal-head">
          <h2>{tab === "news" ? "Announcements" : "Notifications"}</h2>
          <div className="segmented" role="group" aria-label="Show">
            <button type="button" aria-pressed={tab === "notices"} onClick={() => go("/inbox")}>
              <Bell /> Notifications
            </button>
            <button type="button" aria-pressed={tab === "news"} onClick={() => go("/inbox?tab=news")}>
              <Megaphone /> Announcements
            </button>
          </div>
        </div>
        {tab === "news" ? <News /> : <Notices />}
      </main>
    </>
  );
}

function Notices() {
  const q = useNotices();
  if (q.loading) return <Skeleton lines={8} />;
  if (q.error && !q.data) return <ErrorNote error={q.error} onRetry={q.refresh} />;
  const items = q.data?.items ?? [];
  if (!items.length) return <p className="empty">No notifications.</p>;
  return (
    <section className="panel panel-pad">
      {q.error != null && <ErrorNote error={q.error} stale onRetry={q.refresh} />}
      {items.map((n) => (
        <OutLink key={n.id} href={n.url} className={`notice ${n.read ? "" : "unread"}`}>
          <span className="kind-icon" aria-hidden="true">
            <Bell />
          </span>
          <span style={{ minWidth: 0, textAlign: "left" }}>
            <span className="notice-subject" style={{ display: "block" }}>
              {n.subject}
            </span>
            {n.text && n.text !== n.subject && <span className="notice-text" style={{ display: "block" }}>{textOf(n.text)}</span>}
          </span>
          <time>{ago(n.time)}</time>
        </OutLink>
      ))}
    </section>
  );
}

function News() {
  const q = useAnnouncements();
  const { account } = useSession();
  const { byId } = useCourses();
  const [seen] = useState(() => store.prefs(account.id).seenNews ?? 0);
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    // everything shown here counts as read from now on
    if (q.data?.length && !account.demo) store.setPrefs(account.id, (p) => ({ ...p, seenNews: Math.floor(Date.now() / 1000) }));
  }, [q.data, account.id, account.demo]);
  if (q.loading) return <Skeleton lines={8} />;
  if (q.error && !q.data) return <ErrorNote error={q.error} onRetry={q.refresh} />;
  const list = q.data ?? [];
  if (!list.length) return <p className="empty">No announcements in your courses yet.</p>;
  return (
    <section className="panel panel-pad">
      {list.map((n) => {
        const c = byId.get(n.course);
        const isOpen = open === n.id;
        return (
          <article key={n.id} className="news-item" style={c ? courseVar(c.color) : undefined}>
            <button type="button" onClick={() => setOpen(isOpen ? null : n.id)} aria-expanded={isOpen} style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}>
              <span className="news-top">
                <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {n.time > seen && <span className="unread-dot" aria-label="New" />}
                  <CourseChip course={c} />
                </span>
                <span>{ago(n.time)}</span>
              </span>
              <span className="news-subject" style={{ display: "block", fontSize: "1.05rem" }}>
                {n.subject}
              </span>
              {!isOpen && <span className="news-preview">{textOf(n.message)}</span>}
            </button>
            {isOpen && (
              <div className="news-full">
                <Html html={n.message} />
                <p className="news-by">
                  {n.author}.{" "}
                  <OutLink href={n.url} className="link-btn">
                    Open in Moodle
                  </OutLink>
                </p>
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
