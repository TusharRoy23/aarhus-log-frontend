import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { StatusColors, type ShiftStatus } from '../../theme/status';

export interface ShiftCardProps {
  name: string;
  role: string;
  status: ShiftStatus;
  statusLabel: string;
  timeRange: string;
  location: string;
  avatarUri?: string;
  onDetails?: () => void;
  onEdit?: () => void;
}

export function ShiftCard({
  name,
  role,
  status,
  statusLabel,
  timeRange,
  location,
  avatarUri,
  onDetails,
  onEdit,
}: ShiftCardProps) {
  const statusColor = StatusColors[status];

  return (
    <View style={styles.card}>
      <View style={[styles.strip, { backgroundColor: statusColor.strip }]} />

      <View style={styles.header}>
        <View style={styles.identity}>
          <Avatar label={name} uri={avatarUri} size={40} />
          <View style={styles.identityText}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.role}>{role}</Text>
          </View>
        </View>

        <View style={[styles.badge, { backgroundColor: statusColor.background }]}>
          <Text style={[styles.badgeText, { color: statusColor.text }]}>{statusLabel}</Text>
        </View>
      </View>
      <View style={styles.detailsList}>
        <View style={styles.row}>
          <MaterialIcons name="schedule" size={18} color={Colors.onSurface} />
          <Text style={styles.timeText}>{timeRange}</Text>
        </View>
        <View style={styles.row}>
          <MaterialIcons name="location-on" size={18} color={Colors.onSurfaceVariant} />
          <Text style={styles.locationText}>{location}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable onPress={onDetails} hitSlop={8}>
          <Text style={styles.detailsLink}>Details</Text>
        </Pressable>
        <Pressable style={styles.editButton} onPress={onEdit}>
          <MaterialIcons name="edit" size={16} color={Colors.primary} />
          <Text style={styles.editButtonText}>Edit</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.DEFAULT,
    padding: Spacing.cardPadding,
    paddingLeft: Spacing.cardPadding + 4,
    gap: Spacing.gutter,
    overflow: 'hidden',
  },
  strip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
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
  role: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  badge: {
    paddingHorizontal: Spacing.unit * 2,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  badgeText: {
    ...Typography.labelSm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.gutter,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    paddingTop: Spacing.unit * 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
  },
  timeText: {
    ...Typography.bodyMd,
    fontFamily: 'Inter_500Medium',
    color: Colors.onSurface,
  },
  locationText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  detailsList: {
    gap: Spacing.unit * 2,
  },
  detailsLink: {
    ...Typography.bodyMd,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
    paddingHorizontal: Spacing.unit * 3,
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
