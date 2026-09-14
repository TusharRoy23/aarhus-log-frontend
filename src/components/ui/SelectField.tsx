import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Radius } from '../../theme/radius';
import { Spacing } from '../../theme/spacing';

export interface SelectFieldOption {
  label: string;
  value: string;
}

export interface SelectFieldProps {
  label: string;
  placeholder: string;
  value?: string;
  options: SelectFieldOption[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  /** Show a pulsing skeleton in place of the field while its options are still loading. */
  loading?: boolean;
}

// Pulses a bar's opacity to stand in for the field's value text while its
// options are still being fetched — keeps the field's footprint (and the
// label above it) in place from the first render instead of the field
// popping in once data arrives.
function SelectFieldSkeleton() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, easing: Easing.ease, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View style={styles.field}>
      <Animated.View style={[styles.skeletonBar, { opacity }]} />
    </View>
  );
}

export function SelectField({ label, placeholder, value, options, onChange, icon, loading }: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>

      {loading ? (
        <SelectFieldSkeleton />
      ) : (
        <Pressable style={styles.field} onPress={() => setOpen(true)}>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text style={[styles.valueText, !selectedLabel && styles.placeholderText]} numberOfLines={1}>
            {selectedLabel ?? placeholder}
          </Text>
          <MaterialIcons name="expand-more" size={20} color={Colors.outline} />
        </Pressable>
      )}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Close" />
          <View style={styles.sheet}>
            <ScrollView>
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  style={styles.option}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.optionText}>{option.label}</Text>
                  {option.value === value ? <MaterialIcons name="check" size={18} color={Colors.primary} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.unit,
  },
  label: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 2,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outline,
    borderRadius: Radius.DEFAULT,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  icon: {},
  skeletonBar: {
    height: 14,
    width: '55%',
    borderRadius: Radius.sm,
    backgroundColor: Colors.outlineVariant,
  },
  valueText: {
    ...Typography.bodyMd,
    color: Colors.onSurface,
    flex: 1,
  },
  placeholderText: {
    color: Colors.outline,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(11,28,48,0.4)',
  },
  sheet: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    maxHeight: '60%',
    paddingVertical: Spacing.unit * 2,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.containerPaddingMobile,
    paddingVertical: Spacing.unit * 4,
  },
  optionText: {
    ...Typography.bodyLg,
    color: Colors.onSurface,
    flex: 1,
    textAlign: 'center',
  },
});
