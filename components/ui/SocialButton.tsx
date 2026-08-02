import React from 'react';
import { Pressable, PressableProps, StyleSheet, Text } from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Radius } from '../../theme/radius';

export interface SocialButtonProps extends PressableProps {
  label: string;
  icon: React.ReactNode;
}

export function SocialButton({ label, icon, ...pressableProps }: SocialButtonProps) {
  return (
    <Pressable style={styles.base} accessibilityRole="button" {...pressableProps}>
      {icon}
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.outline,
    borderRadius: Radius.DEFAULT,
  },
  label: {
    ...Typography.labelSm,
    color: Colors.onSurface,
  },
});
