import { StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ActionMenu } from '../../../components/ui';
import { Colors } from '../../../theme/colors';
import { Spacing } from '../../../theme/spacing';
import { Radius } from '../../../theme/radius';
import { notImplemented } from './schedule-detail-format';

export interface ShiftActionsFabProps {
  isGivenAway: boolean;
  onGiveaway: () => void;
}

// Only shown for the shift's own employee (isMyShift, checked by the
// caller) — giveaway/swap make sense for an assigned shift, not an open
// one and not someone else's.
export function ShiftActionsFab({ isGivenAway, onGiveaway }: ShiftActionsFabProps) {
  return (
    <View style={styles.fabWrapper}>
      <ActionMenu
        trigger={
          <View style={styles.fab}>
            <MaterialIcons name="more-vert" size={24} color={Colors.onPrimary} />
          </View>
        }
        items={[
          {
            label: isGivenAway ? 'Cancel Giveaway' : 'Giveaway',
            icon: 'card-giftcard',
            onPress: () => (isGivenAway ? notImplemented('Cancel Giveaway') : onGiveaway()),
          },
          {
            label: 'Swap',
            icon: 'swap-horiz',
            onPress: () => notImplemented('Swap'),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fabWrapper: {
    position: 'absolute',
    bottom: Spacing.sectionGap,
    right: Spacing.containerPaddingMobile,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
