import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppShell } from '../../components/layout/AppShell';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { OrganizationSettingsTabs, type OrganizationSettingsTabKey } from './OrganizationSettingsTabs';
import { GeneralSettingsTab } from './GeneralSettingsTab';
import { FestivalWagesTab } from './FestivalWagesTab';
import { NightShiftWagesTab } from './NightShiftWagesTab';
import { WeekendWagesTab } from './WeekendWagesTab';

// Thin shell: owns just the tab switch. Each tab's actual content (its own
// query/mutation) lives in its own file and is only mounted while that tab
// is active, so this screen never fetches anything itself — same pattern as
// ManageShiftsScreen's Individual/Bulk Schedules tabs. The tab bar itself
// (OrganizationSettingsTabs) is a full-bleed strip directly under AppShell,
// outside the centered/padded ScrollView — same placement as HomeScreen's
// own HomeSectionTabs, not nested inside the scrolling content.
export function OrganizationSettingsScreen() {
  const [activeTab, setActiveTab] = useState<OrganizationSettingsTabKey>('general');

  function renderActiveTab() {
    switch (activeTab) {
      case 'general':
        return <GeneralSettingsTab />;
      case 'festival-wages':
        return <FestivalWagesTab />;
      case 'night-shift-wages':
        return <NightShiftWagesTab />;
      case 'weekend-wages':
        return <WeekendWagesTab />;
    }
  }

  return (
    <AppShell>
      <OrganizationSettingsTabs activeKey={activeTab} onSelect={setActiveTab} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Organization Settings</Text>
          <Text style={styles.subtitle}>Manage your organization's info and wage configuration.</Text>
        </View>

        {renderActiveTab()}
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
