import { useMemo, useState, type FormEvent } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { DEFAULT_SITE } from "../config";
import * as api from "../lib/api";
import { demoTransport } from "../lib/demo";
import { explain, httpTransport, normaliseSite } from "../lib/moodle";
import { go } from "../lib/router";
import { DEMO_ID, store, useStore } from "../lib/store";
import { Logo } from "../ui/Shell";

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
      <section className="connect">
        <form className="connect-card" onSubmit={connect} noValidate>
          <span className="brand welcome-brand">
            <Logo />
            <span>
              <b>Course Desk</b>
              <small>Deadlines, files and grades from Moodle</small>
            </span>
          </span>
          <h2>{adding ? "Add a Moodle account" : "Connect your Moodle"}</h2>
          <p>{adding ? "Connect another school or account. You can switch between them in Settings." : "Sign in with the key from your school's Moodle. It takes about a minute."}</p>

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
