import { useEffect, useMemo, useState } from "react";
import { KeyRound } from "lucide-react";
import { PREVIEW } from "./config";
import * as api from "./lib/api";
import { SessionContext, useCourses, useSession } from "./lib/data";
import { demoTransport } from "./lib/demo";
import { explain, httpTransport, isKeyError } from "./lib/moodle";
import { cache } from "./lib/query";
import { go, useRoute } from "./lib/router";
import { DEMO_ID, store, useActiveAccount, usePrefs, useStore, type Account } from "./lib/store";
import { CalendarPage } from "./pages/CalendarPage";
import { CoursePage } from "./pages/CoursePage";
import { Courses } from "./pages/Courses";
import { Grades } from "./pages/Grades";
import { Home } from "./pages/Home";
import { Inbox } from "./pages/Inbox";
import { Settings } from "./pages/Settings";
import { Welcome } from "./pages/Welcome";
import { ActivitySheet } from "./ui/ActivitySheet";
import { SearchPalette } from "./ui/Search";
import { Logo, Shell } from "./ui/Shell";
import { UiProvider, useUi } from "./ui/ui";

function useTheme() {
  const theme = useStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);
}

export function App() {
  useTheme();
  const account = useActiveAccount();
  const route = useRoute();
  useEffect(() => {
    if (PREVIEW && !account) {
      const t = demoTransport();
      store.startDemo({ id: DEMO_ID, site: t.site, token: "", userid: 7, name: "Maya Persad", first: "Maya", siteName: "Sample University", demo: true });
    }
  }, [account]);
  if (!account || (route.page === "connect" && !PREVIEW)) return PREVIEW ? null : <Welcome />;
  return <Session key={account.id} account={account} />;
}

function Session({ account }: { account: Account }) {
  const prefs = usePrefs(account.id);
  cache.use(account.id, true);
  const t = useMemo(() => (account.demo ? demoTransport() : httpTransport(account.site, account.token)), [account.demo, account.site, account.token]);
  const session = useMemo(() => ({ account, t, prefs }), [account, t, prefs]);

  useEffect(() => {
    // opening the app shows saved data at once, then checks Moodle for anything new
    if (Date.now() - cache.lastSuccess > 60_000) cache.invalidate();
  }, []);

  useEffect(() => {
    // coming back to the tab after a while: fetch fresh data
    const onVis = () => {
      if (document.visibilityState === "visible" && Date.now() - cache.lastSuccess > 5 * 60_000) cache.invalidate();
    };
    const onOnline = () => cache.invalidate();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return (
    <SessionContext.Provider value={session}>
      <UiProvider>
        <Gate />
      </UiProvider>
    </SessionContext.Provider>
  );
}

function Gate() {
  const route = useRoute();
  const { error } = useCourses();
  const { setSearchOpen, closeActivity } = useUi();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setSearchOpen]);

  const pageKey = `${route.page}/${route.id ?? ""}`;
  useEffect(() => {
    window.scrollTo(0, 0);
    closeActivity();
  }, [pageKey]);

  if (isKeyError(error)) return <KeyProblem error={error} />;

  let page;
  switch (route.page) {
    case "calendar":
      page = <CalendarPage />;
      break;
    case "courses":
      page = <Courses />;
      break;
    case "course":
      page = <CoursePage />;
      break;
    case "grades":
      page = <Grades />;
      break;
    case "inbox":
      page = <Inbox />;
      break;
    case "settings":
      page = <Settings />;
      break;
    default:
      page = <Home />;
  }
  return (
    <Shell>
      {page}
      <ActivitySheet />
      <SearchPalette />
    </Shell>
  );
}

/** The key stopped working (usually expired): ask for the new one without losing anything. */
function KeyProblem({ error }: { error: unknown }) {
  const { account } = useSession();
  const [key, setKey] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const { title, text } = explain(error);
  const save = async () => {
    const m = /[0-9a-f]{32}/i.exec(key);
    if (!m) return setErr("A key is 32 letters and numbers.");
    setBusy(true);
    setErr("");
    try {
      const info = await api.getSite(httpTransport(account.site, m[0].toLowerCase()));
      if (info.userid !== account.userid) throw new Error("That key belongs to a different account.");
      store.updateToken(account.id, m[0].toLowerCase());
      cache.invalidate();
    } catch (e) {
      setErr(e instanceof Error && !("code" in e) ? e.message : explain(e).text);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="connect" style={{ minHeight: "100dvh" }}>
      <form
        className="connect-card"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <span className="brand" style={{ padding: 0, marginBottom: 28 }}>
          <Logo />
          <span>
            <b>Course Desk</b>
            <small>{account.siteName}</small>
          </span>
        </span>
        <h2>
          <KeyRound style={{ width: 28, height: 28, verticalAlign: "-4px", marginRight: 8 }} />
          {title}
        </h2>
        <p>{text} Your settings and saved data are kept.</p>
        <ol className="steps">
          <li>
            <span>
              Open{" "}
              <a href={`${account.site}/user/managetoken.php`} target="_blank" rel="noopener noreferrer">
                Security keys on your Moodle
              </a>
              .
            </span>
          </li>
          <li>
            <span>
              Click <b>Reset</b> next to Moodle mobile web service, then copy the new key.
            </span>
          </li>
        </ol>
        <div className="field">
          <label htmlFor="rekey">New key</label>
          <input id="rekey" className="key" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" spellCheck={false} placeholder="32 letters and numbers" />
          {err && <span className="err">{err}</span>}
        </div>
        <button className="btn primary block" type="submit" disabled={busy} style={{ minHeight: 50 }}>
          {busy ? "Checking" : "Save and continue"}
        </button>
        <p style={{ marginTop: 18, display: "flex", gap: 18, flexWrap: "wrap" }}>
          <button className="link-btn" type="button" onClick={() => cache.invalidate()}>
            Try the old key again
          </button>
          <button
            className="link-btn"
            type="button"
            onClick={() => {
              store.removeAccount(account.id);
              go("/");
            }}
          >
            Remove this account
          </button>
        </p>
      </form>
    </div>
  );
}
