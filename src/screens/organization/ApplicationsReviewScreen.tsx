import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppShell } from '../../components/layout/AppShell';
import { SegmentedControl } from '../../components/ui';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { AbsenceReviewTab } from './AbsenceReviewTab';
import { OvertimeRequestReviewTab } from './OvertimeRequestReviewTab';

type ApplicationsReviewTabKey = 'absence' | 'overtime-request';

const REVIEW_PANELS: { value: ApplicationsReviewTabKey; label: string; Component: () => React.JSX.Element | null }[] = [
  { value: 'absence', label: 'Absence', Component: AbsenceReviewTab },
  { value: 'overtime-request', label: 'Overtime Request', Component: OvertimeRequestReviewTab },
];

export function ApplicationsReviewScreen() {
  const [activeTab, setActiveTab] = useState<ApplicationsReviewTabKey>('absence');
  const { Component } = REVIEW_PANELS.find((panel) => panel.value === activeTab) ?? REVIEW_PANELS[0];

  return (
    <AppShell>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Applications</Text>
          <Text style={styles.subtitle}>Review employee applications and requests.</Text>
        </View>

        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          options={REVIEW_PANELS.map(({ value, label }) => ({ value, label }))}
        />

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
