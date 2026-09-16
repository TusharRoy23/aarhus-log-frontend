import baseApi from './base_api';
import { apiPath } from './utils';
import type { ShiftStatus } from '../../theme/status';
import { Designation } from './designation';
import { PaginatedResponse } from '../../constants/types';

export type ScheduleEmployee = {
    uuid: string;
    first_name: string;
    last_name: string;
    email: string;
    employee_code: string;
    designation: Designation;
};

export type WorkLocation = {
    uuid: string;
    name: string;
    client_name: string;
};

export type StartMethod = 'qr' | 'manual';

export type Schedule = {
    uuid: string;
    employee: ScheduleEmployee;
    work_location: WorkLocation | null;
    start_method: StartMethod;
    start_time: string;
    end_time: string;
    break_time: string;
    status: ShiftStatus;
    created_at: string;
    updated_at: string;
};

export type ScheduleListResponse = {
    results: Schedule[];
    count: number;
};

export type CreateSchedulePayload = {
    employee_uuid: string;
    work_location_uuid?: string;
    start_time: string;
    end_time: string;
    break_time: string;
    is_scannable: boolean;
};

export type BulkScheduleItem = {
    employee_uuid: string;
    work_location_uuid?: string;
    start_time: string;
    end_time: string;
    break_time: string;
    is_scannable: boolean;
};

export enum BulkScheduleStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
}

export type CreateBulkSchedulePayload = {
    /** week_number from the matching WorkWeek, not a client-computed value. */
    week: number;
    schedules: BulkScheduleItem[];
    status: BulkScheduleStatus;
};

// The authoritative list of selectable weeks for Bulk Schedule — the server
// already excludes past weeks, so the client never needs to compute "today's
// week" or ISO week numbers itself for this feature.
export type WorkWeek = {
    week_number: number;
    week_year: number;
    /** 'YYYY-MM-DD' */
    start_date: string;
    /** 'YYYY-MM-DD' */
    end_date: string;
};

export type WorkWeekListResponse = {
    results: WorkWeek[];
    count: number;
};

export enum ScheduleTimeScope {
    UPCOMING = "upcoming",
    PREVIOUS = "previous"
}

export type ScheduleListParams = {
    /** 'YYYY-MM-DD' */
    from?: string;
    /** 'YYYY-MM-DD' */
    to?: string;
    schedule_type?: ScheduleType;
    time_scope?: ScheduleTimeScope;
};

export type StartSchedulePayload = {
    schedule_uuid?: string;
    qr_token?: string;
}

export type StopSchedulePayload = {
    qr_token?: string;
}

export type ActiveScheduleResponse = {
    uuid: string;
    employee: ScheduleEmployee;
    covering_for: ScheduleEmployee | null;
    schedule: Schedule | null;
    started_via: 'qr' | 'manual';
    start_time: string;
    end_time: string | null;
    expected_end_time: string | null;
    time_spent: number;
    break_time: string | null;
    remarks: string | null;
    created_at: string;
    updated_at: string;
}

export type ScheduleHistoryParams = {
    /** 'YYYY-MM-DD' */
    from?: string;
    /** 'YYYY-MM-DD' */
    to?: string;
};

export type AttendanceStatus = "incomplete" | "completed" | "in_progress";
export type ScheduleStatus = "pending" | "confirmed" | "declined"

export type ScheduleHistory = {
    uuid: string;
    attendance_status: AttendanceStatus;
    schedule_status: ScheduleStatus | null;
    schedule_uuid: string | null;
    is_independent: boolean;
    start_time: string | null;
    end_time: string | null;
    break_time: string | null;
    employee_log_uuid: string | null;
    work_location: WorkLocation | null;
    covering_for: ScheduleEmployee | null;
}

export type ScheduleHistoryResponse = {
    results: ScheduleHistory[];
    count: number;
}

export type BulkSchedule = {
    uuid: string;
    week_number: number;
    week_year: number;
    total_hours: number;
    status: BulkScheduleStatus;
    schedules: Schedule[];
}

export const ScheduleTypes = {
    INDIVIDUAL: 'individual',
    GROUP: 'group',
    ALL: 'all',
}

export type ScheduleType = (typeof ScheduleTypes)[keyof typeof ScheduleTypes];

const SCHEDULES_PATH = '/employee/schedules/';

export const scheduleApi = {
    list: async (params?: ScheduleListParams): Promise<ScheduleListResponse> => {
        const response = await baseApi.get<ScheduleListResponse>(apiPath(SCHEDULES_PATH), { params });
        return response.data;
    },
    create: async (payload: CreateSchedulePayload): Promise<Schedule> => {
        const response = await baseApi.post<Schedule>(apiPath(SCHEDULES_PATH), payload);
        return response.data;
    },
    get: async (uuid: string): Promise<Schedule> => {
        const response = await baseApi.get<Schedule>(apiPath(`${SCHEDULES_PATH}${uuid}/`));
        return response.data;
    },
    update: async (uuid: string, payload: CreateSchedulePayload): Promise<Schedule> => {
        const response = await baseApi.put<Schedule>(apiPath(`${SCHEDULES_PATH}${uuid}/`), payload);
        return response.data;
    },
    delete: async (uuid: string): Promise<void> => {
        await baseApi.delete(apiPath(`${SCHEDULES_PATH}${uuid}/`));
    },
    start: async (payload: StartSchedulePayload): Promise<ActiveScheduleResponse> => {
        const response = await baseApi.post(apiPath(`/employee/start-schedule/`), payload);
        return response.data;
    },
    stop: async (payload: StopSchedulePayload): Promise<ActiveScheduleResponse> => {
        const response = await baseApi.post(apiPath(`/employee/stop-schedule/`), payload);
        return response.data;
    },
    getActive: async (): Promise<ActiveScheduleResponse> => {
        const response = await baseApi.get(apiPath(`/employee/active-schedule/`));
        return response.data;
    },
    history: async (params?: ScheduleHistoryParams): Promise<ScheduleHistoryResponse> => {
        const response = await baseApi.get<ScheduleHistoryResponse>(apiPath(`/employee/schedule-history/`), { params });
        return response.data;
    },
    onGoingShift: async (): Promise<ScheduleListResponse> => {
        const response = await baseApi.get<ScheduleListResponse>(apiPath(`/employee/active-schedules/`));
        return response.data;
    },
    upComingShift: async (): Promise<Schedule> => {
        const response = await baseApi.get<Schedule>(apiPath(`/employee/upcoming-schedule/`));
        return response.data;
    },
    // Response shape unconfirmed — backend endpoint doesn't exist yet as of
    // this writing, built ahead of it per the confirmed request contract.
    bulkCreate: async (payload: CreateBulkSchedulePayload): Promise<BulkSchedule> => {
        const response = await baseApi.post(apiPath(`/employee/bulk-schedules/`), payload);
        return response.data;
    },
    bulkList: async (): Promise<PaginatedResponse<BulkSchedule>> => {
        const response = await baseApi.get(apiPath('/employee/bulk-schedules/'))
        return response.data;
    },
    listWorkWeeks: async (): Promise<WorkWeekListResponse> => {
        const response = await baseApi.get<WorkWeekListResponse>(apiPath(`/employee/work-weeks/`));
        return response.data;
    },
    updateWeeklyShifts: async (payload: CreateBulkSchedulePayload, uuid: string): Promise<BulkSchedule> => {
        const response = await baseApi.put(apiPath(`/employee/bulk-schedules/${uuid}/`), payload);
        return response.data;
    }
};
