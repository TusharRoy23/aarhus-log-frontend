import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';

export interface TopBarProps {
  onSwitchWorkspace?: () => void;
}

export function TopBar({ onSwitchWorkspace }: TopBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <View style={styles.logoBox}>
          <MaterialIcons name="workspaces" size={18} color={Colors.onPrimary} />
        </View>
        <Text style={styles.brandText}>Workspace</Text>
      </View>

      <Pressable style={styles.iconButton} onPress={onSwitchWorkspace} hitSlop={8}>
        <MaterialIcons name="swap-horiz" size={22} color={Colors.onSurfaceVariant} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.containerPaddingMobile,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
  },
  logoBox: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    ...Typography.headlineLgMobile,
    fontSize: 20,
    lineHeight: 26,
    color: Colors.primary,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
