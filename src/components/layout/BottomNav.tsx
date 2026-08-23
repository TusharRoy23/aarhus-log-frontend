import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Radius } from '../../theme/radius';

export type BottomNavKey = 'home' | 'notifications' | 'menu' | 'profile';

export interface BottomNavProps {
  active: BottomNavKey;
  onSelect: (key: BottomNavKey) => void;
}

const ITEMS: { key: BottomNavKey; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'notifications', label: 'Notifications', icon: 'notifications' },
  { key: 'menu', label: 'Menu', icon: 'menu' },
  { key: 'profile', label: 'Profile', icon: 'person' },
];

export function BottomNav({ active, onSelect }: BottomNavProps) {
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        {ITEMS.map((item) => {
          const isActive = item.key === active;
          return (
            <Pressable
              key={item.key}
              style={[styles.item, isActive && styles.itemActive]}
              onPress={() => onSelect(item.key)}
            >
              <MaterialIcons name={item.icon} size={22} color={isActive ? Colors.onSecondaryContainer : Colors.secondary} />
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.lg,
  },
  itemActive: {
    backgroundColor: Colors.secondaryContainer,
  },
  label: {
    ...Typography.labelSm,
    color: Colors.secondary,
  },
  labelActive: {
    color: Colors.onSecondaryContainer,
  },
});
