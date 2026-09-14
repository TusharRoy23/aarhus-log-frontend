import React from 'react';
import { ActivityIndicator, Pressable, PressableProps, StyleSheet, Text, ViewStyle } from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Radius } from '../../theme/radius';
import { Spacing } from '../../theme/spacing';
import { usePermissionCheck } from '../../store/slices/permissions-slice';
import type { PermissionActions, Resource } from '../../lib/api/permission';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  icon?: React.ReactNode;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
  /** Hides the button entirely when the current user lacks this permission. Omit to always show (normal behavior). */
  permission?: { resource: Resource; action: keyof PermissionActions };
}

export function Button({
  label,
  icon,
  loading,
  variant = 'primary',
  disabled,
  style,
  permission,
  ...pressableProps
}: ButtonProps) {
  const can = usePermissionCheck();
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || loading;

  if (permission && !can(permission.resource, permission.action)) {
    return null;
  }

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
    paddingHorizontal: Spacing.gutter,
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
