import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, Checkbox, TextField } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { organizationApi, type AbsenceType, type AbsenceTypePayload } from '../../lib/api/organization';
import { getApiErrorMessage } from '../../lib/api/base_api';

const EMPTY_FORM = { label: '', isActive: true, isSystem: false };

// The "Absence Config" tab on Organization Settings — its own
// query/mutations against /organization/absence-types/. Mounted only while
// this tab is active, so mounting itself is the fetch trigger. Same
// "one form, two modes" add/edit pattern as the wage-config tabs, just with
// a plain label + active toggle instead of a time/rate/date form — this
// resource has no effective-date concept, so (unlike wages) every absence
// type is editable/deletable regardless of when it was created.
export function AbsenceConfigTab() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['absence-types'],
    queryFn: organizationApi.getAbsenceTypes,
  });
  const absenceTypes = data?.results ?? [];

  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [label, setLabel] = useState(EMPTY_FORM.label);
  const [isActive, setIsActive] = useState(EMPTY_FORM.isActive);
  // System-defined absence types (seeded by the backend, not admin-created)
  // keep their label fixed — only the active toggle stays editable for them.
  const [isSystem, setIsSystem] = useState(EMPTY_FORM.isSystem);
  const [validationError, setValidationError] = useState<string | undefined>();

  const resetForm = () => {
    setEditingUuid(null);
    setLabel(EMPTY_FORM.label);
    setIsActive(EMPTY_FORM.isActive);
    setIsSystem(EMPTY_FORM.isSystem);
    setValidationError(undefined);
  };

  const startEdit = (absenceType: AbsenceType) => {
    setEditingUuid(absenceType.uuid);
    setLabel(absenceType.label);
    setIsActive(absenceType.is_active);
    setIsSystem(absenceType.is_system);
    setValidationError(undefined);
  };

  const createMutation = useMutation({
    mutationFn: (payload: AbsenceTypePayload) => organizationApi.createAbsenceType(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absence-types'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: AbsenceTypePayload) => organizationApi.updateAbsenceType(editingUuid as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absence-types'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => organizationApi.deleteAbsenceType(editingUuid as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absence-types'] });
      resetForm();
    },
  });

  const isEditing = editingUuid !== null;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = () => {
    if (!label.trim()) {
      setValidationError('Please enter a label.');
      return;
    }

    setValidationError(undefined);
    const payload: AbsenceTypePayload = { label: label.trim(), is_active: isActive };
    if (isSystem) delete payload.label;

    if (isEditing) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const combinedError =
    validationError ??
    (createMutation.isError
      ? getApiErrorMessage(createMutation.error, 'Failed to add absence type.')
      : updateMutation.isError
        ? getApiErrorMessage(updateMutation.error, 'Failed to save changes.')
        : deleteMutation.isError
          ? getApiErrorMessage(deleteMutation.error, 'Failed to delete absence type.')
          : undefined);

  return (
    <View style={styles.stack}>
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name={isEditing ? 'edit' : 'add-circle-outline'} size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>{isEditing ? 'Edit Absence Type' : 'Add Absence Type'}</Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Label"
            placeholder="e.g. Sick Leave"
            value={label}
            onChangeText={setLabel}
            editable={!isSystem}
            style={isSystem ? styles.labelInputDisabled : undefined}
            icon={<MaterialIcons name="event-busy" size={20} color={Colors.outline} />}
          />
          <View style={styles.activeRow}>
            <Checkbox checked={isActive} onChange={setIsActive} />
            <Text style={styles.activeLabel}>Active</Text>
          </View>
          {combinedError ? <Text style={styles.errorText}>{combinedError}</Text> : null}

          {isEditing ? (
            <View style={styles.editFooterRow}>
              <Button
                label="Delete"
                variant="destructive"
                onPress={() => deleteMutation.mutate()}
                loading={deleteMutation.isPending}
                style={styles.editFooterButton}
                disabled={isSystem}
              />
              <Button label="Cancel" variant="secondary" onPress={resetForm} style={styles.editFooterButton} />
              <Button label="Save" onPress={handleSubmit} loading={isSaving} style={styles.editFooterButton} />
            </View>
          ) : (
            <Button label="Add Absence Type" onPress={handleSubmit} loading={isSaving} />
          )}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="event-busy" size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Absence Types</Text>
        </View>

        {isPending ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : isError ? (
          <Text style={styles.errorText}>{getApiErrorMessage(error, 'Failed to load absence types.')}</Text>
        ) : absenceTypes.length === 0 ? (
          <Text style={styles.emptyText}>No absence types configured yet.</Text>
        ) : (
          <View style={styles.list}>
            {absenceTypes.map((absenceType) => (
              <Pressable key={absenceType.uuid} style={styles.listItem} onPress={() => startEdit(absenceType)}>
                <Text style={styles.listItemLabel}>{absenceType.label}</Text>
                <Text style={[styles.listItemStatus, !absenceType.is_active && styles.listItemStatusInactive]}>
                  {absenceType.is_active ? 'Active' : 'Inactive'}
                </Text>
                <MaterialIcons name="chevron-right" size={18} color={Colors.onSurfaceVariant} />
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.gutter,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    gap: Spacing.unit * 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
  },
  sectionTitle: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  loading: {
    marginVertical: Spacing.unit * 2,
  },
  emptyText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  list: {
    gap: Spacing.unit * 2,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.unit * 2,
    paddingVertical: Spacing.unit * 2,
    paddingHorizontal: Spacing.unit * 3,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.DEFAULT,
  },
  listItemLabel: {
    ...Typography.bodyMd,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
    flex: 1,
  },
  listItemStatus: {
    ...Typography.labelSm,
    color: Colors.primary,
  },
  listItemStatusInactive: {
    color: Colors.onSurfaceVariant,
  },
  form: {
    gap: Spacing.unit * 4,
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
  labelInputDisabled: {
    backgroundColor: Colors.surfaceContainerLow,
    color: Colors.onSurfaceVariant,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
  editFooterRow: {
    flexDirection: 'row',
    gap: Spacing.unit * 3,
  },
  editFooterButton: {
    flex: 1,
  },
});
