/*
  Talking to a Moodle site's web services from the browser.

  Every request goes straight from this browser to the student's own Moodle site.
  Requests are form-encoded POSTs, which Moodle's REST server accepts cross-origin.
*/

export type Params = Record<string, unknown>;

export class MoodleError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/** Moodle wants nested params as `courseids[0]=1&options[timestart]=…`. */
export function flatten(params: Params, prefix = "", out: [string, string][] = []): [string, string][] {
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item !== null && typeof item === "object") flatten(item as Params, `${key}[${i}]`, out);
        else if (item !== undefined && item !== null) out.push([`${key}[${i}]`, scalar(item)]);
      });
    } else if (typeof v === "object") flatten(v as Params, key, out);
    else out.push([key, scalar(v)]);
  }
  return out;
}
const scalar = (v: unknown) => (typeof v === "boolean" ? (v ? "1" : "0") : String(v));

export interface Transport {
  /** Site root, no trailing slash, e.g. https://myelearning.sta.uwi.edu */
  site: string;
  demo: boolean;
  call<T = unknown>(fn: string, params?: Params): Promise<T>;
  /** A link that opens a Moodle file for this user, or null when it can't be opened from here. */
  fileUrl(url: string, opts?: { download?: boolean }): string | null;
  /** A normal link into the Moodle site (opens in the student's browser session). */
  pageUrl(url: string | null | undefined): string | null;
}

/** Turn whatever someone typed ("myelearning.sta.uwi.edu/login/index.php") into a site root. */
export function normaliseSite(input: string): string | null {
  let s = input.trim();
  if (!s) return null;
  if (!/^[a-z]+:\/\//i.test(s)) s = "https://" + s;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  const local = /^(localhost|127\.0\.0\.1)$/.test(u.hostname);
  if (u.protocol !== "https:" && !(u.protocol === "http:" && local)) return null;
  if (!u.hostname.includes(".") && !local) return null;
  const path = u.pathname
    .replace(/\/(login|my|course|user|admin|mod|calendar|webservice|grade|message|pluginfile\.php)(\/.*)?$/i, "")
    .replace(/\/index\.php$/i, "")
    .replace(/\/+$/, "");
  return u.origin + path;
}

export function isKeyError(e: unknown): boolean {
  if (!(e instanceof MoodleError)) return false;
  return /token|accessexception|servicerequireslogin|usernotfullysetup|nopermissions|webservicesnotenabled/i.test(e.code) || /token/i.test(e.message);
}

/** Plain-language explanation of a failure, for the interface. */
export function explain(e: unknown): { title: string; text: string } {
  if (e instanceof MoodleError) {
    switch (e.code) {
      case "offline":
        return { title: "You're offline", text: "Connect to the internet and try again. What was loaded before is still shown." };
      case "network":
        return {
          title: "Couldn't reach the site",
          text: "The site didn't answer. It may be down, the address may be wrong, or it may not allow apps like this to connect from a browser.",
        };
      case "notmoodle":
        return { title: "That isn't a Moodle site", text: "The address answered, but not like Moodle does. Check it's the address you use to sign in." };
      case "invalidtoken":
      case "invalidtimedtoken":
        return {
          title: "Your key was rejected",
          text: "Keys expire, and resetting one on Moodle replaces the old one. Get the current key and paste it again.",
        };
      case "accessexception":
        return {
          title: "Moodle won't accept this key",
          text: "The key was read but isn't allowed to be used. Make sure you copied the key on the Moodle mobile web service row, or tap Reset on that row and paste the new key." + (e.message && !/access control exception/i.test(e.message) ? ` Moodle said: ${e.message}` : ""),
        };
      case "webservicesnotenabled":
      case "enablewsdescription":
        return { title: "This site doesn't allow apps", text: "Your school has switched off Moodle's mobile web services, so apps like this can't connect." };
      default:
        return { title: "Moodle refused the request", text: e.message || "Try again in a moment." };
    }
  }
  return { title: "Something went wrong", text: e instanceof Error ? e.message : "Try again in a moment." };
}

export function httpTransport(site: string, token: string): Transport {
  const origin = new URL(site).origin;
  return {
    site,
    demo: false,
    async call<T>(fn: string, params: Params = {}): Promise<T> {
      const body = new URLSearchParams([
        ["wstoken", token],
        ["wsfunction", fn],
        ["moodlewsrestformat", "json"],
        ...flatten(params),
      ]);
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 30000);
      let res: Response;
      try {
        res = await fetch(`${site}/webservice/rest/server.php`, {
          method: "POST",
          // a plain string body works both in browsers and through the phone app's native HTTP
          body: body.toString(),
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          signal: ctl.signal,
          cache: "no-store",
          credentials: "omit",
          referrerPolicy: "no-referrer",
        });
      } catch {
        throw new MoodleError(navigator.onLine === false ? "offline" : "network", "The site couldn't be reached.");
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) throw new MoodleError(res.status === 404 ? "notmoodle" : "http", `The site answered with an error (HTTP ${res.status}).`);
      let json: unknown;
      try {
        json = await res.json();
      } catch {
        throw new MoodleError("notmoodle", "The site didn't answer like Moodle.");
      }
      if (json && typeof json === "object" && !Array.isArray(json) && "exception" in json) {
        const j = json as { errorcode?: string; message?: string; debuginfo?: string };
        const msg = [j.message, j.debuginfo].filter(Boolean).join(" ").trim();
        throw new MoodleError(j.errorcode || "moodle", msg || "Moodle refused the request.");
      }
      return json as T;
    },
    fileUrl(url, opts) {
      try {
        const u = new URL(url);
        if (u.origin !== origin) return null; // the key is only ever attached to the student's own site
        u.pathname = u.pathname.replace(/(^|\/)pluginfile\.php\//, "$1webservice/pluginfile.php/").replace(/webservice\/webservice\//, "webservice/");
        if (opts?.download) u.searchParams.set("forcedownload", "1");
        else u.searchParams.delete("forcedownload");
        u.searchParams.set("token", token);
        return u.toString();
      } catch {
        return null;
      }
    },
    pageUrl(url) {
      if (!url) return null;
      try {
        const u = new URL(url, site + "/");
        return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
      } catch {
        return null;
      }
    },
  };
}
