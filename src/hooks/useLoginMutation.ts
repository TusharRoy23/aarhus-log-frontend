import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { authApi } from '../lib/api/auth';
import { tokenStore } from '../lib/api/utils';
import { useAppDispatch } from '../store/hooks';
import { clearPendingLogin } from '../store/slices/pending-login-slice';
import { setAuth } from '../store/slices/auth-slice';

// Shared by LoginScreen (single-org auto-login) and OrganizationSelectorScreen
// (post-picker login) — both end a `loginLookup` flow the same way: call
// `login`, persist the tokens, save the user/organization into state, clear
// any leftover `pendingLogin` state (a no-op if there wasn't one, e.g. the
// single-org path never sets it), and land on the post-login screen.
export function useLoginMutation() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      tokenStore.set({ access: data.access, refresh: data.refresh });
      dispatch(setAuth({ user: data.user, organization: data.organization }));
      dispatch(clearPendingLogin());
      router.replace('/schedules');
    },
  });
}
