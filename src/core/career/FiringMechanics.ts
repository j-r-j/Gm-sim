/**
 * Firing Mechanics
 * Handles GM termination, reason generation, severance calculation,
 * tenure summary, and legacy tracking
 */

import { Owner } from '../models/owner';
import { PatienceMeterState } from './PatienceMeterManager';

/**
 * Reason categories for firing
 */
export type FiringReasonCategory =
  | 'performance'
  | 'expectations'
  | 'relationship'
  | 'pr'
  | 'ownershipChange'
  | 'other';

/**
 * Detailed firing reason
 */
export interface FiringReason {
  category: FiringReasonCategory;
  primaryReason: string;
  secondaryReasons: string[];
  publicStatement: string;
  internalReason: string;
}

/**
 * Tenure statistics
 */
export interface TenureStats {
  totalSeasons: number;
  totalWins: number;
  totalLosses: number;
  winPercentage: number;
  playoffAppearances: number;
  divisionTitles: number;
  conferenceChampionships: number;
  superBowlWins: number;
  superBowlAppearances: number;
  firstRoundPicks: number;
  majorFreeAgents: number;
  coachesHired: number;
  coachesFired: number;
}

/**
 * Severance package details
 */
export interface SeverancePackage {
  yearsRemaining: number;
  baseSeverance: number;
  performanceBonus: number;
  totalValue: number;
  description: string;
}

/**
 * Legacy rating components
 */
export interface LegacyRating {
  overall: 'legendary' | 'excellent' | 'good' | 'average' | 'poor' | 'disastrous';
  score: number; // 0-100
  achievements: string[];
  failures: string[];
  memorableMoments: string[];
}

/**
 * Complete firing event record
 */
export interface FiringRecord {
  gmId: string;
  teamId: string;
  ownerId: string;
  season: number;
  week: number;
  reason: FiringReason;
  tenure: TenureStats;
  severance: SeverancePackage;
  legacy: LegacyRating;
  finalPatienceValue: number;
  wasForced: boolean; // Owner change, scandal, etc.
}

/**
 * Context for generating firing reason
 */
export interface FiringContext {
  consecutiveLosingSeason: number;
  missedPlayoffsCount: number;
  ownerDefianceCount: number;
  majorScandals: number;
  recentPatienceHistory: number[];
  ownershipJustChanged: boolean;
  seasonExpectation: 'rebuild' | 'competitive' | 'contender' | 'dynasty';
}

/**
 * Generates a firing reason based on context
 */
export function generateFiringReason(
  context: FiringContext,
  owner: Owner,
  patienceState: PatienceMeterState
): FiringReason {
  const reasons: { primary: string; secondary: string[]; category: FiringReasonCategory }[] = [];

  // Performance-based reasons
  if (context.consecutiveLosingSeason >= 3) {
    reasons.push({
      primary: 'Prolonged losing culture',
      secondary: [
        `${context.consecutiveLosingSeason} consecutive losing seasons`,
        'Failed to establish winning foundation',
      ],
      category: 'performance',
    });
  } else if (context.consecutiveLosingSeason >= 2) {
    reasons.push({
      primary: 'Failure to improve team performance',
      secondary: ['Consecutive losing seasons', 'Lack of visible progress'],
      category: 'performance',
    });
  }

  // Expectations-based reasons
  if (context.missedPlayoffsCount >= 2 && context.seasonExpectation === 'contender') {
    reasons.push({
      primary: 'Failed to meet playoff expectations',
      secondary: [
        'Team built to contend failed to reach playoffs',
        'Underperformance relative to roster talent',
      ],
      category: 'expectations',
    });
  }

  // Relationship-based reasons
  if (context.ownerDefianceCount >= 3) {
    reasons.push({
      primary: 'Irreconcilable differences with ownership',
      secondary: [
        'Repeated failure to follow owner directives',
        'Breakdown in communication',
      ],
      category: 'relationship',
    });
  } else if (context.ownerDefianceCount >= 1 && owner.personality.traits.control >= 70) {
    reasons.push({
      primary: 'Philosophical differences with ownership',
      secondary: ['Disagreement on team direction', 'Loss of owner confidence'],
      category: 'relationship',
    });
  }

  // PR-based reasons
  if (context.majorScandals >= 2) {
    reasons.push({
      primary: 'Pattern of organizational issues',
      secondary: ['Multiple PR incidents under leadership', 'Damage to team reputation'],
      category: 'pr',
    });
  } else if (context.majorScandals >= 1) {
    reasons.push({
      primary: 'Organizational accountability',
      secondary: ['Significant PR incident', 'Need for fresh leadership'],
      category: 'pr',
    });
  }

  // Ownership change
  if (context.ownershipJustChanged) {
    reasons.push({
      primary: 'New ownership seeking fresh start',
      secondary: ['New vision for the organization', 'Change in organizational philosophy'],
      category: 'ownershipChange',
    });
  }

  // If no specific reason, use generic patience exhaustion
  if (reasons.length === 0) {
    reasons.push({
      primary: 'Loss of confidence in leadership',
      secondary: ['Accumulated concerns over tenure', 'Time for new direction'],
      category: 'other',
    });
  }

  // Select the most severe/appropriate reason
  const selectedReason = selectPrimaryReason(reasons, context);

  // Generate public vs internal statements
  const publicStatement = generatePublicStatement(selectedReason);
  const internalReason = generateInternalReason(selectedReason, context, patienceState);

  return {
    category: selectedReason.category,
    primaryReason: selectedReason.primary,
    secondaryReasons: selectedReason.secondary,
    publicStatement,
    internalReason,
  };
}

/**
 * Selects the most appropriate primary reason
 */
function selectPrimaryReason(
  reasons: { primary: string; secondary: string[]; category: FiringReasonCategory }[],
  _context: FiringContext
): { primary: string; secondary: string[]; category: FiringReasonCategory } {
  // Priority: PR > Relationship > Expectations > Performance > OwnershipChange > Other
  const priorityOrder: FiringReasonCategory[] = [
    'pr',
    'relationship',
    'expectations',
    'performance',
    'ownershipChange',
    'other',
  ];

  for (const category of priorityOrder) {
    const reason = reasons.find((r) => r.category === category);
    if (reason) return reason;
  }

  return reasons[0];
}

/**
 * Generates a diplomatic public statement
 */
function generatePublicStatement(
  reason: { primary: string; category: FiringReasonCategory }
): string {
  const templates: Record<FiringReasonCategory, string[]> = {
    performance: [
      'We thank [GM] for their efforts and wish them well in future endeavors.',
      'After careful evaluation, we have decided to move in a new direction.',
      'We appreciate [GM]\'s dedication but feel a change is needed.',
    ],
    expectations: [
      'We believe a change in leadership will help us reach our goals.',
      'Our expectations for the organization require a fresh perspective.',
      'We wish [GM] well as we seek to elevate our program.',
    ],
    relationship: [
      'We have mutually agreed to part ways.',
      'After discussions, we believe this is best for both parties.',
      'We thank [GM] for their service and wish them success.',
    ],
    pr: [
      'We are committed to the highest organizational standards.',
      'We must hold ourselves accountable at every level.',
      'We are taking steps to ensure our values are upheld.',
    ],
    ownershipChange: [
      'New ownership is excited to establish their vision for the team.',
      'We appreciate [GM]\'s work and look forward to a new chapter.',
      'This transition allows us to build toward our ownership goals.',
    ],
    other: [
      'We thank [GM] for their contributions to the organization.',
      'We wish [GM] all the best in their future endeavors.',
      'We appreciate the time [GM] spent with our organization.',
    ],
  };

  const options = templates[reason.category];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Generates the real internal reason
 */
function generateInternalReason(
  reason: { primary: string; secondary: string[] },
  context: FiringContext,
  patienceState: PatienceMeterState
): string {
  const parts: string[] = [reason.primary];

  if (context.consecutiveLosingSeason > 0) {
    parts.push(`${context.consecutiveLosingSeason} losing season(s)`);
  }

  if (context.ownerDefianceCount > 0) {
    parts.push(`${context.ownerDefianceCount} owner directive(s) ignored`);
  }

  if (patienceState.consecutiveDeclines >= 3) {
    parts.push('Consistent decline in owner confidence');
  }

  return parts.join('. ') + '.';
}

/**
 * Calculates severance package
 */
export function calculateSeverance(
  yearsRemaining: number,
  annualSalary: number,
  wasForced: boolean,
  tenure: TenureStats
): SeverancePackage {
  // Base severance: remaining contract value
  const baseSeverance = yearsRemaining * annualSalary;

  // Performance bonus for successful tenures
  let performanceBonus = 0;
  if (tenure.superBowlWins > 0) {
    performanceBonus += tenure.superBowlWins * 500000;
  }
  if (tenure.conferenceChampionships > 0) {
    performanceBonus += tenure.conferenceChampionships * 200000;
  }
  if (tenure.winPercentage >= 0.6) {
    performanceBonus += 100000;
  }

  // Forced departures (ownership change) might negotiate less
  const modifier = wasForced ? 0.75 : 1.0;

  const totalValue = Math.round((baseSeverance + performanceBonus) * modifier);

  // Generate description
  let description: string;
  if (totalValue === 0) {
    description = 'Contract expired - no severance due';
  } else if (totalValue < 1000000) {
    description = 'Modest severance package';
  } else if (totalValue < 5000000) {
    description = 'Standard severance package';
  } else if (totalValue < 10000000) {
    description = 'Substantial severance package';
  } else {
    description = 'Golden parachute severance';
  }

  return {
    yearsRemaining,
    baseSeverance: Math.round(baseSeverance * modifier),
    performanceBonus: Math.round(performanceBonus * modifier),
    totalValue,
    description,
  };
}

/**
 * Calculates legacy rating based on tenure
 */
export function calculateLegacy(tenure: TenureStats): LegacyRating {
  let score = 50; // Start at average
  const achievements: string[] = [];
  const failures: string[] = [];
  const memorableMoments: string[] = [];

  // Super Bowl impact
  if (tenure.superBowlWins > 0) {
    score += tenure.superBowlWins * 20;
    achievements.push(`${tenure.superBowlWins} Super Bowl championship(s)`);
    memorableMoments.push('Super Bowl victory celebration');
  }

  if (tenure.superBowlAppearances > tenure.superBowlWins) {
    const losses = tenure.superBowlAppearances - tenure.superBowlWins;
    score += losses * 5; // Still an achievement to get there
    if (losses === 1) {
      memorableMoments.push('Super Bowl appearance');
    }
  }

  // Conference championships
  if (tenure.conferenceChampionships > 0) {
    score += tenure.conferenceChampionships * 10;
    achievements.push(`${tenure.conferenceChampionships} conference championship(s)`);
  }

  // Division titles
  if (tenure.divisionTitles > 0) {
    score += tenure.divisionTitles * 5;
    achievements.push(`${tenure.divisionTitles} division title(s)`);
  }

  // Playoff appearances
  const playoffRate = tenure.playoffAppearances / Math.max(1, tenure.totalSeasons);
  if (playoffRate >= 0.7) {
    score += 15;
    achievements.push('Consistent playoff contender');
  } else if (playoffRate >= 0.5) {
    score += 8;
    achievements.push('Regular playoff appearances');
  } else if (playoffRate < 0.2 && tenure.totalSeasons >= 3) {
    score -= 10;
    failures.push('Rarely made playoffs');
  }

  // Win percentage
  if (tenure.winPercentage >= 0.65) {
    score += 15;
    achievements.push(`Outstanding ${Math.round(tenure.winPercentage * 100)}% win rate`);
  } else if (tenure.winPercentage >= 0.55) {
    score += 8;
    achievements.push(`Solid ${Math.round(tenure.winPercentage * 100)}% win rate`);
  } else if (tenure.winPercentage < 0.4) {
    score -= 15;
    failures.push(`Poor ${Math.round(tenure.winPercentage * 100)}% win rate`);
  } else if (tenure.winPercentage < 0.45) {
    score -= 8;
    failures.push(`Below average ${Math.round(tenure.winPercentage * 100)}% win rate`);
  }

  // Tenure length bonus/penalty
  if (tenure.totalSeasons >= 10) {
    score += 10;
    achievements.push('Decade of leadership');
    memorableMoments.push('10-year anniversary celebration');
  } else if (tenure.totalSeasons >= 5) {
    score += 5;
    achievements.push('Extended tenure');
  } else if (tenure.totalSeasons <= 2) {
    score -= 5;
    failures.push('Brief tenure');
  }

  // Draft success
  if (tenure.firstRoundPicks >= 5) {
    memorableMoments.push('Multiple first-round draft selections');
  }

  // Coaching stability
  if (tenure.coachesFired >= 3) {
    score -= 5;
    failures.push('High coaching turnover');
  } else if (tenure.coachesFired === 0 && tenure.totalSeasons >= 3) {
    score += 5;
    achievements.push('Coaching stability');
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Determine overall rating
  let overall: LegacyRating['overall'];
  if (score >= 90) {
    overall = 'legendary';
  } else if (score >= 75) {
    overall = 'excellent';
  } else if (score >= 60) {
    overall = 'good';
  } else if (score >= 40) {
    overall = 'average';
  } else if (score >= 20) {
    overall = 'poor';
  } else {
    overall = 'disastrous';
  }

  return {
    overall,
    score,
    achievements,
    failures,
    memorableMoments,
  };
}

/**
 * Creates default tenure stats
 */
export function createDefaultTenureStats(): TenureStats {
  return {
    totalSeasons: 0,
    totalWins: 0,
    totalLosses: 0,
    winPercentage: 0,
    playoffAppearances: 0,
    divisionTitles: 0,
    conferenceChampionships: 0,
    superBowlWins: 0,
    superBowlAppearances: 0,
    firstRoundPicks: 0,
    majorFreeAgents: 0,
    coachesHired: 0,
    coachesFired: 0,
  };
}

/**
 * Updates tenure stats with a season result
 */
export function updateTenureStats(
  stats: TenureStats,
  seasonResult: {
    wins: number;
    losses: number;
    madePlayoffs: boolean;
    wonDivision: boolean;
    wonConference: boolean;
    wonSuperBowl: boolean;
    madeSuperBowl: boolean;
  }
): TenureStats {
  const totalGames =
    stats.totalWins +
    stats.totalLosses +
    seasonResult.wins +
    seasonResult.losses;

  const newTotalWins = stats.totalWins + seasonResult.wins;

  return {
    ...stats,
    totalSeasons: stats.totalSeasons + 1,
    totalWins: newTotalWins,
    totalLosses: stats.totalLosses + seasonResult.losses,
    winPercentage: totalGames > 0 ? newTotalWins / totalGames : 0,
    playoffAppearances: stats.playoffAppearances + (seasonResult.madePlayoffs ? 1 : 0),
    divisionTitles: stats.divisionTitles + (seasonResult.wonDivision ? 1 : 0),
    conferenceChampionships: stats.conferenceChampionships + (seasonResult.wonConference ? 1 : 0),
    superBowlWins: stats.superBowlWins + (seasonResult.wonSuperBowl ? 1 : 0),
    superBowlAppearances: stats.superBowlAppearances + (seasonResult.madeSuperBowl ? 1 : 0),
  };
}

/**
 * Records a coaching change in tenure
 */
export function recordCoachingChange(
  stats: TenureStats,
  hired: boolean
): TenureStats {
  if (hired) {
    return { ...stats, coachesHired: stats.coachesHired + 1 };
  } else {
    return { ...stats, coachesFired: stats.coachesFired + 1 };
  }
}

/**
 * Records a draft pick in tenure
 */
export function recordDraftPick(
  stats: TenureStats,
  round: number
): TenureStats {
  if (round === 1) {
    return { ...stats, firstRoundPicks: stats.firstRoundPicks + 1 };
  }
  return stats;
}

/**
 * Records a major free agent signing
 */
export function recordFreeAgentSigning(stats: TenureStats): TenureStats {
  return { ...stats, majorFreeAgents: stats.majorFreeAgents + 1 };
}

/**
 * Creates a complete firing record
 */
export function createFiringRecord(
  gmId: string,
  teamId: string,
  owner: Owner,
  season: number,
  week: number,
  tenure: TenureStats,
  patienceState: PatienceMeterState,
  firingContext: FiringContext,
  contractYearsRemaining: number,
  annualSalary: number
): FiringRecord {
  const reason = generateFiringReason(firingContext, owner, patienceState);
  const severance = calculateSeverance(
    contractYearsRemaining,
    annualSalary,
    firingContext.ownershipJustChanged,
    tenure
  );
  const legacy = calculateLegacy(tenure);

  return {
    gmId,
    teamId,
    ownerId: owner.id,
    season,
    week,
    reason,
    tenure,
    severance,
    legacy,
    finalPatienceValue: patienceState.currentValue,
    wasForced: firingContext.ownershipJustChanged,
  };
}

/**
 * Determines if a firing should occur
 */
export function shouldFire(
  patienceState: PatienceMeterState,
  context: FiringContext,
  owner: Owner
): { shouldFire: boolean; isImmediate: boolean; reason: string } {
  // Immediate firing conditions
  if (patienceState.currentValue < 20) {
    return {
      shouldFire: true,
      isImmediate: true,
      reason: 'Patience exhausted',
    };
  }

  // Immediate firing for major scandals with PR-obsessed owner
  if (context.majorScandals >= 2 && owner.personality.secondaryTraits.includes('prObsessed')) {
    return {
      shouldFire: true,
      isImmediate: true,
      reason: 'Multiple PR incidents with PR-sensitive ownership',
    };
  }

  // Immediate firing for defiance with high-control owner
  if (
    context.ownerDefianceCount >= 3 &&
    owner.personality.traits.control >= 70
  ) {
    return {
      shouldFire: true,
      isImmediate: true,
      reason: 'Repeated defiance of controlling owner',
    };
  }

  // End of season firing conditions (not immediate)
  if (
    context.consecutiveLosingSeason >= 3 &&
    owner.personality.traits.patience <= 40
  ) {
    return {
      shouldFire: true,
      isImmediate: false,
      reason: 'Extended losing with impatient owner',
    };
  }

  // New ownership often cleans house
  if (
    context.ownershipJustChanged &&
    patienceState.currentValue < 60 &&
    Math.random() < 0.6
  ) {
    return {
      shouldFire: true,
      isImmediate: false,
      reason: 'New ownership seeking fresh start',
    };
  }

  return {
    shouldFire: false,
    isImmediate: false,
    reason: '',
  };
}

/**
 * Gets a human-readable description of the legacy
 */
export function getLegacyDescription(legacy: LegacyRating): string {
  const descriptions: Record<LegacyRating['overall'], string> = {
    legendary: 'Will be remembered as one of the greatest GMs in franchise history',
    excellent: 'Left a lasting positive impact on the organization',
    good: 'Solid tenure with notable achievements',
    average: 'Had some successes but also significant challenges',
    poor: 'Tenure fell short of expectations',
    disastrous: 'One of the most difficult periods in franchise history',
  };

  return descriptions[legacy.overall];
}

/**
 * Validates a tenure stats object
 */
export function validateTenureStats(stats: TenureStats): boolean {
  if (stats.totalSeasons < 0) return false;
  if (stats.totalWins < 0 || stats.totalLosses < 0) return false;
  if (stats.winPercentage < 0 || stats.winPercentage > 1) return false;
  if (stats.playoffAppearances < 0) return false;
  if (stats.divisionTitles < 0) return false;
  if (stats.conferenceChampionships < 0) return false;
  if (stats.superBowlWins < 0 || stats.superBowlAppearances < 0) return false;
  if (stats.superBowlWins > stats.superBowlAppearances) return false;
  if (stats.firstRoundPicks < 0) return false;
  if (stats.majorFreeAgents < 0) return false;
  if (stats.coachesHired < 0 || stats.coachesFired < 0) return false;

  return true;
}

/**
 * Validates a firing record
 */
export function validateFiringRecord(record: FiringRecord): boolean {
  if (!record.gmId || !record.teamId || !record.ownerId) return false;
  if (record.season < 1 || record.week < 0) return false;
  if (!record.reason || !record.reason.primaryReason) return false;
  if (!validateTenureStats(record.tenure)) return false;
  if (record.finalPatienceValue < 0 || record.finalPatienceValue > 100) return false;

  return true;
}
