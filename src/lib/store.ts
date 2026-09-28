/*
  Accounts and preferences, kept in this browser only.
  A key never leaves the browser except in requests to its own Moodle site.
*/
import { useSyncExternalStore } from "react";
import type { CoursePrefs } from "./courses";

export interface Account {
  id: string;
  site: string;
  token: string;
  userid: number;
  name: string;
  first: string;
  siteName: string;
  demo?: boolean;
}

export type Theme = "system" | "light" | "dark";

export interface Prefs extends CoursePrefs {
  /** Files changed after this time count as unseen on the Files view. */
  seenFiles?: number;
  /** Announcements after this time count as unread. */
  seenNews?: number;
}

interface State {
  accounts: Account[];
  active: string | null;
  prefs: Record<string, Prefs>;
  theme: Theme;
}

const K = { accounts: "cd.accounts", active: "cd.active", prefs: "cd.prefs", theme: "cd.theme" };

function read<T>(k: string, fallback: T): T {
  try {
    const v = localStorage.getItem(k);
    return v == null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}
function write(k: string, v: unknown) {
  try {
    if (v === undefined) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* storage full or blocked: the app keeps working for this visit */
  }
}

let state: State = {
  accounts: read<Account[]>(K.accounts, []),
  active: read<string | null>(K.active, null),
  prefs: read<Record<string, Prefs>>(K.prefs, {}),
  theme: read<Theme>(K.theme, "system"),
};
let demoAccount: Account | null = null;

const listeners = new Set<() => void>();
function set(next: Partial<State>) {
  state = { ...state, ...next };
  if ("accounts" in next) write(K.accounts, state.accounts);
  if ("active" in next) write(K.active, state.active);
  if ("prefs" in next) write(K.prefs, state.prefs);
  if ("theme" in next) write(K.theme, state.theme);
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export const DEMO_ID = "demo";

export const store = {
  get: () => state,
  subscribe,
  activeAccount(): Account | null {
    if (state.active === DEMO_ID) return demoAccount;
    return state.accounts.find((a) => a.id === state.active) ?? null;
  },
  addAccount(a: Account) {
    const others = state.accounts.filter((x) => x.id !== a.id);
    set({ accounts: [...others, a], active: a.id });
  },
  switchTo(id: string) {
    set({ active: id });
  },
  startDemo(a: Account) {
    demoAccount = a;
    set({ active: DEMO_ID });
  },
  leaveDemo() {
    demoAccount = null;
    set({ active: state.accounts[0]?.id ?? null });
  },
  removeAccount(id: string) {
    const accounts = state.accounts.filter((a) => a.id !== id);
    const prefs = { ...state.prefs };
    delete prefs[id];
    try {
      localStorage.removeItem(`cd.cache.${id}`);
    } catch {
      /* ignore */
    }
    set({ accounts, prefs, active: state.active === id ? (accounts[0]?.id ?? null) : state.active });
  },
  updateToken(id: string, token: string) {
    set({ accounts: state.accounts.map((a) => (a.id === id ? { ...a, token } : a)) });
  },
  prefs(id: string): Prefs {
    return state.prefs[id] ?? {};
  },
  setPrefs(id: string, fn: (p: Prefs) => Prefs) {
    set({ prefs: { ...state.prefs, [id]: fn(state.prefs[id] ?? {}) } });
  },
  setTheme(theme: Theme) {
    set({ theme });
  },
};

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(state), () => select(state));
}
export function useActiveAccount(): Account | null {
  useStore((s) => s.active);
  useStore((s) => s.accounts);
  return store.activeAccount();
}
export function usePrefs(id: string | undefined): Prefs {
  return useStore((s) => (id ? (s.prefs[id] ?? EMPTY) : EMPTY));
}
const EMPTY: Prefs = {};
