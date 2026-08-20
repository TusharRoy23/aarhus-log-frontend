import baseApi from './base_api';
import { apiPath } from './utils';

export type PermissionActions = {
    add: boolean;
    update: boolean;
    view: boolean;
    delete: boolean;
};

// A `const` object (not a TS `enum`) — enums have quirky JS emit and don't
// interop as cleanly with plain string values; this gives the same
// centralized-names + autocomplete benefit (`Resources.DESIGNATION`
// instead of a raw `'designation'` scattered at every call site) while
// staying a plain string under the hood, which is all `Permissions`
// (a `Record<string, PermissionActions>`) ever needs to index with.
export const Resources = {
    EMPLOYEE: 'employee',
    DESIGNATION: 'designation',
    ORGANIZATION: 'organization',
    SCHEDULE: 'schedule',
    WORKLOCATION: 'worklocation',
} as const;

export type Resource = (typeof Resources)[keyof typeof Resources];

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