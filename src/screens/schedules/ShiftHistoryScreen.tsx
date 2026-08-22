import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { AppShell } from '../../components/layout/AppShell';
import { Button, DateTimeField } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { useAppSelector } from '../../store/hooks';
import { scheduleApi, ScheduleTypes } from '../../lib/api/schedule';
import { getApiErrorMessage } from '../../lib/api/base_api';
import { formatDateLabel, formatTimeRange, locationLabel, capitalize } from './schedule-format';

const PAGE_SIZE = 10;

type DateRange = { from: string; to: string };

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

function formatRangeLabel(range: DateRange): string {
  const format = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${format(range.from)} - ${format(range.to)}`;
}

export function ShiftHistoryScreen() {
  const currentUserEmail = useAppSelector((state) => state.auth.user?.email);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Filtered client-side, same as the "past" derivation below — the query
  // already fetches this user's whole schedule history unbounded, so a
  // date range here doesn't need a new request, just a narrower filter over
  // data that's already in hand.
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [rangeError, setRangeError] = useState<string | undefined>();

  // Same cache the homepage's "My Shifts" tab already populates — if the
  // user already visited it this session, this renders instantly from
  // cache instead of firing a second request.
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['schedules', ScheduleTypes.INDIVIDUAL],
    queryFn: () => scheduleApi.list({ schedule_type: ScheduleTypes.INDIVIDUAL }),
  });

  const pastShifts = useMemo(() => {
    const now = Date.now();
    return (data?.results ?? [])
      .filter((s) => {
        if (!currentUserEmail || s.employee.email !== currentUserEmail) return false;
        if (new Date(s.end_time).getTime() >= now) return false;
        if (dateRange) {
          const key = localDateKey(new Date(s.start_time));
          if (key < dateRange.from || key > dateRange.to) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  }, [data, currentUserEmail, dateRange]);

  const visibleShifts = pastShifts.slice(0, visibleCount);
  const hasMore = visibleCount < pastShifts.length;

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
    setVisibleCount(PAGE_SIZE);
    setPickerOpen(false);
  };

  const clearRange = () => {
    setDateRange(null);
    setVisibleCount(PAGE_SIZE);
    setPickerOpen(false);
  };

  return (
    <AppShell>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Schedule History</Text>
          <Text style={styles.subtitle}>Your past schedules.</Text>
        </View>

        <View style={styles.filterRow}>
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

        {isPending ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : isError ? (
          <Text style={styles.errorText}>{getApiErrorMessage(error, 'Failed to load schedule history.')}</Text>
        ) : pastShifts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {dateRange ? 'No schedules found in this range.' : 'No past schedules yet.'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {visibleShifts.map((shift) => (
              <View key={shift.uuid} style={styles.item}>
                <View style={styles.itemStrip} />

                <View style={styles.itemBody}>
                  <View style={styles.itemTitleRow}>
                    <Text style={styles.itemDate}>{formatDateLabel(shift.start_time)}</Text>
                    <View style={styles.itemDivider} />
                    <Text style={styles.itemLocation}>{locationLabel(shift.work_location)}</Text>
                  </View>

                  <View style={styles.timeRow}>
                    <MaterialIcons name="schedule" size={16} color={Colors.onSurfaceVariant} />
                    <Text style={styles.itemTime}>{formatTimeRange(shift.start_time, shift.end_time)}</Text>
                  </View>

                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{capitalize(shift.status)}</Text>
                  </View>
                </View>
              </View>
            ))}

            {hasMore ? (
              <Pressable style={styles.loadMoreButton} onPress={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                <Text style={styles.loadMoreText}>Load More</Text>
              </Pressable>
            ) : null}
          </View>
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
    gap: Spacing.sectionGap,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.unit,
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
  loading: {
    marginTop: Spacing.sectionGap,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
  emptyCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
  },
  emptyText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  list: {
    gap: Spacing.gutter,
  },
  item: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.DEFAULT,
    overflow: 'hidden',
  },
  itemStrip: {
    width: 4,
    backgroundColor: Colors.outlineVariant,
  },
  itemBody: {
    flex: 1,
    padding: Spacing.cardPadding,
    gap: Spacing.unit * 2,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 3,
  },
  itemDate: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  itemDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.outlineVariant,
  },
  itemLocation: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
  },
  itemTime: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: Spacing.unit * 2,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  statusBadgeText: {
    ...Typography.labelSm,
    color: Colors.onSecondaryContainer,
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: Spacing.unit * 3,
  },
  loadMoreText: {
    ...Typography.labelSm,
    color: Colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
});
