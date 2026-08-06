import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { AppShell } from '../../components/layout/AppShell';
import { Button, SegmentedControl } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { MyScheduleSection } from './MyScheduleSection';
import { AllSchedulesSection } from './AllSchedulesSection';

export function SchedulesScreen() {
  const router = useRouter();
  const [view, setView] = useState<'mine' | 'all'>('mine');

  return (
    <AppShell>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Schedules</Text>
            <Text style={styles.subtitle}>Manage and view team shifts across all zones.</Text>
          </View>
          <Button
            label="Create"
            icon={<MaterialIcons name="add" size={20} color={Colors.onPrimary} />}
            onPress={() => router.push('/create-shift')}
            style={styles.createButton}
          />
        </View>

        <SegmentedControl
          value={view}
          onChange={setView}
          options={[
            { value: 'mine', label: 'My Schedule' },
            { value: 'all', label: 'All Schedules' },
          ]}
        />

        {view === 'mine' ? (
          <MyScheduleSection onViewAllShifts={() => setView('all')} />
        ) : (
          <AllSchedulesSection />
        )}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: Spacing.containerPaddingMobile,
    gap: Spacing.sectionGap,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
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
  createButton: {
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.unit * 3,
    borderRadius: Radius.full,
  },
});
