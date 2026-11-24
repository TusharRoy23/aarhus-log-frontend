import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// Unread count only — pushed live over the notifications WS connection
// (see lib/notifications-socket.ts), not fetched via React Query. Never
// persisted: it's a live server-driven number, a stale copy from the last
// session has no business surviving a relaunch (same reasoning as
// toast-slice/assistant.messages in store.ts).
type NotificationsState = {
    unreadCount: number;
};

const initialState: NotificationsState = {
    unreadCount: 0,
};

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        setUnreadCount: (state, action: PayloadAction<number>) => {
            state.unreadCount = action.payload;
        },
        clearUnreadCount: (state) => {
            state.unreadCount = 0;
        },
    },
});

export const { setUnreadCount, clearUnreadCount } = notificationsSlice.actions;
export default notificationsSlice.reducer;
