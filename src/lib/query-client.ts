import { AppState } from 'react-native';
import { focusManager, MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { store } from '../store/store';
import { showToast } from '../store/slices/toast-slice';

// Deliberately not imported from base_api.ts, which itself imports this file
// (for queryClient.clear() on 401) — importing getApiErrorMessage back from
// there would make base_api.ts <-> query-client.ts circular. Same small
// extraction logic, kept local instead.
function getErrorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
        return (error as { message: string }).message;
    }
    return fallback;
}

// Tell React Query to treat app coming to foreground as a "focus" event,
// so stale queries refetch when the user returns to the app.
focusManager.setEventListener((onFocus) => {
    const sub = AppState.addEventListener('change', (state) => {
        onFocus(state === 'active');
    });
    return () => sub.remove();
});

// Forbidden/not-found/expired-token requests can't succeed by retrying, so
// skip retries for them; everything else (network blips, 5xx) still gets up
// to 2 retries as before.
function shouldRetry(failureCount: number, error: unknown): boolean {
    const status = (error as { status?: number })?.status;
    if (status === 401 || status === 403 || status === 404) return false;
    return failureCount < 2;
}

// Centralized error toast for 403/404/5xx — fires once a query/mutation
// finally settles into an error state (after retries), not once per raw HTTP
// attempt. This used to live in base_api.ts's response interceptor, which
// runs on every attempt including retries — a single failing query with
// retry: 2 showed the same toast up to 3 times.
//
function dispatchErrorToast(error: unknown, extraToastStatuses?: number[]) {
    const status = (error as { status?: number })?.status;
    const shouldToast =
        status === 403 || status === 404 || (!!status && status >= 500) || (!!status && !!extraToastStatuses?.includes(status));
    if (shouldToast) {
        store.dispatch(
            showToast({
                message: getErrorMessage(error, 'Something went wrong. Please try again.'),
                variant: 'error',
            }),
        );
    }
}

// Some 404s are an expected, normal query result rather than a real error —
// e.g. GET /employee/active-schedule/ 404ing just means "nobody has checked
// in", not a failure worth alarming the user about. A query opts out of the
// toast for specific statuses via `useQuery({ meta: { suppressToastForStatuses: [404] } })`.
// (Separate from `handleMutationError` below since QueryCache/MutationCache's
// onError callbacks have incompatible second-argument types — a Query vs.
// the mutation's variables — so one shared function can't type-check both.)
function handleQueryError(error: unknown, query: { meta?: Record<string, unknown> }) {
    const status = (error as { status?: number })?.status;
    const suppressed = (query.meta?.suppressToastForStatuses as number[] | undefined) ?? [];
    if (status && suppressed.includes(status)) return;
    dispatchErrorToast(error);
}

// 400 is deliberately excluded from the default toast rule above (screens
// generally show validation errors inline via getApiErrorMessage instead —
// see base_api.ts's original reasoning). Some mutations have no inline error
// spot at all though (e.g. the QR-gated Start Shift button) and still need a
// 400 (invalid/expired QR token, etc.) surfaced somewhere — those opt in via
// `useMutation({..., meta: { toastOnStatuses: [400] } })`.
function handleMutationError(error: unknown, _variables: unknown, _onMutateResult: unknown, mutation?: { meta?: Record<string, unknown> }) {
    const extra = mutation?.meta?.toastOnStatuses as number[] | undefined;
    dispatchErrorToast(error, extra);
}

const queryClient = new QueryClient({
    queryCache: new QueryCache({ onError: handleQueryError }),
    mutationCache: new MutationCache({ onError: handleMutationError }),
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,   // data stays fresh for 5 minutes
            gcTime: 1000 * 60 * 30,     // keep unused data in cache for 30 minutes
            retry: shouldRetry,
            refetchOnWindowFocus: false, // handled above via AppState
            refetchOnReconnect: true,
        },
    },
});

export default queryClient;
