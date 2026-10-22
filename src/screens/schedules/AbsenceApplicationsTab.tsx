import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, DateTimeField, SelectField, TextField } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { ApplicationStatusColors } from '../../theme/status';
import { organizationApi } from '../../lib/api/organization';
import {
  employeeApi,
  type CreateAbsenceApplicationPayload,
  type IndividualAbsenceApplication,
} from '../../lib/api/employee';
import { getApiErrorMessage } from '../../lib/api/base_api';

const EMPTY_FORM = { absenceTypeUuid: '', startDateTime: '', endDateTime: '', note: '' };
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// DateTimeField's mode="datetime" value is local 'YYYY-MM-DDTHH:MM' (no
// seconds/timezone) — converts that to a full ISO 'Z' datetime, matching
// this app's start_time/end_time convention everywhere else (e.g.
// BulkScheduleScreen's combineDateAndTime). Parses the components
// explicitly rather than handing the bare string to `new Date()`, which
// would parse it as UTC instead of local time.
function toIsoDateTime(value: string): string {
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// Inverse of toIsoDateTime — full ISO 'Z' datetime -> local 'YYYY-MM-DDTHH:MM',
// for seeding the form when editing an existing application.
function fromIsoDateTime(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Only a still-pending application can be changed — one already approved
// or declined has already been acted on, so editing/deleting it after the
// fact isn't offered (same "only upcoming/undecided is mutable" rule the
// wage-config tabs already apply to their own effective-date gating).
function isEditable(application: IndividualAbsenceApplication): boolean {
  return application.status === 'pending';
}

// ISO datetime -> '15 Aug 2026, 09:30' (local time) — a small local
// formatter rather than importing one of schedules' own, same "different
// domain, trivial formatter, not worth a cross-domain import" call already
// made elsewhere in this app (e.g. EmployeeWagesModal).
function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const day = date.getDate();
  const month = MONTH_SHORT[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

function statusLabel(status: IndividualAbsenceApplication['status']): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// The "Absence" sub-tab under Applications — its own query/mutation against
// /employee/absence-applications/. The tab's main content is now the
// employee's own list of applications; submitting a new one moved into a
// modal (opened via the header's "+ Apply" button) instead of being the
// whole tab's content.
export function AbsenceApplicationsTab() {
  const queryClient = useQueryClient();

  const {
    data: applicationsData,
    isPending: isApplicationsPending,
    isError: isApplicationsError,
    error: applicationsError,
  } = useQuery({
    queryKey: ['absence-applications'],
    queryFn: employeeApi.getIndividualAbsenceApplications,
  });
  const applications = applicationsData?.results ?? [];

  // Same ['absence-types'] query AbsenceConfigTab uses, so this shares its
  // cache rather than re-fetching — only active types are offered here,
  // unlike that admin screen which lists every type regardless of status.
  // Mounting itself (the modal) is the fetch trigger, same as every other
  // tab's own query in this app.
  const { data: absenceTypeData, isPending: isAbsenceTypesPending, isError: isAbsenceTypesError, error: absenceTypesError } = useQuery({
    queryKey: ['absence-types'],
    queryFn: organizationApi.getAbsenceTypes,
  });
  const absenceTypeOptions = (absenceTypeData?.results ?? [])
    .filter((absenceType) => absenceType.is_active)
    .map((absenceType) => ({ label: absenceType.label, value: absenceType.uuid }));

  const [isModalOpen, setIsModalOpen] = useState(false);
  // One form serves both "apply" and "edit" — same "one form, two modes"
  // pattern the wage-config tabs already use. null = add mode.
  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [absenceTypeUuid, setAbsenceTypeUuid] = useState(EMPTY_FORM.absenceTypeUuid);
  const [startDateTime, setStartDateTime] = useState(EMPTY_FORM.startDateTime);
  const [endDateTime, setEndDateTime] = useState(EMPTY_FORM.endDateTime);
  const [note, setNote] = useState(EMPTY_FORM.note);
  const [validationError, setValidationError] = useState<string | undefined>();

  const resetForm = () => {
    setEditingUuid(null);
    setAbsenceTypeUuid(EMPTY_FORM.absenceTypeUuid);
    setStartDateTime(EMPTY_FORM.startDateTime);
    setEndDateTime(EMPTY_FORM.endDateTime);
    setNote(EMPTY_FORM.note);
    setValidationError(undefined);
  };

  const openModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const startEdit = (application: IndividualAbsenceApplication) => {
    setEditingUuid(application.uuid);
    setAbsenceTypeUuid(application.absence_type.uuid);
    setStartDateTime(fromIsoDateTime(application.start_time));
    setEndDateTime(fromIsoDateTime(application.end_time));
    setNote(application.note ?? '');
    setValidationError(undefined);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const applyMutation = useMutation({
    mutationFn: (payload: CreateAbsenceApplicationPayload) => employeeApi.applyForAbsenceApplication(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absence-applications'] });
      closeModal();
      Alert.alert('Request submitted', 'Your absence request has been submitted.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: CreateAbsenceApplicationPayload) =>
      employeeApi.updateAbsenceApplication(editingUuid as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absence-applications'] });
      closeModal();
      Alert.alert('Request updated', 'Your absence request has been updated.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => employeeApi.deleteAbsenceApplication(editingUuid as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absence-applications'] });
      closeModal();
    },
  });

  const isEditing = editingUuid !== null;
  const isSaving = applyMutation.isPending || updateMutation.isPending;

  const handleSubmit = () => {
    if (!absenceTypeUuid) {
      setValidationError('Please select an absence type.');
      return;
    }
    if (!startDateTime || !endDateTime) {
      setValidationError('Please set both a start and end date/time.');
      return;
    }
    // Plain string comparison — both are 'YYYY-MM-DDTHH:MM', which sorts
    // lexicographically = chronologically, same convention used for date
    // comparisons elsewhere in this app (e.g. wage effective_date checks).
    if (endDateTime < startDateTime) {
      setValidationError('End date/time cannot be before the start date/time.');
      return;
    }
    setValidationError(undefined);
    const payload: CreateAbsenceApplicationPayload = {
      absence_type_uuid: absenceTypeUuid,
      start_time: toIsoDateTime(startDateTime),
      end_time: toIsoDateTime(endDateTime),
      ...(note.trim() ? { note: note.trim() } : {}),
    };
    if (isEditing) updateMutation.mutate(payload);
    else applyMutation.mutate(payload);
  };

  const combinedError =
    validationError ??
    (applyMutation.isError
      ? getApiErrorMessage(applyMutation.error, 'Failed to submit absence request.')
      : updateMutation.isError
        ? getApiErrorMessage(updateMutation.error, 'Failed to update absence request.')
        : deleteMutation.isError
          ? getApiErrorMessage(deleteMutation.error, 'Failed to delete absence request.')
          : undefined);

  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <MaterialIcons name="event-busy" size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Absence Applications</Text>
        </View>
        <Button label="+ Apply" onPress={openModal} style={styles.applyButton} />
      </View>

      {isApplicationsPending ? (
        <ActivityIndicator color={Colors.primary} style={styles.loading} />
      ) : isApplicationsError ? (
        <Text style={styles.errorText}>{getApiErrorMessage(applicationsError, 'Failed to load absence applications.')}</Text>
      ) : applications.length === 0 ? (
        <Text style={styles.emptyText}>You haven't applied for any absence yet.</Text>
      ) : (
        <View style={styles.list}>
          {applications.map((application) => {
            const statusColor = ApplicationStatusColors[application.status];
            const editable = isEditable(application);
            return (
              <Pressable
                key={application.uuid}
                style={styles.listItem}
                onPress={editable ? () => startEdit(application) : undefined}
                disabled={!editable}
              >
                <View style={styles.listItemHeader}>
                  <Text style={styles.listItemLabel}>{application.absence_type.label}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor.background }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor.text }]} />
                    <Text style={[styles.statusText, { color: statusColor.text }]}>{statusLabel(application.status)}</Text>
                  </View>
                </View>
                <Text style={styles.listItemMeta}>
                  {formatDateTime(application.start_time)} – {formatDateTime(application.end_time)}
                </Text>
                {application.note ? <Text style={styles.listItemNote}>{application.note}</Text> : null}
                {editable ? <Text style={styles.listItemHint}>Tap to edit</Text> : null}
              </Pressable>
            );
          })}
        </View>
      )}

      <Modal visible={isModalOpen} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name={isEditing ? 'edit' : 'event-busy'} size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>{isEditing ? 'Edit Absence Request' : 'Apply for Absence'}</Text>
            </View>

            <View style={styles.form}>
              <SelectField
                label="Absence Type"
                placeholder={isAbsenceTypesPending ? 'Loading...' : 'Select absence type'}
                value={absenceTypeUuid}
                options={absenceTypeOptions}
                onChange={setAbsenceTypeUuid}
                loading={isAbsenceTypesPending}
                icon={<MaterialIcons name="event-busy" size={20} color={Colors.outline} />}
              />
              {isAbsenceTypesError ? (
                <Text style={styles.errorText}>{getApiErrorMessage(absenceTypesError, 'Failed to load absence types.')}</Text>
              ) : null}

              <View style={styles.row}>
                <View style={styles.rowField}>
                  <DateTimeField label="Start" mode="datetime" value={startDateTime} onChange={setStartDateTime} />
                </View>
                <View style={styles.rowField}>
                  <DateTimeField label="End" mode="datetime" value={endDateTime} onChange={setEndDateTime} />
                </View>
              </View>

              <TextField
                label="Note"
                placeholder="Optional — add any extra context"
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                style={styles.noteInput}
              />

              {combinedError ? <Text style={styles.errorText}>{combinedError}</Text> : null}

              <View style={styles.modalFooterRow}>
                {isEditing ? (
                  <Button
                    label="Delete"
                    variant="destructive"
                    onPress={() => deleteMutation.mutate()}
                    loading={deleteMutation.isPending}
                    style={styles.modalFooterButton}
                  />
                ) : null}
                <Button label="Cancel" variant="secondary" onPress={closeModal} style={styles.modalFooterButton} />
                <Button
                  label={isEditing ? 'Save' : 'Submit'}
                  onPress={handleSubmit}
                  loading={isSaving}
                  style={styles.modalFooterButton}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
    justifyContent: 'space-between',
    gap: Spacing.unit * 2,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
  },
  sectionTitle: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  applyButton: {
    paddingHorizontal: Spacing.gutter,
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
    gap: Spacing.unit,
    paddingVertical: Spacing.unit * 2,
    paddingHorizontal: Spacing.unit * 3,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.DEFAULT,
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.unit * 2,
  },
  listItemLabel: {
    ...Typography.bodyMd,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
    flex: 1,
  },
  listItemMeta: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  listItemNote: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  listItemHint: {
    ...Typography.labelSm,
    color: Colors.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit,
    paddingHorizontal: Spacing.unit * 2,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
  },
  statusText: {
    ...Typography.labelSm,
    fontFamily: 'Inter_600SemiBold',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(11,28,48,0.4)',
  },
  sheet: {
    width: '90%',
    maxWidth: 420,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    gap: Spacing.unit * 3,
  },
  form: {
    gap: Spacing.unit * 4,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.unit * 3,
  },
  rowField: {
    flex: 1,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooterRow: {
    flexDirection: 'row',
    gap: Spacing.unit * 3,
  },
  modalFooterButton: {
    flex: 1,
  },
});
