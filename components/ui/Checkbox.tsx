import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';
import { Radius } from '../../theme/radius';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Checkbox({ checked, onChange }: CheckboxProps) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      style={[styles.box, checked && styles.boxChecked]}
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      {checked ? <MaterialIcons name="check" size={14} color={Colors.onPrimary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 18,
    height: 18,
    marginTop: 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
});
