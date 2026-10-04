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
import { wageConfigApi, type WeekendWage, type WeekendWagePayload } from '../../lib/api/wage-config';
import { getApiErrorMessage } from '../../lib/api/base_api';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 'YYYY-MM-DD' -> '15 Aug 2026' — see FestivalWagesTab's identical helper
// for why this is duplicated locally rather than shared.
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

// Only a wage that hasn't taken effect yet can be changed — one that's
// already active may already have been used to compute pay.
function isUpcoming(wage: WeekendWage): boolean {
  return wage.effective_date > todayDateString();
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
  startTime: '',
  endTime: '',
  hourlyRate: '',
  effectiveDate: '',
  employeeUuids: [] as string[],
};

// The "Weekend Wages" tab on Organization Settings — its own
// query/mutations against /employee/weekend-wages/. Mounted only while this
// tab is active, so mounting itself is the fetch trigger (no `enabled` flag
// needed).
export function WeekendWagesTab() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['weekend-wages'],
    queryFn: wageConfigApi.listWeekendWages,
  });
  const wages = [...(data?.results ?? [])].sort((a, b) => b.effective_date.localeCompare(a.effective_date));

  // Same active-employees source BulkScheduleScreen/NightShiftWagesTab/
  // FestivalWagesTab use for their own employee pickers.
  const { data: employeeData } = useQuery({ queryKey: ['employees'], queryFn: employeeApi.list });
  const employeeOptions = (employeeData?.results ?? [])
    .filter((employee) => employee.is_active)
    .map((employee) => ({ label: `${employee.first_name} ${employee.last_name}`, value: employee.uuid }));

  // One form serves both "add" and "edit" — same "one form, two modes"
  // pattern NightShiftWagesTab/FestivalWagesTab already use. `editingWageUuid`
  // null = add mode.
  const [editingWageUuid, setEditingWageUuid] = useState<string | null>(null);
  const [startTime, setStartTime] = useState(EMPTY_FORM.startTime);
  const [endTime, setEndTime] = useState(EMPTY_FORM.endTime);
  const [hourlyRate, setHourlyRate] = useState(EMPTY_FORM.hourlyRate);
  const [effectiveDate, setEffectiveDate] = useState(EMPTY_FORM.effectiveDate);
  const [employeeUuids, setEmployeeUuids] = useState<string[]>(EMPTY_FORM.employeeUuids);
  const [validationError, setValidationError] = useState<string | undefined>();

  const resetForm = () => {
    setEditingWageUuid(null);
    setStartTime(EMPTY_FORM.startTime);
    setEndTime(EMPTY_FORM.endTime);
    setHourlyRate(EMPTY_FORM.hourlyRate);
    setEffectiveDate(EMPTY_FORM.effectiveDate);
    setEmployeeUuids(EMPTY_FORM.employeeUuids);
    setValidationError(undefined);
  };

  const startEdit = (wage: WeekendWage) => {
    setEditingWageUuid(wage.uuid);
    setStartTime(wage.start_time);
    setEndTime(wage.end_time);
    setHourlyRate(String(wage.hourly_rate));
    setEffectiveDate(wage.effective_date);
    setEmployeeUuids(wage.employees.map((employee) => employee.uuid));
    setValidationError(undefined);
  };

  const createMutation = useMutation({
    mutationFn: (payload: WeekendWagePayload) => wageConfigApi.createWeekendWage(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekend-wages'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: WeekendWagePayload) => wageConfigApi.updateWeekendWage(editingWageUuid as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekend-wages'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => wageConfigApi.deleteWeekendWage(editingWageUuid as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekend-wages'] });
      resetForm();
    },
  });

  const isEditing = editingWageUuid !== null;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = () => {
    const rate = parseFloat(hourlyRate);
    if (!startTime || !endTime) {
      setValidationError('Please set both a start and end time.');
      return;
    }
    if (!effectiveDate) {
      setValidationError('Please select an effective date.');
      return;
    }
    if (!hourlyRate || Number.isNaN(rate) || rate <= 0) {
      setValidationError('Please enter a valid hourly rate.');
      return;
    }
    setValidationError(undefined);
    const payload: WeekendWagePayload = {
      start_time: startTime,
      end_time: endTime,
      hourly_rate: rate,
      effective_date: effectiveDate,
      ...(employeeUuids.length > 0 ? { employee_uuids: employeeUuids } : {}),
    };
    if (isEditing) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const combinedError =
    validationError ??
    (createMutation.isError
      ? getApiErrorMessage(createMutation.error, 'Failed to add weekend wage.')
      : updateMutation.isError
        ? getApiErrorMessage(updateMutation.error, 'Failed to save changes.')
        : deleteMutation.isError
          ? getApiErrorMessage(deleteMutation.error, 'Failed to delete weekend wage.')
          : undefined);

  return (
    <View style={styles.stack}>
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name={isEditing ? 'edit' : 'add-circle-outline'} size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>{isEditing ? 'Edit Weekend Wage' : 'Add Weekend Wage'}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <DateTimeField label="Start Time" mode="time" value={startTime} onChange={setStartTime} />
            </View>
            <View style={styles.timeField}>
              <DateTimeField label="End Time" mode="time" value={endTime} onChange={setEndTime} />
            </View>
          </View>
          <TextField
            label="Hourly Rate"
            placeholder="e.g. 12.50"
            value={hourlyRate}
            onChangeText={(value) => setHourlyRate(sanitizeRateInput(value))}
            keyboardType="decimal-pad"
            icon={<MaterialIcons name="attach-money" size={20} color={Colors.outline} />}
            labelHint={
              <InfoHint text="This is added on top of the employee's base hourly rate for shifts on the organization's weekend days — not a replacement rate." />
            }
          />
          <DateTimeField label="Effective Date" mode="date" value={effectiveDate} onChange={setEffectiveDate} />
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
            <Button label="Add Weekend Wage" onPress={handleSubmit} loading={isSaving} />
          )}
        </View>
      </View>
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="weekend" size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Weekend Wages</Text>
          <InfoHint text="Hourly rate for shifts within a time window on the organization's weekend days (set on the General tab). Wages that haven't started yet can be edited or deleted — tap one to change it." />
        </View>

        {isPending ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : isError ? (
          <Text style={styles.errorText}>{getApiErrorMessage(error, 'Failed to load weekend wages.')}</Text>
        ) : wages.length === 0 ? (
          <Text style={styles.emptyText}>No weekend wages configured yet.</Text>
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
                  <Text style={styles.listItemLabel}>
                    {wage.start_time} – {wage.end_time}
                  </Text>
                  <Text style={styles.listItemValue}>{wage.hourly_rate}/hr</Text>
                  <Text style={styles.listItemMeta}>from {formatDateOnly(wage.effective_date)}</Text>
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
