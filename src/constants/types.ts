import { Schedule } from "../lib/api/schedule";

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
    /** Fired on mount (with the default today -> today+10 range) and again
     * whenever the user changes either date — the parent is expected to
     * refetch scoped to this range. */
    onRangeChange?: (range: { from: string; to: string }) => void;
}