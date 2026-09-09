import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
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
  // iOS's spinner fires onChange continuously on every scroll tick, not just
  // once the user settles on a value — buffer it here instead of calling
  // the caller's `onChange` immediately, so callers that react to `onChange`
  // (e.g. refetching a query) only see the final value, committed once the
  // sheet closes (via "Done" or dismissing it), not every intermediate tick.
  const [iosDraftValue, setIosDraftValue] = useState(value);

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
    setIosDraftValue(value);
    setShowPicker(true);
  };

  // v8's native picker has no separate onDismiss — a single onChange fires
  // for every event (set *and* dismissed/cancelled), with `selectedDate`
  // only present for a real "set". Treat a missing date as a dismiss.
  //
  // Android's dialog fires this once, on confirm, and closes itself — commit
  // immediately, same as before. iOS's spinner fires this continuously while
  // scrolling — only update the local draft here, committed separately once
  // the sheet closes (see closeIosPicker below).
  const handleValueChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (!selectedDate) return;
      onChange(formatValue(mode, selectedDate));
      return;
    }
    if (!selectedDate) return;
    setIosDraftValue(formatValue(mode, selectedDate));
  };

  // Whatever the wheel shows when the sheet closes is the value — same
  // "no real cancel" convention iOS's own picker sheets use — so both the
  // "Done" button and dismissing via the backdrop commit the current draft.
  const closeIosPicker = () => {
    setShowPicker(false);
    if (iosDraftValue !== value) {
      onChange(iosDraftValue);
    }
  };

  const handleAndroidDateStepChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (!selectedDate) {
      setAndroidStep(null);
      return;
    }
    setAndroidPendingDate(selectedDate);
    setAndroidStep('time');
  };

  const handleAndroidTimeStepChange = (_event: DateTimePickerEvent, selectedTime?: Date) => {
    setAndroidStep(null);
    if (!selectedTime || !androidPendingDate) return;

    const combined = new Date(androidPendingDate);
    combined.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    onChange(formatValue(mode, combined));
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
        <DateTimePicker value={parseValue(mode, value)} mode={mode} onChange={handleValueChange} />
      ) : null}

      {/* Android: two-step datetime (date dialog, then time dialog) */}
      {androidStep === 'date' && androidPendingDate ? (
        <DateTimePicker value={androidPendingDate} mode="date" onChange={handleAndroidDateStepChange} />
      ) : null}
      {androidStep === 'time' && androidPendingDate ? (
        <DateTimePicker value={androidPendingDate} mode="time" onChange={handleAndroidTimeStepChange} />
      ) : null}

      {/* iOS: inline spinner in a bottom sheet, all modes supported directly — the
          sheet itself docks to the bottom, but the spinner is centered within it. */}
      {Platform.OS === 'ios' ? (
        <Modal visible={showPicker} transparent animationType="slide" onRequestClose={closeIosPicker}>
          <View style={styles.overlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeIosPicker} accessibilityLabel="Close" />
            <View style={styles.sheet}>
              <Pressable style={styles.doneRow} onPress={closeIosPicker} hitSlop={8}>
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
              <DateTimePicker
                value={parseValue(mode, iosDraftValue)}
                mode={mode}
                display="spinner"
                onChange={handleValueChange}
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
    color: Colors.onSurface
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
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingBottom: Spacing.gutter,
    overflow: 'hidden',
  },
  doneRow: {
    alignSelf: 'stretch',
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
