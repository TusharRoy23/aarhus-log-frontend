import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Radius } from '../../theme/radius';
import { Spacing } from '../../theme/spacing';
import { Checkbox } from './Checkbox';
import { Button } from './Button';

export interface MultiSelectFieldOption {
  label: string;
  value: string;
}

export interface MultiSelectFieldProps {
  label: string;
  /** Shown on the trigger when nothing is selected — e.g. "All employees". */
  placeholder: string;
  values: string[];
  options: MultiSelectFieldOption[];
  onChange: (values: string[]) => void;
  icon?: React.ReactNode;
}

// Same tap-to-open bottom-sheet pattern as SelectField, but with a checkbox
// per row and an explicit "Apply" instead of closing on the first tap — a
// multi-select needs a few taps before the choice is final, unlike a single
// select where any tap already is the final choice.
export function MultiSelectField({ label, placeholder, values, options, onChange, icon }: MultiSelectFieldProps) {
  const [open, setOpen] = useState(false);
  // Draft copy so dismissing the sheet (backdrop tap, hardware back) discards
  // in-progress changes instead of committing them — only "Apply" does.
  const [draftValues, setDraftValues] = useState(values);

  useEffect(() => {
    if (open) setDraftValues(values);
  }, [open, values]);

  const selectedLabels = options.filter((option) => values.includes(option.value)).map((option) => option.label);
  const triggerText =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length <= 2
        ? selectedLabels.join(', ')
        : `${selectedLabels.length} selected`;

  const toggleDraftValue = (value: string) => {
    setDraftValues((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const handleApply = () => {
    onChange(draftValues);
    setOpen(false);
  };

  const handleClear = () => setDraftValues([]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>

      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <Text style={[styles.valueText, selectedLabels.length === 0 && styles.placeholderText]} numberOfLines={1}>
          {triggerText}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Close" />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <Text style={styles.sheetHint}>Leave empty to apply to all employees.</Text>

            <ScrollView style={styles.optionList}>
              {options.map((option) => {
                const checked = draftValues.includes(option.value);
                return (
                  <Pressable key={option.value} style={styles.option} onPress={() => toggleDraftValue(option.value)}>
                    <Checkbox checked={checked} onChange={() => toggleDraftValue(option.value)} />
                    <Text style={styles.optionText}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.sheetFooter}>
              <Button label="Clear" variant="secondary" onPress={handleClear} style={styles.sheetButton} />
              <Button label="Apply" onPress={handleApply} style={styles.sheetButton} />
            </View>
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
    maxHeight: '70%',
    padding: Spacing.cardPadding,
    gap: Spacing.unit * 3,
  },
  sheetTitle: {
    ...Typography.titleMd,
    color: Colors.onSurface,
  },
  sheetHint: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    marginTop: -Spacing.unit * 2,
  },
  optionList: {
    flexGrow: 0,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 3,
    paddingVertical: Spacing.unit * 3,
  },
  optionText: {
    ...Typography.bodyMd,
    color: Colors.onSurface,
    flexShrink: 1,
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: Spacing.gutter,
  },
  sheetButton: {
    flex: 1,
  },
});
