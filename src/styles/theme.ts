/**
 * Theme Constants
 * Shared styling constants for the NFL GM Simulation app
 *
 * Design influenced by:
 * - FIFA/EA FC Ultimate Team card designs
 * - Madden NFL MUT card system
 * - NBA 2K MyTeam gem tiers
 * - ESPN Fantasy & Sleeper app patterns
 */

export const colors = {
  // Primary colors
  primary: '#1a365d', // Dark blue
  primaryLight: '#2c5282',
  primaryDark: '#0d2137',

  // Secondary colors
  secondary: '#c05621', // Orange
  secondaryLight: '#dd6b20',
  secondaryDark: '#9c4221',

  // Background colors
  background: '#f7fafc',
  backgroundDark: '#1a202c',
  surface: '#ffffff',
  surfaceLight: '#f0f4f8',
  surfaceDark: '#2d3748',

  // Accent colors
  accent: '#805ad5', // Purple

  // Text colors
  text: '#1a202c',
  textSecondary: '#4a5568',
  textLight: '#718096',
  textOnPrimary: '#ffffff',
  textOnDark: '#e2e8f0',

  // Status colors
  success: '#38a169',
  warning: '#d69e2e',
  error: '#e53e3e',
  info: '#3182ce',

  // Rating tier colors (inspired by NBA 2K gem system & FIFA card tiers)
  tierElite: '#FFD700', // Gold - 90+ rating
  tierEliteBg: '#FFF9E6',
  tierExcellent: '#50C878', // Emerald - 80-89 rating
  tierExcellentBg: '#E8F8EE',
  tierGood: '#4169E1', // Sapphire - 70-79 rating
  tierGoodBg: '#E8EEF8',
  tierAverage: '#A0A0A0', // Silver - 60-69 rating
  tierAverageBg: '#F0F0F0',
  tierBelowAverage: '#CD7F32', // Bronze - 50-59 rating
  tierBelowAverageBg: '#F8F0E8',
  tierPoor: '#8B0000', // Dark Red - <50 rating
  tierPoorBg: '#F8E8E8',

  // Game-specific colors
  fieldGreen: '#2d5016',
  fieldGreenLight: '#3d6b1f',
  fieldLines: '#ffffff',
  endzone: '#1a365d',
  endzoneAway: '#c05621',
  ballMarker: '#f6e05e',

  // Score colors
  homeTeam: '#1a365d',
  awayTeam: '#c05621',

  // Highlight colors
  scoring: '#38a169',
  turnover: '#e53e3e',
  bigPlay: '#3182ce',

  // Border colors
  border: '#e2e8f0',
  borderDark: '#4a5568',

  // Position group colors (enhanced for better visual distinction)
  positionOffense: '#1a365d', // Deep blue
  positionOffenseLight: '#3182ce',
  positionDefense: '#c05621', // Orange
  positionDefenseLight: '#ed8936',
  positionSpecial: '#805ad5', // Purple
  positionSpecialLight: '#9f7aea',

  // Card backgrounds
  cardGradientStart: '#ffffff',
  cardGradientEnd: '#f7fafc',
  cardHighlight: 'rgba(255, 215, 0, 0.1)', // Gold highlight for elite players
} as const;

/**
 * Get rating tier color based on rating value
 * Inspired by NBA 2K gem system and FIFA card tiers
 */
export function getRatingTierColor(rating: number): {
  primary: string;
  background: string;
  tier: string;
} {
  if (rating >= 90) {
    return { primary: colors.tierElite, background: colors.tierEliteBg, tier: 'Elite' };
  } else if (rating >= 80) {
    return { primary: colors.tierExcellent, background: colors.tierExcellentBg, tier: 'Excellent' };
  } else if (rating >= 70) {
    return { primary: colors.tierGood, background: colors.tierGoodBg, tier: 'Good' };
  } else if (rating >= 60) {
    return { primary: colors.tierAverage, background: colors.tierAverageBg, tier: 'Average' };
  } else if (rating >= 50) {
    return {
      primary: colors.tierBelowAverage,
      background: colors.tierBelowAverageBg,
      tier: 'Below Avg',
    };
  } else {
    return { primary: colors.tierPoor, background: colors.tierPoorBg, tier: 'Poor' };
  }
}

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 28,
  display: 36,
} as const;

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

// Accessibility constants - CRITICAL for production
export const accessibility = {
  // Minimum touch target size (44x44 per Apple/Google guidelines)
  minTouchTarget: 44,
  // Hit slop for additional touch area
  hitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
  // Minimum contrast ratio for text (WCAG AA)
  minContrastRatio: 4.5,
  // Focus indicator width
  focusRingWidth: 2,
  // Animation timing for reduced motion users
  reducedMotionDuration: 0,
} as const;

// Animation durations
export const animation = {
  fast: 150,
  normal: 250,
  slow: 400,
  // For celebrations, etc.
  celebration: 1000,
} as const;

// Z-index layers
export const zIndex = {
  base: 0,
  card: 1,
  dropdown: 10,
  sticky: 20,
  modal: 100,
  toast: 200,
  tooltip: 300,
} as const;

// Common style patterns
export const commonStyles = {
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  // Accessible touch target
  touchTarget: {
    minHeight: accessibility.minTouchTarget,
    minWidth: accessibility.minTouchTarget,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  // Primary action button style
  primaryButton: {
    minHeight: accessibility.minTouchTarget,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  // Secondary button style
  secondaryButton: {
    minHeight: accessibility.minTouchTarget,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
} as const;

// Export theme object
export const theme = {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  commonStyles,
  accessibility,
  animation,
  zIndex,
} as const;

export type Theme = typeof theme;
export type Colors = keyof typeof colors;
export type Spacing = keyof typeof spacing;
export type FontSize = keyof typeof fontSize;
export type Accessibility = typeof accessibility;
export type Animation = typeof animation;
