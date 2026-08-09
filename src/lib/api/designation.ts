import baseApi from './base_api';
import { apiPath } from './utils';

export type Designation = {
    uuid: string;
    name: string;
    is_active: boolean;
    is_owner: boolean;
};

export type DesignationListResponse = {
    results: Designation[];
    count: number;
};

export type CreateDesignationPayload = {
    name: string;
    is_active: boolean;
};

export type UpdateDesignationPayload = {
    name?: string;
    is_active?: boolean;
};

const DESIGNATIONS_PATH = '/employee/designations/';

export const designationApi = {
    list: async (): Promise<DesignationListResponse> => {
        const response = await baseApi.get<DesignationListResponse>(apiPath(DESIGNATIONS_PATH));
        return response.data;
    },
    create: async (payload: CreateDesignationPayload): Promise<Designation> => {
        const response = await baseApi.post<Designation>(apiPath(DESIGNATIONS_PATH), payload);
        return response.data;
    },
    // No confirmed delete endpoint — `is_active` on the entity implies
    // soft-delete via update, so "deactivate" goes through here too.
    update: async (uuid: string, payload: UpdateDesignationPayload): Promise<Designation> => {
        const response = await baseApi.put<Designation>(apiPath(`${DESIGNATIONS_PATH}${uuid}/`), payload);
        return response.data;
    },
};
