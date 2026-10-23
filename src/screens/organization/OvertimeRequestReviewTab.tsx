import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';

// The "Overtime Request" sub-tab on the Applications review page — no
// admin-wide list/approve/decline endpoint exists for overtime requests
// yet, so this is just an empty-state placeholder. Kept as its own file
// (not a shared "ComingSoonPanel") so it's ready to grow a real
// query/content later without disturbing the other review tabs.
export function OvertimeRequestReviewTab() {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyText}>Reviewing overtime requests is coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
