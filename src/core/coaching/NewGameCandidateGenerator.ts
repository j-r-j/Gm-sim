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
  const { count = 7, existingStaff = [], currentYear = 2025 } = options;

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
