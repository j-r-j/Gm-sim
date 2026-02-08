/**
 * PostDraftGradeScreen
 * Displays post-draft grades for the user's team and all teams.
 * Shows letter grades, pick-by-pick analysis, strengths/weaknesses.
 */

import React, { useState, useMemo } from 'react';
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
import { TeamDraftGrade, PickGrade, DraftLetterGrade } from '../core/draft/DraftDayNarrator';

/**
 * Props for PostDraftGradeScreen
 */
export interface PostDraftGradeScreenProps {
  /** User's team draft grade */
  userGrade: TeamDraftGrade;
  /** User's team name */
  userTeamName: string;
  /** All team grades for comparison */
  allGrades: { teamId: string; teamName: string; grade: TeamDraftGrade }[];
  /** Draft year */
  draftYear: number;
  /** Callback to go back */
  onBack: () => void;
  /** Callback to view a prospect profile */
  onViewProspect?: (prospectId: string) => void;
}

type TabType = 'your_grade' | 'all_teams';

/**
 * Gets color for a letter grade
 */
function getGradeColor(grade: DraftLetterGrade): string {
  if (grade.startsWith('A')) return colors.success;
  if (grade.startsWith('B')) return colors.info;
  if (grade.startsWith('C')) return colors.warning;
  return colors.error;
}

/**
 * Gets background color for a letter grade
 */
function getGradeBgColor(grade: DraftLetterGrade): string {
  if (grade.startsWith('A')) return colors.success + '15';
  if (grade.startsWith('B')) return colors.info + '15';
  if (grade.startsWith('C')) return colors.warning + '15';
  return colors.error + '15';
}

/**
 * Renders a single pick grade card
 */
function PickGradeCard({ pick }: { pick: PickGrade }): React.JSX.Element {
  const gradeColor = getGradeColor(pick.grade);
  const isSteal = pick.valueScore >= 85;
  const isReach = pick.valueScore < 60;

  return (
    <View style={pickStyles.card}>
      <View style={pickStyles.pickHeader}>
        <View style={pickStyles.pickNumberContainer}>
          <Text style={pickStyles.pickRound}>Rd {pick.round}</Text>
          <Text style={pickStyles.pickNumber}>#{pick.pickNumber}</Text>
        </View>
        <View style={pickStyles.pickInfo}>
          <Text style={pickStyles.prospectName}>{pick.prospectName}</Text>
          <Text style={pickStyles.prospectPosition}>{pick.prospectPosition}</Text>
        </View>
        <View style={[pickStyles.gradeBadge, { backgroundColor: gradeColor + '20' }]}>
          <Text style={[pickStyles.gradeText, { color: gradeColor }]}>{pick.grade}</Text>
        </View>
      </View>
      <View style={pickStyles.pickBody}>
        <View style={pickStyles.projectionRow}>
          <Text style={pickStyles.projectionLabel}>Projected:</Text>
          <Text style={pickStyles.projectionValue}>#{pick.projectedPick}</Text>
          <Text style={pickStyles.projectionLabel}>Actual:</Text>
          <Text style={pickStyles.projectionValue}>#{pick.actualPick}</Text>
          {isSteal && (
            <View style={pickStyles.stealBadge}>
              <Ionicons name="trending-up" size={12} color={colors.success} />
              <Text style={pickStyles.stealText}>STEAL</Text>
            </View>
          )}
          {isReach && (
            <View style={pickStyles.reachBadge}>
              <Ionicons name="trending-down" size={12} color={colors.error} />
              <Text style={pickStyles.reachText}>REACH</Text>
            </View>
          )}
        </View>
        <Text style={pickStyles.assessment}>{pick.assessment}</Text>
      </View>
    </View>
  );
}

/**
 * PostDraftGradeScreen Component
 */
export function PostDraftGradeScreen({
  userGrade,
  userTeamName,
  allGrades,
  draftYear,
  onBack,
}: PostDraftGradeScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('your_grade');

  // Sort all grades by score
  const sortedGrades = useMemo(
    () => [...allGrades].sort((a, b) => b.grade.score - a.grade.score),
    [allGrades]
  );

  // Find user's rank among all teams
  const userRank = useMemo(
    () => sortedGrades.findIndex((g) => g.teamId === userGrade.teamId) + 1,
    [sortedGrades, userGrade.teamId]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={accessibility.hitSlop}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textOnPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole="header">
          {draftYear} Draft Grades
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer} accessibilityRole="tablist">
        <TouchableOpacity
          style={[styles.tab, activeTab === 'your_grade' && styles.tabActive]}
          onPress={() => setActiveTab('your_grade')}
          accessibilityLabel="Your grade"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'your_grade' }}
          hitSlop={accessibility.hitSlop}
        >
          <Text style={[styles.tabText, activeTab === 'your_grade' && styles.tabTextActive]}>
            Your Grade
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all_teams' && styles.tabActive]}
          onPress={() => setActiveTab('all_teams')}
          accessibilityLabel="All teams"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'all_teams' }}
          hitSlop={accessibility.hitSlop}
        >
          <Text style={[styles.tabText, activeTab === 'all_teams' && styles.tabTextActive]}>
            All Teams
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'your_grade' && (
        <ScrollView style={styles.content}>
          {/* Big Grade Card */}
          <View style={[styles.gradeCard, { backgroundColor: getGradeBgColor(userGrade.grade) }]}>
            <Text style={styles.teamName}>{userTeamName}</Text>
            <View style={styles.gradeRow}>
              <Text style={[styles.bigGrade, { color: getGradeColor(userGrade.grade) }]}>
                {userGrade.grade}
              </Text>
              <View style={styles.gradeDetails}>
                <Text style={styles.gradeScore}>{userGrade.score}/100</Text>
                <Text style={styles.gradeRank}>
                  Ranked #{userRank} of {allGrades.length}
                </Text>
              </View>
            </View>
            <Text style={styles.gradeSummary}>{userGrade.summary}</Text>
          </View>

          {/* Strengths & Weaknesses */}
          {(userGrade.strengths.length > 0 || userGrade.weaknesses.length > 0) && (
            <View style={styles.analysisCard}>
              {userGrade.strengths.length > 0 && (
                <View style={styles.analysisSection}>
                  <View style={styles.analysisTitleRow}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    <Text style={styles.analysisTitle}>Strengths</Text>
                  </View>
                  {userGrade.strengths.map((s, i) => (
                    <Text key={i} style={styles.analysisItem}>
                      {s}
                    </Text>
                  ))}
                </View>
              )}
              {userGrade.weaknesses.length > 0 && (
                <View style={styles.analysisSection}>
                  <View style={styles.analysisTitleRow}>
                    <Ionicons name="alert-circle" size={18} color={colors.error} />
                    <Text style={styles.analysisTitle}>Weaknesses</Text>
                  </View>
                  {userGrade.weaknesses.map((w, i) => (
                    <Text key={i} style={styles.analysisItem}>
                      {w}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Best/Worst Picks */}
          {userGrade.bestPick && (
            <View style={styles.highlightCard}>
              <Text style={styles.highlightTitle}>Best Pick</Text>
              <PickGradeCard pick={userGrade.bestPick} />
            </View>
          )}
          {userGrade.worstPick && userGrade.worstPick !== userGrade.bestPick && (
            <View style={styles.highlightCard}>
              <Text style={styles.highlightTitle}>Worst Pick</Text>
              <PickGradeCard pick={userGrade.worstPick} />
            </View>
          )}

          {/* All Picks */}
          <View style={styles.allPicksSection}>
            <Text style={styles.sectionTitle}>Pick-by-Pick Breakdown</Text>
            {userGrade.picks.map((pick, index) => (
              <PickGradeCard key={index} pick={pick} />
            ))}
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      {activeTab === 'all_teams' && (
        <ScrollView style={styles.content}>
          {/* Leaderboard */}
          <View style={styles.leaderboardSection}>
            <Text style={styles.sectionTitle}>Draft Class Rankings</Text>
            {sortedGrades.map((entry, index) => {
              const isUser = entry.teamId === userGrade.teamId;
              return (
                <View
                  key={entry.teamId}
                  style={[styles.leaderboardRow, isUser && styles.leaderboardRowUser]}
                >
                  <View style={styles.leaderboardRank}>
                    <Text
                      style={[styles.leaderboardRankText, isUser && styles.leaderboardRankTextUser]}
                    >
                      #{index + 1}
                    </Text>
                  </View>
                  <View style={styles.leaderboardInfo}>
                    <Text style={[styles.leaderboardTeam, isUser && styles.leaderboardTeamUser]}>
                      {entry.teamName}
                      {isUser ? ' (You)' : ''}
                    </Text>
                    <Text style={styles.leaderboardSummary}>
                      {entry.grade.picks.length} picks | Score: {entry.grade.score}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.leaderboardGradeBadge,
                      { backgroundColor: getGradeColor(entry.grade.grade) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.leaderboardGradeText,
                        { color: getGradeColor(entry.grade.grade) },
                      ]}
                    >
                      {entry.grade.grade}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const pickStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  pickHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickNumberContainer: {
    alignItems: 'center',
    marginRight: spacing.sm,
    minWidth: 40,
  },
  pickRound: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  pickNumber: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  pickInfo: {
    flex: 1,
  },
  prospectName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  prospectPosition: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  gradeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  gradeText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  pickBody: {
    padding: spacing.sm,
  },
  projectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  projectionLabel: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  projectionValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  stealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.success + '15',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: 'auto',
  },
  stealText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  reachBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.error + '15',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: 'auto',
  },
  reachText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.error,
  },
  assessment: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});

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
    ...shadows.md,
  },
  backButton: {
    padding: spacing.xs,
    minHeight: accessibility.minTouchTarget,
    minWidth: accessibility.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  headerSpacer: {
    width: accessibility.minTouchTarget,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    ...shadows.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    minHeight: accessibility.minTouchTarget,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textOnPrimary,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  gradeCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  teamName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  bigGrade: {
    fontSize: 64,
    fontWeight: fontWeight.bold,
  },
  gradeDetails: {
    flex: 1,
  },
  gradeScore: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  gradeRank: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  gradeSummary: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  analysisCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  analysisSection: {
    marginBottom: spacing.md,
  },
  analysisTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  analysisTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  analysisItem: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    paddingLeft: spacing.lg,
    marginBottom: spacing.xs,
  },
  highlightCard: {
    marginBottom: spacing.md,
  },
  highlightTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  allPicksSection: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  leaderboardSection: {
    marginBottom: spacing.md,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  leaderboardRowUser: {
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  leaderboardRank: {
    width: 40,
    alignItems: 'center',
  },
  leaderboardRankText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  leaderboardRankTextUser: {
    color: colors.primary,
  },
  leaderboardInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  leaderboardTeam: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  leaderboardTeamUser: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  leaderboardSummary: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  leaderboardGradeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  leaderboardGradeText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});

export default PostDraftGradeScreen;
