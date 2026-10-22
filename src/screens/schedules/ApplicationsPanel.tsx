import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SegmentedControl } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { AbsenceApplicationsTab } from './AbsenceApplicationsTab';
import { OvertimeRequestsTab } from './OvertimeRequestsTab';

type ApplicationKind = 'absence' | 'overtime';

const APPLICATION_PANELS: { value: ApplicationKind; label: string; Component: () => React.JSX.Element | null }[] = [
  { value: 'absence', label: 'Absence', Component: AbsenceApplicationsTab },
  { value: 'overtime', label: 'Overtime Request', Component: OvertimeRequestsTab },
];

export function ApplicationsPanel() {
  const [activeKind, setActiveKind] = useState<ApplicationKind>('absence');
  const { Component } = APPLICATION_PANELS.find((panel) => panel.value === activeKind) ?? APPLICATION_PANELS[0];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Applications</Text>
      <SegmentedControl
        options={APPLICATION_PANELS.map(({ value, label }) => ({ value, label }))}
        value={activeKind}
        onChange={setActiveKind}
      />
      <Component />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.gutter,
  },
  sectionTitle: {
    ...Typography.headlineLgMobile,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.onSurface,
  },
});
