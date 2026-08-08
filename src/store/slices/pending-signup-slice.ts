import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RegisterPayload } from '../../lib/api/auth';

// Holds the original sign-up payload between "OTP sent" and "OTP verified"
// so VerifyOtpScreen can: read the email to submit with the OTP, replay the
// exact same payload for "Resend Code", and (email, password) to auto-login
// once verification succeeds via useLoginLookupFlow. Carries a raw password
// — same reasoning as pendingLogin, deliberately kept out of store.ts's
// persist whitelist and never passed as router/query params.

type PendingSignupState = {
    value: RegisterPayload | null;
};

const initialState: PendingSignupState = {
    value: null,
};

const pendingSignupSlice = createSlice({
    name: 'pendingSignup',
    initialState,
    reducers: {
        setPendingSignup: (state, action: PayloadAction<RegisterPayload>) => {
            state.value = action.payload;
        },
        clearPendingSignup: (state) => {
            state.value = null;
        },
    },
});

export const { setPendingSignup, clearPendingSignup } = pendingSignupSlice.actions;
export default pendingSignupSlice.reducer;
