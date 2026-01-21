/**
 * Button Component
 * Unified button component with accessibility support
 *
 * CRITICAL: All buttons in the app should use this component to ensure
 * consistent styling and accessibility compliance.
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, accessibility } from '../../styles';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  /** Button label text */
  label: string;
  /** Press handler */
  onPress: () => void;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size variant */
  size?: ButtonSize;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state - shows spinner */
  loading?: boolean;
  /** Accessibility hint for screen readers */
  accessibilityHint?: string;
  /** Custom style overrides */
  style?: ViewStyle;
  /** Custom text style overrides */
  textStyle?: TextStyle;
  /** Full width button */
  fullWidth?: boolean;
  /** Icon component to render before label */
  leftIcon?: React.ReactNode;
  /** Icon component to render after label */
  rightIcon?: React.ReactNode;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Accessible button component that follows design system guidelines.
 *
 * @example
 * // Primary button
 * <Button label="Continue" onPress={handleContinue} />
 *
 * @example
 * // Secondary button with loading
 * <Button
 *   label="Save"
 *   variant="secondary"
 *   loading={isSaving}
 *   onPress={handleSave}
 * />
 *
 * @example
 * // Danger button with hint
 * <Button
 *   label="Delete"
 *   variant="danger"
 *   accessibilityHint="Permanently removes this player from your roster"
 *   onPress={handleDelete}
 * />
 */
export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  accessibilityHint,
  style,
  textStyle,
  fullWidth = false,
  leftIcon,
  rightIcon,
  testID,
}) => {
  const isDisabled = disabled || loading;

  const buttonStyles = [
    styles.base,
    styles[`${variant}Base`],
    styles[`${size}Size`],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    isDisabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      hitSlop={accessibility.hitSlop}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'secondary' || variant === 'ghost' ? colors.primary : colors.textOnPrimary
          }
          size="small"
        />
      ) : (
        <>
          {leftIcon}
          <Text style={textStyles}>{label}</Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: accessibility.minTouchTarget,
    minWidth: accessibility.minTouchTarget,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },

  // Variant styles
  primaryBase: {
    backgroundColor: colors.primary,
  },
  secondaryBase: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dangerBase: {
    backgroundColor: colors.error,
  },
  ghostBase: {
    backgroundColor: 'transparent',
  },
  successBase: {
    backgroundColor: colors.success,
  },

  // Size styles
  smSize: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  mdSize: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  lgSize: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },

  // Text base
  text: {
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },

  // Text variant styles
  primaryText: {
    color: colors.textOnPrimary,
  },
  secondaryText: {
    color: colors.primary,
  },
  dangerText: {
    color: colors.textOnPrimary,
  },
  ghostText: {
    color: colors.primary,
  },
  successText: {
    color: colors.textOnPrimary,
  },

  // Text size styles
  smText: {
    fontSize: fontSize.sm,
  },
  mdText: {
    fontSize: fontSize.md,
  },
  lgText: {
    fontSize: fontSize.lg,
  },

  // State styles
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.8,
  },
  fullWidth: {
    width: '100%',
  },
});

export default Button;
