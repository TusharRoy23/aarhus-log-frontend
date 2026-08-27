import { useEffect, useState } from 'react';

// Live-ticking HH:MM:SS count-UP timer, seeded from a server-reported
// `time_spent` (seconds) rather than measured purely client-side — the
// server is the source of truth for how long a shift has actually run
// (e.g. across app restarts), this just keeps it visibly ticking between
// fetches. Resets/reseeds whenever `baseSeconds` changes (a fresh
// active-schedule fetch).
export function useElapsedTimer(baseSeconds: number): string {
  const [elapsed, setElapsed] = useState(baseSeconds);

  useEffect(() => {
    setElapsed(baseSeconds);
    const interval = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [baseSeconds]);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  return [hours, minutes, seconds].map((n) => n.toString().padStart(2, '0')).join(':');
}
