import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, QrScannerModal } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { useAppSelector } from '../../store/hooks';
import { scheduleApi, ScheduleTypes, type StartSchedulePayload, type StopSchedulePayload } from '../../lib/api/schedule';
import { getApiErrorMessage } from '../../lib/api/base_api';
import { todayDateString } from './schedule-format';
import { CurrentShiftCard } from './CurrentShiftCard';
import { MyScheduleSection } from './MyScheduleSection';

// An assigned shift starts showing here (with a "Start Shift" action) once
// it's within this many hours of its start_time — before that it's just
// part of the normal Upcoming list, not "current" yet. Also covers a shift
// whose start_time has already passed but hasn't been checked into yet
// (see `isDueSoon` below) — the window is measured from "now" either way.
const STARTING_SOON_WINDOW_MS = 2 * 60 * 60 * 1000;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// The "Shifts" tab's content — owns its own data fetching. HomeScreen only
// mounts this panel while this tab is selected, so mounting itself is the
// fetch trigger; no `enabled` flag needed the way the old
// inline-in-HomeScreen version needed one. The greeting + "Current
// Schedule" card live here too (moved out of HomeScreen) since they're
// Shifts-tab content, not page-wide chrome — they don't show on the other
// tabs (People on the Floor, Draft Shifts, ...).
export function MyShiftsPanel() {
  const user = useAppSelector((state) => state.auth.user);
  const currentUserEmail = user?.email;
  const firstName = user?.name?.split(' ')[0] || user?.username || 'there';
  const todayLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
    [],
  );
  const queryClient = useQueryClient();
  const todayStr = useMemo(() => todayDateString(), []);

  // Always fetched while this panel is mounted — pinned to today so the
  // due-soon check below never depends on whatever day "My Schedule" (below)
  // happens to have scrolled to.
  const {
    data: dueShiftData,
    isPending: isDueShiftPending,
    isError: isDueShiftError,
    error: dueShiftError,
  } = useQuery({
    queryKey: ['schedules', ScheduleTypes.INDIVIDUAL, todayStr],
    queryFn: () => scheduleApi.list({ schedule_type: ScheduleTypes.INDIVIDUAL, from: todayStr, to: todayStr }),
  });
  const todaySchedules = useMemo(
    () =>
      currentUserEmail ? (dueShiftData?.results ?? []).filter((s) => s.employee.email === currentUserEmail) : [],
    [dueShiftData, currentUserEmail],
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
    return todaySchedules
      .filter((s) => {
        const end = new Date(s.end_time).getTime();
        const startsInMs = new Date(s.start_time).getTime() - now;
        return end > now && startsInMs <= STARTING_SOON_WINDOW_MS && s.status == 'pending';
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];
  }, [todaySchedules, isActiveOngoing]);

  const startMutation = useMutation({
    mutationFn: (payload: StartSchedulePayload) => scheduleApi.start(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['active-schedule'], data);
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    // This button has no inline error text of its own (unlike a form), so a
    // rejected qr_token (backend verifies it as part of starting) needs the
    // global toast to fire even on a 400 — which the default toast rule
    // deliberately excludes (see query-client.ts). Opt in just for this one.
    meta: { toastOnStatuses: [400] },
  });
  const stopMutation = useMutation({
    mutationFn: (payload: StopSchedulePayload) => scheduleApi.stop(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['active-schedule'], data);
      // Same reasoning as startMutation's onSuccess above.
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    // Same reasoning as startMutation above — no inline error spot on this
    // button, so a rejected qr_token needs the global toast even on a 400.
    meta: { toastOnStatuses: [400] },
  });

  const [scannerPurpose, setScannerPurpose] = useState<'start' | 'stop' | null>(null);
  const handleStartDueShift = () => {
    if (!dueShift) return;
    if (dueShift.start_method === 'qr' && Platform.OS !== 'web') {
      setScannerPurpose('start');
    } else {
      startMutation.mutate({ schedule_uuid: dueShift.uuid });
    }
  };
  const handleEndActiveShift = () => {
    if (active?.started_via === 'qr' && Platform.OS !== 'web') {
      setScannerPurpose('stop');
    } else {
      stopMutation.mutate({});
    }
  };

  // Follows whichever From/To range is currently selected in
  // AllSchedulesSection's own date fields (reported up via `onRangeChange`,
  // fired once on its mount with the default today -> today+10 range, and
  // again whenever the user changes either date). `null` until that first
  // report arrives, so `enabled: !!myRange` below avoids ever firing an
  // unbounded fetch in the gap between this panel mounting and that report
  // landing.
  const [myRange, setMyRange] = useState<{ from: string; to: string } | null>(null);
  const {
    data: myScheduleData,
    isPending: isMySchedulePending,
    isError: isMyScheduleError,
    error: myScheduleError,
  } = useQuery({
    queryKey: ['schedules', ScheduleTypes.INDIVIDUAL, myRange?.from, myRange?.to],
    queryFn: () =>
      scheduleApi.list({ schedule_type: ScheduleTypes.INDIVIDUAL, from: myRange?.from, to: myRange?.to }),
    enabled: !!myRange,
    // Keeps the previously-selected range's data on screen while a newly
    // selected range is in flight, instead of flashing the loading state on
    // every date-field tweak.
    placeholderData: keepPreviousData,
  });
  const mySchedules = useMemo(
    () =>
      currentUserEmail ? (myScheduleData?.results ?? []).filter((s) => s.employee.email === currentUserEmail) : [],
    [myScheduleData, currentUserEmail],
  );

  return (
    <>
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
        {isDueShiftPending || activeQuery.isPending ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : isDueShiftError || activeFetchFailed ? (
          <Text style={styles.errorText}>
            {getApiErrorMessage(isDueShiftError ? dueShiftError : activeQuery.error, 'Failed to load your schedule.')}
          </Text>
        ) : isActiveOngoing && active ? (
          <CurrentShiftCard
            mode="in-progress"
            active={active}
            onEnd={handleEndActiveShift}
            isEnding={stopMutation.isPending}
          />
        ) : dueShift ? (
          <CurrentShiftCard
            mode="starting-soon"
            shift={dueShift}
            onStart={handleStartDueShift}
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Schedule</Text>
        <MyScheduleSection
          schedules={mySchedules}
          isLoading={isMySchedulePending}
          errorMessage={isMyScheduleError ? getApiErrorMessage(myScheduleError, 'Failed to load your schedule.') : undefined}
          onRangeChange={setMyRange}
        />
      </View>

      <QrScannerModal
        visible={scannerPurpose !== null}
        onClose={() => setScannerPurpose(null)}
        onScanned={(token) => {
          const purpose = scannerPurpose;
          setScannerPurpose(null);
          if (purpose === 'start' && dueShift) {
            startMutation.mutate({ schedule_uuid: dueShift.uuid, qr_token: token });
          } else if (purpose === 'stop') {
            stopMutation.mutate({ qr_token: token });
          }
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
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
