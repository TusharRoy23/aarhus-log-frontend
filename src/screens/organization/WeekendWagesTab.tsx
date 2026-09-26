import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, DateTimeField, InfoHint, TextField } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { wageConfigApi, type CreateWeekendWagePayload } from '../../lib/api/wage-config';
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

// The "Weekend Wages" tab on Organization Settings — its own query/mutation
// against /employee/weekend-wages/, list + create only (no update/delete
// given). Mounted only while this tab is active, so mounting itself is the
// fetch trigger (no `enabled` flag needed).
export function WeekendWagesTab() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['weekend-wages'],
    queryFn: wageConfigApi.listWeekendWages,
  });
  const wages = [...(data?.results ?? [])].sort((a, b) => b.effective_date.localeCompare(a.effective_date));

  const [hourlyRate, setHourlyRate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [validationError, setValidationError] = useState<string | undefined>();

  const createMutation = useMutation({
    mutationFn: (payload: CreateWeekendWagePayload) => wageConfigApi.createWeekendWage(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekend-wages'] });
      setHourlyRate('');
      setEffectiveDate('');
    },
  });

  const handleAdd = () => {
    const rate = parseFloat(hourlyRate);
    if (!effectiveDate) {
      setValidationError('Please select an effective date.');
      return;
    }
    if (!hourlyRate || Number.isNaN(rate) || rate <= 0) {
      setValidationError('Please enter a valid hourly rate.');
      return;
    }
    setValidationError(undefined);
    createMutation.mutate({ hourly_rate: rate, effective_date: effectiveDate });
  };

  const combinedError =
    validationError ??
    (createMutation.isError ? getApiErrorMessage(createMutation.error, 'Failed to add weekend wage.') : undefined);

  return (
    <View style={styles.stack}>
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="add-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Add Weekend Wage</Text>
        </View>

        <View style={styles.form}>
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
          {combinedError ? <Text style={styles.errorText}>{combinedError}</Text> : null}
          <Button label="Add Weekend Wage" onPress={handleAdd} loading={createMutation.isPending} />
        </View>
      </View>
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="weekend" size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Weekend Wages</Text>
        </View>
        <Text style={styles.sectionHint}>
          Hourly rate for shifts on the organization's weekend days (set on the General tab).
        </Text>

        {isPending ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : isError ? (
          <Text style={styles.errorText}>{getApiErrorMessage(error, 'Failed to load weekend wages.')}</Text>
        ) : wages.length === 0 ? (
          <Text style={styles.emptyText}>No weekend wages configured yet.</Text>
        ) : (
          <View style={styles.list}>
            {wages.map((wage) => (
              <View key={wage.uuid} style={styles.listItem}>
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
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
});
