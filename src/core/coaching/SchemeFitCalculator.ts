/**
 * Scheme Fit Calculator
 * Calculates how well players fit specific schemes and handles scheme transition penalties
 */

import { Player } from '../models/player/Player';
import { isOffensivePosition, isDefensivePosition } from '../models/player/Position';
import { TechnicalSkills } from '../models/player/TechnicalSkills';
import {
  OffensiveScheme,
  DefensiveScheme,
  FitLevel,
  ALL_OFFENSIVE_SCHEMES,
  ALL_DEFENSIVE_SCHEMES,
} from '../models/player/SchemeFit';
import {
  PositionRequirements,
  OFFENSIVE_SCHEME_DEFINITIONS,
  DEFENSIVE_SCHEME_DEFINITIONS,
  isOffensiveScheme,
} from './SchemeDefinitions';

/**
 * Scheme fit score (hidden, never exposed to UI)
 */
export interface SchemeFitScore {
  scheme: OffensiveScheme | DefensiveScheme;
  rawScore: number; // 0-100
  fitLevel: FitLevel;
  yearsInScheme: number;
  transitionPenalty: number;
  adjustedScore: number; // After transition penalty
}

/**
 * Scheme fit view model for UI (no numeric scores)
 */
export interface SchemeFitViewModel {
  schemeName: string;
  fitDescription: string; // 'Good fit', 'Average fit', 'Poor fit'
  transitionStatus: string; // 'Fully adapted', 'Adjusting', 'Learning'
}

/**
 * Player scheme tracking
 */
export interface PlayerSchemeHistory {
  playerId: string;
  currentScheme: OffensiveScheme | DefensiveScheme | null;
  yearsInCurrentScheme: number;
  previousSchemes: Array<{
    scheme: OffensiveScheme | DefensiveScheme;
    years: number;
  }>;
}

/**
 * Scheme change penalty configuration
 */
export const SCHEME_TRANSITION_PENALTIES = {
  year1: { min: -10, max: -5 }, // First year: -5 to -10 rating points
  year2: { min: -5, max: -2 }, // Second year: -2 to -5 rating points
  year3Plus: { min: 0, max: 0 }, // Third year+: No penalty
} as const;

/**
 * Fit level thresholds
 */
export const FIT_LEVEL_THRESHOLDS = {
  perfect: 90,
  good: 75,
  neutral: 50,
  poor: 25,
  terrible: 0,
} as const;

/**
 * Calculates the raw scheme fit score for a player
 * HIDDEN: Never expose this score to UI
 */
export function calculateRawSchemeFitScore(
  player: Player,
  scheme: OffensiveScheme | DefensiveScheme
): number {
  const isOffensive = isOffensiveScheme(scheme);
  const playerIsOffensive = isOffensivePosition(player.position);
  const playerIsDefensive = isDefensivePosition(player.position);

  // Special teams players have neutral fit
  if (!playerIsOffensive && !playerIsDefensive) {
    return 50;
  }

  // Wrong side of ball
  if ((isOffensive && playerIsDefensive) || (!isOffensive && playerIsOffensive)) {
    return 50; // Neutral for wrong side schemes
  }

  // Get scheme definition
  const definition = isOffensive
    ? OFFENSIVE_SCHEME_DEFINITIONS[scheme as OffensiveScheme]
    : DEFENSIVE_SCHEME_DEFINITIONS[scheme as DefensiveScheme];

  // Find position requirements
  const positionReq = definition.requirements.find(
    (req) => req.position === player.position
  );

  // If position not relevant to scheme, neutral fit
  if (!positionReq) {
    return 50;
  }

  // Calculate skill-based fit score
  const skillScore = calculateSkillFitScore(player.skills, positionReq);

  // Weight by position importance
  const weightedScore = 50 + (skillScore - 50) * positionReq.weight * 2;

  return Math.max(0, Math.min(100, weightedScore));
}

/**
 * Calculates skill-based fit score for a position
 */
function calculateSkillFitScore(
  skills: TechnicalSkills,
  requirements: PositionRequirements
): number {
  let totalScore = 0;
  let totalWeight = 0;

  for (const req of requirements.skills) {
    const skill = skills[req.skillName];
    if (!skill) continue;

    const weight = getImportanceWeight(req.importance);
    const skillMet = skill.trueValue >= req.minimumValue;
    const skillExceeds = skill.trueValue >= req.minimumValue + 10;

    let score: number;
    if (skillExceeds) {
      score = 100;
    } else if (skillMet) {
      score = 75;
    } else {
      // Below minimum - calculate how far below
      const deficit = req.minimumValue - skill.trueValue;
      score = Math.max(0, 50 - deficit * 2);
    }

    totalScore += score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 50;
  return totalScore / totalWeight;
}

/**
 * Gets the weight for an importance level
 */
function getImportanceWeight(importance: 'critical' | 'important' | 'beneficial'): number {
  switch (importance) {
    case 'critical':
      return 3;
    case 'important':
      return 2;
    case 'beneficial':
      return 1;
  }
}

/**
 * Converts raw score to fit level
 */
export function scoreToFitLevel(score: number): FitLevel {
  if (score >= FIT_LEVEL_THRESHOLDS.perfect) return 'perfect';
  if (score >= FIT_LEVEL_THRESHOLDS.good) return 'good';
  if (score >= FIT_LEVEL_THRESHOLDS.neutral) return 'neutral';
  if (score >= FIT_LEVEL_THRESHOLDS.poor) return 'poor';
  return 'terrible';
}

/**
 * Calculates the transition penalty based on years in scheme
 */
export function calculateTransitionPenalty(yearsInScheme: number): number {
  if (yearsInScheme >= 3) {
    return 0; // Fully adapted
  }

  if (yearsInScheme === 2) {
    // Second year: random between -2 and -5
    const { min, max } = SCHEME_TRANSITION_PENALTIES.year2;
    return min + Math.random() * (max - min);
  }

  // First year: random between -5 and -10
  const { min, max } = SCHEME_TRANSITION_PENALTIES.year1;
  return min + Math.random() * (max - min);
}

/**
 * Calculates a deterministic transition penalty (for consistent calculations)
 */
export function calculateDeterministicTransitionPenalty(yearsInScheme: number): number {
  if (yearsInScheme >= 3) {
    return 0;
  }
  if (yearsInScheme === 2) {
    return -3.5; // Middle of -2 to -5
  }
  return -7.5; // Middle of -5 to -10
}

/**
 * Calculates complete scheme fit including transition penalty
 */
export function calculateSchemeFitScore(
  player: Player,
  scheme: OffensiveScheme | DefensiveScheme,
  yearsInScheme: number = 0
): SchemeFitScore {
  const rawScore = calculateRawSchemeFitScore(player, scheme);
  const transitionPenalty = calculateDeterministicTransitionPenalty(yearsInScheme);
  const adjustedScore = Math.max(0, Math.min(100, rawScore + transitionPenalty));

  return {
    scheme,
    rawScore,
    fitLevel: scoreToFitLevel(adjustedScore),
    yearsInScheme,
    transitionPenalty,
    adjustedScore,
  };
}

/**
 * Creates a scheme fit view model for UI display
 * Does NOT expose numeric scores
 */
export function createSchemeFitViewModel(
  fitScore: SchemeFitScore,
  schemeName: string
): SchemeFitViewModel {
  return {
    schemeName,
    fitDescription: getFitDescription(fitScore.fitLevel),
    transitionStatus: getTransitionStatus(fitScore.yearsInScheme),
  };
}

/**
 * Gets qualitative fit description (no numbers)
 */
function getFitDescription(fitLevel: FitLevel): string {
  switch (fitLevel) {
    case 'perfect':
    case 'good':
      return 'Good fit';
    case 'neutral':
      return 'Average fit';
    case 'poor':
    case 'terrible':
      return 'Poor fit';
  }
}

/**
 * Gets transition status description
 */
function getTransitionStatus(yearsInScheme: number): string {
  if (yearsInScheme >= 3) {
    return 'Fully adapted';
  }
  if (yearsInScheme === 2) {
    return 'Adjusting';
  }
  return 'Learning';
}

/**
 * Calculates fit scores for all relevant schemes for a player
 */
export function calculateAllSchemeFits(
  player: Player,
  history?: PlayerSchemeHistory
): SchemeFitScore[] {
  const isOffensive = isOffensivePosition(player.position);
  const isDefensive = isDefensivePosition(player.position);
  const results: SchemeFitScore[] = [];

  // Calculate for offensive schemes if offensive player
  if (isOffensive) {
    for (const scheme of ALL_OFFENSIVE_SCHEMES) {
      const yearsInScheme = getYearsInScheme(scheme, history);
      results.push(calculateSchemeFitScore(player, scheme, yearsInScheme));
    }
  }

  // Calculate for defensive schemes if defensive player
  if (isDefensive) {
    for (const scheme of ALL_DEFENSIVE_SCHEMES) {
      const yearsInScheme = getYearsInScheme(scheme, history);
      results.push(calculateSchemeFitScore(player, scheme, yearsInScheme));
    }
  }

  return results;
}

/**
 * Gets years in a specific scheme from history
 */
function getYearsInScheme(
  scheme: OffensiveScheme | DefensiveScheme,
  history?: PlayerSchemeHistory
): number {
  if (!history) return 0;

  if (history.currentScheme === scheme) {
    return history.yearsInCurrentScheme;
  }

  const previous = history.previousSchemes.find((p) => p.scheme === scheme);
  return previous ? 0 : 0; // Previous experience doesn't carry over
}

/**
 * Gets the best scheme fit for a player
 */
export function getBestSchemeFit(
  player: Player,
  history?: PlayerSchemeHistory
): SchemeFitScore | null {
  const fits = calculateAllSchemeFits(player, history);
  if (fits.length === 0) return null;

  return fits.reduce((best, current) =>
    current.adjustedScore > best.adjustedScore ? current : best
  );
}

/**
 * Gets the worst scheme fit for a player
 */
export function getWorstSchemeFit(
  player: Player,
  history?: PlayerSchemeHistory
): SchemeFitScore | null {
  const fits = calculateAllSchemeFits(player, history);
  if (fits.length === 0) return null;

  return fits.reduce((worst, current) =>
    current.adjustedScore < worst.adjustedScore ? current : worst
  );
}

/**
 * Calculates scheme fit comparison between two schemes for a player
 */
export function compareSchemeFits(
  player: Player,
  scheme1: OffensiveScheme | DefensiveScheme,
  scheme2: OffensiveScheme | DefensiveScheme,
  history?: PlayerSchemeHistory
): {
  scheme1Fit: SchemeFitScore;
  scheme2Fit: SchemeFitScore;
  difference: number;
  betterScheme: OffensiveScheme | DefensiveScheme;
} {
  const fit1 = calculateSchemeFitScore(
    player,
    scheme1,
    getYearsInScheme(scheme1, history)
  );
  const fit2 = calculateSchemeFitScore(
    player,
    scheme2,
    getYearsInScheme(scheme2, history)
  );

  return {
    scheme1Fit: fit1,
    scheme2Fit: fit2,
    difference: fit1.adjustedScore - fit2.adjustedScore,
    betterScheme: fit1.adjustedScore >= fit2.adjustedScore ? scheme1 : scheme2,
  };
}

/**
 * Creates a new player scheme history
 */
export function createPlayerSchemeHistory(
  playerId: string,
  initialScheme?: OffensiveScheme | DefensiveScheme
): PlayerSchemeHistory {
  return {
    playerId,
    currentScheme: initialScheme ?? null,
    yearsInCurrentScheme: initialScheme ? 0 : 0,
    previousSchemes: [],
  };
}

/**
 * Advances scheme history by one year
 */
export function advanceSchemeHistory(history: PlayerSchemeHistory): PlayerSchemeHistory {
  if (!history.currentScheme) {
    return history;
  }

  return {
    ...history,
    yearsInCurrentScheme: history.yearsInCurrentScheme + 1,
  };
}

/**
 * Changes the scheme for a player
 */
export function changeScheme(
  history: PlayerSchemeHistory,
  newScheme: OffensiveScheme | DefensiveScheme
): PlayerSchemeHistory {
  const previousSchemes = [...history.previousSchemes];

  // Add current scheme to history if exists
  if (history.currentScheme) {
    const existingIndex = previousSchemes.findIndex(
      (p) => p.scheme === history.currentScheme
    );
    if (existingIndex >= 0) {
      previousSchemes[existingIndex] = {
        scheme: history.currentScheme,
        years: previousSchemes[existingIndex].years + history.yearsInCurrentScheme,
      };
    } else {
      previousSchemes.push({
        scheme: history.currentScheme,
        years: history.yearsInCurrentScheme,
      });
    }
  }

  return {
    ...history,
    currentScheme: newScheme,
    yearsInCurrentScheme: 0,
    previousSchemes,
  };
}

/**
 * Validates a scheme fit score
 */
export function validateSchemeFitScore(score: SchemeFitScore): boolean {
  if (score.rawScore < 0 || score.rawScore > 100) return false;
  if (score.adjustedScore < 0 || score.adjustedScore > 100) return false;
  if (score.yearsInScheme < 0) return false;
  if (score.transitionPenalty > 0 || score.transitionPenalty < -15) return false;

  const validFitLevels: FitLevel[] = ['perfect', 'good', 'neutral', 'poor', 'terrible'];
  if (!validFitLevels.includes(score.fitLevel)) return false;

  return true;
}

/**
 * Gets scheme fit percentage modifier for game simulation
 * FOR ENGINE USE ONLY - never expose to UI
 */
export function getSchemeFitModifier(fitLevel: FitLevel): number {
  switch (fitLevel) {
    case 'perfect':
      return 0.10; // +10%
    case 'good':
      return 0.05; // +5%
    case 'neutral':
      return 0;
    case 'poor':
      return -0.05; // -5%
    case 'terrible':
      return -0.10; // -10%
  }
}

/**
 * Calculates team-wide scheme fit summary
 * Returns qualitative description, not numbers
 */
export function getTeamSchemeFitSummary(
  playerFits: SchemeFitScore[]
): {
  overallDescription: string;
  strongFits: number;
  averageFits: number;
  weakFits: number;
} {
  let strongFits = 0;
  let averageFits = 0;
  let weakFits = 0;

  for (const fit of playerFits) {
    switch (fit.fitLevel) {
      case 'perfect':
      case 'good':
        strongFits++;
        break;
      case 'neutral':
        averageFits++;
        break;
      case 'poor':
      case 'terrible':
        weakFits++;
        break;
    }
  }

  let overallDescription: string;
  const total = playerFits.length;
  const strongRatio = strongFits / total;
  const weakRatio = weakFits / total;

  if (strongRatio >= 0.7) {
    overallDescription = 'Excellent scheme fit across the roster';
  } else if (strongRatio >= 0.5) {
    overallDescription = 'Good scheme fit with some gaps';
  } else if (weakRatio >= 0.5) {
    overallDescription = 'Major scheme fit issues';
  } else {
    overallDescription = 'Mixed scheme fit - some players adapting';
  }

  return {
    overallDescription,
    strongFits,
    averageFits,
    weakFits,
  };
}
