/*
  A small stale-while-revalidate cache. What was loaded last time shows at once
  (also offline), and fresh data replaces it when it arrives. Saved per account.
*/
import { useEffect, useRef, useSyncExternalStore } from "react";

interface Entry {
  data?: unknown;
  error?: unknown;
  at: number;
  stale: boolean;
}

const NO_PERSIST = /^(status|probe):/;

class Cache {
  ns = "";
  map = new Map<string, Entry>();
  inflight = new Map<string, Promise<unknown>>();
  listeners = new Set<() => void>();
  version = 0;
  busy = 0;
  lastSuccess = 0;
  private saveTimer = 0;

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };
  private emit() {
    this.version++;
    this.listeners.forEach((l) => l());
  }

  /** Switch to an account's cache. Quiet when called during render. */
  use(ns: string, quiet = false) {
    if (ns === this.ns) return;
    this.ns = ns;
    this.map = new Map();
    this.inflight = new Map();
    this.lastSuccess = 0;
    if (ns && ns !== "demo") {
      try {
        const saved = JSON.parse(localStorage.getItem(`cd.cache.${ns}`) || "null") as { at: number; entries: [string, Entry][] } | null;
        if (saved) {
          for (const [k, e] of saved.entries) this.map.set(k, { data: e.data, at: e.at, stale: false });
          this.lastSuccess = saved.at || 0;
        }
      } catch {
        /* unreadable cache: start fresh */
      }
    }
    if (quiet) this.version++;
    else this.emit();
  }

  get(key: string) {
    return this.map.get(key);
  }

  fetch<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const running = this.inflight.get(key);
    if (running) return running as Promise<T>;
    const ns = this.ns;
    this.busy++;
    const p = fn()
      .then((data) => {
        if (ns !== this.ns) return data;
        this.map.set(key, { data, at: Date.now(), stale: false });
        this.lastSuccess = Date.now();
        return data;
      })
      .catch((error) => {
        if (ns === this.ns) {
          const prev = this.map.get(key);
          this.map.set(key, { data: prev?.data, at: prev?.at ?? 0, stale: false, error });
        }
        throw error;
      })
      .finally(() => {
        this.inflight.delete(key);
        this.busy--;
        this.emit();
        this.scheduleSave();
      });
    this.inflight.set(key, p);
    this.emit();
    return p;
  }

  /** Mark everything (or keys with a prefix) as needing a refetch. */
  invalidate(prefix = "") {
    for (const [k, e] of this.map) if (k.startsWith(prefix)) this.map.set(k, { ...e, stale: true });
    this.emit();
  }

  clear(ns: string) {
    try {
      localStorage.removeItem(`cd.cache.${ns}`);
    } catch {
      /* ignore */
    }
    if (ns === this.ns) {
      this.map = new Map();
      this.emit();
    }
  }

  private scheduleSave() {
    if (!this.ns || this.ns === "demo") return;
    clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => this.save(), 800);
  }
  private save() {
    const entries: [string, Entry][] = [];
    for (const [k, e] of this.map) if (e.data !== undefined && !NO_PERSIST.test(k)) entries.push([k, { data: e.data, at: e.at, stale: false }]);
    const tryWrite = (list: [string, Entry][]) => localStorage.setItem(`cd.cache.${this.ns}`, JSON.stringify({ at: this.lastSuccess, entries: list }));
    try {
      tryWrite(entries);
    } catch {
      try {
        // storage is full: keep the essentials, drop course contents
        tryWrite(entries.filter(([k]) => !k.startsWith("contents:") && !k.startsWith("grades:")));
      } catch {
        /* give up quietly */
      }
    }
  }
}

export const cache = new Cache();

function useVersion() {
  return useSyncExternalStore(cache.subscribe, () => cache.version, () => cache.version);
}

export interface QueryResult<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  fetching: boolean;
  refresh: () => Promise<unknown>;
}

const isStale = (e: Entry | undefined, staleMs: number) => !e || e.stale || (e.error === undefined && Date.now() - e.at > staleMs);

export function useQuery<T>(key: string | null, fn: () => Promise<T>, staleMs = 5 * 60_000): QueryResult<T> {
  useVersion();
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const entry = key ? cache.get(key) : undefined;
  const stale = !!key && isStale(entry, staleMs);
  useEffect(() => {
    if (key && stale) cache.fetch(key, () => fnRef.current()).catch(() => {});
  }, [key, stale, cache.ns]);
  return {
    data: entry?.data as T | undefined,
    error: entry?.error,
    loading: !!key && entry?.data === undefined && entry?.error === undefined,
    fetching: !!key && cache.inflight.has(key),
    refresh: () => (key ? cache.fetch(key, () => fnRef.current()).catch(() => {}) : Promise.resolve()),
  };
}

/** The same query for many keys at once (e.g. contents of every course). */
export function useQueries<T>(keys: string[], fn: (key: string) => Promise<T>, staleMs = 5 * 60_000): Record<string, QueryResult<T>> {
  useVersion();
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const staleKeys = keys.filter((k) => isStale(cache.get(k), staleMs));
  const sig = staleKeys.join("|");
  useEffect(() => {
    for (const k of staleKeys) cache.fetch(k, () => fnRef.current(k)).catch(() => {});
  }, [sig, cache.ns]);
  const out: Record<string, QueryResult<T>> = {};
  for (const k of keys) {
    const e = cache.get(k);
    out[k] = {
      data: e?.data as T | undefined,
      error: e?.error,
      loading: e?.data === undefined && e?.error === undefined,
      fetching: cache.inflight.has(k),
      refresh: () => cache.fetch(k, () => fnRef.current(k)).catch(() => {}),
    };
  }
  return out;
}

export function useBusy(): boolean {
  useVersion();
  return cache.busy > 0;
}
export function useLastUpdated(): number {
  useVersion();
  return cache.lastSuccess;
}
