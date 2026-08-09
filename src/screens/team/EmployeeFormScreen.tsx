import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { AppShell } from '../../components/layout/AppShell';
import { Button, TextField } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { addEmployee, updateEmployee } from '../../store/slices/employees-slice';

export function EmployeeFormScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useAppSelector((state) => state.employees.items.find((employee) => employee.id === id));
  const isEditing = Boolean(existing);

  const [firstName, setFirstName] = useState(existing?.firstName ?? '');
  const [lastName, setLastName] = useState(existing?.lastName ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [role, setRole] = useState(existing?.role ?? '');
  const [department, setDepartment] = useState(existing?.department ?? '');
  const [error, setError] = useState<string | undefined>();

  const handleSave = () => {
    if (!firstName || !lastName || !email || !role) {
      setError('Please fill in first name, last name, email, and role.');
      return;
    }
    setError(undefined);

    const payload = { firstName, lastName, email, role, department: department || undefined };

    // Alert's button onPress never fires on web (react-native-web's
    // Alert.alert is a no-op there) — don't gate navigation behind it; the
    // updated/added employee showing in the list on return is confirmation
    // enough, the alert is a supplementary native-only nicety.
    if (isEditing && existing) {
      dispatch(updateEmployee({ id: existing.id, ...payload }));
      Alert.alert('Employee updated', `${firstName} ${lastName}'s details have been updated.`);
    } else {
      dispatch(addEmployee(payload));
      Alert.alert('Employee added', `${firstName} ${lastName} has been added and invited to join.`);
    }
    router.back();
  };

  return (
    <AppShell hideBottomNav>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.backRow} onPress={() => router.back()} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={20} color={Colors.onSurfaceVariant} />
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>

          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>{isEditing ? 'Edit Employee' : 'Add Employee'}</Text>
              <Text style={styles.subtitle}>
                {isEditing
                  ? "Update this employee's details."
                  : 'Adding an employee sends them an invite to join your workspace.'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.form}>
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
                label="Email Address"
                placeholder="alex@company.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                icon={<MaterialIcons name="email" size={20} color={Colors.outline} />}
              />

              <TextField
                label="Role / Title"
                placeholder="e.g. Security Lead"
                value={role}
                onChangeText={setRole}
                icon={<MaterialIcons name="badge" size={20} color={Colors.outline} />}
              />

              <TextField
                label="Department (Optional)"
                placeholder="e.g. Facilities"
                value={department}
                onChangeText={setDepartment}
                icon={<MaterialIcons name="business" size={20} color={Colors.outline} />}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>

            <Button
              label={isEditing ? 'Save Changes' : 'Add & Invite'}
              icon={<MaterialIcons name={isEditing ? 'save' : 'person-add'} size={18} color={Colors.onPrimary} />}
              onPress={handleSave}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.containerPaddingMobile,
    gap: Spacing.gutter,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
    alignSelf: 'flex-start',
  },
  backLabel: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
  },
  header: {
    gap: Spacing.unit,
    marginBottom: Spacing.gutter,
  },
  title: {
    ...Typography.headlineLgMobile,
    fontSize: 24,
    lineHeight: 30,
    color: Colors.onSurface,
  },
  subtitle: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
    marginBottom: Spacing.sectionGap,
  },
  form: {
    gap: Spacing.unit * 6,
    marginBottom: Spacing.sectionGap,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.gutter,
  },
  rowItem: {
    flex: 1,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
});
