import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, DateTimeField, InfoHint, TextField } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { wageConfigApi, type CreateNightShiftWagePayload } from '../../lib/api/wage-config';
import { getApiErrorMessage } from '../../lib/api/base_api';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 'YYYY-MM-DD' -> '15 Aug 2026' — see FestivalWagesTab's identical helper
// for why this is duplicated locally rather than shared.
function formatDateOnly(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${day} ${MONTH_SHORT[month - 1]} ${year}`;
}

function sanitizeRateInput(value: string): string {
  return value.replace(/[^0-9.]/g, '');
}

// The "Night Shift Wages" tab on Organization Settings — its own
// query/mutation against /employee/night-shift-wages/, list + create only
// (no update/delete given). Mounted only while this tab is active, so
// mounting itself is the fetch trigger (no `enabled` flag needed).
export function NightShiftWagesTab() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['night-shift-wages'],
    queryFn: wageConfigApi.listNightShiftWages,
  });
  const wages = [...(data?.results ?? [])].sort((a, b) => b.effective_date.localeCompare(a.effective_date));

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [validationError, setValidationError] = useState<string | undefined>();

  const createMutation = useMutation({
    mutationFn: (payload: CreateNightShiftWagePayload) => wageConfigApi.createNightShiftWage(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['night-shift-wages'] });
      setStartTime('');
      setEndTime('');
      setHourlyRate('');
      setEffectiveDate('');
    },
  });

  const handleAdd = () => {
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
    createMutation.mutate({ start_time: startTime, end_time: endTime, hourly_rate: rate, effective_date: effectiveDate });
  };

  const combinedError =
    validationError ??
    (createMutation.isError ? getApiErrorMessage(createMutation.error, 'Failed to add night shift wage.') : undefined);

  return (
    <View style={styles.stack}>
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="add-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Add Night Shift Wage</Text>
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
            placeholder="e.g. 15.00"
            value={hourlyRate}
            onChangeText={(value) => setHourlyRate(sanitizeRateInput(value))}
            keyboardType="decimal-pad"
            icon={<MaterialIcons name="attach-money" size={20} color={Colors.outline} />}
            labelHint={
              <InfoHint text="This is added on top of the employee's base hourly rate for hours worked within this time window — not a replacement rate." />
            }
          />
          <DateTimeField label="Effective Date" mode="date" value={effectiveDate} onChange={setEffectiveDate} />
          {combinedError ? <Text style={styles.errorText}>{combinedError}</Text> : null}
          <Button label="Add Night Shift Wage" onPress={handleAdd} loading={createMutation.isPending} />
        </View>
      </View>
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="nightlight" size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Night Shift Wages</Text>
        </View>
        <Text style={styles.sectionHint}>Hourly rate for shifts falling within a night window.</Text>

        {isPending ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : isError ? (
          <Text style={styles.errorText}>{getApiErrorMessage(error, 'Failed to load night shift wages.')}</Text>
        ) : wages.length === 0 ? (
          <Text style={styles.emptyText}>No night shift wages configured yet.</Text>
        ) : (
          <View style={styles.list}>
            {wages.map((wage) => (
              <View key={wage.uuid} style={styles.listItem}>
                <Text style={styles.listItemLabel}>
                  {wage.start_time} – {wage.end_time}
                </Text>
                <Text style={styles.listItemValue}>{wage.hourly_rate}/hr</Text>
                <Text style={styles.listItemMeta}>from {formatDateOnly(wage.effective_date)}</Text>
              </View>
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
  sectionHint: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    marginTop: -Spacing.unit * 2,
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
});
