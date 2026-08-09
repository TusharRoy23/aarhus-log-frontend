import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { router } from 'expo-router';
import { isTokenValid, refreshAccessToken } from './refresh_token_strategy';
import { tokenStore } from './utils';
import { store, persistor } from '../../store/store';
import { clearAuth } from '../../store/slices/auth-slice';

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
    async (config: InternalAxiosRequestConfig) => {
        let token = tokenStore.get();

        if (token && !isTokenValid(token)) {
            // Refresh failed? Fall back to the old token as-is — if it's
            // truly dead the request 401s and the response interceptor
            // below clears the session; a network blip shouldn't force
            // that just because this proactive check failed too.
            token = (await refreshAccessToken()) ?? token;
        }

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
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
            // Session is genuinely dead (bad/expired token rejected outright,
            // not just proactively refreshed) — clear everything and bounce
            // back to the login screen.
            tokenStore.clear();
            store.dispatch(clearAuth());
            persistor.purge();
            router.replace('/');
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
