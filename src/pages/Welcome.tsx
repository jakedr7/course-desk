import { useMemo, useState, type FormEvent } from "react";
import { ArrowRight, CalendarCheck, FolderOpen, ChartNoAxesColumn, ShieldCheck, Megaphone } from "lucide-react";
import { DEFAULT_SITE } from "../config";
import * as api from "../lib/api";
import type { Course } from "../lib/courses";
import { demoTransport } from "../lib/demo";
import { explain, httpTransport, normaliseSite } from "../lib/moodle";
import { go } from "../lib/router";
import { DEMO_ID, store, useStore } from "../lib/store";
import { Cover, courseVar } from "../ui/Cover";
import { Logo } from "../ui/Shell";

const FAN: Pick<Course, "code" | "name" | "color" | "pattern">[] = [
  { code: "MATH2250", name: "Industrial Statistics", color: 3, pattern: 1 },
  { code: "COMP2611", name: "Data Structures", color: 0, pattern: 0 },
  { code: "INFO2605", name: "Professional Ethics and Law", color: 1, pattern: 4 },
];

export function Welcome() {
  const accounts = useStore((s) => s.accounts);
  const adding = accounts.length > 0;
  const fromLink = useMemo(() => new URLSearchParams(location.search).get("site"), []);
  const [site, setSite] = useState(fromLink || DEFAULT_SITE);
  const [key, setKey] = useState("");
  const [err, setErr] = useState<{ field: "site" | "key" | "form"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const root = normaliseSite(site);
  const tokenPage = root ? `${root}/user/managetoken.php` : null;

  const connect = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!root) return setErr({ field: "site", text: "Enter your school's Moodle address, like moodle.myschool.edu. It must use https." });
    const m = /[0-9a-f]{32}/i.exec(key);
    if (!m) return setErr({ field: "key", text: "A key is 32 letters and numbers. Copy it from your Moodle's Security keys page." });
    setBusy(true);
    try {
      const token = m[0].toLowerCase();
      const info = await api.getSite(httpTransport(root, token));
      const id = `${new URL(root).host}${new URL(root).pathname.replace(/\//g, "_")}-${info.userid}`;
      store.addAccount({ id, site: root, token, userid: info.userid, name: info.fullname, first: info.firstname, siteName: info.sitename });
      if (fromLink) history.replaceState(null, "", location.pathname);
      go("/");
    } catch (e2) {
      const { title, text } = explain(e2);
      setErr({ field: "form", text: `${title}. ${text}` });
    } finally {
      setBusy(false);
    }
  };

  const demo = () => {
    const t = demoTransport();
    store.startDemo({ id: DEMO_ID, site: t.site, token: "", userid: 7, name: "Maya Persad", first: "Maya", siteName: "Sample University", demo: true });
    go("/");
  };

  return (
    <div className="welcome">
      <section className="welcome-pitch" aria-label="About Course Desk">
        <span className="brand" style={{ padding: 0 }}>
          <Logo />
          <span>
            <b>Course Desk</b>
          </span>
        </span>
        <h1>
          Everything your Moodle knows, <span className="mark">finally in order.</span>
        </h1>
        <p>Deadlines counted down, every course's files in one search, grades and announcements in one place. Works with any school's Moodle, on your phone or laptop.</p>
        <ul className="welcome-points">
          <li>
            <CalendarCheck /> A to-do list and calendar built from every course's deadlines
          </li>
          <li>
            <FolderOpen /> New lecture files highlighted as soon as they're posted
          </li>
          <li>
            <ChartNoAxesColumn /> Grades and feedback without digging through reports
          </li>
          <li>
            <Megaphone /> Announcements from all your courses together
          </li>
        </ul>
        <div className="fan" aria-hidden="true">
          {FAN.map((c) => (
            <div className="ccard" key={c.code} style={courseVar(c.color)}>
              <Cover color={c.color} pattern={c.pattern}>
                <span className="cover-label">
                  <b>{c.code}</b>
                  <small>{c.name}</small>
                </span>
              </Cover>
              <span className="ccard-body">
                <span className="ccard-name">{c.name}</span>
                <span className="ccard-next">
                  Next: <strong>{c.code === "COMP2611" ? "Assignment 3" : c.code === "MATH2250" ? "Quiz 4" : "Case study"}</strong>
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="connect">
        <form className="connect-card" onSubmit={connect} noValidate>
          <h2>{adding ? "Add a Moodle account" : "Connect your Moodle"}</h2>
          <p>{adding ? "Connect another school or account. You can switch between them in Settings." : "Takes about a minute. You'll need your Moodle key, which your school's Moodle gives you."}</p>

          <div className="field">
            <label htmlFor="site">Your school's Moodle address</label>
            <input id="site" type="url" inputMode="url" autoComplete="url" autoCapitalize="off" spellCheck={false} placeholder="moodle.myschool.edu" value={site} onChange={(e) => setSite(e.target.value)} aria-invalid={err?.field === "site"} />
            {err?.field === "site" ? <span className="err">{err.text}</span> : <small>The address you use to sign in to Moodle.</small>}
          </div>

          <ol className="steps">
            <li>
              <span>
                Open{" "}
                {tokenPage ? (
                  <a href={tokenPage} target="_blank" rel="noopener noreferrer">
                    Security keys on your Moodle
                  </a>
                ) : (
                  "Security keys on your Moodle"
                )}{" "}
                and sign in if it asks. It's under your profile, in Preferences.
              </span>
            </li>
            <li>
              <span>
                Copy the key next to <b>Moodle mobile web service</b>. If there isn't one, open the Moodle app once, or ask your school to enable it.
              </span>
            </li>
            <li>
              <span>Paste it below.</span>
            </li>
          </ol>

          <div className="field">
            <label htmlFor="key">Your key</label>
            <input id="key" className="key" type="text" autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder="32 letters and numbers" value={key} onChange={(e) => setKey(e.target.value)} aria-invalid={err?.field === "key"} />
            {err?.field === "key" && <span className="err">{err.text}</span>}
          </div>
          {err?.field === "form" && (
            <p className="err" role="alert" style={{ color: "var(--danger)", fontWeight: 700, marginBottom: 14 }}>
              {err.text}
            </p>
          )}
          <button className="btn primary block" type="submit" disabled={busy} style={{ minHeight: 50 }}>
            {busy ? "Connecting" : "Connect"} {!busy && <ArrowRight />}
          </button>

          {adding ? (
            <p style={{ marginTop: 18 }}>
              <a href="#/">Back to Course Desk</a>
            </p>
          ) : (
            <>
              <div className="or">or</div>
              <button className="btn block" type="button" onClick={demo}>
                Explore with sample data
              </button>
            </>
          )}
          <p className="fineprint">
            <ShieldCheck />
            <span>Your key stays in this browser and is sent only to your school's Moodle. Course Desk has no server and never sees your data.</span>
          </p>
        </form>
      </section>
    </div>
  );
}
