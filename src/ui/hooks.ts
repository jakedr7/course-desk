import { useEffect, useState } from "react";

/** Current time in seconds, updated every `everyMs` so countdowns stay true. */
export function useNow(everyMs = 30_000): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const i = setInterval(() => setNow(Math.floor(Date.now() / 1000)), everyMs);
    return () => clearInterval(i);
  }, [everyMs]);
  return now;
}

/** Plays an entrance animation once per visit, not on every re-render. */
const played = new Set<string>();
export function useOnce(key: string): boolean {
  const [first] = useState(() => !played.has(key));
  useEffect(() => {
    played.add(key);
  }, [key]);
  return first;
}
