/**
 * StaffHiringScreen
 * Allows hiring coaching staff when starting a new game
 * Shows candidates for each position with chemistry preview
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../styles';
import { Coach } from '../core/models/staff/Coach';
import { CoachRole, COACH_SALARY_RANGES } from '../core/models/staff/StaffSalary';
import { getReputationTier, ReputationTier } from '../core/models/staff/CoachAttributes';
import { FakeCity, getFullTeamName } from '../core/models/team/FakeCities';
import {
  HiringCandidate,
  generateHiringCandidates,
} from '../core/coaching/NewGameCandidateGenerator';
import { getReputationDisplayName } from '../core/coaching/CoachWriteupGenerator';
import { CoachCard } from '../components/coach/CoachCard';

type HiringStep = 'headCoach' | 'offensiveCoordinator' | 'defensiveCoordinator' | 'review';

interface StaffHiringScreenProps {
  teamCity: FakeCity;
  staffBudget: number;
  currentYear: number;
  /** Former staff that was let go (available for rehire) */
  formerStaff?: Coach[];
  onComplete: (hiredStaff: {
    hc: HiringCandidate;
    oc: HiringCandidate;
    dc: HiringCandidate;
  }) => void;
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
 * Format money for display
 */
function formatMoney(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  return `$${(value / 1000).toFixed(0)}K`;
}

/**
 * Calculate chemistry between two coaches
 */
function calculatePairChemistry(coach1: Coach, coach2: Coach): number {
  let chemistry = 5; // Base chemistry

  // Same tree bonus
  if (coach1.tree.treeName === coach2.tree.treeName) {
    chemistry += 3;
  }

  // Personality synergy
  if (coach1.personality.synergizesWith.includes(coach2.personality.primary)) {
    chemistry += 2;
  }

  // Personality conflict
  if (coach1.personality.conflictsWith.includes(coach2.personality.primary)) {
    chemistry -= 3;
  }

  return Math.max(0, Math.min(10, chemistry));
}

/**
 * Get chemistry description
 */
function getChemistryInfo(chemistry: number): { label: string; color: string } {
  if (chemistry >= 8) {
    return { label: 'Excellent', color: colors.success };
  } else if (chemistry >= 6) {
    return { label: 'Good', color: colors.info };
  } else if (chemistry >= 4) {
    return { label: 'Fair', color: colors.warning };
  } else {
    return { label: 'Poor', color: colors.error };
  }
}

/**
 * Candidate Card Component
 */
function CandidateCard({
  candidate,
  isSelected,
  chemistryWithHC,
  onSelect,
  onViewDetails,
  disabled,
  disabledReason,
}: {
  candidate: HiringCandidate;
  isSelected: boolean;
  chemistryWithHC: number | null;
  onSelect: () => void;
  onViewDetails: () => void;
  disabled?: boolean;
  disabledReason?: string;
}): React.JSX.Element {
  const tier = getReputationTier(candidate.coach.attributes.reputation);
  const roleColor = getRoleColor(candidate.coach.role);
  const chemistryInfo = chemistryWithHC !== null ? getChemistryInfo(chemistryWithHC) : null;

  return (
    <TouchableOpacity
      style={[
        styles.candidateCard,
        isSelected && styles.candidateCardSelected,
        disabled && styles.candidateCardDisabled,
      ]}
      onPress={onSelect}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {/* Budget Warning Banner */}
      {disabled && disabledReason && (
        <View style={styles.disabledBanner}>
          <Text style={styles.disabledBannerText}>{disabledReason}</Text>
        </View>
      )}

      {/* Former Staff Badge */}
      {candidate.isFormerStaff && (
        <View style={styles.formerStaffBadge}>
          <Text style={styles.formerStaffText}>Former Staff</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.candidateHeader}>
        <View style={[styles.roleIcon, { backgroundColor: roleColor }]}>
          <Text style={styles.roleIconText}>
            {candidate.coach.role === 'headCoach'
              ? 'HC'
              : candidate.coach.role === 'offensiveCoordinator'
                ? 'OC'
                : 'DC'}
          </Text>
        </View>
        <View style={styles.candidateInfo}>
          <Text style={styles.candidateName}>
            {candidate.coach.firstName} {candidate.coach.lastName}
          </Text>
          <View style={styles.candidateMetaRow}>
            <Text style={styles.candidateMeta}>
              Age {candidate.coach.attributes.age} | {candidate.coach.attributes.yearsExperience}{' '}
              yrs exp
            </Text>
          </View>
        </View>
        <View style={[styles.reputationBadge, { borderColor: getReputationColor(tier) }]}>
          <Text style={[styles.reputationText, { color: getReputationColor(tier) }]}>
            {getReputationDisplayName(tier)}
          </Text>
        </View>
      </View>

      {/* Scheme & Tree */}
      <View style={styles.badgesRow}>
        <View style={styles.schemeBadge}>
          <Text style={styles.schemeBadgeText}>{candidate.schemeDisplay}</Text>
        </View>
        <View style={styles.treeBadge}>
          <Text style={styles.treeBadgeText}>{candidate.treeDisplay}</Text>
        </View>
        <View style={styles.personalityBadge}>
          <Text style={styles.personalityBadgeText}>{candidate.personalityDisplay}</Text>
        </View>
      </View>

      {/* Chemistry Preview (for coordinators) */}
      {chemistryInfo && (
        <View style={styles.chemistryRow}>
          <Text style={styles.chemistryLabel}>Chemistry with HC:</Text>
          <View style={[styles.chemistryBadge, { borderColor: chemistryInfo.color }]}>
            <Text style={[styles.chemistryText, { color: chemistryInfo.color }]}>
              {chemistryInfo.label}
            </Text>
          </View>
        </View>
      )}

      {/* Strengths Preview */}
      <View style={styles.strengthsRow}>
        {candidate.strengths.slice(0, 2).map((strength, index) => (
          <View key={index} style={styles.strengthBadge}>
            <Text style={styles.strengthText}>{strength}</Text>
          </View>
        ))}
      </View>

      {/* Salary */}
      <View style={styles.salaryRow}>
        <Text style={styles.salaryLabel}>Expected Salary:</Text>
        <Text style={styles.salaryValue}>{formatMoney(candidate.expectedSalary)}/yr</Text>
        <Text style={styles.salaryYears}>({candidate.expectedYears} years)</Text>
      </View>

      {/* Actions Row */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.detailsButton}
          onPress={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
        >
          <Text style={styles.detailsButtonText}>View Details</Text>
        </TouchableOpacity>
        {isSelected ? (
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedText}>Selected</Text>
          </View>
        ) : (
          <View style={styles.selectPrompt}>
            <Text style={styles.selectPromptText}>Tap to select</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

/**
 * Progress Step Component - now tappable to allow revision
 */
function ProgressStep({
  step,
  label,
  isActive,
  isComplete,
  selectedName,
  onPress,
  canTap,
}: {
  step: number;
  label: string;
  isActive: boolean;
  isComplete: boolean;
  selectedName?: string;
  onPress?: () => void;
  canTap?: boolean;
}): React.JSX.Element {
  const content = (
    <View style={[styles.progressStep, isActive && styles.progressStepActive]}>
      <View
        style={[
          styles.progressCircle,
          isActive && styles.progressCircleActive,
          isComplete && styles.progressCircleComplete,
          canTap && styles.progressCircleTappable,
        ]}
      >
        <Text
          style={[
            styles.progressNumber,
            isActive && styles.progressNumberActive,
            isComplete && styles.progressNumberComplete,
          ]}
        >
          {isComplete ? '✓' : step}
        </Text>
      </View>
      <Text style={[styles.progressLabel, isActive && styles.progressLabelActive]}>{label}</Text>
      {selectedName && (
        <Text style={styles.progressSelectedName} numberOfLines={1}>
          {selectedName}
        </Text>
      )}
      {canTap && !isActive && <Text style={styles.progressTapHint}>tap to edit</Text>}
    </View>
  );

  if (canTap && onPress && !isActive) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

/**
 * Review Staff Card Component
 */
function ReviewStaffCard({
  candidate,
  onViewDetails,
}: {
  candidate: HiringCandidate;
  onViewDetails: () => void;
}): React.JSX.Element {
  const tier = getReputationTier(candidate.coach.attributes.reputation);
  const roleColor = getRoleColor(candidate.coach.role);

  return (
    <TouchableOpacity style={styles.reviewCard} onPress={onViewDetails} activeOpacity={0.8}>
      <View style={[styles.reviewCardIcon, { backgroundColor: roleColor }]}>
        <Text style={styles.reviewCardIconText}>
          {candidate.coach.role === 'headCoach'
            ? 'HC'
            : candidate.coach.role === 'offensiveCoordinator'
              ? 'OC'
              : 'DC'}
        </Text>
      </View>
      <View style={styles.reviewCardInfo}>
        <Text style={styles.reviewCardName}>
          {candidate.coach.firstName} {candidate.coach.lastName}
        </Text>
        <Text style={styles.reviewCardRole}>{getRoleDisplayName(candidate.coach.role)}</Text>
        <View style={styles.reviewCardMeta}>
          <Text style={styles.reviewCardMetaText}>{candidate.schemeDisplay}</Text>
          <Text style={styles.reviewCardMetaDivider}>|</Text>
          <Text style={[styles.reviewCardMetaText, { color: getReputationColor(tier) }]}>
            {getReputationDisplayName(tier)}
          </Text>
        </View>
      </View>
      <View style={styles.reviewCardSalary}>
        <Text style={styles.reviewCardSalaryValue}>{formatMoney(candidate.expectedSalary)}</Text>
        <Text style={styles.reviewCardSalaryLabel}>per year</Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * StaffHiringScreen Component
 */
export function StaffHiringScreen({
  teamCity,
  staffBudget,
  currentYear,
  formerStaff = [],
  onComplete,
  onBack,
}: StaffHiringScreenProps): React.JSX.Element {
  const [step, setStep] = useState<HiringStep>('headCoach');
  const [selectedHC, setSelectedHC] = useState<HiringCandidate | null>(null);
  const [selectedOC, setSelectedOC] = useState<HiringCandidate | null>(null);
  const [selectedDC, setSelectedDC] = useState<HiringCandidate | null>(null);
  const [viewingCoach, setViewingCoach] = useState<Coach | null>(null);

  // Generate candidates for each role
  const hcCandidates = useMemo(
    () =>
      generateHiringCandidates('headCoach', {
        count: 7,
        existingStaff: formerStaff,
        currentYear,
      }),
    [formerStaff, currentYear]
  );

  const ocCandidates = useMemo(
    () =>
      generateHiringCandidates('offensiveCoordinator', {
        count: 7,
        existingStaff: formerStaff,
        currentYear,
      }),
    [formerStaff, currentYear]
  );

  const dcCandidates = useMemo(
    () =>
      generateHiringCandidates('defensiveCoordinator', {
        count: 7,
        existingStaff: formerStaff,
        currentYear,
      }),
    [formerStaff, currentYear]
  );

  // Calculate budget usage
  const usedBudget =
    (selectedHC?.expectedSalary || 0) +
    (selectedOC?.expectedSalary || 0) +
    (selectedDC?.expectedSalary || 0);
  const remainingBudget = staffBudget - usedBudget;
  const budgetUsagePercent = Math.round((usedBudget / staffBudget) * 100);

  // Minimum required for remaining positions
  const getMinRemainingBudget = useCallback(() => {
    let min = 0;
    if (!selectedHC) min += COACH_SALARY_RANGES.headCoach.min;
    if (!selectedOC) min += COACH_SALARY_RANGES.offensiveCoordinator.min;
    if (!selectedDC) min += COACH_SALARY_RANGES.defensiveCoordinator.min;
    return min;
  }, [selectedHC, selectedOC, selectedDC]);

  // Check if candidate fits in budget
  const canAfford = useCallback(
    (candidate: HiringCandidate) => {
      const otherMinRequired =
        getMinRemainingBudget() - COACH_SALARY_RANGES[candidate.coach.role].min;
      return candidate.expectedSalary <= remainingBudget - otherMinRequired;
    },
    [remainingBudget, getMinRemainingBudget]
  );

  // Get current candidates and selection based on step
  const getCurrentCandidates = () => {
    switch (step) {
      case 'headCoach':
        return hcCandidates;
      case 'offensiveCoordinator':
        return ocCandidates;
      case 'defensiveCoordinator':
        return dcCandidates;
      default:
        return [];
    }
  };

  const getCurrentSelection = () => {
    switch (step) {
      case 'headCoach':
        return selectedHC;
      case 'offensiveCoordinator':
        return selectedOC;
      case 'defensiveCoordinator':
        return selectedDC;
      default:
        return null;
    }
  };

  const setCurrentSelection = (candidate: HiringCandidate) => {
    switch (step) {
      case 'headCoach':
        setSelectedHC(candidate);
        break;
      case 'offensiveCoordinator':
        setSelectedOC(candidate);
        break;
      case 'defensiveCoordinator':
        setSelectedDC(candidate);
        break;
    }
  };

  // Navigation
  const handleNext = () => {
    switch (step) {
      case 'headCoach':
        setStep('offensiveCoordinator');
        break;
      case 'offensiveCoordinator':
        setStep('defensiveCoordinator');
        break;
      case 'defensiveCoordinator':
        setStep('review');
        break;
      case 'review':
        if (selectedHC && selectedOC && selectedDC) {
          onComplete({ hc: selectedHC, oc: selectedOC, dc: selectedDC });
        }
        break;
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'headCoach':
        onBack();
        break;
      case 'offensiveCoordinator':
        setStep('headCoach');
        break;
      case 'defensiveCoordinator':
        setStep('offensiveCoordinator');
        break;
      case 'review':
        setStep('defensiveCoordinator');
        break;
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'headCoach':
        return selectedHC !== null;
      case 'offensiveCoordinator':
        return selectedOC !== null;
      case 'defensiveCoordinator':
        return selectedDC !== null;
      case 'review':
        return selectedHC && selectedOC && selectedDC;
    }
  };

  const renderCandidateList = () => {
    const candidates = getCurrentCandidates();
    const currentSelection = getCurrentSelection();

    return (
      <ScrollView style={styles.candidateList} contentContainerStyle={styles.candidateListContent}>
        {candidates.map((candidate, index) => {
          const affordable = canAfford(candidate);
          const chemistryWithHC =
            selectedHC && step !== 'headCoach'
              ? calculatePairChemistry(selectedHC.coach, candidate.coach)
              : null;

          // Calculate how much over budget this candidate is
          const getDisabledReason = (): string | undefined => {
            if (affordable) return undefined;
            const overBudget = candidate.expectedSalary - remainingBudget;
            return `Exceeds budget by ${formatMoney(overBudget)}`;
          };

          return (
            <CandidateCard
              key={candidate.coach.id || index}
              candidate={candidate}
              isSelected={currentSelection?.coach.id === candidate.coach.id}
              chemistryWithHC={chemistryWithHC}
              onSelect={() => setCurrentSelection(candidate)}
              onViewDetails={() => setViewingCoach(candidate.coach)}
              disabled={!affordable}
              disabledReason={getDisabledReason()}
            />
          );
        })}
      </ScrollView>
    );
  };

  const renderReview = () => {
    if (!selectedHC || !selectedOC || !selectedDC) return null;

    const hcOcChemistry = calculatePairChemistry(selectedHC.coach, selectedOC.coach);
    const hcDcChemistry = calculatePairChemistry(selectedHC.coach, selectedDC.coach);
    const avgChemistry = Math.round((hcOcChemistry + hcDcChemistry) / 2);
    const chemistryInfo = getChemistryInfo(avgChemistry);

    return (
      <ScrollView style={styles.reviewContainer} contentContainerStyle={styles.reviewContent}>
        <Text style={styles.reviewTitle}>Your Coaching Staff</Text>

        <ReviewStaffCard
          candidate={selectedHC}
          onViewDetails={() => setViewingCoach(selectedHC.coach)}
        />
        <ReviewStaffCard
          candidate={selectedOC}
          onViewDetails={() => setViewingCoach(selectedOC.coach)}
        />
        <ReviewStaffCard
          candidate={selectedDC}
          onViewDetails={() => setViewingCoach(selectedDC.coach)}
        />

        {/* Chemistry Summary */}
        <View style={styles.reviewChemistry}>
          <Text style={styles.reviewChemistryTitle}>Staff Chemistry</Text>
          <View style={styles.reviewChemistryContent}>
            <View style={styles.reviewChemistryBar}>
              <View
                style={[
                  styles.reviewChemistryFill,
                  { width: `${avgChemistry * 10}%`, backgroundColor: chemistryInfo.color },
                ]}
              />
            </View>
            <View style={[styles.reviewChemistryBadge, { borderColor: chemistryInfo.color }]}>
              <Text style={[styles.reviewChemistryLabel, { color: chemistryInfo.color }]}>
                {chemistryInfo.label}
              </Text>
            </View>
          </View>
          <Text style={styles.reviewChemistryDetail}>
            HC-OC: {getChemistryInfo(hcOcChemistry).label} | HC-DC:{' '}
            {getChemistryInfo(hcDcChemistry).label}
          </Text>
        </View>

        {/* Total Salary */}
        <View style={styles.reviewSalary}>
          <View style={styles.reviewSalaryRow}>
            <Text style={styles.reviewSalaryLabel}>Total Annual Salary:</Text>
            <Text style={styles.reviewSalaryValue}>{formatMoney(usedBudget)}</Text>
          </View>
          <View style={styles.reviewSalaryRow}>
            <Text style={styles.reviewSalaryLabel}>Budget Remaining:</Text>
            <Text style={[styles.reviewSalaryValue, { color: colors.success }]}>
              {formatMoney(remainingBudget)}
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hire Staff</Text>
        <View style={styles.backButton} />
      </View>

      {/* Team Banner */}
      <View style={styles.teamBanner}>
        <Text style={styles.teamName}>{getFullTeamName(teamCity)}</Text>
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <ProgressStep
          step={1}
          label="HC"
          isActive={step === 'headCoach'}
          isComplete={selectedHC !== null && step !== 'headCoach'}
          selectedName={
            selectedHC
              ? `${selectedHC.coach.firstName[0]}. ${selectedHC.coach.lastName}`
              : undefined
          }
          canTap={selectedHC !== null && step !== 'headCoach'}
          onPress={() => setStep('headCoach')}
        />
        <View style={styles.progressLine} />
        <ProgressStep
          step={2}
          label="OC"
          isActive={step === 'offensiveCoordinator'}
          isComplete={selectedOC !== null && step !== 'offensiveCoordinator'}
          selectedName={
            selectedOC
              ? `${selectedOC.coach.firstName[0]}. ${selectedOC.coach.lastName}`
              : undefined
          }
          canTap={selectedOC !== null && step !== 'offensiveCoordinator'}
          onPress={() => setStep('offensiveCoordinator')}
        />
        <View style={styles.progressLine} />
        <ProgressStep
          step={3}
          label="DC"
          isActive={step === 'defensiveCoordinator'}
          isComplete={selectedDC !== null && step !== 'defensiveCoordinator'}
          selectedName={
            selectedDC
              ? `${selectedDC.coach.firstName[0]}. ${selectedDC.coach.lastName}`
              : undefined
          }
          canTap={selectedDC !== null && step !== 'defensiveCoordinator'}
          onPress={() => setStep('defensiveCoordinator')}
        />
        <View style={styles.progressLine} />
        <ProgressStep step={4} label="Review" isActive={step === 'review'} isComplete={false} />
      </View>

      {/* Budget Bar */}
      <View style={styles.budgetContainer}>
        <View style={styles.budgetHeader}>
          <Text style={styles.budgetLabel}>Staff Budget</Text>
          <Text style={styles.budgetValue}>
            {formatMoney(usedBudget)} / {formatMoney(staffBudget)}
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
        <View style={styles.budgetFooter}>
          <Text style={styles.budgetPercent}>{budgetUsagePercent}% used</Text>
          <Text style={styles.budgetRemaining}>{formatMoney(remainingBudget)} remaining</Text>
        </View>
      </View>

      {/* Step Title */}
      {step !== 'review' && (
        <View style={styles.stepTitleContainer}>
          <Text style={styles.stepTitle}>Select {getRoleDisplayName(step as CoachRole)}</Text>
          <Text style={styles.stepSubtitle}>
            Choose from {getCurrentCandidates().length} candidates
          </Text>
        </View>
      )}

      {/* Content */}
      {step === 'review' ? renderReview() : renderCandidateList()}

      {/* Bottom Actions */}
      <View style={styles.bottomPanel}>
        <TouchableOpacity
          style={[styles.nextButton, !canProceed() && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!canProceed()}
          activeOpacity={0.8}
        >
          <Text style={[styles.nextButtonText, !canProceed() && styles.nextButtonTextDisabled]}>
            {step === 'review' ? 'Confirm & Start Game' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Coach Detail Modal */}
      {viewingCoach && (
        <CoachCard
          coach={viewingCoach}
          currentYear={currentYear}
          onClose={() => setViewingCoach(null)}
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
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  teamName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressStep: {
    alignItems: 'center',
    width: 60,
  },
  progressStepActive: {},
  progressCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCircleActive: {
    backgroundColor: colors.primary,
  },
  progressCircleComplete: {
    backgroundColor: colors.success,
  },
  progressNumber: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  progressNumberActive: {
    color: colors.textOnPrimary,
  },
  progressNumberComplete: {
    color: colors.textOnPrimary,
  },
  progressLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    fontWeight: fontWeight.medium,
  },
  progressLabelActive: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  progressSelectedName: {
    fontSize: 10,
    color: colors.textLight,
    marginTop: spacing.xxs,
    maxWidth: 60,
    textAlign: 'center',
  },
  progressTapHint: {
    fontSize: 9,
    color: colors.primary,
    marginTop: spacing.xxs,
    fontWeight: fontWeight.medium,
  },
  progressCircleTappable: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  progressLine: {
    width: 24,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
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
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  budgetPercent: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  budgetRemaining: {
    fontSize: fontSize.xs,
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
  stepTitleContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  stepTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  stepSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  candidateList: {
    flex: 1,
  },
  candidateListContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  candidateCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  candidateCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08',
  },
  candidateCardDisabled: {
    opacity: 0.6,
  },
  disabledBanner: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderTopLeftRadius: borderRadius.lg - 2,
    borderTopRightRadius: borderRadius.lg - 2,
    marginTop: -spacing.md,
    marginHorizontal: -spacing.md,
    marginBottom: spacing.sm,
  },
  disabledBannerText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
    textAlign: 'center',
  },
  formerStaffBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.info,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  formerStaffText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  candidateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  roleIcon: {
    width: 44,
    height: 44,
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
  candidateInfo: {
    flex: 1,
  },
  candidateName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  candidateMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxs,
  },
  candidateMeta: {
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
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  schemeBadge: {
    backgroundColor: colors.secondary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  schemeBadgeText: {
    fontSize: fontSize.xs,
    color: colors.secondary,
    fontWeight: fontWeight.medium,
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
  chemistryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  chemistryLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  chemistryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  chemistryText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  strengthsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
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
  salaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: spacing.sm,
  },
  salaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  salaryValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  salaryYears: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginLeft: spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
  },
  detailsButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  selectedBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  selectedText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  selectPrompt: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectPromptText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  reviewContainer: {
    flex: 1,
  },
  reviewContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  reviewTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  reviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  reviewCardIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  reviewCardIconText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  reviewCardInfo: {
    flex: 1,
  },
  reviewCardName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  reviewCardRole: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  reviewCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxs,
  },
  reviewCardMetaText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  reviewCardMetaDivider: {
    marginHorizontal: spacing.xs,
    color: colors.border,
  },
  reviewCardSalary: {
    alignItems: 'flex-end',
  },
  reviewCardSalaryValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  reviewCardSalaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  reviewChemistry: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  reviewChemistryTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  reviewChemistryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  reviewChemistryBar: {
    flex: 1,
    height: 12,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  reviewChemistryFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  reviewChemistryBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  reviewChemistryLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  reviewChemistryDetail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  reviewSalary: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  reviewSalaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reviewSalaryLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  reviewSalaryValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  bottomPanel: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
  nextButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.md,
  },
  nextButtonDisabled: {
    backgroundColor: colors.border,
  },
  nextButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  nextButtonTextDisabled: {
    color: colors.textSecondary,
  },
});

export default StaffHiringScreen;
