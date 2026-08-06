import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';

export interface DateScrollerItem {
  label: string;
  day: number;
}

export interface DateScrollerProps {
  dates: DateScrollerItem[];
  selectedDay: number;
  onSelect: (day: number) => void;
}

export function DateScroller({ dates, selectedDay, onSelect }: DateScrollerProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {dates.map((date) => {
        const isActive = date.day === selectedDay;
        return (
          <Pressable
            key={date.day}
            style={[styles.card, isActive && styles.cardActive]}
            onPress={() => onSelect(date.day)}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>{date.label}</Text>
            <Text style={[styles.number, isActive && styles.numberActive]}>{date.day}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.gutter,
    paddingVertical: Spacing.unit,
  },
  card: {
    width: 72,
    height: 90,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.unit,
  },
  cardActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primaryContainer,
  },
  label: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  labelActive: {
    color: Colors.onPrimaryContainer,
  },
  number: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  numberActive: {
    color: Colors.onPrimaryContainer,
  },
});
