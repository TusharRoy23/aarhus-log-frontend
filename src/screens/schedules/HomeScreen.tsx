import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '../../components/layout/AppShell';
import { SegmentedControl } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { useAppSelector } from '../../store/hooks';
import { scheduleApi, ScheduleTypes } from '../../lib/api/schedule';
import { getApiErrorMessage } from '../../lib/api/base_api';
import { CurrentShiftCard } from './CurrentShiftCard';
import { MyScheduleSection } from './MyScheduleSection';
import { PeopleOnFloorSection } from './PeopleOnFloorSection';

function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// This is the post-login landing page — same content for every user
// regardless of role/permissions (unlike the Menu drawer, nothing here is
// gated by `usePermissionCheck`). Current Schedule is always shown above the
// tab switch since it's the one piece of genuinely "homepage" content;
// "My Schedule"/"People on the Floor" are lighter, tab-switched detail below
// it rather than the whole page's structure.
export function HomeScreen() {
  const [view, setView] = useState<'mine' | 'floor'>('mine');
  const user = useAppSelector((state) => state.auth.user);
  const currentUserEmail = user?.email;
  const firstName = user?.name?.split(' ')[0] || user?.username || 'there';
  const todayLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
    [],
  );

  // Always fetched, regardless of which tab is active — it's what powers
  // the always-visible Current Schedule as well as the "My Schedule" tab.
  const {
    data: mineData,
    isPending: isMinePending,
    isError: isMineError,
    error: mineError,
  } = useQuery({
    queryKey: ['schedules', ScheduleTypes.INDIVIDUAL],
    queryFn: () => scheduleApi.list({ schedule_type: ScheduleTypes.INDIVIDUAL }),
  });
  const mySchedules = useMemo(
    () => (currentUserEmail ? (mineData?.results ?? []).filter((s) => s.employee.email === currentUserEmail) : []),
    [mineData, currentUserEmail],
  );
  const currentShift = useMemo(() => {
    const now = Date.now();
    return mySchedules.find((s) => new Date(s.start_time).getTime() <= now && now <= new Date(s.end_time).getTime());
  }, [mySchedules]);

  // Today's whole-team roster — only fetched once "People on the Floor" is
  // actually opened, and scoped to today only. This is a homepage glance,
  // not the full date-range browser (that's Manage Shifts' job).
  const todayStr = useMemo(() => todayDateString(), []);
  const {
    data: floorData,
    isPending: isFloorPending,
    isError: isFloorError,
    error: floorError,
  } = useQuery({
    queryKey: ['schedules', 'floor', todayStr],
    queryFn: () => scheduleApi.list({ schedule_type: ScheduleTypes.ALL, from: todayStr, to: todayStr }),
    enabled: view === 'floor',
  });
  const floorSchedules = floorData?.results ?? [];

  return (
    <AppShell>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>
              {getGreeting()}, {firstName}
            </Text>
            <Text style={styles.subtitle}>{todayLabel}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Schedule</Text>
          {isMinePending ? (
            <ActivityIndicator color={Colors.primary} style={styles.loading} />
          ) : isMineError ? (
            <Text style={styles.errorText}>{getApiErrorMessage(mineError, 'Failed to load your schedule.')}</Text>
          ) : currentShift ? (
            <CurrentShiftCard shift={currentShift} />
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No schedule in progress right now.</Text>
            </View>
          )}
        </View>

        <SegmentedControl
          value={view}
          onChange={setView}
          options={[
            { value: 'mine', label: 'My Schedule' },
            { value: 'floor', label: 'People on the Floor' },
          ]}
        />

        {view === 'mine' ? (
          isMinePending ? (
            <ActivityIndicator color={Colors.primary} style={styles.loading} />
          ) : isMineError ? (
            <Text style={styles.errorText}>{getApiErrorMessage(mineError, 'Failed to load your schedule.')}</Text>
          ) : (
            <MyScheduleSection schedules={mySchedules} />
          )
        ) : isFloorPending ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : isFloorError ? (
          <Text style={styles.errorText}>{getApiErrorMessage(floorError, "Failed to load today's schedule.")}</Text>
        ) : (
          <PeopleOnFloorSection schedules={floorSchedules} />
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
