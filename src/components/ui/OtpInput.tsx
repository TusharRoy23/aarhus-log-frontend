import React, { useEffect, useRef } from 'react';
import { NativeSyntheticEvent, StyleSheet, TextInput, TextInputKeyPressEventData, View } from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Radius } from '../../theme/radius';
import { Spacing } from '../../theme/spacing';

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

export function OtpInput({ length = 6, value, onChange, autoFocus }: OtpInputProps) {
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  useEffect(() => {
    if (autoFocus) {
      inputRefs.current[0]?.focus();
    }
    // Only on mount — this isn't meant to steal focus back on every value change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChangeText = (index: number, text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');

    if (digitsOnly.length > 1) {
      // A paste or SMS autofill delivered the whole code (or a chunk of it)
      // into one box — distribute it from here instead of treating it as a
      // single keystroke.
      const merged = (value.slice(0, index) + digitsOnly).slice(0, length);
      onChange(merged);
      inputRefs.current[Math.min(index + digitsOnly.length, length - 1)]?.focus();
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = digitsOnly;
    onChange(nextDigits.join(''));

    if (digitsOnly && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (event.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      const nextDigits = [...digits];
      nextDigits[index - 1] = '';
      onChange(nextDigits.join(''));
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.row}>
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            inputRefs.current[index] = ref;
          }}
          style={styles.box}
          value={digit}
          onChangeText={(text) => handleChangeText(index, text)}
          onKeyPress={(event) => handleKeyPress(index, event)}
          keyboardType="number-pad"
          maxLength={length}
          selectTextOnFocus
          textContentType="oneTimeCode"
          autoComplete={index === 0 ? 'sms-otp' : 'off'}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.unit * 3,
  },
  box: {
    width: 48,
    height: 56,
    borderWidth: 1,
    borderColor: Colors.outline,
    borderRadius: Radius.DEFAULT,
    backgroundColor: Colors.surfaceContainerLowest,
    textAlign: 'center',
    ...Typography.headlineLgMobile,
    fontSize: 24,
    color: Colors.onSurface,
  },
});
