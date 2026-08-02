import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Radius } from '../../theme/radius';
import { Spacing } from '../../theme/spacing';

export interface TextFieldProps extends TextInputProps {
  label: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  labelRight?: React.ReactNode;
  error?: string;
}

export function TextField({
  label,
  icon,
  rightElement,
  labelRight,
  error,
  style,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label.toUpperCase()}</Text>
        {labelRight}
      </View>
      <View style={styles.inputWrapper}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <TextInput
          style={[
            styles.input,
            icon ? styles.inputWithIcon : null,
            rightElement ? styles.inputWithRightElement : null,
            focused ? styles.inputFocused : null,
            style,
          ]}
          placeholderTextColor={Colors.outline}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...inputProps}
        />
        {rightElement ? <View style={styles.rightElement}>{rightElement}</View> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.unit,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  label: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  inputWrapper: {
    justifyContent: 'center',
  },
  icon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  rightElement: {
    position: 'absolute',
    right: 12,
    zIndex: 1,
  },
  input: {
    ...Typography.bodyMd,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outline,
    borderRadius: Radius.DEFAULT,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: Colors.onSurface,
  },
  inputWithIcon: {
    paddingLeft: 40,
  },
  inputWithRightElement: {
    paddingRight: 44,
  },
  inputFocused: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  error: {
    ...Typography.labelSm,
    color: Colors.error,
  },
});
