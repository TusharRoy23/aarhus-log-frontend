import { Alert } from 'react-native';

// Swap has no API yet, and giving away an already-given-away shift has no
// "cancel" endpoint yet either — both stay a placeholder until those exist.
export function notImplemented(label: string) {
  Alert.alert(label, 'Coming soon.');
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "Thursday, November 19" — the detail header's date title.
export function formatFullDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

// "Thu d. 19 Nov" — the date chip's compact form.
export function formatChipDate(iso: string): string {
  const date = new Date(iso);
  return `${WEEKDAY_SHORT[date.getDay()]} d. ${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`;
}

// 'HH:MM:SS' -> '30 min' / 'No Break' — same convention BulkScheduleWeekGrid's
// own shift-details view uses.
export function formatBreakTime(breakTime: string): string {
  const [hours, minutes] = breakTime.split(':').map(Number);
  const totalMinutes = (hours || 0) * 60 + (minutes || 0);
  return totalMinutes > 0 ? `${totalMinutes} min` : 'No Break';
}

// No currency symbol — this app has no org-level currency setting yet.
export function formatWages(wages: number): string {
  return wages.toFixed(2);
}
