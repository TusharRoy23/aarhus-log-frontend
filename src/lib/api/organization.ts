import baseApi from './base_api';
import { apiPath } from './utils';

// The full organization-settings record — distinct from `auth.ts`'s own
// lean `Organization` type (`{uuid, name, designation?}`, used only for the
// login/org-selection flow). Same name, different file, same precedent
// already established by `schedule.ts`'s own lean `WorkLocation` vs
// `work-location.ts`'s fuller one — each file's `Organization`/`WorkLocation`
// describes only the shape that endpoint actually returns.
export type Organization = {
    uuid: string;
    name: string;
    slug: string;
    email: string;
    phone: string;
    address: string;
    is_active: boolean;
    qr_generated_at: string | null;
    /** 0-6, Monday-Sunday. */
    weekend_days: number[];
    created_at: string;
    updated_at: string;
};

export type UpdateOrganizationPayload = {
    phone: string;
    address: string;
    /** 0-6, Monday-Sunday. */
    weekend_days: number[];
};

const ORGANIZATION_PATH = '/organization/me/';

export const organizationApi = {
    get: async (): Promise<Organization> => {
        const response = await baseApi.get<Organization>(apiPath(ORGANIZATION_PATH));
        return response.data;
    },
    update: async (payload: UpdateOrganizationPayload): Promise<Organization> => {
        const response = await baseApi.put<Organization>(apiPath(ORGANIZATION_PATH), payload);
        return response.data;
    },
};
