import { useEffect, useRef } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
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
  /** Fires once per open, the moment any QR code is detected, with the
   * scanned code's raw content (`result.data`) — the caller sends this on
   * as `qr_token` to POST /employee/start-schedule/, which verifies it
   * server-side as part of starting the shift. */
  onScanned: (token: string) => void;
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

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (hasScannedRef.current) return;
    hasScannedRef.current = true;
    onScanned(result.data);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* Modal content sits in its own native view hierarchy, so the outer
          SafeAreaProvider (in _layout.tsx) can't supply insets here — nest a
          fresh one so SafeAreaView below gets real values instead of 0.
          Same fix as SideDrawer.tsx hit for the same reason. */}
      <SafeAreaProvider>
        <View style={styles.container}>
          {!permission ? (
            <SafeAreaView edges={['top', 'bottom']} style={styles.centered}>
              <ActivityIndicator color={Colors.primary} />
            </SafeAreaView>
          ) : !permission.granted ? (
            <SafeAreaView edges={['top', 'bottom']} style={styles.centered}>
              <Text style={styles.message}>Camera access is needed to scan the shift QR code.</Text>
              <Button label="Grant Camera Access" onPress={requestPermission} style={styles.grantButton} />
            </SafeAreaView>
          ) : (
            <>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={handleBarcodeScanned}
              />
              {/* Overlays the camera, respecting top/bottom insets for the
                  close button and hint box — box-none so taps outside the
                  close button pass through to the camera view underneath. */}
              <SafeAreaView edges={['top', 'bottom']} style={styles.overlay} pointerEvents="box-none">
                <Pressable style={styles.closeButton} onPress={onClose} hitSlop={12}>
                  <MaterialIcons name="close" size={24} color="#fff" />
                </Pressable>
                <View style={styles.hintBox} pointerEvents="none">
                  <Text style={styles.hintText}>Point your camera at the shift&apos;s QR code</Text>
                </View>
              </SafeAreaView>
            </>
          )}
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  // Sits on top of the camera (later sibling in JSX = painted on top) and
  // fills the screen so `edges={['top','bottom']}` can push the close
  // button below the notch/Dynamic Island and the hint box above the home
  // indicator — `absoluteFillObject`, not `absoluteFill`, since only the
  // former is a real spreadable object in this RN version (see Toast.tsx).
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
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
    marginHorizontal: Spacing.containerPaddingMobile,
    marginBottom: Spacing.sectionGap,
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
