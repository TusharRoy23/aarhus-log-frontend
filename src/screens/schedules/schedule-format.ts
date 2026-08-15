import type { WorkLocation } from '../../lib/api/schedule';

// Shared formatting helpers for real `Schedule` records — used by both
// MyScheduleSection and AllSchedulesSection so date/time/location display
// stays consistent between the two tabs.

export function formatTimeRange(startIso: string, endIso: string): string {
  const format = (iso: string) => {
    const date = new Date(iso);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };
  return `${format(startIso)} - ${format(endIso)}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, tomorrow)) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function locationLabel(workLocation: WorkLocation | null): string {
  return workLocation ? `${workLocation.name} - ${workLocation.client_name}` : 'No location assigned';
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
