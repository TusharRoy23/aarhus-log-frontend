import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';

// The "Applications" tab's content — no backing endpoint yet, so this is
// just an empty-state placeholder. Kept as its own file (not a shared
// "ComingSoonPanel") so it's ready to grow a real query/content later
// without disturbing the other tabs.
export function ApplicationsPanel() {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Applications</Text>
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>Applications are coming soon.</Text>
      </View>
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
  emptyCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
  },
  emptyText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
});
