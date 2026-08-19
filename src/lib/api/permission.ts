import baseApi from './base_api';
import { apiPath } from './utils';

export type PermissionActions = {
    add: boolean;
    update: boolean;
    view: boolean;
    delete: boolean;
};

// Resource keys (employee, designation, organization, schedule,
// worklocation, ...) are dynamic — the backend can add new permission
// categories without a frontend change, so this is a Record, not a fixed
// set of literal keys.
export type Permissions = Record<string, PermissionActions>;

export type IndividualPermissions = {
    is_owner: boolean;
    permissions: Permissions;
};

const PERMISSIONS_PATH = '/employee/permissions/';

export const permissionApi = {
    individualPermissions: async (): Promise<IndividualPermissions> => {
        const response = await baseApi.get<IndividualPermissions>(apiPath(`${PERMISSIONS_PATH}me/`));
        return response.data;
    },
};