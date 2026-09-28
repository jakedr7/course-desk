import { useState } from "react";
import { Check, Copy, Monitor, Moon, Sun } from "lucide-react";
import { NATIVE, PREVIEW, PUBLIC_URL } from "../config";
import * as api from "../lib/api";
import { COLOR_COUNT, type Course } from "../lib/courses";
import { useCourses, useSession } from "../lib/data";
import { explain, httpTransport } from "../lib/moodle";
import { cache, useLastUpdated } from "../lib/query";
import { go } from "../lib/router";
import { store, useStore, type Theme } from "../lib/store";
import { ago, initials } from "../lib/format";
import { Cover, courseVar } from "../ui/Cover";
import { TopBar } from "../ui/Shell";
import { useUi } from "../ui/ui";

export function Settings() {
  const { account } = useSession();
  return (
    <>
      <TopBar title="Settings" />
      <main className="page narrow" id="main">
        <h2 className="page-title">Settings</h2>
        <p className="page-sub">Everything here is saved in this browser only.</p>
        {account.demo ? <DemoGroup /> : <AccountGroup />}
        <AppearanceGroup />
        <CoursesGroup />
        {!account.demo && <KeyGroup />}
        {!account.demo && <ShareGroup />}
        <AboutGroup />
      </main>
    </>
  );
}

function DemoGroup() {
  return (
    <section className="set-group">
      <h2>Sample data</h2>
      <div className="panel">
        <div className="set-row">
          <div>
            <b>You're exploring with sample data</b>
            <small>{PREVIEW ? "This preview only has sample data. Your own copy of Course Desk connects to your school's Moodle." : "Connect your school's Moodle to see your own courses."}</small>
          </div>
          {!PREVIEW && <button
            className="btn primary"
            type="button"
            onClick={() => {
              store.leaveDemo();
              go("/connect");
            }}
          >
            Connect your Moodle
          </button>}
        </div>
      </div>
    </section>
  );
}

function AccountGroup() {
  const { account } = useSession();
  const accounts = useStore((s) => s.accounts);
  const updated = useLastUpdated();
  return (
    <section className="set-group">
      <h2>Account</h2>
      <div className="panel">
        <div className="set-row">
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <span className="avatar">{initials(account.name)}</span>
            <span style={{ minWidth: 0 }}>
              <b>{account.name}</b>
              <small>
                {account.siteName}, {account.site.replace(/^https?:\/\//, "")}
              </small>
            </span>
          </div>
        </div>
        {accounts.length > 1 &&
          accounts
            .filter((a) => a.id !== account.id)
            .map((a) => (
              <div className="set-row" key={a.id}>
                <div>
                  <b>{a.name}</b>
                  <small>{a.siteName}</small>
                </div>
                <button className="btn sm" type="button" onClick={() => { store.switchTo(a.id); go("/"); }}>
                  Switch
                </button>
              </div>
            ))}
        <div className="set-row">
          <div>
            <b>Another school or account</b>
            <small>Keep more than one Moodle account on this device and switch between them.</small>
          </div>
          <a className="btn sm" href="#/connect">
            Add account
          </a>
        </div>
        <div className="set-row">
          <div>
            <b>Saved data</b>
            <small>{updated ? `Last updated from Moodle ${ago(Math.floor(updated / 1000))}.` : "Nothing saved yet."} Saved so the app opens instantly and works offline.</small>
          </div>
          <button
            className="btn sm"
            type="button"
            onClick={() => {
              cache.clear(account.id);
              cache.invalidate();
            }}
          >
            Clear and reload
          </button>
        </div>
      </div>
    </section>
  );
}

function AppearanceGroup() {
  const theme = useStore((s) => s.theme);
  const opts: [Theme, string, typeof Sun][] = [
    ["system", "Automatic", Monitor],
    ["light", "Light", Sun],
    ["dark", "Dark", Moon],
  ];
  return (
    <section className="set-group">
      <h2>Appearance</h2>
      <div className="panel">
        <div className="set-row">
          <div>
            <b>Theme</b>
            <small>Automatic follows your device.</small>
          </div>
          <div className="segmented" role="group" aria-label="Theme">
            {opts.map(([id, label, Icon]) => (
              <button key={id} type="button" aria-pressed={theme === id} onClick={() => store.setTheme(id)}>
                <Icon /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CoursesGroup() {
  const { all } = useCourses();
  const main = all.filter((c) => c.byDefault || c.shown);
  const rest = all.filter((c) => !(c.byDefault || c.shown));
  return (
    <section className="set-group">
      <h2>Courses</h2>
      <p className="muted" style={{ marginBottom: 10, fontSize: "0.92rem" }}>
        Course Desk picks this semester's courses from their dates. Switch any on or off, rename them, or change their colour.
      </p>
      <div className="panel" style={{ padding: "2px 18px" }}>
        {main.map((c) => (
          <CourseSetting key={c.id} course={c} />
        ))}
        {rest.length > 0 && (
          <details>
            <summary style={{ cursor: "pointer", padding: "14px 0", fontWeight: 700, borderTop: "1px solid var(--line)" }}>
              {rest.length} other enrolments (earlier semesters and non-course pages)
            </summary>
            {rest.map((c) => (
              <CourseSetting key={c.id} course={c} />
            ))}
          </details>
        )}
      </div>
    </section>
  );
}

function CourseSetting({ course }: { course: Course }) {
  const { account } = useSession();
  const prefs = store.prefs(account.id);
  const [nick, setNick] = useState(prefs.nick?.[course.id] ?? "");
  const set = (fn: (p: typeof prefs) => typeof prefs) => store.setPrefs(account.id, fn);
  const note = course.older ? "Earlier offering" : !course.current ? "Not running this semester" : course.hasCode ? "This semester" : "Not a course";
  return (
    <div className="course-set" style={courseVar(course.color)}>
      <Cover color={course.color} pattern={course.pattern} className="gsquare" />
      <div style={{ minWidth: 0 }}>
        <b>
          {course.code} <span className="muted" style={{ fontWeight: 400 }}>{course.fullname !== course.code ? course.fullname : ""}</span>
        </b>
        <small className="muted" style={{ display: "block", fontSize: "0.84rem" }}>
          {note}
        </small>
        {course.shown && (
          <>
            <input
              type="text"
              id={`nick-${course.id}`}
              aria-label={`Nickname for ${course.code}`}
              placeholder="Nickname (optional)"
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              onBlur={() => set((p) => ({ ...p, nick: { ...p.nick, [course.id]: nick.trim() } }))}
            />
            <div className="swatches" role="group" aria-label={`Colour for ${course.code}`}>
              {Array.from({ length: COLOR_COUNT }, (_, i) => (
                <button key={i} type="button" className="swatch" style={courseVar(i)} aria-pressed={course.color === i} aria-label={`Colour ${i + 1}`} onClick={() => set((p) => ({ ...p, color: { ...p.color, [course.id]: i } }))} />
              ))}
            </div>
          </>
        )}
      </div>
      <label className="switch">
        <input type="checkbox" checked={course.shown} aria-label={`Show ${course.code}`} onChange={(e) => set((p) => ({ ...p, shown: { ...p.shown, [course.id]: e.target.checked } }))} />
        <span />
      </label>
    </div>
  );
}

function KeyGroup() {
  const { account } = useSession();
  const { toast } = useUi();
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const save = async () => {
    const m = /[0-9a-f]{32}/i.exec(key);
    if (!m) return setErr("A key is 32 letters and numbers. Copy it again from Moodle.");
    setBusy(true);
    setErr("");
    try {
      const info = await api.getSite(httpTransport(account.site, m[0].toLowerCase()));
      if (info.userid !== account.userid) throw new Error("That key belongs to a different Moodle account. Use Add account for that one.");
      store.updateToken(account.id, m[0].toLowerCase());
      cache.invalidate();
      setEditing(false);
      setKey("");
      toast("Key replaced.");
    } catch (e) {
      setErr(e instanceof Error && !("code" in e) ? e.message : explain(e).text);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="set-group">
      <h2>Your key</h2>
      <div className="panel">
        <div className="set-row">
          <div>
            <b>Moodle key</b>
            <small>Saved in this browser and sent only to {account.site.replace(/^https?:\/\//, "")}. Keys expire; when yours does, replace it here.</small>
          </div>
          {!editing && (
            <button className="btn sm" type="button" onClick={() => setEditing(true)}>
              Replace key
            </button>
          )}
        </div>
        {editing && (
          <div className="set-row">
            <div className="field" style={{ margin: 0, flex: "1 1 100%" }}>
              <label htmlFor="newkey">New key</label>
              <input id="newkey" className="key" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" spellCheck={false} placeholder="Paste the key from Moodle" />
              <small>
                Get it from <a href={`${account.site}/user/managetoken.php`} target="_blank" rel="noopener noreferrer">Security keys on Moodle</a>, next to Moodle mobile web service.
              </small>
              {err && <span className="err">{err}</span>}
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button className="btn primary sm" type="button" disabled={busy} onClick={save}>
                  {busy ? "Checking" : "Save key"}
                </button>
                <button className="btn sm ghost" type="button" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="set-row">
          <div>
            <b>Remove this account</b>
            <small>Deletes the key and everything saved for this account from this browser.</small>
          </div>
          <button
            className="btn sm danger"
            type="button"
            onClick={() => {
              if (!confirm) {
                setConfirm(true);
                setTimeout(() => setConfirm(false), 4000);
                return;
              }
              store.removeAccount(account.id);
              go("/");
            }}
          >
            {confirm ? "Tap again to remove" : "Remove"}
          </button>
        </div>
      </div>
    </section>
  );
}

function ShareGroup() {
  const { account } = useSession();
  const { toast } = useUi();
  const [copied, setCopied] = useState(false);
  const link = `${NATIVE ? PUBLIC_URL : location.origin + location.pathname}?site=${encodeURIComponent(account.site)}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      (document.getElementById("share-link") as HTMLInputElement | null)?.select();
      toast("Select the link and copy it.");
    }
  };
  return (
    <section className="set-group">
      <h2>Invite classmates</h2>
      <div className="panel">
        <div className="set-row">
          <div>
            <b>Share Course Desk with your school filled in</b>
            <small>The link only includes your school's address. Each person connects with their own key, and nobody can see anyone else's data.</small>
            <input id="share-link" readOnly value={link} onFocus={(e) => e.target.select()} style={{ width: "100%", marginTop: 10, height: 38, padding: "0 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", fontFamily: "var(--mono)", fontSize: 14 }} aria-label="Invite link" />
          </div>
          <button className="btn sm" type="button" onClick={copy}>
            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>
    </section>
  );
}

function AboutGroup() {
  return (
    <section className="set-group">
      <h2>How your data is handled</h2>
      <div className="panel panel-pad" style={{ color: "var(--ink-2)", display: "grid", gap: 8 }}>
        <p>Course Desk has no server and no database. Your browser talks straight to your school's Moodle using your key, the same way the Moodle mobile app does.</p>
        <p>Your key, your courses and your saved data stay in this browser. Removing the account deletes them.</p>
        <p className="muted" style={{ fontSize: "0.86rem" }}>Course Desk isn't made by Moodle or by your school.</p>
      </div>
    </section>
  );
}
