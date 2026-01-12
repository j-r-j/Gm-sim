/**
 * Pattern Recognition System - tracks performance patterns over time.
 *
 * This system monitors player events and accumulates evidence for hidden traits.
 * Traits are revealed when confidence reaches certain thresholds.
 * The "It" factor is NEVER directly revealed.
 */

import { Trait } from '../models/player/HiddenTraits';
import {
  GameEventContext,
  GameEventType,
  ConfidenceLevel,
  getConfidenceLevel,
  getTriggersForEvent,
} from './RevelationTriggers';

/**
 * A recorded event observation for pattern tracking
 */
export interface EventObservation {
  /** Type of event observed */
  eventType: GameEventType;

  /** Timestamp when the event occurred */
  timestamp: number;

  /** Season when the event occurred */
  season: number;

  /** Week when the event occurred */
  week: number;

  /** Was this in a high-pressure situation? */
  isHighPressure: boolean;

  /** Was this in a playoff game? */
  isPlayoff: boolean;

  /** The trait this observation relates to (if any) */
  relatedTrait?: Trait;

  /** Weight of this observation for pattern analysis (0-1) */
  weight: number;
}

/**
 * Evidence accumulated for a specific trait
 */
export interface TraitEvidence {
  /** The trait this evidence is for */
  trait: Trait;

  /** Total observations supporting this trait */
  supportingObservations: number;

  /** Total observations contradicting this trait */
  contradictingObservations: number;

  /** Weighted sum of evidence (positive = supports, negative = contradicts) */
  weightedEvidence: number;

  /** Current confidence level */
  confidence: ConfidenceLevel;

  /** Probability value (0-1) */
  probability: number;

  /** Most recent observation timestamp */
  lastObservation: number;

  /** List of recent observation descriptions */
  recentObservations: string[];
}

/**
 * Pattern data for a player
 */
export interface PlayerPatternData {
  /** Player ID */
  playerId: string;

  /** All recorded observations */
  observations: EventObservation[];

  /** Evidence accumulated for each trait */
  traitEvidence: Map<Trait, TraitEvidence>;

  /** Traits that have been confirmed through patterns */
  confirmedTraits: Trait[];

  /** Total games tracked */
  gamesTracked: number;

  /** Total seasons tracked */
  seasonsTracked: number;

  /** Performance statistics */
  stats: PerformanceStats;
}

/**
 * Performance statistics for pattern analysis
 */
export interface PerformanceStats {
  /** Games played per season average */
  gamesPerSeason: number;

  /** Total injuries */
  totalInjuries: number;

  /** Seasons with 4+ games missed */
  seasonsWithMajorInjuries: number;

  /** Consecutive full seasons */
  consecutiveFullSeasons: number;

  /** Clutch plays made */
  clutchPlays: number;

  /** Clutch failures */
  clutchFailures: number;

  /** Penalties committed */
  penalties: number;

  /** Times ejected */
  ejections: number;

  /** Drops/fumbles */
  ballSecurityIssues: number;
}

/**
 * Creates empty pattern data for a player
 */
export function createPlayerPatternData(playerId: string): PlayerPatternData {
  return {
    playerId,
    observations: [],
    traitEvidence: new Map(),
    confirmedTraits: [],
    gamesTracked: 0,
    seasonsTracked: 0,
    stats: {
      gamesPerSeason: 0,
      totalInjuries: 0,
      seasonsWithMajorInjuries: 0,
      consecutiveFullSeasons: 0,
      clutchPlays: 0,
      clutchFailures: 0,
      penalties: 0,
      ejections: 0,
      ballSecurityIssues: 0,
    },
  };
}

/**
 * Creates empty trait evidence
 */
function createTraitEvidence(trait: Trait): TraitEvidence {
  return {
    trait,
    supportingObservations: 0,
    contradictingObservations: 0,
    weightedEvidence: 0,
    confidence: 'hint',
    probability: 0,
    lastObservation: 0,
    recentObservations: [],
  };
}

/**
 * Trait pairs that are opposites (evidence for one is evidence against the other)
 */
const OPPOSITE_TRAITS: [Trait, Trait][] = [
  ['clutch', 'chokes'],
  ['ironMan', 'injuryProne'],
  ['motor', 'lazy'],
  ['leader', 'lockerRoomCancer'],
  ['teamFirst', 'diva'],
  ['coolUnderPressure', 'hotHead'],
];

/**
 * Gets the opposite trait if one exists
 */
function getOppositeTrait(trait: Trait): Trait | undefined {
  for (const [a, b] of OPPOSITE_TRAITS) {
    if (trait === a) return b;
    if (trait === b) return a;
  }
  return undefined;
}

/**
 * Records an observation and updates pattern data
 */
export function recordObservation(
  patternData: PlayerPatternData,
  context: GameEventContext,
  observationDescription: string
): void {
  const triggers = getTriggersForEvent(context.eventType);

  // Create base observation
  const observation: EventObservation = {
    eventType: context.eventType,
    timestamp: Date.now(),
    season: context.season,
    week: context.week,
    isHighPressure: context.isPlayoff || (context.quarter ?? 0) >= 4,
    isPlayoff: context.isPlayoff,
    weight: 1.0,
  };

  // Adjust weight based on context
  if (context.isPlayoff) observation.weight *= 1.5;
  if (observation.isHighPressure) observation.weight *= 1.25;

  // Update stats based on event type
  updateStats(patternData.stats, context);

  // Process each applicable trigger
  for (const trigger of triggers) {
    if (trigger.checkCondition(context)) {
      const probability = trigger.calculateProbability(context);
      const trait = trigger.trait;

      // Create observation copy with trait info
      const traitObservation = {
        ...observation,
        relatedTrait: trait,
        weight: observation.weight * probability,
      };

      patternData.observations.push(traitObservation);

      // Update evidence for this trait
      updateTraitEvidence(patternData, trait, traitObservation, observationDescription, true);

      // Update opposite trait if exists (as contradicting evidence)
      const oppositeTrait = getOppositeTrait(trait);
      if (oppositeTrait) {
        updateTraitEvidence(
          patternData,
          oppositeTrait,
          traitObservation,
          observationDescription,
          false
        );
      }
    }
  }
}

/**
 * Updates stats based on event type
 */
function updateStats(stats: PerformanceStats, context: GameEventContext): void {
  switch (context.eventType) {
    case 'injuryOccurred':
      stats.totalInjuries++;
      if ((context.gamesMissedThisSeason ?? 0) >= 4) {
        stats.seasonsWithMajorInjuries++;
        stats.consecutiveFullSeasons = 0;
      }
      break;
    case 'fullSeasonPlayed':
      stats.consecutiveFullSeasons++;
      break;
    case 'gameWinningPlay':
    case 'playoffTouchdown':
      stats.clutchPlays++;
      break;
    case 'crucialDrop':
    case 'bigGameDisappearance':
      stats.clutchFailures++;
      break;
    case 'penaltyEjection':
      stats.ejections++;
      stats.penalties++;
      break;
    case 'practiceAltercation':
      stats.penalties++;
      break;
    case 'fumbleEvent':
    case 'dropEvent':
      stats.ballSecurityIssues++;
      break;
  }
}

/**
 * Updates evidence for a specific trait
 */
function updateTraitEvidence(
  patternData: PlayerPatternData,
  trait: Trait,
  observation: EventObservation,
  description: string,
  isSupporting: boolean
): void {
  // Get or create evidence record
  let evidence = patternData.traitEvidence.get(trait);
  if (!evidence) {
    evidence = createTraitEvidence(trait);
    patternData.traitEvidence.set(trait, evidence);
  }

  // Update observation counts
  if (isSupporting) {
    evidence.supportingObservations++;
    evidence.weightedEvidence += observation.weight;
  } else {
    evidence.contradictingObservations++;
    evidence.weightedEvidence -= observation.weight * 0.5; // Contradicting evidence is weighted less
  }

  // Update timestamp and recent observations
  evidence.lastObservation = observation.timestamp;
  evidence.recentObservations.unshift(description);
  if (evidence.recentObservations.length > 5) {
    evidence.recentObservations.pop();
  }

  // Recalculate probability and confidence
  recalculateConfidence(evidence);
}

/**
 * Recalculates confidence level based on accumulated evidence
 */
function recalculateConfidence(evidence: TraitEvidence): void {
  // Use a sigmoid function to convert weighted evidence to probability
  // This ensures probability stays in (0, 1) range
  const k = 0.5; // Steepness of sigmoid
  const x0 = 3; // Evidence threshold for 50% probability

  const normalizedEvidence = evidence.weightedEvidence;

  // Sigmoid: 1 / (1 + e^(-k(x - x0)))
  evidence.probability = 1 / (1 + Math.exp(-k * (normalizedEvidence - x0)));

  // Apply minimum threshold - need at least 2 supporting observations
  if (evidence.supportingObservations < 2) {
    evidence.probability = Math.min(evidence.probability, 0.3);
  }

  // Get confidence level
  evidence.confidence = getConfidenceLevel(evidence.probability);
}

/**
 * Gets the current confidence level for a trait
 */
export function getTraitConfidence(
  patternData: PlayerPatternData,
  trait: Trait
): TraitEvidence | undefined {
  return patternData.traitEvidence.get(trait);
}

/**
 * Gets all traits with at least moderate confidence
 */
export function getHighConfidenceTraits(patternData: PlayerPatternData): TraitEvidence[] {
  const results: TraitEvidence[] = [];

  patternData.traitEvidence.forEach((evidence) => {
    if (
      evidence.confidence === 'confirmed' ||
      evidence.confidence === 'strong' ||
      evidence.confidence === 'moderate'
    ) {
      results.push(evidence);
    }
  });

  return results.sort((a, b) => b.probability - a.probability);
}

/**
 * Gets all traits with any evidence
 */
export function getAllTraitEvidence(patternData: PlayerPatternData): TraitEvidence[] {
  const results: TraitEvidence[] = [];

  patternData.traitEvidence.forEach((evidence) => {
    if (evidence.supportingObservations > 0) {
      results.push(evidence);
    }
  });

  return results.sort((a, b) => b.probability - a.probability);
}

/**
 * Checks if a trait should be confirmed based on evidence
 */
export function shouldConfirmTrait(patternData: PlayerPatternData, trait: Trait): boolean {
  const evidence = patternData.traitEvidence.get(trait);
  if (!evidence) return false;

  return evidence.confidence === 'confirmed';
}

/**
 * Confirms a trait and adds it to the confirmed list
 */
export function confirmTrait(patternData: PlayerPatternData, trait: Trait): boolean {
  if (patternData.confirmedTraits.includes(trait)) {
    return false; // Already confirmed
  }

  patternData.confirmedTraits.push(trait);
  return true;
}

/**
 * Decays old evidence to prevent stale data from dominating
 * Call this at end of each season
 */
export function applyEvidenceDecay(
  patternData: PlayerPatternData,
  decayFactor: number = 0.8
): void {
  patternData.traitEvidence.forEach((evidence) => {
    evidence.weightedEvidence *= decayFactor;
    recalculateConfidence(evidence);
  });
}

/**
 * Gets a summary of pattern data for debugging/display
 */
export function getPatternSummary(patternData: PlayerPatternData): string {
  const lines: string[] = [
    `Player Pattern Data Summary`,
    `Games Tracked: ${patternData.gamesTracked}`,
    `Seasons Tracked: ${patternData.seasonsTracked}`,
    `Total Observations: ${patternData.observations.length}`,
    `Confirmed Traits: ${patternData.confirmedTraits.join(', ') || 'None'}`,
    '',
    'Trait Evidence:',
  ];

  const allEvidence = getAllTraitEvidence(patternData);
  for (const evidence of allEvidence) {
    lines.push(
      `  ${evidence.trait}: ${evidence.confidence} (${(evidence.probability * 100).toFixed(1)}%) - ` +
        `${evidence.supportingObservations} supporting, ${evidence.contradictingObservations} contradicting`
    );
  }

  return lines.join('\n');
}

/**
 * Validates player pattern data
 */
export function validatePlayerPatternData(data: PlayerPatternData): boolean {
  if (!data.playerId || typeof data.playerId !== 'string') return false;
  if (!Array.isArray(data.observations)) return false;
  if (!Array.isArray(data.confirmedTraits)) return false;
  if (typeof data.gamesTracked !== 'number' || data.gamesTracked < 0) return false;
  if (typeof data.seasonsTracked !== 'number' || data.seasonsTracked < 0) return false;

  return true;
}
