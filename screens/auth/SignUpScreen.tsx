import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Button, Checkbox, PasswordField, SocialButton, TextField } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';

const WIDE_BREAKPOINT = 768;

export function SignUpScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => setSubmitting(false), 1500);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, isWide && styles.cardWide]}>
            {isWide ? <BrandPanel /> : null}

            <View style={[styles.form, isWide && styles.formWide]}>
              <View style={styles.header}>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>
                  Join over 500+ enterprises managing their teams with Workspace.
                </Text>
              </View>

              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <TextField
                    label="First Name"
                    placeholder="Alex"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.rowItem}>
                  <TextField
                    label="Last Name"
                    placeholder="Rivera"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <TextField
                label="Organization Name"
                icon={<MaterialIcons name="business" size={20} color={Colors.outline} />}
                placeholder="e.g. Acme Corp"
                value={orgName}
                onChangeText={setOrgName}
                autoCapitalize="words"
              />

              <TextField
                label="Email Address"
                icon={<MaterialIcons name="email" size={20} color={Colors.outline} />}
                placeholder="alex@organization.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <PasswordField label="Password" value={password} onChangeText={setPassword} />
                </View>
                <View style={styles.rowItem}>
                  <PasswordField
                    label="Confirm Password"
                    icon={<MaterialCommunityIcons name="lock-reset" size={20} color={Colors.outline} />}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </View>
              </View>

              <View style={styles.termsRow}>
                <Checkbox checked={agreedToTerms} onChange={setAgreedToTerms} />
                <Text style={styles.termsText}>
                  I agree to the <Text style={styles.link}>Terms of Service</Text> and{' '}
                  <Text style={styles.link}>Privacy Policy</Text>.
                </Text>
              </View>

              <Button
                label="Sign Up"
                icon={<MaterialIcons name="arrow-forward" size={20} color={Colors.onPrimary} />}
                loading={submitting}
                onPress={handleSubmit}
                style={styles.submitButton}
              />

              <View style={styles.loginRow}>
                <Text style={styles.subtitle}>Already have an account? </Text>
                <Link href="/" replace style={styles.link}>
                  Log In
                </Link>
              </View>

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                <View style={styles.divider} />
              </View>

              <View style={styles.socialRow}>
                <SocialButton
                  label="Google"
                  icon={<FontAwesome name="google" size={18} color={Colors.onSurface} />}
                />
                <SocialButton
                  label="SSO"
                  icon={<MaterialIcons name="work" size={20} color={Colors.onSurface} />}
                />
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
    <LinearGradient
      colors={[Colors.primary, Colors.primaryContainer]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.brandPanel}
    >
      <View style={styles.brandHeader}>
        <MaterialIcons name="workspaces" size={32} color={Colors.onPrimary} />
        <Text style={styles.brandTitle}>Workspace</Text>
      </View>

      <View style={styles.brandCopy}>
        <Text style={styles.brandHeadline}>Empowering your workforce.</Text>
        <Text style={styles.brandSubtext}>
          The definitive platform for frictionless employee coordination and department
          management.
        </Text>
      </View>

      <View style={styles.brandFeatures}>
        <View style={styles.brandFeature}>
          <MaterialIcons name="speed" size={22} color={Colors.onPrimary} />
          <Text style={styles.brandFeatureLabel}>Real-time Logging</Text>
        </View>
        <View style={styles.brandFeature}>
          <MaterialIcons name="security" size={22} color={Colors.onPrimary} />
          <Text style={styles.brandFeatureLabel}>Enterprise Security</Text>
        </View>
      </View>
    </LinearGradient>
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
    justifyContent: 'space-between',
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gutter,
    marginBottom: Spacing.sectionGap,
  },
  brandTitle: {
    ...Typography.headlineLg,
    color: Colors.onPrimary,
  },
  brandCopy: {
    gap: Spacing.gutter,
    maxWidth: 320,
  },
  brandHeadline: {
    ...Typography.displayLg,
    fontSize: 36,
    lineHeight: 44,
    color: Colors.onPrimary,
  },
  brandSubtext: {
    ...Typography.bodyLg,
    color: Colors.onPrimary,
    opacity: 0.8,
  },
  brandFeatures: {
    flexDirection: 'row',
    gap: Spacing.gutter,
    marginTop: Spacing.sectionGap,
  },
  brandFeature: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.DEFAULT,
    padding: Spacing.gutter,
    gap: Spacing.unit * 2,
  },
  brandFeatureLabel: {
    ...Typography.labelSm,
    color: Colors.onPrimary,
  },
  form: {
    padding: Spacing.containerPaddingMobile,
    gap: Spacing.unit * 5,
  },
  formWide: {
    width: '50%',
    padding: Spacing.sectionGap - 8,
  },
  header: {
    gap: Spacing.unit,
    marginBottom: Spacing.unit,
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
  row: {
    flexDirection: 'row',
    gap: Spacing.gutter,
  },
  rowItem: {
    flex: 1,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.unit * 3,
  },
  termsText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    flex: 1,
  },
  link: {
    color: Colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  submitButton: {
    marginTop: Spacing.unit,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
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
    color: Colors.onSurfaceVariant,
  },
  socialRow: {
    flexDirection: 'row',
    gap: Spacing.gutter,
  },
});
