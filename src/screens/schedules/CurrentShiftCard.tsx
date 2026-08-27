import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { useCountdown } from './useCountdown';
import { useElapsedTimer } from './useElapsedTimer';
import { formatStartedAt, formatTimeRange, locationLabel, capitalize } from './schedule-format';
import type { ActiveScheduleResponse, Schedule } from '../../lib/api/schedule';

export type CurrentShiftCardProps =
  | {
      // A real active-schedule record (from GET /employee/active-schedule/
      // or the response of start/stop) — the actual source of truth for
      // "is a shift running right now", not a wall-clock comparison against
      // an assigned schedule's start/end times. Counts UP from the
      // server-reported `time_spent` (seconds).
      mode: 'in-progress';
      active: ActiveScheduleResponse;
      onEnd: () => void;
      isEnding: boolean;
    }
  | {
      // An *assigned* schedule that's due soon (or already past its
      // start_time but not yet checked in) — HomeScreen decides this
      // window. Counts down to start_time; once that passes the countdown
      // just holds at 00:00:00 (useCountdown clamps at zero).
      mode: 'starting-soon';
      shift: Schedule;
      onStart: () => void;
      isStarting: boolean;
    };

// Extracted from MyScheduleSection so it can be shown always, above the
// homepage's tab switch, rather than only inside the "My Shifts" tab.
export function CurrentShiftCard(props: CurrentShiftCardProps) {
  if (props.mode === 'in-progress') {
    return <InProgressCard {...props} />;
  }
  return <StartingSoonCard {...props} />;
}

function InProgressCard({ active, onEnd, isEnding }: Extract<CurrentShiftCardProps, { mode: 'in-progress' }>) {
  const elapsed = useElapsedTimer(active.time_spent);
  const locationTitle = active.schedule ? locationLabel(active.schedule.work_location) : 'Open Shift';
  const timeText = active.expected_end_time
    ? formatTimeRange(active.start_time, active.expected_end_time)
    : formatStartedAt(active.start_time);

  return (
    <View style={styles.card}>
      <View style={styles.strip} />

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <View style={styles.inProgressBadge}>
            <Text style={styles.inProgressBadgeText}>IN PROGRESS</Text>
          </View>
          <Text style={styles.statusLabel}>{active.started_via === 'qr' ? 'QR' : 'Manual'}</Text>
        </View>

        <Text style={styles.locationTitle}>{locationTitle}</Text>

        <View style={styles.timeRow}>
          <MaterialIcons name="schedule" size={18} color={Colors.onSurfaceVariant} />
          <Text style={styles.timeRangeText}>{timeText}</Text>
        </View>

        <View style={styles.countdownBox}>
          <Text style={styles.countdownText}>{elapsed}</Text>
        </View>

        <Pressable style={styles.endShiftButton} onPress={onEnd} disabled={isEnding}>
          {isEnding ? (
            <ActivityIndicator size="small" color={Colors.onError} />
          ) : (
            <>
              <MaterialIcons name="stop-circle" size={20} color={Colors.onError} />
              <Text style={styles.endShiftText}>End Schedule</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function StartingSoonCard({ shift, onStart, isStarting }: Extract<CurrentShiftCardProps, { mode: 'starting-soon' }>) {
  const hasStarted = new Date(shift.start_time).getTime() <= Date.now();
  const remaining = useCountdown(new Date(shift.start_time));

  return (
    <View style={styles.card}>
      <View style={[styles.strip, styles.stripUpcoming]} />

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <View style={[styles.inProgressBadge, styles.startingSoonBadge]}>
            <Text style={[styles.inProgressBadgeText, styles.startingSoonBadgeText]}>
              {hasStarted ? 'READY TO START' : 'STARTING SOON'}
            </Text>
          </View>
          <Text style={styles.statusLabel}>{capitalize(shift.status)}</Text>
        </View>

        <Text style={styles.locationTitle}>{locationLabel(shift.work_location)}</Text>

        <View style={styles.timeRow}>
          <MaterialIcons name="schedule" size={18} color={Colors.onSurfaceVariant} />
          <Text style={styles.timeRangeText}>{formatTimeRange(shift.start_time, shift.end_time)}</Text>
        </View>

        <View style={styles.countdownBox}>
          <Text style={styles.countdownText}>{remaining}</Text>
        </View>

        <Pressable style={styles.startShiftButton} onPress={onStart} disabled={isStarting}>
          {isStarting ? (
            <ActivityIndicator size="small" color={Colors.onPrimary} />
          ) : (
            <>
              <MaterialIcons name="play-circle" size={20} color={Colors.onPrimary} />
              <Text style={styles.startShiftText}>Start Shift</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  strip: {
    width: 4,
    backgroundColor: Colors.primary,
  },
  stripUpcoming: {
    backgroundColor: Colors.secondary,
  },
  body: {
    flex: 1,
    padding: Spacing.cardPadding,
    gap: Spacing.unit * 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 3,
  },
  inProgressBadge: {
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: Spacing.unit * 2,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  inProgressBadgeText: {
    ...Typography.labelSm,
    color: Colors.onPrimaryFixedVariant,
  },
  startingSoonBadge: {
    backgroundColor: Colors.secondaryContainer,
  },
  startingSoonBadgeText: {
    color: Colors.onSecondaryContainer,
  },
  statusLabel: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  locationTitle: {
    ...Typography.headlineLgMobile,
    fontSize: 24,
    lineHeight: 30,
    color: Colors.onSurface,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
  },
  timeRangeText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  countdownBox: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.unit * 3,
    borderRadius: Radius.DEFAULT,
  },
  countdownText: {
    ...Typography.headlineLgMobile,
    fontSize: 26,
    color: Colors.onPrimary,
    fontVariant: ['tabular-nums'],
  },
  endShiftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.unit * 2,
    backgroundColor: Colors.error,
    paddingVertical: Spacing.unit * 4,
    borderRadius: Radius.DEFAULT,
  },
  endShiftText: {
    ...Typography.titleMd,
    color: Colors.onError,
  },
  startShiftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.unit * 2,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.unit * 4,
    borderRadius: Radius.DEFAULT,
  },
  startShiftText: {
    ...Typography.titleMd,
    color: Colors.onPrimary,
  },
});
