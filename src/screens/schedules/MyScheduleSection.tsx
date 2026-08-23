import { AllSchedulesSection } from './AllSchedulesSection';
import type { Schedule } from '../../lib/api/schedule';

export interface MyScheduleSectionProps {
  /** Already scoped to "mine" by the parent (HomeScreen), which also
   * derives Current Shift from the same data. */
  schedules: Schedule[];
}

// Same day-slider browser Manage Shifts uses for the whole team
// (`AllSchedulesSection` has no team-specific logic — it just renders
// whatever `schedules` it's given behind a DateScroller) — here fed "my"
// shifts instead, starting today and paging forward.
export function MyScheduleSection({ schedules }: MyScheduleSectionProps) {
  return <AllSchedulesSection schedules={schedules} />;
}
