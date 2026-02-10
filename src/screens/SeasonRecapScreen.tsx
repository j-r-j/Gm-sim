/**
 * SeasonRecapScreen
 * Displays season summary during offseason Phase 1 (Season End)
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../styles';
import { ScreenHeader } from '../components';
import { SeasonRecap } from '../core/offseason/OffSeasonPhaseManager';

interface SeasonRecapScreenProps {
  recap: SeasonRecap;
  teamName: string;
  onBack: () => void;
  onPlayerSelect?: (playerId: string) => void;
}

/**
 * Get color for grade display
 */
function getGradeColor(grade: string): string {
  if (grade.startsWith('A')) return colors.success;
  if (grade.startsWith('B')) return colors.info;
  if (grade.startsWith('C')) return colors.warning;
  return colors.error;
}

/**
 * Get color for division finish
 */
function getDivisionColor(finish: number): string {
  switch (finish) {
    case 1:
      return colors.success;
    case 2:
      return colors.info;
    case 3:
      return colors.warning;
    default:
      return colors.error;
  }
}

/**
 * Get ordinal suffix for number
 */
function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function SeasonRecapScreen({
  recap,
  teamName,
  onBack,
  onPlayerSelect,
}: SeasonRecapScreenProps): React.JSX.Element {
  const {
    year,
    teamRecord,
    divisionFinish,
    madePlayoffs,
    playoffResult,
    draftPosition,
    topPerformers,
    awards,
  } = recap;

  const recordString = `${teamRecord.wins}-${teamRecord.losses}${teamRecord.ties > 0 ? `-${teamRecord.ties}` : ''}`;
  const winPct = (
    ((teamRecord.wins + teamRecord.ties * 0.5) /
      (teamRecord.wins + teamRecord.losses + teamRecord.ties)) *
    100
  ).toFixed(1);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ScreenHeader
        title={`${year} Season Recap`}
        subtitle={teamName}
        onBack={onBack}
        testID="season-recap-header"
      />

      <ScrollView style={styles.content}>
        {/* Record Card */}
        <View style={styles.recordCard}>
          <Text style={styles.recordTitle}>Season Record</Text>
          <Text style={styles.recordValue}>{recordString}</Text>
          <Text style={styles.recordPercent}>{winPct}%</Text>
        </View>

        {/* Season Outcome */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Season Outcome</Text>
          <View style={styles.outcomeGrid}>
            {/* Division Finish */}
            <View style={styles.outcomeCard}>
              <View
                style={[
                  styles.outcomeBadge,
                  { backgroundColor: getDivisionColor(divisionFinish) + '20' },
                ]}
              >
                <Text style={[styles.outcomeValue, { color: getDivisionColor(divisionFinish) }]}>
                  {getOrdinalSuffix(divisionFinish)}
                </Text>
              </View>
              <Text style={styles.outcomeLabel}>Division</Text>
            </View>

            {/* Playoff Status */}
            <View style={styles.outcomeCard}>
              <View
                style={[
                  styles.outcomeBadge,
                  {
                    backgroundColor: madePlayoffs ? colors.success + '20' : colors.textLight + '20',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.outcomeValue,
                    { color: madePlayoffs ? colors.success : colors.textSecondary },
                  ]}
                >
                  {madePlayoffs ? 'Yes' : 'No'}
                </Text>
              </View>
              <Text style={styles.outcomeLabel}>Playoffs</Text>
            </View>

            {/* Draft Pick */}
            <View style={styles.outcomeCard}>
              <View style={[styles.outcomeBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.outcomeValue, { color: colors.primary }]}>
                  #{draftPosition}
                </Text>
              </View>
              <Text style={styles.outcomeLabel}>Draft Pick</Text>
            </View>
          </View>

          {/* Playoff Result */}
          {playoffResult && (
            <View
              style={[
                styles.playoffResult,
                playoffResult.includes('Champions') && styles.championResult,
              ]}
            >
              <Text
                style={[
                  styles.playoffResultText,
                  playoffResult.includes('Champions') && styles.championText,
                ]}
              >
                {playoffResult}
              </Text>
            </View>
          )}
        </View>

        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Performers</Text>
            {topPerformers.map((performer, index) => (
              <TouchableOpacity
                key={performer.playerId}
                style={styles.performerCard}
                onPress={() => onPlayerSelect?.(performer.playerId)}
                disabled={!onPlayerSelect}
              >
                <View style={styles.performerRank}>
                  <Text style={styles.performerRankText}>#{index + 1}</Text>
                </View>
                <View style={styles.performerInfo}>
                  <Text style={styles.performerName}>{performer.playerName}</Text>
                  <Text style={styles.performerPosition}>{performer.position}</Text>
                </View>
                <View
                  style={[styles.gradeBadge, { backgroundColor: getGradeColor(performer.grade) }]}
                >
                  <Text style={styles.gradeText}>{performer.grade}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Awards */}
        {awards.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Awards</Text>
            {awards.map((award, index) => (
              <TouchableOpacity
                key={`${award.award}-${index}`}
                style={styles.awardCard}
                onPress={() => onPlayerSelect?.(award.playerId)}
                disabled={!onPlayerSelect}
              >
                <View style={styles.awardIcon}>
                  <Text style={styles.awardIconText}>🏆</Text>
                </View>
                <View style={styles.awardInfo}>
                  <Text style={styles.awardName}>{award.award}</Text>
                  <Text style={styles.awardWinner}>{award.playerName}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* No Awards Message */}
        {awards.length === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Awards</Text>
            <View style={styles.noAwardsCard}>
              <Text style={styles.noAwardsText}>No individual awards this season</Text>
              <Text style={styles.noAwardsSubtext}>
                Build a championship roster to earn recognition
              </Text>
            </View>
          </View>
        )}

        {/* Season Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Looking Ahead</Text>
          <Text style={styles.summaryText}>
            With the #{draftPosition} overall pick in the upcoming draft,
            {draftPosition <= 10
              ? ' you have a chance to add a premium talent to the roster.'
              : draftPosition <= 20
                ? ' you can find a solid contributor to strengthen the team.'
                : " you'll need to scout carefully to find value in the later rounds."}
          </Text>
          <Text style={styles.summaryText}>
            Time to evaluate the roster, make key decisions, and prepare for next season.
          </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    padding: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
  },
  backButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textOnPrimary,
    opacity: 0.8,
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  recordCard: {
    backgroundColor: colors.primary,
    padding: spacing.xl,
    alignItems: 'center',
  },
  recordTitle: {
    fontSize: fontSize.sm,
    color: colors.textOnPrimary,
    opacity: 0.8,
    marginBottom: spacing.sm,
  },
  recordValue: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
    letterSpacing: 2,
  },
  recordPercent: {
    fontSize: fontSize.lg,
    color: colors.textOnPrimary,
    opacity: 0.9,
    marginTop: spacing.xs,
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
  outcomeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  outcomeCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: spacing.xs,
  },
  outcomeBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  outcomeValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  outcomeLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  playoffResult: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  championResult: {
    backgroundColor: '#FFD700' + '20',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  playoffResultText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  championText: {
    color: '#B8860B',
  },
  performerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  performerRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  performerRankText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  performerInfo: {
    flex: 1,
  },
  performerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  performerPosition: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  gradeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  gradeText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  awardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700' + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#FFD700' + '40',
  },
  awardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFD700' + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  awardIconText: {
    fontSize: fontSize.lg,
  },
  awardInfo: {
    flex: 1,
  },
  awardName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: '#B8860B',
  },
  awardWinner: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  noAwardsCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  noAwardsText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  noAwardsSubtext: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  summarySection: {
    padding: spacing.lg,
    backgroundColor: colors.primary + '08',
  },
  summaryTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  summaryText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
});

export default SeasonRecapScreen;
