/**
 * StaffDecisionScreen
 * Shows current coaching staff when starting a new game
 * Allows user to keep staff or clean house
 */

import React, { useState, useMemo } from 'react';
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
import { Coach } from '../core/models/staff/Coach';
import { CoachRole } from '../core/models/staff/StaffSalary';
import { getReputationTier, ReputationTier } from '../core/models/staff/CoachAttributes';
import { Team } from '../core/models/team/Team';
import { getFullTeamName, FakeCity } from '../core/models/team/FakeCities';
import {
  generateCoachWriteup,
  generateCoachStrengths,
  getSchemeDisplayName,
  getTreeDisplayName,
  getPersonalityDisplayName,
  getReputationDisplayName,
} from '../core/coaching/CoachWriteupGenerator';
import { CoachCard } from '../components/coach/CoachCard';

interface StaffDecisionScreenProps {
  team: Team;
  teamCity: FakeCity;
  coaches: Coach[];
  staffBudget: number;
  currentYear: number;
  onKeepStaff: () => void;
  onCleanHouse: () => void;
  onBack: () => void;
}

/**
 * Get role color
 */
function getRoleColor(role: CoachRole): string {
  switch (role) {
    case 'headCoach':
      return colors.primary;
    case 'offensiveCoordinator':
      return colors.success;
    case 'defensiveCoordinator':
      return colors.secondary;
    default:
      return colors.textSecondary;
  }
}

/**
 * Get role display name
 */
function getRoleDisplayName(role: CoachRole): string {
  const roleNames: Record<CoachRole, string> = {
    headCoach: 'Head Coach',
    offensiveCoordinator: 'Offensive Coordinator',
    defensiveCoordinator: 'Defensive Coordinator',
  };
  return roleNames[role] || role;
}

/**
 * Get role abbreviation
 */
function getRoleAbbreviation(role: CoachRole): string {
  const abbrevs: Record<CoachRole, string> = {
    headCoach: 'HC',
    offensiveCoordinator: 'OC',
    defensiveCoordinator: 'DC',
  };
  return abbrevs[role] || role;
}

/**
 * Get reputation color
 */
function getReputationColor(tier: ReputationTier): string {
  switch (tier) {
    case 'legendary':
      return colors.warning;
    case 'elite':
      return colors.success;
    case 'established':
      return colors.info;
    case 'rising':
      return colors.primary;
    default:
      return colors.textSecondary;
  }
}

/**
 * Format money for display (values are stored in thousands, e.g., 30000 = $30 million)
 */
function formatMoney(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}M`;
  }
  return `$${value.toFixed(0)}K`;
}

/**
 * Get chemistry description
 */
function getChemistryDescription(chemistry: number): { label: string; color: string } {
  if (chemistry >= 7) {
    return { label: 'Excellent', color: colors.success };
  } else if (chemistry >= 4) {
    return { label: 'Good', color: colors.info };
  } else if (chemistry >= 0) {
    return { label: 'Fair', color: colors.warning };
  } else {
    return { label: 'Poor', color: colors.error };
  }
}

/**
 * Staff Card Component
 */
function StaffCard({
  coach,
  onViewDetails,
}: {
  coach: Coach;
  onViewDetails: () => void;
}): React.JSX.Element {
  const tier = getReputationTier(coach.attributes.reputation);
  const roleColor = getRoleColor(coach.role);
  const writeup = useMemo(() => generateCoachWriteup(coach), [coach]);
  const strengths = useMemo(() => generateCoachStrengths(coach), [coach]);

  return (
    <TouchableOpacity
      style={styles.staffCard}
      onPress={onViewDetails}
      activeOpacity={0.8}
      accessibilityLabel={`${coach.firstName} ${coach.lastName}, ${getRoleDisplayName(coach.role)}. Tap for details`}
      accessibilityRole="button"
      hitSlop={accessibility.hitSlop}
    >
      {/* Header */}
      <View style={styles.staffCardHeader}>
        <View style={[styles.roleIcon, { backgroundColor: roleColor }]}>
          <Text style={styles.roleIconText}>{getRoleAbbreviation(coach.role)}</Text>
        </View>
        <View style={styles.staffCardHeaderInfo}>
          <Text style={styles.staffCardName}>
            {coach.firstName} {coach.lastName}
          </Text>
          <Text style={styles.staffCardRole}>{getRoleDisplayName(coach.role)}</Text>
        </View>
        <View style={[styles.reputationBadge, { borderColor: getReputationColor(tier) }]}>
          <Text style={[styles.reputationText, { color: getReputationColor(tier) }]}>
            {getReputationDisplayName(tier)}
          </Text>
        </View>
      </View>

      {/* Info Row */}
      <View style={styles.staffCardInfoRow}>
        <View style={styles.infoPill}>
          <Text style={styles.infoPillLabel}>Age</Text>
          <Text style={styles.infoPillValue}>{coach.attributes.age}</Text>
        </View>
        <View style={styles.infoPill}>
          <Text style={styles.infoPillLabel}>Exp</Text>
          <Text style={styles.infoPillValue}>{coach.attributes.yearsExperience} yrs</Text>
        </View>
        <View style={styles.infoPill}>
          <Text style={styles.infoPillLabel}>Scheme</Text>
          <Text style={styles.infoPillValue}>{getSchemeDisplayName(coach.scheme)}</Text>
        </View>
      </View>

      {/* Badges Row */}
      <View style={styles.badgesRow}>
        <View style={styles.treeBadge}>
          <Text style={styles.treeBadgeText}>{getTreeDisplayName(coach.tree.treeName)}</Text>
        </View>
        <View style={styles.personalityBadge}>
          <Text style={styles.personalityBadgeText}>
            {getPersonalityDisplayName(coach.personality.primary)}
          </Text>
        </View>
      </View>

      {/* Writeup */}
      <View style={styles.writeupContainer}>
        <Text style={styles.writeupText} numberOfLines={3}>
          {writeup}
        </Text>
      </View>

      {/* Strengths */}
      <View style={styles.strengthsRow}>
        {strengths.slice(0, 3).map((strength, index) => (
          <View key={index} style={styles.strengthBadge}>
            <Text style={styles.strengthText}>{strength}</Text>
          </View>
        ))}
      </View>

      {/* Contract */}
      {coach.contract && (
        <View style={styles.contractRow}>
          <Text style={styles.contractText}>{formatMoney(coach.contract.salaryPerYear)}/yr</Text>
          <Text style={styles.contractDivider}>|</Text>
          <Text style={styles.contractText}>{coach.contract.yearsRemaining} yrs remaining</Text>
        </View>
      )}

      {/* View Details */}
      <View style={styles.viewDetailsContainer}>
        <Text style={styles.viewDetailsText}>Tap for details</Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * StaffDecisionScreen Component
 */
export function StaffDecisionScreen({
  team: _team,
  teamCity,
  coaches,
  staffBudget,
  currentYear,
  onKeepStaff,
  onCleanHouse,
  onBack,
}: StaffDecisionScreenProps): React.JSX.Element {
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);

  // Get coaches by role
  const headCoach = coaches.find((c) => c.role === 'headCoach');
  const offensiveCoordinator = coaches.find((c) => c.role === 'offensiveCoordinator');
  const defensiveCoordinator = coaches.find((c) => c.role === 'defensiveCoordinator');

  // Calculate total salary
  const totalSalary = coaches.reduce((sum, c) => sum + (c.contract?.salaryPerYear || 0), 0);
  const budgetUsagePercent = Math.round((totalSalary / staffBudget) * 100);

  // Calculate staff chemistry (simplified version)
  const staffChemistry = useMemo(() => {
    if (!headCoach || (!offensiveCoordinator && !defensiveCoordinator)) {
      return 5; // Default neutral chemistry
    }

    let totalChemistry = 0;
    let count = 0;

    // HC-OC chemistry
    if (headCoach && offensiveCoordinator) {
      // Same tree bonus
      if (headCoach.tree.treeName === offensiveCoordinator.tree.treeName) {
        totalChemistry += 3;
      }
      // Personality synergy
      if (headCoach.personality.synergizesWith.includes(offensiveCoordinator.personality.primary)) {
        totalChemistry += 2;
      }
      // Personality conflict
      if (headCoach.personality.conflictsWith.includes(offensiveCoordinator.personality.primary)) {
        totalChemistry -= 2;
      }
      count++;
    }

    // HC-DC chemistry
    if (headCoach && defensiveCoordinator) {
      if (headCoach.tree.treeName === defensiveCoordinator.tree.treeName) {
        totalChemistry += 3;
      }
      if (headCoach.personality.synergizesWith.includes(defensiveCoordinator.personality.primary)) {
        totalChemistry += 2;
      }
      if (headCoach.personality.conflictsWith.includes(defensiveCoordinator.personality.primary)) {
        totalChemistry -= 2;
      }
      count++;
    }

    return count > 0 ? Math.round((totalChemistry / count) * 2 + 5) : 5;
  }, [headCoach, offensiveCoordinator, defensiveCoordinator]);

  const chemistryInfo = getChemistryDescription(staffChemistry);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ScreenHeader title="Coaching Staff" onBack={onBack} testID="staff-decision-header" />

      {/* Team Banner */}
      <View style={styles.teamBanner}>
        <Text style={styles.teamName}>{getFullTeamName(teamCity)}</Text>
        <Text style={styles.teamSubtitle}>Review your coaching staff</Text>
      </View>

      {/* Budget Bar */}
      <View style={styles.budgetContainer}>
        <View style={styles.budgetHeader}>
          <Text style={styles.budgetLabel}>Staff Budget</Text>
          <Text style={styles.budgetValue}>
            {formatMoney(totalSalary)} / {formatMoney(staffBudget)}
          </Text>
        </View>
        <View style={styles.budgetBarBackground}>
          <View
            style={[
              styles.budgetBarFill,
              {
                width: `${Math.min(100, budgetUsagePercent)}%`,
                backgroundColor: budgetUsagePercent > 90 ? colors.error : colors.success,
              },
            ]}
          />
        </View>
        <Text style={styles.budgetPercent}>{budgetUsagePercent}% used</Text>
      </View>

      {/* Staff List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Head Coach */}
        {headCoach && (
          <View style={styles.coachSection}>
            <StaffCard coach={headCoach} onViewDetails={() => setSelectedCoach(headCoach)} />
          </View>
        )}

        {/* Coordinators */}
        <View style={styles.coordinatorsRow}>
          {offensiveCoordinator && (
            <View style={styles.coordinatorContainer}>
              <StaffCard
                coach={offensiveCoordinator}
                onViewDetails={() => setSelectedCoach(offensiveCoordinator)}
              />
            </View>
          )}
          {defensiveCoordinator && (
            <View style={styles.coordinatorContainer}>
              <StaffCard
                coach={defensiveCoordinator}
                onViewDetails={() => setSelectedCoach(defensiveCoordinator)}
              />
            </View>
          )}
        </View>

        {/* Staff Chemistry */}
        <View style={styles.chemistryContainer}>
          <Text style={styles.chemistryTitle}>Staff Chemistry</Text>
          <View style={styles.chemistryContent}>
            <View style={styles.chemistryBarBackground}>
              <View
                style={[
                  styles.chemistryBarFill,
                  {
                    width: `${Math.max(0, Math.min(100, staffChemistry * 10))}%`,
                    backgroundColor: chemistryInfo.color,
                  },
                ]}
              />
            </View>
            <View style={[styles.chemistryBadge, { borderColor: chemistryInfo.color }]}>
              <Text style={[styles.chemistryLabel, { color: chemistryInfo.color }]}>
                {chemistryInfo.label}
              </Text>
            </View>
          </View>
          <Text style={styles.chemistryDescription}>
            {staffChemistry >= 7
              ? 'Your staff shares a strong coaching philosophy and works well together.'
              : staffChemistry >= 4
                ? 'Your staff has good compatibility with room for improvement.'
                : staffChemistry >= 0
                  ? 'Some personality differences may cause friction.'
                  : 'Significant conflicts between staff members may affect performance.'}
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomPanel}>
        <TouchableOpacity
          style={styles.keepButton}
          onPress={onKeepStaff}
          activeOpacity={0.8}
          accessibilityLabel="Keep staff. Continue with these coaches"
          accessibilityRole="button"
          hitSlop={accessibility.hitSlop}
        >
          <Text style={styles.keepButtonText}>Keep Staff</Text>
          <Text style={styles.keepButtonSubtext}>Continue with these coaches</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cleanHouseButton}
          onPress={onCleanHouse}
          activeOpacity={0.8}
          accessibilityLabel="Clean house. Fire all and hire new coaches"
          accessibilityRole="button"
          hitSlop={accessibility.hitSlop}
        >
          <Text style={styles.cleanHouseButtonText}>Clean House</Text>
          <Text style={styles.cleanHouseButtonSubtext}>Fire all & hire new (no penalty)</Text>
        </TouchableOpacity>
      </View>

      {/* Coach Detail Modal */}
      {selectedCoach && (
        <CoachCard
          coach={selectedCoach}
          currentYear={currentYear}
          onClose={() => setSelectedCoach(null)}
          isModal={true}
        />
      )}
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
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  backButton: {
    width: 80,
  },
  backButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  teamBanner: {
    backgroundColor: colors.primaryDark,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  teamName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  teamSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textOnPrimary,
    opacity: 0.8,
    marginTop: spacing.xxs,
  },
  budgetContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  budgetLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  budgetValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  budgetBarBackground: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  budgetBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  budgetPercent: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  coachSection: {
    marginBottom: spacing.md,
  },
  coordinatorsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  coordinatorContainer: {
    flex: 1,
  },
  staffCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.md,
  },
  staffCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  roleIconText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  staffCardHeaderInfo: {
    flex: 1,
  },
  staffCardName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  staffCardRole: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  reputationBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  reputationText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  staffCardInfoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoPill: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    alignItems: 'center',
  },
  infoPillLabel: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    textTransform: 'uppercase',
  },
  infoPillValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.xxs,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  treeBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  treeBadgeText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  personalityBadge: {
    backgroundColor: colors.accent + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  personalityBadgeText: {
    fontSize: fontSize.xs,
    color: colors.accent,
    fontWeight: fontWeight.medium,
  },
  writeupContainer: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  writeupText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.5,
    fontStyle: 'italic',
  },
  strengthsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  strengthBadge: {
    backgroundColor: colors.success + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  strengthText: {
    fontSize: fontSize.xs,
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
  contractRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: spacing.sm,
  },
  contractText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  contractDivider: {
    marginHorizontal: spacing.sm,
    color: colors.border,
  },
  viewDetailsContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  viewDetailsText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  chemistryContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  chemistryTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  chemistryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  chemistryBarBackground: {
    flex: 1,
    height: 12,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  chemistryBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  chemistryBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  chemistryLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  chemistryDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.5,
  },
  bottomPanel: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    gap: spacing.md,
    ...shadows.lg,
  },
  keepButton: {
    flex: 1,
    backgroundColor: colors.success,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.md,
  },
  keepButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  keepButtonSubtext: {
    fontSize: fontSize.xs,
    color: colors.textOnPrimary,
    opacity: 0.8,
    marginTop: spacing.xxs,
  },
  cleanHouseButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  cleanHouseButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.secondary,
  },
  cleanHouseButtonSubtext: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
});

export default StaffDecisionScreen;
