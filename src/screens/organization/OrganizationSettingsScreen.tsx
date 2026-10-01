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

const TAB_CONTENT: Record<OrganizationSettingsTabKey, { title: string, subtitle: string; Component: () => React.JSX.Element | null }> = {
  general: {
    title: "General Settings",
    subtitle: "Manage your organization's contact info and weekly schedule.",
    Component: GeneralSettingsTab,
  },
  'festival-wages': {
    title: "Festival Wages",
    subtitle: 'Configure extra pay for shifts on specific calendar dates.',
    Component: FestivalWagesTab,
  },
  'night-shift-wages': {
    title: "Night Shift Wages",
    subtitle: 'Configure extra pay for shifts within a night time window.',
    Component: NightShiftWagesTab,
  },
  'weekend-wages': {
    title: "Weekend Wages",
    subtitle: "Configure extra pay for shifts on your organization's weekend days.",
    Component: WeekendWagesTab,
  },
};

export function OrganizationSettingsScreen() {
  const [activeTab, setActiveTab] = useState<OrganizationSettingsTabKey>('general');
  const { title, subtitle, Component } = TAB_CONTENT[activeTab];

  return (
    <AppShell>
      <OrganizationSettingsTabs activeKey={activeTab} onSelect={setActiveTab} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <Component />
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
