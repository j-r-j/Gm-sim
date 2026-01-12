/**
 * Theme Constants
 * Shared styling constants for the NFL GM Simulation app
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
  surfaceDark: '#2d3748',

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
} as const;

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
} as const;

export type Theme = typeof theme;
export type Colors = keyof typeof colors;
export type Spacing = keyof typeof spacing;
export type FontSize = keyof typeof fontSize;
