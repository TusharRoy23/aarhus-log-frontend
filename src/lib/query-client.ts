import { AppState } from 'react-native';
import { focusManager, QueryClient } from '@tanstack/react-query';

// Tell React Query to treat app coming to foreground as a "focus" event,
// so stale queries refetch when the user returns to the app.
focusManager.setEventListener((onFocus) => {
    const sub = AppState.addEventListener('change', (state) => {
        onFocus(state === 'active');
    });
    return () => sub.remove();
});

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,   // data stays fresh for 5 minutes
            gcTime: 1000 * 60 * 30,     // keep unused data in cache for 30 minutes
            retry: 2,
            refetchOnWindowFocus: false, // handled above via AppState
            refetchOnReconnect: true,
        },
    },
});

export default queryClient;
