import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, DateTimeField, TextField } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { employeeApi, type CreateWagePayload, type Employee } from '../../lib/api/employee';
import { getApiErrorMessage } from '../../lib/api/base_api';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 'YYYY-MM-DD' -> '15 Aug 2026' — pure string formatting, no `Date` object
// needed here (so no risk of the bare-date-string-parses-as-UTC bug other
// date helpers in this app guard against).
function formatDateOnly(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${day} ${MONTH_SHORT[month - 1]} ${year}`;
}

// A new wage always takes effect starting the next day, not today — default
// the Start Date field to that instead of leaving it blank.
function tomorrowDateString(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

export interface EmployeeWagesModalProps {
  /** The modal is visible whenever this is non-null; pass null to close it. */
  employee: Employee | null;
  onClose: () => void;
}

// Opened from EmployeeCard's "Wages" action — shows an employee's wage
// history (hourly rate changes over time) and a small inline form to record
// a new one. One instance lives in TeamDirectoryScreen (not one per card):
// the screen holds a single `employee | null` in state and this modal is
// visible whenever that's set, matching the same handful of other
// centered-sheet Modals already in this app (e.g. ShiftHistoryScreen's Date
// Range picker).
export function EmployeeWagesModal({ employee, onClose }: EmployeeWagesModalProps) {
  const queryClient = useQueryClient();
  const employeeUuid = employee?.uuid;

  const {
    data: wagesData,
    isPending: isWagesPending,
    isError: isWagesError,
    error: wagesError,
  } = useQuery({
    queryKey: ['wages', employeeUuid],
    queryFn: () => employeeApi.wagesList(employeeUuid as string),
    enabled: Boolean(employeeUuid),
  });
  const wages = [...(wagesData?.results ?? [])].sort((a, b) => b.effective_date.localeCompare(a.effective_date));

  const [hourlyRate, setHourlyRate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(tomorrowDateString());
  const [validationError, setValidationError] = useState<string | undefined>();

  // Reset the draft whenever a different employee's modal opens (or it
  // closes) — this one modal instance is reused across every employee row,
  // so without this a half-filled draft for one employee would still be
  // sitting here the next time it opens for someone else.
  useEffect(() => {
    setHourlyRate('');
    setEffectiveDate(tomorrowDateString());
    setValidationError(undefined);
  }, [employeeUuid]);

  const createWageMutation = useMutation({
    mutationFn: (payload: CreateWagePayload) => employeeApi.createWage(employeeUuid as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wages', employeeUuid] });
      setHourlyRate('');
      setEffectiveDate(tomorrowDateString());
    },
  });

  const handleAddWage = () => {
    const rate = parseFloat(hourlyRate);
    if (!hourlyRate || Number.isNaN(rate) || rate <= 0) {
      setValidationError('Please enter a valid hourly rate.');
      return;
    }
    if (!effectiveDate) {
      setValidationError('Please select a start date.');
      return;
    }
    setValidationError(undefined);
    createWageMutation.mutate({
      hourly_rate: rate,
      effective_date: effectiveDate,
    });
  };

  const combinedError =
    validationError ??
    (createWageMutation.isError ? getApiErrorMessage(createWageMutation.error, 'Failed to add wage.') : undefined);

  return (
    <Modal visible={Boolean(employee)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              Wages{employee ? ` — ${employee.first_name} ${employee.last_name}` : ''}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={22} color={Colors.onSurfaceVariant} />
            </Pressable>
          </View>

          <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.sheetScrollContent}>
              <Text style={styles.sectionLabel}>WAGE HISTORY</Text>
              {isWagesPending ? (
                <ActivityIndicator color={Colors.primary} style={styles.loading} />
              ) : isWagesError ? (
                <Text style={styles.errorText}>{getApiErrorMessage(wagesError, 'Failed to load wage history.')}</Text>
              ) : wages.length === 0 ? (
                <Text style={styles.emptyText}>No wages recorded yet.</Text>
              ) : (
                <View style={styles.historyList}>
                  {wages.map((wage) => (
                    <View key={wage.uuid} style={styles.historyItem}>
                      <Text style={styles.historyRate}>{wage.hourly_rate}/hr</Text>
                      <Text style={styles.historyRange}>
                        {formatDateOnly(wage.effective_date)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.divider} />

              <Text style={styles.sectionLabel}>ADD NEW WAGE</Text>
              <View style={styles.form}>
                <TextField
                  label="Hourly Rate"
                  placeholder="e.g. 25.50"
                  value={hourlyRate}
                  onChangeText={(value) => setHourlyRate(value.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  icon={<MaterialIcons name="attach-money" size={20} color={Colors.outline} />}
                />
                <DateTimeField label="Effective From" mode="date" value={effectiveDate} onChange={setEffectiveDate} />
              </View>

              {combinedError ? <Text style={styles.errorText}>{combinedError}</Text> : null}
            </View>
          </ScrollView>

          <View style={styles.sheetFooter}>
            <Button label="Close" variant="secondary" onPress={onClose} style={styles.sheetButton} />
            <Button
              label="Add Wage"
              onPress={handleAddWage}
              loading={createWageMutation.isPending}
              style={styles.sheetButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(11,28,48,0.4)',
    padding: Spacing.containerPaddingMobile,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    gap: Spacing.gutter,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.unit * 3,
  },
  sheetTitle: {
    ...Typography.titleMd,
    color: Colors.onSurface,
    flexShrink: 1,
  },
  sheetScroll: {
    flexShrink: 1,
  },
  sheetScrollContent: {
    gap: Spacing.gutter,
  },
  sectionLabel: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  loading: {
    marginVertical: Spacing.unit * 2,
  },
  emptyText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  historyList: {
    gap: Spacing.unit * 2,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.unit * 2,
    paddingHorizontal: Spacing.unit * 3,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.DEFAULT,
  },
  historyRate: {
    ...Typography.bodyMd,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  historyRange: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
  },
  form: {
    gap: Spacing.unit * 4,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: Spacing.gutter,
  },
  sheetButton: {
    flex: 1,
  },
});
