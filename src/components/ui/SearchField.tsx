import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Radius } from '../../theme/radius';
import { Spacing } from '../../theme/spacing';

export interface SearchFieldProps extends TextInputProps {}

export function SearchField(props: SearchFieldProps) {
  return (
    <View style={styles.container}>
      <MaterialIcons name="search" size={20} color={Colors.outline} style={styles.icon} />
      <TextInput style={styles.input} placeholderTextColor={Colors.outline} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.DEFAULT,
    paddingHorizontal: Spacing.gutter,
  },
  icon: {},
  input: {
    ...Typography.bodyMd,
    flex: 1,
    paddingVertical: 12,
    color: Colors.onSurface,
  },
});
