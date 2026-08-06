import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { TextField } from './TextField';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Radius } from '../../theme/radius';
import { Spacing } from '../../theme/spacing';

export type DateTimeFieldMode = 'date' | 'time' | 'datetime';

export interface DateTimeFieldProps {
  label: string;
  mode: DateTimeFieldMode;
  /**
   * 'YYYY-MM-DD' for date mode, 'HH:MM' for time mode,
   * 'YYYY-MM-DDTHH:MM' for datetime mode.
   */
  value: string;
  onChange: (value: string) => void;
}

function parseValue(mode: DateTimeFieldMode, value: string): Date {
  const date = new Date();
  if (!value) return date;

  if (mode === 'time') {
    const [hours, minutes] = value.split(':').map(Number);
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date;
  }

  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  date.setFullYear(year, (month || 1) - 1, day || 1);
  if (mode === 'datetime' && timePart) {
    const [hours, minutes] = timePart.split(':').map(Number);
    date.setHours(hours || 0, minutes || 0, 0, 0);
  } else if (mode === 'date') {
    date.setHours(0, 0, 0, 0);
  }
  return date;
}

function formatValue(mode: DateTimeFieldMode, date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  if (mode === 'time') return `${hours}:${minutes}`;
  if (mode === 'date') return `${year}-${month}-${day}`;
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDisplay(mode: DateTimeFieldMode, value: string): string | null {
  if (!value) return null;
  if (mode === 'time') return value;

  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-');
  const dateLabel = `${day}/${month}/${year}`;
  if (mode === 'date') return dateLabel;
  return timePart ? `${dateLabel}, ${timePart}` : dateLabel;
}

const PLACEHOLDER: Record<DateTimeFieldMode, string> = {
  date: 'dd/mm/yyyy',
  time: '--:--',
  datetime: 'dd/mm/yyyy, --:--',
};

// `@react-native-community/datetimepicker` only ships iOS/Android/Windows
// implementations (no web variant) — this app also runs on web, so web gets
// a plain typed field instead of a native picker.
//
// Android has no single native "datetime" dialog — its date and time
// pickers are two separate dialogs — so `mode="datetime"` on Android runs
// them back-to-back (date first, then time) and merges the result. iOS's
// picker supports a combined "datetime" spinner natively, no chaining
// needed.
export function DateTimeField({ label, mode, value, onChange }: DateTimeFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [androidStep, setAndroidStep] = useState<'date' | 'time' | null>(null);
  const [androidPendingDate, setAndroidPendingDate] = useState<Date | null>(null);

  const icon = (
    <MaterialIcons
      name={mode === 'time' ? 'schedule' : mode === 'date' ? 'calendar-today' : 'event'}
      size={20}
      color={Colors.outline}
    />
  );

  if (Platform.OS === 'web') {
    return (
      <TextField label={label} placeholder={PLACEHOLDER[mode]} value={value} onChangeText={onChange} icon={icon} />
    );
  }

  const openPicker = () => {
    if (Platform.OS === 'android' && mode === 'datetime') {
      setAndroidPendingDate(parseValue(mode, value));
      setAndroidStep('date');
      return;
    }
    setShowPicker(true);
  };

  const handleValueChange = (_event: DateTimePickerChangeEvent, selectedDate: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    onChange(formatValue(mode, selectedDate));
  };

  const handleDismiss = () => {
    setShowPicker(false);
  };

  const handleAndroidDateStepChange = (_event: DateTimePickerChangeEvent, selectedDate: Date) => {
    setAndroidPendingDate(selectedDate);
    setAndroidStep('time');
  };

  const handleAndroidDateStepDismiss = () => {
    setAndroidStep(null);
  };

  const handleAndroidTimeStepChange = (_event: DateTimePickerChangeEvent, selectedTime: Date) => {
    setAndroidStep(null);
    if (!androidPendingDate) return;

    const combined = new Date(androidPendingDate);
    combined.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    onChange(formatValue(mode, combined));
  };

  const handleAndroidTimeStepDismiss = () => {
    setAndroidStep(null);
  };

  const displayText = formatDisplay(mode, value);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>

      <Pressable style={styles.field} onPress={openPicker}>
        <Text style={[styles.valueText, !displayText && styles.placeholderText]}>
          {displayText ?? PLACEHOLDER[mode]}
        </Text>
        {icon}
      </Pressable>

      {/* Android: single-step date or time */}
      {showPicker && Platform.OS === 'android' && mode !== 'datetime' ? (
        <DateTimePicker
          value={parseValue(mode, value)}
          mode={mode}
          onValueChange={handleValueChange}
          onDismiss={handleDismiss}
        />
      ) : null}

      {/* Android: two-step datetime (date dialog, then time dialog) */}
      {androidStep === 'date' && androidPendingDate ? (
        <DateTimePicker
          value={androidPendingDate}
          mode="date"
          onValueChange={handleAndroidDateStepChange}
          onDismiss={handleAndroidDateStepDismiss}
        />
      ) : null}
      {androidStep === 'time' && androidPendingDate ? (
        <DateTimePicker
          value={androidPendingDate}
          mode="time"
          onValueChange={handleAndroidTimeStepChange}
          onDismiss={handleAndroidTimeStepDismiss}
        />
      ) : null}

      {/* iOS: inline spinner in a bottom sheet, all modes supported directly */}
      {Platform.OS === 'ios' ? (
        <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
          <View style={styles.overlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowPicker(false)} accessibilityLabel="Close" />
            <View style={styles.sheet}>
              <Pressable style={styles.doneRow} onPress={() => setShowPicker(false)} hitSlop={8}>
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
              <DateTimePicker
                value={parseValue(mode, value)}
                mode={mode}
                display="spinner"
                onValueChange={handleValueChange}
                onDismiss={handleDismiss}
              />
            </View>
          </View>
        </Modal>
      ) : null}
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
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outline,
    borderRadius: Radius.DEFAULT,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  valueText: {
    ...Typography.bodyMd,
    color: Colors.onSurface,
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
    paddingBottom: Spacing.gutter,
  },
  doneRow: {
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.containerPaddingMobile,
    paddingVertical: Spacing.unit * 3,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  doneText: {
    ...Typography.bodyMd,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
});
