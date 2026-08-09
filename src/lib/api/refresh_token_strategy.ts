import axios, { AxiosError } from 'axios';
import { apiPath, tokenStore } from './utils';

// ─── Token Refresh ────────────────────────────────────────────────────────────
// Proactive refresh: every outgoing request checks whether the access token
// is still valid more than REFRESH_THRESHOLD_MINUTES from now, and if not,
// refreshes before the request goes out rather than waiting for a 401.
// Concurrent requests that all notice this at once share one in-flight
// refresh (`refreshPromise`) instead of each firing their own — they all
// await the same promise and resume with whatever token it resolves to.
//
// The refresh call itself goes through a bare axios instance, not `baseApi`
// — it doesn't need (or want) this same interceptor re-running on it, and it
// doesn't carry an Authorization header, only the refresh token in the body.

const REFRESH_THRESHOLD_MINUTES = 1;

// Hermes (React Native's JS engine) has no global atob/btoa the way browsers
// do — confirmed absent from both react-native's and expo's source, and no
// polyfill installed — so this can't just call atob() directly. Same idea,
// portable across web + iOS + Android.
function base64UrlDecode(input: string): string {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let output = '';
    let buffer = 0;
    let bits = 0;

    for (const char of base64) {
        if (char === '=') break;
        const value = chars.indexOf(char);
        if (value === -1) continue;
        buffer = (buffer << 6) | value;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            output += String.fromCharCode((buffer >> bits) & 0xff);
        }
    }
    return output;
}

export function isTokenValid(accessToken: string | null, thresholdMinutes = REFRESH_THRESHOLD_MINUTES): boolean {
    const parts = accessToken?.split('.');
    if (!parts || parts.length !== 3) {
        return false;
    }

    try {
        const payload = JSON.parse(base64UrlDecode(parts[1]));
        const expirationTimeInMilliseconds = payload.exp * 1000;
        const thresholdTime = expirationTimeInMilliseconds - thresholdMinutes * 60 * 1000;
        return thresholdTime > Date.now();
    } catch {
        return false;
    }
}

const refreshApi = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

type RefreshTokenResponse = {
    access: string;
    refresh?: string;
};

let refreshPromise: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
    if (refreshPromise) {
        return refreshPromise;
    }

    const currentRefreshToken = tokenStore.getRefreshToken();
    if (!currentRefreshToken) {
        return Promise.resolve(null);
    }

    refreshPromise = refreshApi
        .post<{ data: RefreshTokenResponse }>(apiPath('/user/refresh-token/'), { refresh: currentRefreshToken })
        .then((response) => {
            const payload = response.data?.data;
            if (!payload?.access) {
                throw new Error('Refresh response missing access token');
            }
            tokenStore.set({ access: payload.access, refresh: payload.refresh });
            return payload.access;
        })
        .catch((err: AxiosError) => {
            console.error('Failed to refresh access token', err);
            if (err.response) {
                // The server actually rejected the refresh token itself
                // (expired/invalid) — force logout. A network error or
                // similar shouldn't wipe the session; just leave the old
                // token in place and let the next request try again.
                tokenStore.clear();
            }
            return null;
        })
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
}