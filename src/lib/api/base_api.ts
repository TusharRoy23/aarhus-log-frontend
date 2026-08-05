import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

// ─── Token Store ──────────────────────────────────────────────────────────────
// Access + refresh tokens for a properly authenticated (logged-in) user. The
// access token is sent as `Authorization: Bearer <token>`. Both are
// persisted via expo-secure-store (encrypted), never via redux-persist/
// AsyncStorage (plaintext) — this is why `pendingLogin`/`auth` stay out of
// store.ts's persist whitelist. `get()`/`getRefreshToken()` stay synchronous
// by reading an in-memory cache, since the request interceptor below can't
// await anything; call `hydrate()` once at app startup to load any
// previously persisted tokens before the first request.

const ACCESS_TOKEN_STORAGE_KEY = 'access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'refresh_token';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let hydrationPromise: Promise<void> | null = null;

export const tokenStore = {
    get: () => accessToken,
    getRefreshToken: () => refreshToken,
    set: (tokens: { access: string; refresh?: string }) => {
        accessToken = tokens.access;
        SecureStore.setItemAsync(ACCESS_TOKEN_STORAGE_KEY, tokens.access).catch((err) => {
            console.error('Failed to persist access token', err);
        });

        if (tokens.refresh) {
            refreshToken = tokens.refresh;
            SecureStore.setItemAsync(REFRESH_TOKEN_STORAGE_KEY, tokens.refresh).catch((err) => {
                console.error('Failed to persist refresh token', err);
            });
        }
    },
    clear: () => {
        accessToken = null;
        refreshToken = null;
        SecureStore.deleteItemAsync(ACCESS_TOKEN_STORAGE_KEY).catch((err) => {
            console.error('Failed to clear persisted access token', err);
        });
        SecureStore.deleteItemAsync(REFRESH_TOKEN_STORAGE_KEY).catch((err) => {
            console.error('Failed to clear persisted refresh token', err);
        });
    },
    hydrate: () => {
        if (!hydrationPromise) {
            hydrationPromise = Promise.all([
                SecureStore.getItemAsync(ACCESS_TOKEN_STORAGE_KEY),
                SecureStore.getItemAsync(REFRESH_TOKEN_STORAGE_KEY),
            ])
                .then(([storedAccess, storedRefresh]) => {
                    accessToken = storedAccess;
                    refreshToken = storedRefresh;
                })
                .catch((err) => {
                    console.error('Failed to load persisted tokens', err);
                });
        }
        return hydrationPromise;
    },
};

// ─── Guest Token Store ─────────────────────────────────────────────────────────
// Separate from the access token above: a temporary token for unauthenticated
// (guest) checkout, scoped to a single verified email, used to create/view
// orders etc. until the user logs in properly. Sent as `X-Guest-Token: <token>`
// — never as Authorization, which is reserved for real logged-in users.
// Persisted (with its expiry and the email it was issued for) so the
// "verified" state survives navigating away and app restarts; treated as
// absent once past `expiresAt`.

export type GuestToken = { token: string; expiresAt: string; email: string };

const GUEST_TOKEN_STORAGE_KEY = 'guest_token';

let guestToken: GuestToken | null = null;
let guestHydrationPromise: Promise<void> | null = null;

function isGuestTokenValid(value: GuestToken | null): value is GuestToken {
    return !!value && new Date(value.expiresAt).getTime() > Date.now();
}

export const guestTokenStore = {
    get: (): GuestToken | null => {
        if (isGuestTokenValid(guestToken)) {
            return guestToken;
        }
        // if (guestToken) {
        //     // Past its expiry — purge the stale token rather than leaving it
        //     // sitting in storage for something else to trip over later.
        //     guestTokenStore.clear();
        // }
        return null;
    },
    set: (token: string, expiresAt: string, email: string) => {
        guestToken = { token, expiresAt, email };
        SecureStore.setItemAsync(GUEST_TOKEN_STORAGE_KEY, JSON.stringify(guestToken)).catch((err) => {
            console.error('Failed to persist guest token', err);
        });
    },
    clear: () => {
        guestToken = null;
        SecureStore.deleteItemAsync(GUEST_TOKEN_STORAGE_KEY).catch((err) => {
            console.error('Failed to clear persisted guest token', err);
        });
    },
    hydrate: () => {
        if (!guestHydrationPromise) {
            guestHydrationPromise = SecureStore.getItemAsync(GUEST_TOKEN_STORAGE_KEY)
                .then((stored) => {
                    guestToken = stored ? JSON.parse(stored) : null;
                })
                .catch((err) => {
                    console.error('Failed to load persisted guest token', err);
                });
        }
        return guestHydrationPromise;
    },
};

// ─── API Versioning ───────────────────────────────────────────────────────────
// Endpoint paths don't carry a version on their own — wrap them with `apiPath`
// so every call site is explicit about which version it targets. Defaults to
// v1; pass a version only for the specific endpoints that have moved past it.

export type ApiVersion = 'v1' | 'v2' | 'v3';

export function apiPath(path: string, version: ApiVersion = 'v1'): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `/${version}${normalizedPath}`;
}

// ─── Axios Instance ───────────────────────────────────────────────────────────

const baseApi = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL,
    // timeout: 10_000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ─── Request Interceptor ──────────────────────────────────────────────────────

baseApi.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = tokenStore.get();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        const guestToken = guestTokenStore.get();
        if (guestToken) {
            config.headers['X-Guest-Token'] = guestToken.token;
        }

        if (__DEV__) {
            console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.data ?? '');
        }

        return config;
    },
    (error: AxiosError) => Promise.reject(error),
);

// ─── Response Interceptor ─────────────────────────────────────────────────────

baseApi.interceptors.response.use(
    (response) => {
        if (__DEV__) {
            console.log(`[API] ${response.status} ${response.config.url}`, response.data);
        }
        return {
            ...response,
            data: response.data.data,
            meta: response.data?.meta || {},
            status: response.data?.status,
            message: response.data?.message
        };
    },
    (error: AxiosError) => {
        if (__DEV__) {
            console.warn(`[API] Error ${error.response?.status} ${error.config?.url}`, error.response?.data);
        }

        if (error.response?.status === 401) {
            tokenStore.clear();
            // TODO: navigate to login screen or trigger token refresh
        }

        return Promise.reject(error.response?.data);
    },
);

// ─── Error Helper ──────────────────────────────────────────────────────────────
// The response interceptor above rejects with `error.response?.data` (the raw
// API error body), not an Axios/Error instance, so callers need this instead
// of reading `.message` off a caught error directly.

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
    if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
        return (error as { message: string }).message;
    }
    return fallback;
}

export default baseApi;
