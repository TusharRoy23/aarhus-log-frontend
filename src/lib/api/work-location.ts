import baseApi from './base_api';
import { apiPath } from './utils';

export type WorkLocation = {
    uuid: string;
    name: string;
    address: string;
    client_name: string;
    is_active: boolean;
};

export type WorkLocationListResponse = {
    results: WorkLocation[];
    count: number;
};

const WORK_LOCATIONS_PATH = '/employee/work-locations/';

export const workLocationApi = {
    list: async (): Promise<WorkLocationListResponse> => {
        const response = await baseApi.get<WorkLocationListResponse>(apiPath(WORK_LOCATIONS_PATH));
        return response.data;
    },
};
