import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ActionMenu, DateTimeField, ShiftCard } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { formatTimeRange, locationLabel, capitalize, todayDateString } from './schedule-format';
import { ScheduleTimeScope } from '../../lib/api/schedule';
import { SchedulesSectionProps } from '../../constants/types';

const TIME_SCOPE_LABELS: Record<ScheduleTimeScope, string> = {
  [ScheduleTimeScope.UPCOMING]: 'Upcoming',
  [ScheduleTimeScope.PREVIOUS]: 'Previous',
};

// Derived from the enum itself (not a hardcoded pair) — if ScheduleTimeScope
// ever grows a third value, it shows up here automatically, no code change
// needed at this call site.
const TIME_SCOPE_VALUES = Object.values(ScheduleTimeScope);

function notImplemented(label: string) {
  Alert.alert(label, 'Coming soon.');
}

const DEFAULT_RANGE_DAYS = 10;

function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day + days);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

// Owns its own From/To range (defaults to today -> today+10) and Upcoming/
// Previous time-scope toggle (defaults to Upcoming), and just reports them
// upward via `onFiltersChange` — the parent (MyShiftsPanel,
// ManageShiftsScreen) owns the actual fetch and passes the results back
// down as `schedules`, already scoped to these filters server-side. Replaced
// the old DateScroller-driven "pick exactly one day, filter client-side"
// design — this section no longer narrows `schedules` to a single day at
// all, it just lists everything it's given.
export function AllSchedulesSection({ schedules, isLoading, errorMessage, onFiltersChange }: SchedulesSectionProps) {
  const router = useRouter();

  const [from, setFrom] = useState(() => todayDateString());
  const [to, setTo] = useState(() => addDays(todayDateString(), DEFAULT_RANGE_DAYS));
  const [timeScope, setTimeScope] = useState<ScheduleTimeScope>(ScheduleTimeScope.UPCOMING);

  useEffect(() => {
    onFiltersChange?.({ from, to, timeScope });
  }, [from, to, timeScope, onFiltersChange]);

  const sortedSchedules = useMemo(
    () => [...schedules].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
    [schedules],
  );

  return (
    <View style={styles.container}>
      <View style={styles.dateRangeRow}>
        <View style={styles.dateField}>
          <DateTimeField label="From" mode="date" value={from} onChange={setFrom} />
        </View>
        <View style={styles.dateField}>
          <DateTimeField label="To" mode="date" value={to} onChange={setTo} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <ActionMenu
          trigger={
            <View style={styles.filterChip}>
              <MaterialIcons name="event" size={16} color={Colors.onSurface} />
              <Text style={styles.filterChipText}>{TIME_SCOPE_LABELS[timeScope]}</Text>
            </View>
          }
          items={TIME_SCOPE_VALUES.map((scope) => ({
            label: TIME_SCOPE_LABELS[scope],
            icon: 'event' as const,
            onPress: () => setTimeScope(scope),
          }))}
        />
        <Pressable style={styles.filterChip} onPress={() => notImplemented('Filter by role')}>
          <MaterialIcons name="filter-list" size={16} color={Colors.onSurface} />
          <Text style={styles.filterChipText}>All Roles</Text>
        </Pressable>
        <Pressable style={styles.filterChip} onPress={() => notImplemented('Filter by zone')}>
          <Text style={styles.filterChipText}>All Zones</Text>
        </Pressable>
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loading} />
      ) : errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : sortedSchedules.length > 0 ? (
        <View style={styles.shiftGrid}>
          {sortedSchedules.map((shift) => (
            <ShiftCard
              key={shift.uuid}
              name={`${shift.employee.first_name} ${shift.employee.last_name}`}
              role={shift.employee.designation.name}
              status={shift.status}
              statusLabel={capitalize(shift.status)}
              timeRange={formatTimeRange(shift.start_time, shift.end_time)}
              location={locationLabel(shift.work_location)}
              onDetails={() => notImplemented('Schedule Details')}
              onEdit={() => router.push({ pathname: '/create-shift', params: { uuid: shift.uuid } })}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No schedules in this range.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sectionGap,
  },
  dateRangeRow: {
    flexDirection: 'row',
    gap: Spacing.gutter,
  },
  dateField: {
    flex: 1,
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
});
