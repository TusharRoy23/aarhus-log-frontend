import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, DateTimeField, InfoHint, TextField } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { wageConfigApi, type CreateFestivalWagePayload } from '../../lib/api/wage-config';
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

function sanitizeRateInput(value: string): string {
  return value.replace(/[^0-9.]/g, '');
}

// The "Festival Wages" tab on Organization Settings — its own query/mutation
// against /employee/festival-wages/, list + create only (no update/delete
// given). Mounted only while this tab is active, so mounting itself is the
// fetch trigger (no `enabled` flag needed).
export function FestivalWagesTab() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['festival-wages'],
    queryFn: wageConfigApi.listFestivalWages,
  });
  const wages = [...(data?.results ?? [])].sort((a, b) => b.date.localeCompare(a.date));

  const [date, setDate] = useState('');
  const [extraRate, setExtraRate] = useState('');
  const [validationError, setValidationError] = useState<string | undefined>();

  const createMutation = useMutation({
    mutationFn: (payload: CreateFestivalWagePayload) => wageConfigApi.createFestivalWage(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['festival-wages'] });
      setDate('');
      setExtraRate('');
    },
  });

  const handleAdd = () => {
    const rate = parseFloat(extraRate);
    if (!date) {
      setValidationError('Please select a date.');
      return;
    }
    if (!extraRate || Number.isNaN(rate) || rate <= 0) {
      setValidationError('Please enter a valid extra hourly rate.');
      return;
    }
    setValidationError(undefined);
    createMutation.mutate({ date, extra_hourly_rate: rate });
  };

  const combinedError =
    validationError ??
    (createMutation.isError ? getApiErrorMessage(createMutation.error, 'Failed to add festival wage.') : undefined);

  return (
    <View style={styles.stack}>
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="add-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Add Festival Wage</Text>
        </View>

        <View style={styles.form}>
          <DateTimeField label="Date" mode="date" value={date} onChange={setDate} />
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
          {combinedError ? <Text style={styles.errorText}>{combinedError}</Text> : null}
          <Button label="Add Festival Wage" onPress={handleAdd} loading={createMutation.isPending} />
        </View>
      </View>
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="celebration" size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Festival Wages</Text>
        </View>
        <Text style={styles.sectionHint}>Extra hourly rate paid on specific calendar dates.</Text>

        {isPending ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : isError ? (
          <Text style={styles.errorText}>{getApiErrorMessage(error, 'Failed to load festival wages.')}</Text>
        ) : wages.length === 0 ? (
          <Text style={styles.emptyText}>No festival wages configured yet.</Text>
        ) : (
          <View style={styles.list}>
            {wages.map((wage) => (
              <View key={wage.uuid} style={styles.listItem}>
                <Text style={styles.listItemLabel}>{formatDateOnly(wage.date)}</Text>
                <Text style={styles.listItemValue}>+{wage.extra_hourly_rate}/hr</Text>
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
  form: {
    gap: Spacing.unit * 4,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
});
