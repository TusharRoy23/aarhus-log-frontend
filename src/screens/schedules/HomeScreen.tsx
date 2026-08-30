import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { AppShell } from '../../components/layout/AppShell';
import { Button, SegmentedControl } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { useAppSelector } from '../../store/hooks';
import { scheduleApi, ScheduleTypes, type StartSchedulePayload } from '../../lib/api/schedule';
import { getApiErrorMessage } from '../../lib/api/base_api';
import { CurrentShiftCard } from './CurrentShiftCard';
import { MyScheduleSection } from './MyScheduleSection';
import { PeopleOnFloorSection } from './PeopleOnFloorSection';

// An assigned shift starts showing here (with a "Start Shift" action) once
// it's within this many hours of its start_time — before that it's just
// part of the normal Upcoming list, not "current" yet. Also covers a shift
// whose start_time has already passed but hasn't been checked into yet
// (see `isDueSoon` below) — the window is measured from "now" either way.
const STARTING_SOON_WINDOW_MS = 2 * 60 * 60 * 1000;

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
  const queryClient = useQueryClient();

  // Always fetched, regardless of which tab is active — it's what powers
  // the "My Schedule" tab and the assigned-shift-due-soon check below.
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

  // The real source of truth for "is a shift running right now" — NOT a
  // wall-clock comparison against an assigned schedule's start/end times.
  // The countdown only ever starts once the user presses Start (calling
  // scheduleApi.start below), never automatically just because the current
  // time falls inside a scheduled window.
  const activeQuery = useQuery({
    queryKey: ['active-schedule'],
    queryFn: scheduleApi.getActive,
    // A 404 here just means "nobody has checked in" — a normal state, not
    // a failure worth alarming the user about via the global error toast.
    meta: { suppressToastForStatuses: [404] },
  });
  // No active schedule is a normal state, not an error — the endpoint 404s
  // (or could plausibly return a null body) when nobody has checked in.
  // Anything else is a real fetch failure.
  const activeFetchFailed = activeQuery.isError && (activeQuery.error as { status?: number })?.status !== 404;
  const active = activeQuery.data ?? undefined;
  // A `stop()` response is still an ActiveScheduleResponse (the now-ended
  // record) — `end_time` is what actually distinguishes "currently running"
  // from "just finished".
  const isActiveOngoing = !!active && active.end_time === null;

  // An *assigned* schedule that's due soon: starts within
  // STARTING_SOON_WINDOW_MS, OR its start_time already passed but it hasn't
  // ended yet and nobody's checked in (`isActiveOngoing` is false) — either
  // way, offer to start it. Only relevant when nothing is already running.
  const dueShift = useMemo(() => {
    if (isActiveOngoing) return undefined;
    const now = Date.now();
    return mySchedules
      .filter((s) => {
        const end = new Date(s.end_time).getTime();
        const startsInMs = new Date(s.start_time).getTime() - now;
        return end > now && startsInMs <= STARTING_SOON_WINDOW_MS;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];
  }, [mySchedules, isActiveOngoing]);

  const startMutation = useMutation({
    mutationFn: (payload: StartSchedulePayload) => scheduleApi.start(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['active-schedule'], data);
    },
  });
  const stopMutation = useMutation({
    mutationFn: () => scheduleApi.stop(),
    onSuccess: (data) => {
      queryClient.setQueryData(['active-schedule'], data);
    },
  });

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
          {isMinePending || activeQuery.isPending ? (
            <ActivityIndicator color={Colors.primary} style={styles.loading} />
          ) : isMineError || activeFetchFailed ? (
            <Text style={styles.errorText}>
              {getApiErrorMessage(isMineError ? mineError : activeQuery.error, 'Failed to load your schedule.')}
            </Text>
          ) : isActiveOngoing && active ? (
            <CurrentShiftCard
              mode="in-progress"
              active={active}
              onEnd={() => stopMutation.mutate()}
              isEnding={stopMutation.isPending}
            />
          ) : dueShift ? (
            <CurrentShiftCard
              mode="starting-soon"
              shift={dueShift}
              onStart={() => startMutation.mutate({ schedule_uuid: dueShift.uuid })}
              isStarting={startMutation.isPending}
            />
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No schedule assigned right now.</Text>
              {/* "Open shift" — no assigned schedule at all, so let the
                  employee start ad-hoc work instead of just showing an
                  empty state. Distinct from "Start Shift" above, which
                  checks in to an already-assigned schedule. */}
              <Button
                label="Start New Shift"
                icon={<MaterialIcons name="add-circle-outline" size={18} color={Colors.onPrimary} />}
                onPress={() => startMutation.mutate({})}
                loading={startMutation.isPending}
                style={styles.startNewShiftButton}
              />
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
  startNewShiftButton: {
    marginTop: Spacing.unit * 4,
  },
});
