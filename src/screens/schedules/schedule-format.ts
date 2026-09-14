import type { WorkLocation } from '../../lib/api/schedule';

// Shared formatting helpers for real `Schedule` records — used by both
// MyScheduleSection and AllSchedulesSection so date/time/location display
// stays consistent between the two tabs.

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatTime(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

// "15 Aug" — day-then-month, fixed order (not `toLocaleDateString`, whose
// day/month order flips by locale) so it reads the same everywhere.
function formatDayMonth(date: Date): string {
  return `${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`;
}

// Shifts commonly span midnight (see CreateShiftScreen), so a bare
// "23:00 - 05:00" is ambiguous about which day is which. Same-day shifts
// show the date once ("15 Aug 08:00 - 16:00"); overnight shifts show it on
// both ends ("15 Aug 23:00 - 16 Aug 05:00").
export function formatTimeRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (start && end && isSameDay(start, end)) {
    return `${formatDayMonth(start)} ${formatTime(start)} - ${formatTime(end)}`;
  }
  return `${formatDayMonth(start)} ${formatTime(start)} - ${formatDayMonth(end)} ${formatTime(end)}`;
}

// For an active (still-running, no end_time yet) schedule — same
// day-then-month + time shape as formatTimeRange's individual halves, just
// for a single open-ended timestamp instead of a start/end pair.
export function formatStartedAt(startIso: string): string {
  const start = new Date(startIso);
  return `Started ${formatDayMonth(start)} ${formatTime(start)}`;
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

// 'YYYY-MM-DD' for "today" in the device's local timezone — the shape
// `scheduleApi.list()`'s `from`/`to` params expect. Shared so every panel
// that needs "today" as a query-key/param default (HomeScreen's Current
// Schedule, MyShiftsPanel's initial selected day) computes it identically.
export function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

export function locationLabel(workLocation: WorkLocation | null): string {
  return workLocation ? `${workLocation.name} - ${workLocation.client_name}` : 'No location assigned';
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
