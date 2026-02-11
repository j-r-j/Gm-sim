/**
 * ScoutAccuracyBadge
 * Compact accuracy indicator for scout cards showing reliability status
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontSize, fontWeight, borderRadius, spacing } from '../../styles';
import { Scout } from '../../core/models/staff/Scout';
import { createScoutAccuracyViewModel } from '../../core/scouting/ScoutAccuracySystem';

export interface ScoutAccuracyBadgeProps {
  scout: Scout;
  size?: 'sm' | 'md';
  showHitRate?: boolean;
  onPress?: () => void;
}

/**
 * Get badge color based on accuracy status
 */
function getAccuracyColor(accuracy: string | null, reliabilityKnown: boolean): string {
  if (!reliabilityKnown) {
    return colors.textSecondary;
  }

  switch (accuracy) {
    case 'Reliable':
      return colors.success;
    case 'Mixed':
      return colors.warning;
    case 'Questionable':
      return colors.error;
    default:
      return colors.textSecondary;
  }
}

/**
 * Get badge text based on accuracy status
 */
function getBadgeText(
  viewModel: ReturnType<typeof createScoutAccuracyViewModel>,
  showHitRate: boolean
): string {
  if (!viewModel.reliabilityKnown) {
    if (viewModel.evaluationCount === 0) {
      return 'New';
    }
    return 'Building';
  }

  if (showHitRate && viewModel.hitRate) {
    return viewModel.hitRate;
  }

  return viewModel.overallAccuracy ?? 'Unknown';
}

export function ScoutAccuracyBadge({
  scout,
  size = 'sm',
  showHitRate = false,
  onPress,
}: ScoutAccuracyBadgeProps): React.JSX.Element {
  const viewModel = createScoutAccuracyViewModel(scout);
  const badgeColor = getAccuracyColor(viewModel.overallAccuracy, viewModel.reliabilityKnown);
  const badgeText = getBadgeText(viewModel, showHitRate);

  const isSmall = size === 'sm';

  const content = (
    <View
      style={[
        styles.badge,
        isSmall ? styles.badgeSm : styles.badgeMd,
        { backgroundColor: badgeColor + '20', borderColor: badgeColor },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          isSmall ? styles.badgeTextSm : styles.badgeTextMd,
          { color: badgeColor },
        ]}
      >
        {badgeText}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSm: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeMd: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  badgeText: {
    fontWeight: fontWeight.semibold,
  },
  badgeTextSm: {
    fontSize: fontSize.xs,
  },
  badgeTextMd: {
    fontSize: fontSize.sm,
  },
});

export default ScoutAccuracyBadge;
