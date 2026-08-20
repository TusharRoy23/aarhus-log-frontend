import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { IndividualPermissions, PermissionActions, Permissions, Resource } from '../../lib/api/permission';
import { useAppSelector } from '../hooks';

// Mirrors auth-slice.ts's shape/rationale: a persisted slice populated at
// the same two moments identity is (fresh login, app-relaunch bootstrap
// with a still-valid token) so menu visibility survives a restart without
// waiting on a fresh network round-trip.
//
// Deliberately no runtime dependency on `lib/api/permission.ts` here (only
// `import type`) — that module imports `baseApi`, which itself imports
// `clearPermissions` from this file to clear permissions on a 401. A
// runtime import back to `permission.ts` would make that circular
// (base_api -> permissions-slice -> permission -> base_api). The
// `permissionApi`-dependent fetch helper lives in `permissions-actions.ts`
// instead, which only ever gets imported by call sites that don't feed
// back into `base_api.ts`.

type PermissionsState = {
    isOwner: boolean;
    permissions: Permissions;
};

const initialState: PermissionsState = {
    isOwner: false,
    permissions: {},
};

const permissionsSlice = createSlice({
    name: 'permissions',
    initialState,
    reducers: {
        setPermissions: (state, action: PayloadAction<IndividualPermissions>) => {
            state.isOwner = action.payload.is_owner;
            state.permissions = action.payload.permissions;
        },
        clearPermissions: (state) => {
            state.isOwner = false;
            state.permissions = {};
        },
    },
});

export const { setPermissions, clearPermissions } = permissionsSlice.actions;
export default permissionsSlice.reducer;

// A single hook call that returns a plain `can(resource, action)` function,
// rather than one hook call per resource — React's rules of hooks forbid
// calling a hook a dynamic number of times (e.g. inside a `.map()`), but a
// plain function returned from one hook call can be invoked however many
// times, with whatever resource/action pairs, from anywhere: a data-driven
// list like AppShell's `menuLinks`, a loop, wherever. `is_owner` is an
// unconditional bypass — an owner sees everything even if a given resource
// key happens to be missing from `permissions` (the resource keys are
// explicitly dynamic per the API, not a fixed set).
export function usePermissionCheck(): (resource: Resource, action: keyof PermissionActions) => boolean {
    const { isOwner, permissions } = useAppSelector((state) => state.permissions);
    return (resource, action) => isOwner || Boolean(permissions[resource]?.[action]);
}
