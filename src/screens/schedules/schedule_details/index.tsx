import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QrScannerModal } from '../../../components/ui';
import { Colors } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { Spacing } from '../../../theme/spacing';
import { Radius } from '../../../theme/radius';
import { useAppSelector } from '../../../store/hooks';
import {
  Schedule,
  ScheduleStatus,
  scheduleApi,
  type StartSchedulePayload,
  type StopSchedulePayload,
} from '../../../lib/api/schedule';
import { getApiErrorMessage } from '../../../lib/api/base_api';
import { toDateOnlyString } from '../schedule-format';
import { CurrentShiftCard } from '../CurrentShiftCard';
import { formatFullDateLabel } from './schedule-detail-format';
import { DetailHeader } from './DetailHeader';
import { ShiftDetailList } from './ShiftDetailList';
import { TakeShiftCard } from './TakeShiftCard';
import { EmployeesOnThisDaySection } from './EmployeesOnThisDaySection';
import { MessagesSection } from './MessagesSection';
import { ShiftActionsFab } from './ShiftActionsFab';

// Pushed from the bottom as a modal route (see _layout.tsx's `schedule-detail`
// Stack.Screen) rather than shown as an in-place Modal — a full page gives
// room to grow this out (attendance log, actions, etc.) without having to
// revisit the presentation again later.
export function ScheduleDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUserEmail = useAppSelector((state) => state.auth.user?.email);
  const { schedule_uuid: scheduleUuid, week_number: weekNumberParam } = useLocalSearchParams<{
    schedule_uuid?: string;
    week_number?: string;
  }>();
  const weekNumber = Number(weekNumberParam);

  const {
    data: schedule,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['schedule-details', scheduleUuid],
    queryFn: () => scheduleApi.getScheduleDetails(scheduleUuid!),
    enabled: !!scheduleUuid,
  });

  const invalidateQueries = (schedule: Schedule) => {
    queryClient.invalidateQueries({ queryKey: ['schedule-details', schedule.uuid] });
    queryClient.invalidateQueries({ queryKey: ['bulk-schedules'] });
    queryClient.invalidateQueries({ queryKey: ['published-bulk-schedules'] });
    queryClient.invalidateQueries({ queryKey: ['schedules'] });
    if (Number.isFinite(weekNumber)) {
      queryClient.invalidateQueries({ queryKey: ['bulk-schedule', weekNumber] });
    }
  }

  // The response is this same shift, now carrying the claiming employee —
  // written straight into the cache so the screen reflects it immediately,
  // without a second round-trip.
  const claimMutation = useMutation({
    mutationFn: () => scheduleApi.claimSchedule(scheduleUuid!),
    onSuccess: (claimedSchedule) => {
      invalidateQueries(claimedSchedule);
    },
    onError: (claimError) => {
      Alert.alert('Could not take this shift', getApiErrorMessage(claimError, 'Something went wrong. Please try again.'));
    },
  });

  const giveAwayMutation = useMutation({
    mutationFn: () => scheduleApi.giveAwaySchedule(scheduleUuid!),
    onSuccess: (updatedSchedule) => {
      invalidateQueries(updatedSchedule);
    },
    onError: (giveAwayError) => {
      Alert.alert(
        'Could not give away this shift',
        getApiErrorMessage(giveAwayError, 'Something went wrong. Please try again.'),
      );
    },
  });

  // Giveaway/Swap only make sense for a shift that's actually assigned to
  // the person viewing it — not an open shift (nothing to give away yet)
  // and not someone else's.
  const isMyShift = !!schedule?.employee && schedule.employee.email === currentUserEmail;
  const isGivenAway = schedule?.status === 'giveaway';

  // Same source of truth MyShiftsPanel's Current Shift card uses — "is a
  // shift running right now" is this record, never a wall-clock comparison
  // against start/end times.
  const activeQuery = useQuery({
    queryKey: ['active-schedule'],
    queryFn: scheduleApi.getActive,
    meta: { suppressToastForStatuses: [404] },
  });
  const active = activeQuery.data;
  const isActiveOngoing = !!active && active.end_time === null;
  const isThisScheduleActive = isActiveOngoing && active?.schedule?.uuid === schedule?.uuid;
  // Due to start, from this exact screen — only when nothing else is
  // already running; starting a second shift while one's active isn't a
  // state this screen offers (same constraint the Home tab enforces).
  const isDueToStart =
    isMyShift &&
    !isActiveOngoing &&
    schedule?.status === ScheduleStatus.CONFIRMED &&
    new Date(schedule.end_time).getTime() > Date.now();

  const startMutation = useMutation({
    mutationFn: (payload: StartSchedulePayload) => scheduleApi.start(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['active-schedule'], data);
      if (schedule) invalidateQueries(schedule);
    },
    // No inline error spot on this button — a rejected qr_token needs the
    // global toast even on a 400 (same reasoning as MyShiftsPanel's).
    meta: { toastOnStatuses: [400] },
  });
  const stopMutation = useMutation({
    mutationFn: (payload: StopSchedulePayload) => scheduleApi.stop(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['active-schedule'], data);
      if (schedule) invalidateQueries(schedule);
    },
    meta: { toastOnStatuses: [400] },
  });

  const [scannerPurpose, setScannerPurpose] = useState<'start' | 'stop' | null>(null);
  const handleStartShift = () => {
    if (!schedule) return;
    if (schedule.start_method === 'qr' && Platform.OS !== 'web') {
      setScannerPurpose('start');
    } else {
      startMutation.mutate({ schedule_uuid: schedule.uuid });
    }
  };
  const handleEndActiveShift = () => {
    if (active?.started_via === 'qr' && Platform.OS !== 'web') {
      setScannerPurpose('stop');
    } else {
      stopMutation.mutate({});
    }
  };

  const scheduleDate = schedule ? toDateOnlyString(new Date(schedule.start_time)) : undefined;

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <DetailHeader
        dateLabel={schedule ? formatFullDateLabel(schedule.start_time) : undefined}
        onClose={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {isPending ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : isError ? (
          <Text style={styles.errorText}>{getApiErrorMessage(error, 'Failed to load shift details.')}</Text>
        ) : schedule ? (
          <>
            <ShiftDetailList schedule={schedule} />

            {schedule.start_method !== 'manual' && schedule.status === 'open' ? (
              <TakeShiftCard onPress={() => claimMutation.mutate()} loading={claimMutation.isPending} />
            ) : null}

            {/* Start/Stop Shift */}
            {isThisScheduleActive && active ? (
              <View style={styles.shiftActionCard}>
                <CurrentShiftCard
                  mode="in-progress"
                  active={active}
                  onEnd={handleEndActiveShift}
                  isEnding={stopMutation.isPending}
                />
              </View>
            ) : isDueToStart ? (
              <View style={styles.shiftActionCard}>
                <CurrentShiftCard
                  mode="starting-soon"
                  shift={schedule}
                  onStart={handleStartShift}
                  isStarting={startMutation.isPending}
                />
              </View>
            ) : null}

            <EmployeesOnThisDaySection date={scheduleDate} excludeEmployeeEmail={schedule.employee?.email} />

            <MessagesSection />
          </>
        ) : null}
      </ScrollView>

      {isMyShift ? <ShiftActionsFab isGivenAway={isGivenAway} onGiveaway={() => giveAwayMutation.mutate()} /> : null}

      <QrScannerModal
        visible={scannerPurpose !== null}
        onClose={() => setScannerPurpose(null)}
        onScanned={(token) => {
          const purpose = scannerPurpose;
          setScannerPurpose(null);
          if (purpose === 'start' && schedule) {
            startMutation.mutate({ schedule_uuid: schedule.uuid, qr_token: token });
          } else if (purpose === 'stop') {
            stopMutation.mutate({ qr_token: token });
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.containerPaddingMobile,
  },
  loading: {
    marginTop: Spacing.sectionGap,
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.error,
  },
  shiftActionCard: {
    marginTop: Spacing.sectionGap,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    gap: Spacing.gutter,
  },
});
