import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { AppShell } from '../../components/layout/AppShell';
import { Button, DateTimeField } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { useQuery } from '@tanstack/react-query';
import { scheduleApi, ScheduleTypes } from '../../lib/api/schedule';
import { AllSchedulesSection } from './AllSchedulesSection';
import { getApiErrorMessage } from '../../lib/api/base_api';
import { Resources } from '../../lib/api/permission';

function notImplemented(label: string) {
  Alert.alert(label, 'Coming soon.');
}

type DateRange = { from: string; to: string };

function formatRangeLabel(range: DateRange): string {
  const format = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${format(range.from)} - ${format(range.to)}`;
}

export function ManageShiftsScreen() {
  const router = useRouter();

  // The Date Range filter lives only on this screen — `AllSchedulesSection`
  // on the SchedulesScreen "homepage" tab has no range picker and always
  // shows the unbounded, today-forward default.
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [rangeError, setRangeError] = useState<string | undefined>();

  const {
    data: scheduleData,
    isPending: isSchedulesLoading,
    isError: isSchedulesError,
    error: schedulesError,
  } = useQuery({
    queryKey: ['schedules', dateRange?.from, dateRange?.to, ScheduleTypes.ALL],
    queryFn: () => scheduleApi.list({ schedule_type: ScheduleTypes.ALL, from: dateRange?.from, to: dateRange?.to }),
  });
  const schedules = scheduleData?.results ?? [];

  const openPicker = () => {
    setDraftFrom(dateRange?.from ?? '');
    setDraftTo(dateRange?.to ?? '');
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

  const clearRange = () => {
    setDateRange(null);
    setPickerOpen(false);
  };

  return (
    <AppShell>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Manage Schedules</Text>
          <Text style={styles.subtitle}>Review and modify employee schedules.</Text>
        </View>

        <Button
          label="New Schedule"
          icon={<MaterialIcons name="add" size={20} color={Colors.onPrimary} />}
          onPress={() => router.push('/create-shift')}
          permission={{ resource: Resources.SCHEDULE, action: 'add' }}
        />

        {/* <SearchField placeholder="Search employees..." value={query} onChangeText={setQuery} /> */}

        <View style={styles.filterRow}>
          <Pressable style={styles.filterChip} onPress={() => notImplemented('Filter')}>
            <MaterialIcons name="filter-list" size={16} color={Colors.onSurface} />
            <Text style={styles.filterChipText}>Filter</Text>
          </Pressable>
          <Pressable style={styles.filterChip} onPress={openPicker}>
            <MaterialIcons name="calendar-today" size={16} color={Colors.onSurface} />
            <Text style={styles.filterChipText}>{dateRange ? formatRangeLabel(dateRange) : 'Date Range'}</Text>
            {dateRange ? (
              <Pressable onPress={clearRange} hitSlop={8}>
                <MaterialIcons name="close" size={14} color={Colors.onSurfaceVariant} />
              </Pressable>
            ) : null}
          </Pressable>
        </View>

        {isSchedulesLoading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : isSchedulesError ? (
          <Text style={styles.errorText}>{getApiErrorMessage(schedulesError, 'Failed to load schedules.')}</Text>
        ) : (
          // Remounted (via `key`) whenever the range changes, so
          // AllSchedulesSection's internal date-window state — captured
          // once on mount — starts fresh rather than needing to react to a
          // changing `dateRange` prop.
          <AllSchedulesSection
            key={dateRange ? `${dateRange.from}_${dateRange.to}` : 'default'}
            schedules={schedules}
            dateRange={dateRange ? { from: new Date(dateRange.from), to: new Date(dateRange.to) } : undefined}
          />
        )}
      </ScrollView>

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
              <Button label="Clear" variant="secondary" onPress={clearRange} style={styles.sheetButton} />
              <Button label="Apply" onPress={applyRange} style={styles.sheetButton} />
            </View>
          </View>
        </View>
      </Modal>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: Spacing.containerPaddingMobile,
    gap: Spacing.gutter,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.unit,
    marginBottom: Spacing.unit,
  },
  title: {
    ...Typography.headlineLgMobile,
    color: Colors.onSurface,
  },
  subtitle: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.unit * 3,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
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
  shiftList: {
    gap: Spacing.gutter,
    marginTop: Spacing.unit,
  },
  loading: {
    marginTop: Spacing.sectionGap,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
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
