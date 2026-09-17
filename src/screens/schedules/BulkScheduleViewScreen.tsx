import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { scheduleApi, type Schedule, type WorkWeek } from '../../lib/api/schedule';
import { getApiErrorMessage } from '../../lib/api/base_api';
import { formatWeekLabel, parseDateOnly, resolveBulkScheduleWeek } from './schedule-format';
import { buildCellsFromSchedules } from './BulkScheduleScreen';
import { BulkScheduleWeekGrid, type BulkEmployeeRow } from './BulkScheduleWeekGrid';

// One row per employee that actually has a shift in this bulk schedule —
// deliberately not every active employee (unlike the create/edit screen),
// since this is a read-only view of a specific already-published roster,
// not a blank grid waiting to be filled in.
function employeesFromSchedules(schedules: Schedule[]): BulkEmployeeRow[] {
  const seen = new Set<string>();
  const rows: BulkEmployeeRow[] = [];
  for (const schedule of schedules) {
    if (seen.has(schedule.employee.uuid)) continue;
    seen.add(schedule.employee.uuid);
    rows.push({
      uuid: schedule.employee.uuid,
      name: `${schedule.employee.first_name} ${schedule.employee.last_name}`,
      designation: schedule.employee.designation.name,
    });
  }
  return rows;
}

// Read-only detail view for one published bulk schedule, reached by tapping
// a row in the Home screen's "Schedules" tab (SchedulePanel). Reuses
// BulkScheduleWeekGrid in `readOnly` mode — same grid UI as the admin
// create/edit screen, just with cell taps and Save/Publish removed.
export function BulkScheduleViewScreen() {
  const router = useRouter();
  const { week_number: weekNumberParam } = useLocalSearchParams<{ week_number?: string }>();
  const weekNumber = Number(weekNumberParam);

  const {
    data: bulkSchedule,
    isPending: isBulkSchedulePending,
    isError: isBulkScheduleError,
    error: bulkScheduleError,
  } = useQuery({
    queryKey: ['bulk-schedule', weekNumber],
    queryFn: () => scheduleApi.getBulkSchedule(weekNumber),
    enabled: Number.isFinite(weekNumber),
  });

  // Only needed to resolve this week's start_date/end_date (see
  // resolveBulkScheduleWeek) — the week_number/week_year themselves already
  // come straight from `bulkSchedule`.
  const { data: workWeekData, isPending: isWorkWeeksPending } = useQuery({
    queryKey: ['work-weeks'],
    queryFn: scheduleApi.listWorkWeeks,
  });
  const workWeeks: WorkWeek[] = workWeekData?.results ?? [];

  const resolvedWeek = bulkSchedule ? resolveBulkScheduleWeek(bulkSchedule, workWeeks) : undefined;

  const isLoading = isBulkSchedulePending || isWorkWeeksPending;
  const loadError = isBulkScheduleError
    ? getApiErrorMessage(bulkScheduleError, 'Failed to load this schedule.')
    : !isLoading && (!bulkSchedule || !resolvedWeek)
      ? 'This schedule could not be found.'
      : undefined;

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Published Schedule</Text>
          <Text style={styles.headerSubtitle}>{resolvedWeek ? formatWeekLabel(resolvedWeek) : 'Viewing this week'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : loadError ? (
          <Text style={styles.errorText}>{loadError}</Text>
        ) : bulkSchedule && resolvedWeek ? (
          <BulkScheduleWeekGrid
            employees={employeesFromSchedules(bulkSchedule.schedules)}
            week={resolvedWeek}
            cells={buildCellsFromSchedules(bulkSchedule.schedules, parseDateOnly(resolvedWeek.start_date))}
            onCellChange={() => {}}
            readOnly
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gutter,
    padding: Spacing.containerPaddingMobile,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  headerText: {
    gap: 2,
  },
  headerTitle: {
    ...Typography.headlineLgMobile,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.onSurface,
  },
  headerSubtitle: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  scrollContent: {
    padding: Spacing.containerPaddingMobile,
    gap: Spacing.gutter,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: Spacing.sectionGap * 2,
  },
  loading: {
    marginTop: Spacing.sectionGap,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
});
