import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';

function notImplemented(label: string) {
  Alert.alert(label, 'Coming soon.');
}

const PLACEHOLDER_TABS = ['Draft Shifts', 'Hours', 'Applications'] as const;

export function HomeSectionTabs() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.row}
    >
      <Pressable style={[styles.tab, styles.tabActive]}>
        <Text style={[styles.tabText, styles.tabTextActive]}>Shifts</Text>
      </Pressable>
      {PLACEHOLDER_TABS.map((label, index) => (
        <Pressable key={`${label}-${index}`} style={styles.tab} onPress={() => notImplemented(label)}>
          <Text style={styles.tabText}>{label}</Text>
        </Pressable>
      ))}
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
