import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Radius } from '../../theme/radius';
import { useAppSelector } from '../../store/hooks';

export type BottomNavKey = 'home' | 'activities' | 'assistant' | 'menu' | 'profile';

export interface BottomNavProps {
  active: BottomNavKey;
  onSelect: (key: BottomNavKey) => void;
}

const ITEMS: { key: BottomNavKey; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'activities', label: 'Activities', icon: 'notifications' },
  { key: 'assistant', label: 'Assistant', icon: 'smart-toy' },
  { key: 'menu', label: 'Menu', icon: 'menu' },
  { key: 'profile', label: 'Profile', icon: 'person' },
];

export function BottomNav({ active, onSelect }: BottomNavProps) {
  const unreadCount = useAppSelector((state) => state.notifications.unreadCount);

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        {ITEMS.map((item) => {
          const isActive = item.key === active;
          const badgeCount = item.key === 'activities' ? unreadCount : 0;
          return (
            <Pressable
              key={item.key}
              style={[styles.item, isActive && styles.itemActive]}
              onPress={() => onSelect(item.key)}
            >
              <View style={styles.iconWrapper}>
                <MaterialIcons name={item.icon} size={22} color={isActive ? Colors.onSecondaryContainer : Colors.secondary} />
                {badgeCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 64,
    paddingHorizontal: 8,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: Radius.lg,
  },
  itemActive: {
    backgroundColor: Colors.secondaryContainer,
  },
  iconWrapper: {
    // Fixed size, not just wrapping the icon snugly — the badge is
    // absolutely positioned off this box's corner, so it needs stable
    // bounds regardless of which icon glyph is inside.
    width: 22,
    height: 22,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  badgeText: {
    ...Typography.labelSm,
    fontSize: 10,
    lineHeight: 12,
    color: Colors.onError,
  },
  label: {
    ...Typography.labelSm,
    color: Colors.secondary,
  },
  labelActive: {
    color: Colors.onSecondaryContainer,
  },
});
