import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, OtpInput } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { authApi } from '../../lib/api/auth';
import { getApiErrorMessage } from '../../lib/api/base_api';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { clearPendingSignup } from '../../store/slices/pending-signup-slice';

export function VerifyOtpScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const pendingFromStore = useAppSelector((state) => state.pendingSignup.value);
  // Freeze on mount, same reasoning as OrganizationSelectorScreen: this
  // screen only ever gets here via SignUpScreen dispatching setPendingSignup
  // right before navigating, so a stale/absent value at mount time means the
  // user landed here directly and needs to sign up again.
  const [pending] = useState(pendingFromStore);

  const [otp, setOtp] = useState('');
  const [resent, setResent] = useState(false);

  const verifyMutation = useMutation({
    mutationFn: authApi.verifyOtp,
    onSuccess: () => {
      dispatch(clearPendingSignup());
    },
  });

  const resendMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      setResent(true);
      setOtp('');
    },
  });

  useEffect(() => {
    if (!pending) {
      router.replace('/sign-up');
    }
  }, [pending, router]);

  if (!pending) {
    return null;
  }

  const handleVerify = () => {
    setResent(false);
    verifyMutation.mutate({ email: pending.email, otp });
  };

  const handleResend = () => {
    resendMutation.mutate(pending);
  };

  const handleGoToLogin = () => {
    router.replace('/');
  };

  const errorMessage = getApiErrorMessage(verifyMutation.error ?? resendMutation.error, '') || undefined;

  return (
    <View style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.logoRow}>
              <MaterialIcons name="workspaces" size={28} color={Colors.primary} />
              <Text style={styles.logoText}>Workspace</Text>
            </View>

            {verifyMutation.isSuccess ? (
              <View style={styles.successGroup}>
                <View style={styles.successIcon}>
                  <MaterialIcons name="check-circle" size={40} color={Colors.primary} />
                </View>

                <View style={[styles.header, styles.centerAlign]}>
                  <Text style={[styles.title, styles.centerText]}>Email verified!</Text>
                  <Text style={[styles.subtitle, styles.centerText]}>
                    Your account has been created successfully. Please sign in to continue.
                  </Text>
                </View>

                <Button
                  label="Sign In"
                  icon={
                    <MaterialIcons name="arrow-forward" size={20} color={Colors.onPrimary} />
                  }
                  onPress={handleGoToLogin}
                />
              </View>
            ) : (
              <>
                <View style={styles.header}>
                  <Text style={styles.title}>Verify your email</Text>
                  <Text style={styles.subtitle}>
                    We sent a 6-digit code to <Text style={styles.emailText}>{pending.email}</Text>.
                  </Text>
                </View>

                <View style={styles.otpGroup}>
                  <Text style={styles.otpLabel}>VERIFICATION CODE</Text>
                  <OtpInput value={otp} onChange={setOtp} autoFocus />
                </View>

                {resent ? <Text style={styles.successText}>A new code has been sent.</Text> : null}
                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                <Button
                  label="Verify"
                  icon={<MaterialIcons name="arrow-forward" size={20} color={Colors.onPrimary} />}
                  loading={verifyMutation.isPending}
                  disabled={otp.length !== 6}
                  onPress={handleVerify}
                />

                <View style={styles.footerRow}>
                  <Text style={styles.subtitle}>Didn't get a code? </Text>
                  <Pressable onPress={handleResend} disabled={resendMutation.isPending} hitSlop={8}>
                    <Text style={styles.link}>{resendMutation.isPending ? 'Sending…' : 'Resend Code'}</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.containerPaddingMobile,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.cardPadding,
    gap: Spacing.unit * 6,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
  },
  logoText: {
    ...Typography.headlineLgMobile,
    fontSize: 20,
    color: Colors.primary,
  },
  header: {
    gap: Spacing.unit,
  },
  title: {
    ...Typography.headlineLg,
    fontSize: 24,
    lineHeight: 30,
    color: Colors.onSurface,
  },
  subtitle: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  emailText: {
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  successGroup: {
    alignItems: 'center',
    gap: Spacing.unit * 6,
  },
  centerAlign: {
    alignItems: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpGroup: {
    gap: Spacing.unit * 2,
  },
  otpLabel: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  successText: {
    ...Typography.bodyMd,
    color: Colors.primary,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  link: {
    ...Typography.bodyMd,
    color: Colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
});
