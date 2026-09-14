import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { type Organization } from '../../lib/api/auth';
import { getApiErrorMessage } from '../../lib/api/base_api';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { clearPendingLogin } from '../../store/slices/pending-login-slice';
import { useLoginMutation } from '../../hooks/useLoginMutation';

export function OrganizationSelectorScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const pendingFromStore = useAppSelector((state) => state.pendingLogin.value);
  // Freeze on mount: this screen only ever gets here via LoginScreen
  // dispatching setPendingLogin right before navigating, so a stale/absent
  // value at mount time means the user landed here directly (e.g. a web
  // refresh) and must log in again. Reading the selector on every render
  // instead would go blank the moment login succeeds and clears the store.
  const [pending] = useState(pendingFromStore);

  const loginMutation = useLoginMutation();

  useEffect(() => {
    if (!pending) {
      router.replace('/');
    }
  }, [pending, router]);

  if (!pending) {
    return null;
  }

  const handleSelect = (organization: Organization) => {
    loginMutation.mutate({
      username: pending.username,
      password: pending.password,
      organization_uuid: organization.uuid,
    });
  };

  const handleUseDifferentAccount = () => {
    dispatch(clearPendingLogin());
    router.replace('/');
  };

  const errorMessage = getApiErrorMessage(loginMutation.error, '') || undefined;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.brandLogoBox}>
            <MaterialIcons name="domain" size={20} color={Colors.onPrimary} />
          </View>
          <Text style={styles.brandTitle}>Workspace</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.intro}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Select an organization to continue</Text>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.list}>
          {pending.organizations.map((organization) => {
            const isSelecting =
              loginMutation.isPending && loginMutation.variables?.organization_uuid === organization.uuid;

            return (
              <Pressable
                key={organization.uuid}
                style={styles.card}
                disabled={loginMutation.isPending}
                onPress={() => handleSelect(organization)}
              >
                <View style={styles.cardAvatar}>
                  <Text style={styles.cardAvatarText}>{organization.name.charAt(0).toUpperCase()}</Text>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>{organization.name}</Text>
                    {organization.designation ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{organization.designation}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {isSelecting ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <MaterialIcons name="chevron-right" size={20} color={Colors.outline} />
                )}
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={handleUseDifferentAccount} disabled={loginMutation.isPending}>
          <Text style={styles.differentAccountLink}>Use a different account</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.containerPaddingMobile,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    backgroundColor: Colors.surface,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 3,
  },
  brandLogoBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.DEFAULT,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    ...Typography.titleMd,
    color: Colors.primary,
  },
  scrollContent: {
    padding: Spacing.containerPaddingMobile,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.unit * 6,
  },
  intro: {
    gap: Spacing.unit,
  },
  title: {
    ...Typography.headlineLgMobile,
    color: Colors.onSurface,
  },
  subtitle: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
  list: {
    gap: Spacing.gutter,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gutter,
    padding: Spacing.cardPadding,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
  },
  cardAvatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.DEFAULT,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarText: {
    ...Typography.titleMd,
    color: Colors.primary,
  },
  cardBody: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
  },
  cardTitle: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  badge: {
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: Spacing.unit * 2,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeText: {
    ...Typography.labelSm,
    color: Colors.onSecondaryContainer,
  },
  differentAccountLink: {
    ...Typography.bodyMd,
    color: Colors.primary,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
});
