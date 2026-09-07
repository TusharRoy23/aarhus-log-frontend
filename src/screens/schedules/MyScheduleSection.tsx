import { AllSchedulesSection } from './AllSchedulesSection';
import { SchedulesSectionProps } from '../../constants/types';

export function MyScheduleSection({ schedules, onSelectedDateChange }: SchedulesSectionProps) {
  return <AllSchedulesSection schedules={schedules} onSelectedDateChange={onSelectedDateChange} />;
}
