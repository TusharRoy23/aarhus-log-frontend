import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ShiftCard } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';

// Sample data — there's no schedules API yet, so this section is a static
// preview of the layout until one exists.
const DATES = [
  { label: 'Mon', day: 12 },
  { label: 'Tue', day: 13 },
  { label: 'Wed', day: 14 },
  { label: 'Thu', day: 15 },
  { label: 'Fri', day: 16 },
  { label: 'Sat', day: 17 },
  { label: 'Sun', day: 18 },
];

const SHIFTS: React.ComponentProps<typeof ShiftCard>[] = [
  {
    name: 'Sarah Jenkins',
    role: 'Security Lead',
    status: 'confirmed',
    statusLabel: 'Confirmed',
    timeRange: '06:00 - 14:00',
    location: 'Main Lobby - Desk A',
  },
  {
    name: 'Marcus King',
    role: 'IT Support Technician',
    status: 'pending',
    statusLabel: 'Pending',
    timeRange: '09:00 - 17:00',
    location: 'HQ - Floor 3',
  },
  {
    name: 'David Chen',
    role: 'Facilities Coordinator',
    status: 'confirmed',
    statusLabel: 'Confirmed',
    timeRange: '10:00 - 18:00',
    location: 'HQ - Maintenance Wing',
  },
];

function notImplemented(label: string) {
  Alert.alert(label, 'Coming soon.');
}

export function AllSchedulesSection() {
  const [selectedDay, setSelectedDay] = useState(DATES[0].day);

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
        {DATES.map((date) => {
          const isActive = date.day === selectedDay;
          return (
            <Pressable
              key={date.day}
              style={[styles.dateCard, isActive && styles.dateCardActive]}
              onPress={() => setSelectedDay(date.day)}
            >
              <Text style={[styles.dateLabel, isActive && styles.dateLabelActive]}>{date.label}</Text>
              <Text style={[styles.dateNumber, isActive && styles.dateNumberActive]}>{date.day}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <Pressable style={styles.filterChip} onPress={() => notImplemented('Filter by role')}>
          <MaterialIcons name="filter-list" size={16} color={Colors.onSurface} />
          <Text style={styles.filterChipText}>All Roles</Text>
        </Pressable>
        <Pressable style={styles.filterChip} onPress={() => notImplemented('Filter by zone')}>
          <Text style={styles.filterChipText}>All Zones</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.shiftGrid}>
        {SHIFTS.map((shift) => (
          <ShiftCard key={shift.name} {...shift} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sectionGap,
  },
  dateRow: {
    gap: Spacing.gutter,
    paddingVertical: Spacing.unit,
  },
  dateCard: {
    width: 72,
    height: 90,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.unit,
  },
  dateCardActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primaryContainer,
  },
  dateLabel: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  dateLabelActive: {
    color: Colors.onPrimaryContainer,
  },
  dateNumber: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  dateNumberActive: {
    color: Colors.onPrimaryContainer,
  },
  filterRow: {
    gap: Spacing.unit * 3,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.unit * 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  filterChipText: {
    ...Typography.labelSm,
    color: Colors.onSurface,
  },
  shiftGrid: {
    gap: Spacing.gutter,
  },
});
