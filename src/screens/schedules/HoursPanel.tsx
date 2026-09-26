import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, DateTimeField } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { wageConfigApi } from '../../lib/api/wage-config';
import { getApiErrorMessage } from '../../lib/api/base_api';
import { parseDateOnly, todayDateString } from './schedule-format';

type DateRange = { from: string; to: string };

function firstOfMonthDateString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-01`;
}

// Defaults to "this month so far" — a reasonable starting window for a
// payroll-style summary; the date-range picker lets it be changed to any
// range immediately, this is just what loads before the user touches it.
function defaultRange(): DateRange {
  return { from: firstOfMonthDateString(), to: todayDateString() };
}

function formatRangeLabel(range: DateRange): string {
  const format = (dateStr: string) =>
    parseDateOnly(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${format(range.from)} - ${format(range.to)}`;
}

// "37.5" / "40" — one decimal place, trimmed when it's a whole number.
function formatHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
}

// The "Hours" tab's content on Home — a summary of hours worked over a date
// range, broken down into total vs. the three pay-adjusted categories from
// Organization Settings' Wage Config (Night Shift / Weekend / Festival).
// `date_from`/`date_to` are required by the endpoint (unlike e.g.
// ShiftHistoryScreen's optional range), so `dateRange` always has a value —
// mounting itself is the fetch trigger (no `enabled` flag needed).
export function HoursPanel() {
  const [dateRange, setDateRange] = useState<DateRange>(defaultRange);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [rangeError, setRangeError] = useState<string | undefined>();

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['hours-summary', dateRange.from, dateRange.to],
    queryFn: () => wageConfigApi.hourSummary(dateRange.from, dateRange.to),
  });

  const openPicker = () => {
    setDraftFrom(dateRange.from);
    setDraftTo(dateRange.to);
    setRangeError(undefined);
    setPickerOpen(true);
  };

  const applyRange = () => {
    if (!draftFrom || !draftTo) {
      setRangeError('Please pick both a start and end date.');
      return;
    }
    if (draftFrom > draftTo) {
      setRangeError('Start date must be before the end date.');
      return;
    }
    setRangeError(undefined);
    setDateRange({ from: draftFrom, to: draftTo });
    setPickerOpen(false);
  };

  const resetRange = () => {
    setDateRange(defaultRange());
    setPickerOpen(false);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Hours</Text>

      <Pressable style={styles.filterChip} onPress={openPicker}>
        <MaterialIcons name="calendar-today" size={16} color={Colors.onSurface} />
        <Text style={styles.filterChipText}>{formatRangeLabel(dateRange)}</Text>
        <MaterialIcons name="expand-more" size={16} color={Colors.onSurfaceVariant} />
      </Pressable>

      {isPending ? (
        <ActivityIndicator color={Colors.primary} style={styles.loading} />
      ) : isError ? (
        <Text style={styles.errorText}>{getApiErrorMessage(error, 'Failed to load hours summary.')}</Text>
      ) : data ? (
        <View style={styles.summary}>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total Hours</Text>
            <Text style={styles.totalValue}>{formatHours(data.total_hours)}</Text>
          </View>

          <View style={styles.breakdownRow}>
            <View style={styles.breakdownTile}>
              <MaterialIcons name="nightlight" size={20} color={Colors.primary} />
              <Text style={styles.breakdownValue}>{formatHours(data.night_shift_hours)}</Text>
              <Text style={styles.breakdownLabel}>Night Shift</Text>
            </View>
            <View style={styles.breakdownTile}>
              <MaterialIcons name="weekend" size={20} color={Colors.primary} />
              <Text style={styles.breakdownValue}>{formatHours(data.weekend_hours)}</Text>
              <Text style={styles.breakdownLabel}>Weekend</Text>
            </View>
            <View style={styles.breakdownTile}>
              <MaterialIcons name="celebration" size={20} color={Colors.primary} />
              <Text style={styles.breakdownValue}>{formatHours(data.festival_hours)}</Text>
              <Text style={styles.breakdownLabel}>Festival</Text>
            </View>
          </View>
        </View>
      ) : null}

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPickerOpen(false)} accessibilityLabel="Close" />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Date Range</Text>

            <View style={styles.sheetFields}>
              <DateTimeField label="From" mode="date" value={draftFrom} onChange={setDraftFrom} />
              <DateTimeField label="To" mode="date" value={draftTo} onChange={setDraftTo} />
            </View>

            {rangeError ? <Text style={styles.errorText}>{rangeError}</Text> : null}

            <View style={styles.sheetFooter}>
              <Button label="Reset" variant="secondary" onPress={resetRange} style={styles.sheetButton} />
              <Button label="Apply" onPress={applyRange} style={styles.sheetButton} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.gutter,
  },
  sectionTitle: {
    ...Typography.headlineLgMobile,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.onSurface,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.unit * 2,
    borderRadius: Radius.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  filterChipText: {
    ...Typography.labelSm,
    color: Colors.onSurface,
  },
  loading: {
    marginTop: Spacing.sectionGap,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
  summary: {
    gap: Spacing.gutter,
  },
  totalCard: {
    alignItems: 'center',
    gap: Spacing.unit,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
  },
  totalLabel: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  totalValue: {
    ...Typography.headlineLgMobile,
    fontSize: 36,
    lineHeight: 42,
    color: Colors.onSurface,
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: Spacing.unit * 3,
  },
  breakdownTile: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.unit,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.unit * 4,
    paddingHorizontal: Spacing.unit * 2,
  },
  breakdownValue: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  breakdownLabel: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(11,28,48,0.4)',
  },
  sheet: {
    width: '85%',
    maxWidth: 360,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    gap: Spacing.gutter,
  },
  sheetTitle: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  sheetFields: {
    gap: Spacing.unit * 4,
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: Spacing.gutter,
  },
  sheetButton: {
    flex: 1,
  },
});
