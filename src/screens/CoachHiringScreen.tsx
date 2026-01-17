/**
 * CoachHiringScreen
 * Allows GMs to hire coaches for vacant positions
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles';
import { CoachRole } from '../core/models/staff/StaffSalary';
import { Avatar } from '../components/avatar';
import {
  CoachCandidate,
  generateCoachCandidates,
} from '../core/offseason/phases/CoachingDecisionsPhase';

/**
 * Props for CoachHiringScreen
 */
export interface CoachHiringScreenProps {
  vacancyRole: CoachRole;
  teamName: string;
  onBack: () => void;
  onHire: (candidate: CoachCandidate) => void;
}

/**
 * Gets display name for coach role
 */
function getRoleDisplayName(role: CoachRole): string {
  const displayNames: Record<CoachRole, string> = {
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
    dbCoach: 'Defensive Backs Coach',
    stCoach: 'Special Teams Coach',
  };
  return displayNames[role];
}

/**
 * Maps CoachRole to the candidate generation role type
 */
function mapRoleToCandidateRole(
  role: CoachRole
): 'head_coach' | 'offensive_coordinator' | 'defensive_coordinator' | 'special_teams' {
  switch (role) {
    case 'headCoach':
      return 'head_coach';
    case 'offensiveCoordinator':
      return 'offensive_coordinator';
    case 'defensiveCoordinator':
      return 'defensive_coordinator';
    case 'specialTeamsCoordinator':
    case 'stCoach':
      return 'special_teams';
    default:
      // For position coaches, use offensive coordinator type for offensive positions
      if (['qbCoach', 'rbCoach', 'wrCoach', 'teCoach', 'olCoach'].includes(role)) {
        return 'offensive_coordinator';
      }
      // Defensive position coaches
      return 'defensive_coordinator';
  }
}

/**
 * Gets interest color
 */
function getInterestColor(interest: 'high' | 'medium' | 'low'): string {
  switch (interest) {
    case 'high':
      return colors.success;
    case 'medium':
      return colors.warning;
    case 'low':
      return colors.error;
  }
}

/**
 * Formats salary for display
 */
function formatSalary(salary: number): string {
  if (salary >= 1000000) {
    return `$${(salary / 1000000).toFixed(1)}M`;
  }
  return `$${(salary / 1000).toFixed(0)}K`;
}

/**
 * Coach Candidate Card Component
 */
function CandidateCard({
  candidate,
  isSelected,
  onSelect,
  onHire,
}: {
  candidate: CoachCandidate;
  isSelected: boolean;
  onSelect: () => void;
  onHire: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.candidateCard, isSelected && styles.candidateCardSelected]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.candidateHeader}>
        <Avatar id={candidate.candidateId} size="md" age={candidate.age} context="coach" />
        <View style={styles.candidateInfo}>
          <View style={styles.candidateNameRow}>
            <Text style={styles.candidateName}>{candidate.name}</Text>
            <View
              style={[
                styles.interestBadge,
                { backgroundColor: getInterestColor(candidate.interestLevel) + '20' },
              ]}
            >
              <Text
                style={[styles.interestText, { color: getInterestColor(candidate.interestLevel) }]}
              >
                {candidate.interestLevel.charAt(0).toUpperCase() + candidate.interestLevel.slice(1)}{' '}
                Interest
              </Text>
            </View>
          </View>
          <Text style={styles.candidateRole}>
            {candidate.currentTeam
              ? `${candidate.currentRole} - ${candidate.currentTeam}`
              : candidate.currentRole}
            {!candidate.currentTeam && ' (Available)'}
          </Text>
        </View>
      </View>

      {/* Basic Info */}
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Age</Text>
          <Text style={styles.infoValue}>{candidate.age}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Experience</Text>
          <Text style={styles.infoValue}>{candidate.experience} yrs</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Scheme</Text>
          <Text style={styles.infoValue}>{candidate.scheme}</Text>
        </View>
      </View>

      {/* Expanded Content when selected */}
      {isSelected && (
        <View style={styles.expandedContent}>
          {/* Contract Expectations */}
          <View style={styles.contractSection}>
            <Text style={styles.sectionTitle}>Contract Expectations</Text>
            <View style={styles.contractDetails}>
              <View style={styles.contractItem}>
                <Text style={styles.contractLabel}>Salary</Text>
                <Text style={styles.contractValue}>
                  {formatSalary(candidate.expectedSalary)}/yr
                </Text>
              </View>
              <View style={styles.contractItem}>
                <Text style={styles.contractLabel}>Length</Text>
                <Text style={styles.contractValue}>{candidate.expectedYears} years</Text>
              </View>
              <View style={styles.contractItem}>
                <Text style={styles.contractLabel}>Total</Text>
                <Text style={styles.contractValue}>
                  {formatSalary(candidate.expectedSalary * candidate.expectedYears)}
                </Text>
              </View>
            </View>
          </View>

          {/* Strengths */}
          <View style={styles.traitsSection}>
            <Text style={styles.sectionTitle}>Strengths</Text>
            <View style={styles.traitsList}>
              {candidate.strengths.map((strength, i) => (
                <View key={i} style={styles.strengthBadge}>
                  <Text style={styles.strengthText}>+ {strength}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Weaknesses */}
          <View style={styles.traitsSection}>
            <Text style={styles.sectionTitle}>Concerns</Text>
            <View style={styles.traitsList}>
              {candidate.weaknesses.map((weakness, i) => (
                <View key={i} style={styles.weaknessBadge}>
                  <Text style={styles.weaknessText}>- {weakness}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Hire Button */}
          <TouchableOpacity style={styles.hireButton} onPress={onHire}>
            <Text style={styles.hireButtonText}>Hire {candidate.name.split(' ')[0]}</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

/**
 * Coach Hiring Screen Component
 */
export function CoachHiringScreen({
  vacancyRole,
  teamName,
  onBack,
  onHire,
}: CoachHiringScreenProps): React.JSX.Element {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  // Generate candidates for this role
  const candidateRole = mapRoleToCandidateRole(vacancyRole);
  const candidates = React.useMemo(
    () => generateCoachCandidates(candidateRole, 6),
    [candidateRole]
  );

  // Sort by interest level
  const sortedCandidates = [...candidates].sort((a, b) => {
    const interestOrder = { high: 0, medium: 1, low: 2 };
    return interestOrder[a.interestLevel] - interestOrder[b.interestLevel];
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Hire Coach</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Position Info */}
      <View style={styles.positionBanner}>
        <Text style={styles.positionTitle}>{getRoleDisplayName(vacancyRole)}</Text>
        <Text style={styles.positionSubtitle}>{teamName}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.sectionHeader}>Available Candidates</Text>
        <Text style={styles.sectionHint}>Tap a candidate to see details and make an offer</Text>

        {sortedCandidates.map((candidate) => (
          <CandidateCard
            key={candidate.candidateId}
            candidate={candidate}
            isSelected={selectedCandidateId === candidate.candidateId}
            onSelect={() =>
              setSelectedCandidateId(
                selectedCandidateId === candidate.candidateId ? null : candidate.candidateId
              )
            }
            onHire={() => onHire(candidate)}
          />
        ))}
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
  positionBanner: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  positionTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  positionSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  sectionHeader: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  candidateCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  candidateCardSelected: {
    borderColor: colors.primary,
  },
  candidateHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  candidateInfo: {
    flex: 1,
  },
  candidateNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  candidateName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  interestBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  interestText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  candidateRole: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  expandedContent: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  contractSection: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  contractDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  contractItem: {
    alignItems: 'center',
  },
  contractLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  contractValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  traitsSection: {
    marginBottom: spacing.md,
  },
  traitsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  strengthBadge: {
    backgroundColor: colors.success + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  strengthText: {
    fontSize: fontSize.sm,
    color: colors.success,
  },
  weaknessBadge: {
    backgroundColor: colors.error + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  weaknessText: {
    fontSize: fontSize.sm,
    color: colors.error,
  },
  hireButton: {
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  hireButtonText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});
