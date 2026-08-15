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

const SCHEDULES_PATH = '/employee/schedules/';

export const scheduleApi = {
    list: async (): Promise<ScheduleListResponse> => {
        const response = await baseApi.get<ScheduleListResponse>(apiPath(SCHEDULES_PATH));
        return response.data;
    },
    create: async (payload: CreateSchedulePayload): Promise<Schedule> => {
        const response = await baseApi.post<Schedule>(apiPath(SCHEDULES_PATH), payload);
        return response.data;
    },
};
