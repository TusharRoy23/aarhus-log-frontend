/**
 * "Kinetic Enterprise" color tokens.
 * Material 3 style color roles — use these instead of hardcoding hex values.
 */
export const Colors = {
  surface: '#f8f9ff',
  surfaceDim: '#cbdbf5',
  surfaceBright: '#f8f9ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e5eeff',
  surfaceContainerHigh: '#dce9ff',
  surfaceContainerHighest: '#d3e4fe',
  surfaceVariant: '#d3e4fe',
  surfaceTint: '#0053db',

  onSurface: '#0b1c30',
  onSurfaceVariant: '#434655',
  inverseSurface: '#213145',
  inverseOnSurface: '#eaf1ff',

  outline: '#737686',
  outlineVariant: '#c3c6d7',

  primary: '#004ac6',
  onPrimary: '#ffffff',
  primaryContainer: '#2563eb',
  onPrimaryContainer: '#eeefff',
  inversePrimary: '#b4c5ff',

  secondary: '#565e74',
  onSecondary: '#ffffff',
  secondaryContainer: '#dae2fd',
  onSecondaryContainer: '#5c647a',

  tertiary: '#943700',
  onTertiary: '#ffffff',
  tertiaryContainer: '#bc4800',
  onTertiaryContainer: '#ffede6',

  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  primaryFixed: '#dbe1ff',
  primaryFixedDim: '#b4c5ff',
  onPrimaryFixed: '#00174b',
  onPrimaryFixedVariant: '#003ea8',

  secondaryFixed: '#dae2fd',
  secondaryFixedDim: '#bec6e0',
  onSecondaryFixed: '#131b2e',
  onSecondaryFixedVariant: '#3f465c',

  tertiaryFixed: '#ffdbcd',
  tertiaryFixedDim: '#ffb596',
  onTertiaryFixed: '#360f00',
  onTertiaryFixedVariant: '#7d2d00',

  background: '#f8f9ff',
  onBackground: '#0b1c30',
} as const;

export type ColorToken = keyof typeof Colors;
