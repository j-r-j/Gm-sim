/**
 * CoachProfileScreen
 * Detailed view of a coach's profile, stats, and contract
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, accessibility } from '../styles';
import { Coach, getCoachFullName, getCareerWinningPercentage } from '../core/models/staff/Coach';
import { ScreenHeader } from '../components';
import { CoachPersonalityBadge } from '../components/coach/CoachPersonalityBadge';
import { CoachAttributesDisplay } from '../components/coach/CoachAttributesDisplay';
import { CoachContractInfo } from '../components/coach/CoachContractInfo';
import { CoachTreeCard } from '../components/coach/CoachTreeCard';
import { calculateCoachRevelation } from '../core/coaching/CoachRevelationSystem';
import { Avatar } from '../components/avatar';

/**
 * Props for CoachProfileScreen
 */
export interface CoachProfileScreenProps {
  /** The coach to display */
  coach: Coach;
  /** Whether this is the user's team coach */
  isOwnTeam: boolean;
  /** Team name for display */
  teamName?: string;
  /** Callback to go back */
  onBack: () => void;
  /** Callback for management actions */
  onManageCoach?: (action: 'extend' | 'fire' | 'promote') => void;
  /** Callback to view coaching tree */
  onViewCoachingTree?: () => void;
}

/**
 * Format role for display
 */
function formatRole(role: string): string {
  const roleMap: Record<string, string> = {
    headCoach: 'Head Coach',
    offensiveCoordinator: 'Offensive Coordinator',
    defensiveCoordinator: 'Defensive Coordinator',
    specialTeamsCoordinator: 'Special Teams Coordinator',
    qbCoach: 'Quarterbacks Coach',
    rbCoach: 'Running Backs Coach',
    wrCoach: 'Wide Receivers Coach',
    teCoach: 'Tight Ends Coach',
    olCoach: 'Offensive Line Coach',
    dlCoach: 'Defensive Line Coach',
    lbCoach: 'Linebackers Coach',
    dbCoach: 'Secondary Coach',
    stCoach: 'Special Teams Coach',
  };
  return roleMap[role] || role;
}

/**
 * Career history card component
 */
function CareerHistoryCard({ coach }: { coach: Coach }): React.JSX.Element {
  const winPct = getCareerWinningPercentage(coach);
  const totalWins = coach.careerHistory.reduce((sum, entry) => sum + entry.wins, 0);
  const totalLosses = coach.careerHistory.reduce((sum, entry) => sum + entry.losses, 0);
  const totalChampionships = coach.careerHistory.reduce(
    (sum, entry) => sum + entry.championships,
    0
  );
  const totalPlayoffs = coach.careerHistory.reduce(
    (sum, entry) => sum + entry.playoffAppearances,
    0
  );

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Career History</Text>

      <View style={styles.careerStatsGrid}>
        <View style={styles.careerStatItem}>
          <Text style={styles.careerStatValue}>{coach.attributes.yearsExperience}</Text>
          <Text style={styles.careerStatLabel}>Years</Text>
        </View>

        <View style={styles.careerStatItem}>
          <Text style={styles.careerStatValue}>
            {totalWins}-{totalLosses}
          </Text>
          <Text style={styles.careerStatLabel}>Record</Text>
        </View>

        <View style={styles.careerStatItem}>
          <Text style={styles.careerStatValue}>
            {winPct !== null ? `${(winPct * 100).toFixed(1)}%` : 'N/A'}
          </Text>
          <Text style={styles.careerStatLabel}>Win %</Text>
        </View>

        <View style={styles.careerStatItem}>
          <Text style={styles.careerStatValue}>{totalPlayoffs}</Text>
          <Text style={styles.careerStatLabel}>Playoffs</Text>
        </View>

        <View style={styles.careerStatItem}>
          <Text
            style={[styles.careerStatValue, totalChampionships > 0 && styles.championshipValue]}
          >
            {totalChampionships}
          </Text>
          <Text style={styles.careerStatLabel}>Titles</Text>
        </View>
      </View>

      {coach.careerHistory.length > 0 && (
        <View style={styles.historyList}>
          <Text style={styles.historyTitle}>Previous Positions</Text>
          {coach.careerHistory.slice(-5).map((entry, index) => (
            <View key={index} style={styles.historyEntry}>
              <View style={styles.historyMain}>
                <Text style={styles.historyTeam}>{entry.teamName}</Text>
                <Text style={styles.historyRole}>{formatRole(entry.role)}</Text>
              </View>
              <View style={styles.historyStats}>
                <Text style={styles.historyYears}>
                  {entry.yearStart}-{entry.yearEnd}
                </Text>
                <Text style={styles.historyRecord}>
                  {entry.wins}-{entry.losses}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Management actions component (only shown for own team)
 */
function ManagementActions({
  coach,
  onAction,
}: {
  coach: Coach;
  onAction: (action: 'extend' | 'fire' | 'promote') => void;
}): React.JSX.Element {
  const canPromote =
    coach.role !== 'headCoach' &&
    (coach.role === 'offensiveCoordinator' || coach.role === 'defensiveCoordinator');

  return (
    <View style={styles.actionsContainer}>
      <Text style={styles.sectionTitle}>Actions</Text>

      <View style={styles.actionsRow}>
        {coach.contract && (
          <TouchableOpacity
            style={[styles.actionButton, styles.extendButton]}
            onPress={() => onAction('extend')}
          >
            <Text style={styles.actionButtonText}>Extend Contract</Text>
          </TouchableOpacity>
        )}

        {canPromote && (
          <TouchableOpacity
            style={[styles.actionButton, styles.promoteButton]}
            onPress={() => onAction('promote')}
          >
            <Text style={styles.actionButtonText}>Promote to HC</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.fireButton]}
          onPress={() => onAction('fire')}
        >
          <Text style={styles.actionButtonText}>Release</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function CoachProfileScreen({
  coach,
  isOwnTeam,
  teamName,
  onBack,
  onManageCoach,
  onViewCoachingTree,
}: CoachProfileScreenProps): React.JSX.Element {
  // Calculate revelation state based on experience
  const revelation = calculateCoachRevelation(coach, isOwnTeam);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ScreenHeader title="Coach Profile" onBack={onBack} testID="coach-profile-header" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Basic Info Section */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Avatar id={coach.id} size="xl" age={coach.attributes.age} context="coach" />
          </View>

          <Text style={styles.coachName}>{getCoachFullName(coach)}</Text>
          <Text style={styles.coachRole}>{formatRole(coach.role)}</Text>
          {teamName && <Text style={styles.teamName}>{teamName}</Text>}

          <View style={styles.quickStats}>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{coach.attributes.age}</Text>
              <Text style={styles.quickStatLabel}>Age</Text>
            </View>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{coach.attributes.yearsExperience}</Text>
              <Text style={styles.quickStatLabel}>Experience</Text>
            </View>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{coach.attributes.reputation}</Text>
              <Text style={styles.quickStatLabel}>Reputation</Text>
            </View>
          </View>
        </View>

        {/* Personality */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Personality</Text>
          <View style={styles.personalityRow}>
            <CoachPersonalityBadge
              primary={coach.personality.primary}
              secondary={coach.personality.secondary}
            />
          </View>
        </View>

        {/* Coaching Tree */}
        <CoachTreeCard tree={coach.tree} />

        {/* Attributes (with revelation) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Coaching Abilities</Text>
          <CoachAttributesDisplay
            attributes={coach.attributes}
            revelation={revelation.attributes}
          />
        </View>

        {/* Contract Info (own team only) */}
        {isOwnTeam && coach.contract && <CoachContractInfo contract={coach.contract} />}

        {/* Career History */}
        <CareerHistoryCard coach={coach} />

        {/* View Coaching Tree Button */}
        {onViewCoachingTree && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onViewCoachingTree}>
              <Text style={styles.secondaryButtonText}>View Coaching Tree</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Management Actions (own team only) */}
        {isOwnTeam && onManageCoach && <ManagementActions coach={coach} onAction={onManageCoach} />}

        {/* Bottom padding */}
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
    color: colors.primary,
    fontSize: fontSize.md,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  coachName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  coachRole: {
    fontSize: fontSize.lg,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  teamName: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  quickStats: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.sm,
  },
  quickStat: {
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
  },
  sectionContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  personalityRow: {
    alignItems: 'flex-start',
  },
  careerStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  careerStatItem: {
    flex: 1,
    minWidth: '18%',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  careerStatValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  careerStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  championshipValue: {
    color: colors.warning,
  },
  historyList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  historyTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  historyEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyMain: {
    flex: 1,
  },
  historyTeam: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  historyRole: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  historyStats: {
    alignItems: 'flex-end',
  },
  historyYears: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  historyRecord: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  actionsContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  extendButton: {
    backgroundColor: colors.success,
  },
  promoteButton: {
    backgroundColor: colors.primary,
  },
  fireButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.background,
  },
  section: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  bottomPadding: {
    height: spacing.xl,
  },
});

export default CoachProfileScreen;
