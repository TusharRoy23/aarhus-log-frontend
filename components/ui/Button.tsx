import React from 'react';
import { ActivityIndicator, Pressable, PressableProps, StyleSheet, Text, ViewStyle } from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Radius } from '../../theme/radius';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  icon?: React.ReactNode;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
}

export function Button({
  label,
  icon,
  loading,
  variant = 'primary',
  disabled,
  style,
  ...pressableProps
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        isDisabled ? styles.disabled : null,
        pressed ? styles.pressed : null,
        style,
      ]}
      accessibilityRole="button"
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? Colors.onPrimary : Colors.primary} />
      ) : (
        <>
          <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelSecondary]}>
            {label}
          </Text>
          {icon}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: Radius.DEFAULT,
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  disabled: {
    opacity: 0.7,
  },
  pressed: {
    opacity: 0.9,
  },
  label: {
    ...Typography.titleMd,
  },
  labelPrimary: {
    color: Colors.onPrimary,
  },
  labelSecondary: {
    color: Colors.primary,
  },
});
