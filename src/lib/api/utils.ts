import * as SecureStore from 'expo-secure-store';

// ─── API Versioning ───────────────────────────────────────────────────────────
// Endpoint paths don't carry a version on their own — wrap them with `apiPath`
// so every call site is explicit about which version it targets. Defaults to
// v1; pass a version only for the specific endpoints that have moved past it.

export type ApiVersion = 'v1' | 'v2' | 'v3';

export function apiPath(path: string, version: ApiVersion = 'v1'): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `/${version}${normalizedPath}`;
}

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