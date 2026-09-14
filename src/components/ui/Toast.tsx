import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { Radius } from '../../theme/radius';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { hideToast, type ToastVariant } from '../../store/slices/toast-slice';

const AUTO_DISMISS_MS = 4000;

const VARIANT_STYLES: Record<ToastVariant, { background: string; text: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  error: { background: Colors.error, text: Colors.onError, icon: 'error-outline' },
  success: { background: '#10b981', text: '#ffffff', icon: 'check-circle' },
  info: { background: Colors.inverseSurface, text: Colors.inverseOnSurface, icon: 'info-outline' },
};

// Rendered once at the root layout — driven entirely by the `toast` Redux
// slice, so both component code and non-component code (the base_api.ts
// response interceptor, which already dispatches into the store directly
// for the 401 case) can trigger it the same way.
//
// Uses `FullWindowOverlay` (react-native-screens), not RN's own `Modal`.
// A plain `<Modal>` here can't present above a screen that's itself
// pushed with `presentation: 'modal'` (Create Shift, Employee/Designation
// forms) — on iOS that's a genuine native `UIViewController` modal
// presentation, and iOS only allows one view controller to be the
// topmost presented one at a time, so a second, separately-mounted
// `<Modal>` silently fails to show above it. `FullWindowOverlay` renders
// in its own native window above everything, including other native
// modal presentations, specifically to solve this. On web/Android it
// falls back to a plain `View` (the stacking issue is iOS-specific).
export function Toast() {
  const dispatch = useAppDispatch();
  const { visible, message, variant, id } = useAppSelector((state) => state.toast);
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    translateY.setValue(80);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => dispatch(hideToast()), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
    // `id` (not just `visible`) so the same message shown twice in a row
    // still resets the auto-dismiss timer and replays the entrance
    // animation.
  }, [visible, id, dispatch, translateY, opacity]);

  // FullWindowOverlay has no `visible` prop (unlike Modal) — mount/unmount
  // it ourselves based on the slice's `visible` flag.
  if (!visible || !message) return null;

  const style = VARIANT_STYLES[variant];

  return (
    <FullWindowOverlay>
      <SafeAreaProvider>
        <View style={styles.overlay} pointerEvents="box-none">
          <SafeAreaView edges={['bottom']} style={styles.safeArea} pointerEvents="box-none">
            <Animated.View style={[styles.toast, { backgroundColor: style.background, opacity, transform: [{ translateY }] }]}>
              <Pressable style={styles.body} onPress={() => dispatch(hideToast())}>
                <MaterialIcons name={style.icon} size={20} color={style.text} />
                <Text style={[styles.message, { color: style.text }]} numberOfLines={3}>
                  {message}
                </Text>
                <MaterialIcons name="close" size={18} color={style.text} />
              </Pressable>
            </Animated.View>
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </FullWindowOverlay>
  );
}

const styles = StyleSheet.create({
  overlay: {
    // `FullWindowOverlay` only provides genuine portal-like positioning on
    // iOS — its web/Android fallback is a plain `View` rendered inline in
    // the normal tree (unlike `Modal`, which handled full-viewport
    // positioning itself via its own portal). Position explicitly instead
    // of relying on `flex: 1`, so it covers the screen regardless of
    // which fallback is in play.
    // `StyleSheet.absoluteFill` is a `RegisteredStyle` (an opaque id) in
    // this RN version, not a plain object, so it can't be spread —
    // `absoluteFillObject` is the real object form meant for exactly this
    // "spread it with a couple tweaks" case.
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  safeArea: {
    paddingHorizontal: Spacing.containerPaddingMobile,
    paddingBottom: Spacing.gutter,
  },
  toast: {
    borderRadius: Radius.DEFAULT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.unit * 3,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.unit * 4,
  },
  message: {
    ...Typography.bodyMd,
    flex: 1,
  },
});
