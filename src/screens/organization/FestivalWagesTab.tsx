import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, DateTimeField, InfoHint, MultiSelectField, TextField } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { employeeApi } from '../../lib/api/employee';
import { wageConfigApi, type FestivalWage, type FestivalWagePayload } from '../../lib/api/wage-config';
import { getApiErrorMessage } from '../../lib/api/base_api';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 'YYYY-MM-DD' -> '15 Aug 2026' — pure string formatting, no `Date` object
// needed (avoids the bare-date-string-parses-as-UTC bug other date helpers
// in this app guard against). Duplicated locally rather than shared, per
// this app's convention for formatters this trivial (same call already made
// for EmployeeWagesModal's own copy).
function formatDateOnly(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${day} ${MONTH_SHORT[month - 1]} ${year}`;
}

// 'YYYY-MM-DD' for today, local time — see NightShiftWagesTab's identical
// helper for why this is a plain string compare, not `Date` parsing.
function todayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
}

// Only a wage whose festival date hasn't happened yet can be changed — one
// that's already passed may already have been used to compute pay.
function isUpcoming(wage: FestivalWage): boolean {
  return wage.date > todayDateString();
}

function sanitizeRateInput(value: string): string {
  return value.replace(/[^0-9.]/g, '');
}

// Empty `employees` means this wage applies to everyone by default — the
// same "empty = all" convention the create form's multi-select uses.
function formatAppliesTo(employees: { first_name: string; last_name: string }[]): string {
  if (employees.length === 0) return 'All employees';
  if (employees.length <= 2) return employees.map((employee) => employee.first_name).join(', ');
  return `${employees.length} employees`;
}

const EMPTY_FORM = {
  date: '',
  startTime: '',
  endTime: '',
  extraRate: '',
  employeeUuids: [] as string[],
};

// The "Festival Wages" tab on Organization Settings — its own
// query/mutations against /employee/festival-wages/. Mounted only while this
// tab is active, so mounting itself is the fetch trigger (no `enabled` flag
// needed).
export function FestivalWagesTab() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['festival-wages'],
    queryFn: wageConfigApi.listFestivalWages,
  });
  const wages = [...(data?.results ?? [])].sort((a, b) => b.date.localeCompare(a.date));

  // Same active-employees source BulkScheduleScreen/NightShiftWagesTab use
  // for their own employee pickers.
  const { data: employeeData } = useQuery({ queryKey: ['employees'], queryFn: employeeApi.list });
  const employeeOptions = (employeeData?.results ?? [])
    .filter((employee) => employee.is_active)
    .map((employee) => ({ label: `${employee.first_name} ${employee.last_name}`, value: employee.uuid }));

  // One form serves both "add" and "edit" — same "one form, two modes"
  // pattern NightShiftWagesTab already uses. `editingWageUuid` null = add mode.
  const [editingWageUuid, setEditingWageUuid] = useState<string | null>(null);
  const [date, setDate] = useState(EMPTY_FORM.date);
  const [startTime, setStartTime] = useState(EMPTY_FORM.startTime);
  const [endTime, setEndTime] = useState(EMPTY_FORM.endTime);
  const [extraRate, setExtraRate] = useState(EMPTY_FORM.extraRate);
  const [employeeUuids, setEmployeeUuids] = useState<string[]>(EMPTY_FORM.employeeUuids);
  const [validationError, setValidationError] = useState<string | undefined>();

  const resetForm = () => {
    setEditingWageUuid(null);
    setDate(EMPTY_FORM.date);
    setStartTime(EMPTY_FORM.startTime);
    setEndTime(EMPTY_FORM.endTime);
    setExtraRate(EMPTY_FORM.extraRate);
    setEmployeeUuids(EMPTY_FORM.employeeUuids);
    setValidationError(undefined);
  };

  const startEdit = (wage: FestivalWage) => {
    setEditingWageUuid(wage.uuid);
    setDate(wage.date);
    setStartTime(wage.start_time);
    setEndTime(wage.end_time);
    setExtraRate(String(wage.extra_hourly_rate));
    setEmployeeUuids(wage.employees.map((employee) => employee.uuid));
    setValidationError(undefined);
  };

  const createMutation = useMutation({
    mutationFn: (payload: FestivalWagePayload) => wageConfigApi.createFestivalWage(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['festival-wages'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: FestivalWagePayload) => wageConfigApi.updateFestivalWage(editingWageUuid as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['festival-wages'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => wageConfigApi.deleteFestivalWage(editingWageUuid as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['festival-wages'] });
      resetForm();
    },
  });

  const isEditing = editingWageUuid !== null;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = () => {
    const rate = parseFloat(extraRate);
    if (!date) {
      setValidationError('Please select a date.');
      return;
    }
    if (!startTime || !endTime) {
      setValidationError('Please set both a start and end time.');
      return;
    }
    if (!extraRate || Number.isNaN(rate) || rate <= 0) {
      setValidationError('Please enter a valid extra hourly rate.');
      return;
    }
    setValidationError(undefined);
    const payload: FestivalWagePayload = {
      date,
      start_time: startTime,
      end_time: endTime,
      extra_hourly_rate: rate,
      ...(employeeUuids.length > 0 ? { employee_uuids: employeeUuids } : {}),
    };
    if (isEditing) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const combinedError =
    validationError ??
    (createMutation.isError
      ? getApiErrorMessage(createMutation.error, 'Failed to add festival wage.')
      : updateMutation.isError
        ? getApiErrorMessage(updateMutation.error, 'Failed to save changes.')
        : deleteMutation.isError
          ? getApiErrorMessage(deleteMutation.error, 'Failed to delete festival wage.')
          : undefined);

  return (
    <View style={styles.stack}>
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name={isEditing ? 'edit' : 'add-circle-outline'} size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>{isEditing ? 'Edit Festival Wage' : 'Add Festival Wage'}</Text>
        </View>

        <View style={styles.form}>
          <DateTimeField label="Date" mode="date" value={date} onChange={setDate} />
          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <DateTimeField label="Start Time" mode="time" value={startTime} onChange={setStartTime} />
            </View>
            <View style={styles.timeField}>
              <DateTimeField label="End Time" mode="time" value={endTime} onChange={setEndTime} />
            </View>
          </View>
          <TextField
            label="Extra Hourly Rate"
            placeholder="e.g. 5.00"
            value={extraRate}
            onChangeText={(value) => setExtraRate(sanitizeRateInput(value))}
            keyboardType="decimal-pad"
            icon={<MaterialIcons name="attach-money" size={20} color={Colors.outline} />}
            labelHint={
              <InfoHint text="This is added on top of the employee's base hourly rate for shifts worked on this date — not a replacement rate." />
            }
          />
          <MultiSelectField
            label="Employees"
            placeholder="All employees"
            values={employeeUuids}
            options={employeeOptions}
            onChange={setEmployeeUuids}
            icon={<MaterialIcons name="people" size={20} color={Colors.outline} />}
          />
          {combinedError ? <Text style={styles.errorText}>{combinedError}</Text> : null}

          {isEditing ? (
            <View style={styles.editFooterRow}>
              <Button
                label="Delete"
                variant="destructive"
                onPress={() => deleteMutation.mutate()}
                loading={deleteMutation.isPending}
                style={styles.editFooterButton}
              />
              <Button label="Cancel" variant="secondary" onPress={resetForm} style={styles.editFooterButton} />
              <Button label="Save" onPress={handleSubmit} loading={isSaving} style={styles.editFooterButton} />
            </View>
          ) : (
            <Button label="Add Festival Wage" onPress={handleSubmit} loading={isSaving} />
          )}
        </View>
      </View>
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="celebration" size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Festival Wages</Text>
          <InfoHint text="Extra hourly rate paid during a time window on a specific calendar date. Wages whose date hasn't passed yet can be edited or deleted — tap one to change it." />
        </View>

        {isPending ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : isError ? (
          <Text style={styles.errorText}>{getApiErrorMessage(error, 'Failed to load festival wages.')}</Text>
        ) : wages.length === 0 ? (
          <Text style={styles.emptyText}>No festival wages configured yet.</Text>
        ) : (
          <View style={styles.list}>
            {wages.map((wage) => {
              const editable = isUpcoming(wage);
              return (
                <Pressable
                  key={wage.uuid}
                  style={styles.listItem}
                  onPress={editable ? () => startEdit(wage) : undefined}
                  disabled={!editable}
                >
                  <Text style={styles.listItemLabel}>{formatDateOnly(wage.date)}</Text>
                  <Text style={styles.listItemMeta}>
                    {wage.start_time} – {wage.end_time}
                  </Text>
                  <Text style={styles.listItemValue}>+{wage.extra_hourly_rate}/hr</Text>
                  <Text style={styles.listItemMeta}>{formatAppliesTo(wage.employees)}</Text>
                  {editable ? (
                    <MaterialIcons name="chevron-right" size={18} color={Colors.onSurfaceVariant} />
                  ) : null}
                </Pressable>
              );
            })}
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
    flexWrap: 'wrap',
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
  },
  listItemValue: {
    ...Typography.bodyMd,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  listItemMeta: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  form: {
    gap: Spacing.unit * 4,
  },
  timeRow: {
    flexDirection: 'row',
    gap: Spacing.unit * 3,
  },
  timeField: {
    flex: 1,
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
