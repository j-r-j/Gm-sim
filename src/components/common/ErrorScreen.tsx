/**
 * ErrorScreen Component
 * Full-screen error state with retry option
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../styles';
import { Button } from './Button';

export interface ErrorScreenProps {
  /** Error object or message string */
  error: Error | string;
  /** Retry handler */
  onRetry?: () => void;
  /** Go back handler */
  onGoBack?: () => void;
  /** Custom title */
  title?: string;
  /** Test ID */
  testID?: string;
}

/**
 * Full-screen error display with retry and back options.
 *
 * @example
 * // With retry
 * <ErrorScreen
 *   error={error}
 *   onRetry={loadData}
 * />
 *
 * @example
 * // With both options
 * <ErrorScreen
 *   error="Failed to load roster"
 *   onRetry={loadRoster}
 *   onGoBack={() => navigation.goBack()}
 * />
 */
export const ErrorScreen: React.FC<ErrorScreenProps> = ({
  error,
  onRetry,
  onGoBack,
  title = 'Something went wrong',
  testID,
}) => {
  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <View
      style={styles.container}
      testID={testID}
      accessibilityRole="alert"
      accessibilityLabel={`Error: ${errorMessage}`}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="alert-circle" size={64} color={colors.error} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{errorMessage}</Text>

      <View style={styles.actions}>
        {onRetry && (
          <Button
            label="Try Again"
            onPress={onRetry}
            variant="primary"
            accessibilityHint="Retry the failed action"
          />
        )}
        {onGoBack && (
          <Button
            label="Go Back"
            onPress={onGoBack}
            variant="secondary"
            accessibilityHint="Return to the previous screen"
          />
        )}
      </View>

      {/* Help hint */}
      <View style={styles.helpContainer}>
        <Ionicons name="help-circle-outline" size={16} color={colors.textLight} />
        <Text style={styles.helpText}>If this problem persists, try restarting the app</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: fontSize.md * 1.5,
    maxWidth: 300,
  },
  actions: {
    gap: spacing.md,
    width: '100%',
    maxWidth: 300,
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxl,
  },
  helpText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
});

export default ErrorScreen;
