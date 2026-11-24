import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '../../../components/ui';
import { Colors } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { Spacing } from '../../../theme/spacing';
import { Radius } from '../../../theme/radius';
import { employeeApi } from '../../../lib/api/employee';

export interface EmployeesOnThisDaySectionProps {
  /** 'YYYY-MM-DD' */
  date?: string;
  /** Excludes this shift's own employee — "who else is scheduled this
   * day", not a roster including yourself. */
  excludeEmployeeEmail?: string;
}

export function EmployeesOnThisDaySection({ date, excludeEmployeeEmail }: EmployeesOnThisDaySectionProps) {
  const { data, isPending } = useQuery({
    queryKey: ['schedule-employees-of-day', date],
    queryFn: () => employeeApi.getScheduleEmployeeOfTheDay(date!),
    enabled: !!date,
  });
  const employees = (data?.results ?? []).filter((employee) => employee.email !== excludeEmployeeEmail);

  return (
    <View style={styles.sectionGapTop}>
      <View style={styles.sectionHeading}>
        <MaterialIcons name="groups" size={18} color={Colors.onSurfaceVariant} />
        <Text style={styles.sectionHeadingText}>Employees on this day</Text>
      </View>
      {isPending ? (
        <ActivityIndicator color={Colors.primary} style={styles.loading} />
      ) : employees.length > 0 ? (
        <View style={styles.detailList}>
          {employees.map((employee, index) => (
            <View key={employee.uuid}>
              <View style={styles.employeeRow}>
                <Avatar label={`${employee.first_name} ${employee.last_name}`} size={36} />
                <View style={styles.employeeText}>
                  <Text style={styles.employeeName} numberOfLines={1}>
                    {employee.first_name} {employee.last_name}
                  </Text>
                  <Text style={styles.employeeRole} numberOfLines={1}>
                    {employee.designation.name}
                  </Text>
                </View>
              </View>
              {index < employees.length - 1 ? <View style={styles.rowDivider} /> : null}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.detailList}>
          <Text style={styles.emptyText}>No one else is scheduled this day.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionGapTop: {
    marginTop: Spacing.sectionGap,
    gap: Spacing.gutter,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
  },
  sectionHeadingText: {
    ...Typography.titleMd,
    fontSize: 16,
    color: Colors.onSurface,
  },
  loading: {
    marginTop: Spacing.unit * 2,
  },
  detailList: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    gap: Spacing.unit * 4,
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 3,
    paddingVertical: Spacing.unit * 2,
  },
  employeeText: {
    flex: 1,
    gap: Spacing.unit,
  },
  employeeName: {
    ...Typography.bodyMd,
    color: Colors.onSurface,
  },
  employeeRole: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
  },
  emptyText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    paddingVertical: Spacing.unit * 2,
  },
});
