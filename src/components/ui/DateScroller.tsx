import { useEffect, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';

export interface DateScrollerItem {
  /**
   * Stable unique identity, e.g. an ISO date string ('YYYY-MM-DD'). Not the
   * same as `day` (the day-of-month number shown on the chip) — `day` alone
   * repeats across months, so it isn't safe as a key/selection value once
   * the list spans more than a few weeks.
   */
  key: string;
  label: string;
  day: number;
}

export interface DateScrollerProps {
  dates: DateScrollerItem[];
  /** Always one of `dates`' keys — a date filter is mandatory, there's no deselected/"show all" state. */
  selectedKey: string;
  onSelect: (key: string) => void;
  /** Called (once per approach) when the user scrolls near the end of the list — used to page in more dates. Omit when there's nothing more to load. */
  onEndReached?: () => void;
}

const END_REACHED_THRESHOLD_PX = 120;

export function DateScroller({ dates, selectedKey, onSelect, onEndReached }: DateScrollerProps) {
  // Guards against firing `onEndReached` repeatedly while the user stays
  // scrolled near the edge — resets whenever the list grows (or the caller
  // swaps in a different `onEndReached`, e.g. because more became
  // available), so the next approach toward the new end can trigger again.
  const hasTriggeredRef = useRef(false);
  useEffect(() => {
    hasTriggeredRef.current = false;
  }, [dates.length, onEndReached]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!onEndReached || hasTriggeredRef.current) return;
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const distanceFromEnd = contentSize.width - (contentOffset.x + layoutMeasurement.width);
    if (distanceFromEnd <= END_REACHED_THRESHOLD_PX) {
      hasTriggeredRef.current = true;
      onEndReached();
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      onScroll={handleScroll}
      scrollEventThrottle={100}
    >
      {dates.map((date) => {
        const isActive = date.key === selectedKey;
        return (
          <Pressable
            key={date.key}
            style={[styles.card, isActive && styles.cardActive]}
            onPress={() => onSelect(date.key)}
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
