import { tokenStore } from './api/utils';
import { isTokenValid, refreshAccessToken } from './api/refresh_token_strategy';
import { store, type AppDispatch } from '../store/store';
import { setUnreadCount, clearUnreadCount } from '../store/slices/notifications-slice';
import queryClient from './query-client';

// WS connections are long-lived, unlike a REST request that gets a fresh
// proactive-refresh check on every call — a token good for 90 more seconds
// at connect time would die mid-session with no request around to trigger
// base_api.ts's own refresh. 2 minutes, not the 1-minute default most REST
// calls use, to buy a little more headroom for that.
const WS_REFRESH_THRESHOLD_MINUTES = 2;

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

// Guards the gap between "decided to open" and "socket actually created" —
// without it, a reconnect firing while an earlier call is still awaiting a
// token refresh could race and open two sockets, since `socket` itself
// stays null for that whole window.
let isOpening = false;

async function openSocket(dispatch: AppDispatch) {
    if (isOpening) return;
    isOpening = true;

    try {
        let token = tokenStore.get();
        if (!token) return;

        if (!isTokenValid(token, WS_REFRESH_THRESHOLD_MINUTES)) {
            // Same fallback as base_api.ts's request interceptor — a failed
            // refresh shouldn't block the connection attempt; let the
            // still-current token try, and if it's truly dead the server
            // will just reject the handshake.
            token = (await refreshAccessToken()) ?? token;
        }

        try {
            socket = new WebSocket(buildSocketUrl(token));
        } catch (error) {
            console.warn('Failed to open notifications socket', error);
            return;
        }
    } finally {
        isOpening = false;
    }

    if (!socket) return;

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
    // Each reconnect re-runs openSocket's own proactive refresh check above,
    // so a token that rotated while this connection was open gets picked up
    // on the next (re)connect — just not instantly while this exact
    // connection is still alive and happens to still work.
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
