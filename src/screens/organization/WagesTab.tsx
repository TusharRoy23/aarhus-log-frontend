import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SegmentedControl } from '../../components/ui';
import { Spacing } from '../../theme/spacing';
import { FestivalWagesTab } from './FestivalWagesTab';
import { NightShiftWagesTab } from './NightShiftWagesTab';
import { WeekendWagesTab } from './WeekendWagesTab';

type WageKind = 'festival' | 'night-shift' | 'weekend';

// The 3 wage-config resources used to be sibling top-level tabs — now
// grouped under one "Wages" tab, switched locally here instead of through
// OrganizationSettingsTabs, so the outer tab strip only needs to grow when a
// genuinely new settings area is added, not every time a wage type is.
const WAGE_PANELS: { value: WageKind; label: string; Component: () => React.JSX.Element | null }[] = [
  { value: 'festival', label: 'Festival', Component: FestivalWagesTab },
  { value: 'night-shift', label: 'Night Shift', Component: NightShiftWagesTab },
  { value: 'weekend', label: 'Weekend', Component: WeekendWagesTab },
];

export function WagesTab() {
  const [activeKind, setActiveKind] = useState<WageKind>('festival');
  const { Component } = WAGE_PANELS.find((panel) => panel.value === activeKind) ?? WAGE_PANELS[0];

  return (
    <View style={styles.container}>
      <SegmentedControl
        options={WAGE_PANELS.map(({ value, label }) => ({ value, label }))}
        value={activeKind}
        onChange={setActiveKind}
      />
      <Component />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.gutter,
  },
});
