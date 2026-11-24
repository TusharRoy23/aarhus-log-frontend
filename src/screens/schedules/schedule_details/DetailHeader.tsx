import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { Spacing } from '../../../theme/spacing';
import { Radius } from '../../../theme/radius';

// Centered date (like the dummy screenshot) plus a close button on the
// right — this screen is a modal route (slide-up, presentation: 'modal';
// see _layout.tsx), and swipe-down/hardware-back alone isn't a visible
// enough affordance to rely on as the only way out.
export function DetailHeader({ dateLabel, onClose }: { dateLabel?: string; onClose: () => void }) {
  return (
    <View style={styles.header}>
      <View style={styles.side} />
      <Text style={styles.dateLabel} numberOfLines={1}>
        {dateLabel}
      </Text>
      <View style={styles.side}>
        <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
          <MaterialIcons name="close" size={20} color={Colors.onSurfaceVariant} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.containerPaddingMobile,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  // Matching-width spacer on the left so the date text is truly centered
  // against the close button's width on the right, not just centered
  // within the leftover space next to it.
  side: {
    width: 32,
  },
  dateLabel: {
    ...Typography.titleMd,
    color: Colors.onSurface,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
