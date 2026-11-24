import { useEffect, useState } from 'react';

// Live-ticking elapsed seconds, seeded from a server-reported `time_spent`
// (seconds) rather than measured purely client-side — the server is the
// source of truth for how long a shift has actually run (e.g. across app
// restarts), this just keeps it visibly ticking between fetches.
// Resets/reseeds whenever `baseSeconds` changes (a fresh active-schedule
// fetch).
export function useElapsedSeconds(baseSeconds: number): number {
  const [elapsed, setElapsed] = useState(baseSeconds);

  useEffect(() => {
    setElapsed(baseSeconds);
    const interval = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [baseSeconds]);

  return elapsed;
}

// Live-ticking HH:MM:SS count-UP timer — formatted wrapper around
// useElapsedSeconds above.
export function useElapsedTimer(baseSeconds: number): string {
  const elapsed = useElapsedSeconds(baseSeconds);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  return [hours, minutes, seconds].map((n) => n.toString().padStart(2, '0')).join(':');
}

// Live 0-1 progress through [startIso, endIso], recomputed every second
// straight from the current wall-clock time (not from a server-reported
// elapsed counter) — so it tracks real time directly, the same way a
// countdown clock would. Clamped to [0, 1] for a start/end pair that's
// already finished or hasn't started yet.
export function useProgress(startIso: string, endIso: string): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (end <= start) return 0;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}
