import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { BulkScheduleStatus, type BulkSchedule } from '../../lib/api/schedule';
import { capitalize } from './schedule-format';

export interface BulkScheduleListSectionProps {
  bulkSchedules: BulkSchedule[];
  /** Tapping a row calls this with that row's record — used to open it for
   * editing. Omit for a read-only listing (e.g. an employee-facing "Published
   * Schedule" view) — rows render as plain, non-pressable cards with no
   * chevron instead. */
  onSelect?: (bulkSchedule: BulkSchedule) => void;
}

function countScheduledEmployees(bulkSchedule: BulkSchedule): number {
  return new Set(bulkSchedule.schedules.map((schedule) => schedule.employee.uuid)).size;
}

export function BulkScheduleListSection({ bulkSchedules, onSelect }: BulkScheduleListSectionProps) {
  if (bulkSchedules.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>No bulk schedules yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {bulkSchedules.map((bulkSchedule) => {
        const isPublished = bulkSchedule.status === BulkScheduleStatus.PUBLISHED;
        return (
          <Pressable
            key={bulkSchedule.uuid}
            style={styles.item}
            onPress={onSelect ? () => onSelect(bulkSchedule) : undefined}
          >
            <View style={styles.itemStrip} />
            <View style={styles.itemBody}>
              <View style={styles.itemTitleRow}>
                <Text style={styles.itemTitle}>
                  Week {bulkSchedule.week_number}, {bulkSchedule.week_year}
                </Text>
                <View style={[styles.statusBadge, isPublished && styles.statusBadgePublished]}>
                  <Text style={[styles.statusBadgeText, isPublished && styles.statusBadgeTextPublished]}>
                    {capitalize(bulkSchedule.status)}
                  </Text>
                </View>
              </View>
              <View style={styles.itemMetaRow}>
                <Text style={styles.itemMeta}>
                  {Math.round(bulkSchedule.total_hours)} hrs • {countScheduledEmployees(bulkSchedule)} employees
                </Text>
                {onSelect ? <MaterialIcons name="chevron-right" size={20} color={Colors.onSurfaceVariant} /> : null}
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.gutter,
  },
  item: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.DEFAULT,
    overflow: 'hidden',
  },
  itemStrip: {
    width: 4,
    backgroundColor: Colors.outlineVariant,
  },
  itemBody: {
    flex: 1,
    padding: Spacing.cardPadding,
    gap: Spacing.unit * 2,
  },
  itemTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.unit * 3,
  },
  itemTitle: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  itemMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemMeta: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: Spacing.unit * 2,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  statusBadgePublished: {
    backgroundColor: Colors.secondaryContainer,
  },
  statusBadgeText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  statusBadgeTextPublished: {
    color: Colors.onSecondaryContainer,
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
