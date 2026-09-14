import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { AppShell } from '../../components/layout/AppShell';
import { Button } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { scheduleApi, ScheduleTimeScope, ScheduleTypes } from '../../lib/api/schedule';
import { AllSchedulesSection } from './AllSchedulesSection';
import { getApiErrorMessage } from '../../lib/api/base_api';
import { Resources } from '../../lib/api/permission';

function notImplemented(label: string) {
  Alert.alert(label, 'Coming soon.');
}

type ScheduleFilters = { from: string; to: string; timeScope: ScheduleTimeScope };

export function ManageShiftsScreen() {
  const router = useRouter();

  // AllSchedulesSection now owns the From/To date fields and Upcoming/
  // Previous toggle itself (reported up via `onFiltersChange`) — this just
  // mirrors those filters so the query below knows what to fetch. `null`
  // until AllSchedulesSection's own mount effect reports its defaults
  // (today -> today+10, ScheduleTimeScope.UPCOMING).
  const [filters, setFilters] = useState<ScheduleFilters | null>(null);

  const {
    data: scheduleData,
    isPending: isSchedulesLoading,
    isError: isSchedulesError,
    error: schedulesError,
  } = useQuery({
    queryKey: ['schedules', filters?.from, filters?.to, filters?.timeScope, ScheduleTypes.ALL],
    queryFn: () =>
      scheduleApi.list({
        schedule_type: ScheduleTypes.ALL,
        from: filters?.from,
        to: filters?.to,
        time_scope: filters?.timeScope,
      }),
    enabled: !!filters,
    // Keeps the previously-selected filters' data on screen while a newly
    // selected range/scope is in flight, instead of flashing the loading
    // state on every date-field or toggle tweak.
    placeholderData: keepPreviousData,
  });
  const schedules = scheduleData?.results ?? [];

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
        </View>

        <AllSchedulesSection
          schedules={schedules}
          isLoading={!filters || isSchedulesLoading}
          errorMessage={isSchedulesError ? getApiErrorMessage(schedulesError, 'Failed to load schedules.') : undefined}
          onFiltersChange={setFilters}
        />
      </ScrollView>
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
});
