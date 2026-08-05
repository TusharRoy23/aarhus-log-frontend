import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Organization } from '../../lib/api/auth';

// Holds the username/password/organizations from a `loginLookup` call that
// came back with more than one organization, so the organization-selector
// screen can finish the flow with `login({ username, password,
// organization_uuid })`. Deliberately left out of the redux-persist
// whitelist in store.ts — it carries a raw password and must never be
// written to disk. Cleared once the flow completes or is abandoned.

export type PendingLogin = {
    username: string;
    password: string;
    organizations: Organization[];
};

type PendingLoginState = {
    value: PendingLogin | null;
};

const initialState: PendingLoginState = {
    value: null,
};

const pendingLoginSlice = createSlice({
    name: 'pendingLogin',
    initialState,
    reducers: {
        setPendingLogin: (state, action: PayloadAction<PendingLogin>) => {
            state.value = action.payload;
        },
        clearPendingLogin: (state) => {
            state.value = null;
        },
    },
});

export const { setPendingLogin, clearPendingLogin } = pendingLoginSlice.actions;
export default pendingLoginSlice.reducer;
