/**
 * FieldVisualization Component
 * Visual representation of the football field showing ball position,
 * down/distance, and direction of play.
 *
 * PRIVACY: This component only displays outcome data (field position),
 * never probabilities or internal mechanics.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../styles';

export interface FieldVisualizationProps {
  /** Ball position (0-100, where 0 is own goal line, 100 is opponent's goal line) */
  ballPosition: number;
  /** Current down (1-4) */
  down: number;
  /** Yards to go for first down */
  yardsToGo: number;
  /** Which team has possession */
  possession: 'home' | 'away';
  /** Home team abbreviation */
  homeTeamAbbr: string;
  /** Away team abbreviation */
  awayTeamAbbr: string;
  /** Is it a red zone situation (inside 20) */
  isRedZone?: boolean;
}

/**
 * Format down and distance for display
 */
function formatDownAndDistance(down: number, yardsToGo: number): string {
  const ordinals = ['1st', '2nd', '3rd', '4th'];
  const downStr = ordinals[down - 1] || `${down}th`;

  if (yardsToGo >= 10 && down === 1) {
    return `${downStr} & 10`;
  }

  if (yardsToGo <= 0) {
    return `${downStr} & Goal`;
  }

  return `${downStr} & ${yardsToGo}`;
}

/**
 * Get yard line display (converting 0-100 to actual yard line)
 */
function getYardLineDisplay(position: number): string {
  // Position 0-50 is own territory, 50-100 is opponent's
  if (position === 50) return '50';
  if (position < 50) {
    return `Own ${position}`;
  }
  return `Opp ${100 - position}`;
}

/**
 * FieldVisualization Component
 */
export function FieldVisualization({
  ballPosition,
  down,
  yardsToGo,
  possession,
  homeTeamAbbr,
  awayTeamAbbr,
  isRedZone = false,
}: FieldVisualizationProps): React.JSX.Element {
  const isHomeOffense = possession === 'home';

  return (
    <View style={styles.container}>
      {/* Down and Distance */}
      <View style={styles.infoRow}>
        <View style={styles.downDistanceContainer}>
          <Text style={styles.downDistanceText}>{formatDownAndDistance(down, yardsToGo)}</Text>
        </View>
        <View style={styles.yardLineContainer}>
          <Text style={styles.yardLineText}>{getYardLineDisplay(ballPosition)}</Text>
        </View>
        {isRedZone && (
          <View style={styles.redZoneIndicator}>
            <Text style={styles.redZoneText}>RED ZONE</Text>
          </View>
        )}
      </View>

      {/* Field Container */}
      <View style={styles.fieldContainer}>
        {/* Left End Zone (Home) */}
        <View style={[styles.endzone, styles.endzoneLeft]}>
          <Text style={styles.endzoneText}>{homeTeamAbbr}</Text>
        </View>

        {/* Playing Field */}
        <View style={styles.field}>
          {/* Yard Line Markers */}
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((yard) => (
            <View key={yard} style={[styles.yardMarker, { left: `${(yard / 100) * 100}%` }]}>
              <Text style={styles.yardMarkerText}>{yard <= 50 ? yard : 100 - yard}</Text>
            </View>
          ))}

          {/* Ball Marker */}
          <View style={[styles.ballMarker, { left: `${(ballPosition / 100) * 100}%` }]}>
            <View style={styles.ball} />
            {/* Direction Arrow */}
            <Text style={styles.directionArrow}>{isHomeOffense ? '→' : '←'}</Text>
          </View>

          {/* First Down Marker (if applicable) */}
          {yardsToGo > 0 && yardsToGo < 100 && (
            <View
              style={[
                styles.firstDownMarker,
                {
                  left: `${(Math.min(100, Math.max(0, ballPosition + (isHomeOffense ? yardsToGo : -yardsToGo))) / 100) * 100}%`,
                },
              ]}
            />
          )}
        </View>

        {/* Right End Zone (Away) */}
        <View style={[styles.endzone, styles.endzoneRight]}>
          <Text style={styles.endzoneText}>{awayTeamAbbr}</Text>
        </View>
      </View>

      {/* Possession Indicator */}
      <View style={styles.possessionRow}>
        <View style={[styles.possessionIndicator, isHomeOffense && styles.possessionActive]}>
          <Text style={[styles.possessionText, isHomeOffense && styles.possessionTextActive]}>
            {homeTeamAbbr}
          </Text>
        </View>
        <Text style={styles.possessionLabel}>POSSESSION</Text>
        <View style={[styles.possessionIndicator, !isHomeOffense && styles.possessionActive]}>
          <Text style={[styles.possessionText, !isHomeOffense && styles.possessionTextActive]}>
            {awayTeamAbbr}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  downDistanceContainer: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  downDistanceText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  yardLineContainer: {
    marginLeft: spacing.md,
  },
  yardLineText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  redZoneIndicator: {
    marginLeft: 'auto',
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  redZoneText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  fieldContainer: {
    flexDirection: 'row',
    height: 60,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  endzone: {
    width: '10%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endzoneLeft: {
    backgroundColor: colors.endzone,
  },
  endzoneRight: {
    backgroundColor: colors.endzoneAway,
  },
  endzoneText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    transform: [{ rotate: '-90deg' }],
  },
  field: {
    flex: 1,
    backgroundColor: colors.fieldGreen,
    position: 'relative',
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.fieldLines,
  },
  yardMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.fieldLines,
    opacity: 0.5,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  yardMarkerText: {
    color: colors.fieldLines,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    opacity: 0.8,
  },
  ballMarker: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateX: -8 }, { translateY: -16 }],
    alignItems: 'center',
  },
  ball: {
    width: 16,
    height: 10,
    backgroundColor: colors.ballMarker,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  directionArrow: {
    color: colors.textOnPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    marginTop: 2,
  },
  firstDownMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.warning,
  },
  possessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  possessionIndicator: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.border,
  },
  possessionActive: {
    backgroundColor: colors.primary,
  },
  possessionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  possessionTextActive: {
    color: colors.textOnPrimary,
  },
  possessionLabel: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    fontWeight: fontWeight.medium,
  },
});

export default FieldVisualization;
