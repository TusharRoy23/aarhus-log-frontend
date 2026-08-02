export const Spacing = {
  unit: 4,
  containerPaddingMobile: 16,
  containerPaddingTablet: 32,
  gutter: 16,
  sectionGap: 40,
  cardPadding: 20,
} as const;

export type SpacingToken = keyof typeof Spacing;
