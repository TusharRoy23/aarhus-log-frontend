import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { AppShell } from '../../components/layout/AppShell';
import { Button, Checkbox, TextField } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { designationApi, type Designation, type DesignationListResponse } from '../../lib/api/designation';
import { getApiErrorMessage } from '../../lib/api/base_api';

export function DesignationFormScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();

  // The list screen already populates the ['designations'] cache — read from
  // it rather than issuing a second request for the one being edited.
  const { data } = useQuery({ queryKey: ['designations'], queryFn: designationApi.list });
  const existing = data?.results.find((designation) => designation.uuid === id);
  const isEditing = Boolean(existing);

  const [name, setName] = useState(existing?.name ?? '');
  const [isActive, setIsActive] = useState(existing?.is_active ?? true);
  const [validationError, setValidationError] = useState<string | undefined>();

  const createMutation = useMutation({
    mutationFn: designationApi.create,
    onSuccess: (created) => {
      // The API already hands back the full created record — append it to
      // the cached list directly instead of refetching.
      queryClient.setQueryData<DesignationListResponse>(['designations'], (old) =>
        old ? { results: [created, ...old.results], count: old.count + 1 } : old,
      );
      router.back();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { name: string; is_active: boolean }) =>
      designationApi.update(existing!.uuid, payload),
    onSuccess: (updated) => {
      // Same idea: swap just this record in place using the API's response.
      queryClient.setQueryData<DesignationListResponse>(['designations'], (old) =>
        old
          ? { ...old, results: old.results.map((d: Designation) => (d.uuid === updated.uuid ? updated : d)) }
          : old,
      );
      router.back();
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const errorMessage =
    validationError ?? (getApiErrorMessage(createMutation.error ?? updateMutation.error, '') || undefined);

  const handleSave = () => {
    if (!name.trim()) {
      setValidationError('Please enter a designation name.');
      return;
    }
    setValidationError(undefined);

    if (isEditing) {
      updateMutation.mutate({ name, is_active: isActive });
    } else {
      createMutation.mutate({ name, is_active: isActive });
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
              <Text style={styles.title}>{isEditing ? 'Edit Designation' : 'Add Designation'}</Text>
              <Text style={styles.subtitle}>
                {isEditing
                  ? 'Update this designation.'
                  : 'Create a new role that employees can be assigned.'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.form}>
              <TextField
                label="Name"
                placeholder="e.g. Developer"
                value={name}
                onChangeText={setName}
                icon={<MaterialIcons name="badge" size={20} color={Colors.outline} />}
              />

              <View style={styles.activeRow}>
                <Checkbox checked={isActive} onChange={setIsActive} />
                <Text style={styles.activeLabel}>Active</Text>
              </View>

              {existing?.is_owner ? (
                <Text style={styles.ownerNote}>This is the built-in Owner designation.</Text>
              ) : null}

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            </View>

            <Button
              label={isEditing ? 'Save Changes' : 'Add Designation'}
              icon={<MaterialIcons name={isEditing ? 'save' : 'add'} size={18} color={Colors.onPrimary} />}
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
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 3,
  },
  activeLabel: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  ownerNote: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
});
