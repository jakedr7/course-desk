import DOMPurify from "dompurify";
import type { Transport } from "./moodle";

/**
 * Moodle descriptions and announcements are HTML written by lecturers. Clean it,
 * make links open outside the app, and let embedded images load with the key.
 */
export function cleanHtml(html: string, t: Transport): string {
  if (!html) return "";
  const clean = DOMPurify.sanitize(html, {
    FORBID_TAGS: ["style", "form", "input", "button", "iframe", "object", "embed", "video", "audio", "script"],
    FORBID_ATTR: ["style", "class", "id"],
    RETURN_DOM: true,
  }) as HTMLElement;
  clean.querySelectorAll("a[href]").forEach((a) => {
    const href = t.pageUrl(a.getAttribute("href"));
    if (!href) a.removeAttribute("href");
    else {
      a.setAttribute("href", /\/pluginfile\.php\//.test(href) ? (t.fileUrl(href) ?? href) : href);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    }
  });
  clean.querySelectorAll("img[src]").forEach((img) => {
    const src = img.getAttribute("src") || "";
    if (/\/pluginfile\.php\//.test(src)) {
      const u = t.fileUrl(src);
      if (u) img.setAttribute("src", u);
      else img.remove();
    }
    img.setAttribute("loading", "lazy");
    img.setAttribute("referrerpolicy", "no-referrer");
  });
  return clean.innerHTML;
}

/** Text-only version for previews. */
export function textOf(html: string): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}
