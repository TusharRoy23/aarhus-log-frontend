import { useEffect, useRef } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from './Button';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';

export interface QrScannerModalProps {
  visible: boolean;
  onClose: () => void;
  /** Fires once per open, the moment any QR code is detected — the scanned
   * value itself isn't sent anywhere (the start-schedule API has no field
   * for it yet), this is purely a "confirm you're physically there" gate. */
  onScanned: () => void;
}

// Full-screen (not this app's usual bottom-sheet/centered Modal patterns —
// a camera viewfinder needs the whole screen). expo-camera's scanning isn't
// usable the same way on web, so callers should never open this there —
// HomeScreen skips straight to a direct start on web, same as a 'manual'
// shift; this component doesn't defend against that itself.
export function QrScannerModal({ visible, onClose, onScanned }: QrScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const hasScannedRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    hasScannedRef.current = false;
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const handleBarcodeScanned = (_result: BarcodeScanningResult) => {
    if (hasScannedRef.current) return;
    hasScannedRef.current = true;
    onScanned();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={12}>
            <MaterialIcons name="close" size={24} color="#fff" />
          </Pressable>
        </SafeAreaView>

        {!permission ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : !permission.granted ? (
          <View style={styles.centered}>
            <Text style={styles.message}>Camera access is needed to scan the shift QR code.</Text>
            <Button label="Grant Camera Access" onPress={requestPermission} style={styles.grantButton} />
          </View>
        ) : (
          <>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarcodeScanned}
            />
            <View style={styles.hintBox}>
              <Text style={styles.hintText}>Point your camera at the shift&apos;s QR code</Text>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  camera: {
    flex: 1,
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginRight: Spacing.gutter,
    marginTop: Spacing.unit * 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.containerPaddingMobile,
    gap: Spacing.gutter,
  },
  message: {
    ...Typography.bodyMd,
    color: '#fff',
    textAlign: 'center',
  },
  grantButton: {
    alignSelf: 'stretch',
  },
  hintBox: {
    position: 'absolute',
    bottom: Spacing.sectionGap,
    left: Spacing.containerPaddingMobile,
    right: Spacing.containerPaddingMobile,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Radius.DEFAULT,
    padding: Spacing.gutter,
  },
  hintText: {
    ...Typography.bodyMd,
    color: '#fff',
    textAlign: 'center',
  },
});
