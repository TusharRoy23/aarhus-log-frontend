import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { formatStartedAt, locationLabel } from './schedule-format';
import { FloorPersonCard } from './FloorPersonCard';
import type { Schedule } from '../../lib/api/schedule';

export interface PeopleOnFloorSectionProps {
  /** Who's actually checked in right now, whole team — this is a homepage
   * glance, not the full date-range browser (that's Manage Shifts' job). */
  schedules: Schedule[];
}

export function PeopleOnFloorSection({ schedules }: PeopleOnFloorSectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        {schedules.length > 0
          ? `${schedules.length} ${schedules.length === 1 ? 'person' : 'people'} on the floor now`
          : 'Nobody on the floor right now'}
      </Text>

      {schedules.length > 0 ? (
        <View style={styles.list}>
          {schedules.map((shift) => (
            <FloorPersonCard
              key={shift.uuid}
              name={`${shift.employee.first_name} ${shift.employee.last_name}`}
              role={shift.employee.designation.name}
              startedAtLabel={formatStartedAt(shift.start_time)}
              location={locationLabel(shift.work_location)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No one is currently checked in.</Text>
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
