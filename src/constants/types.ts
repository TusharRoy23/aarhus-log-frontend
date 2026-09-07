import { Schedule } from "../lib/api/schedule";

export type PaginatedResponse<T> = {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[]
}

export interface SchedulesSectionProps {
    schedules: Schedule[];
    dateRange?: { from: Date; to: Date };
    onSelectedDateChange?: (dateKey: string) => void;
}