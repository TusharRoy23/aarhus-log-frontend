import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';
import { Radius } from '../../theme/radius';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Checkbox({ checked, onChange, disabled = false }: CheckboxProps) {
  return (
    <Pressable
      onPress={() => !disabled && onChange(!checked)}
      style={[styles.box, checked && styles.boxChecked, disabled && styles.boxDisabled]}
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
    >
      {checked ? <MaterialIcons name="check" size={14} color={disabled ? Colors.onSurfaceVariant : Colors.onPrimary} /> : null}
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
  boxDisabled: {
    backgroundColor: Colors.surfaceContainerLow,
    borderColor: Colors.outlineVariant,
  },
});
