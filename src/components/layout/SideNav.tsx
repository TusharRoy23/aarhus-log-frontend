import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';

export interface SideNavProps {
  userName: string;
  roleLabel?: string;
  organizationName?: string;
  onSwitchWorkspace?: () => void;
  onNotImplemented: (label: string) => void;
  onSignOut: () => void;
}

const LINKS: { key: string; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: 'settings', label: 'Team Settings', icon: 'settings' },
  { key: 'billing', label: 'Billing', icon: 'payments' },
  { key: 'help', label: 'Help', icon: 'help' },
];

export function SideNav({
  userName,
  roleLabel,
  organizationName,
  onSwitchWorkspace,
  onNotImplemented,
  onSignOut,
}: SideNavProps) {
  return (
    <View style={styles.container}>
      <View style={styles.profile}>
        <Avatar label={userName} size={48} />
        <View style={styles.profileText}>
          <Text style={styles.name}>{userName}</Text>
          {roleLabel ? <Text style={styles.role}>{roleLabel}</Text> : null}
          {organizationName ? <Text style={styles.org}>{organizationName}</Text> : null}
        </View>
      </View>

      <Pressable style={styles.link} onPress={onSwitchWorkspace}>
        <MaterialIcons name="domain" size={20} color={Colors.onSurfaceVariant} />
        <Text style={styles.linkLabel}>Switch Workspace</Text>
      </Pressable>

      {LINKS.map((link) => (
        <Pressable key={link.key} style={styles.link} onPress={() => onNotImplemented(link.label)}>
          <MaterialIcons name={link.icon} size={20} color={Colors.onSurfaceVariant} />
          <Text style={styles.linkLabel}>{link.label}</Text>
        </Pressable>
      ))}

      <View style={styles.spacer} />

      <Pressable style={styles.link} onPress={onSignOut}>
        <MaterialIcons name="logout" size={20} color={Colors.onSurfaceVariant} />
        <Text style={styles.linkLabel}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 320,
    height: '100%',
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.outlineVariant,
    padding: Spacing.containerPaddingMobile,
    gap: Spacing.unit,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gutter,
    padding: Spacing.gutter,
    marginBottom: Spacing.gutter,
  },
  profileText: {
    flex: 1,
  },
  name: {
    ...Typography.titleMd,
    color: Colors.primary,
  },
  role: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  org: {
    ...Typography.labelSm,
    color: Colors.secondary,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.gutter,
    padding: Spacing.unit * 3,
    borderRadius: Radius.DEFAULT,
  },
  linkLabel: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  spacer: {
    flex: 1,
  },
});
