import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Radius } from '../../theme/radius';
import { Spacing } from '../../theme/spacing';

export interface ActionMenuItem {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
}

export interface ActionMenuProps {
  items: ActionMenuItem[];
  /** The element that opens the menu — usually a "more" icon button. */
  trigger: React.ReactNode;
}

// A tap-to-open bottom-sheet action list, same Modal + overlay pattern as
// SelectField's picker — this app has no relative-positioned popover
// primitive (no popover library installed), so per-row "more" menus use the
// same full-width bottom sheet as everything else.
export function ActionMenu({ items, trigger }: ActionMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={8}>
        {trigger}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Close" />
          <View style={styles.sheet}>
            {items.map((item) => (
              <Pressable
                key={item.label}
                style={styles.item}
                onPress={() => {
                  setOpen(false);
                  item.onPress();
                }}
              >
                <MaterialIcons name={item.icon} size={20} color={item.destructive ? Colors.error : Colors.onSurfaceVariant} />
                <Text style={[styles.itemText, item.destructive && styles.destructiveText]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(11,28,48,0.4)',
  },
  sheet: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingVertical: Spacing.unit * 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 3,
    paddingHorizontal: Spacing.containerPaddingMobile,
    paddingVertical: Spacing.unit * 4,
  },
  itemText: {
    ...Typography.bodyLg,
    color: Colors.onSurface,
  },
  destructiveText: {
    color: Colors.error,
  },
});
