/**
 * LoadingScreen Component
 * Full-screen loading state with message
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight } from '../../styles';

export interface LoadingScreenProps {
  /** Loading message to display */
  message?: string;
  /** Secondary message/hint */
  hint?: string;
  /** Size of the loading indicator */
  size?: 'small' | 'large';
  /** Test ID */
  testID?: string;
}

/**
 * Full-screen loading indicator with optional message.
 *
 * @example
 * // Simple loading
 * <LoadingScreen />
 *
 * @example
 * // With message
 * <LoadingScreen
 *   message="Loading roster..."
 *   hint="This may take a moment"
 * />
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  hint,
  size = 'large',
  testID,
}) => {
  return (
    <View
      style={styles.container}
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
    >
      <ActivityIndicator size={size} color={colors.primary} />
      <Text style={styles.message}>{message}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
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
  message: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

export default LoadingScreen;
