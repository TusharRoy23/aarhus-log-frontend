import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';

export type OrganizationSettingsTabKey = 'general' | 'festival-wages' | 'night-shift-wages' | 'weekend-wages';

// Children tabs of Organization Settings, not separate routes — switching
// between them swaps the panel OrganizationSettingsScreen renders below this
// strip. Same horizontal-scrolling pill-tab-bar pattern as HomeSectionTabs
// (Home screen), chosen here per explicit instruction over the 2-option
// SegmentedControl this screen used before Wage Config split into three
// separate tabs — a scrolling row of pills scales better than equal-width
// segments once there are more than two.
const TABS: { key: OrganizationSettingsTabKey; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'festival-wages', label: 'Festival Wages' },
  { key: 'night-shift-wages', label: 'Night Shift Wages' },
  { key: 'weekend-wages', label: 'Weekend Wages' },
];

export interface OrganizationSettingsTabsProps {
  activeKey: OrganizationSettingsTabKey;
  onSelect: (key: OrganizationSettingsTabKey) => void;
}

export function OrganizationSettingsTabs({ activeKey, onSelect }: OrganizationSettingsTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.row}
    >
      {TABS.map(({ key, label }) => {
        const isActive = key === activeKey;
        return (
          <Pressable key={key} style={[styles.tab, isActive && styles.tabActive]} onPress={() => onSelect(key)}>
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    // Without this, react-native-web's ScrollView defaults to `flexGrow: 1`
    // — since this sits as a flex sibling next to the page's main ScrollView
    // inside AppShell's flex:1 body, it would otherwise stretch to consume
    // all leftover vertical space instead of just wrapping its own pill-row
    // height, leaving the pills vertically centered inside a huge blue
    // rectangle rather than forming a slim tab bar. Same fix HomeSectionTabs
    // already needed for the identical reason.
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: Colors.primary,
  },
  row: {
    alignItems: 'center',
    gap: Spacing.unit * 2,
    paddingHorizontal: Spacing.containerPaddingMobile,
    paddingVertical: Spacing.unit * 3,
  },
  tab: {
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.unit * 2,
    borderRadius: Radius.full,
  },
  tabActive: {
    backgroundColor: Colors.surfaceContainerLowest,
  },
  tabText: {
    ...Typography.labelSm,
    color: Colors.inversePrimary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
});
