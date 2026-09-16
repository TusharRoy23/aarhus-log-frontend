import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppShell } from '../../components/layout/AppShell';
import { SegmentedControl } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { IndividualSchedulesTab } from './IndividualSchedulesTab';
import { BulkSchedulesTab } from './BulkSchedulesTab';

type ManageView = 'individual' | 'bulk';

// Thin shell: owns just the tab switch. Each tab's actual content (its own
// query, create button, and list) lives in its own file —
// IndividualSchedulesTab / BulkSchedulesTab — and is only mounted while
// that tab is active, so this screen never fetches anything itself.
export function ManageShiftsScreen() {
  const [view, setView] = useState<ManageView>('individual');

  return (
    <AppShell>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Manage Schedules</Text>
          <Text style={styles.subtitle}>Review and modify employee schedules.</Text>
        </View>

        <SegmentedControl
          value={view}
          onChange={setView}
          options={[
            { value: 'individual', label: 'Schedules' },
            { value: 'bulk', label: 'Bulk Schedules' },
          ]}
        />

        {view === 'individual' ? <IndividualSchedulesTab /> : <BulkSchedulesTab />}
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
});
