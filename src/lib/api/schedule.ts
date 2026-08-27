import baseApi from './base_api';
import { apiPath } from './utils';
import type { ShiftStatus } from '../../theme/status';
import { Designation } from './designation';

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

export type Schedule = {
    uuid: string;
    employee: ScheduleEmployee;
    work_location: WorkLocation | null;
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
};

export type ScheduleListParams = {
    /** 'YYYY-MM-DD' */
    from?: string;
    /** 'YYYY-MM-DD' */
    to?: string;
    schedule_type?: ScheduleType;
};

export type StartSchedulePayload = {
    schedule_uuid?: string;
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
    stop: async (): Promise<ActiveScheduleResponse> => {
        const response = await baseApi.post(apiPath(`/employee/stop-schedule/`));
        return response.data;
    },
    getActive: async (): Promise<ActiveScheduleResponse> => {
        const response = await baseApi.get(apiPath(`/employee/active-schedule/`));
        return response.data;
    },
    history: async (params?: ScheduleHistoryParams): Promise<ScheduleHistoryResponse> => {
        const response = await baseApi.get<ScheduleHistoryResponse>(apiPath(`/employee/schedule-history/`), { params });
        return response.data;
    }
};
