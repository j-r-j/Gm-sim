/**
 * New Game Candidate Generator
 * Generates coach hiring candidates for the new game staff selection flow
 */

import { Coach } from '../models/staff/Coach';
import { CoachRole, COACH_SALARY_RANGES } from '../models/staff/StaffSalary';
import {
  ALL_OFFENSIVE_SCHEMES,
  ALL_DEFENSIVE_SCHEMES,
  OffensiveScheme,
  DefensiveScheme,
} from '../models/player/SchemeFit';
import { ReputationTier, getReputationTier } from '../models/staff/CoachAttributes';
import { generateCoach, CoachGenerationConfig } from './CoachGenerator';
import {
  generateCoachWriteup,
  generateCoachStrengths,
  generateCoachWeaknesses,
  getSchemeDisplayName,
  getTreeDisplayName,
  getPersonalityDisplayName,
  getReputationDisplayName,
} from './CoachWriteupGenerator';
import { generateUUID } from '../generators/utils/RandomUtils';
import { createCoachContract } from '../models/staff/CoachContract';
import { COMPATIBLE_TREES, CONFLICTING_TREES, TreeName } from '../models/staff/CoachingTree';

/**
 * Narrative tag describing a notable trait about a coaching candidate
 */
export interface CandidateTag {
  /** Short label for display */
  label: string;
  /** Longer description */
  description: string;
  /** Visual sentiment */
  sentiment: 'positive' | 'neutral' | 'negative' | 'warning';
}

/**
 * Extended coach candidate with additional hiring info
 */
export interface HiringCandidate {
  /** The full coach entity */
  coach: Coach;
  /** Generated writeup for display */
  writeup: string;
  /** List of strengths */
  strengths: string[];
  /** List of weaknesses */
  weaknesses: string[];
  /** Display-friendly scheme name */
  schemeDisplay: string;
  /** Display-friendly tree name */
  treeDisplay: string;
  /** Display-friendly personality */
  personalityDisplay: string;
  /** Display-friendly reputation tier */
  reputationDisplay: string;
  /** Expected annual salary */
  expectedSalary: number;
  /** Expected contract length in years */
  expectedYears: number;
  /** Whether this was a former staff member */
  isFormerStaff: boolean;
  /** Interest level in the position */
  interestLevel: 'high' | 'medium' | 'low';
  /** Narrative tags (e.g. "First-Time Coordinator", "Coaching Tree Connection") */
  tags: CandidateTag[];
}

/**
 * Candidate generation options
 */
export interface CandidateGenerationOptions {
  /** Number of candidates to generate (default 7) */
  count?: number;
  /** Existing staff members to include in pool */
  existingStaff?: Coach[];
  /** Year for contract purposes */
  currentYear?: number;
  /** Current coaches on the team's staff (for tag generation) */
  currentTeamCoaches?: Coach[];
  /** Coaching budget remaining (for affordability tagging) */
  coachingBudgetRemaining?: number;
}

/**
 * Ensures all schemes are covered in candidates
 */
function ensureSchemesCovered(
  candidates: HiringCandidate[],
  role: CoachRole,
  targetCount: number,
  currentYear: number
): HiringCandidate[] {
  const schemes = role === 'defensiveCoordinator' ? ALL_DEFENSIVE_SCHEMES : ALL_OFFENSIVE_SCHEMES;

  const coveredSchemes = new Set(candidates.map((c) => c.coach.scheme));
  const missingSchemes = schemes.filter((s) => !coveredSchemes.has(s));

  // Replace lowest-tier duplicates with missing schemes
  for (const scheme of missingSchemes) {
    if (candidates.length >= targetCount) {
      // Find a duplicate scheme to replace (prefer lower tier)
      const duplicateSchemes = schemes.filter(
        (s) => candidates.filter((c) => c.coach.scheme === s).length > 1
      );

      if (duplicateSchemes.length > 0) {
        // Find lowest tier candidate with duplicate scheme (excluding former staff)
        const sortedByTier = candidates
          .filter(
            (c) =>
              !c.isFormerStaff && // Never replace former staff members
              duplicateSchemes.includes(c.coach.scheme as OffensiveScheme | DefensiveScheme)
          )
          .sort((a, b) => {
            const tierOrder: ReputationTier[] = [
              'unknown',
              'rising',
              'established',
              'elite',
              'legendary',
            ];
            const tierA = getReputationTier(a.coach.attributes.reputation);
            const tierB = getReputationTier(b.coach.attributes.reputation);
            return tierOrder.indexOf(tierA) - tierOrder.indexOf(tierB);
          });

        if (sortedByTier.length > 0) {
          const indexToReplace = candidates.indexOf(sortedByTier[0]);
          const newCandidate = generateSingleCandidate(role, currentYear, {
            scheme: scheme as OffensiveScheme | DefensiveScheme,
          });
          candidates[indexToReplace] = newCandidate;
        }
      }
    } else {
      // Just add the missing scheme candidate
      const newCandidate = generateSingleCandidate(role, currentYear, {
        scheme: scheme as OffensiveScheme | DefensiveScheme,
      });
      candidates.push(newCandidate);
    }
  }

  return candidates;
}

/**
 * Generates narrative tags for a candidate based on context
 */
export function generateCandidateTags(
  candidate: Coach,
  role: CoachRole,
  currentTeamCoaches: Coach[],
  coachingBudgetRemaining?: number,
  expectedSalary?: number
): CandidateTag[] {
  const tags: CandidateTag[] = [];
  const tier = getReputationTier(candidate.attributes.reputation);

  // --- Experience-based tags ---

  if (role === 'offensiveCoordinator' || role === 'defensiveCoordinator') {
    // First-time coordinator: never held coordinator role before
    const hasCoordinatorHistory = candidate.careerHistory.some(
      (h) => h.role === 'offensiveCoordinator' || h.role === 'defensiveCoordinator'
    );
    if (!hasCoordinatorHistory && candidate.attributes.yearsExperience <= 5) {
      tags.push({
        label: 'First-Time Coordinator',
        description: 'Has never held a coordinator role before. High upside, but unproven.',
        sentiment: 'warning',
      });
    }
  }

  if (role === 'headCoach') {
    const hasHCHistory = candidate.careerHistory.some((h) => h.role === 'headCoach');
    if (!hasHCHistory) {
      tags.push({
        label: 'First-Time Head Coach',
        description: 'Has never been a head coach before. Fresh perspective, but untested.',
        sentiment: 'warning',
      });
    } else {
      // Check if they were fired (short tenure or bad record)
      const hcHistory = candidate.careerHistory.filter((h) => h.role === 'headCoach');
      const lastHC = hcHistory[hcHistory.length - 1];
      if (lastHC) {
        const totalGames = lastHC.wins + lastHC.losses;
        const winPct = totalGames > 0 ? lastHC.wins / totalGames : 0;
        if (winPct < 0.4) {
          tags.push({
            label: 'Retread',
            description: `Previously fired as HC with a ${lastHC.wins}-${lastHC.losses} record. Looking for a second chance.`,
            sentiment: 'negative',
          });
        }
      }
    }
  }

  // Veteran coach
  if (candidate.attributes.yearsExperience >= 20) {
    tags.push({
      label: 'Veteran Leader',
      description: `${candidate.attributes.yearsExperience} years of coaching experience.`,
      sentiment: 'positive',
    });
  }

  // Rising star
  if (tier === 'rising' || tier === 'unknown') {
    if (candidate.attributes.yearsExperience <= 6 && candidate.attributes.age <= 42) {
      tags.push({
        label: 'Rising Star',
        description: 'Young coach generating buzz around the league.',
        sentiment: 'positive',
      });
    }
  }

  // --- Coaching tree relationship tags ---

  for (const existingCoach of currentTeamCoaches) {
    // Same coaching tree
    if (candidate.tree.treeName === existingCoach.tree.treeName) {
      const genDiff = Math.abs(candidate.tree.generation - existingCoach.tree.generation);
      if (genDiff <= 1) {
        tags.push({
          label: 'Coaching Tree Connection',
          description: `Same ${getTreeDisplayName(candidate.tree.treeName)} coaching tree as ${existingCoach.firstName} ${existingCoach.lastName}. Should work well together.`,
          sentiment: 'positive',
        });
        break; // Only one tree connection tag
      }
    }

    // Compatible trees
    if (COMPATIBLE_TREES[candidate.tree.treeName]?.includes(existingCoach.tree.treeName)) {
      tags.push({
        label: 'Compatible Philosophy',
        description: `Philosophy aligns well with ${existingCoach.firstName} ${existingCoach.lastName}'s approach.`,
        sentiment: 'positive',
      });
      break;
    }

    // Conflicting trees
    if (CONFLICTING_TREES[candidate.tree.treeName]?.includes(existingCoach.tree.treeName)) {
      tags.push({
        label: 'Philosophy Clash',
        description: `Coaching philosophy may conflict with ${existingCoach.firstName} ${existingCoach.lastName}'s approach.`,
        sentiment: 'negative',
      });
      break;
    }
  }

  // --- Personality tags ---

  if (candidate.personality.ego >= 75) {
    tags.push({
      label: 'Big Ego',
      description: 'Strong personality that may cause friction with staff.',
      sentiment: 'warning',
    });
  }

  // --- Career achievement tags ---

  const totalChampionships = candidate.careerHistory.reduce((s, h) => s + h.championships, 0);
  if (totalChampionships > 0) {
    tags.push({
      label: 'Championship Pedigree',
      description: `Has ${totalChampionships} championship${totalChampionships > 1 ? 's' : ''} on their resume.`,
      sentiment: 'positive',
    });
  }

  const totalPlayoffs = candidate.careerHistory.reduce((s, h) => s + h.playoffAppearances, 0);
  if (totalPlayoffs >= 3 && totalChampionships === 0) {
    tags.push({
      label: 'Playoff Experience',
      description: `${totalPlayoffs} career playoff appearances.`,
      sentiment: 'positive',
    });
  }

  // --- In-demand tag ---
  if (candidate.interviewRequests.length >= 3) {
    tags.push({
      label: 'Hot Commodity',
      description: `Interviewing with ${candidate.interviewRequests.length} teams. May be hard to land.`,
      sentiment: 'warning',
    });
  }

  // --- Budget tag ---
  if (coachingBudgetRemaining !== undefined && expectedSalary !== undefined) {
    if (expectedSalary > coachingBudgetRemaining) {
      tags.push({
        label: 'Over Budget',
        description: `Asking salary exceeds your remaining coaching budget by $${formatBudgetAmount(expectedSalary - coachingBudgetRemaining)}.`,
        sentiment: 'negative',
      });
    } else if (expectedSalary > coachingBudgetRemaining * 0.8) {
      tags.push({
        label: 'Budget Stretch',
        description: 'Would consume most of your remaining coaching budget.',
        sentiment: 'warning',
      });
    }
  }

  return tags;
}

/**
 * Formats a dollar amount for display in tags
 */
function formatBudgetAmount(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`;
  }
  return `${Math.round(amount / 1000)}K`;
}

/**
 * Generates a single hiring candidate
 */
function generateSingleCandidate(
  role: CoachRole,
  currentYear: number,
  config: CoachGenerationConfig = {}
): HiringCandidate {
  // Generate the coach (without team assignment for now)
  const coach = generateCoach(role, null, currentYear, config);

  // Calculate expected salary based on reputation
  const tier = getReputationTier(coach.attributes.reputation);
  const salaryRange = COACH_SALARY_RANGES[role];
  const salaryMultiplier =
    tier === 'legendary'
      ? 0.9
      : tier === 'elite'
        ? 0.75
        : tier === 'established'
          ? 0.55
          : tier === 'rising'
            ? 0.35
            : 0.2;

  const expectedSalary = Math.round(
    salaryRange.min +
      (salaryRange.max - salaryRange.min) * salaryMultiplier +
      (Math.random() - 0.5) * 1000000
  );

  // Expected years based on tier
  const expectedYears =
    tier === 'legendary' || tier === 'elite'
      ? 4 + Math.floor(Math.random() * 2) // 4-5 years
      : tier === 'established'
        ? 3 + Math.floor(Math.random() * 2) // 3-4 years
        : 3; // 3 years for rising/unknown

  // Interest level based on various factors
  const interestLevel: 'high' | 'medium' | 'low' =
    tier === 'unknown' || tier === 'rising'
      ? 'high'
      : tier === 'established'
        ? Math.random() > 0.3
          ? 'high'
          : 'medium'
        : Math.random() > 0.5
          ? 'medium'
          : 'low';

  return {
    coach,
    writeup: generateCoachWriteup(coach),
    strengths: generateCoachStrengths(coach),
    weaknesses: generateCoachWeaknesses(coach),
    schemeDisplay: getSchemeDisplayName(coach.scheme),
    treeDisplay: getTreeDisplayName(coach.tree.treeName),
    personalityDisplay: getPersonalityDisplayName(coach.personality.primary),
    reputationDisplay: getReputationDisplayName(tier),
    expectedSalary: Math.max(salaryRange.min, Math.min(salaryRange.max, expectedSalary)),
    expectedYears,
    isFormerStaff: false,
    interestLevel,
    tags: [], // Tags populated after generation with team context
  };
}

/**
 * Converts an existing coach to a hiring candidate
 */
function coachToCandidate(
  coach: Coach,
  role: CoachRole,
  currentYear: number,
  isFormerStaff: boolean
): HiringCandidate {
  const tier = getReputationTier(coach.attributes.reputation);
  const salaryRange = COACH_SALARY_RANGES[role];

  // Former staff might ask for a bit less if being re-hired
  const salaryMultiplier = isFormerStaff ? 0.9 : 1.0;
  const currentSalary = coach.contract?.salaryPerYear ?? salaryRange.min;
  const expectedSalary = Math.round(currentSalary * salaryMultiplier);

  const expectedYears = coach.contract?.yearsRemaining ?? 3;

  return {
    coach: {
      ...coach,
      teamId: null,
      isAvailable: true,
      contract: null, // Clear contract since they're a candidate
    },
    writeup: generateCoachWriteup(coach),
    strengths: generateCoachStrengths(coach),
    weaknesses: generateCoachWeaknesses(coach),
    schemeDisplay: getSchemeDisplayName(coach.scheme),
    treeDisplay: getTreeDisplayName(coach.tree.treeName),
    personalityDisplay: getPersonalityDisplayName(coach.personality.primary),
    reputationDisplay: getReputationDisplayName(tier),
    expectedSalary: Math.max(salaryRange.min, Math.min(salaryRange.max, expectedSalary)),
    expectedYears,
    isFormerStaff,
    interestLevel: isFormerStaff ? 'high' : 'medium',
    tags: isFormerStaff
      ? [
          {
            label: 'Former Staff',
            description: 'Previously on your coaching staff.',
            sentiment: 'neutral' as const,
          },
        ]
      : [],
  };
}

/**
 * Generates hiring candidates for a specific coach role
 * Ensures all schemes are covered with varied reputation tiers
 */
export function generateHiringCandidates(
  role: CoachRole,
  options: CandidateGenerationOptions = {}
): HiringCandidate[] {
  const {
    count = 7,
    existingStaff = [],
    currentYear = 2025,
    currentTeamCoaches = [],
    coachingBudgetRemaining,
  } = options;

  const candidates: HiringCandidate[] = [];

  // Add existing staff members (filtered by compatible role)
  for (const staff of existingStaff) {
    // HC can become OC/DC, OC can stay OC, DC can stay DC
    const isCompatibleRole =
      role === staff.role ||
      (role !== 'headCoach' && staff.role === 'headCoach') || // HC can be hired as coordinator
      (role === 'offensiveCoordinator' && staff.role === 'headCoach');

    if (isCompatibleRole) {
      candidates.push(coachToCandidate(staff, role, currentYear, true));
    }
  }

  // Determine how many more candidates we need
  const slotsRemaining = count - candidates.length;

  // Distribution of reputation tiers for new candidates
  // Aim for: 1 elite, 2-3 established, 2-3 rising, 1 unknown
  const tierDistribution: ReputationTier[] = [];

  if (slotsRemaining >= 7) {
    tierDistribution.push(
      'elite',
      'established',
      'established',
      'established',
      'rising',
      'rising',
      'unknown'
    );
  } else if (slotsRemaining >= 5) {
    tierDistribution.push('elite', 'established', 'established', 'rising', 'rising');
  } else if (slotsRemaining >= 3) {
    tierDistribution.push('established', 'rising', 'rising');
  } else {
    for (let i = 0; i < slotsRemaining; i++) {
      tierDistribution.push('established');
    }
  }

  // Generate candidates with tier distribution
  for (let i = 0; i < tierDistribution.length && candidates.length < count; i++) {
    const tier = tierDistribution[i];
    const candidate = generateSingleCandidate(role, currentYear, {
      reputationTier: tier,
    });
    candidates.push(candidate);
  }

  // Ensure all schemes are covered
  const finalCandidates = ensureSchemesCovered(candidates, role, count, currentYear);

  // Generate tags for all candidates based on team context
  for (const candidate of finalCandidates) {
    const contextTags = generateCandidateTags(
      candidate.coach,
      role,
      currentTeamCoaches,
      coachingBudgetRemaining,
      candidate.expectedSalary
    );
    // Merge with any existing tags (e.g. "Former Staff")
    candidate.tags = [...candidate.tags, ...contextTags];
  }

  // Sort by reputation tier (elite first)
  const tierOrder: ReputationTier[] = ['legendary', 'elite', 'established', 'rising', 'unknown'];
  finalCandidates.sort((a, b) => {
    const tierA = getReputationTier(a.coach.attributes.reputation);
    const tierB = getReputationTier(b.coach.attributes.reputation);
    return tierOrder.indexOf(tierA) - tierOrder.indexOf(tierB);
  });

  return finalCandidates.slice(0, count);
}

/**
 * Creates a contract for a hired candidate
 */
export function createCandidateContract(
  candidate: HiringCandidate,
  teamId: string,
  currentYear: number
): Coach {
  const contract = createCoachContract({
    id: generateUUID(),
    coachId: candidate.coach.id,
    teamId,
    yearsTotal: candidate.expectedYears,
    salaryPerYear: candidate.expectedSalary,
    guaranteedMoney: Math.round(candidate.expectedSalary * candidate.expectedYears * 0.4),
    startYear: currentYear,
    isInterim: false,
    canBePoached: candidate.coach.role !== 'headCoach',
  });

  return {
    ...candidate.coach,
    teamId,
    contract,
    isAvailable: false,
  };
}

/**
 * Calculates total staff salary for a set of candidates
 */
export function calculateTotalStaffSalary(candidates: HiringCandidate[]): number {
  return candidates.reduce((total, c) => total + c.expectedSalary, 0);
}

/**
 * Checks if a candidate fits within remaining budget
 */
export function candidateFitsInBudget(
  candidate: HiringCandidate,
  remainingBudget: number
): boolean {
  return candidate.expectedSalary <= remainingBudget;
}

/**
 * Gets minimum required budget for a role (to ensure at least one option)
 */
export function getMinimumSalaryForRole(role: CoachRole): number {
  return COACH_SALARY_RANGES[role].min;
}

/**
 * Calculates minimum budget needed to hire all 3 positions
 */
export function getMinimumTotalBudget(): number {
  return (
    COACH_SALARY_RANGES.headCoach.min +
    COACH_SALARY_RANGES.offensiveCoordinator.min +
    COACH_SALARY_RANGES.defensiveCoordinator.min
  );
}
