import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { StatusColors, type ShiftStatus } from '../../theme/status';

export interface ManageShiftCardProps {
  name: string;
  role: string;
  status: ShiftStatus;
  statusLabel: string;
  dateLabel: string;
  timeRange: string;
  location: string;
  avatarUri?: string;
  onDetails?: () => void;
  onEdit?: () => void;
}

export function ManageShiftCard({
  name,
  role,
  status,
  statusLabel,
  dateLabel,
  timeRange,
  location,
  avatarUri,
  onDetails,
  onEdit,
}: ManageShiftCardProps) {
  const statusColor = StatusColors[status];

  return (
    <View style={styles.card}>
      <View style={[styles.strip, { backgroundColor: statusColor.strip }]} />

      <View style={styles.body}>
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
            <MaterialIcons name="calendar-today" size={16} color={Colors.onSurfaceVariant} />
            <Text style={styles.detailText}>{dateLabel}</Text>
          </View>
          <View style={styles.row}>
            <MaterialIcons name="schedule" size={16} color={Colors.onSurfaceVariant} />
            <Text style={styles.detailText}>{timeRange}</Text>
          </View>
          <View style={styles.row}>
            <MaterialIcons name="location-on" size={16} color={Colors.onSurfaceVariant} />
            <Text style={styles.detailText}>{location}</Text>
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
    gap: Spacing.unit * 3,
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
  detailsList: {
    gap: Spacing.unit * 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
  },
  detailText: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
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
