import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';

export interface SideDrawerProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}

export function SideDrawer({ visible, onClose, children, width = 320 }: SideDrawerProps) {
  const translateX = useRef(new Animated.Value(width)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : width,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, width, translateX]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Modal content sits in its own native view hierarchy, so the outer
          SafeAreaProvider (in _layout.tsx) can't supply insets here — nest a
          fresh one so SafeAreaView below gets real values instead of 0. */}
      <SafeAreaProvider>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
          <Animated.View style={[styles.panel, { width, transform: [{ translateX }] }]}>
            <SafeAreaView edges={['top', 'bottom', 'right']} style={styles.safeArea}>
              {children}
            </SafeAreaView>
          </Animated.View>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11,28,48,0.4)',
  },
  panel: {
    height: '100%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderLeftWidth: 1,
    borderLeftColor: Colors.outlineVariant,
  },
  safeArea: {
    flex: 1,
  },
});
