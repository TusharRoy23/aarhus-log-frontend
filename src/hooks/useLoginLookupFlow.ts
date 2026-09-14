import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { authApi, type LoginLookupPayload } from '../lib/api/auth';
import { useAppDispatch } from '../store/hooks';
import { setPendingLogin } from '../store/slices/pending-login-slice';
import { useLoginMutation } from './useLoginMutation';

// Used by LoginScreen to go from {email, password} to a finished session:
// look up which organizations the account belongs to, then either log
// straight in (exactly one org) or hand off to the organization-selector
// screen (more than one). See useLoginMutation for the login step itself.
// (VerifyOtpScreen deliberately does NOT use this — after OTP verification
// it sends the user to sign in manually rather than auto-logging in.)
export function useLoginLookupFlow() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const loginMutation = useLoginMutation();

  const lookupMutation = useMutation({
    mutationFn: authApi.loginLookup,
    onSuccess: (data, variables) => {
      const organizations = data?.organizations ?? [];
      if (organizations.length === 1) {
        loginMutation.mutate({
          username: variables.email,
          password: variables.password,
          organization_uuid: organizations[0].uuid,
        });
      } else if (organizations.length > 1) {
        dispatch(setPendingLogin({ username: variables.email, password: variables.password, organizations }));
        router.push('/select-organization');
      }
    },
  });

  return {
    submit: (payload: LoginLookupPayload) => lookupMutation.mutate(payload),
    isPending: lookupMutation.isPending || loginMutation.isPending,
    error: loginMutation.error ?? lookupMutation.error,
  };
}
