import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { ActionMenu } from './ActionMenu';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { EmployeeStatusColors, type EmployeeStatus } from '../../theme/status';

export type EmployeeCardAction = 'edit' | 'resend-invite' | 'delete' | 'manage-permissions' | 'wages';

export interface EmployeeCardProps {
  name: string;
  email: string;
  role: string;
  status: EmployeeStatus;
  isInvited: boolean;
  avatarUri?: string;
  /** The card only reports which action was tapped — the caller decides
   * what that means (which route to push, which mutation to run, etc.). */
  onAction: (action: EmployeeCardAction) => void;
}

export function EmployeeCard({
  name,
  email,
  role,
  status,
  isInvited,
  avatarUri,
  onAction,
}: EmployeeCardProps) {
  const statusColor = EmployeeStatusColors[status];
  const statusLabel = status === 'active' ? 'Active' : 'Not Active';

  return (
    <View style={styles.card}>
      <View style={[styles.strip, { backgroundColor: statusColor.strip }]} />

      <View style={styles.body}>
        <View style={styles.header}>
          <View style={styles.identity}>
            <Avatar label={name} uri={avatarUri} size={40} />
            <View style={styles.identityText}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.email} numberOfLines={1}>
                {email}
              </Text>
              <Text style={styles.role}>{role}</Text>
            </View>
          </View>

          <ActionMenu
            trigger={<MaterialIcons name="more-vert" size={20} color={Colors.onSurfaceVariant} />}
            items={[
              {
                label: 'Manage Permissions',
                icon: 'admin-panel-settings',
                onPress: () => onAction('manage-permissions'),
              },
              {
                label: 'Wages',
                icon: 'payments',
                onPress: () => onAction('wages'),
              },
              {
                label: 'Delete Employee',
                icon: 'delete',
                destructive: true,
                onPress: () => onAction('delete'),
              },
            ]}
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.statusColumn}>
            <View style={[styles.badge, { backgroundColor: statusColor.background }]}>
              <View style={[styles.badgeDot, { backgroundColor: statusColor.text }]} />
              <Text style={[styles.badgeText, { color: statusColor.text }]}>{statusLabel}</Text>
            </View>

            {status === 'inactive' ? (
              <Pressable style={styles.resendRow} onPress={() => onAction('resend-invite')} hitSlop={8}>
                <MaterialIcons name="mail-outline" size={16} color={Colors.primary} />
                <Text style={styles.resendText}>{status === 'inactive' && isInvited ? 'Re-Invite' : 'Invite'}</Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable style={styles.editButton} onPress={() => onAction('edit')}>
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.DEFAULT,
    overflow: 'hidden',
  },
  strip: {
    width: 4,
  },
  body: {
    flex: 1,
    padding: Spacing.cardPadding,
    gap: Spacing.unit * 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.unit * 2,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 3,
    flexShrink: 1,
  },
  identityText: {
    flexShrink: 1,
  },
  name: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  email: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  role: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: Spacing.unit * 2,
  },
  statusColumn: {
    gap: Spacing.unit * 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.unit,
    paddingHorizontal: Spacing.unit * 2,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    ...Typography.labelSm,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit,
  },
  resendText: {
    ...Typography.labelSm,
    color: Colors.primary,
  },
  editButton: {
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.unit * 2,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.DEFAULT,
  },
  editButtonText: {
    ...Typography.labelSm,
    color: Colors.primary,
  },
});
