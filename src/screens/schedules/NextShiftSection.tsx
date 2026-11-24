import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import type { ActiveScheduleResponse, Schedule } from '../../lib/api/schedule';
import { NextShiftCard } from './NextShiftCard';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export interface NextShiftSectionProps {
  firstName: string;
  todayLabel: string;
  isLoading: boolean;
  errorMessage?: string;
  isActiveOngoing: boolean;
  active?: ActiveScheduleResponse;
  dueShift?: Schedule;
  isStarting: boolean;
  onStartNewShift: () => void;
  onPressShift: () => void;
}

// Alternate "Current Shift" design (glanceable date/time + progress bar,
// "See details" instead of inline Start/End Shift controls — those now live
// on the schedule-detail screen) — a sibling of CurrentScheduleSection, not
// a replacement of it; MyShiftsPanel picks which one to render.
export function NextShiftSection({
  firstName,
  todayLabel,
  isLoading,
  errorMessage,
  isActiveOngoing,
  active,
  dueShift,
  isStarting,
  onStartNewShift,
  onPressShift,
}: NextShiftSectionProps) {
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

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loading} />
      ) : errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : isActiveOngoing && active ? (
        <NextShiftCard mode="in-progress" active={active} onPressCard={onPressShift} onPressDetails={onPressShift} />
      ) : dueShift ? (
        <NextShiftCard mode="starting-soon" shift={dueShift} onPressCard={onPressShift} onPressDetails={onPressShift} />
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No shift assigned right now.</Text>
          <Button
            label="Start New Shift"
            icon={<MaterialIcons name="add-circle-outline" size={18} color={Colors.onPrimary} />}
            onPress={onStartNewShift}
            loading={isStarting}
            style={styles.startNewShiftButton}
          />
        </View>
      )}
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
