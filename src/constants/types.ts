import { Schedule, ScheduleTimeScope } from "../lib/api/schedule";

export type PaginatedResponse<T> = {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[]
}

export interface SchedulesSectionProps {
    schedules: Schedule[];
    /** Parent owns the actual fetch — these reflect that query's state so
     * the results area can show its own loading/error state without the
     * whole section (and its own From/To date fields) unmounting. */
    isLoading?: boolean;
    errorMessage?: string;
    /** Fired on mount (with the default today -> today+10 range and
     * ScheduleTimeScope.UPCOMING) and again whenever the user changes the
     * date fields or the Upcoming/Previous toggle — the parent is expected
     * to refetch scoped to these filters. */
    onFiltersChange?: (filters: { from: string; to: string; timeScope: ScheduleTimeScope }) => void;
}