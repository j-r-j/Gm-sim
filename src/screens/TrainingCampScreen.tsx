/**
 * TrainingCampScreen
 * Displays position battles, development reveals, camp injuries, and standouts
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, accessibility } from '../styles';
import { ScreenHeader } from '../components';
import { GameState } from '../core/models/game/GameState';
import {
  PositionBattle,
  PositionBattleCompetitor,
  DevelopmentReveal,
  CampInjury,
  TrainingCampSummary,
} from '../core/offseason/phases/TrainingCampPhase';

/**
 * Props for TrainingCampScreen
 */
export interface TrainingCampScreenProps {
  gameState: GameState;
  summary: TrainingCampSummary;
  onBack: () => void;
  onPlayerSelect?: (playerId: string) => void;
}

type TabType = 'overview' | 'battles' | 'development' | 'injuries';

/**
 * Get color for battle status
 */
function getBattleStatusColor(status: PositionBattle['status']): string {
  switch (status) {
    case 'decided':
      return colors.success;
    case 'too_close':
      return colors.warning;
    case 'ongoing':
      return colors.primary;
    default:
      return colors.textSecondary;
  }
}

/**
 * Get color for trend
 */
function getTrendColor(trend: PositionBattleCompetitor['trend']): string {
  switch (trend) {
    case 'rising':
      return colors.success;
    case 'falling':
      return colors.error;
    case 'steady':
      return colors.textSecondary;
    default:
      return colors.textSecondary;
  }
}

/**
 * Get color for practice grade
 */
function getGradeColor(grade: PositionBattleCompetitor['practiceGrade']): string {
  switch (grade) {
    case 'A':
      return colors.success;
    case 'B':
      return colors.primary;
    case 'C':
      return colors.warning;
    case 'D':
      return colors.error;
    case 'F':
      return colors.error;
    default:
      return colors.textSecondary;
  }
}

/**
 * Get color for development impact
 */
function getImpactColor(impact: DevelopmentReveal['impact']): string {
  switch (impact) {
    case 'positive':
      return colors.success;
    case 'negative':
      return colors.error;
    case 'neutral':
      return colors.textSecondary;
    default:
      return colors.textSecondary;
  }
}

/**
 * Get color for injury severity
 */
function getSeverityColor(severity: CampInjury['severity']): string {
  switch (severity) {
    case 'minor':
      return colors.warning;
    case 'moderate':
      return colors.error;
    case 'serious':
      return colors.error;
    case 'season_ending':
      return colors.error;
    default:
      return colors.textSecondary;
  }
}

/**
 * Get trend arrow
 */
function getTrendArrow(trend: PositionBattleCompetitor['trend']): string {
  switch (trend) {
    case 'rising':
      return '↑';
    case 'falling':
      return '↓';
    case 'steady':
      return '→';
    default:
      return '';
  }
}

/**
 * Overview stats card
 */
function OverviewCard({ summary }: { summary: TrainingCampSummary }): React.JSX.Element {
  const decidedBattles = summary.positionBattles.filter((b) => b.status === 'decided').length;
  const ongoingBattles = summary.positionBattles.filter((b) => b.status !== 'decided').length;

  return (
    <View style={styles.overviewCard}>
      <Text style={styles.cardTitle}>Training Camp Summary</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{summary.totalDays}</Text>
          <Text style={styles.statLabel}>Camp Days</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {summary.positionBattles.length}
          </Text>
          <Text style={styles.statLabel}>Position Battles</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.success }]}>{decidedBattles}</Text>
          <Text style={styles.statLabel}>Decided</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.warning }]}>{ongoingBattles}</Text>
          <Text style={styles.statLabel}>Ongoing</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {summary.standouts.length}
          </Text>
          <Text style={styles.statLabel}>Standouts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.error }]}>
            {summary.disappointments.length}
          </Text>
          <Text style={styles.statLabel}>Disappointments</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.warning }]}>
            {summary.injuries.length}
          </Text>
          <Text style={styles.statLabel}>Injuries</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Standouts and disappointments section
 */
function StandoutsSection({ summary }: { summary: TrainingCampSummary }): React.JSX.Element {
  return (
    <View style={styles.standoutsSection}>
      {summary.standouts.length > 0 && (
        <>
          <Text style={styles.subsectionTitle}>Camp Standouts</Text>
          <View style={styles.namesList}>
            {summary.standouts.map((name, i) => (
              <View key={i} style={[styles.nameBadge, { backgroundColor: colors.success + '20' }]}>
                <Text style={[styles.nameText, { color: colors.success }]}>{name}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {summary.disappointments.length > 0 && (
        <>
          <Text style={styles.subsectionTitle}>Disappointments</Text>
          <View style={styles.namesList}>
            {summary.disappointments.map((name, i) => (
              <View key={i} style={[styles.nameBadge, { backgroundColor: colors.error + '20' }]}>
                <Text style={[styles.nameText, { color: colors.error }]}>{name}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {summary.rosterBubblePlayers.length > 0 && (
        <>
          <Text style={styles.subsectionTitle}>Roster Bubble</Text>
          <View style={styles.namesList}>
            {summary.rosterBubblePlayers.map((name, i) => (
              <View key={i} style={[styles.nameBadge, { backgroundColor: colors.warning + '20' }]}>
                <Text style={[styles.nameText, { color: colors.warning }]}>{name}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

/**
 * Position battle card
 */
function BattleCard({
  battle,
  onPlayerPress,
}: {
  battle: PositionBattle;
  onPlayerPress: (playerId: string) => void;
}): React.JSX.Element {
  const sortedCompetitors = [...battle.competitors].sort((a, b) => b.currentScore - a.currentScore);

  return (
    <View style={styles.battleCard}>
      <View style={styles.battleHeader}>
        <View>
          <Text style={styles.battlePosition}>{battle.position}</Text>
          <Text style={styles.battleSpot}>{battle.spotType.toUpperCase()} BATTLE</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getBattleStatusColor(battle.status) + '20' },
          ]}
        >
          <Text style={[styles.statusText, { color: getBattleStatusColor(battle.status) }]}>
            {battle.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.weekText}>Week {battle.campWeek}</Text>

      <View style={styles.competitorsList}>
        {sortedCompetitors.map((competitor, index) => (
          <TouchableOpacity
            key={competitor.playerId}
            style={[
              styles.competitorRow,
              battle.winner === competitor.playerId && styles.winnerRow,
            ]}
            onPress={() => onPlayerPress(competitor.playerId)}
            accessibilityLabel={`${competitor.playerName}, grade ${competitor.practiceGrade}, ${competitor.trend}`}
            accessibilityRole="button"
            hitSlop={accessibility.hitSlop}
          >
            <View style={styles.competitorRank}>
              <Text style={styles.rankNumber}>{index + 1}</Text>
            </View>

            <View style={styles.competitorInfo}>
              <Text style={styles.competitorName}>{competitor.playerName}</Text>
              <View style={styles.competitorMeta}>
                <View
                  style={[
                    styles.gradeBadge,
                    { backgroundColor: getGradeColor(competitor.practiceGrade) + '20' },
                  ]}
                >
                  <Text
                    style={[styles.gradeText, { color: getGradeColor(competitor.practiceGrade) }]}
                  >
                    {competitor.practiceGrade}
                  </Text>
                </View>
                <Text style={[styles.trendText, { color: getTrendColor(competitor.trend) }]}>
                  {getTrendArrow(competitor.trend)} {competitor.trend}
                </Text>
              </View>
            </View>

            <View style={styles.scoreContainer}>
              <Text style={styles.scoreValue}>{competitor.currentScore}</Text>
              <Text style={styles.scoreLabel}>Score</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {battle.winner && (
        <View style={styles.winnerAnnouncement}>
          <Text style={styles.winnerLabel}>Winner:</Text>
          <Text style={styles.winnerName}>
            {battle.competitors.find((c) => c.playerId === battle.winner)?.playerName}
          </Text>
        </View>
      )}

      {battle.updates.length > 0 && (
        <View style={styles.updatesList}>
          {battle.updates.slice(-3).map((update, i) => (
            <Text key={i} style={styles.updateText}>
              • {update}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Development reveal card
 */
function DevelopmentCard({
  reveal,
  onPlayerPress,
}: {
  reveal: DevelopmentReveal;
  onPlayerPress: (playerId: string) => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.developmentCard, { borderColor: getImpactColor(reveal.impact) + '40' }]}
      onPress={() => onPlayerPress(reveal.playerId)}
      accessibilityLabel={`${reveal.playerName}, ${reveal.position}, ${reveal.impact} development`}
      accessibilityRole="button"
      hitSlop={accessibility.hitSlop}
    >
      <View style={styles.developmentHeader}>
        <View>
          <Text style={styles.playerName}>{reveal.playerName}</Text>
          <Text style={styles.playerPosition}>{reveal.position}</Text>
        </View>
        <View
          style={[styles.impactBadge, { backgroundColor: getImpactColor(reveal.impact) + '20' }]}
        >
          <Text style={[styles.impactText, { color: getImpactColor(reveal.impact) }]}>
            {reveal.impact.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.revealTypeRow}>
        <Text style={styles.revealTypeLabel}>Type:</Text>
        <Text style={styles.revealTypeValue}>{reveal.revealType.replace('_', ' ')}</Text>
      </View>

      <Text style={styles.descriptionText}>{reveal.description}</Text>
    </TouchableOpacity>
  );
}

/**
 * Injury card
 */
function InjuryCard({
  injury,
  onPlayerPress,
}: {
  injury: CampInjury;
  onPlayerPress: (playerId: string) => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={styles.injuryCard}
      onPress={() => onPlayerPress(injury.playerId)}
      accessibilityLabel={`${injury.playerName}, ${injury.position}, ${injury.injuryType}, ${injury.severity}`}
      accessibilityRole="button"
      hitSlop={accessibility.hitSlop}
    >
      <View style={styles.injuryHeader}>
        <View>
          <Text style={styles.playerName}>{injury.playerName}</Text>
          <Text style={styles.playerPosition}>{injury.position}</Text>
        </View>
        <View
          style={[
            styles.severityBadge,
            { backgroundColor: getSeverityColor(injury.severity) + '20' },
          ]}
        >
          <Text style={[styles.severityText, { color: getSeverityColor(injury.severity) }]}>
            {injury.severity.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.injuryDetails}>
        <View style={styles.injuryRow}>
          <Text style={styles.injuryLabel}>Injury:</Text>
          <Text style={styles.injuryValue}>{injury.injuryType}</Text>
        </View>
        <View style={styles.injuryRow}>
          <Text style={styles.injuryLabel}>Return:</Text>
          <Text style={styles.injuryValue}>{injury.estimatedReturn}</Text>
        </View>
        <View style={styles.injuryRow}>
          <Text style={styles.injuryLabel}>Practice Status:</Text>
          <Text
            style={[
              styles.injuryValue,
              {
                color:
                  injury.practiceStatus === 'full'
                    ? colors.success
                    : injury.practiceStatus === 'limited'
                      ? colors.warning
                      : colors.error,
              },
            ]}
          >
            {injury.practiceStatus.toUpperCase()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Training Camp Screen Component
 */
export function TrainingCampScreen({
  summary,
  onBack,
  onPlayerSelect,
}: TrainingCampScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const handlePlayerPress = (playerId: string) => {
    onPlayerSelect?.(playerId);
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'battles', label: 'Battles' },
    { key: 'development', label: 'Development' },
    { key: 'injuries', label: 'Injuries' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ScreenHeader title="Training Camp" onBack={onBack} testID="training-camp-header" />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
            accessibilityLabel={`${tab.label}${activeTab === tab.key ? ', selected' : ''}`}
            accessibilityRole="button"
            hitSlop={accessibility.hitSlop}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && (
          <>
            <OverviewCard summary={summary} />
            <StandoutsSection summary={summary} />

            {summary.developmentReveals.filter((r) => r.impact === 'positive').length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Key Developments</Text>
                {summary.developmentReveals
                  .filter((r) => r.impact === 'positive')
                  .slice(0, 3)
                  .map((reveal, i) => (
                    <DevelopmentCard key={i} reveal={reveal} onPlayerPress={handlePlayerPress} />
                  ))}
              </>
            )}

            {summary.developmentReveals.filter((r) => r.impact === 'negative').length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Development Concerns</Text>
                {summary.developmentReveals
                  .filter((r) => r.impact === 'negative')
                  .slice(0, 3)
                  .map((reveal, i) => (
                    <DevelopmentCard
                      key={`neg-${i}`}
                      reveal={reveal}
                      onPlayerPress={handlePlayerPress}
                    />
                  ))}
              </>
            )}
          </>
        )}

        {activeTab === 'battles' && (
          <>
            <Text style={styles.sectionTitle}>Position Battles</Text>
            {summary.positionBattles.length === 0 ? (
              <Text style={styles.emptyText}>No position battles in progress</Text>
            ) : (
              summary.positionBattles.map((battle, i) => (
                <BattleCard key={i} battle={battle} onPlayerPress={handlePlayerPress} />
              ))
            )}
          </>
        )}

        {activeTab === 'development' && (
          <>
            <Text style={styles.sectionTitle}>Development Reveals</Text>
            {summary.developmentReveals.length === 0 ? (
              <Text style={styles.emptyText}>No development reveals yet</Text>
            ) : (
              summary.developmentReveals.map((reveal, i) => (
                <DevelopmentCard key={i} reveal={reveal} onPlayerPress={handlePlayerPress} />
              ))
            )}
          </>
        )}

        {activeTab === 'injuries' && (
          <>
            <Text style={styles.sectionTitle}>Injury Report</Text>
            {summary.injuries.length === 0 ? (
              <Text style={styles.emptyText}>No injuries to report</Text>
            ) : (
              summary.injuries.map((injury, i) => (
                <InjuryCard key={i} injury={injury} onPlayerPress={handlePlayerPress} />
              ))
            )}
          </>
        )}

        <View style={styles.bottomPadding} />
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
  backText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSpacer: {
    width: 60,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  overviewCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  standoutsSection: {
    marginTop: spacing.md,
  },
  subsectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  namesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  nameBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  nameText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  battleCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  battleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  battlePosition: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  battleSpot: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  weekText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  competitorsList: {
    gap: spacing.xs,
  },
  competitorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  winnerRow: {
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: colors.success + '10',
  },
  competitorRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  rankNumber: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  competitorInfo: {
    flex: 1,
  },
  competitorName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  competitorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  gradeBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  gradeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  trendText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textTransform: 'capitalize',
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  scoreLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  winnerAnnouncement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  winnerLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  winnerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  updatesList: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  updateText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  developmentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  developmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
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
  impactBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  impactText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  revealTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  revealTypeLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  revealTypeValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textTransform: 'capitalize',
  },
  descriptionText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontStyle: 'italic',
  },
  injuryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  injuryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  severityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  severityText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  injuryDetails: {
    gap: spacing.xs,
  },
  injuryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  injuryLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    width: 100,
  },
  injuryValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  bottomPadding: {
    height: spacing.xl,
  },
});

export default TrainingCampScreen;
