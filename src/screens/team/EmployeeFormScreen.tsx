import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { AppShell } from '../../components/layout/AppShell';
import { Button, Checkbox, DateTimeField, SelectField, TextField } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import {
  employeeApi,
  type CreateEmployeePayload,
  type EmployeeListResponse,
  type UpdateEmployeePayload,
} from '../../lib/api/employee';
import { designationApi } from '../../lib/api/designation';
import { getApiErrorMessage } from '../../lib/api/base_api';

export function EmployeeFormScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();

  // The list screen already populates the ['employees'] cache — read from it
  // rather than issuing a second request for the one being edited.
  const { data } = useQuery({ queryKey: ['employees'], queryFn: employeeApi.list });
  const existing = data?.results.find((employee) => employee.uuid === id);
  const isEditing = Boolean(existing);

  const { data: designationData } = useQuery({ queryKey: ['designations'], queryFn: designationApi.list });
  const designationOptions = (designationData?.results ?? [])
    .filter((designation) => designation.is_active)
    .map((designation) => ({ label: designation.name, value: designation.uuid }));

  const [firstName, setFirstName] = useState(existing?.first_name ?? '');
  const [lastName, setLastName] = useState(existing?.last_name ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [designationUuid, setDesignationUuid] = useState(existing?.designation.uuid ?? '');
  const [startDate, setStartDate] = useState(existing?.start_date ?? '');
  const [endDate, setEndDate] = useState(existing?.end_date ?? '');
  const [isActive, setIsActive] = useState(existing?.is_active ?? true);
  const [validationError, setValidationError] = useState<string | undefined>();

  const createMutation = useMutation({
    mutationFn: employeeApi.create,
    onSuccess: (created) => {
      // The API already hands back the full created record — prepend it to
      // the cached list directly instead of refetching.
      queryClient.setQueryData<EmployeeListResponse>(['employees'], (old) =>
        old ? { results: [created, ...old.results], count: old.count + 1 } : old,
      );
      router.back();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateEmployeePayload) => employeeApi.update(existing!.uuid, payload),
    onSuccess: (updated) => {
      // Same idea: swap just this record in place using the API's response.
      queryClient.setQueryData<EmployeeListResponse>(['employees'], (old) =>
        old ? { ...old, results: old.results.map((e) => (e.uuid === updated.uuid ? updated : e)) } : old,
      );
      router.back();
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const errorMessage =
    validationError ?? (getApiErrorMessage(createMutation.error ?? updateMutation.error, '') || undefined);

  const handleSave = () => {
    if (!firstName || !lastName || !email || !designationUuid || !startDate) {
      setValidationError('Please fill in first name, last name, email, role, and start date.');
      return;
    }
    setValidationError(undefined);

    const payload: CreateEmployeePayload = {
      email,
      first_name: firstName,
      last_name: lastName,
      designation_uuid: designationUuid,
      start_date: startDate,
      ...(endDate ? { end_date: endDate } : {}),
    };

    if (isEditing) {
      updateMutation.mutate({ ...payload, is_active: isActive });
    } else {
      createMutation.mutate(payload);
    }
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
                editable={!isEditing}
                style={isEditing ? styles.disabledInput : undefined}
                icon={<MaterialIcons name="email" size={20} color={Colors.outline} />}
              />

              <SelectField
                label="Role / Title"
                placeholder="Select a role"
                value={designationUuid}
                onChange={setDesignationUuid}
                options={designationOptions}
                icon={<MaterialIcons name="badge" size={20} color={Colors.outline} />}
              />

              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <DateTimeField label="Start Date" mode="date" value={startDate} onChange={setStartDate} />
                </View>
                <View style={styles.rowItem}>
                  <DateTimeField label="End Date (Optional)" mode="date" value={endDate} onChange={setEndDate} />
                </View>
              </View>

              {isEditing ? (
                <View style={styles.activeRow}>
                  <Checkbox checked={isActive} onChange={setIsActive} />
                  <Text style={styles.activeLabel}>Active</Text>
                </View>
              ) : null}

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            </View>

            <Button
              label={isEditing ? 'Save Changes' : 'Add'}
              icon={<MaterialIcons name={isEditing ? 'save' : 'person-add'} size={18} color={Colors.onPrimary} />}
              loading={isSubmitting}
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
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 3,
  },
  activeLabel: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
  disabledInput: {
    backgroundColor: Colors.surfaceContainerLow,
    color: Colors.onSurfaceVariant,
  },
});
