import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { scheduleApi } from '../../lib/api/schedule';
import { getApiErrorMessage } from '../../lib/api/base_api';
import { Resources } from '../../lib/api/permission';
import { BulkScheduleListSection } from './BulkScheduleListSection';

// The "Bulk Schedules" tab's content on Manage Schedules — owns its own
// query, its own create button, and its own list. Mounted only while this
// tab is active, so mounting itself is the fetch trigger for the query
// below (no `enabled` flag needed).
export function BulkSchedulesTab() {
  const router = useRouter();

  const {
    data: bulkScheduleData,
    isPending: isBulkSchedulesLoading,
    isError: isBulkSchedulesError,
    error: bulkSchedulesError,
  } = useQuery({ queryKey: ['bulk-schedules'], queryFn: scheduleApi.bulkList });
  const bulkSchedules = bulkScheduleData?.results ?? [];

  return (
    <>
      <Button
        label="New Bulk Schedule"
        icon={<MaterialIcons name="add" size={20} color={Colors.onPrimary} />}
        onPress={() => router.push('/bulk-schedule')}
        permission={{ resource: Resources.SCHEDULE, action: 'add' }}
      />

      {isBulkSchedulesLoading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loading} />
      ) : isBulkSchedulesError ? (
        <Text style={styles.errorText}>{getApiErrorMessage(bulkSchedulesError, 'Failed to load bulk schedules.')}</Text>
      ) : (
        <BulkScheduleListSection
          bulkSchedules={bulkSchedules}
          onSelect={(bulkSchedule) => router.push({ pathname: '/bulk-schedule', params: { uuid: bulkSchedule.uuid } })}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    marginTop: Spacing.sectionGap,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
});
