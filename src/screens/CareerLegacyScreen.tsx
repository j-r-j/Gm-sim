/**
 * CareerLegacyScreen
 * Displays comprehensive career legacy, Hall of Fame status, and achievements
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles';
import { ScreenHeader } from '../components';
import { GameState } from '../core/models/game/GameState';
import {
  CareerRecord,
  TeamTenure,
  AchievementRecord,
  getReputationTier,
  getReputationTierDescription,
} from '../core/career/CareerRecordTracker';
import {
  LegacyTier,
  HallOfFameStatus,
  CareerHighlight,
  CareerSummary,
  getLegacyTierDisplayName,
  getHallOfFameStatusDisplay,
  calculateLegacyScore,
} from '../core/career/RetirementSystem';

/**
 * Props for CareerLegacyScreen
 */
export interface CareerLegacyScreenProps {
  gameState: GameState;
  careerRecord: CareerRecord;
  careerSummary?: CareerSummary;
  onBack: () => void;
  onRetire?: () => void;
}

/**
 * Gets color for legacy tier
 */
function getLegacyColor(tier: LegacyTier): string {
  switch (tier) {
    case 'hall_of_fame':
      return '#FFD700'; // Gold
    case 'legendary':
      return colors.success;
    case 'excellent':
      return colors.primary;
    case 'good':
      return '#4CAF50';
    case 'average':
      return colors.warning;
    case 'forgettable':
      return colors.textSecondary;
    case 'poor':
      return colors.error;
  }
}

/**
 * Gets color for Hall of Fame status
 */
function getHofColor(status: HallOfFameStatus): string {
  switch (status) {
    case 'first_ballot':
      return '#FFD700';
    case 'eventual':
      return colors.success;
    case 'borderline':
      return colors.warning;
    case 'unlikely':
      return colors.textSecondary;
    case 'no':
      return colors.error;
  }
}

/**
 * Gets legacy tier from score
 */
function getLegacyTierFromScore(score: number): LegacyTier {
  if (score >= 90) return 'hall_of_fame';
  if (score >= 75) return 'legendary';
  if (score >= 60) return 'excellent';
  if (score >= 45) return 'good';
  if (score >= 30) return 'average';
  if (score >= 15) return 'forgettable';
  return 'poor';
}

/**
 * Calculates Hall of Fame status from record
 */
function calculateHofStatus(record: CareerRecord, legacyScore: number): HallOfFameStatus {
  if (legacyScore >= 90 && record.championships >= 2) return 'first_ballot';
  if (legacyScore >= 80 || (record.championships >= 1 && record.careerWinPercentage >= 0.55))
    return 'eventual';
  if (legacyScore >= 65 || record.championships >= 1) return 'borderline';
  if (legacyScore >= 50) return 'unlikely';
  return 'no';
}

/**
 * Team Tenure Card Component
 */
function TenureCard({ tenure }: { tenure: TeamTenure }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.tenureCard}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.tenureHeader}>
        <Text style={styles.tenureTeam}>{tenure.teamName}</Text>
        <Text style={styles.tenureYears}>
          {tenure.startYear}-{tenure.endYear || 'Present'}
        </Text>
      </View>

      <View style={styles.tenureStats}>
        <Text style={styles.tenureStat}>
          {tenure.totalWins}-{tenure.totalLosses}
          {tenure.totalTies > 0 ? `-${tenure.totalTies}` : ''} ({tenure.seasons} seasons)
        </Text>
        <Text style={styles.tenureWinPct}>{Math.round(tenure.winPercentage * 100)}% Win Rate</Text>
      </View>

      {expanded && (
        <View style={styles.tenureDetails}>
          {tenure.championships > 0 && (
            <Text style={styles.tenureAchievement}>
              {tenure.championships} Championship{tenure.championships !== 1 ? 's' : ''}
            </Text>
          )}
          {tenure.conferenceChampionships > 0 && (
            <Text style={styles.tenureAchievement}>
              {tenure.conferenceChampionships} Conference Title
              {tenure.conferenceChampionships !== 1 ? 's' : ''}
            </Text>
          )}
          {tenure.divisionTitles > 0 && (
            <Text style={styles.tenureAchievement}>
              {tenure.divisionTitles} Division Title{tenure.divisionTitles !== 1 ? 's' : ''}
            </Text>
          )}
          {tenure.playoffAppearances > 0 && (
            <Text style={styles.tenureAchievement}>
              {tenure.playoffAppearances} Playoff Appearance
              {tenure.playoffAppearances !== 1 ? 's' : ''}
            </Text>
          )}
          <View style={styles.departureInfo}>
            <Text style={styles.departureText}>
              Departed:{' '}
              {tenure.reasonForDeparture === 'current' ? 'Still Active' : tenure.reasonForDeparture}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

/**
 * Achievement Card Component
 */
function AchievementCard({ achievement }: { achievement: AchievementRecord }): React.JSX.Element {
  const getAchievementIcon = (type: string): string => {
    switch (type) {
      case 'championship':
        return '🏆';
      case 'conferenceChampionship':
        return '🏅';
      case 'divisionTitle':
        return '🎖️';
      case 'coachOfYear':
      case 'executiveOfYear':
        return '⭐';
      case 'perfectSeason':
        return '💯';
      case 'worstToFirst':
        return '📈';
      case 'dynastyBuilder':
        return '👑';
      default:
        return '🎯';
    }
  };

  return (
    <View style={styles.achievementCard}>
      <Text style={styles.achievementIcon}>{getAchievementIcon(achievement.type)}</Text>
      <View style={styles.achievementContent}>
        <Text style={styles.achievementDesc}>{achievement.description}</Text>
        <Text style={styles.achievementYear}>{achievement.year}</Text>
      </View>
    </View>
  );
}

/**
 * Highlight Card Component
 */
function HighlightCard({ highlight }: { highlight: CareerHighlight }): React.JSX.Element {
  const significanceColors = {
    major: colors.success,
    notable: colors.primary,
    minor: colors.textSecondary,
  };

  return (
    <View style={styles.highlightCard}>
      <View
        style={[
          styles.highlightBadge,
          { backgroundColor: significanceColors[highlight.significance] + '20' },
        ]}
      >
        <Text
          style={[styles.highlightBadgeText, { color: significanceColors[highlight.significance] }]}
        >
          {highlight.significance.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.highlightDesc}>{highlight.description}</Text>
      {highlight.year > 0 && (
        <Text style={styles.highlightMeta}>
          {highlight.teamName} • {highlight.year}
        </Text>
      )}
    </View>
  );
}

/**
 * Career Legacy Screen Component
 */
export function CareerLegacyScreen({
  careerRecord,
  careerSummary,
  onBack,
  onRetire,
}: CareerLegacyScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'history' | 'highlights'>(
    'overview'
  );

  // Calculate legacy metrics
  const legacyScore = calculateLegacyScore(careerRecord);
  const legacyTier = getLegacyTierFromScore(legacyScore);
  const hofStatus = calculateHofStatus(careerRecord, legacyScore);
  const reputationTier = getReputationTier(careerRecord.reputationScore);

  // Generate highlights if not provided
  const highlights: CareerHighlight[] = careerSummary?.highlights || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Career Legacy" onBack={onBack} testID="career-legacy-header" />

      {/* GM Info */}
      <View style={styles.gmInfo}>
        <Text style={styles.gmName}>{careerRecord.gmName}</Text>
        <Text style={styles.gmSubtitle}>
          {careerRecord.totalSeasons} Season{careerRecord.totalSeasons !== 1 ? 's' : ''} •{' '}
          {careerRecord.teamsWorkedFor.length} Team
          {careerRecord.teamsWorkedFor.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>Stats</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            History
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'highlights' && styles.tabActive]}
          onPress={() => setActiveTab('highlights')}
        >
          <Text style={[styles.tabText, activeTab === 'highlights' && styles.tabTextActive]}>
            Highlights
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <View style={styles.section}>
            {/* Legacy Tier */}
            <View style={[styles.legacyCard, { borderColor: getLegacyColor(legacyTier) }]}>
              <Text style={[styles.legacyTier, { color: getLegacyColor(legacyTier) }]}>
                {getLegacyTierDisplayName(legacyTier)}
              </Text>
              <Text style={styles.legacyScore}>Legacy Score: {legacyScore}/100</Text>
            </View>

            {/* Hall of Fame Status */}
            <View style={styles.hofCard}>
              <Text style={styles.hofLabel}>Hall of Fame</Text>
              <Text style={[styles.hofStatus, { color: getHofColor(hofStatus) }]}>
                {getHallOfFameStatusDisplay(hofStatus)}
              </Text>
              {hofStatus !== 'no' && (
                <View style={styles.hofReasons}>
                  {careerRecord.championships > 0 && (
                    <Text style={styles.hofReason}>
                      • {careerRecord.championships} Championship
                      {careerRecord.championships !== 1 ? 's' : ''}
                    </Text>
                  )}
                  {careerRecord.careerWinPercentage >= 0.55 && (
                    <Text style={styles.hofReason}>
                      • {Math.round(careerRecord.careerWinPercentage * 100)}% Career Win Rate
                    </Text>
                  )}
                  {careerRecord.playoffAppearances >= 10 && (
                    <Text style={styles.hofReason}>
                      • {careerRecord.playoffAppearances} Playoff Appearances
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Reputation */}
            <View style={styles.reputationCard}>
              <Text style={styles.reputationLabel}>Current Reputation</Text>
              <Text style={styles.reputationTier}>{reputationTier}</Text>
              <Text style={styles.reputationScore}>{careerRecord.reputationScore}/100</Text>
              <Text style={styles.reputationDesc}>
                {getReputationTierDescription(reputationTier)}
              </Text>
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStats}>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>{careerRecord.championships}</Text>
                <Text style={styles.quickStatLabel}>Championships</Text>
              </View>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>{careerRecord.playoffAppearances}</Text>
                <Text style={styles.quickStatLabel}>Playoffs</Text>
              </View>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>
                  {Math.round(careerRecord.careerWinPercentage * 100)}%
                </Text>
                <Text style={styles.quickStatLabel}>Win Rate</Text>
              </View>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>{careerRecord.timesFired}</Text>
                <Text style={styles.quickStatLabel}>Times Fired</Text>
              </View>
            </View>

            {/* Retire Button */}
            {onRetire && !careerRecord.isRetired && (
              <TouchableOpacity style={styles.retireButton} onPress={onRetire}>
                <Text style={styles.retireButtonText}>Announce Retirement</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <View style={styles.section}>
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Career Record</Text>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Seasons</Text>
                <Text style={styles.statValue}>{careerRecord.totalSeasons}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Record</Text>
                <Text style={styles.statValue}>
                  {careerRecord.totalWins}-{careerRecord.totalLosses}
                  {careerRecord.totalTies > 0 ? `-${careerRecord.totalTies}` : ''}
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Win Percentage</Text>
                <Text style={styles.statValue}>
                  {Math.round(careerRecord.careerWinPercentage * 100)}%
                </Text>
              </View>
            </View>

            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Achievements</Text>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Championships</Text>
                <Text style={styles.statValue}>{careerRecord.championships}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Conference Titles</Text>
                <Text style={styles.statValue}>{careerRecord.conferenceChampionships}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Division Titles</Text>
                <Text style={styles.statValue}>{careerRecord.divisionTitles}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Playoff Appearances</Text>
                <Text style={styles.statValue}>{careerRecord.playoffAppearances}</Text>
              </View>
            </View>

            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Career Status</Text>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Teams Managed</Text>
                <Text style={styles.statValue}>{careerRecord.teamsWorkedFor.length}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Times Fired</Text>
                <Text style={styles.statValue}>{careerRecord.timesFired}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Years Unemployed</Text>
                <Text style={styles.statValue}>{careerRecord.yearsUnemployed}</Text>
              </View>
            </View>
          </View>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team History</Text>
            {careerRecord.teamsWorkedFor.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No team history yet</Text>
              </View>
            ) : (
              careerRecord.teamsWorkedFor.map((tenure, index) => (
                <TenureCard key={`${tenure.teamId}-${index}`} tenure={tenure} />
              ))
            )}

            {careerRecord.achievements.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Achievements</Text>
                {careerRecord.achievements.map((achievement, index) => (
                  <AchievementCard key={`${achievement.type}-${index}`} achievement={achievement} />
                ))}
              </>
            )}
          </View>
        )}

        {/* Highlights Tab */}
        {activeTab === 'highlights' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Career Highlights</Text>
            {highlights.length === 0 && careerRecord.achievements.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No major highlights yet</Text>
                <Text style={styles.emptyStateHint}>
                  Win championships and build dynasties to create memorable moments
                </Text>
              </View>
            ) : (
              <>
                {highlights.map((highlight, index) => (
                  <HighlightCard key={`highlight-${index}`} highlight={highlight} />
                ))}
                {highlights.length === 0 &&
                  careerRecord.achievements.map((achievement, index) => (
                    <HighlightCard
                      key={`achievement-highlight-${index}`}
                      highlight={{
                        type:
                          achievement.type === 'championship'
                            ? 'championship'
                            : achievement.type === 'worstToFirst'
                              ? 'turnaround'
                              : 'longevity',
                        year: achievement.year,
                        teamName: achievement.teamId,
                        description: achievement.description,
                        significance: achievement.type === 'championship' ? 'major' : 'notable',
                      }}
                    />
                  ))}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSpacer: {
    width: 60,
  },
  gmInfo: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    alignItems: 'center',
  },
  gmName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  gmSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 4,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  legacyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
  },
  legacyTier: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  legacyScore: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  hofCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  hofLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  hofStatus: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  hofReasons: {
    marginTop: spacing.sm,
  },
  hofReason: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  reputationCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  reputationLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  reputationTier: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    textTransform: 'capitalize',
  },
  reputationScore: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  reputationDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  quickStatItem: {
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  quickStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 4,
  },
  retireButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  retireButtonText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  statsTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  tenureCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  tenureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  tenureTeam: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  tenureYears: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  tenureStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tenureStat: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  tenureWinPct: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  tenureDetails: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tenureAchievement: {
    fontSize: fontSize.sm,
    color: colors.success,
    marginBottom: 4,
  },
  departureInfo: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  departureText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  achievementIcon: {
    fontSize: 24,
  },
  achievementContent: {
    flex: 1,
  },
  achievementDesc: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  achievementYear: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  highlightCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  highlightBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  highlightBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  highlightDesc: {
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  highlightMeta: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptyStateHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
