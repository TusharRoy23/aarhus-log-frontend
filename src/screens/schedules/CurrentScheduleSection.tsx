import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import type { ActiveScheduleResponse, Schedule } from '../../lib/api/schedule';
import { CurrentShiftCard } from './CurrentShiftCard';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export interface CurrentScheduleSectionProps {
  firstName: string;
  todayLabel: string;
  isLoading: boolean;
  errorMessage?: string;
  isActiveOngoing: boolean;
  active?: ActiveScheduleResponse;
  dueShift?: Schedule;
  isStarting: boolean;
  isEnding: boolean;
  onStartDueShift: () => void;
  onEndActiveShift: () => void;
  onStartNewShift: () => void;
}

// The homepage greeting + "Current Schedule" card, extracted out of
// MyShiftsPanel for readability — purely presentational, all the data
// fetching/mutations it needs stay owned by MyShiftsPanel and are just
// passed down as props.
export function CurrentScheduleSection({
  firstName,
  todayLabel,
  isLoading,
  errorMessage,
  isActiveOngoing,
  active,
  dueShift,
  isStarting,
  isEnding,
  onStartDueShift,
  onEndActiveShift,
  onStartNewShift,
}: CurrentScheduleSectionProps) {
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
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loading} />
        ) : errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : isActiveOngoing && active ? (
          <CurrentShiftCard mode="in-progress" active={active} onEnd={onEndActiveShift} isEnding={isEnding} />
        ) : dueShift ? (
          <CurrentShiftCard mode="starting-soon" shift={dueShift} onStart={onStartDueShift} isStarting={isStarting} />
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
              onPress={onStartNewShift}
              loading={isStarting}
              style={styles.startNewShiftButton}
            />
          </View>
        )}
      </View>
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
