import { useMutation } from '@tanstack/react-query';
import { authApi } from '../lib/api/auth';
import { tokenStore } from '../lib/api/base_api';
import { useAppDispatch } from '../store/hooks';
import { clearPendingLogin } from '../store/slices/pending-login-slice';
import { setAuth } from '../store/slices/auth-slice';

// Shared by LoginScreen (single-org auto-login) and OrganizationSelectorScreen
// (post-picker login) — both end a `loginLookup` flow the same way: call
// `login`, persist the tokens, save the user/organization into state, and
// clear any leftover `pendingLogin` state (a no-op if there wasn't one, e.g.
// the single-org path never sets it).
export function useLoginMutation() {
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      tokenStore.set({ access: data.access, refresh: data.refresh });
      dispatch(setAuth({ user: data.user, organization: data.organization }));
      dispatch(clearPendingLogin());
    },
  });
}
