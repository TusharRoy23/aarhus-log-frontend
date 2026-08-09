import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';

export interface DesignationCardProps {
  name: string;
  isActive: boolean;
  isOwner: boolean;
  onEdit?: () => void;
}

export function DesignationCard({ name, isActive, isOwner, onEdit }: DesignationCardProps) {
  const stripColor = isActive ? '#10b981' : Colors.outline;

  return (
    <View style={styles.card}>
      <View style={[styles.strip, { backgroundColor: stripColor }]} />

      <View style={styles.body}>
        <View style={styles.identity}>
          <Text style={styles.name}>{name}</Text>
          <View style={styles.badgeRow}>
            {isOwner ? (
              <View style={[styles.badge, styles.ownerBadge]}>
                <Text style={styles.ownerBadgeText}>Owner</Text>
              </View>
            ) : null}
            <View style={[styles.badge, isActive ? styles.activeBadge : styles.inactiveBadge]}>
              <Text style={[styles.badgeText, isActive ? styles.activeBadgeText : styles.inactiveBadgeText]}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>

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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.DEFAULT,
    overflow: 'hidden',
  },
  strip: {
    width: 4,
    alignSelf: 'stretch',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.cardPadding,
    gap: Spacing.unit * 2,
  },
  identity: {
    flexShrink: 1,
    gap: Spacing.unit * 2,
  },
  name: {
    ...Typography.titleMd,
    color: Colors.onSurface,
    textTransform: 'capitalize',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.unit * 2,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.unit * 2,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  badgeText: {
    ...Typography.labelSm,
  },
  activeBadge: {
    backgroundColor: '#ecfdf5',
  },
  activeBadgeText: {
    color: '#047857',
  },
  inactiveBadge: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
  inactiveBadgeText: {
    color: Colors.onSurfaceVariant,
  },
  ownerBadge: {
    backgroundColor: Colors.secondaryContainer,
  },
  ownerBadgeText: {
    ...Typography.labelSm,
    color: Colors.onSecondaryContainer,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit,
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
