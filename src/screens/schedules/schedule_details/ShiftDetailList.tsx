import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../../components/ui';
import { Colors } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { Spacing } from '../../../theme/spacing';
import { Radius } from '../../../theme/radius';
import type { Schedule } from '../../../lib/api/schedule';
import { formatClockTime } from '../schedule-format';
import { Chip } from './Chip';
import { formatChipDate, formatWages } from './schedule-detail-format';

export function ShiftDetailList({ schedule }: { schedule: Schedule }) {
  const employeeName = schedule.employee ? `${schedule.employee.first_name} ${schedule.employee.last_name}` : 'Open Shift';
  const roleName = schedule.role?.name;
  const formatedTime = (start_time: string, end_time: string) => `${formatClockTime(start_time)} - ${formatClockTime(end_time)}`;
  const scheduledTime = formatedTime(schedule.start_time, schedule.end_time);
  const loggedTime = schedule.log_end_time && schedule.log_start_time ? formatedTime(schedule.log_start_time, schedule.log_end_time) : null;
  const actualTime = loggedTime ? `${scheduledTime} (${loggedTime})` : scheduledTime;

  return (
    <View style={styles.card}>
      <View style={styles.identityRow}>
        <Avatar label={employeeName} size={56} />
        <View style={styles.identityText}>
          <Text style={styles.name}>{employeeName}</Text>
          {roleName ? (
            <View style={styles.roleRow}>
              <View style={styles.roleDot} />
              <Text style={styles.roleText}>{roleName}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.chipRow}>
        <Chip icon="event" label={formatChipDate(schedule.start_time)} />
        <Chip icon="schedule" label={`${actualTime}`} />
        {
          schedule.work_location ? (
            <Chip icon="work" label={schedule.work_location.name} />
          ) : null
        }
        {/* <Chip icon="work" label={schedule.work_location?.name ?? 'No location assigned'} /> */}
        {schedule.wages !== null ? (
          <Chip icon="payments" label={formatWages(schedule.wages)} tone="success" />
        ) : null}
      </View>

      {/* <View style={styles.chipRow}>
        <Chip icon="work" label={schedule.work_location?.name ?? 'No location assigned'} />
      </View> */}

      {/* {schedule.wages !== null ? (
        <View style={styles.chipRow}>
          <Chip icon="payments" label={formatWages(schedule.wages)} tone="success" />
        </View>
      ) : null} */}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    gap: Spacing.unit * 4,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 3,
  },
  identityText: {
    gap: Spacing.unit,
  },
  name: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
  },
  roleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.tertiary,
  },
  roleText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.unit * 2,
  },
});
