import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

/** What the activity sheet is showing. */
export interface ActivityTarget {
  course: number;
  module: string;
  instance: number;
  cmid?: number;
  name: string;
  time?: number;
  url?: string | null;
  /** Calendar events that aren't activities (lectures, exams, personal events). */
  event?: { type: string; start: number; duration: number };
}

interface Ui {
  openActivity(t: ActivityTarget): void;
  closeActivity(): void;
  activity: ActivityTarget | null;
  searchOpen: boolean;
  setSearchOpen(v: boolean): void;
  toast(msg: string): void;
}

const UiContext = createContext<Ui | null>(null);
export function useUi(): Ui {
  const u = useContext(UiContext);
  if (!u) throw new Error("No UI context");
  return u;
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [activity, setActivity] = useState<ActivityTarget | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const seq = useRef(0);
  const toast = useCallback((msg: string) => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-2), { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);
  const value = useMemo<Ui>(
    () => ({ openActivity: setActivity, closeActivity: () => setActivity(null), activity, searchOpen, setSearchOpen, toast }),
    [activity, searchOpen, toast],
  );
  return (
    <UiContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            {t.msg}
          </div>
        ))}
      </div>
    </UiContext.Provider>
  );
}
