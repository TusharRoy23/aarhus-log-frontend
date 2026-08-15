import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { useCountdown } from './useCountdown';
import { formatDateLabel, formatTimeRange, locationLabel, capitalize } from './schedule-format';
import type { Schedule } from '../../lib/api/schedule';

function notImplemented(label: string) {
  Alert.alert(label, 'Coming soon.');
}

export interface MyScheduleSectionProps {
  schedules: Schedule[];
  /**
   * The logged-in user's identity only carries `{username, email, name}`
   * (see `auth-slice.ts`) — there's no employee uuid on it to match
   * against `schedule.employee.uuid` directly, so shifts are matched by
   * email, the one field both records share.
   */
  currentUserEmail: string | undefined;
  onViewAllShifts: () => void;
}

export function MyScheduleSection({ schedules, currentUserEmail, onViewAllShifts }: MyScheduleSectionProps) {
  const now = Date.now();

  const mySchedules = useMemo(
    () => (currentUserEmail ? schedules.filter((s) => s.employee.email === currentUserEmail) : []),
    [schedules, currentUserEmail],
  );

  const currentShift = useMemo(
    () => mySchedules.find((s) => new Date(s.start_time).getTime() <= now && now <= new Date(s.end_time).getTime()),
    [mySchedules, now],
  );

  const upcomingShifts = useMemo(
    () =>
      mySchedules
        .filter((s) => new Date(s.start_time).getTime() > now)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .slice(0, 5),
    [mySchedules, now],
  );

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Shift</Text>

        {currentShift ? (
          <CurrentShiftCard shift={currentShift} />
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No shift in progress right now.</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.upcomingHeaderRow}>
          <Text style={styles.sectionTitle}>Upcoming Shifts</Text>
          <Pressable onPress={onViewAllShifts} hitSlop={8}>
            <Text style={styles.viewAllLink}>VIEW ALL</Text>
          </Pressable>
        </View>

        {upcomingShifts.length > 0 ? (
          <View style={styles.upcomingList}>
            {upcomingShifts.map((shift, index) => (
              <View key={shift.uuid} style={styles.upcomingItem}>
                <View style={[styles.upcomingStrip, index === 0 && styles.upcomingStripHighlighted]} />

                <View style={styles.upcomingBody}>
                  <View style={styles.upcomingTitleRow}>
                    <Text style={styles.upcomingDate}>{formatDateLabel(shift.start_time)}</Text>
                    <View style={styles.upcomingDivider} />
                    <Text style={styles.upcomingShiftLabel}>{locationLabel(shift.work_location)}</Text>
                  </View>

                  <View style={styles.timeRow}>
                    <MaterialIcons name="schedule" size={16} color={Colors.onSurfaceVariant} />
                    <Text style={styles.upcomingTimeText}>{formatTimeRange(shift.start_time, shift.end_time)}</Text>
                  </View>

                  <View style={styles.scheduledBadge}>
                    <Text style={styles.scheduledBadgeText}>{capitalize(shift.status)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No upcoming shifts scheduled.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function CurrentShiftCard({ shift }: { shift: Schedule }) {
  const remaining = useCountdown(new Date(shift.end_time));

  return (
    <View style={styles.currentCard}>
      <View style={styles.currentStrip} />

      <View style={styles.currentBody}>
        <View style={styles.currentHeaderRow}>
          <View style={styles.inProgressBadge}>
            <Text style={styles.inProgressBadgeText}>IN PROGRESS</Text>
          </View>
          <Text style={styles.currentShiftLabel}>{capitalize(shift.status)}</Text>
        </View>

        <Text style={styles.locationTitle}>{locationLabel(shift.work_location)}</Text>

        <View style={styles.timeRow}>
          <MaterialIcons name="schedule" size={18} color={Colors.onSurfaceVariant} />
          <Text style={styles.timeRangeText}>{formatTimeRange(shift.start_time, shift.end_time)}</Text>
        </View>

        <View style={styles.countdownBox}>
          <Text style={styles.countdownText}>{remaining}</Text>
        </View>

        <Pressable style={styles.endShiftButton} onPress={() => notImplemented('End Shift')}>
          <MaterialIcons name="stop-circle" size={20} color={Colors.onError} />
          <Text style={styles.endShiftText}>End Shift</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sectionGap,
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
  currentCard: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  currentStrip: {
    width: 4,
    backgroundColor: Colors.primary,
  },
  currentBody: {
    flex: 1,
    padding: Spacing.cardPadding,
    gap: Spacing.unit * 3,
  },
  currentHeaderRow: {
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
  currentShiftLabel: {
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
  upcomingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllLink: {
    ...Typography.labelSm,
    color: Colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  upcomingList: {
    gap: Spacing.gutter,
  },
  upcomingItem: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.DEFAULT,
    overflow: 'hidden',
  },
  upcomingStrip: {
    width: 4,
    backgroundColor: Colors.outlineVariant,
  },
  upcomingStripHighlighted: {
    backgroundColor: Colors.primary,
  },
  upcomingBody: {
    flex: 1,
    padding: Spacing.cardPadding,
    gap: Spacing.unit * 2,
  },
  upcomingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 3,
  },
  upcomingDate: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  upcomingDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.outlineVariant,
  },
  upcomingShiftLabel: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  upcomingTimeText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  scheduledBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: Spacing.unit * 2,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  scheduledBadgeText: {
    ...Typography.labelSm,
    color: Colors.onSecondaryContainer,
  },
});
