import type { BulkSchedule, WorkLocation, WorkWeek } from '../../lib/api/schedule';

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

// Parses a 'YYYY-MM-DD' date-only string as local midnight. `new Date(str)`
// on a bare date-only string parses it as UTC per spec — reading local
// getters (getDate/getMonth) off that result silently shifts the calendar
// date by a day in timezones behind/ahead of UTC. Same class of bug already
// guarded against elsewhere in this app (DateTimeField's own date parsing);
// always use this instead of handing a date-only string to `new Date()`.
export function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// "Week 38 (Sep 15 – Sep 21, 2026)" — month-then-day, matching how this
// range is meant to read as a whole label; deliberately not `formatDayMonth`
// above, which is day-then-month for a different context (shift time
// ranges). Takes the authoritative WorkWeek fields directly (from
// GET /employee/work-weeks/) rather than computing a week number
// client-side — the backend is the source of truth for week numbering and
// for which weeks are even selectable (it already excludes past weeks).
export function formatWeekLabel(week: Pick<WorkWeek, 'week_number' | 'start_date' | 'end_date'>): string {
  const start = parseDateOnly(week.start_date);
  const end = parseDateOnly(week.end_date);
  const startLabel = `${MONTH_SHORT[start.getMonth()]} ${start.getDate()}`;
  const endLabel = `${MONTH_SHORT[end.getMonth()]} ${end.getDate()}`;
  return `Week ${week.week_number} (${startLabel} – ${endLabel}, ${end.getFullYear()})`;
}

export function locationLabel(workLocation: WorkLocation | null): string {
  return workLocation ? `${workLocation.name} - ${workLocation.client_name}` : 'No location assigned';
}

function addDaysToDate(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

// Monday of the week containing `date` — plain calendar-day arithmetic, not
// ISO week *numbering* (that stays server-owned everywhere in this app — see
// resolveBulkScheduleWeek below). Only needed as a fallback for a bulk
// schedule whose week has already fallen out of the server's "selectable
// weeks" list (a past week).
function mondayOf(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOffset = (start.getDay() + 6) % 7;
  return addDaysToDate(start, -dayOffset);
}

function toDateOnlyString(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

// Prefer the server's own selectable-weeks list (keeps start_date/end_date
// authoritative); fall back to deriving the week's Monday from the earliest
// existing shift's date when the bulk schedule's week has already fallen out
// of that list (a past week) — plain calendar math, not a re-derived week
// *number* (that always comes straight from the bulk schedule itself).
// Shared between BulkScheduleScreen (editing a bulk schedule) and
// BulkScheduleViewScreen (read-only viewing one) — both need a full
// `WorkWeek` (with start_date/end_date) but `BulkSchedule` itself only
// carries week_number/week_year.
export function resolveBulkScheduleWeek(bulkSchedule: BulkSchedule, workWeeks: WorkWeek[]): WorkWeek | undefined {
  const fromServerList = workWeeks.find(
    (week) => week.week_number === bulkSchedule.week_number && week.week_year === bulkSchedule.week_year,
  );
  if (fromServerList) return fromServerList;
  const firstSchedule = bulkSchedule.schedules[0];
  if (!firstSchedule) return undefined;
  const weekStart = mondayOf(new Date(firstSchedule.start_time));
  return {
    week_number: bulkSchedule.week_number,
    week_year: bulkSchedule.week_year,
    start_date: toDateOnlyString(weekStart),
    end_date: toDateOnlyString(addDaysToDate(weekStart, 6)),
  };
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
