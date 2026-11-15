import { tokenStore } from './api/utils';
import { store, type AppDispatch } from '../store/store';
import { setUnreadCount, clearUnreadCount } from '../store/slices/notifications-slice';
import queryClient from './query-client';

// http(s)://host:port/api -> ws(s)://host:port/ws/notifications/ — the
// Channels-style WS endpoint lives at its own root path, not nested under
// /api like the REST endpoints, so the whole pathname is replaced rather
// than appended to.
function buildSocketUrl(token: string): string {
    const apiUrl = new URL(process.env.EXPO_PUBLIC_API_URL!);
    const wsProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${apiUrl.host}/ws/notifications/?token=${encodeURIComponent(token)}`;
}

let socket: WebSocket | null = null;
// Distinguishes a deliberate disconnect() call from the connection just
// dropping on its own — only the latter should trigger a reconnect.
let shouldReconnect = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const RECONNECT_DELAY_MS = 5000;

// Fire-and-forget by design, same as registerForPushNotifications — a
// dropped/failed socket must never block login or app bootstrap. Safe to
// call when already connected (no-op) or with no token (no-op).
export function connectNotificationsSocket(dispatch: AppDispatch) {
    const token = tokenStore.get();
    if (!token) return;
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

    shouldReconnect = true;
    openSocket(dispatch);
}

function openSocket(dispatch: AppDispatch) {
    const token = tokenStore.get();
    if (!token) return;

    try {
        socket = new WebSocket(buildSocketUrl(token));
    } catch (error) {
        console.warn('Failed to open notifications socket', error);
        return;
    }

    socket.onmessage = (event) => {
        try {
            const payload = JSON.parse(event.data);
            if (typeof payload?.count === 'number') {
                const previousCount = store.getState().notifications.unreadCount;
                dispatch(setUnreadCount(payload.count));
                if (payload.count > previousCount) {
                    queryClient.resetQueries({ queryKey: ['notifications'] });
                }
            }
        } catch (error) {
            console.warn('Failed to parse notifications socket message', error);
        }
    };

    socket.onerror = (error) => {
        console.warn('Notifications socket error', error);
    };

    // Covers both a server-initiated drop and a network blip — reconnects
    // with a fixed delay as long as disconnect() hasn't been called since.
    // TODO: an access-token refresh mid-session doesn't currently reopen
    // this with the new token; the socket keeps running on the token it
    // was opened with until it happens to drop on its own.
    socket.onclose = () => {
        socket = null;
        if (shouldReconnect) {
            reconnectTimer = setTimeout(() => openSocket(dispatch), RECONNECT_DELAY_MS);
        }
    };
}

// Called on sign-out (voluntary or forced by a 401) — stops any pending
// reconnect attempt and clears the badge count along with it.
export function disconnectNotificationsSocket(dispatch: AppDispatch) {
    shouldReconnect = false;
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    socket?.close();
    socket = null;
    dispatch(clearUnreadCount());
}
