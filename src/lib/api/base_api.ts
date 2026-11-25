import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { isTokenValid, refreshAccessToken } from './refresh_token_strategy';
import { tokenStore } from './utils';
import { store, persistor } from '../../store/store';
import { clearAuth } from '../../store/slices/auth-slice';
import { clearPermissions } from '../../store/slices/permissions-slice';
import { resetAssistant } from '../../store/slices/assistant-slice';
import queryClient from '../query-client';
import { disconnectNotificationsSocket } from '../notifications-socket';

// ─── Response Unwrapping ──────────────────────────────────────────────────────
// Shared between both instances below — the backend always wraps a response
// as { data, meta, status, message }; this flattens that one level so
// callers can just read response.data directly.
function unwrapResponse(response: any) {
    if (__DEV__) {
        console.log(`[API] ${response.status} ${response.config.url}`, response.data);
    }
    return {
        ...response,
        data: response.data.data,
        meta: response.data?.meta || {},
        status: response.data?.status,
        message: response.data?.message,
    };
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
    async (config: InternalAxiosRequestConfig) => {
        let token = tokenStore.get();

        if (token && !isTokenValid(token)) {
            token = (await refreshAccessToken()) ?? token;
        }

        if (!token) {
            return Promise.reject(Object.assign(new Error('No access token.'), { config, status: 401 }));
        }

        config.headers.Authorization = `Bearer ${token}`;

        if (__DEV__) {
            console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.data ?? '');
        }

        return config;
    },
    (error: AxiosError) => Promise.reject(error),
);

// ─── Response Interceptor ─────────────────────────────────────────────────────
baseApi.interceptors.response.use(
    unwrapResponse,
    (error: AxiosError) => {
        if (__DEV__) {
            console.warn(`[API] Error ${error.response?.status} ${error.config?.url}`, error.response?.data);
        }

        const status = error.response?.status;

        if (status === 401) {
            tokenStore.clear();
            store.dispatch(clearAuth());
            store.dispatch(clearPermissions());
            store.dispatch(resetAssistant());
            disconnectNotificationsSocket(store.dispatch);
            persistor.purge();
            queryClient.clear();
        }

        return Promise.reject(Object.assign({}, error.response?.data, { status }));
    },
);

// ─── Public (pre-auth) Axios Instance ─────────────────────────────────────────
export const publicApi = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

publicApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (__DEV__) {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.data ?? '');
    }
    return config;
});

publicApi.interceptors.response.use(unwrapResponse, (error: AxiosError) => {
    if (__DEV__) {
        console.warn(`[API] Error ${error.response?.status} ${error.config?.url}`, error.response?.data);
    }
    return Promise.reject(Object.assign({}, error.response?.data, { status: error.response?.status }));
});

// ─── Error Helper ──────────────────────────────────────────────────────────────

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
    if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
        return (error as { message: string }).message;
    }
    return fallback;
}

export default baseApi;
