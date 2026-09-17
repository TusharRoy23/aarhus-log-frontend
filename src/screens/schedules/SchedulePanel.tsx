import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { BulkScheduleStatus, scheduleApi } from '../../lib/api/schedule';
import { getApiErrorMessage } from '../../lib/api/base_api';
import { BulkScheduleListSection } from './BulkScheduleListSection';

// The "Schedules" tab's content on Home — a view of every published bulk
// schedule (weekly roster), reusing the same list UI as Manage Schedules'
// Bulk Schedule tab (BulkScheduleListSection). Tapping a row opens
// BulkScheduleViewScreen — the same grid UI the admin create/edit screen
// uses, but read-only (no cell editing, no Save/Publish): this tab is a
// general, unpermissioned view every employee sees on Home, not an entry
// point into the admin edit flow.
export function SchedulePanel() {
  const router = useRouter();

  const {
    data: bulkScheduleData,
    isPending: isBulkSchedulesLoading,
    isError: isBulkSchedulesError,
    error: bulkSchedulesError,
  } = useQuery({ queryKey: ['bulk-schedules'], queryFn: scheduleApi.bulkList });
  const publishedBulkSchedules = (bulkScheduleData?.results ?? []).filter(
    (bulkSchedule) => bulkSchedule.status === BulkScheduleStatus.PUBLISHED,
  );

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Schedule</Text>
      {isBulkSchedulesLoading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loading} />
      ) : isBulkSchedulesError ? (
        <Text style={styles.errorText}>{getApiErrorMessage(bulkSchedulesError, 'Failed to load schedules.')}</Text>
      ) : (
        <BulkScheduleListSection
          bulkSchedules={publishedBulkSchedules}
          onSelect={(bulkSchedule) =>
            router.push({ pathname: '/bulk-schedule-view', params: { week_number: bulkSchedule.week_number } })
          }
        />
      )}
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
  loading: {
    marginTop: Spacing.sectionGap,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
});
