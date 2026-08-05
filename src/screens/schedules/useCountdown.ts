import { useEffect, useState } from 'react';

// Live-ticking HH:MM:SS countdown to a target time. Real timer mechanism —
// only the `targetTime` fed into it is sample data (there's no time-tracking
// API yet).
export function useCountdown(targetTime: Date): string {
  const [remainingMs, setRemainingMs] = useState(() => targetTime.getTime() - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMs(targetTime.getTime() - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  const totalSeconds = Math.max(Math.floor(remainingMs / 1000), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((n) => n.toString().padStart(2, '0')).join(':');
}
