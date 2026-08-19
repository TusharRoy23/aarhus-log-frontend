import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ToastVariant = 'error' | 'success' | 'info';

type ToastState = {
    visible: boolean;
    message: string;
    variant: ToastVariant;
    // Bumped on every showToast — lets the same message shown twice in a
    // row still reset the auto-dismiss timer / replay the entrance
    // animation, since `message`/`variant` alone might not change.
    id: number;
};

const initialState: ToastState = {
    visible: false,
    message: '',
    variant: 'info',
    id: 0,
};

const toastSlice = createSlice({
    name: 'toast',
    initialState,
    reducers: {
        showToast: (state, action: PayloadAction<{ message: string; variant?: ToastVariant }>) => {
            state.visible = true;
            state.message = action.payload.message;
            state.variant = action.payload.variant ?? 'info';
            state.id += 1;
        },
        hideToast: (state) => {
            state.visible = false;
        },
    },
});

export const { showToast, hideToast } = toastSlice.actions;
export default toastSlice.reducer;
