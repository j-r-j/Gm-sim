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
