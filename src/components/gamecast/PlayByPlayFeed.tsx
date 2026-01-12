/**
 * PlayByPlayFeed Component
 * Scrollable list of play descriptions with highlighting for scoring
 * plays and turnovers.
 *
 * PRIVACY: This component only displays play descriptions/outcomes,
 * never probabilities, dice rolls, or internal mechanics.
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../styles';

/**
 * Single play item for the feed
 */
export interface PlayItem {
  /** Unique identifier for the play */
  id: string;
  /** Quarter the play occurred */
  quarter: number;
  /** Time remaining when play occurred */
  time: string;
  /** Team on offense abbreviation */
  offenseTeam: string;
  /** Description of the play (outcome only) */
  description: string;
  /** Was this a scoring play */
  isScoring?: boolean;
  /** Was this a turnover */
  isTurnover?: boolean;
  /** Was this a big play (20+ yards) */
  isBigPlay?: boolean;
  /** Current score after this play (home-away) */
  score?: string;
}

export interface PlayByPlayFeedProps {
  /** List of plays to display */
  plays: PlayItem[];
  /** Maximum height of the feed */
  maxHeight?: number;
  /** Whether to auto-scroll to latest play */
  autoScroll?: boolean;
  /** Empty state message */
  emptyMessage?: string;
}

/**
 * Format quarter for display
 */
function formatQuarter(quarter: number): string {
  if (quarter > 4) return `OT${quarter - 4}`;
  return `Q${quarter}`;
}

/**
 * Get play type indicator
 */
function getPlayTypeStyle(play: PlayItem): {
  containerStyle: object;
  textStyle: object;
  label: string | null;
} {
  if (play.isScoring) {
    return {
      containerStyle: styles.scoringPlay,
      textStyle: styles.scoringPlayText,
      label: 'TD',
    };
  }
  if (play.isTurnover) {
    return {
      containerStyle: styles.turnoverPlay,
      textStyle: styles.turnoverPlayText,
      label: 'TO',
    };
  }
  if (play.isBigPlay) {
    return {
      containerStyle: styles.bigPlay,
      textStyle: styles.bigPlayText,
      label: null,
    };
  }
  return {
    containerStyle: {},
    textStyle: {},
    label: null,
  };
}

/**
 * Single Play Row Component
 */
function PlayRow({ play }: { play: PlayItem }): React.JSX.Element {
  const typeStyle = getPlayTypeStyle(play);

  return (
    <View style={[styles.playRow, typeStyle.containerStyle]}>
      <View style={styles.playHeader}>
        <View style={styles.playMetaContainer}>
          <Text style={styles.quarterText}>{formatQuarter(play.quarter)}</Text>
          <Text style={styles.timeText}>{play.time}</Text>
          <Text style={styles.teamText}>{play.offenseTeam}</Text>
        </View>
        {typeStyle.label && (
          <View
            style={[
              styles.playTypeIndicator,
              play.isScoring && styles.scoringIndicator,
              play.isTurnover && styles.turnoverIndicator,
            ]}
          >
            <Text style={styles.playTypeIndicatorText}>{typeStyle.label}</Text>
          </View>
        )}
        {play.score && (
          <Text style={styles.scoreText}>{play.score}</Text>
        )}
      </View>
      <Text style={[styles.descriptionText, typeStyle.textStyle]}>
        {play.description}
      </Text>
    </View>
  );
}

/**
 * Quarter Divider Component
 */
function QuarterDivider({ quarter }: { quarter: number }): React.JSX.Element {
  return (
    <View style={styles.quarterDivider}>
      <View style={styles.quarterDividerLine} />
      <Text style={styles.quarterDividerText}>
        {quarter > 4 ? `OVERTIME ${quarter - 4}` : `QUARTER ${quarter}`}
      </Text>
      <View style={styles.quarterDividerLine} />
    </View>
  );
}

/**
 * PlayByPlayFeed Component
 */
export function PlayByPlayFeed({
  plays,
  maxHeight = 300,
  autoScroll = true,
  emptyMessage = 'No plays yet. Start the simulation!',
}: PlayByPlayFeedProps): React.JSX.Element {
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when new plays are added
  useEffect(() => {
    if (autoScroll && scrollViewRef.current && plays.length > 0) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [plays.length, autoScroll]);

  // Group plays by quarter for dividers
  const playsWithDividers: Array<{ type: 'play' | 'divider'; data: PlayItem | number }> =
    [];
  let lastQuarter = 0;

  plays.forEach((play) => {
    if (play.quarter !== lastQuarter) {
      playsWithDividers.push({ type: 'divider', data: play.quarter });
      lastQuarter = play.quarter;
    }
    playsWithDividers.push({ type: 'play', data: play });
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>PLAY-BY-PLAY</Text>
        <Text style={styles.playCount}>{plays.length} plays</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={[styles.scrollContainer, { maxHeight }]}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        {plays.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        ) : (
          playsWithDividers.map((item) => {
            if (item.type === 'divider') {
              return (
                <QuarterDivider key={`divider-${item.data}`} quarter={item.data as number} />
              );
            }
            return <PlayRow key={(item.data as PlayItem).id} play={item.data as PlayItem} />;
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
  },
  headerText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  playCount: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xs,
    opacity: 0.8,
  },
  scrollContainer: {
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingVertical: spacing.xs,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textLight,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  playRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  scoringPlay: {
    backgroundColor: `${colors.scoring}10`,
    borderLeftWidth: 3,
    borderLeftColor: colors.scoring,
  },
  turnoverPlay: {
    backgroundColor: `${colors.turnover}10`,
    borderLeftWidth: 3,
    borderLeftColor: colors.turnover,
  },
  bigPlay: {
    backgroundColor: `${colors.bigPlay}10`,
    borderLeftWidth: 3,
    borderLeftColor: colors.bigPlay,
  },
  playHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  playMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  quarterText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  timeText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  teamText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  playTypeIndicator: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
  },
  scoringIndicator: {
    backgroundColor: colors.scoring,
  },
  turnoverIndicator: {
    backgroundColor: colors.turnover,
  },
  playTypeIndicatorText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  scoreText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  descriptionText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: fontSize.sm * 1.4,
  },
  scoringPlayText: {
    color: colors.scoring,
    fontWeight: fontWeight.medium,
  },
  turnoverPlayText: {
    color: colors.turnover,
    fontWeight: fontWeight.medium,
  },
  bigPlayText: {
    color: colors.bigPlay,
    fontWeight: fontWeight.medium,
  },
  quarterDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  quarterDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  quarterDividerText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    letterSpacing: 1,
  },
});

export default PlayByPlayFeed;
