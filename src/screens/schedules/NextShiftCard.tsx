import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { useProgress } from './useElapsedTimer';
import { formatClockTime, formatDateLabel, formatStartedAt } from './schedule-format';
import type { ActiveScheduleResponse, Schedule } from '../../lib/api/schedule';

export type NextShiftCardProps =
  | {
    // Mirrors CurrentShiftCard's in-progress mode (same source of truth —
    // GET /employee/active-schedule/ or the start/stop response), just a
    // different, more glanceable design: a progress bar instead of a
    // ticking HH:MM:SS, and no inline End Shift button — that action lives
    // on the schedule-detail screen this card links to via "See details".
    mode: 'in-progress';
    active: ActiveScheduleResponse;
    onPressCard?: () => void;
    onPressDetails: () => void;
  }
  | {
    mode: 'starting-soon';
    shift: Schedule;
    onPressCard?: () => void;
    onPressDetails: () => void;
  };

export function NextShiftCard(props: NextShiftCardProps) {
  if (props.mode === 'in-progress') {
    return <InProgressCard {...props} />;
  }
  return <StartingSoonCard {...props} />;
}

function InProgressCard({ active, onPressCard, onPressDetails }: Extract<NextShiftCardProps, { mode: 'in-progress' }>) {
  // useProgress ticks every second off the current wall-clock time, so it
  // needs a stable [start, end] pair on every call regardless of whether
  // expected_end_time is set — fall back to start_time itself (a 0-width
  // range, read as 0 progress) when there's no expected end to track
  // toward, and ignore the result below in that case.
  const progress = useProgress(active.start_time, active.expected_end_time ?? active.start_time);
  const roleName = active.schedule?.role?.name;
  const locationName = active.schedule?.work_location?.name ?? null;
  const dateLabel = formatDateLabel(active.start_time);

  const CardContainer = onPressCard ? Pressable : View;

  return (
    <CardContainer style={styles.card} onPress={onPressCard}>
      <Text style={styles.eyebrow}>Next shift</Text>
      <Text style={styles.dateLabel}>{dateLabel}</Text>

      {active.expected_end_time ? (
        <>
          <View style={styles.track}>
            <View style={[styles.trackFill, { width: `${progress * 100}%` }]} />
            <View style={[styles.thumb, { left: `${progress * 100}%` }]} />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatClockTime(active.start_time)}</Text>
            <Text style={styles.timeText}>{formatClockTime(active.expected_end_time)}</Text>
          </View>
        </>
      ) : (
        <Text style={styles.startedAtText}>{formatStartedAt(active.start_time)}</Text>
      )}

      {locationName && <InfoRows roleName={roleName} locationName={locationName} />}

      <DetailsRow onPress={onPressDetails} />
    </CardContainer>
  );
}

function StartingSoonCard({ shift, onPressCard, onPressDetails }: Extract<NextShiftCardProps, { mode: 'starting-soon' }>) {
  const roleName = shift.role?.name;
  const locationName = shift.work_location?.name ?? null;
  const dateLabel = formatDateLabel(shift.start_time);

  const CardContainer = onPressCard ? Pressable : View;

  return (
    <CardContainer style={styles.card} onPress={onPressCard}>
      <Text style={styles.eyebrow}>Next shift</Text>
      <Text style={styles.dateLabel}>{dateLabel}</Text>

      <View style={styles.startEndRow}>
        <Text style={styles.startEndLabel}>Start</Text>
        <Text style={styles.startEndLabel}>End</Text>
      </View>
      <View style={styles.timeArrowRow}>
        <Text style={styles.timeText}>{formatClockTime(shift.start_time)}</Text>
        <MaterialIcons name="arrow-forward" size={22} color={Colors.primary} />
        <Text style={styles.timeText}>{formatClockTime(shift.end_time)}</Text>
      </View>

      {locationName && <InfoRows roleName={roleName} locationName={locationName} />}

      <DetailsRow onPress={onPressDetails} />
    </CardContainer>
  );
}

function InfoRows({ roleName, locationName }: { roleName?: string; locationName: string }) {
  return (
    <View style={styles.infoRows}>
      {roleName ? (
        <View style={styles.infoRow}>
          <View style={styles.roleDot} />
          <Text style={styles.roleText}>{roleName}</Text>
        </View>
      ) : null}
      <View style={styles.infoRow}>
        <MaterialIcons name="home" size={18} color={Colors.onSurfaceVariant} />
        <Text style={styles.locationText}>{locationName}</Text>
      </View>
    </View>
  );
}

function DetailsRow({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.detailsRow} onPress={onPress}>
      <Text style={styles.detailsText}>See details</Text>
      <MaterialIcons name="chevron-right" size={20} color={Colors.onSurfaceVariant} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    gap: Spacing.unit * 3,
  },
  eyebrow: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  dateLabel: {
    ...Typography.headlineLgMobile,
    fontSize: 24,
    lineHeight: 30,
    color: Colors.onSurface,
  },
  startEndRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  startEndLabel: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  timeArrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeText: {
    ...Typography.headlineLgMobile,
    fontSize: 32,
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceContainerHigh,
    position: 'relative',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
  },
  thumb: {
    position: 'absolute',
    top: -5,
    width: 16,
    height: 16,
    marginLeft: -8,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: Colors.surfaceContainerLowest,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  startedAtText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  infoRows: {
    gap: Spacing.unit * 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
  },
  roleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.tertiary,
  },
  roleText: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  locationText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.unit * 3,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
  },
  detailsText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
});
