import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { AppShell } from '../../components/layout/AppShell';
import { Button, SegmentedControl } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { useAppSelector } from '../../store/hooks';
import { scheduleApi, ScheduleTypes } from '../../lib/api/schedule';
import { getApiErrorMessage } from '../../lib/api/base_api';
import { MyScheduleSection } from './MyScheduleSection';
import { AllSchedulesSection } from './AllSchedulesSection';

export function SchedulesScreen() {
  const router = useRouter();
  const [view, setView] = useState<'mine' | 'all'>('mine');
  const currentUserEmail = useAppSelector((state) => state.auth.user?.email);

  // "My Schedule" and "All Schedules" are backed by separate API calls, not
  // one shared fetch filtered client-side — switching tabs sends a
  // different `schedule_type` and gets its own query-cache entry.
  const scheduleType = view === 'mine' ? ScheduleTypes.INDIVIDUAL : ScheduleTypes.ALL;
  const {
    data: scheduleData,
    isPending: isSchedulesLoading,
    isError: isSchedulesError,
    error: schedulesError,
  } = useQuery({
    queryKey: ['schedules', scheduleType],
    queryFn: () => scheduleApi.list({ schedule_type: scheduleType }),
  });
  const schedules = scheduleData?.results ?? [];

  return (
    <AppShell>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Schedules</Text>
            <Text style={styles.subtitle}>Manage and view team shifts across all zones.</Text>
          </View>
        </View>

        <SegmentedControl
          value={view}
          onChange={setView}
          options={[
            { value: 'mine', label: 'My Schedule' },
            { value: 'all', label: 'All Schedules' },
          ]}
        />

        {isSchedulesLoading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : isSchedulesError ? (
          <Text style={styles.errorText}>{getApiErrorMessage(schedulesError, 'Failed to load schedules.')}</Text>
        ) : view === 'mine' ? (
          <MyScheduleSection
            schedules={schedules}
            currentUserEmail={currentUserEmail}
            onViewAllShifts={() => setView('all')}
          />
        ) : (
          <AllSchedulesSection schedules={schedules} />
        )}
      </ScrollView>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: Spacing.gutter,
  },
  headerText: {
    flex: 1,
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
  createButton: {
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.unit * 3,
    borderRadius: Radius.full,
  },
  loading: {
    marginTop: Spacing.sectionGap,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
});
