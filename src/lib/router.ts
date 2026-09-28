import { useSyncExternalStore } from "react";

export type Page = "home" | "calendar" | "courses" | "course" | "grades" | "inbox" | "settings" | "connect";
export interface Route {
  page: Page;
  id?: number;
  tab?: string;
  params: URLSearchParams;
}

const PAGES: Page[] = ["home", "calendar", "courses", "course", "grades", "inbox", "settings", "connect"];

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, "");
  const [path, query = ""] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  const params = new URLSearchParams(query);
  const page = (PAGES as string[]).includes(parts[0]) ? (parts[0] as Page) : "home";
  if (page === "course") {
    const id = Number(parts[1]);
    if (!id) return { page: "courses", params };
    return { page, id, tab: parts[2] || "overview", params };
  }
  return { page, params };
}

function subscribe(l: () => void) {
  window.addEventListener("hashchange", l);
  return () => window.removeEventListener("hashchange", l);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => location.hash, () => "");
  return parseHash(hash);
}

export function go(path: string) {
  const next = path.startsWith("#") ? path : `#${path}`;
  if (location.hash !== next) location.hash = next;
}
