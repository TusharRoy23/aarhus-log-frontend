import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '../../../components/ui';
import { Colors } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { Spacing } from '../../../theme/spacing';
import { Radius } from '../../../theme/radius';
import { notImplemented } from './schedule-detail-format';

// No backend API for this yet — stubbed (see schedule-detail-format.ts's
// notImplemented) until one exists.
export function MessagesSection() {
  return (
    <View style={styles.sectionGapTop}>
      <View style={styles.sectionHeading}>
        <MaterialIcons name="chat-bubble-outline" size={18} color={Colors.onSurfaceVariant} />
        <Text style={styles.sectionHeadingText}>Messages on the day</Text>
      </View>
      <View style={styles.detailList}>
        <Text style={styles.emptyText}>There are no messages</Text>
        <View style={styles.rowDivider} />
        <Button label="Write Message" variant="secondary" onPress={() => notImplemented('Write Message')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionGapTop: {
    marginTop: Spacing.sectionGap,
    gap: Spacing.gutter,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
  },
  sectionHeadingText: {
    ...Typography.titleMd,
    fontSize: 16,
    color: Colors.onSurface,
  },
  detailList: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    gap: Spacing.unit * 4,
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
  },
  emptyText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    paddingVertical: Spacing.unit * 2,
  },
});
