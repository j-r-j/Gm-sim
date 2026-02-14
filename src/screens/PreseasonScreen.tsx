/**
 * PreseasonScreen
 * Displays preseason games, player evaluations, and injury reports
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, accessibility } from '../styles';
import { GameState } from '../core/models/game/GameState';
import { ScreenHeader } from '../components';
import {
  PreseasonSummary,
  PreseasonGame,
  PreseasonEvaluation,
  PreseasonPlayerPerformance,
  PreseasonInjury,
} from '../core/offseason/phases/PreseasonPhase';

/**
 * Props for PreseasonScreen
 */
export interface PreseasonScreenProps {
  gameState: GameState;
  summary: PreseasonSummary;
  onBack: () => void;
  onPlayerSelect?: (playerId: string) => void;
}

type TabType = 'schedule' | 'evaluations' | 'injuries';

/**
 * Get color for game result
 */
function getResultColor(result: PreseasonGame['result']): string {
  switch (result) {
    case 'win':
      return colors.success;
    case 'loss':
      return colors.error;
    case 'tie':
      return colors.warning;
    default:
      return colors.textSecondary;
  }
}

/**
 * Get color for grade
 */
function getGradeColor(grade: PreseasonPlayerPerformance['grade']): string {
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
 * Get color for roster projection
 */
function getProjectionColor(projection: PreseasonEvaluation['rosterProjection']): string {
  switch (projection) {
    case 'lock':
      return colors.success;
    case 'bubble':
      return colors.warning;
    case 'practice_squad':
      return colors.textSecondary;
    case 'cut_candidate':
      return colors.error;
    default:
      return colors.textSecondary;
  }
}

/**
 * Get color for trend
 */
function getTrendColor(trend: PreseasonEvaluation['trend']): string {
  switch (trend) {
    case 'improving':
      return colors.success;
    case 'declining':
      return colors.error;
    case 'steady':
      return colors.textSecondary;
    default:
      return colors.textSecondary;
  }
}

/**
 * Get color for injury severity
 */
function getSeverityColor(severity: PreseasonInjury['severity']): string {
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
function getTrendArrow(trend: PreseasonEvaluation['trend']): string {
  switch (trend) {
    case 'improving':
      return '↑';
    case 'declining':
      return '↓';
    case 'steady':
      return '→';
    default:
      return '';
  }
}

/**
 * Record display component
 */
function RecordCard({ summary }: { summary: PreseasonSummary }): React.JSX.Element {
  const { wins, losses, ties } = summary.record;
  const recordText = ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;

  return (
    <View style={styles.recordCard}>
      <Text style={styles.recordTitle}>Preseason Record</Text>
      <Text style={styles.recordValue}>{recordText}</Text>
      <View style={styles.recordStats}>
        <View style={styles.recordStatItem}>
          <Text style={[styles.recordStatValue, { color: colors.success }]}>{wins}</Text>
          <Text style={styles.recordStatLabel}>Wins</Text>
        </View>
        <View style={styles.recordStatItem}>
          <Text style={[styles.recordStatValue, { color: colors.error }]}>{losses}</Text>
          <Text style={styles.recordStatLabel}>Losses</Text>
        </View>
        {ties > 0 && (
          <View style={styles.recordStatItem}>
            <Text style={[styles.recordStatValue, { color: colors.warning }]}>{ties}</Text>
            <Text style={styles.recordStatLabel}>Ties</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * Game card component
 */
function GameCard({
  game,
  onPlayerPress,
}: {
  game: PreseasonGame;
  onPlayerPress: (playerId: string) => void;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const location = game.isHome ? 'vs' : '@';

  const topPerformers = [...game.playerPerformances]
    .filter((p) => p.grade === 'A' || p.grade === 'B')
    .slice(0, 3);

  return (
    <View style={styles.gameCard}>
      <TouchableOpacity
        style={styles.gameHeader}
        onPress={() => setExpanded(!expanded)}
        accessibilityLabel={`Game ${game.gameNumber} vs ${game.opponent}, ${game.result}, ${game.teamScore}-${game.opponentScore}`}
        accessibilityRole="button"
        hitSlop={accessibility.hitSlop}
      >
        <View>
          <Text style={styles.gameTitle}>Game {game.gameNumber}</Text>
          <Text style={styles.gameOpponent}>
            {location} {game.opponent}
          </Text>
        </View>
        <View style={styles.gameScore}>
          <Text style={[styles.scoreText, { color: getResultColor(game.result) }]}>
            {game.teamScore} - {game.opponentScore}
          </Text>
          <View
            style={[styles.resultBadge, { backgroundColor: getResultColor(game.result) + '20' }]}
          >
            <Text style={[styles.resultText, { color: getResultColor(game.result) }]}>
              {game.result.toUpperCase()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {game.highlights.length > 0 && (
        <View style={styles.highlightsSection}>
          {game.highlights.map((highlight, i) => (
            <Text key={i} style={styles.highlightText}>
              + {highlight}
            </Text>
          ))}
        </View>
      )}

      {expanded && (
        <>
          <View style={styles.divider} />
          <Text style={styles.subsectionTitle}>Top Performers</Text>
          {topPerformers.length > 0 ? (
            topPerformers.map((perf) => (
              <TouchableOpacity
                key={perf.playerId}
                style={styles.performerRow}
                onPress={() => onPlayerPress(perf.playerId)}
                accessibilityLabel={`${perf.playerName}, ${perf.position}, grade ${perf.grade}`}
                accessibilityRole="button"
                hitSlop={accessibility.hitSlop}
              >
                <View style={styles.performerInfo}>
                  <Text style={styles.performerName}>{perf.playerName}</Text>
                  <Text style={styles.performerPosition}>
                    {perf.position} • {perf.snaps} snaps
                  </Text>
                </View>
                <View
                  style={[styles.gradeBadge, { backgroundColor: getGradeColor(perf.grade) + '20' }]}
                >
                  <Text style={[styles.gradeText, { color: getGradeColor(perf.grade) }]}>
                    {perf.grade}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptySubtext}>No standout performances</Text>
          )}

          {game.injuries.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Injuries</Text>
              {game.injuries.map((injury, i) => (
                <View key={i} style={styles.injuryMiniRow}>
                  <Text style={styles.injuryMiniName}>{injury.playerName}</Text>
                  <Text style={styles.injuryMiniType}>{injury.injuryType}</Text>
                  <Text
                    style={[
                      styles.injuryMiniSeverity,
                      { color: getSeverityColor(injury.severity) },
                    ]}
                  >
                    {injury.missedTime}
                  </Text>
                </View>
              ))}
            </>
          )}
        </>
      )}

      <TouchableOpacity
        style={styles.expandButton}
        onPress={() => setExpanded(!expanded)}
        accessibilityLabel={expanded ? 'Show less details' : 'Show more details'}
        accessibilityRole="button"
        hitSlop={accessibility.hitSlop}
      >
        <Text style={styles.expandText}>{expanded ? 'Show Less' : 'Show Details'}</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Evaluation card component
 */
function EvaluationCard({
  evaluation,
  onPress,
}: {
  evaluation: PreseasonEvaluation;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={styles.evaluationCard}
      onPress={onPress}
      accessibilityLabel={`${evaluation.playerName}, ${evaluation.position}, ${evaluation.rosterProjection.replace('_', ' ')}`}
      accessibilityRole="button"
      hitSlop={accessibility.hitSlop}
    >
      <View style={styles.evaluationHeader}>
        <View>
          <Text style={styles.playerName}>{evaluation.playerName}</Text>
          <Text style={styles.playerPosition}>{evaluation.position}</Text>
        </View>
        <View
          style={[
            styles.projectionBadge,
            { backgroundColor: getProjectionColor(evaluation.rosterProjection) + '20' },
          ]}
        >
          <Text
            style={[
              styles.projectionText,
              { color: getProjectionColor(evaluation.rosterProjection) },
            ]}
          >
            {evaluation.rosterProjection.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.evaluationStats}>
        <View style={styles.evalStatItem}>
          <Text style={styles.evalStatValue}>{evaluation.gamesPlayed}</Text>
          <Text style={styles.evalStatLabel}>Games</Text>
        </View>
        <View style={styles.evalStatItem}>
          <Text style={styles.evalStatValue}>{evaluation.totalSnaps}</Text>
          <Text style={styles.evalStatLabel}>Snaps</Text>
        </View>
        <View style={styles.evalStatItem}>
          <Text style={styles.evalStatValue}>{Math.round(evaluation.avgGrade)}</Text>
          <Text style={styles.evalStatLabel}>Grade</Text>
        </View>
        <View style={styles.evalStatItem}>
          <Text style={[styles.evalStatValue, { color: getTrendColor(evaluation.trend) }]}>
            {getTrendArrow(evaluation.trend)}
          </Text>
          <Text style={styles.evalStatLabel}>{evaluation.trend}</Text>
        </View>
      </View>

      {evaluation.keyMoments.length > 0 && (
        <View style={styles.keyMomentsList}>
          {evaluation.keyMoments.slice(0, 2).map((moment, i) => (
            <Text key={i} style={styles.keyMomentText}>
              • {moment}
            </Text>
          ))}
        </View>
      )}

      <Text style={styles.recommendationText}>{evaluation.recommendation}</Text>
    </TouchableOpacity>
  );
}

/**
 * Injury card component
 */
function InjuryCard({
  injury,
  onPress,
}: {
  injury: PreseasonInjury;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={styles.injuryCard}
      onPress={onPress}
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
          <Text style={styles.injuryLabel}>Game:</Text>
          <Text style={styles.injuryValue}>Preseason Game {injury.gameNumber}</Text>
        </View>
        <View style={styles.injuryRow}>
          <Text style={styles.injuryLabel}>Return:</Text>
          <Text style={styles.injuryValue}>{injury.missedTime}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Preseason Screen Component
 */
export function PreseasonScreen({
  summary,
  onBack,
  onPlayerSelect,
}: PreseasonScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('schedule');

  const handlePlayerPress = (playerId: string) => {
    onPlayerSelect?.(playerId);
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'schedule', label: 'Schedule' },
    { key: 'evaluations', label: 'Evaluations' },
    { key: 'injuries', label: 'Injuries' },
  ];

  // Group evaluations by projection
  const lockPlayers = summary.evaluations.filter((e) => e.rosterProjection === 'lock');
  const bubblePlayers = summary.evaluations.filter((e) => e.rosterProjection === 'bubble');
  const cutCandidates = summary.evaluations.filter((e) => e.rosterProjection === 'cut_candidate');
  const practicePlayers = summary.evaluations.filter(
    (e) => e.rosterProjection === 'practice_squad'
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ScreenHeader title="Preseason" onBack={onBack} testID="preseason-header" />

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
        {activeTab === 'schedule' && (
          <>
            <RecordCard summary={summary} />

            <Text style={styles.sectionTitle}>Games</Text>
            {summary.games.length === 0 ? (
              <Text style={styles.emptyText}>No preseason games played yet</Text>
            ) : (
              summary.games.map((game, i) => (
                <GameCard key={i} game={game} onPlayerPress={handlePlayerPress} />
              ))
            )}

            {summary.standouts.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Preseason Standouts</Text>
                {summary.standouts.slice(0, 5).map((eval_, i) => (
                  <EvaluationCard
                    key={i}
                    evaluation={eval_}
                    onPress={() => handlePlayerPress(eval_.playerId)}
                  />
                ))}
              </>
            )}
          </>
        )}

        {activeTab === 'evaluations' && (
          <>
            {lockPlayers.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Roster Locks ({lockPlayers.length})</Text>
                {lockPlayers.map((eval_, i) => (
                  <EvaluationCard
                    key={i}
                    evaluation={eval_}
                    onPress={() => handlePlayerPress(eval_.playerId)}
                  />
                ))}
              </>
            )}

            {bubblePlayers.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>On the Bubble ({bubblePlayers.length})</Text>
                {bubblePlayers.map((eval_, i) => (
                  <EvaluationCard
                    key={i}
                    evaluation={eval_}
                    onPress={() => handlePlayerPress(eval_.playerId)}
                  />
                ))}
              </>
            )}

            {practicePlayers.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>
                  Practice Squad Candidates ({practicePlayers.length})
                </Text>
                {practicePlayers.map((eval_, i) => (
                  <EvaluationCard
                    key={i}
                    evaluation={eval_}
                    onPress={() => handlePlayerPress(eval_.playerId)}
                  />
                ))}
              </>
            )}

            {cutCandidates.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Cut Candidates ({cutCandidates.length})</Text>
                {cutCandidates.map((eval_, i) => (
                  <EvaluationCard
                    key={i}
                    evaluation={eval_}
                    onPress={() => handlePlayerPress(eval_.playerId)}
                  />
                ))}
              </>
            )}

            {summary.evaluations.length === 0 && (
              <Text style={styles.emptyText}>No evaluations available yet</Text>
            )}
          </>
        )}

        {activeTab === 'injuries' && (
          <>
            <Text style={styles.sectionTitle}>Preseason Injury Report</Text>
            {summary.injuries.length === 0 ? (
              <Text style={styles.emptyText}>No injuries to report</Text>
            ) : (
              summary.injuries.map((injury, i) => (
                <InjuryCard
                  key={i}
                  injury={injury}
                  onPress={() => handlePlayerPress(injury.playerId)}
                />
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
  recordCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  recordTitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  recordValue: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  recordStats: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.xl,
  },
  recordStatItem: {
    alignItems: 'center',
  },
  recordStatValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  recordStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  gameCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gameTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  gameOpponent: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  gameScore: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  resultBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  resultText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  highlightsSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  highlightText: {
    fontSize: fontSize.sm,
    color: colors.success,
    marginBottom: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  subsectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  performerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  performerInfo: {
    flex: 1,
  },
  performerName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  performerPosition: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  gradeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  gradeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  injuryMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  injuryMiniName: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  injuryMiniType: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  injuryMiniSeverity: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  expandButton: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  expandText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  evaluationCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  evaluationHeader: {
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
  projectionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  projectionText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  evaluationStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
  },
  evalStatItem: {
    alignItems: 'center',
  },
  evalStatValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  evalStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  keyMomentsList: {
    marginBottom: spacing.sm,
  },
  keyMomentText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  recommendationText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontStyle: 'italic',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    width: 70,
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

export default PreseasonScreen;
