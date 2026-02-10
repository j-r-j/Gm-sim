/**
 * BoxScoreModal
 * A modal component that displays detailed box score information for a game
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  accessibility,
} from '../styles';
import { BoxScore } from '../core/game/BoxScoreGenerator';

export interface BoxScoreModalProps {
  visible: boolean;
  boxScore: BoxScore | null;
  onClose: () => void;
}

/**
 * Quarter score row component
 */
function QuarterScoreRow({
  teamAbbr,
  teamName,
  scoreByQuarter,
  totalScore,
  isWinner,
}: {
  teamAbbr: string;
  teamName: string;
  scoreByQuarter: number[];
  totalScore: number;
  isWinner: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.quarterRow}>
      <View style={styles.teamInfo}>
        <Text style={[styles.teamAbbr, isWinner && styles.winnerText]}>{teamAbbr}</Text>
        <Text style={styles.teamNameSmall} numberOfLines={1}>
          {teamName}
        </Text>
      </View>
      {scoreByQuarter.map((score, idx) => (
        <Text key={idx} style={styles.quarterScore}>
          {score}
        </Text>
      ))}
      <Text style={[styles.totalScore, isWinner && styles.winnerText]}>{totalScore}</Text>
    </View>
  );
}

/**
 * Team comparison row component
 */
function ComparisonRow({
  category,
  homeValue,
  awayValue,
}: {
  category: string;
  homeValue: string | number;
  awayValue: string | number;
}): React.JSX.Element {
  return (
    <View style={styles.comparisonRow}>
      <Text style={styles.comparisonValue}>{awayValue}</Text>
      <Text style={styles.comparisonCategory}>{category}</Text>
      <Text style={styles.comparisonValue}>{homeValue}</Text>
    </View>
  );
}

/**
 * Player stat line component
 */
function StatLine({
  playerName,
  position,
  statLine,
}: {
  playerName: string;
  position: string;
  statLine: string;
}): React.JSX.Element {
  return (
    <View style={styles.statLineRow}>
      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{playerName}</Text>
        <Text style={styles.playerPosition}>{position}</Text>
      </View>
      <Text style={styles.statLineText}>{statLine}</Text>
    </View>
  );
}

/**
 * Section header component
 */
function SectionHeader({ title }: { title: string }): React.JSX.Element {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

export function BoxScoreModal({
  visible,
  boxScore,
  onClose,
}: BoxScoreModalProps): React.JSX.Element {
  if (!boxScore) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.container} accessibilityLabel="Box score modal">
          <View style={styles.header}>
            <Text style={styles.headerTitle} accessibilityRole="header">
              Box Score
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="Close box score"
              accessibilityRole="button"
              hitSlop={accessibility.hitSlop}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Box score not available</Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  const homeWon = boxScore.homeTeam.score > boxScore.awayTeam.score;
  const awayWon = boxScore.awayTeam.score > boxScore.homeTeam.score;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container} accessibilityLabel="Box score modal">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle} accessibilityRole="header">
            Box Score
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityLabel="Close box score"
            accessibilityRole="button"
            hitSlop={accessibility.hitSlop}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Final Score */}
          <View style={styles.scoreCard}>
            <Text style={styles.finalLabel}>FINAL</Text>
            <View style={styles.scoreRow}>
              <View style={styles.scoreTeam}>
                <Text style={[styles.scoreAbbr, awayWon && styles.winnerText]}>
                  {boxScore.awayTeam.abbreviation}
                </Text>
                <Text style={styles.scoreTeamName}>{boxScore.awayTeam.name}</Text>
              </View>
              <Text style={[styles.bigScore, awayWon && styles.winnerText]}>
                {boxScore.awayTeam.score}
              </Text>
              <Text style={styles.scoreSeparator}>-</Text>
              <Text style={[styles.bigScore, homeWon && styles.winnerText]}>
                {boxScore.homeTeam.score}
              </Text>
              <View style={styles.scoreTeam}>
                <Text style={[styles.scoreAbbr, homeWon && styles.winnerText]}>
                  {boxScore.homeTeam.abbreviation}
                </Text>
                <Text style={styles.scoreTeamName}>{boxScore.homeTeam.name}</Text>
              </View>
            </View>
          </View>

          {/* Quarter by Quarter */}
          <View style={styles.card}>
            <View style={styles.quarterHeader}>
              <View style={styles.teamInfo} />
              <Text style={styles.quarterLabel}>1</Text>
              <Text style={styles.quarterLabel}>2</Text>
              <Text style={styles.quarterLabel}>3</Text>
              <Text style={styles.quarterLabel}>4</Text>
              <Text style={styles.quarterLabelTotal}>T</Text>
            </View>
            <QuarterScoreRow
              teamAbbr={boxScore.awayTeam.abbreviation}
              teamName={boxScore.awayTeam.name}
              scoreByQuarter={boxScore.awayTeam.scoreByQuarter}
              totalScore={boxScore.awayTeam.score}
              isWinner={awayWon}
            />
            <QuarterScoreRow
              teamAbbr={boxScore.homeTeam.abbreviation}
              teamName={boxScore.homeTeam.name}
              scoreByQuarter={boxScore.homeTeam.scoreByQuarter}
              totalScore={boxScore.homeTeam.score}
              isWinner={homeWon}
            />
          </View>

          {/* Team Comparison */}
          <SectionHeader title="Team Stats" />
          <View style={styles.card}>
            <View style={styles.comparisonHeader}>
              <Text style={styles.comparisonTeamAbbr}>{boxScore.awayTeam.abbreviation}</Text>
              <Text style={styles.comparisonHeaderText}>STAT</Text>
              <Text style={styles.comparisonTeamAbbr}>{boxScore.homeTeam.abbreviation}</Text>
            </View>
            {boxScore.teamComparison.map((comp, idx) => (
              <ComparisonRow
                key={idx}
                category={comp.category}
                homeValue={comp.home}
                awayValue={comp.away}
              />
            ))}
          </View>

          {/* Passing Leaders */}
          {boxScore.passingLeaders.length > 0 && (
            <>
              <SectionHeader title="Passing Leaders" />
              <View style={styles.card}>
                {boxScore.passingLeaders.map((leader, idx) => (
                  <StatLine
                    key={idx}
                    playerName={leader.playerName}
                    position={leader.position}
                    statLine={leader.statLine}
                  />
                ))}
              </View>
            </>
          )}

          {/* Rushing Leaders */}
          {boxScore.rushingLeaders.length > 0 && (
            <>
              <SectionHeader title="Rushing Leaders" />
              <View style={styles.card}>
                {boxScore.rushingLeaders.map((leader, idx) => (
                  <StatLine
                    key={idx}
                    playerName={leader.playerName}
                    position={leader.position}
                    statLine={leader.statLine}
                  />
                ))}
              </View>
            </>
          )}

          {/* Receiving Leaders */}
          {boxScore.receivingLeaders.length > 0 && (
            <>
              <SectionHeader title="Receiving Leaders" />
              <View style={styles.card}>
                {boxScore.receivingLeaders.map((leader, idx) => (
                  <StatLine
                    key={idx}
                    playerName={leader.playerName}
                    position={leader.position}
                    statLine={leader.statLine}
                  />
                ))}
              </View>
            </>
          )}

          {/* Defensive Leaders */}
          {boxScore.defensiveLeaders.length > 0 && (
            <>
              <SectionHeader title="Defensive Leaders" />
              <View style={styles.card}>
                {boxScore.defensiveLeaders.map((leader, idx) => (
                  <StatLine
                    key={idx}
                    playerName={leader.playerName}
                    position={leader.position}
                    statLine={leader.statLine}
                  />
                ))}
              </View>
            </>
          )}

          {/* Scoring Summary */}
          {boxScore.scoringSummary.length > 0 && (
            <>
              <SectionHeader title="Scoring Summary" />
              <View style={styles.card}>
                {boxScore.scoringSummary.map((play, idx) => (
                  <View key={idx} style={styles.scoringPlay}>
                    <View style={styles.scoringPlayHeader}>
                      <Text style={styles.scoringQuarter}>Q{play.quarter}</Text>
                      <Text style={styles.scoringTime}>{play.time}</Text>
                      <Text style={styles.scoringTeam}>{play.team}</Text>
                    </View>
                    <Text style={styles.scoringDescription}>{play.description}</Text>
                    <Text style={styles.scoringResult}>
                      {play.awayScore} - {play.homeScore}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeButtonText: {
    fontSize: fontSize.md,
    color: colors.textOnPrimary,
    fontWeight: fontWeight.medium,
  },
  scrollContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
  scoreCard: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    alignItems: 'center',
  },
  finalLabel: {
    fontSize: fontSize.sm,
    color: colors.textOnPrimary,
    opacity: 0.7,
    marginBottom: spacing.xs,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  scoreTeam: {
    alignItems: 'center',
    width: 60,
  },
  scoreAbbr: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  scoreTeamName: {
    fontSize: fontSize.xs,
    color: colors.textOnPrimary,
    opacity: 0.8,
  },
  bigScore: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  scoreSeparator: {
    fontSize: fontSize.xxl,
    color: colors.textOnPrimary,
    opacity: 0.5,
  },
  winnerText: {
    color: colors.success,
  },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  quarterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  quarterLabel: {
    width: 30,
    textAlign: 'center',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  quarterLabelTotal: {
    width: 40,
    textAlign: 'center',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  quarterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  teamInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  teamAbbr: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    width: 36,
  },
  teamNameSmall: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  quarterScore: {
    width: 30,
    textAlign: 'center',
    fontSize: fontSize.md,
    color: colors.text,
  },
  totalScore: {
    width: 40,
    textAlign: 'center',
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textTransform: 'uppercase',
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  comparisonTeamAbbr: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    width: 80,
    textAlign: 'center',
  },
  comparisonHeaderText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    flex: 1,
    textAlign: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  comparisonValue: {
    fontSize: fontSize.md,
    color: colors.text,
    width: 80,
    textAlign: 'center',
  },
  comparisonCategory: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
    textAlign: 'center',
  },
  statLineRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xxs,
  },
  playerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  playerPosition: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statLineText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  scoringPlay: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scoringPlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xxs,
  },
  scoringQuarter: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  scoringTime: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  scoringTeam: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  scoringDescription: {
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  scoringResult: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});

export default BoxScoreModal;
