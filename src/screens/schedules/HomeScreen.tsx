import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { AppShell } from '../../components/layout/AppShell';
import { Spacing } from '../../theme/spacing';
import { ApplicationsPanel } from './ApplicationsPanel';
import { DraftShiftsPanel } from './DraftShiftsPanel';
import { HomeSectionTabs, type HomeSectionTabKey } from './HomeSectionTabs';
import { HoursPanel } from './HoursPanel';
import { MyShiftsPanel } from './MyShiftsPanel';
import { PeopleOnFloorPanel } from './PeopleOnFloorPanel';

// This is the post-login landing page — same shell for every user
// regardless of role/permissions (unlike the Menu drawer, nothing here is
// gated by `usePermissionCheck`). HomeSectionTabs' tabs are children of this
// screen — switching between them swaps which panel renders below the tab
// strip, it never navigates away from Home. Each tab's actual content
// (greeting/Current Schedule/My Schedule for "Shifts", the floor roster,
// the still-stubbed tabs) lives in its own panel file and owns its own data
// fetching — this screen is deliberately just the tab-switching shell.
export function HomeScreen() {
  const [activeTab, setActiveTab] = useState<HomeSectionTabKey>('shifts');

  function renderActivePanel() {
    switch (activeTab) {
      case 'shifts':
        return <MyShiftsPanel />;
      case 'floor':
        return <PeopleOnFloorPanel />;
      case 'draft-shifts':
        return <DraftShiftsPanel />;
      case 'hours':
        return <HoursPanel />;
      case 'applications':
        return <ApplicationsPanel />;
    }
  }

  return (
    <AppShell>
      <HomeSectionTabs activeKey={activeTab} onSelect={setActiveTab} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {renderActivePanel()}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.containerPaddingMobile,
    gap: Spacing.sectionGap,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
});
