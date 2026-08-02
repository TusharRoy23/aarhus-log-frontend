import { TextStyle } from 'react-native';

/**
 * "Kinetic Enterprise" type scale. All styles use Inter.
 * Load the font family via useFonts before relying on these in render.
 */
export const Typography = {
  displayLg: {
    fontFamily: 'Inter_700Bold',
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -0.02 * 48,
  },
  headlineLg: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.01 * 32,
  },
  headlineLgMobile: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 24,
    lineHeight: 32,
  },
  titleMd: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
  },
  bodyLg: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMd: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  labelSm: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.05 * 12,
  },
} satisfies Record<string, TextStyle>;

export type TypographyToken = keyof typeof Typography;
