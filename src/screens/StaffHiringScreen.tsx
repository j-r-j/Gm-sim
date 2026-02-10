/**
 * StaffHiringScreen
 *
 * Professional-grade coaching staff hiring flow for new game setup.
 *
 * UX Principles Applied:
 * - Football-first mental model (schemes, trees, chemistry explained in football terms)
 * - Information hierarchy (identity → scheme → chemistry → cost)
 * - Decision velocity (best fit indicators, sorting, clear primary action)
 * - Simulation transparency (expandable "Why?" panels for chemistry)
 * - High-density data without overwhelm (progressive disclosure)
 */

import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../styles';
import { ScreenHeader } from '../components';
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

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type HiringStep = 'headCoach' | 'offensiveCoordinator' | 'defensiveCoordinator' | 'review';
type SortOption = 'recommended' | 'salary_low' | 'salary_high' | 'reputation';

interface StaffHiringScreenProps {
  teamCity: FakeCity;
  staffBudget: number;
  currentYear: number;
  formerStaff?: Coach[];
  onComplete: (hiredStaff: {
    hc: HiringCandidate;
    oc: HiringCandidate;
    dc: HiringCandidate;
  }) => void;
  onBack: () => void;
}

// ============================================================================
// CONSTANTS & HELPERS
// ============================================================================

const REPUTATION_CONFIG: Record<ReputationTier, { color: string; icon: string; rank: number }> = {
  legendary: { color: '#F59E0B', icon: '★', rank: 4 },
  elite: { color: '#10B981', icon: '◆', rank: 3 },
  established: { color: '#3B82F6', icon: '●', rank: 2 },
  rising: { color: '#8B5CF6', icon: '▲', rank: 1 },
  unknown: { color: '#6B7280', icon: '○', rank: 0 },
};

const ROLE_CONFIG: Record<CoachRole, { color: string; abbrev: string; label: string }> = {
  headCoach: { color: colors.primary, abbrev: 'HC', label: 'Head Coach' },
  offensiveCoordinator: { color: '#10B981', abbrev: 'OC', label: 'Offensive Coordinator' },
  defensiveCoordinator: { color: '#EF4444', abbrev: 'DC', label: 'Defensive Coordinator' },
};

function formatMoney(value: number): string {
  // Values are stored in thousands (e.g., 30000 = $30 million)
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}M`;
  }
  return `$${value.toFixed(0)}K`;
}

/**
 * Converts salary from actual dollars to thousands (budget units).
 * Coach salaries are stored in actual dollars (e.g., 8_000_000 = $8M)
 * but the budget system uses thousands (e.g., 30000 = $30M).
 */
function salaryToThousands(salary: number): number {
  return salary / 1000;
}

// ============================================================================
// CHEMISTRY SYSTEM (with explainability)
// ============================================================================

interface ChemistryBreakdown {
  total: number;
  factors: { label: string; value: number; explanation: string }[];
  rating: 'excellent' | 'good' | 'fair' | 'poor';
  color: string;
}

function calculateChemistryBreakdown(hc: Coach, coordinator: Coach): ChemistryBreakdown {
  const factors: { label: string; value: number; explanation: string }[] = [];
  let total = 5; // Base chemistry

  // Same coaching tree
  if (hc.tree.treeName === coordinator.tree.treeName) {
    factors.push({
      label: 'Same Coaching Tree',
      value: 3,
      explanation: `Both from the ${hc.tree.treeName} tree - shared philosophy and terminology`,
    });
    total += 3;
  }

  // Personality synergy
  if (hc.personality.synergizesWith.includes(coordinator.personality.primary)) {
    factors.push({
      label: 'Personality Synergy',
      value: 2,
      explanation: `${hc.personality.primary} HC works well with ${coordinator.personality.primary} coordinators`,
    });
    total += 2;
  }

  // Personality conflict
  if (hc.personality.conflictsWith.includes(coordinator.personality.primary)) {
    factors.push({
      label: 'Personality Conflict',
      value: -3,
      explanation: `${hc.personality.primary} HC often clashes with ${coordinator.personality.primary} personalities`,
    });
    total -= 3;
  }

  // If no modifiers, note base chemistry
  if (factors.length === 0) {
    factors.push({
      label: 'Neutral Fit',
      value: 0,
      explanation: 'No strong synergies or conflicts - professional working relationship',
    });
  }

  total = Math.max(0, Math.min(10, total));

  let rating: ChemistryBreakdown['rating'];
  let color: string;
  if (total >= 8) {
    rating = 'excellent';
    color = colors.success;
  } else if (total >= 6) {
    rating = 'good';
    color = colors.info;
  } else if (total >= 4) {
    rating = 'fair';
    color = colors.warning;
  } else {
    rating = 'poor';
    color = colors.error;
  }

  return { total, factors, rating, color };
}

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================

/**
 * ChemistryIndicator - Shows chemistry rating with optional expandable explanation
 */
const ChemistryIndicator = memo(function ChemistryIndicator({
  breakdown,
  expanded,
  onToggle,
}: {
  breakdown: ChemistryBreakdown;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const ratingLabels = { excellent: 'Excellent', good: 'Good', fair: 'Fair', poor: 'Poor' };

  return (
    <View style={styles.chemistryContainer}>
      <Pressable
        style={styles.chemistryHeader}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`Chemistry: ${ratingLabels[breakdown.rating]}. ${onToggle ? 'Tap to see details' : ''}`}
        accessibilityHint={onToggle ? 'Shows breakdown of chemistry factors' : undefined}
      >
        <Text style={styles.chemistryLabel}>HC Chemistry</Text>
        <View style={styles.chemistryRating}>
          <View style={[styles.chemistryDot, { backgroundColor: breakdown.color }]} />
          <Text style={[styles.chemistryValue, { color: breakdown.color }]}>
            {ratingLabels[breakdown.rating]}
          </Text>
          {onToggle && <Text style={styles.chemistryExpandIcon}>{expanded ? '▼' : '▶'}</Text>}
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.chemistryBreakdown}>
          <Text style={styles.chemistryBreakdownTitle}>Chemistry Factors</Text>
          {breakdown.factors.map((factor, idx) => (
            <View key={idx} style={styles.chemistryFactor}>
              <View style={styles.chemistryFactorHeader}>
                <Text style={styles.chemistryFactorLabel}>{factor.label}</Text>
                <Text
                  style={[
                    styles.chemistryFactorValue,
                    {
                      color:
                        factor.value > 0
                          ? colors.success
                          : factor.value < 0
                            ? colors.error
                            : colors.textSecondary,
                    },
                  ]}
                >
                  {factor.value > 0 ? '+' : ''}
                  {factor.value}
                </Text>
              </View>
              <Text style={styles.chemistryFactorExplanation}>{factor.explanation}</Text>
            </View>
          ))}
          <View style={styles.chemistryImpact}>
            <Text style={styles.chemistryImpactLabel}>In-Game Impact:</Text>
            <Text style={styles.chemistryImpactText}>
              {breakdown.rating === 'excellent' &&
                'Coordinators perform at peak. Rare disagreements.'}
              {breakdown.rating === 'good' && 'Solid communication. Minor friction under pressure.'}
              {breakdown.rating === 'fair' &&
                'Functional but strained. May affect big-game decisions.'}
              {breakdown.rating === 'poor' && 'Frequent conflicts. Risk of mid-season departure.'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
});

/**
 * BestFitBadge - Indicates recommended/best value candidates
 */
const BestFitBadge = memo(function BestFitBadge({
  type,
}: {
  type: 'top_pick' | 'best_value' | 'best_chemistry';
}) {
  const config = {
    top_pick: { label: 'Top Pick', color: colors.warning, icon: '★' },
    best_value: { label: 'Best Value', color: colors.success, icon: '$' },
    best_chemistry: { label: 'Best Chemistry', color: colors.info, icon: '♦' },
  };

  const { label, color, icon } = config[type];

  return (
    <View style={[styles.bestFitBadge, { backgroundColor: color }]} accessibilityLabel={label}>
      <Text style={styles.bestFitIcon}>{icon}</Text>
      <Text style={styles.bestFitLabel}>{label}</Text>
    </View>
  );
});

/**
 * SortControls - Sorting options for candidate list
 */
const SortControls = memo(function SortControls({
  currentSort,
  onSortChange,
}: {
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
}) {
  const options: { key: SortOption; label: string; show: boolean }[] = [
    { key: 'recommended', label: 'Recommended', show: true },
    { key: 'salary_low', label: 'Salary ↓', show: true },
    { key: 'salary_high', label: 'Salary ↑', show: true },
    { key: 'reputation', label: 'Reputation', show: true },
  ];

  return (
    <View style={styles.sortContainer}>
      <Text style={styles.sortLabel}>Sort:</Text>
      <View style={styles.sortOptions}>
        {options
          .filter((o) => o.show)
          .map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[styles.sortOption, currentSort === option.key && styles.sortOptionActive]}
              onPress={() => onSortChange(option.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: currentSort === option.key }}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  currentSort === option.key && styles.sortOptionTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
      </View>
    </View>
  );
});

/**
 * BudgetContext - Shows remaining budget with context for other hires
 */
const BudgetContext = memo(function BudgetContext({
  used,
  total,
  remainingHires,
}: {
  used: number;
  total: number;
  remainingHires: { role: CoachRole; minCost: number }[];
}) {
  const remaining = total - used;
  const minNeeded = remainingHires.reduce((sum, h) => sum + h.minCost, 0);
  const flexibleBudget = remaining - minNeeded;
  const usagePercent = Math.round((used / total) * 100);
  const isConstrained = flexibleBudget < 500000;

  return (
    <View style={styles.budgetContext}>
      <View style={styles.budgetHeader}>
        <Text style={styles.budgetTitle}>Staff Budget</Text>
        <Text style={styles.budgetAmount}>
          {formatMoney(used)} / {formatMoney(total)}
        </Text>
      </View>
      <View style={styles.budgetBarBg}>
        <View
          style={[
            styles.budgetBarFill,
            {
              width: `${Math.min(100, usagePercent)}%`,
              backgroundColor: isConstrained ? colors.warning : colors.success,
            },
          ]}
        />
      </View>
      {remainingHires.length > 0 && (
        <View style={styles.budgetBreakdown}>
          <Text style={styles.budgetBreakdownLabel}>
            Flexible: {formatMoney(Math.max(0, flexibleBudget))}
          </Text>
          <Text style={styles.budgetBreakdownHint}>
            (after min {remainingHires.map((h) => ROLE_CONFIG[h.role].abbrev).join(' + ')} salaries)
          </Text>
        </View>
      )}
    </View>
  );
});

/**
 * CandidateCard - Redesigned with proper information hierarchy
 */
const CandidateCard = memo(function CandidateCard({
  candidate,
  isSelected,
  chemistryBreakdown,
  onSelect,
  onViewDetails,
  disabled,
  disabledReason,
  bestFitType,
  showChemistry,
}: {
  candidate: HiringCandidate;
  isSelected: boolean;
  chemistryBreakdown: ChemistryBreakdown | null;
  onSelect: () => void;
  onViewDetails: () => void;
  disabled?: boolean;
  disabledReason?: string;
  bestFitType?: 'top_pick' | 'best_value' | 'best_chemistry';
  showChemistry: boolean;
}) {
  const [chemistryExpanded, setChemistryExpanded] = useState(false);
  const tier = getReputationTier(candidate.coach.attributes.reputation);
  const repConfig = REPUTATION_CONFIG[tier];
  const roleConfig = ROLE_CONFIG[candidate.coach.role];

  const handleChemistryToggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setChemistryExpanded((prev) => !prev);
  }, []);

  return (
    <Pressable
      style={[styles.card, isSelected && styles.cardSelected, disabled && styles.cardDisabled]}
      onPress={disabled ? undefined : onSelect}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, disabled }}
      accessibilityLabel={`${candidate.coach.firstName} ${candidate.coach.lastName}, ${roleConfig.label}, ${getReputationDisplayName(tier)} reputation, ${formatMoney(salaryToThousands(candidate.expectedSalary))} per year`}
    >
      {/* Disabled Banner */}
      {disabled && disabledReason && (
        <View style={styles.disabledBanner}>
          <Text style={styles.disabledIcon}>⚠</Text>
          <Text style={styles.disabledText}>{disabledReason}</Text>
        </View>
      )}

      {/* Best Fit Badge */}
      {bestFitType && !disabled && (
        <View style={styles.bestFitPosition}>
          <BestFitBadge type={bestFitType} />
        </View>
      )}

      {/* Former Staff Badge */}
      {candidate.isFormerStaff && (
        <View style={styles.formerBadge}>
          <Text style={styles.formerBadgeText}>Former Staff</Text>
        </View>
      )}

      {/* === TIER 1: Identity === */}
      <View style={styles.cardIdentity}>
        <View style={[styles.roleIcon, { backgroundColor: roleConfig.color }]}>
          <Text style={styles.roleIconText}>{roleConfig.abbrev}</Text>
        </View>
        <View style={styles.cardNameBlock}>
          <Text style={styles.cardName}>
            {candidate.coach.firstName} {candidate.coach.lastName}
          </Text>
          <Text style={styles.cardMeta}>
            {candidate.coach.attributes.age} yrs old · {candidate.coach.attributes.yearsExperience}{' '}
            yrs exp
          </Text>
        </View>
        <View style={styles.reputationBlock}>
          <Text style={[styles.reputationIcon, { color: repConfig.color }]}>{repConfig.icon}</Text>
          <Text style={[styles.reputationLabel, { color: repConfig.color }]}>
            {getReputationDisplayName(tier)}
          </Text>
        </View>
      </View>

      {/* === TIER 2: Scheme (Gameplay Impact) === */}
      <View style={styles.schemeRow}>
        <View style={styles.schemeBadge}>
          <Text style={styles.schemeLabel}>Scheme</Text>
          <Text style={styles.schemeValue}>{candidate.schemeDisplay}</Text>
        </View>
        <View style={styles.treeBadge}>
          <Text style={styles.treeLabel}>Tree</Text>
          <Text style={styles.treeValue}>{candidate.treeDisplay}</Text>
        </View>
      </View>

      {/* === TIER 3: Chemistry (for coordinators) === */}
      {showChemistry && chemistryBreakdown && (
        <ChemistryIndicator
          breakdown={chemistryBreakdown}
          expanded={chemistryExpanded}
          onToggle={handleChemistryToggle}
        />
      )}

      {/* === TIER 4: Cost === */}
      <View style={styles.costRow}>
        <View style={styles.salaryBlock}>
          <Text style={styles.salaryLabel}>Salary</Text>
          <Text style={styles.salaryValue}>
            {formatMoney(salaryToThousands(candidate.expectedSalary))}/yr
          </Text>
        </View>
        <View style={styles.contractBlock}>
          <Text style={styles.contractLabel}>Contract</Text>
          <Text style={styles.contractValue}>{candidate.expectedYears} years</Text>
        </View>
        <View style={styles.totalBlock}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            {formatMoney(salaryToThousands(candidate.expectedSalary * candidate.expectedYears))}
          </Text>
        </View>
      </View>

      {/* === TIER 5: Strengths (Secondary) === */}
      <View style={styles.strengthsRow}>
        {candidate.strengths.slice(0, 3).map((strength, idx) => (
          <View key={idx} style={styles.strengthChip}>
            <Text style={styles.strengthText}>{strength}</Text>
          </View>
        ))}
      </View>

      {/* === Actions === */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.detailsBtn}
          onPress={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          accessibilityRole="button"
          accessibilityLabel="View full profile"
        >
          <Text style={styles.detailsBtnText}>Full Profile</Text>
        </TouchableOpacity>
        {isSelected ? (
          <View style={styles.selectedIndicator}>
            <Text style={styles.selectedIcon}>✓</Text>
            <Text style={styles.selectedText}>Selected</Text>
          </View>
        ) : !disabled ? (
          <Text style={styles.tapHint}>Tap to select</Text>
        ) : null}
      </View>
    </Pressable>
  );
});

/**
 * ProgressStepper - Tappable progress indicator
 */
const ProgressStepper = memo(function ProgressStepper({
  steps,
  currentStep,
  onStepPress,
}: {
  steps: { key: HiringStep; label: string; selection: HiringCandidate | null }[];
  currentStep: HiringStep;
  onStepPress: (step: HiringStep) => void;
}) {
  return (
    <View style={styles.stepper}>
      {steps.map((step, idx) => {
        const isActive = step.key === currentStep;
        const isComplete = step.selection !== null && !isActive;
        const canTap = isComplete;

        const content = (
          <View style={styles.stepperItem}>
            <View
              style={[
                styles.stepperCircle,
                isActive && styles.stepperCircleActive,
                isComplete && styles.stepperCircleComplete,
              ]}
            >
              <Text
                style={[
                  styles.stepperNumber,
                  (isActive || isComplete) && styles.stepperNumberActive,
                ]}
              >
                {isComplete ? '✓' : idx + 1}
              </Text>
            </View>
            <Text style={[styles.stepperLabel, isActive && styles.stepperLabelActive]}>
              {step.label}
            </Text>
            {step.selection && (
              <Text style={styles.stepperSelection} numberOfLines={1}>
                {step.selection.coach.lastName}
              </Text>
            )}
            {canTap && <Text style={styles.stepperEditHint}>edit</Text>}
          </View>
        );

        return (
          <React.Fragment key={step.key}>
            {idx > 0 && <View style={styles.stepperLine} />}
            {canTap ? (
              <TouchableOpacity
                onPress={() => onStepPress(step.key)}
                accessibilityRole="button"
                accessibilityLabel={`Go back to ${step.label}`}
              >
                {content}
              </TouchableOpacity>
            ) : (
              content
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
});

/**
 * ReviewCard - Compact card for review screen
 */
const ReviewCard = memo(function ReviewCard({
  candidate,
  chemistryBreakdown,
  onPress,
  onEdit,
}: {
  candidate: HiringCandidate;
  chemistryBreakdown?: ChemistryBreakdown;
  onPress: () => void;
  onEdit: () => void;
}) {
  const tier = getReputationTier(candidate.coach.attributes.reputation);
  const repConfig = REPUTATION_CONFIG[tier];
  const roleConfig = ROLE_CONFIG[candidate.coach.role];

  return (
    <View style={styles.reviewCard}>
      <TouchableOpacity style={styles.reviewCardMain} onPress={onPress}>
        <View style={[styles.reviewRoleIcon, { backgroundColor: roleConfig.color }]}>
          <Text style={styles.reviewRoleText}>{roleConfig.abbrev}</Text>
        </View>
        <View style={styles.reviewInfo}>
          <Text style={styles.reviewName}>
            {candidate.coach.firstName} {candidate.coach.lastName}
          </Text>
          <Text style={styles.reviewRole}>{roleConfig.label}</Text>
          <View style={styles.reviewMeta}>
            <Text style={[styles.reviewRep, { color: repConfig.color }]}>
              {repConfig.icon} {getReputationDisplayName(tier)}
            </Text>
            <Text style={styles.reviewScheme}>{candidate.schemeDisplay}</Text>
          </View>
        </View>
        <View style={styles.reviewSalary}>
          <Text style={styles.reviewSalaryValue}>
            {formatMoney(salaryToThousands(candidate.expectedSalary))}
          </Text>
          <Text style={styles.reviewSalaryLabel}>per year</Text>
        </View>
      </TouchableOpacity>
      {chemistryBreakdown && (
        <View style={styles.reviewChemistry}>
          <View style={[styles.reviewChemDot, { backgroundColor: chemistryBreakdown.color }]} />
          <Text style={styles.reviewChemLabel}>HC Chemistry:</Text>
          <Text style={[styles.reviewChemValue, { color: chemistryBreakdown.color }]}>
            {chemistryBreakdown.rating.charAt(0).toUpperCase() + chemistryBreakdown.rating.slice(1)}
          </Text>
        </View>
      )}
      <TouchableOpacity style={styles.reviewEditBtn} onPress={onEdit}>
        <Text style={styles.reviewEditText}>Change</Text>
      </TouchableOpacity>
    </View>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

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
  const [sortOption, setSortOption] = useState<SortOption>('recommended');

  // Generate candidates (memoized)
  const hcCandidates = useMemo(
    () =>
      generateHiringCandidates('headCoach', { count: 7, existingStaff: formerStaff, currentYear }),
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

  // Budget calculations - convert salaries to thousands to match budget units
  const usedBudget =
    salaryToThousands(selectedHC?.expectedSalary || 0) +
    salaryToThousands(selectedOC?.expectedSalary || 0) +
    salaryToThousands(selectedDC?.expectedSalary || 0);
  const remainingBudget = staffBudget - usedBudget;

  const getRemainingHires = useCallback((): { role: CoachRole; minCost: number }[] => {
    const hires: { role: CoachRole; minCost: number }[] = [];
    // Convert min costs to thousands to match budget units
    if (!selectedHC && step !== 'headCoach')
      hires.push({
        role: 'headCoach',
        minCost: salaryToThousands(COACH_SALARY_RANGES.headCoach.min),
      });
    if (!selectedOC && step !== 'offensiveCoordinator')
      hires.push({
        role: 'offensiveCoordinator',
        minCost: salaryToThousands(COACH_SALARY_RANGES.offensiveCoordinator.min),
      });
    if (!selectedDC && step !== 'defensiveCoordinator')
      hires.push({
        role: 'defensiveCoordinator',
        minCost: salaryToThousands(COACH_SALARY_RANGES.defensiveCoordinator.min),
      });
    return hires;
  }, [selectedHC, selectedOC, selectedDC, step]);

  const canAfford = useCallback(
    (candidate: HiringCandidate) => {
      const remainingHires = getRemainingHires();
      const minNeeded = remainingHires.reduce((sum, h) => sum + h.minCost, 0);
      // Convert candidate salary to thousands for comparison with budget
      return salaryToThousands(candidate.expectedSalary) <= remainingBudget - minNeeded;
    },
    [remainingBudget, getRemainingHires]
  );

  // Get current step data
  const getCurrentCandidates = useCallback(() => {
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
  }, [step, hcCandidates, ocCandidates, dcCandidates]);

  const getCurrentSelection = useCallback(() => {
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
  }, [step, selectedHC, selectedOC, selectedDC]);

  const setCurrentSelection = useCallback(
    (candidate: HiringCandidate) => {
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
    },
    [step]
  );

  // Sorted and annotated candidates
  const sortedCandidates = useMemo(() => {
    const candidates = getCurrentCandidates();
    const showChemistry = step !== 'headCoach' && selectedHC !== null;

    // Calculate chemistry for each
    const withChemistry = candidates.map((c) => ({
      candidate: c,
      chemistry:
        showChemistry && selectedHC ? calculateChemistryBreakdown(selectedHC.coach, c.coach) : null,
      affordable: canAfford(c),
    }));

    // Sort
    const sorted = [...withChemistry].sort((a, b) => {
      // Unaffordable always last
      if (a.affordable !== b.affordable) return a.affordable ? -1 : 1;

      switch (sortOption) {
        case 'salary_low':
          return a.candidate.expectedSalary - b.candidate.expectedSalary;
        case 'salary_high':
          return b.candidate.expectedSalary - a.candidate.expectedSalary;
        case 'reputation':
          const aRep =
            REPUTATION_CONFIG[getReputationTier(a.candidate.coach.attributes.reputation)].rank;
          const bRep =
            REPUTATION_CONFIG[getReputationTier(b.candidate.coach.attributes.reputation)].rank;
          return bRep - aRep;
        case 'recommended':
        default:
          // Recommended: chemistry (if available) + reputation weighted
          const aScore =
            (a.chemistry?.total || 5) +
            REPUTATION_CONFIG[getReputationTier(a.candidate.coach.attributes.reputation)].rank * 2;
          const bScore =
            (b.chemistry?.total || 5) +
            REPUTATION_CONFIG[getReputationTier(b.candidate.coach.attributes.reputation)].rank * 2;
          return bScore - aScore;
      }
    });

    // Mark best fit candidates
    const affordableList = sorted.filter((c) => c.affordable);
    const bestFits: Map<string, 'top_pick' | 'best_value' | 'best_chemistry'> = new Map();

    if (affordableList.length > 0) {
      // Top pick = highest recommended score
      bestFits.set(affordableList[0].candidate.coach.id, 'top_pick');

      // Best value = lowest salary among affordable
      const cheapest = [...affordableList].sort(
        (a, b) => a.candidate.expectedSalary - b.candidate.expectedSalary
      )[0];
      if (cheapest && cheapest.candidate.coach.id !== affordableList[0].candidate.coach.id) {
        bestFits.set(cheapest.candidate.coach.id, 'best_value');
      }

      // Best chemistry (only for coordinators)
      if (showChemistry) {
        const bestChem = [...affordableList].sort(
          (a, b) => (b.chemistry?.total || 0) - (a.chemistry?.total || 0)
        )[0];
        if (bestChem && !bestFits.has(bestChem.candidate.coach.id)) {
          bestFits.set(bestChem.candidate.coach.id, 'best_chemistry');
        }
      }
    }

    return sorted.map((c) => ({
      ...c,
      bestFitType: bestFits.get(c.candidate.coach.id),
    }));
  }, [getCurrentCandidates, step, selectedHC, sortOption, canAfford]);

  // Navigation
  const handleNext = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
  }, [step, selectedHC, selectedOC, selectedDC, onComplete]);

  const handleBack = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
  }, [step, onBack]);

  const canProceed = useMemo(() => {
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
  }, [step, selectedHC, selectedOC, selectedDC]);

  // Render candidate item
  const renderCandidate = useCallback(
    ({ item }: { item: (typeof sortedCandidates)[0] }) => {
      const currentSelection = getCurrentSelection();
      const showChemistry = step !== 'headCoach' && selectedHC !== null;

      const getDisabledReason = (): string | undefined => {
        if (item.affordable) return undefined;
        // Convert salary to thousands for comparison with remainingBudget (which is in thousands)
        const salaryInThousands = salaryToThousands(item.candidate.expectedSalary);
        const remainingHires = getRemainingHires();
        const minNeeded = remainingHires.reduce((sum, h) => sum + h.minCost, 0);
        const overBudget = salaryInThousands - (remainingBudget - minNeeded);
        return `Over budget by ${formatMoney(Math.max(0, overBudget))}`;
      };

      return (
        <CandidateCard
          candidate={item.candidate}
          isSelected={currentSelection?.coach.id === item.candidate.coach.id}
          chemistryBreakdown={item.chemistry}
          onSelect={() => setCurrentSelection(item.candidate)}
          onViewDetails={() => setViewingCoach(item.candidate.coach)}
          disabled={!item.affordable}
          disabledReason={getDisabledReason()}
          bestFitType={item.bestFitType}
          showChemistry={showChemistry}
        />
      );
    },
    [getCurrentSelection, step, selectedHC, remainingBudget, setCurrentSelection, getRemainingHires]
  );

  // Review screen
  const renderReview = () => {
    if (!selectedHC || !selectedOC || !selectedDC) return null;

    const ocChemistry = calculateChemistryBreakdown(selectedHC.coach, selectedOC.coach);
    const dcChemistry = calculateChemistryBreakdown(selectedHC.coach, selectedDC.coach);
    const avgChemistry = Math.round((ocChemistry.total + dcChemistry.total) / 2);

    return (
      <View style={styles.reviewContainer}>
        <Text style={styles.reviewTitle}>Your Coaching Staff</Text>

        <ReviewCard
          candidate={selectedHC}
          onPress={() => setViewingCoach(selectedHC.coach)}
          onEdit={() => setStep('headCoach')}
        />
        <ReviewCard
          candidate={selectedOC}
          chemistryBreakdown={ocChemistry}
          onPress={() => setViewingCoach(selectedOC.coach)}
          onEdit={() => setStep('offensiveCoordinator')}
        />
        <ReviewCard
          candidate={selectedDC}
          chemistryBreakdown={dcChemistry}
          onPress={() => setViewingCoach(selectedDC.coach)}
          onEdit={() => setStep('defensiveCoordinator')}
        />

        {/* Staff Chemistry Summary */}
        <View style={styles.reviewSummary}>
          <Text style={styles.reviewSummaryTitle}>Staff Chemistry</Text>
          <View style={styles.reviewChemBar}>
            <View
              style={[
                styles.reviewChemFill,
                {
                  width: `${avgChemistry * 10}%`,
                  backgroundColor:
                    avgChemistry >= 7
                      ? colors.success
                      : avgChemistry >= 5
                        ? colors.info
                        : colors.warning,
                },
              ]}
            />
          </View>
          <Text style={styles.reviewChemDetail}>
            HC↔OC: {ocChemistry.rating} · HC↔DC: {dcChemistry.rating}
          </Text>
        </View>

        {/* Total Cost */}
        <View style={styles.reviewCost}>
          <View style={styles.reviewCostRow}>
            <Text style={styles.reviewCostLabel}>Total Annual Salary</Text>
            <Text style={styles.reviewCostValue}>{formatMoney(usedBudget)}</Text>
          </View>
          <View style={styles.reviewCostRow}>
            <Text style={styles.reviewCostLabel}>Budget Remaining</Text>
            <Text style={[styles.reviewCostValue, { color: colors.success }]}>
              {formatMoney(remainingBudget)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const stepperSteps = [
    { key: 'headCoach' as HiringStep, label: 'HC', selection: selectedHC },
    { key: 'offensiveCoordinator' as HiringStep, label: 'OC', selection: selectedOC },
    { key: 'defensiveCoordinator' as HiringStep, label: 'DC', selection: selectedDC },
    { key: 'review' as HiringStep, label: 'Review', selection: null },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ScreenHeader title="Build Your Staff" onBack={handleBack} testID="staff-hiring-header" />

      {/* Team */}
      <View style={styles.teamBar}>
        <Text style={styles.teamName}>{getFullTeamName(teamCity)}</Text>
      </View>

      {/* Progress */}
      <ProgressStepper steps={stepperSteps} currentStep={step} onStepPress={setStep} />

      {/* Budget */}
      <BudgetContext used={usedBudget} total={staffBudget} remainingHires={getRemainingHires()} />

      {/* Content */}
      {step === 'review' ? (
        renderReview()
      ) : (
        <>
          {/* Step Header */}
          <View style={styles.stepHeader}>
            <Text style={styles.stepTitle}>Select {ROLE_CONFIG[step as CoachRole].label}</Text>
            <Text style={styles.stepSubtitle}>
              {sortedCandidates.filter((c) => c.affordable).length} candidates available
            </Text>
          </View>

          {/* Sort Controls */}
          <SortControls currentSort={sortOption} onSortChange={setSortOption} />

          {/* Candidate List */}
          <FlatList
            data={sortedCandidates}
            keyExtractor={(item) => item.candidate.coach.id}
            renderItem={renderCandidate}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={5}
            maxToRenderPerBatch={3}
            windowSize={5}
          />
        </>
      )}

      {/* Bottom Action */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.primaryBtn, !canProceed && styles.primaryBtnDisabled]}
          onPress={handleNext}
          disabled={!canProceed}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canProceed }}
        >
          <Text style={[styles.primaryBtnText, !canProceed && styles.primaryBtnTextDisabled]}>
            {step === 'review' ? 'Confirm & Start Season' : 'Continue →'}
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

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  backBtn: {
    width: 70,
    minHeight: 44,
    justifyContent: 'center',
  },
  backBtnText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  teamBar: {
    backgroundColor: colors.primaryDark,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  teamName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },

  // Stepper
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepperItem: {
    alignItems: 'center',
    width: 56,
  },
  stepperCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCircleActive: {
    backgroundColor: colors.primary,
  },
  stepperCircleComplete: {
    backgroundColor: colors.success,
  },
  stepperNumber: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  stepperNumberActive: {
    color: colors.textOnPrimary,
  },
  stepperLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  stepperLabelActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  stepperSelection: {
    fontSize: 9,
    color: colors.textLight,
    marginTop: 1,
  },
  stepperEditHint: {
    fontSize: 8,
    color: colors.primary,
    marginTop: 1,
  },
  stepperLine: {
    width: 20,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },

  // Budget
  budgetContext: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  budgetTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  budgetAmount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  budgetBarBg: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  budgetBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  budgetBreakdown: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  budgetBreakdownLabel: {
    fontSize: fontSize.xs,
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
  budgetBreakdownHint: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },

  // Step Header
  stepHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  stepTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  stepSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Sort Controls
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  sortLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  sortOptions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  sortOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortOptionActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  sortOptionText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  sortOptionTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },

  // List
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08',
  },
  cardDisabled: {
    opacity: 0.55,
  },

  // Disabled Banner
  disabledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderTopLeftRadius: borderRadius.lg - 2,
    borderTopRightRadius: borderRadius.lg - 2,
    marginTop: -spacing.md,
    marginHorizontal: -spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  disabledIcon: {
    fontSize: fontSize.sm,
    color: colors.textOnPrimary,
  },
  disabledText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },

  // Best Fit Badge
  bestFitPosition: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
  },
  bestFitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  bestFitIcon: {
    fontSize: 10,
    color: colors.textOnPrimary,
  },
  bestFitLabel: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },

  // Former Badge
  formerBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.info,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    zIndex: 1,
  },
  formerBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },

  // Card Identity
  cardIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  roleIconText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  cardNameBlock: {
    flex: 1,
  },
  cardName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  cardMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  reputationBlock: {
    alignItems: 'center',
  },
  reputationIcon: {
    fontSize: fontSize.lg,
  },
  reputationLabel: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    marginTop: 2,
  },

  // Scheme Row
  schemeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  schemeBadge: {
    flex: 1,
    backgroundColor: colors.secondary + '12',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  schemeLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  schemeValue: {
    fontSize: fontSize.sm,
    color: colors.secondary,
    fontWeight: fontWeight.semibold,
  },
  treeBadge: {
    flex: 1,
    backgroundColor: colors.primary + '12',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  treeLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  treeValue: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },

  // Chemistry
  chemistryContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  chemistryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
  },
  chemistryLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  chemistryRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chemistryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chemistryValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  chemistryExpandIcon: {
    fontSize: 10,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  chemistryBreakdown: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.sm,
    backgroundColor: colors.surface,
  },
  chemistryBreakdownTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  chemistryFactor: {
    marginBottom: spacing.sm,
  },
  chemistryFactorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chemistryFactorLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  chemistryFactorValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  chemistryFactorExplanation: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chemistryImpact: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  chemistryImpactLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 4,
  },
  chemistryImpactText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  // Cost Row
  costRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: spacing.sm,
  },
  salaryBlock: {
    flex: 1,
  },
  salaryLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  salaryValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: 2,
  },
  contractBlock: {
    flex: 1,
    alignItems: 'center',
  },
  contractLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  contractValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: 2,
  },
  totalBlock: {
    flex: 1,
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Strengths
  strengthsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  strengthChip: {
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

  // Card Actions
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  detailsBtnText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  selectedIcon: {
    fontSize: fontSize.sm,
    color: colors.textOnPrimary,
  },
  selectedText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  tapHint: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    paddingHorizontal: spacing.md,
  },

  // Review
  reviewContainer: {
    flex: 1,
    padding: spacing.md,
  },
  reviewTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
    overflow: 'hidden',
  },
  reviewCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  reviewRoleIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  reviewRoleText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  reviewInfo: {
    flex: 1,
  },
  reviewName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  reviewRole: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  reviewMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 2,
  },
  reviewRep: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  reviewScheme: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  reviewSalary: {
    alignItems: 'flex-end',
  },
  reviewSalaryValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  reviewSalaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  reviewChemistry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
  reviewChemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  reviewChemLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  reviewChemValue: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  reviewEditBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reviewEditText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },

  // Review Summary
  reviewSummary: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  reviewSummaryTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  reviewChemBar: {
    height: 10,
    backgroundColor: colors.border,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  reviewChemFill: {
    height: '100%',
    borderRadius: 5,
  },
  reviewChemDetail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Review Cost
  reviewCost: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  reviewCostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reviewCostLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  reviewCostValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  // Bottom Bar
  bottomBar: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
    ...shadows.md,
  },
  primaryBtnDisabled: {
    backgroundColor: colors.border,
  },
  primaryBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  primaryBtnTextDisabled: {
    color: colors.textSecondary,
  },
});

export default StaffHiringScreen;
