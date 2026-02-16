/**
 * DraftReportCardScreen
 * Post-draft report card screen showing grades, pick analysis,
 * expert reactions, and league-wide rankings.
 * This is a reward screen players earn after completing the draft.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import {
  DraftLetterGrade,
  TeamDraftGrade,
  PickGrade,
  ExpertReaction,
} from '../core/draft/DraftDayNarrator';
import { getGradeColor, getGradeLabel } from '../utils/draftGradeUtils';

export interface DraftReportCardScreenProps {
  userTeamGrade: TeamDraftGrade;
  userTeamName: string;
  expertReactions: ExpertReaction[];
  leagueGrades: Array<{
    teamId: string;
    teamName: string;
    grade: DraftLetterGrade;
    score: number;
  }>;
  onContinue: () => void;
  onBack?: () => void;
}

/**
 * Returns a background color for the hero card based on grade letter
 */
function getHeroBackground(grade: DraftLetterGrade): string {
  if (grade.startsWith('A')) return colors.success;
  if (grade.startsWith('B')) return colors.info;
  if (grade.startsWith('C')) return colors.warning;
  return colors.error;
}

/**
 * Returns a sentiment icon name
 */
function getSentimentIcon(
  sentiment: 'positive' | 'neutral' | 'negative'
): 'thumbs-up' | 'thumbs-down' | 'remove-circle-outline' {
  switch (sentiment) {
    case 'positive':
      return 'thumbs-up';
    case 'negative':
      return 'thumbs-down';
    default:
      return 'remove-circle-outline';
  }
}

/**
 * Hero grade card at the top
 */
function HeroGradeCard({ grade, teamName }: { grade: TeamDraftGrade; teamName: string }) {
  const heroBg = getHeroBackground(grade.grade);

  return (
    <View style={[styles.heroCard, { backgroundColor: heroBg }]}>
      <Text style={styles.heroTeamName}>{teamName} Draft Report Card</Text>
      <View style={styles.heroGradeCircle}>
        <Text style={styles.heroGrade}>{grade.grade}</Text>
      </View>
      <Text style={styles.heroLabel}>{getGradeLabel(grade.grade)}</Text>
      <Text style={styles.heroScore}>Score: {grade.score}/100</Text>
      <Text style={styles.heroSummary}>{grade.summary}</Text>

      {grade.strengths.length > 0 && (
        <View style={styles.heroBulletSection}>
          <Text style={styles.heroBulletHeader}>Strengths</Text>
          {grade.strengths.map((s, i) => (
            <View key={`str-${i}`} style={styles.heroBulletRow}>
              <Ionicons name="checkmark-circle" size={14} color={colors.textOnPrimary} />
              <Text style={styles.heroBulletText}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      {grade.weaknesses.length > 0 && (
        <View style={styles.heroBulletSection}>
          <Text style={styles.heroBulletHeader}>Weaknesses</Text>
          {grade.weaknesses.map((w, i) => (
            <View key={`wk-${i}`} style={styles.heroBulletRow}>
              <Ionicons name="alert-circle" size={14} color={'rgba(255,255,255,0.7)'} />
              <Text style={styles.heroBulletText}>{w}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Individual pick card
 */
function PickCard({ pick }: { pick: PickGrade }) {
  const gradeColor = getGradeColor(pick.grade);
  const isSteal = pick.actualPick > pick.projectedPick;
  const isReach = pick.actualPick < pick.projectedPick;

  return (
    <View style={styles.pickCard}>
      <View style={styles.pickCardHeader}>
        <View style={styles.pickCardPickInfo}>
          <Text style={styles.pickCardNumber}>Pick #{pick.actualPick}</Text>
          <Text style={styles.pickCardRound}>Round {pick.round}</Text>
        </View>
        <View style={[styles.pickGradeBadge, { backgroundColor: gradeColor + '20' }]}>
          <Text style={[styles.pickGradeText, { color: gradeColor }]}>{pick.grade}</Text>
        </View>
      </View>

      <View style={styles.pickCardBody}>
        <Text style={styles.pickCardName}>{pick.prospectName}</Text>
        <Text style={styles.pickCardPosition}>{pick.prospectPosition}</Text>
      </View>

      <View style={styles.pickCardProjection}>
        <Ionicons
          name={isSteal ? 'trending-up' : isReach ? 'trending-down' : 'remove'}
          size={14}
          color={isSteal ? colors.success : isReach ? colors.error : colors.textLight}
        />
        <Text style={styles.pickCardProjectionText}>
          Projected #{pick.projectedPick}, Picked #{pick.actualPick}
        </Text>
      </View>

      <Text style={styles.pickCardAssessment}>{pick.assessment}</Text>
    </View>
  );
}

/**
 * Expert reaction quote card
 */
function ExpertQuoteCard({ reaction }: { reaction: ExpertReaction }) {
  const gradeColor = getGradeColor(reaction.gradeGiven);

  return (
    <View style={styles.expertCard}>
      <View style={styles.expertCardHeader}>
        <View style={styles.expertIdentity}>
          <Ionicons
            name={getSentimentIcon(reaction.sentiment)}
            size={16}
            color={
              reaction.sentiment === 'positive'
                ? colors.success
                : reaction.sentiment === 'negative'
                  ? colors.error
                  : colors.textLight
            }
          />
          <View>
            <Text style={styles.expertName}>{reaction.expertName}</Text>
            <Text style={styles.expertOutlet}>{reaction.outlet}</Text>
          </View>
        </View>
        <View style={[styles.expertGradeBadge, { backgroundColor: gradeColor + '20' }]}>
          <Text style={[styles.expertGradeText, { color: gradeColor }]}>{reaction.gradeGiven}</Text>
        </View>
      </View>
      <Text style={styles.expertQuote}>"{reaction.quote}"</Text>
    </View>
  );
}

/**
 * League-wide grade row
 */
function LeagueGradeRow({
  team,
  rank,
  isUser,
}: {
  team: { teamId: string; teamName: string; grade: DraftLetterGrade; score: number };
  rank: number;
  isUser: boolean;
}) {
  const gradeColor = getGradeColor(team.grade);

  return (
    <View style={[styles.leagueRow, isUser && styles.leagueRowHighlight]}>
      <Text style={[styles.leagueRank, isUser && styles.leagueTextHighlight]}>#{rank}</Text>
      <Text style={[styles.leagueTeamName, isUser && styles.leagueTextHighlight]} numberOfLines={1}>
        {team.teamName}
      </Text>
      <View style={[styles.leagueGradeBadge, { backgroundColor: gradeColor + '20' }]}>
        <Text style={[styles.leagueGradeText, { color: gradeColor }]}>{team.grade}</Text>
      </View>
      <Text style={[styles.leagueScore, isUser && styles.leagueTextHighlight]}>{team.score}</Text>
    </View>
  );
}

/**
 * DraftReportCardScreen Component
 */
export function DraftReportCardScreen({
  userTeamGrade,
  userTeamName,
  expertReactions,
  leagueGrades,
  onContinue,
  onBack,
}: DraftReportCardScreenProps): React.JSX.Element {
  const sortedLeague = [...leagueGrades].sort((a, b) => b.score - a.score);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Draft Report Card" onBack={onBack} testID="draft-report-card-header" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Grade Card */}
        <HeroGradeCard grade={userTeamGrade} teamName={userTeamName} />

        {/* Pick-by-Pick Analysis */}
        {userTeamGrade.picks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Pick-by-Pick Analysis</Text>
            </View>
            {userTeamGrade.picks.map((pick) => (
              <PickCard key={`pick-${pick.pickNumber}`} pick={pick} />
            ))}
          </View>
        )}

        {/* Expert Reactions */}
        {expertReactions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubbles" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Expert Reactions</Text>
            </View>
            {expertReactions.map((reaction, idx) => (
              <ExpertQuoteCard key={`expert-${idx}`} reaction={reaction} />
            ))}
          </View>
        )}

        {/* League-Wide Grades */}
        {sortedLeague.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trophy" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>League-Wide Draft Grades</Text>
            </View>
            <View style={styles.leagueTable}>
              <View style={styles.leagueTableHeader}>
                <Text style={[styles.leagueHeaderText, { width: 32 }]}>#</Text>
                <Text style={[styles.leagueHeaderText, { flex: 1 }]}>Team</Text>
                <Text style={[styles.leagueHeaderText, { width: 50, textAlign: 'center' }]}>
                  Grade
                </Text>
                <Text style={[styles.leagueHeaderText, { width: 36, textAlign: 'right' }]}>
                  Pts
                </Text>
              </View>
              {sortedLeague.map((team, idx) => (
                <LeagueGradeRow
                  key={team.teamId}
                  team={team}
                  rank={idx + 1}
                  isUser={team.teamId === userTeamGrade.teamId}
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.continueContainer}>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={onContinue}
          accessibilityLabel="Continue to UDFA"
          accessibilityRole="button"
          hitSlop={accessibility.hitSlop}
        >
          <Text style={styles.continueBtnText}>Continue to UDFA</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.textOnPrimary} />
        </TouchableOpacity>
      </View>
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

  // Hero Card
  heroCard: {
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.lg,
  },
  heroTeamName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  heroGradeCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroGrade: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  heroLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
    marginBottom: spacing.xxs,
  },
  heroScore: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    fontVariant: ['tabular-nums'],
    marginBottom: spacing.md,
  },
  heroSummary: {
    fontSize: fontSize.md,
    color: colors.textOnPrimary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  heroBulletSection: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
  heroBulletHeader: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroBulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  heroBulletText: {
    fontSize: fontSize.sm,
    color: colors.textOnPrimary,
    flex: 1,
  },

  // Sections
  section: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  // Pick Card
  pickCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  pickCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pickCardPickInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pickCardNumber: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    fontVariant: ['tabular-nums'],
  },
  pickCardRound: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  pickGradeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minWidth: 44,
    alignItems: 'center',
  },
  pickGradeText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  pickCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  pickCardName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  pickCardPosition: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  pickCardProjection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  pickCardProjectionText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  pickCardAssessment: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // Expert Card
  expertCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    ...shadows.sm,
  },
  expertCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  expertIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  expertName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  expertOutlet: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  expertGradeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    minWidth: 36,
    alignItems: 'center',
  },
  expertGradeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  expertQuote: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // League Table
  leagueTable: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  leagueTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryDark,
  },
  leagueHeaderText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  leagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    minHeight: accessibility.minTouchTarget,
  },
  leagueRowHighlight: {
    backgroundColor: colors.primary + '12',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  leagueRank: {
    width: 32,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    fontVariant: ['tabular-nums'],
  },
  leagueTeamName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  leagueTextHighlight: {
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  leagueGradeBadge: {
    width: 40,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  leagueGradeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  leagueScore: {
    width: 36,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },

  // Continue Button
  continueContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
  continueBtn: {
    flexDirection: 'row',
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: accessibility.minTouchTarget,
  },
  continueBtnText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
    letterSpacing: 0.5,
  },

  bottomSpacer: {
    height: spacing.xl,
  },
});

export default DraftReportCardScreen;
