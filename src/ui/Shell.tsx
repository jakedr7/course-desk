import { useEffect, useState, type ReactNode } from "react";
import { Bell, Calendar, ChartNoAxesColumn, House, Library, RefreshCw, Search } from "lucide-react";
import { useCourses, useNotices, useSession } from "../lib/data";
import { cache, useBusy, useLastUpdated } from "../lib/query";
import { useRoute, type Page } from "../lib/router";
import { ago, initials } from "../lib/format";
import { courseVar } from "./Cover";
import { useUi } from "./ui";

export function Logo() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="var(--ink)" />
      <path d="M14 22a4 4 0 0 1 4-4h11l4 4h13a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4z" fill="var(--bg)" />
      <rect x="19" y="33.5" width="26" height="6.5" rx="1.5" fill="#FFD84D" transform="rotate(-3 32 36.7)" />
      <rect x="21" y="28" width="17" height="2.4" rx="1.2" fill="var(--ink)" opacity=".8" />
      <rect x="21" y="35.3" width="20" height="2.4" rx="1.2" fill="var(--ink)" />
      <rect x="21" y="42" width="12" height="2.4" rx="1.2" fill="var(--ink)" opacity=".45" />
    </svg>
  );
}

const NAV: { page: Page; label: string; Icon: typeof House; href: string }[] = [
  { page: "home", label: "Home", Icon: House, href: "#/" },
  { page: "calendar", label: "Calendar", Icon: Calendar, href: "#/calendar" },
  { page: "courses", label: "Courses", Icon: Library, href: "#/courses" },
  { page: "grades", label: "Grades", Icon: ChartNoAxesColumn, href: "#/grades" },
  { page: "inbox", label: "Inbox", Icon: Bell, href: "#/inbox" },
];

function useUnread(): number {
  const n = useNotices();
  return n.data?.unread ?? 0;
}

function Sidebar() {
  const route = useRoute();
  const { account } = useSession();
  const { shown } = useCourses();
  const unread = useUnread();
  const active = (p: Page) => route.page === p || (p === "courses" && route.page === "course");
  return (
    <aside className="sidebar" aria-label="Main">
      <a className="brand" href="#/">
        <Logo />
        <span>
          <b>Course Desk</b>
          <small>{account.siteName}</small>
        </span>
      </a>
      <nav className="nav">
        {NAV.map(({ page, label, Icon, href }) => (
          <a key={page} className="nav-item" href={href} aria-current={active(page) ? "page" : undefined}>
            <Icon />
            {label}
            {page === "inbox" && unread > 0 && (
              <span className="count" aria-label={`${unread} unread`}>
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </a>
        ))}
      </nav>
      {shown.length > 0 && (
        <div>
          <div className="side-label">This semester</div>
          <div className="side-courses">
            {shown.map((c) => (
              <a key={c.id} className="side-course" href={`#/course/${c.id}`} style={courseVar(c.color)} aria-current={route.page === "course" && route.id === c.id ? "page" : undefined} title={c.fullname}>
                <i />
                <b>{c.code}</b>
                <span>{c.name !== c.code ? c.name : ""}</span>
              </a>
            ))}
          </div>
        </div>
      )}
      <div className="side-foot">
        <a className="acct" href="#/settings" aria-current={route.page === "settings" ? "page" : undefined}>
          <span className="avatar sm">{initials(account.name)}</span>
          <span className="acct-text">
            <b>{account.name}</b>
            <small>{account.demo ? "Sample data" : "Settings"}</small>
          </span>
        </a>
      </div>
    </aside>
  );
}

function TabBar() {
  const route = useRoute();
  const unread = useUnread();
  const active = (p: Page) => route.page === p || (p === "courses" && route.page === "course");
  return (
    <nav className="tabbar" aria-label="Main">
      {NAV.map(({ page, label, Icon, href }) => (
        <a key={page} className="tab" href={href} aria-current={active(page) ? "page" : undefined}>
          <Icon strokeWidth={active(page) ? 2.3 : 1.9} />
          <span className="tab-label">{label}</span>
          {page === "inbox" && unread > 0 && <span className="count">{unread > 99 ? "99+" : unread}</span>}
        </a>
      ))}
    </nav>
  );
}

export function TopBar({ title, left }: { title: string; left?: ReactNode }) {
  const { account } = useSession();
  const { setSearchOpen } = useUi();
  const busy = useBusy();
  const updated = useLastUpdated();
  const [lined, setLined] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    const onScroll = () => setLined(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    const i = setInterval(() => tick((n) => n + 1), 30_000);
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearInterval(i);
    };
  }, []);
  const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <header className={`topbar ${lined ? "lined" : ""}`}>
      <div className="topbar-title">
        {left}
        <h1>{title}</h1>
      </div>
      <button className="search-btn" type="button" onClick={() => setSearchOpen(true)}>
        <Search />
        <span className="label">Search courses, assignments, files</span>
        <span className="kbd">{mac ? "⌘K" : "Ctrl K"}</span>
      </button>
      <button className="icon-btn only-phone" type="button" aria-label="Search" onClick={() => setSearchOpen(true)}>
        <Search />
      </button>
      {!account.demo && updated > 0 && <span className="updated">{busy ? "Updating" : `Updated ${ago(Math.floor(updated / 1000))}`}</span>}
      <button className="icon-btn" type="button" aria-label="Refresh from Moodle" aria-busy={busy} onClick={() => cache.invalidate()}>
        <RefreshCw />
      </button>
      <a className="icon-btn only-phone" href="#/settings" aria-label="Settings">
        <span className="avatar sm">{initials(account.name)}</span>
      </a>
    </header>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <Sidebar />
      <div className="main">{children}</div>
      <TabBar />
    </div>
  );
}
