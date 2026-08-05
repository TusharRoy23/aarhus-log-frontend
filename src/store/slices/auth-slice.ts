import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Organization, User } from '../../lib/api/auth';

// The non-secret half of a successful `login` response — who the user is and
// which organization they're currently in. The access/refresh tokens from
// the same response are deliberately NOT stored here: they live in
// `tokenStore` (base_api.ts), encrypted via expo-secure-store, not as plain
// Redux state.

type AuthState = {
    user: User | null;
    organization: Organization | null;
};

const initialState: AuthState = {
    user: null,
    organization: null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setAuth: (state, action: PayloadAction<{ user: User; organization: Organization }>) => {
            state.user = action.payload.user;
            state.organization = action.payload.organization;
        },
        clearAuth: (state) => {
            state.user = null;
            state.organization = null;
        },
    },
});

export const { setAuth, clearAuth } = authSlice.actions;
export default authSlice.reducer;
