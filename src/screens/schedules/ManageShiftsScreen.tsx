import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { AppShell } from '../../components/layout/AppShell';
import { Button, DateScroller, ManageShiftCard, SearchField } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';

// Sample data — there's no schedules API yet.
const DATES = [
  { label: 'Sun', day: 22 },
  { label: 'Mon', day: 23 },
  { label: 'Tue', day: 24 },
  { label: 'Wed', day: 25 },
  { label: 'Thu', day: 26 },
];

const SHIFTS: React.ComponentProps<typeof ManageShiftCard>[] = [
  {
    name: 'Sarah Jenkins',
    role: 'Security Lead',
    status: 'confirmed',
    statusLabel: 'Confirmed',
    dateLabel: 'Oct 24, 2026',
    timeRange: '08:00 - 16:00',
    location: 'Main Lobby',
  },
  {
    name: 'Marcus Reyes',
    role: 'Maintenance Tech',
    status: 'pending',
    statusLabel: 'Pending',
    dateLabel: 'Oct 24, 2026',
    timeRange: '10:00 - 18:00',
    location: 'HVAC Plant',
  },
  {
    name: 'David Chen',
    role: 'IT Support',
    status: 'confirmed',
    statusLabel: 'Confirmed',
    dateLabel: 'Oct 25, 2026',
    timeRange: '06:00 - 14:00',
    location: 'Help Desk - Floor 3',
  },
];

function notImplemented(label: string) {
  Alert.alert(label, 'Coming soon.');
}

export function ManageShiftsScreen() {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(DATES[2].day);
  const [query, setQuery] = useState('');

  const filteredShifts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return SHIFTS;
    return SHIFTS.filter((shift) => shift.name.toLowerCase().includes(normalized));
  }, [query]);

  return (
    <AppShell>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Manage Shifts</Text>
          <Text style={styles.subtitle}>Review and modify employee schedules.</Text>
        </View>

        <Button
          label="New Shift"
          icon={<MaterialIcons name="add" size={20} color={Colors.onPrimary} />}
          onPress={() => router.push('/create-shift')}
        />

        <SearchField placeholder="Search employees..." value={query} onChangeText={setQuery} />

        <View style={styles.filterRow}>
          <Pressable style={styles.filterChip} onPress={() => notImplemented('Filter')}>
            <MaterialIcons name="filter-list" size={16} color={Colors.onSurface} />
            <Text style={styles.filterChipText}>Filter</Text>
          </Pressable>
          <Pressable style={styles.filterChip} onPress={() => notImplemented('Date Range')}>
            <MaterialIcons name="calendar-today" size={16} color={Colors.onSurface} />
            <Text style={styles.filterChipText}>Date Range</Text>
          </Pressable>
        </View>

        <DateScroller dates={DATES} selectedDay={selectedDay} onSelect={setSelectedDay} />

        <View style={styles.shiftList}>
          {filteredShifts.map((shift) => (
            <ManageShiftCard
              key={shift.name}
              {...shift}
              onDetails={() => notImplemented(`${shift.name} — Details`)}
              onEdit={() => notImplemented(`${shift.name} — Edit`)}
            />
          ))}
        </View>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: Spacing.containerPaddingMobile,
    gap: Spacing.gutter,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.unit,
    marginBottom: Spacing.unit,
  },
  title: {
    ...Typography.headlineLgMobile,
    color: Colors.onSurface,
  },
  subtitle: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.unit * 3,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.unit * 2,
    borderRadius: Radius.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  filterChipText: {
    ...Typography.labelSm,
    color: Colors.onSurface,
  },
  shiftList: {
    gap: Spacing.gutter,
    marginTop: Spacing.unit,
  },
});
