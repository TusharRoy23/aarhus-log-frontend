import { permissionApi } from '../lib/api/permission';
import { setPermissions } from './slices/permissions-slice';
import type { AppDispatch } from './store';

// Kept separate from permissions-slice.ts — this needs `permissionApi`
// (which imports `baseApi`), and `base_api.ts` needs `clearPermissions`
// from the slice. Importing this file from `base_api.ts` would create a
// cycle (base_api -> permissions-actions -> permission -> base_api); this
// file is only ever imported by call sites that don't feed back into
// base_api.ts (login success, app bootstrap).
//
// Shared by both fetch trigger points so the try/catch isn't duplicated.
// Fire-and-forget by design — a transient failure here shouldn't wipe out
// or block on menu visibility; whatever was already persisted (if
// anything) stays in place.
export async function fetchAndStorePermissions(dispatch: AppDispatch): Promise<void> {
    try {
        const data = await permissionApi.individualPermissions();
        dispatch(setPermissions(data));
    } catch (err) {
        if (__DEV__) {
            console.warn('Failed to load permissions', err);
        }
    }
}
