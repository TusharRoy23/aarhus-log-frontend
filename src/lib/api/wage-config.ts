import baseApi from './base_api';
import { apiPath } from './utils';
import { PaginatedResponse } from '../../constants/types';
import type { ScheduleEmployee } from './schedule';

// Three independent org-wide wage-adjustment resources, each list + create
// only (no update/delete given) — same shape/precedent as `employeeApi`'s
// own wagesList/createWage. Grouped in one file since they're managed
// together in one "Wage Config" panel, even though each is its own
// endpoint/resource.

export type FestivalWage = {
    uuid: string;
    /** 'YYYY-MM-DD' */
    date: string;
    /** 'HH:MM' */
    start_time: string;
    /** 'HH:MM' */
    end_time: string;
    extra_hourly_rate: number;
    /** Empty means this wage applies to all employees by default. */
    employees: ScheduleEmployee[];
    created_at: string;
    updated_at: string;
};

export type FestivalWagePayload = {
    date: string;
    start_time: string;
    end_time: string;
    extra_hourly_rate: number;
    /** Omit or leave empty to apply to all employees by default. */
    employee_uuids?: string[];
};

export type NightShiftWage = {
    uuid: string;
    /** 'HH:MM' */
    start_time: string;
    /** 'HH:MM' */
    end_time: string;
    hourly_rate: number;
    /** 'YYYY-MM-DD' */
    effective_date: string;
    /** Empty means this wage applies to all employees by default. */
    employees: ScheduleEmployee[];
    created_at: string;
    updated_at: string;
};

export type NightShiftWagePayload = {
    start_time: string;
    end_time: string;
    hourly_rate: number;
    effective_date: string;
    /** Omit or leave empty to apply to all employees by default. */
    employee_uuids?: string[];
};

export type WeekendWage = {
    uuid: string;
    /** 'HH:MM' */
    start_time: string;
    /** 'HH:MM' */
    end_time: string;
    hourly_rate: number;
    /** 'YYYY-MM-DD' */
    effective_date: string;
    /** Empty means this wage applies to all employees by default. */
    employees: ScheduleEmployee[];
    created_at: string;
    updated_at: string;
};

export type WeekendWagePayload = {
    start_time: string;
    end_time: string;
    hourly_rate: number;
    effective_date: string;
    /** Omit or leave empty to apply to all employees by default. */
    employee_uuids?: string[];
};

export type HourSummary = {
    date_from: string;
    date_to: string;
    total_hours: number;
    night_shift_hours: number;
    weekend_hours: number;
    festival_hours: number;
}

const FESTIVAL_WAGES_PATH = '/employee/festival-wages/';
const NIGHT_SHIFT_WAGES_PATH = '/employee/night-shift-wages/';
const WEEKEND_WAGES_PATH = '/employee/weekend-wages/';

export const wageConfigApi = {
    listFestivalWages: async (): Promise<PaginatedResponse<FestivalWage>> => {
        const response = await baseApi.get<PaginatedResponse<FestivalWage>>(apiPath(FESTIVAL_WAGES_PATH));
        return response.data;
    },
    createFestivalWage: async (payload: FestivalWagePayload): Promise<FestivalWage> => {
        const response = await baseApi.post<FestivalWage>(apiPath(FESTIVAL_WAGES_PATH), payload);
        return response.data;
    },
    updateFestivalWage: async (uuid: string, payload: FestivalWagePayload): Promise<FestivalWage> => {
        const response = await baseApi.put<FestivalWage>(apiPath(`${FESTIVAL_WAGES_PATH}${uuid}/`), payload);
        return response.data;
    },
    deleteFestivalWage: async (uuid: string): Promise<void> => {
        await baseApi.delete(apiPath(`${FESTIVAL_WAGES_PATH}${uuid}/`));
    },
    listNightShiftWages: async (): Promise<PaginatedResponse<NightShiftWage>> => {
        const response = await baseApi.get<PaginatedResponse<NightShiftWage>>(apiPath(NIGHT_SHIFT_WAGES_PATH));
        return response.data;
    },
    createNightShiftWage: async (payload: NightShiftWagePayload): Promise<NightShiftWage> => {
        const response = await baseApi.post<NightShiftWage>(apiPath(NIGHT_SHIFT_WAGES_PATH), payload);
        return response.data;
    },
    updateNightShiftWage: async (uuid: string, payload: NightShiftWagePayload): Promise<NightShiftWage> => {
        const response = await baseApi.put<NightShiftWage>(apiPath(`${NIGHT_SHIFT_WAGES_PATH}${uuid}/`), payload);
        return response.data;
    },
    deleteNightShiftWage: async (uuid: string): Promise<void> => {
        const response = await baseApi.delete(apiPath(`${NIGHT_SHIFT_WAGES_PATH}${uuid}/`));
        return response.data;
    },
    listWeekendWages: async (): Promise<PaginatedResponse<WeekendWage>> => {
        const response = await baseApi.get<PaginatedResponse<WeekendWage>>(apiPath(WEEKEND_WAGES_PATH));
        return response.data;
    },
    createWeekendWage: async (payload: WeekendWagePayload): Promise<WeekendWage> => {
        const response = await baseApi.post<WeekendWage>(apiPath(WEEKEND_WAGES_PATH), payload);
        return response.data;
    },
    updateWeekendWage: async (uuid: string, payload: WeekendWagePayload): Promise<WeekendWage> => {
        const response = await baseApi.put<WeekendWage>(apiPath(`${WEEKEND_WAGES_PATH}${uuid}/`), payload);
        return response.data;
    },
    deleteWeekendWage: async (uuid: string): Promise<void> => {
        await baseApi.delete(apiPath(`${WEEKEND_WAGES_PATH}${uuid}/`));
    },
    hourSummary: async (dateFrom: string, dateTo: string): Promise<HourSummary> => {
        const response = await baseApi.get<HourSummary>(apiPath(`/employee/hours-summary/`), {
            params: { from: dateFrom, to: dateTo },
        });
        return response.data;
    }
};
