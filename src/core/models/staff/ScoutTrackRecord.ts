/**
 * Scout Track Record Model
 * Tracks scout evaluation history and reveals accuracy over time
 */

import { Position } from '../player/Position';

/**
 * Individual scout evaluation record
 */
export interface ScoutEvaluation {
  prospectId: string;
  prospectName: string;
  position: Position;
  evaluationYear: number;

  // What scout projected
  projectedRound: number;
  projectedSkillRange: { min: number; max: number };

  // What actually happened
  actualDraftRound: number | null; // null if undrafted
  actualSkillRevealed: number | null; // After player matured

  // Calculated
  wasHit: boolean | null; // null until player matures
}

/**
 * Scout track record over time
 */
export interface ScoutTrackRecord {
  scoutId: string;
  evaluations: ScoutEvaluation[];

  // Revealed over time (starts null)
  overallHitRate: number | null;

  // Position-specific accuracy (revealed over time)
  positionAccuracy: Partial<Record<Position, number | null>>;

  // Known tendencies (revealed after ~5 years)
  knownStrengths: string[]; // "Excellent at evaluating WRs"
  knownWeaknesses: string[]; // "Overrates RBs"

  // Data tracking
  yearsOfData: number;
  reliabilityRevealed: boolean; // True after sufficient data
}

/**
 * Minimum evaluations needed before revealing reliability
 */
export const MIN_EVALUATIONS_FOR_RELIABILITY = 20;

/**
 * Minimum years before revealing tendencies
 */
export const MIN_YEARS_FOR_TENDENCIES = 5;

/**
 * Creates an empty track record for a new scout
 */
export function createEmptyTrackRecord(scoutId: string): ScoutTrackRecord {
  return {
    scoutId,
    evaluations: [],
    overallHitRate: null,
    positionAccuracy: {},
    knownStrengths: [],
    knownWeaknesses: [],
    yearsOfData: 0,
    reliabilityRevealed: false,
  };
}

/**
 * Determines if an evaluation was a "hit" (FOR ENGINE USE ONLY)
 * A hit is when the projected skill was within range of actual
 */
export function calculateWasHit(evaluation: ScoutEvaluation): boolean | null {
  if (evaluation.actualSkillRevealed === null) {
    return null; // Player hasn't matured yet
  }

  const { min, max } = evaluation.projectedSkillRange;
  const actual = evaluation.actualSkillRevealed;

  // Within projected range = hit
  if (actual >= min && actual <= max) {
    return true;
  }

  // Within 10 points of range = partial hit (counts as hit)
  if (actual >= min - 10 && actual <= max + 10) {
    return true;
  }

  return false;
}

/**
 * Updates an evaluation with actual results
 */
export function updateEvaluationResults(
  evaluation: ScoutEvaluation,
  actualDraftRound: number | null,
  actualSkillRevealed: number | null
): ScoutEvaluation {
  const updatedEvaluation = {
    ...evaluation,
    actualDraftRound,
    actualSkillRevealed,
  };

  return {
    ...updatedEvaluation,
    wasHit: calculateWasHit(updatedEvaluation),
  };
}

/**
 * Calculates overall hit rate from evaluations (FOR ENGINE USE ONLY)
 */
export function calculateOverallHitRate(evaluations: ScoutEvaluation[]): number | null {
  const completedEvaluations = evaluations.filter((e) => e.wasHit !== null);

  if (completedEvaluations.length < MIN_EVALUATIONS_FOR_RELIABILITY) {
    return null;
  }

  const hits = completedEvaluations.filter((e) => e.wasHit === true).length;
  return hits / completedEvaluations.length;
}

/**
 * Calculates position-specific accuracy (FOR ENGINE USE ONLY)
 */
export function calculatePositionAccuracy(
  evaluations: ScoutEvaluation[]
): Partial<Record<Position, number | null>> {
  const positionAccuracy: Partial<Record<Position, number | null>> = {};

  // Group evaluations by position
  const byPosition = new Map<Position, ScoutEvaluation[]>();
  for (const evaluation of evaluations) {
    const current = byPosition.get(evaluation.position) || [];
    current.push(evaluation);
    byPosition.set(evaluation.position, current);
  }

  // Calculate accuracy for each position with enough data
  for (const [position, posEvaluations] of byPosition) {
    const completed = posEvaluations.filter((e) => e.wasHit !== null);

    if (completed.length >= 5) {
      // Need at least 5 evaluations for position accuracy
      const hits = completed.filter((e) => e.wasHit === true).length;
      positionAccuracy[position] = hits / completed.length;
    } else {
      positionAccuracy[position] = null;
    }
  }

  return positionAccuracy;
}

/**
 * Determines known strengths based on track record (FOR ENGINE USE ONLY)
 */
export function determineStrengths(
  positionAccuracy: Partial<Record<Position, number | null>>
): string[] {
  const strengths: string[] = [];

  for (const [position, accuracy] of Object.entries(positionAccuracy)) {
    if (accuracy !== null && accuracy >= 0.7) {
      strengths.push(`Excellent at evaluating ${position}s`);
    }
  }

  return strengths;
}

/**
 * Determines known weaknesses based on track record (FOR ENGINE USE ONLY)
 */
export function determineWeaknesses(
  positionAccuracy: Partial<Record<Position, number | null>>
): string[] {
  const weaknesses: string[] = [];

  for (const [position, accuracy] of Object.entries(positionAccuracy)) {
    if (accuracy !== null && accuracy <= 0.3) {
      weaknesses.push(`Often misses on ${position}s`);
    }
  }

  return weaknesses;
}

/**
 * Updates a track record with new data (FOR ENGINE USE ONLY)
 */
export function updateTrackRecord(record: ScoutTrackRecord, newYear: boolean): ScoutTrackRecord {
  const yearsOfData = newYear ? record.yearsOfData + 1 : record.yearsOfData;
  const overallHitRate = calculateOverallHitRate(record.evaluations);
  const positionAccuracy = calculatePositionAccuracy(record.evaluations);

  const reliabilityRevealed =
    record.evaluations.filter((e) => e.wasHit !== null).length >= MIN_EVALUATIONS_FOR_RELIABILITY;

  const knownStrengths =
    yearsOfData >= MIN_YEARS_FOR_TENDENCIES ? determineStrengths(positionAccuracy) : [];

  const knownWeaknesses =
    yearsOfData >= MIN_YEARS_FOR_TENDENCIES ? determineWeaknesses(positionAccuracy) : [];

  return {
    ...record,
    yearsOfData,
    overallHitRate,
    positionAccuracy,
    reliabilityRevealed,
    knownStrengths,
    knownWeaknesses,
  };
}

/**
 * Adds a new evaluation to track record
 */
export function addEvaluation(
  record: ScoutTrackRecord,
  evaluation: ScoutEvaluation
): ScoutTrackRecord {
  return {
    ...record,
    evaluations: [...record.evaluations, evaluation],
  };
}

/**
 * Validates a scout evaluation
 */
export function validateEvaluation(evaluation: ScoutEvaluation): boolean {
  // Projected round must be 1-7
  if (evaluation.projectedRound < 1 || evaluation.projectedRound > 7) {
    return false;
  }

  // Skill range must be valid
  if (
    evaluation.projectedSkillRange.min < 0 ||
    evaluation.projectedSkillRange.max > 100 ||
    evaluation.projectedSkillRange.min > evaluation.projectedSkillRange.max
  ) {
    return false;
  }

  // Actual draft round must be 1-7 or null
  if (
    evaluation.actualDraftRound !== null &&
    (evaluation.actualDraftRound < 1 || evaluation.actualDraftRound > 7)
  ) {
    return false;
  }

  return true;
}
