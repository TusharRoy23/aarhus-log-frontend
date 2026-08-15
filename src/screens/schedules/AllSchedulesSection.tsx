import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

// A rolling 7-day window starting today — every `day` (day-of-month number)
// in a 7-consecutive-day span is guaranteed unique even across a month
// boundary, so it's safe to use as DateScroller's selection key.
function buildWeekDates(): { item: DateScrollerItem; date: Date }[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    return {
      date,
      item: { label: date.toLocaleDateString(undefined, { weekday: 'short' }), day: date.getDate() },
    };
  });
}

export interface AllSchedulesSectionProps {
  schedules: Schedule[];
}

export function AllSchedulesSection({ schedules }: AllSchedulesSectionProps) {
  const weekDates = useMemo(buildWeekDates, []);
  const [selectedDay, setSelectedDay] = useState(weekDates[0].item.day);

  const selectedDate = weekDates.find((w) => w.item.day === selectedDay)?.date ?? weekDates[0].date;

  const shiftsForDay = useMemo(
    () => schedules.filter((s) => isSameDay(new Date(s.start_time), selectedDate)),
    [schedules, selectedDate],
  );

  return (
    <View style={styles.container}>
      <DateScroller dates={weekDates.map((w) => w.item)} selectedDay={selectedDay} onSelect={setSelectedDay} />

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
