import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { useCountdown } from './useCountdown';

// Sample data — there's no shift-tracking API yet, so this section is a
// static preview of the layout until one exists. `SHIFT_END` is real enough
// to drive an actual live countdown, just seeded with a placeholder time.
const CURRENT_SHIFT = {
  shiftLabel: 'Morning Shift',
  location: 'Main Office - North Wing',
  timeRange: '08:00 - 16:00',
};

const UPCOMING_SHIFTS: {
  dateLabel: string;
  shiftLabel: string;
  timeRange: string;
  badgeLabel?: string;
  highlighted?: boolean;
}[] = [
  { dateLabel: 'Tomorrow', shiftLabel: 'Evening Shift', timeRange: '16:00 - 00:00', highlighted: true },
  { dateLabel: 'Oct 26, Wed', shiftLabel: 'Morning Shift', timeRange: '08:00 - 16:00', badgeLabel: 'Scheduled' },
  { dateLabel: 'Oct 27, Thu', shiftLabel: 'Morning Shift', timeRange: '08:00 - 16:00', badgeLabel: 'Scheduled' },
];

function notImplemented(label: string) {
  Alert.alert(label, 'Coming soon.');
}

export interface MyScheduleSectionProps {
  onViewAllShifts: () => void;
}

export function MyScheduleSection({ onViewAllShifts }: MyScheduleSectionProps) {
  const [shiftEnd] = useState(() => new Date(Date.now() + (4 * 3600 + 18 * 60 + 25) * 1000));
  const remaining = useCountdown(shiftEnd);

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Shift</Text>

        <View style={styles.currentCard}>
          <View style={styles.currentStrip} />

          <View style={styles.currentBody}>
            <View style={styles.currentHeaderRow}>
              <View style={styles.inProgressBadge}>
                <Text style={styles.inProgressBadgeText}>IN PROGRESS</Text>
              </View>
              <Text style={styles.currentShiftLabel}>{CURRENT_SHIFT.shiftLabel}</Text>
            </View>

            <Text style={styles.locationTitle}>{CURRENT_SHIFT.location}</Text>

            <View style={styles.timeRow}>
              <MaterialIcons name="schedule" size={18} color={Colors.onSurfaceVariant} />
              <Text style={styles.timeRangeText}>{CURRENT_SHIFT.timeRange}</Text>
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
      </View>

      <View style={styles.section}>
        <View style={styles.upcomingHeaderRow}>
          <Text style={styles.sectionTitle}>Upcoming Shifts</Text>
          <Pressable onPress={onViewAllShifts} hitSlop={8}>
            <Text style={styles.viewAllLink}>VIEW ALL</Text>
          </Pressable>
        </View>

        <View style={styles.upcomingList}>
          {UPCOMING_SHIFTS.map((shift) => (
            <View key={shift.dateLabel} style={styles.upcomingItem}>
              <View style={[styles.upcomingStrip, shift.highlighted && styles.upcomingStripHighlighted]} />

              <View style={styles.upcomingBody}>
                <View style={styles.upcomingTitleRow}>
                  <Text style={styles.upcomingDate}>{shift.dateLabel}</Text>
                  <View style={styles.upcomingDivider} />
                  <Text style={styles.upcomingShiftLabel}>{shift.shiftLabel}</Text>
                </View>

                <View style={styles.timeRow}>
                  <MaterialIcons name="schedule" size={16} color={Colors.onSurfaceVariant} />
                  <Text style={styles.upcomingTimeText}>{shift.timeRange}</Text>
                </View>

                {shift.badgeLabel ? (
                  <View style={styles.scheduledBadge}>
                    <Text style={styles.scheduledBadgeText}>{shift.badgeLabel}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </View>
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
