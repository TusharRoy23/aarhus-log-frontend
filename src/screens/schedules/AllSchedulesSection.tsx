import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { DateScroller, ShiftCard, type DateScrollerItem } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { formatTimeRange, isSameDay, locationLabel, capitalize } from './schedule-format';
import type { Schedule } from '../../lib/api/schedule';

function notImplemented(label: string) {
  Alert.alert(label, 'Coming soon.');
}

const DAY_CHUNK_SIZE = 20;

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetweenInclusive(from: Date, to: Date): number {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.max(Math.floor(ms / (24 * 60 * 60 * 1000)) + 1, 0);
}

function buildDates(rangeStart: Date, count: number): { item: DateScrollerItem; date: Date }[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate() + i);
    return {
      date,
      item: {
        key: dateKey(date),
        label: date.toLocaleDateString(undefined, { weekday: 'short' }),
        day: date.getDate(),
      },
    };
  });
}

export interface AllSchedulesSectionProps {
  schedules: Schedule[];
  /**
   * Bounds the date scroller to a specific range (e.g. a Manage Shifts
   * "Date Range" filter) — dates only page in up to `to`, never beyond.
   * When omitted, the scroller starts today and pages forward indefinitely
   * (the "homepage" Schedules view — no range picker there).
   */
  dateRange?: { from: Date; to: Date };
}

export function AllSchedulesSection({ schedules, dateRange }: AllSchedulesSectionProps) {
  const router = useRouter();

  // Captured once on mount — a changing `dateRange` is handled by the
  // parent remounting this component (e.g. via a `key` tied to the range),
  // not by reacting to prop changes here.
  const [rangeStart] = useState(() => (dateRange ? startOfDay(dateRange.from) : startOfDay(new Date())));
  const totalDaysAvailable = useState(() =>
    dateRange ? daysBetweenInclusive(dateRange.from, dateRange.to) : Infinity,
  )[0];

  const [loadedCount, setLoadedCount] = useState(() => Math.min(DAY_CHUNK_SIZE, totalDaysAvailable));
  const dates = useMemo(() => buildDates(rangeStart, loadedCount), [rangeStart, loadedCount]);

  // A date filter is mandatory — there's no "show every schedule" state,
  // so `selectedKey` always points at one of `dates` and tapping a chip
  // always selects it (no toggle-to-deselect).
  const [selectedKey, setSelectedKey] = useState(dates[0].item.key);

  const canLoadMore = loadedCount < totalDaysAvailable;
  const loadMoreDates = canLoadMore
    ? () => setLoadedCount((count) => Math.min(count + DAY_CHUNK_SIZE, totalDaysAvailable))
    : undefined;

  const selectedDate = dates.find((w) => w.item.key === selectedKey)?.date ?? dates[0].date;

  const shiftsForDay = useMemo(
    () => schedules.filter((s) => isSameDay(new Date(s.start_time), selectedDate)),
    [schedules, selectedDate],
  );

  return (
    <View style={styles.container}>
      <DateScroller
        dates={dates.map((w) => w.item)}
        selectedKey={selectedKey}
        onSelect={setSelectedKey}
        onEndReached={loadMoreDates}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <Pressable style={styles.filterChip} onPress={() => notImplemented('Filter by role')}>
          <MaterialIcons name="filter-list" size={16} color={Colors.onSurface} />
          <Text style={styles.filterChipText}>All Roles</Text>
        </Pressable>
        <Pressable style={styles.filterChip} onPress={() => notImplemented('Filter by zone')}>
          <Text style={styles.filterChipText}>All Zones</Text>
        </Pressable>
      </ScrollView>

      {shiftsForDay.length > 0 ? (
        <View style={styles.shiftGrid}>
          {shiftsForDay.map((shift) => (
            <ShiftCard
              key={shift.uuid}
              name={`${shift.employee.first_name} ${shift.employee.last_name}`}
              role={shift.employee.designation.name}
              status={shift.status}
              statusLabel={capitalize(shift.status)}
              timeRange={formatTimeRange(shift.start_time, shift.end_time)}
              location={locationLabel(shift.work_location)}
              onDetails={() => notImplemented('Shift Details')}
              onEdit={() => router.push({ pathname: '/create-shift', params: { uuid: shift.uuid } })}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No shifts scheduled for this day.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sectionGap,
  },
  filterRow: {
    gap: Spacing.unit * 3,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.unit * 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  filterChipText: {
    ...Typography.labelSm,
    color: Colors.onSurface,
  },
  shiftGrid: {
    gap: Spacing.gutter,
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
});
