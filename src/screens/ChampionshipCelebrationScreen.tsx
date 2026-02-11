/**
 * ChampionshipCelebrationScreen
 * Emotional payoff screen shown after winning the Super Bowl
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  accessibility,
} from '../styles';
import { ScreenHeader } from '../components';

interface ChampionshipCelebrationScreenProps {
  teamName: string;
  teamAbbreviation: string;
  seasonYear: number;
  record: { wins: number; losses: number; ties: number };
  playoffRecord: { wins: number; losses: number };
  superBowlScore: { userScore: number; opponentScore: number; opponentName: string };
  mvp: { name: string; position: string; keyStats: string };
  gmGrade: string;
  dynastyPoints?: number;
  onContinue: () => void;
}

const GOLD = '#FFD700';
const DARK_GOLD = '#B8860B';

function getGradeColor(grade: string): string {
  if (grade.startsWith('A')) return colors.success;
  if (grade.startsWith('B')) return colors.info;
  if (grade.startsWith('C')) return colors.warning;
  return colors.error;
}

function getGradeDescription(grade: string): string {
  switch (grade) {
    case 'A+':
      return 'A historic season. One for the ages.';
    case 'A':
      return 'An outstanding job from start to finish.';
    case 'A-':
      return 'Excellent management throughout the year.';
    case 'B+':
      return 'A very strong season with room to grow.';
    case 'B':
      return 'Solid performance across the board.';
    case 'B-':
      return 'Good results with some areas to improve.';
    default:
      return 'A championship season to remember.';
  }
}

export function ChampionshipCelebrationScreen({
  teamName,
  teamAbbreviation,
  seasonYear,
  record,
  playoffRecord,
  superBowlScore,
  mvp,
  gmGrade,
  dynastyPoints,
  onContinue,
}: ChampionshipCelebrationScreenProps): React.JSX.Element {
  const recordString = `${record.wins}-${record.losses}${record.ties > 0 ? `-${record.ties}` : ''}`;
  const playoffString = `${playoffRecord.wins}-${playoffRecord.losses}`;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Champions" testID="championship-celebration-header" />

      <ScrollView style={styles.content}>
        {/* Trophy / Celebration Header */}
        <View style={styles.celebrationHeader}>
          <Text style={styles.trophyText} accessibilityLabel="Championship trophy">
            [TROPHY]
          </Text>
          <Text style={styles.championsTitle}>SUPER BOWL CHAMPIONS</Text>
          <Text style={styles.teamName}>{teamName}</Text>
          <Text style={styles.seasonYear}>{seasonYear} Season</Text>
        </View>

        {/* Super Bowl Score Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Super Bowl</Text>
          <View style={styles.scoreCard}>
            <View style={styles.scoreTeam}>
              <Text style={styles.scoreAbbr}>{teamAbbreviation}</Text>
              <Text style={styles.scoreValue}>{superBowlScore.userScore}</Text>
            </View>
            <View style={styles.scoreDivider}>
              <Text style={styles.scoreVs}>FINAL</Text>
            </View>
            <View style={styles.scoreTeam}>
              <Text style={styles.scoreAbbr}>{superBowlScore.opponentName}</Text>
              <Text style={styles.scoreValue}>{superBowlScore.opponentScore}</Text>
            </View>
          </View>
        </View>

        {/* MVP Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Super Bowl MVP</Text>
          <View style={styles.mvpCard}>
            <View style={styles.mvpBadge}>
              <Text style={styles.mvpBadgeText}>MVP</Text>
            </View>
            <Text style={styles.mvpName}>{mvp.name}</Text>
            <Text style={styles.mvpPosition}>{mvp.position}</Text>
            <Text style={styles.mvpStats}>{mvp.keyStats}</Text>
          </View>
        </View>

        {/* Season Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Season Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{recordString}</Text>
              <Text style={styles.summaryLabel}>Regular Season</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{playoffString}</Text>
              <Text style={styles.summaryLabel}>Playoffs</Text>
            </View>
          </View>
        </View>

        {/* GM Grade Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GM Grade</Text>
          <View style={styles.gradeCard}>
            <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(gmGrade) }]}>
              <Text style={styles.gradeText}>{gmGrade}</Text>
            </View>
            <Text style={styles.gradeDescription}>{getGradeDescription(gmGrade)}</Text>
          </View>
        </View>

        {/* Dynasty Points */}
        {dynastyPoints !== undefined && dynastyPoints > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dynasty Progress</Text>
            <View style={styles.dynastyCard}>
              <Text style={styles.dynastyValue}>+{dynastyPoints}</Text>
              <Text style={styles.dynastyLabel}>Dynasty Points Earned</Text>
            </View>
          </View>
        )}

        {/* Continue CTA */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={onContinue}
            accessibilityLabel="Continue to offseason"
            accessibilityRole="button"
            hitSlop={accessibility.hitSlop}
          >
            <Text style={styles.continueButtonText}>Continue to Offseason</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  celebrationHeader: {
    backgroundColor: DARK_GOLD,
    padding: spacing.xl,
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  trophyText: {
    fontSize: fontSize.display,
    color: GOLD,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.md,
  },
  championsTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: GOLD,
    letterSpacing: 2,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  teamName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
    marginBottom: spacing.xs,
  },
  seasonYear: {
    fontSize: fontSize.md,
    color: colors.textOnPrimary,
    opacity: 0.9,
  },
  section: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  scoreCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: GOLD + '40',
    ...shadows.md,
  },
  scoreTeam: {
    flex: 1,
    alignItems: 'center',
  },
  scoreAbbr: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  scoreValue: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  scoreDivider: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  scoreVs: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textLight,
  },
  mvpCard: {
    backgroundColor: GOLD + '15',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GOLD + '40',
  },
  mvpBadge: {
    backgroundColor: GOLD,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  mvpBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: DARK_GOLD,
  },
  mvpName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  mvpPosition: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  mvpStats: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  gradeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  gradeBadge: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  gradeText: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  gradeDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  dynastyCard: {
    backgroundColor: GOLD + '15',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GOLD + '40',
  },
  dynastyValue: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: DARK_GOLD,
    marginBottom: spacing.xs,
  },
  dynastyLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  ctaSection: {
    padding: spacing.xl,
  },
  continueButton: {
    minHeight: accessibility.minTouchTarget,
    backgroundColor: DARK_GOLD,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  continueButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
});

export default ChampionshipCelebrationScreen;
