/**
 * RatingTierIndicator Component
 * Visual indicator of player quality tier using color-coded badges.
 *
 * Design inspired by:
 * - NBA 2K MyTeam gem tier system (Gold, Emerald, Sapphire, Ruby, Diamond, etc.)
 * - FIFA Ultimate Team card tiers (Bronze, Silver, Gold)
 * - Madden MUT overall rating display
 *
 * BRAND GUIDELINE: No numeric overall ratings. Use color tiers instead.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  getRatingTierColor,
} from '../../styles';

export type RatingTierSize = 'sm' | 'md' | 'lg';
export type RatingTierVariant = 'badge' | 'dot' | 'bar' | 'gem';

export interface RatingTierIndicatorProps {
  /** The rating value (0-100) to display as a tier */
  rating: number;
  /** Size variant */
  size?: RatingTierSize;
  /** Display variant */
  variant?: RatingTierVariant;
  /** Whether to show the tier label */
  showLabel?: boolean;
  /** Custom style overrides */
  style?: ViewStyle;
}

/**
 * Get size-specific styles
 */
function getSizeStyles(size: RatingTierSize) {
  switch (size) {
    case 'sm':
      return {
        dotSize: 6,
        badgePaddingH: spacing.xs,
        badgePaddingV: 2,
        fontSize: fontSize.xs,
        gemSize: 16,
        barHeight: 4,
        barWidth: 40,
      };
    case 'lg':
      return {
        dotSize: 12,
        badgePaddingH: spacing.md,
        badgePaddingV: spacing.sm,
        fontSize: fontSize.md,
        gemSize: 32,
        barHeight: 8,
        barWidth: 80,
      };
    default: // md
      return {
        dotSize: 8,
        badgePaddingH: spacing.sm,
        badgePaddingV: spacing.xs,
        fontSize: fontSize.sm,
        gemSize: 24,
        barHeight: 6,
        barWidth: 60,
      };
  }
}

/**
 * Dot variant - Simple colored dot
 */
function DotIndicator({
  tierColor,
  size,
}: {
  tierColor: string;
  size: RatingTierSize;
}): React.JSX.Element {
  const sizeStyles = getSizeStyles(size);
  return (
    <View
      style={[
        styles.dot,
        {
          width: sizeStyles.dotSize,
          height: sizeStyles.dotSize,
          backgroundColor: tierColor,
        },
      ]}
    />
  );
}

/**
 * Badge variant - Colored badge with optional label
 */
function BadgeIndicator({
  tierColor,
  tierBg,
  tierLabel,
  size,
  showLabel,
}: {
  tierColor: string;
  tierBg: string;
  tierLabel: string;
  size: RatingTierSize;
  showLabel: boolean;
}): React.JSX.Element {
  const sizeStyles = getSizeStyles(size);
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: tierBg,
          borderColor: tierColor,
          paddingHorizontal: sizeStyles.badgePaddingH,
          paddingVertical: sizeStyles.badgePaddingV,
        },
      ]}
    >
      <View
        style={[
          styles.badgeDot,
          {
            width: sizeStyles.dotSize,
            height: sizeStyles.dotSize,
            backgroundColor: tierColor,
          },
        ]}
      />
      {showLabel && (
        <Text style={[styles.badgeText, { color: tierColor, fontSize: sizeStyles.fontSize }]}>
          {tierLabel}
        </Text>
      )}
    </View>
  );
}

/**
 * Bar variant - Horizontal progress-style bar
 */
function BarIndicator({
  rating,
  tierColor,
  size,
}: {
  rating: number;
  tierColor: string;
  size: RatingTierSize;
}): React.JSX.Element {
  const sizeStyles = getSizeStyles(size);
  const fillWidth = Math.min(100, Math.max(0, rating));

  return (
    <View
      style={[styles.barContainer, { height: sizeStyles.barHeight, width: sizeStyles.barWidth }]}
    >
      <View
        style={[
          styles.barFill,
          {
            width: `${fillWidth}%`,
            backgroundColor: tierColor,
          },
        ]}
      />
    </View>
  );
}

/**
 * Gem variant - Diamond/gem shaped indicator (NBA 2K style)
 */
function GemIndicator({
  tierColor,
  tierBg,
  size,
}: {
  tierColor: string;
  tierBg: string;
  size: RatingTierSize;
}): React.JSX.Element {
  const sizeStyles = getSizeStyles(size);
  const gemSize = sizeStyles.gemSize;

  return (
    <View style={styles.gemContainer}>
      <View
        style={[
          styles.gem,
          {
            width: gemSize,
            height: gemSize,
            backgroundColor: tierBg,
            borderColor: tierColor,
          },
        ]}
      >
        <View
          style={[
            styles.gemInner,
            {
              width: gemSize * 0.5,
              height: gemSize * 0.5,
              backgroundColor: tierColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

/**
 * RatingTierIndicator Component
 */
export function RatingTierIndicator({
  rating,
  size = 'md',
  variant = 'badge',
  showLabel = true,
  style,
}: RatingTierIndicatorProps): React.JSX.Element {
  const tierInfo = getRatingTierColor(rating);

  const renderIndicator = () => {
    switch (variant) {
      case 'dot':
        return <DotIndicator tierColor={tierInfo.primary} size={size} />;
      case 'bar':
        return <BarIndicator rating={rating} tierColor={tierInfo.primary} size={size} />;
      case 'gem':
        return (
          <GemIndicator tierColor={tierInfo.primary} tierBg={tierInfo.background} size={size} />
        );
      default: // badge
        return (
          <BadgeIndicator
            tierColor={tierInfo.primary}
            tierBg={tierInfo.background}
            tierLabel={tierInfo.tier}
            size={size}
            showLabel={showLabel}
          />
        );
    }
  };

  return <View style={[styles.container, style]}>{renderIndicator()}</View>;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Dot styles
  dot: {
    borderRadius: borderRadius.full,
  },
  // Badge styles
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  badgeDot: {
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontWeight: fontWeight.semibold,
  },
  // Bar styles
  barContainer: {
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  // Gem styles
  gemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gem: {
    transform: [{ rotate: '45deg' }],
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gemInner: {
    transform: [{ rotate: '-45deg' }],
    borderRadius: borderRadius.sm,
  },
});

export default RatingTierIndicator;
