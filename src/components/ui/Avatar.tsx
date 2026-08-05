import React from 'react';
import { Image, ImageStyle, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';

export interface AvatarProps {
  /** Used to derive initials when no image is given. */
  label: string;
  uri?: string;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({ label, uri, size = 40, style }: AvatarProps) {
  const borderRadius = size / 2;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          { width: size, height: size, borderRadius, borderWidth: 1, borderColor: Colors.outlineVariant },
          style as ImageStyle,
        ]}
      />
    );
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius }, style]}>
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{getInitials(label)}</Text>
    </View>
  );
}

function getInitials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    ...Typography.titleMd,
    color: Colors.primary,
  },
});
