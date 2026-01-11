/**
 * Scout Accuracy System
 * Tracks scout evaluation accuracy over time and reveals reliability gradually
 */

import { Scout } from '../models/staff/Scout';
import {
  ScoutTrackRecord,
  ScoutEvaluation,
  MIN_EVALUATIONS_FOR_RELIABILITY,
  MIN_YEARS_FOR_TENDENCIES,
  updateEvaluationResults,
  addEvaluation as addEvaluationToRecord,
  updateTrackRecord,
} from '../models/staff/ScoutTrackRecord';
import { Position } from '../models/player/Position';

/**
 * Accuracy revelation state
 */
export interface AccuracyRevelationState {
  scoutId: string;
  yearsOfData: number;
  totalEvaluations: number;
  completedEvaluations: number;
  reliabilityRevealed: boolean;
  tendenciesRevealed: boolean;
}

/**
 * Scout accuracy view model (what user sees)
 */
export interface ScoutAccuracyViewModel {
  scoutId: string;
  scoutName: string;

  // Only shown if revealed
  overallAccuracy: string | null; // "Reliable", "Mixed", "Questionable", or null
  hitRate: string | null; // "75%", "50%", etc. or null

  // Position tendencies (only shown after 5+ years)
  knownStrengths: string[];
  knownWeaknesses: string[];

  // Data status
  evaluationCount: number;
  yearsOfData: number;
  reliabilityKnown: boolean;

  // Qualitative description
  description: string;
}

/**
 * Evaluation result for tracking
 */
export interface EvaluationResult {
  playerId: string;
  playerName: string;
  position: Position;
  draftYear: number;

  // Scout's projection
  projectedOverall: { min: number; max: number };
  projectedRound: number;

  // Actual outcomes (filled in later)
  actualOverall: number | null;
  actualRound: number | null;
}

/**
 * Hit classification
 */
export type HitClassification = 'hit' | 'near_miss' | 'miss' | 'pending';

/**
 * Detailed accuracy breakdown
 */
export interface AccuracyBreakdown {
  totalEvaluations: number;
  completedEvaluations: number;
  hits: number;
  nearMisses: number;
  misses: number;
  pending: number;
  hitRate: number | null;
  nearMissRate: number | null;
}

/**
 * Creates accuracy revelation state
 */
export function createAccuracyRevelationState(scout: Scout): AccuracyRevelationState {
  const { trackRecord } = scout;
  const completedEvaluations = trackRecord.evaluations.filter((e) => e.wasHit !== null).length;

  return {
    scoutId: scout.id,
    yearsOfData: trackRecord.yearsOfData,
    totalEvaluations: trackRecord.evaluations.length,
    completedEvaluations,
    reliabilityRevealed: trackRecord.reliabilityRevealed,
    tendenciesRevealed: trackRecord.yearsOfData >= MIN_YEARS_FOR_TENDENCIES,
  };
}

/**
 * Records a new evaluation from a scout
 */
export function recordScoutEvaluation(scout: Scout, result: EvaluationResult): Scout {
  const evaluation: ScoutEvaluation = {
    prospectId: result.playerId,
    prospectName: result.playerName,
    position: result.position,
    evaluationYear: result.draftYear,
    projectedRound: result.projectedRound,
    projectedSkillRange: result.projectedOverall,
    actualDraftRound: result.actualRound,
    actualSkillRevealed: result.actualOverall,
    wasHit: null, // Will be calculated when actual results come in
  };

  const updatedTrackRecord = addEvaluationToRecord(scout.trackRecord, evaluation);

  return {
    ...scout,
    trackRecord: updatedTrackRecord,
  };
}

/**
 * Updates evaluations with actual player performance
 */
export function updateEvaluationsWithResults(
  scout: Scout,
  playerId: string,
  actualRound: number | null,
  actualOverall: number
): Scout {
  const updatedEvaluations = scout.trackRecord.evaluations.map((evaluation) => {
    if (evaluation.prospectId === playerId && evaluation.actualSkillRevealed === null) {
      return updateEvaluationResults(evaluation, actualRound, actualOverall);
    }
    return evaluation;
  });

  const updatedTrackRecord: ScoutTrackRecord = {
    ...scout.trackRecord,
    evaluations: updatedEvaluations,
  };

  // Recalculate track record stats
  const finalTrackRecord = updateTrackRecord(updatedTrackRecord, false);

  return {
    ...scout,
    trackRecord: finalTrackRecord,
  };
}

/**
 * Advances scout accuracy tracking by one year
 */
export function advanceAccuracyYear(scout: Scout): Scout {
  const updatedTrackRecord = updateTrackRecord(scout.trackRecord, true);

  return {
    ...scout,
    trackRecord: updatedTrackRecord,
  };
}

/**
 * Classifies an evaluation as hit, near miss, or miss
 */
export function classifyEvaluation(evaluation: ScoutEvaluation): HitClassification {
  if (evaluation.actualSkillRevealed === null) {
    return 'pending';
  }

  const { min, max } = evaluation.projectedSkillRange;
  const actual = evaluation.actualSkillRevealed;

  // Within range = hit
  if (actual >= min && actual <= max) {
    return 'hit';
  }

  // Within 10 points = near miss
  if (actual >= min - 10 && actual <= max + 10) {
    return 'near_miss';
  }

  return 'miss';
}

/**
 * Gets detailed accuracy breakdown for a scout
 */
export function getAccuracyBreakdown(scout: Scout): AccuracyBreakdown {
  const evaluations = scout.trackRecord.evaluations;

  let hits = 0;
  let nearMisses = 0;
  let misses = 0;
  let pending = 0;

  for (const evaluation of evaluations) {
    const classification = classifyEvaluation(evaluation);
    switch (classification) {
      case 'hit':
        hits++;
        break;
      case 'near_miss':
        nearMisses++;
        break;
      case 'miss':
        misses++;
        break;
      case 'pending':
        pending++;
        break;
    }
  }

  const completed = hits + nearMisses + misses;

  return {
    totalEvaluations: evaluations.length,
    completedEvaluations: completed,
    hits,
    nearMisses,
    misses,
    pending,
    hitRate: completed > 0 ? hits / completed : null,
    nearMissRate: completed > 0 ? (hits + nearMisses) / completed : null,
  };
}

/**
 * Gets position-specific accuracy (hidden until revealed)
 */
export function getPositionAccuracy(scout: Scout, position: Position): number | null {
  const positionEvaluations = scout.trackRecord.evaluations.filter(
    (e) => e.position === position && e.wasHit !== null
  );

  if (positionEvaluations.length < 5) {
    return null; // Not enough data
  }

  const hits = positionEvaluations.filter((e) => e.wasHit === true).length;
  return hits / positionEvaluations.length;
}

/**
 * Determines if scout should be revealed as having a strength
 */
export function hasStrengthAtPosition(scout: Scout, position: Position): boolean {
  if (scout.trackRecord.yearsOfData < MIN_YEARS_FOR_TENDENCIES) {
    return false;
  }

  const accuracy = getPositionAccuracy(scout, position);
  return accuracy !== null && accuracy >= 0.7;
}

/**
 * Determines if scout should be revealed as having a weakness
 */
export function hasWeaknessAtPosition(scout: Scout, position: Position): boolean {
  if (scout.trackRecord.yearsOfData < MIN_YEARS_FOR_TENDENCIES) {
    return false;
  }

  const accuracy = getPositionAccuracy(scout, position);
  return accuracy !== null && accuracy <= 0.3;
}

/**
 * Creates scout accuracy view model
 */
export function createScoutAccuracyViewModel(scout: Scout): ScoutAccuracyViewModel {
  const { trackRecord } = scout;
  const breakdown = getAccuracyBreakdown(scout);
  const revelationState = createAccuracyRevelationState(scout);

  // Determine overall accuracy description
  let overallAccuracy: string | null = null;
  let hitRate: string | null = null;

  if (revelationState.reliabilityRevealed && breakdown.hitRate !== null) {
    // Convert hit rate to qualitative description
    if (breakdown.hitRate >= 0.7) {
      overallAccuracy = 'Reliable';
    } else if (breakdown.hitRate >= 0.5) {
      overallAccuracy = 'Mixed';
    } else {
      overallAccuracy = 'Questionable';
    }

    hitRate = `${Math.round(breakdown.hitRate * 100)}%`;
  }

  // Build description
  let description: string;
  if (!revelationState.reliabilityRevealed) {
    if (breakdown.totalEvaluations === 0) {
      description = 'No evaluation history yet';
    } else if (breakdown.completedEvaluations < MIN_EVALUATIONS_FOR_RELIABILITY) {
      description = `Building track record (${breakdown.completedEvaluations}/${MIN_EVALUATIONS_FOR_RELIABILITY} evaluations completed)`;
    } else {
      description = 'Track record being established';
    }
  } else {
    if (breakdown.hitRate !== null && breakdown.hitRate >= 0.7) {
      description = 'Proven evaluator with strong track record';
    } else if (breakdown.hitRate !== null && breakdown.hitRate >= 0.5) {
      description = 'Average evaluator with room for improvement';
    } else {
      description = 'Inconsistent evaluation history';
    }
  }

  return {
    scoutId: scout.id,
    scoutName: `${scout.firstName} ${scout.lastName}`,
    overallAccuracy,
    hitRate,
    knownStrengths: trackRecord.knownStrengths,
    knownWeaknesses: trackRecord.knownWeaknesses,
    evaluationCount: breakdown.totalEvaluations,
    yearsOfData: trackRecord.yearsOfData,
    reliabilityKnown: revelationState.reliabilityRevealed,
    description,
  };
}

/**
 * Compares two scouts' revealed accuracy
 */
export function compareScoutAccuracy(
  scout1: Scout,
  scout2: Scout
): { better: Scout | null; comparison: string } {
  const view1 = createScoutAccuracyViewModel(scout1);
  const view2 = createScoutAccuracyViewModel(scout2);

  // Can only compare if both have revealed reliability
  if (!view1.reliabilityKnown || !view2.reliabilityKnown) {
    return {
      better: null,
      comparison: 'Cannot compare - insufficient data on one or both scouts',
    };
  }

  const breakdown1 = getAccuracyBreakdown(scout1);
  const breakdown2 = getAccuracyBreakdown(scout2);

  if (breakdown1.hitRate === null || breakdown2.hitRate === null) {
    return {
      better: null,
      comparison: 'Cannot compare - insufficient completed evaluations',
    };
  }

  if (Math.abs(breakdown1.hitRate - breakdown2.hitRate) < 0.05) {
    return {
      better: null,
      comparison: 'Both scouts have similar track records',
    };
  }

  if (breakdown1.hitRate > breakdown2.hitRate) {
    return {
      better: scout1,
      comparison: `${scout1.firstName} ${scout1.lastName} has a stronger track record`,
    };
  } else {
    return {
      better: scout2,
      comparison: `${scout2.firstName} ${scout2.lastName} has a stronger track record`,
    };
  }
}

/**
 * Gets scouts sorted by revealed accuracy
 */
export function getScoutsByAccuracy(scouts: Scout[]): {
  revealed: Scout[];
  unrevealed: Scout[];
} {
  const revealed: Scout[] = [];
  const unrevealed: Scout[] = [];

  for (const scout of scouts) {
    if (scout.trackRecord.reliabilityRevealed) {
      revealed.push(scout);
    } else {
      unrevealed.push(scout);
    }
  }

  // Sort revealed by hit rate (highest first)
  revealed.sort((a, b) => {
    const rateA = a.trackRecord.overallHitRate ?? 0;
    const rateB = b.trackRecord.overallHitRate ?? 0;
    return rateB - rateA;
  });

  return { revealed, unrevealed };
}

/**
 * Calculates years until reliability is revealed
 */
export function getYearsUntilRevelation(scout: Scout): number | null {
  if (scout.trackRecord.reliabilityRevealed) {
    return 0;
  }

  const completedEvaluations = scout.trackRecord.evaluations.filter(
    (e) => e.wasHit !== null
  ).length;
  const remaining = MIN_EVALUATIONS_FOR_RELIABILITY - completedEvaluations;

  if (remaining <= 0) {
    return 0;
  }

  // Estimate based on typical evaluations per year (assume ~5-10 per year)
  const evaluationsPerYear = 7;
  return Math.ceil(remaining / evaluationsPerYear);
}

/**
 * Validates scout has sufficient data for position accuracy
 */
export function hasPositionAccuracyData(scout: Scout, position: Position): boolean {
  const positionEvaluations = scout.trackRecord.evaluations.filter(
    (e) => e.position === position && e.wasHit !== null
  );

  return positionEvaluations.length >= 5;
}

/**
 * Gets all positions scout has evaluated
 */
export function getEvaluatedPositions(scout: Scout): Position[] {
  const positions = new Set<Position>();

  for (const evaluation of scout.trackRecord.evaluations) {
    positions.add(evaluation.position);
  }

  return Array.from(positions);
}

/**
 * Determines scout's best and worst positions
 */
export function getScoutPositionTendencies(scout: Scout): {
  bestPositions: Position[];
  worstPositions: Position[];
  unknownPositions: Position[];
} {
  if (scout.trackRecord.yearsOfData < MIN_YEARS_FOR_TENDENCIES) {
    return {
      bestPositions: [],
      worstPositions: [],
      unknownPositions: getEvaluatedPositions(scout),
    };
  }

  const positions = getEvaluatedPositions(scout);
  const bestPositions: Position[] = [];
  const worstPositions: Position[] = [];
  const unknownPositions: Position[] = [];

  for (const position of positions) {
    const accuracy = getPositionAccuracy(scout, position);

    if (accuracy === null) {
      unknownPositions.push(position);
    } else if (accuracy >= 0.7) {
      bestPositions.push(position);
    } else if (accuracy <= 0.3) {
      worstPositions.push(position);
    }
  }

  return { bestPositions, worstPositions, unknownPositions };
}
