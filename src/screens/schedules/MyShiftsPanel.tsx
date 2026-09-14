import { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { QrScannerModal } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { useAppSelector } from '../../store/hooks';
import { scheduleApi, ScheduleTimeScope, ScheduleTypes, type StartSchedulePayload, type StopSchedulePayload } from '../../lib/api/schedule';
import { getApiErrorMessage } from '../../lib/api/base_api';
import { CurrentScheduleSection } from './CurrentScheduleSection';
import { MyScheduleSection } from './MyScheduleSection';

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

  // A dedicated endpoint for "the single next assigned shift" — deliberately
  // kept separate from the "My Schedule" list query below (a different data
  // source entirely, not filtered out of or merged into that list). Same
  // 404-means-nothing-upcoming handling as `activeQuery` below, since this
  // is a single-record endpoint with the same shape of "normal empty state".
  const {
    data: upcomingShift,
    isPending: isUpcomingPending,
    isError: isUpcomingError,
    error: upcomingError,
  } = useQuery({
    queryKey: ['schedules', 'upcoming'],
    queryFn: scheduleApi.upComingShift,
    meta: { suppressToastForStatuses: [404] },
  });
  const upcomingFetchFailed = isUpcomingError && (upcomingError as { status?: number })?.status !== 404;

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

  const dueShift = useMemo(() => {
    if (isActiveOngoing || !upcomingShift) return undefined;
    const now = Date.now();
    const end = new Date(upcomingShift.end_time).getTime();
    if (end > now && upcomingShift.status === 'pending') {
      return upcomingShift;
    }
    return undefined;
  }, [upcomingShift, isActiveOngoing]);

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

  // Follows whichever From/To range + Upcoming/Previous scope is currently
  // selected in AllSchedulesSection's own controls (reported up via
  // `onFiltersChange`, fired once on its mount with the defaults
  // (today -> today+10, ScheduleTimeScope.UPCOMING) and again whenever the
  // user changes a date or the toggle). `null` until that first report
  // arrives, so `enabled: !!myFilters` below avoids ever firing an unbounded
  // fetch in the gap between this panel mounting and that report landing.
  const [myFilters, setMyFilters] = useState<{ from: string; to: string; timeScope: ScheduleTimeScope } | null>(
    null,
  );
  const {
    data: myScheduleData,
    isPending: isMySchedulePending,
    isError: isMyScheduleError,
    error: myScheduleError,
  } = useQuery({
    queryKey: ['schedules', ScheduleTypes.INDIVIDUAL, myFilters?.from, myFilters?.to, myFilters?.timeScope],
    queryFn: () =>
      scheduleApi.list({
        schedule_type: ScheduleTypes.INDIVIDUAL,
        from: myFilters?.from,
        to: myFilters?.to,
        time_scope: myFilters?.timeScope,
      }),
    enabled: !!myFilters,
    // Keeps the previously-selected filters' data on screen while a newly
    // selected range/scope is in flight, instead of flashing the loading
    // state on every date-field or toggle tweak.
    placeholderData: keepPreviousData,
  });
  const mySchedules = useMemo(
    () =>
      currentUserEmail ? (myScheduleData?.results ?? []).filter((s) => s.employee.email === currentUserEmail) : [],
    [myScheduleData, currentUserEmail],
  );

  return (
    <>
      <CurrentScheduleSection
        firstName={firstName}
        todayLabel={todayLabel}
        isLoading={isUpcomingPending || activeQuery.isPending}
        errorMessage={
          upcomingFetchFailed || activeFetchFailed
            ? getApiErrorMessage(upcomingFetchFailed ? upcomingError : activeQuery.error, 'Failed to load your schedule.')
            : undefined
        }
        isActiveOngoing={isActiveOngoing}
        active={active}
        dueShift={dueShift}
        isStarting={startMutation.isPending}
        isEnding={stopMutation.isPending}
        onStartDueShift={handleStartDueShift}
        onEndActiveShift={handleEndActiveShift}
        onStartNewShift={() => startMutation.mutate({})}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Schedule</Text>
        <MyScheduleSection
          schedules={mySchedules}
          isLoading={isMySchedulePending}
          errorMessage={isMyScheduleError ? getApiErrorMessage(myScheduleError, 'Failed to load your schedule.') : undefined}
          onFiltersChange={setMyFilters}
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
  section: {
    gap: Spacing.gutter,
  },
  sectionTitle: {
    ...Typography.headlineLgMobile,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.onSurface,
  },
});
