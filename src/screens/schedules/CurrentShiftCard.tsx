import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { useCountdown } from './useCountdown';
import { formatTimeRange, locationLabel, capitalize } from './schedule-format';
import type { Schedule } from '../../lib/api/schedule';

function notImplemented(label: string) {
  Alert.alert(label, 'Coming soon.');
}

// Extracted from MyScheduleSection so it can be shown always, above the
// homepage's tab switch, rather than only inside the "My Shifts" tab.
export function CurrentShiftCard({ shift }: { shift: Schedule }) {
  const remaining = useCountdown(new Date(shift.end_time));

  return (
    <View style={styles.card}>
      <View style={styles.strip} />

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <View style={styles.inProgressBadge}>
            <Text style={styles.inProgressBadgeText}>IN PROGRESS</Text>
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

        <Pressable style={styles.endShiftButton} onPress={() => notImplemented('End Schedule')}>
          <MaterialIcons name="stop-circle" size={20} color={Colors.onError} />
          <Text style={styles.endShiftText}>End Schedule</Text>
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
});
