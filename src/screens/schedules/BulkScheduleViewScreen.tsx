import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { useAppSelector } from '../../store/hooks';
import { scheduleApi, type WorkWeek } from '../../lib/api/schedule';
import { getApiErrorMessage } from '../../lib/api/base_api';
import { resolveBulkScheduleWeek } from './schedule-format';
import { PublishedScheduleBoard } from './PublishedScheduleBoard';

// Read-only detail view for one published bulk schedule, reached by tapping
// a row in the Home screen's "Schedules" tab (SchedulePanel). Renders
// PublishedScheduleBoard — a dedicated task-board-style layout, distinct
// from BulkScheduleWeekGrid's own readOnly mode (which stays the plain
// table view, unaffected by this screen's redesign).
export function BulkScheduleViewScreen() {
  const router = useRouter();
  const organization = useAppSelector((state) => state.auth.organization);
  const { week_number: weekNumberParam } = useLocalSearchParams<{ week_number?: string }>();
  const weekNumber = Number(weekNumberParam);

  const {
    data: bulkSchedule,
    isPending: isBulkSchedulePending,
    isError: isBulkScheduleError,
    error: bulkScheduleError,
  } = useQuery({
    queryKey: ['bulk-schedule', weekNumber],
    queryFn: () => scheduleApi.getPublishedBulkSchedule(weekNumber),
    enabled: Number.isFinite(weekNumber),
  });

  // Only needed to resolve this week's start_date/end_date (see
  // resolveBulkScheduleWeek) — the week_number/week_year themselves already
  // come straight from `bulkSchedule`.
  const { data: workWeekData, isPending: isWorkWeeksPending } = useQuery({
    queryKey: ['work-weeks', 'upcoming'],
    queryFn: () => scheduleApi.listWorkWeeks('upcoming'),
  });
  const workWeeks: WorkWeek[] = workWeekData?.results ?? [];

  const resolvedWeek = bulkSchedule != null ? resolveBulkScheduleWeek(bulkSchedule, workWeeks) : undefined;

  const isLoading = isBulkSchedulePending || isWorkWeeksPending;
  const loadError = isBulkScheduleError
    ? getApiErrorMessage(bulkScheduleError, 'Failed to load this schedule.')
    : !isLoading && (!bulkSchedule || !resolvedWeek)
      ? 'This schedule could not be found.'
      : undefined;

  const weekNumbers = workWeeks.map((week) => week.week_number);
  const currentWeekIndex = weekNumbers.indexOf(weekNumber);
  const previousWeekNumber = currentWeekIndex > 0 ? weekNumbers[currentWeekIndex - 1] : undefined;
  const nextWeekNumber =
    currentWeekIndex !== -1 && currentWeekIndex < weekNumbers.length - 1
      ? weekNumbers[currentWeekIndex + 1]
      : undefined;

  const goToWeek = (target: number | undefined) => {
    if (target === undefined) return;
    router.setParams({ week_number: String(target) });
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {organization?.name ?? 'Published Schedule'}
        </Text>
      </View>

      <View style={styles.weekNavRow}>
        <Text style={styles.weekNavLabel}>{Number.isFinite(weekNumber) ? `Week ${weekNumber}` : 'This week'}</Text>
        <View style={styles.weekNavArrows}>
          <Pressable
            style={[styles.weekNavButton, previousWeekNumber === undefined && styles.weekNavButtonDisabled]}
            onPress={() => goToWeek(previousWeekNumber)}
            disabled={previousWeekNumber === undefined}
            hitSlop={8}
          >
            <MaterialIcons
              name="chevron-left"
              size={20}
              color={previousWeekNumber !== undefined ? Colors.onSurface : Colors.outline}
            />
          </Pressable>
          <Pressable
            style={[styles.weekNavButton, nextWeekNumber === undefined && styles.weekNavButtonDisabled]}
            onPress={() => goToWeek(nextWeekNumber)}
            disabled={nextWeekNumber === undefined}
            hitSlop={8}
          >
            <MaterialIcons
              name="chevron-right"
              size={20}
              color={nextWeekNumber !== undefined ? Colors.onSurface : Colors.outline}
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : loadError ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <MaterialIcons name="event-busy" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.emptyStateTitle}>The schedule is not ready</Text>
            <Text style={styles.emptyStateSubtitle}>{loadError}</Text>
          </View>
        ) : bulkSchedule && resolvedWeek ? (
          <PublishedScheduleBoard week={resolvedWeek} schedules={bulkSchedule.schedules} />
        ) : null}
      </View>
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
  headerTitle: {
    ...Typography.headlineLgMobile,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.onSurface,
    flex: 1,
  },
  weekNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.containerPaddingMobile,
    paddingVertical: Spacing.unit * 3,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  weekNavLabel: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  weekNavArrows: {
    flexDirection: 'row',
    gap: Spacing.unit * 2,
  },
  weekNavButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekNavButtonDisabled: {
    opacity: 0.4,
  },
  // flex: 1 (not a ScrollView) so PublishedScheduleBoard actually receives
  // the remaining screen height to stretch its columns to, instead of an
  // unbounded, content-sized height. Each column scrolls internally if its
  // own shifts overflow that height — see PublishedScheduleBoard.
  content: {
    flex: 1,
    padding: Spacing.containerPaddingMobile,
  },
  loading: {
    marginTop: Spacing.sectionGap,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.unit * 2,
    paddingHorizontal: Spacing.sectionGap,
  },
  emptyStateIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.unit,
  },
  emptyStateTitle: {
    ...Typography.titleMd,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
