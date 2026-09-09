import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';

export type HomeSectionTabKey = 'shifts' | 'draft-shifts' | 'hours' | 'applications' | 'floor';

// Children tabs of the Home screen, not separate routes — switching between
// them swaps the panel HomeScreen renders below this strip (see
// HomeScreen's renderActivePanel), the tab bar itself never leaves the
// screen. Every tab now has a real panel component behind it (even the
// still-content-less ones render a "coming soon" panel rather than an
// Alert) — see MyShiftsPanel/PeopleOnFloorPanel/DraftShiftsPanel/
// HoursPanel/ApplicationsPanel, each a separate file owning its own data
// fetching, not a shared switch statement here.
const TABS: { key: HomeSectionTabKey; label: string }[] = [
  { key: 'shifts', label: 'Shifts' },
  { key: 'draft-shifts', label: 'Draft Shifts' },
  { key: 'hours', label: 'Hours' },
  { key: 'applications', label: 'Applications' },
  { key: 'floor', label: 'People On the Floor' },
];

export interface HomeSectionTabsProps {
  activeKey: HomeSectionTabKey;
  onSelect: (key: HomeSectionTabKey) => void;
}

export function HomeSectionTabs({ activeKey, onSelect }: HomeSectionTabsProps) {
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
    // — since this component sits as a flex sibling next to the page's main
    // ScrollView inside HomeScreen's flex:1 body, it would otherwise stretch
    // to consume all the leftover vertical space instead of just wrapping
    // its own pill-row height, leaving the pills vertically centered inside
    // a huge blue rectangle rather than forming a slim tab bar.
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
