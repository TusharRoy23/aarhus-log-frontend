import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { ActionMenu, Button } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { useAppSelector } from '../../store/hooks';
import { Schedule, scheduleApi } from '../../lib/api/schedule';
import { getApiErrorMessage } from '../../lib/api/base_api';
import { capitalize, formatTimeRange, locationLabel } from './schedule-format';

// Swap has no API yet, and giving away an already-given-away shift has no
// "cancel" endpoint yet either — both stay a placeholder until those exist.
function notImplemented(label: string) {
  Alert.alert(label, 'Coming soon.');
}

// 'HH:MM:SS' -> '30 min' / 'None' — same convention BulkScheduleWeekGrid's
// own shift-details view uses.
function formatBreakTime(breakTime: string): string {
  const [hours, minutes] = breakTime.split(':').map(Number);
  const totalMinutes = (hours || 0) * 60 + (minutes || 0);
  return totalMinutes > 0 ? `${totalMinutes} min` : 'No Break';
}

// No currency symbol — this app has no org-level currency setting yet.
function formatWages(wages: number): string {
  return wages.toFixed(2);
}

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

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={Colors.onSurfaceVariant} />
        </Pressable>
        <Text style={styles.headerTitle}>Shift Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isPending ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : isError ? (
          <Text style={styles.errorText}>{getApiErrorMessage(error, 'Failed to load shift details.')}</Text>
        ) : schedule ? (
          <>
            <View style={styles.detailList}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Employee</Text>
                <Text style={styles.detailValue}>
                  {schedule.employee ? `${schedule.employee.first_name} ${schedule.employee.last_name}` : 'Open Shift'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Role</Text>
                <Text style={styles.detailValue}>{schedule.role?.name ?? 'No role'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{formatTimeRange(schedule.start_time, schedule.end_time)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Break</Text>
                <Text style={styles.detailValue}>{formatBreakTime(schedule.break_time)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Work Location</Text>
                <Text style={styles.detailValue}>{locationLabel(schedule.work_location)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Hours</Text>
                <Text style={styles.detailValue}>{schedule.total_hours}</Text>
              </View>
              {schedule.wages !== null &&
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Wages</Text>
                  <Text style={styles.detailValue}>{formatWages(schedule.wages)}</Text>
                </View>
              }
            </View>

            {/* An open shift (no employee yet) that isn't manual check-in — any
              employee viewing it can take it. */}
            {schedule.start_method !== 'manual' && schedule.status === 'open' ? (
              <View style={styles.takeShiftCard}>
                <Button
                  label="Take Shift"
                  onPress={() => claimMutation.mutate()}
                  loading={claimMutation.isPending}
                />
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {isMyShift ? (
        <View style={styles.fabWrapper}>
          <ActionMenu
            trigger={
              <View style={styles.fab}>
                <MaterialIcons name="more-vert" size={24} color={Colors.onPrimary} />
              </View>
            }
            items={[
              {
                label: isGivenAway ? 'Cancel Giveaway' : 'Giveaway',
                icon: 'card-giftcard',
                onPress: () =>
                  isGivenAway ? notImplemented('Cancel Giveaway') : giveAwayMutation.mutate(),
              },
              {
                label: 'Swap',
                icon: 'swap-horiz',
                onPress: () => notImplemented('Swap'),
              },
            ]}
          />
        </View>
      ) : null}
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
  detailList: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    gap: Spacing.unit * 4,
  },
  takeShiftCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    marginTop: Spacing.gutter,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.unit * 2,
  },
  detailLabel: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  detailValue: {
    ...Typography.bodyMd,
    color: Colors.onSurface,
    flexShrink: 1,
    textAlign: 'right',
  },
  fabWrapper: {
    position: 'absolute',
    bottom: Spacing.sectionGap,
    right: Spacing.containerPaddingMobile,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
