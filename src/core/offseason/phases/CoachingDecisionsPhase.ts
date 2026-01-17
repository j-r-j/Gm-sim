/**
 * Coaching Decisions Phase (Phase 2)
 * Handles coach evaluations, firings, and hirings
 */

import { OffSeasonState, addEvent, completeTask } from '../OffSeasonPhaseManager';

/**
 * Coach evaluation result
 */
export interface CoachEvaluation {
  coachId: string;
  coachName: string;
  role: 'head_coach' | 'offensive_coordinator' | 'defensive_coordinator' | 'special_teams';
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  categories: {
    gameManagement: number; // 1-100
    playerDevelopment: number;
    schemeEffectiveness: number;
    inGameAdjustments: number;
    playerRelations: number;
  };
  recommendation: 'retain' | 'extend' | 'monitor' | 'replace';
  yearsRemaining: number;
  contractValue: number;
}

/**
 * Coach candidate for hiring
 */
export interface CoachCandidate {
  candidateId: string;
  name: string;
  age: number;
  currentRole: string;
  currentTeam: string | null;
  experience: number;
  scheme: string;
  strengths: string[];
  weaknesses: string[];
  interestLevel: 'high' | 'medium' | 'low';
  expectedSalary: number;
  expectedYears: number;
}

/**
 * Coaching change record
 */
export interface CoachingChange {
  type: 'fired' | 'hired' | 'promoted' | 'resigned';
  coachId: string;
  coachName: string;
  role: string;
  previousTeamId?: string;
  newTeamId?: string;
  details: string;
}

/**
 * Evaluates a coach's performance
 */
export function evaluateCoach(
  coachId: string,
  coachName: string,
  role: 'head_coach' | 'offensive_coordinator' | 'defensive_coordinator' | 'special_teams',
  seasonStats: {
    wins?: number;
    losses?: number;
    offensiveRank?: number;
    defensiveRank?: number;
    specialTeamsRank?: number;
    playerDevelopmentScore: number;
    schemeSuccessRate: number;
  },
  yearsRemaining: number,
  contractValue: number
): CoachEvaluation {
  const categories = {
    gameManagement: 50,
    playerDevelopment: seasonStats.playerDevelopmentScore,
    schemeEffectiveness: Math.round(seasonStats.schemeSuccessRate * 100),
    inGameAdjustments: 50,
    playerRelations: 70,
  };

  // Calculate based on role
  if (role === 'head_coach' && seasonStats.wins !== undefined) {
    const winPct = seasonStats.wins / (seasonStats.wins + (seasonStats.losses || 0));
    categories.gameManagement = Math.round(winPct * 100);
  } else if (role === 'offensive_coordinator' && seasonStats.offensiveRank !== undefined) {
    categories.schemeEffectiveness = Math.round((1 - (seasonStats.offensiveRank - 1) / 31) * 100);
  } else if (role === 'defensive_coordinator' && seasonStats.defensiveRank !== undefined) {
    categories.schemeEffectiveness = Math.round((1 - (seasonStats.defensiveRank - 1) / 31) * 100);
  }

  // Calculate overall grade
  const avgScore =
    (categories.gameManagement +
      categories.playerDevelopment +
      categories.schemeEffectiveness +
      categories.inGameAdjustments +
      categories.playerRelations) /
    5;

  let overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  let recommendation: 'retain' | 'extend' | 'monitor' | 'replace';

  if (avgScore >= 85) {
    overallGrade = 'A';
    recommendation = 'extend';
  } else if (avgScore >= 70) {
    overallGrade = 'B';
    recommendation = 'retain';
  } else if (avgScore >= 55) {
    overallGrade = 'C';
    recommendation = 'monitor';
  } else if (avgScore >= 40) {
    overallGrade = 'D';
    recommendation = 'replace';
  } else {
    overallGrade = 'F';
    recommendation = 'replace';
  }

  return {
    coachId,
    coachName,
    role,
    overallGrade,
    categories,
    recommendation,
    yearsRemaining,
    contractValue,
  };
}

/**
 * Generates coaching candidates for a role
 */
export function generateCoachCandidates(
  role: 'head_coach' | 'offensive_coordinator' | 'defensive_coordinator' | 'special_teams',
  count: number = 5
): CoachCandidate[] {
  const candidates: CoachCandidate[] = [];
  const schemes = {
    head_coach: ['Balanced', 'Offensive-minded', 'Defensive-minded'],
    offensive_coordinator: ['West Coast', 'Air Raid', 'Pro Style', 'Spread', 'Power Run'],
    defensive_coordinator: ['4-3', '3-4', 'Multiple', 'Cover 2', 'Press Man'],
    special_teams: ['Traditional', 'Aggressive', 'Conservative'],
  };

  for (let i = 0; i < count; i++) {
    const scheme = schemes[role][i % schemes[role].length];
    const experience = Math.floor(Math.random() * 15) + 3;
    const age = 35 + experience + Math.floor(Math.random() * 10);

    candidates.push({
      candidateId: `candidate-${role}-${i}`,
      name: `Coach Candidate ${i + 1}`,
      age,
      currentRole: role === 'head_coach' ? 'Coordinator' : 'Position Coach',
      currentTeam: i < 2 ? null : `Team ${i}`, // First two are available
      experience,
      scheme,
      strengths: getRandomStrengths(role),
      weaknesses: getRandomWeaknesses(role),
      interestLevel: i < 2 ? 'high' : i < 4 ? 'medium' : 'low',
      expectedSalary: getExpectedSalary(role, experience),
      expectedYears: Math.floor(Math.random() * 3) + 3,
    });
  }

  return candidates;
}

/**
 * Gets random strengths for a coach role
 */
function getRandomStrengths(
  role: 'head_coach' | 'offensive_coordinator' | 'defensive_coordinator' | 'special_teams'
): string[] {
  const strengthPools = {
    head_coach: [
      'Game management',
      'Player motivation',
      'Media relations',
      'Clock management',
      'Challenge decisions',
    ],
    offensive_coordinator: [
      'Play design',
      'QB development',
      'Red zone offense',
      'Third down calls',
      'Play action',
    ],
    defensive_coordinator: [
      'Pass rush schemes',
      'Coverage calls',
      'Blitz packages',
      'Run stopping',
      'Takeaways',
    ],
    special_teams: [
      'Kick coverage',
      'Return game',
      'Kicking accuracy',
      'Fake plays',
      'Blocking schemes',
    ],
  };

  const pool = strengthPools[role];
  const count = 2 + Math.floor(Math.random() * 2);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Gets random weaknesses for a coach role
 */
function getRandomWeaknesses(
  role: 'head_coach' | 'offensive_coordinator' | 'defensive_coordinator' | 'special_teams'
): string[] {
  const weaknessPools = {
    head_coach: [
      'Clock management',
      'Challenge decisions',
      'Timeout usage',
      'In-game adjustments',
      'Player discipline',
    ],
    offensive_coordinator: [
      'Red zone efficiency',
      'Short yardage',
      'Deep passing',
      'Run game balance',
      'First half starts',
    ],
    defensive_coordinator: [
      'Preventing big plays',
      'Third down stops',
      'Run defense',
      'Pass rush pressure',
      'Coverage busts',
    ],
    special_teams: [
      'Coverage breakdowns',
      'Kick accuracy',
      'Return yardage allowed',
      'Penalty discipline',
      'Fake recognition',
    ],
  };

  const pool = weaknessPools[role];
  const count = 1 + Math.floor(Math.random() * 2);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Gets expected salary for a coach role
 */
function getExpectedSalary(
  role: 'head_coach' | 'offensive_coordinator' | 'defensive_coordinator' | 'special_teams',
  experience: number
): number {
  const baseSalaries = {
    head_coach: 5000, // $5M base
    offensive_coordinator: 2000,
    defensive_coordinator: 2000,
    special_teams: 1000,
  };

  const base = baseSalaries[role];
  const experienceBonus = experience * 100;
  const variance = Math.floor(Math.random() * 1000) - 500;

  return base + experienceBonus + variance;
}

/**
 * Fires a coach
 */
export function fireCoach(
  state: OffSeasonState,
  coachId: string,
  coachName: string,
  role: string
): OffSeasonState {
  const change: CoachingChange = {
    type: 'fired',
    coachId,
    coachName,
    role,
    details: `${coachName} has been relieved of duties as ${role}`,
  };

  return addEvent(state, 'coaching_change', `Fired ${coachName} (${role})`, { change });
}

/**
 * Hires a coach
 */
export function hireCoach(
  state: OffSeasonState,
  candidate: CoachCandidate,
  role: string,
  teamId: string,
  contractYears: number,
  contractValue: number
): OffSeasonState {
  const change: CoachingChange = {
    type: 'hired',
    coachId: candidate.candidateId,
    coachName: candidate.name,
    role,
    newTeamId: teamId,
    details: `${candidate.name} hired as ${role} (${contractYears}yr/$${contractValue}K)`,
  };

  return addEvent(state, 'coaching_change', `Hired ${candidate.name} as ${role}`, {
    change,
    contract: { years: contractYears, value: contractValue },
  });
}

/**
 * Promotes a coach
 */
export function promoteCoach(
  state: OffSeasonState,
  coachId: string,
  coachName: string,
  fromRole: string,
  toRole: string
): OffSeasonState {
  const change: CoachingChange = {
    type: 'promoted',
    coachId,
    coachName,
    role: toRole,
    details: `${coachName} promoted from ${fromRole} to ${toRole}`,
  };

  return addEvent(state, 'coaching_change', `Promoted ${coachName} to ${toRole}`, { change });
}

/**
 * Processes coaching decisions phase
 */
export function processCoachingDecisions(
  state: OffSeasonState,
  evaluations: CoachEvaluation[],
  changes: CoachingChange[]
): OffSeasonState {
  let newState = state;

  // Add events for each change
  for (const change of changes) {
    const eventDesc =
      change.type === 'fired'
        ? `Fired ${change.coachName}`
        : change.type === 'hired'
          ? `Hired ${change.coachName}`
          : `${change.coachName} ${change.type}`;

    newState = addEvent(newState, 'coaching_change', eventDesc, { change });
  }

  // Complete the review staff task
  newState = completeTask(newState, 'review_staff');

  // If changes were made, complete that task too
  if (changes.length > 0) {
    newState = completeTask(newState, 'make_changes');
  }

  return newState;
}

/**
 * Gets evaluation summary text
 */
export function getEvaluationSummaryText(evaluation: CoachEvaluation): string {
  return `${evaluation.coachName} (${evaluation.role})
Grade: ${evaluation.overallGrade}
Recommendation: ${evaluation.recommendation}
Contract: ${evaluation.yearsRemaining} years remaining ($${evaluation.contractValue}K/yr)`;
}

/**
 * Gets candidate summary text
 */
export function getCandidateSummaryText(candidate: CoachCandidate): string {
  return `${candidate.name}
Age: ${candidate.age} | Experience: ${candidate.experience} years
Scheme: ${candidate.scheme}
Strengths: ${candidate.strengths.join(', ')}
Weaknesses: ${candidate.weaknesses.join(', ')}
Expected: ${candidate.expectedYears}yr / $${candidate.expectedSalary}K`;
}

// ============================================
// COACH CREATION FROM CANDIDATE
// ============================================

import { Coach, createDefaultCoach } from '../../models/staff/Coach';
import { CoachRole } from '../../models/staff/StaffSalary';
import { createCoachContract } from '../../models/staff/CoachContract';
import {
  createDefaultCoachingTree,
  ALL_TREE_NAMES,
  TreeName,
  TreeGeneration,
  RiskTolerance,
} from '../../models/staff/CoachingTree';
import {
  createDefaultPersonality,
  ALL_PERSONALITY_TYPES,
  PersonalityType,
} from '../../models/staff/CoachPersonality';
import { OffensiveScheme, DefensiveScheme } from '../../models/player/SchemeFit';

/**
 * Maps candidate scheme string to actual scheme type
 */
function mapCandidateSchemeToScheme(
  scheme: string,
  role: CoachRole
): OffensiveScheme | DefensiveScheme | null {
  // Offensive schemes (matching SchemeFit.ts types)
  const offensiveSchemeMap: Record<string, OffensiveScheme> = {
    'West Coast': 'westCoast',
    'Air Raid': 'airRaid',
    'Pro Style': 'playAction',
    Spread: 'spreadOption',
    'Power Run': 'powerRun',
    'Zone Run': 'zoneRun',
    Balanced: 'westCoast',
    'Offensive-minded': 'westCoast',
  };

  // Defensive schemes (matching SchemeFit.ts types)
  const defensiveSchemeMap: Record<string, DefensiveScheme> = {
    '4-3': 'fourThreeUnder',
    '3-4': 'threeFour',
    Multiple: 'coverThree',
    'Cover 2': 'coverTwo',
    'Cover 3': 'coverThree',
    'Press Man': 'manPress',
    Blitz: 'blitzHeavy',
    'Defensive-minded': 'fourThreeUnder',
  };

  // Determine if role is offensive or defensive
  const offensiveRoles: CoachRole[] = [
    'headCoach',
    'offensiveCoordinator',
    'qbCoach',
    'rbCoach',
    'wrCoach',
    'teCoach',
    'olCoach',
  ];

  const defensiveRoles: CoachRole[] = [
    'defensiveCoordinator',
    'dlCoach',
    'lbCoach',
    'dbCoach',
  ];

  if (offensiveRoles.includes(role)) {
    return offensiveSchemeMap[scheme] || 'westCoast';
  }

  if (defensiveRoles.includes(role)) {
    return defensiveSchemeMap[scheme] || 'fourThreeUnder';
  }

  // Special teams or unknown
  return null;
}

/**
 * Creates a full Coach entity from a CoachCandidate
 */
export function createCoachFromCandidate(
  candidate: CoachCandidate,
  role: CoachRole,
  teamId: string,
  currentYear: number
): Coach {
  // Parse name
  const nameParts = candidate.name.split(' ');
  const firstName = nameParts[0] || 'Coach';
  const lastName = nameParts.slice(1).join(' ') || 'Unknown';

  // Generate unique ID
  const coachId = `coach-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Create base coach
  const coach = createDefaultCoach(coachId, firstName, lastName, role);

  // Randomize coaching tree
  const randomTreeName = ALL_TREE_NAMES[Math.floor(Math.random() * ALL_TREE_NAMES.length)];
  const randomGeneration = (Math.floor(Math.random() * 4) + 1) as TreeGeneration;
  const riskOptions: RiskTolerance[] = ['conservative', 'balanced', 'aggressive'];
  const randomRiskTolerance = riskOptions[Math.floor(Math.random() * riskOptions.length)];

  // Randomize personality
  const randomPrimaryPersonality =
    ALL_PERSONALITY_TYPES[Math.floor(Math.random() * ALL_PERSONALITY_TYPES.length)];
  const hasSecondary = Math.random() > 0.5;
  const randomSecondaryPersonality = hasSecondary
    ? ALL_PERSONALITY_TYPES[Math.floor(Math.random() * ALL_PERSONALITY_TYPES.length)]
    : null;

  // Create attributes based on candidate data
  const baseRating = 40 + candidate.experience * 2 + Math.floor(Math.random() * 20);
  const clampedRating = Math.min(95, Math.max(30, baseRating));

  // Create contract
  const contract = createCoachContract({
    id: `contract-${coachId}`,
    coachId,
    teamId,
    yearsTotal: candidate.expectedYears,
    salaryPerYear: candidate.expectedSalary * 1000, // Convert from K to actual
    guaranteedMoney: candidate.expectedSalary * 1000 * Math.ceil(candidate.expectedYears / 2),
    startYear: currentYear,
    isInterim: false,
    canBePoached: role !== 'headCoach',
  });

  // Get scheme
  const scheme = mapCandidateSchemeToScheme(candidate.scheme, role);

  // Return complete coach
  return {
    ...coach,
    teamId,
    role,
    scheme,
    isAvailable: false,
    tree: {
      ...createDefaultCoachingTree(randomTreeName as TreeName),
      treeName: randomTreeName as TreeName,
      generation: randomGeneration,
      philosophy: {
        offensiveTendency: candidate.scheme,
        defensiveTendency: 'balanced',
        riskTolerance: randomRiskTolerance,
      },
    },
    personality: {
      ...createDefaultPersonality(randomPrimaryPersonality as PersonalityType),
      primary: randomPrimaryPersonality as PersonalityType,
      secondary: randomSecondaryPersonality as PersonalityType | null,
      ego: 30 + Math.floor(Math.random() * 50),
      adaptability: 30 + Math.floor(Math.random() * 50),
    },
    attributes: {
      development: clampedRating + Math.floor(Math.random() * 10) - 5,
      gameDayIQ: clampedRating + Math.floor(Math.random() * 10) - 5,
      schemeTeaching: clampedRating + Math.floor(Math.random() * 10) - 5,
      playerEvaluation: clampedRating + Math.floor(Math.random() * 10) - 5,
      talentID: clampedRating + Math.floor(Math.random() * 10) - 5,
      motivation: clampedRating + Math.floor(Math.random() * 10) - 5,
      reputation: clampedRating,
      yearsExperience: candidate.experience,
      age: candidate.age,
    },
    contract,
    careerHistory: candidate.currentTeam
      ? [
          {
            teamId: 'previous-team',
            teamName: candidate.currentTeam,
            role: role,
            yearStart: currentYear - candidate.experience,
            yearEnd: currentYear - 1,
            wins: Math.floor(Math.random() * 50) + 20,
            losses: Math.floor(Math.random() * 50) + 20,
            playoffAppearances: Math.floor(Math.random() * 3),
            championships: Math.random() > 0.9 ? 1 : 0,
            achievements: candidate.strengths.slice(0, 2),
          },
        ]
      : [],
  };
}
