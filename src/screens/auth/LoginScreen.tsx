import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { Button, Checkbox, PasswordField, TextField } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';

const WIDE_BREAKPOINT = 768;

export function LoginScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => setSubmitting(false), 1500);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, isWide && styles.cardWide]}>
            {isWide ? <BrandPanel /> : null}

            <View style={[styles.form, isWide && styles.formWide]}>
              <View style={styles.mobileLogo}>
                <MaterialIcons name="workspaces" size={28} color={Colors.primary} />
                <Text style={styles.mobileLogoText}>Workspace</Text>
              </View>

              <View style={styles.header}>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Please enter your details to access your workspace.</Text>
              </View>

              <TextField
                label="Email Address"
                icon={<MaterialIcons name="mail" size={20} color={Colors.outline} />}
                placeholder="name@company.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <PasswordField
                label="Password"
                value={password}
                onChangeText={setPassword}
                labelRight={<Text style={styles.forgotLink}>Forgot Password?</Text>}
              />

              <View style={styles.rememberRow}>
                <Checkbox checked={rememberMe} onChange={setRememberMe} />
                <Text style={styles.rememberLabel}>Remember me for 30 days</Text>
              </View>

              <Button
                label="Login"
                icon={<MaterialIcons name="arrow-forward" size={20} color={Colors.onPrimary} />}
                loading={submitting}
                onPress={handleSubmit}
              />

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                <View style={styles.divider} />
              </View>

              <Button
                label="Sign in with Google"
                variant="secondary"
                icon={<FontAwesome name="google" size={18} color={Colors.onSurface} />}
                style={styles.googleButton}
              />

              <View style={styles.footerRow}>
                <Text style={styles.subtitle}>Don't have an account? </Text>
                <Link href="/sign-up" replace style={styles.link}>
                  Request Access
                </Link>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function BrandPanel() {
  return (
    <View style={styles.brandPanel}>
      <View style={styles.brandDecorLarge} />
      <View style={styles.brandDecorSmall} />

      <View style={styles.brandHeader}>
        <View style={styles.brandLogoBox}>
          <MaterialIcons name="workspaces" size={22} color={Colors.primary} />
        </View>
        <Text style={styles.brandTitle}>Workspace</Text>
      </View>

      <View style={styles.brandCopy}>
        <Text style={styles.brandHeadline}>Manage your physical and digital resources.</Text>
        <Text style={styles.brandSubtext}>
          The enterprise-grade solution for department heads and facility managers who require
          frictionless coordination.
        </Text>
      </View>

      <View style={styles.brandFooter}>
        <View style={styles.avatarStack}>
          {AVATAR_URLS.map((uri, index) => (
            <Image key={uri} source={{ uri }} style={[styles.avatar, { marginLeft: index === 0 ? 0 : -12 }]} />
          ))}
          <View style={[styles.avatar, styles.avatarCount, { marginLeft: -12 }]}>
            <Text style={styles.avatarCountText}>+12k</Text>
          </View>
        </View>
        <Text style={styles.brandQuote}>"Streamlined our entire floor management in weeks."</Text>
      </View>
    </View>
  );
}

const AVATAR_URLS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBEDbfZcODJroUnC-TqFuME6nq12ZAU4ai9Oj_BeyOfBTDY-ecH4JbV2En1dNNEOyTCK9i2ADDF5RSgmd46pB3Bm45kn-BcDzw-jfwxAxFcWcD1cDpAoppMvkbcclZCja2hzHYeRZ3FIDdQw7rEDyN_UQpdNP125vli1Vd1Nfp-Alz65T7uUDqFQn8fcpPo6jxN2EUZka8Y4LRlQUXybhTM33CZ2uI9h-2BX53293jg_97WFt-jc4xrBA',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAEfzgmSqIjUvk9ZH7PZTWiKJTV5oegMfBXV5jOoq73sUU1R3u3Z6JyCVOkzwJM2dJqsXPNwHozT00S2Ufw5qcZKekYDan560haTixmcpCTW5Pr3dLJJJFUib5yIQDkemImXyA6NwnH6JYzEItp3QbGOXJ_CfK7F2tdiVzW4BTwOc8gDm6FrNHH_B594_m_8S0cK2v5iGal91BCdQzrfJ-ZMWxC1mGfK7cl3HKbPKMjiBL_1upl8bCOSQ',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCVVIGgTadYw7KXO4BST_n9fQin76SktdNxPaAZCYQ43LSXSEHzjONjoAHvsMUtrFu-MU0hfi5FpVYkjkOa6aKjImvkKv1APh7v4vh-jJ-dBDzpltosdJXPBoNUCT0vtajJ6Ou6VMpiTtmFmsD-GrSq7ycPF_nkERunytIhMl5ORAkJpSurCcJZWvqiCLogx7jdiykw9MmxXtTf3WsgPGADyqHTam5ynYKZy0mJ7GxWIvnDbBBrDgK26g',
];

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
    maxWidth: 1100,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    overflow: 'hidden',
  },
  cardWide: {
    flexDirection: 'row',
  },
  brandPanel: {
    width: '50%',
    padding: Spacing.sectionGap,
    backgroundColor: Colors.primary,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  brandDecorLarge: {
    position: 'absolute',
    bottom: -80,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  brandDecorSmall: {
    position: 'absolute',
    top: '45%',
    left: -80,
    width: 256,
    height: 256,
    borderRadius: 128,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gutter,
    marginBottom: Spacing.sectionGap,
  },
  brandLogoBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.DEFAULT,
    backgroundColor: Colors.onPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    ...Typography.headlineLg,
    color: Colors.onPrimary,
  },
  brandCopy: {
    gap: Spacing.gutter,
    maxWidth: 360,
  },
  brandHeadline: {
    ...Typography.displayLg,
    fontSize: 34,
    lineHeight: 42,
    color: Colors.onPrimary,
  },
  brandSubtext: {
    ...Typography.bodyLg,
    color: Colors.primaryFixed,
  },
  brandFooter: {
    marginTop: Spacing.sectionGap,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.unit * 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarCount: {
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCountText: {
    ...Typography.labelSm,
    color: Colors.onPrimary,
  },
  brandQuote: {
    ...Typography.bodyMd,
    color: Colors.primaryFixed,
    fontStyle: 'italic',
  },
  form: {
    padding: Spacing.containerPaddingMobile,
    gap: Spacing.unit * 6,
  },
  formWide: {
    width: '50%',
    padding: Spacing.sectionGap,
  },
  mobileLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
  },
  mobileLogoText: {
    ...Typography.headlineLgMobile,
    color: Colors.primary,
  },
  header: {
    gap: Spacing.unit,
  },
  title: {
    ...Typography.headlineLg,
    fontSize: 28,
    lineHeight: 36,
    color: Colors.onSurface,
  },
  subtitle: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  forgotLink: {
    ...Typography.labelSm,
    color: Colors.primary,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 3,
  },
  rememberLabel: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gutter,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.outlineVariant,
  },
  dividerText: {
    ...Typography.labelSm,
    color: Colors.outline,
  },
  googleButton: {
    borderColor: Colors.outlineVariant,
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
