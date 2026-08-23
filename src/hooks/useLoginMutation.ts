import { useMutation } from '@tanstack/react-query';
import { authApi } from '../lib/api/auth';
import { tokenStore } from '../lib/api/utils';
import { useAppDispatch } from '../store/hooks';
import { clearPendingLogin } from '../store/slices/pending-login-slice';
import { setAuth } from '../store/slices/auth-slice';
import { fetchAndStorePermissions } from '../store/permissions-actions';

// Shared by LoginScreen (single-org auto-login) and OrganizationSelectorScreen
// (post-picker login) — both end a `loginLookup` flow the same way: call
// `login`, persist the tokens, save the user/organization into state, clear
// any leftover `pendingLogin` state (a no-op if there wasn't one, e.g. the
// single-org path never sets it), and land on the post-login screen.
export function useLoginMutation() {
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      tokenStore.set({ access: data.access, refresh: data.refresh });
      dispatch(setAuth({ user: data.user, organization: data.organization }));
      dispatch(clearPendingLogin());
      // Fire-and-forget — menu visibility shouldn't block landing on the
      // post-login screen; it fills in the moment the fetch resolves.
      fetchAndStorePermissions(dispatch);
      // No `router.replace('/home')` here — `_layout.tsx`'s
      // `useProtectedRoute` already reacts to `isAuthenticated` flipping
      // true while sitting on `/` (from `setAuth()` above) and redirects to
      // `/home` itself. Calling it here too raced with that reactive
      // redirect — same double-navigation bug fixed on the sign-out/401
      // paths in AppShell.tsx/base_api.ts.
    },
  });
}
