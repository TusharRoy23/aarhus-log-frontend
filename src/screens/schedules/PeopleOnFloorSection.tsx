import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ShiftCard } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { formatTimeRange, locationLabel, capitalize } from './schedule-format';
import type { Schedule } from '../../lib/api/schedule';

function notImplemented(label: string) {
  Alert.alert(label, 'Coming soon.');
}

export interface PeopleOnFloorSectionProps {
  /** Already scoped to today, whole team — this is a homepage glance, not
   * the full date-range browser (that's Manage Shifts' job). */
  schedules: Schedule[];
}

export function PeopleOnFloorSection({ schedules }: PeopleOnFloorSectionProps) {
  const router = useRouter();
  const sorted = [...schedules].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        {sorted.length > 0
          ? `${sorted.length} ${sorted.length === 1 ? 'person' : 'people'} on shift today`
          : 'Nobody scheduled today'}
      </Text>

      {sorted.length > 0 ? (
        <View style={styles.list}>
          {sorted.map((shift) => (
            <ShiftCard
              key={shift.uuid}
              name={`${shift.employee.first_name} ${shift.employee.last_name}`}
              role={shift.employee.designation.name}
              status={shift.status}
              statusLabel={capitalize(shift.status)}
              timeRange={formatTimeRange(shift.start_time, shift.end_time)}
              location={locationLabel(shift.work_location)}
              onDetails={() => notImplemented('Schedule Details')}
              onEdit={() => router.push({ pathname: '/create-shift', params: { uuid: shift.uuid } })}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No one is scheduled to work today.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.gutter,
  },
  subtitle: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  list: {
    gap: Spacing.gutter,
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
});
