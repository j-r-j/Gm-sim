/**
 * CoachHiringScreen
 * Allows GMs to hire coaches for vacant positions
 * Uses the full HiringCandidate system with budget validation and narrative tags
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles';
import { CoachRole } from '../core/models/staff/StaffSalary';
import { Avatar } from '../components/avatar';
import { HiringCandidate, CandidateTag } from '../core/coaching/NewGameCandidateGenerator';

/**
 * Props for CoachHiringScreen
 */
export interface CoachHiringScreenProps {
  vacancyRole: CoachRole;
  teamName: string;
  candidates: HiringCandidate[];
  coachingBudgetRemaining?: number;
  onBack: () => void;
  onHire: (candidate: HiringCandidate) => void;
}

/**
 * Gets display name for coach role
 */
function getRoleDisplayName(role: CoachRole): string {
  const displayNames: Record<CoachRole, string> = {
    headCoach: 'Head Coach',
    offensiveCoordinator: 'Offensive Coordinator',
    defensiveCoordinator: 'Defensive Coordinator',
  };
  return displayNames[role];
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
 * Gets tag styling based on sentiment
 */
function getTagColors(sentiment: CandidateTag['sentiment']): {
  bg: string;
  border: string;
  text: string;
} {
  switch (sentiment) {
    case 'positive':
      return {
        bg: colors.success + '15',
        border: colors.success + '30',
        text: colors.success,
      };
    case 'negative':
      return {
        bg: colors.error + '15',
        border: colors.error + '30',
        text: colors.error,
      };
    case 'warning':
      return {
        bg: colors.warning + '15',
        border: colors.warning + '30',
        text: colors.warning,
      };
    case 'neutral':
      return {
        bg: colors.textSecondary + '15',
        border: colors.textSecondary + '30',
        text: colors.textSecondary,
      };
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
 * Tag Badge Component
 */
function TagBadge({ tag }: { tag: CandidateTag }): React.JSX.Element {
  const tagColors = getTagColors(tag.sentiment);
  return (
    <View
      style={[styles.tagBadge, { backgroundColor: tagColors.bg, borderColor: tagColors.border }]}
    >
      <Text style={[styles.tagText, { color: tagColors.text }]}>{tag.label}</Text>
    </View>
  );
}

/**
 * Coach Candidate Card Component
 */
function CandidateCard({
  candidate,
  isSelected,
  isOverBudget,
  onSelect,
  onHire,
}: {
  candidate: HiringCandidate;
  isSelected: boolean;
  isOverBudget: boolean;
  onSelect: () => void;
  onHire: () => void;
}): React.JSX.Element {
  const coachName = `${candidate.coach.firstName} ${candidate.coach.lastName}`;

  return (
    <TouchableOpacity
      style={[
        styles.candidateCard,
        isSelected && styles.candidateCardSelected,
        isOverBudget && styles.candidateCardOverBudget,
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.candidateHeader}>
        <Avatar
          id={candidate.coach.id}
          size="md"
          age={candidate.coach.attributes.age}
          context="coach"
        />
        <View style={styles.candidateInfo}>
          <View style={styles.candidateNameRow}>
            <Text style={styles.candidateName}>{coachName}</Text>
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
            {candidate.reputationDisplay} | {candidate.treeDisplay} Tree
          </Text>
          <Text style={styles.candidateSalary}>
            {formatSalary(candidate.expectedSalary)}/yr
            {isOverBudget && <Text style={styles.overBudgetInline}> - Over Budget</Text>}
          </Text>
        </View>
      </View>

      {/* Tags Row (always visible if there are tags) */}
      {candidate.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {candidate.tags.map((tag, i) => (
            <TagBadge key={i} tag={tag} />
          ))}
        </View>
      )}

      {/* Basic Info */}
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Age</Text>
          <Text style={styles.infoValue}>{candidate.coach.attributes.age}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Experience</Text>
          <Text style={styles.infoValue}>{candidate.coach.attributes.yearsExperience} yrs</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Scheme</Text>
          <Text style={styles.infoValue}>{candidate.schemeDisplay}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Personality</Text>
          <Text style={styles.infoValue}>{candidate.personalityDisplay}</Text>
        </View>
      </View>

      {/* Expanded Content when selected */}
      {isSelected && (
        <View style={styles.expandedContent}>
          {/* Writeup */}
          <View style={styles.writeupSection}>
            <Text style={styles.sectionTitle}>Scout Report</Text>
            <Text style={styles.writeupText}>{candidate.writeup}</Text>
          </View>

          {/* Tag Descriptions */}
          {candidate.tags.length > 0 && (
            <View style={styles.tagDescriptionsSection}>
              {candidate.tags.map((tag, i) => {
                const tagColors = getTagColors(tag.sentiment);
                return (
                  <View key={i} style={styles.tagDescriptionRow}>
                    <Text style={[styles.tagDescriptionLabel, { color: tagColors.text }]}>
                      {tag.label}:
                    </Text>
                    <Text style={styles.tagDescriptionText}>{tag.description}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Contract Expectations */}
          <View style={styles.contractSection}>
            <Text style={styles.sectionTitle}>Contract Expectations</Text>
            <View style={styles.contractDetails}>
              <View style={styles.contractItem}>
                <Text style={styles.contractLabel}>Salary</Text>
                <Text
                  style={[styles.contractValue, isOverBudget && styles.contractValueOverBudget]}
                >
                  {formatSalary(candidate.expectedSalary)}/yr
                </Text>
              </View>
              <View style={styles.contractItem}>
                <Text style={styles.contractLabel}>Length</Text>
                <Text style={styles.contractValue}>{candidate.expectedYears} years</Text>
              </View>
              <View style={styles.contractItem}>
                <Text style={styles.contractLabel}>Total</Text>
                <Text
                  style={[styles.contractValue, isOverBudget && styles.contractValueOverBudget]}
                >
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
          {isOverBudget ? (
            <View style={styles.hireButtonDisabled}>
              <Text style={styles.hireButtonDisabledText}>
                Cannot Afford ({formatSalary(candidate.expectedSalary)}/yr)
              </Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.hireButton} onPress={onHire}>
              <Text style={styles.hireButtonText}>Hire {candidate.coach.firstName}</Text>
            </TouchableOpacity>
          )}
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
  candidates,
  coachingBudgetRemaining,
  onBack,
  onHire,
}: CoachHiringScreenProps): React.JSX.Element {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  // Count affordable vs unaffordable
  const affordableCount =
    coachingBudgetRemaining !== undefined
      ? candidates.filter((c) => c.expectedSalary <= coachingBudgetRemaining).length
      : candidates.length;

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
        {coachingBudgetRemaining !== undefined && (
          <Text style={styles.budgetText}>
            Coaching Budget: {formatSalary(coachingBudgetRemaining)} remaining
          </Text>
        )}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.sectionHeader}>Available Candidates</Text>
        <Text style={styles.sectionHint}>
          {affordableCount < candidates.length
            ? `${affordableCount} of ${candidates.length} candidates within your budget. Tap to see details.`
            : 'Tap a candidate to see details and make an offer'}
        </Text>

        {candidates.map((candidate) => {
          const isOverBudget =
            coachingBudgetRemaining !== undefined &&
            candidate.expectedSalary > coachingBudgetRemaining;

          return (
            <CandidateCard
              key={candidate.coach.id}
              candidate={candidate}
              isSelected={selectedCandidateId === candidate.coach.id}
              isOverBudget={isOverBudget}
              onSelect={() =>
                setSelectedCandidateId(
                  selectedCandidateId === candidate.coach.id ? null : candidate.coach.id
                )
              }
              onHire={() => onHire(candidate)}
            />
          );
        })}
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
  budgetText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
  candidateCardOverBudget: {
    opacity: 0.7,
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
    flex: 1,
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
  candidateSalary: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  overBudgetInline: {
    color: colors.error,
    fontWeight: fontWeight.semibold,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  tagBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  tagText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
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
  writeupSection: {
    marginBottom: spacing.md,
  },
  writeupText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  tagDescriptionsSection: {
    marginBottom: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  tagDescriptionRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
  },
  tagDescriptionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginRight: spacing.xs,
  },
  tagDescriptionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
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
  contractValueOverBudget: {
    color: colors.error,
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
  hireButtonDisabled: {
    backgroundColor: colors.border,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  hireButtonDisabledText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});
