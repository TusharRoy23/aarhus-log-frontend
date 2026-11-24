import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/ui';
import { Colors } from '../../../theme/colors';
import { Spacing } from '../../../theme/spacing';
import { Radius } from '../../../theme/radius';

// An open shift (no employee yet) that isn't manual check-in — any
// employee viewing it can take it.
export function TakeShiftCard({ onPress, loading }: { onPress: () => void; loading: boolean }) {
  return (
    <View style={styles.takeShiftCard}>
      <Button label="Take Shift" onPress={onPress} loading={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  takeShiftCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    marginTop: Spacing.gutter,
  },
});
