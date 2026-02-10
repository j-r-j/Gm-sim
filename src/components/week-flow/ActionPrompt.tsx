/**
 * ActionPrompt Component
 * Displays a prominent "what to do next" banner at the top of the dashboard
 * Shows clear, action-oriented messaging based on current week flow state
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  accessibility,
} from '../../styles';
import { NextActionPrompt } from '../../core/simulation/WeekFlowState';

export interface ActionPromptProps {
  /** The next action prompt data */
  prompt: NextActionPrompt;
  /** Callback when the action button is pressed */
  onPress: () => void;
  /** Whether to show pulsing animation for ready state */
  showPulse?: boolean;
}

/**
 * Get colors based on action type
 */
function getActionColors(type: NextActionPrompt['actionType']): {
  background: string;
  text: string;
  border: string;
  icon: string;
} {
  switch (type) {
    case 'primary':
      return {
        background: colors.primary,
        text: colors.textOnPrimary,
        border: colors.primaryDark,
        icon: '🏈',
      };
    case 'secondary':
      return {
        background: colors.secondary,
        text: colors.textOnPrimary,
        border: colors.secondaryDark,
        icon: '⏱️',
      };
    case 'warning':
      return {
        background: colors.error + '15',
        text: colors.error,
        border: colors.error,
        icon: '📊',
      };
    case 'success':
      return {
        background: colors.success,
        text: colors.textOnPrimary,
        border: colors.success,
        icon: '✓',
      };
    default:
      return {
        background: colors.primary,
        text: colors.textOnPrimary,
        border: colors.primaryDark,
        icon: '🏈',
      };
  }
}

export function ActionPrompt({
  prompt,
  onPress,
  showPulse = true,
}: ActionPromptProps): React.JSX.Element {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const actionColors = getActionColors(prompt.actionType);

  // Pulse animation for ready state
  useEffect(() => {
    if (showPulse && prompt.isEnabled && prompt.actionType === 'success') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [pulseAnim, showPulse, prompt.isEnabled, prompt.actionType]);

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: pulseAnim }] },
        !prompt.isEnabled && styles.containerDisabled,
      ]}
    >
      <TouchableOpacity
        style={[
          styles.touchable,
          {
            backgroundColor: actionColors.background,
            borderLeftColor: actionColors.border,
          },
          !prompt.isEnabled && styles.touchableDisabled,
        ]}
        onPress={onPress}
        activeOpacity={0.8}
        disabled={!prompt.isEnabled}
        accessibilityLabel={`${prompt.actionText}. ${prompt.isEnabled ? prompt.contextText : prompt.disabledReason || prompt.contextText}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: !prompt.isEnabled }}
        hitSlop={accessibility.hitSlop}
      >
        <View style={styles.iconContainer} accessibilityLabel="Action icon" accessible={false}>
          <Text style={styles.icon}>{actionColors.icon}</Text>
        </View>

        <View style={styles.content}>
          <Text
            style={[
              styles.actionText,
              { color: actionColors.text },
              !prompt.isEnabled && styles.textDisabled,
            ]}
            numberOfLines={1}
            accessibilityLabel={`Action: ${prompt.actionText}`}
          >
            {prompt.actionText}
          </Text>
          <Text
            style={[
              styles.contextText,
              { color: actionColors.text },
              !prompt.isEnabled && styles.textDisabled,
            ]}
            numberOfLines={1}
            accessibilityLabel={`Status: ${prompt.isEnabled ? prompt.contextText : prompt.disabledReason || prompt.contextText}`}
          >
            {prompt.isEnabled ? prompt.contextText : prompt.disabledReason || prompt.contextText}
          </Text>
        </View>

        <View style={styles.arrowContainer} accessible={false}>
          <Text style={[styles.arrow, { color: actionColors.text }]} accessibilityLabel="">
            →
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    ...shadows.md,
  },
  containerDisabled: {
    opacity: 0.7,
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
  },
  touchableDisabled: {
    backgroundColor: colors.surfaceDark,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  actionText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  contextText: {
    fontSize: fontSize.sm,
    opacity: 0.9,
    marginTop: spacing.xxs,
  },
  textDisabled: {
    opacity: 0.6,
  },
  arrowContainer: {
    paddingLeft: spacing.md,
  },
  arrow: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
});

export default ActionPrompt;
