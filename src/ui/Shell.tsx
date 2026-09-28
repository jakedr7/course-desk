import { useEffect, useState, type ReactNode } from "react";
import { BookOpen, Calendar, ChartNoAxesColumn, Gauge, House, Inbox, ListTodo, RefreshCw, Search } from "lucide-react";
import { useNotices, useSession } from "../lib/data";
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

const NAV: { page: Page; label: string; Icon: typeof House; href: string; phone: boolean; wide: boolean }[] = [
  { page: "home", label: "Dashboard", Icon: Gauge, href: "#/", phone: true, wide: true },
  { page: "courses", label: "Courses", Icon: BookOpen, href: "#/courses", phone: false, wide: true },
  { page: "calendar", label: "Calendar", Icon: Calendar, href: "#/calendar", phone: true, wide: true },
  { page: "todo", label: "To Do", Icon: ListTodo, href: "#/todo", phone: true, wide: true },
  { page: "grades", label: "Grades", Icon: ChartNoAxesColumn, href: "#/grades", phone: true, wide: true },
  { page: "inbox", label: "Inbox", Icon: Inbox, href: "#/inbox", phone: true, wide: true },
];

function useUnread(): number {
  const n = useNotices();
  return n.data?.unread ?? 0;
}
const isActive = (route: ReturnType<typeof useRoute>, p: Page) => route.page === p || (p === "courses" && route.page === "course");

/** Canvas-style global navigation: a narrow dark column of icons with labels. */
function GlobalNav() {
  const route = useRoute();
  const { account } = useSession();
  const unread = useUnread();
  return (
    <aside className="gnav" aria-label="Main">
      <a className="gnav-logo" href="#/" aria-label="Course Desk dashboard">
        <Logo />
      </a>
      <a className="gnav-item" href="#/settings" aria-current={route.page === "settings" ? "page" : undefined}>
        <span className="avatar sm">{initials(account.name)}</span>
        <span>Account</span>
      </a>
      {NAV.filter((n) => n.wide).map(({ page, label, Icon, href }) => (
        <a key={page} className="gnav-item" href={href} aria-current={isActive(route, page) ? "page" : undefined}>
          <Icon strokeWidth={1.8} />
          <span>{label}</span>
          {page === "inbox" && unread > 0 && (
            <span className="count" aria-label={`${unread} unread`}>
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </a>
      ))}
    </aside>
  );
}

function TabBar() {
  const route = useRoute();
  const unread = useUnread();
  return (
    <nav className="tabbar" aria-label="Main">
      {NAV.filter((n) => n.phone).map(({ page, label, Icon, href }) => (
        <a key={page} className="tab" href={href} aria-current={isActive(route, page) ? "page" : undefined}>
          <Icon strokeWidth={isActive(route, page) ? 2.2 : 1.8} />
          <span className="tab-label">{label}</span>
          {page === "inbox" && unread > 0 && <span className="count">{unread > 99 ? "99+" : unread}</span>}
        </a>
      ))}
    </nav>
  );
}

export function TopBar({ title, left, crumbs, color }: { title: string; left?: ReactNode; crumbs?: { label: string; href?: string }[]; color?: number }) {
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
    <header className={`topbar ${lined ? "lined" : ""} ${color != null ? "tinted" : ""}`} style={color != null ? courseVar(color) : undefined}>
      <div className="topbar-title">
        {left}
        {crumbs ? (
          <nav className="crumbs" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={c.label}>
                {i > 0 && <span className="crumb-sep" aria-hidden="true">›</span>}
                {c.href ? <a href={c.href}>{c.label}</a> : <h1>{c.label}</h1>}
              </span>
            ))}
          </nav>
        ) : (
          <h1>{title}</h1>
        )}
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
      <GlobalNav />
      <div className="main">{children}</div>
      <TabBar />
    </div>
  );
}
