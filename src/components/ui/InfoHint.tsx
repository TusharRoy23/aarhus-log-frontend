import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';

export interface InfoHintProps {
  text: string;
}

// A small "i" icon that reveals a short explanatory note on tap — this
// app's touch-first equivalent of a hover tooltip (RN has no hover on a
// real phone, and this app targets native as much as the web build).
// Reuses the same centered overlay+sheet pattern as every other dismissible
// surface in this app (ShiftHistoryScreen's Date Range picker,
// BulkScheduleWeekGrid's cell editor) rather than an anchored floating
// tooltip — there's no relative-positioned popover primitive here, and
// precisely anchoring a bubble next to an arbitrary trigger would need
// ref-measurement machinery a one-line hint doesn't warrant. Typically
// passed as a `TextField`'s `labelRight`.
export function InfoHint({ text }: InfoHintProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="More info"
      >
        <MaterialIcons name="info-outline" size={16} color={Colors.onSurfaceVariant} />
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setVisible(false)} accessibilityLabel="Close" />
          <View style={styles.sheet}>
            <Text style={styles.text}>{text}</Text>
            <Pressable style={styles.closeButton} onPress={() => setVisible(false)}>
              <Text style={styles.closeButtonText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(11,28,48,0.4)',
    padding: Spacing.containerPaddingMobile,
  },
  sheet: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    gap: Spacing.gutter,
  },
  text: {
    ...Typography.bodyMd,
    color: Colors.onSurface,
  },
  closeButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.unit * 2,
  },
  closeButtonText: {
    ...Typography.labelSm,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
});
