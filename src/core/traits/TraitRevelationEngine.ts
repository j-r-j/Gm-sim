/**
 * Trait Revelation Engine - the main engine for revealing hidden traits.
 *
 * This engine:
 * 1. Processes game events to check for trait revelations
 * 2. Tracks player patterns over time
 * 3. Returns revelations with confidence levels
 * 4. Generates news events for revelations
 *
 * IMPORTANT: Traits are NEVER shown as labels until confirmed.
 * The "It" factor is NEVER directly revealed.
 */

import { Player, getPlayerFullName } from '../models/player/Player';
import {
  Trait,
  hasTrait,
  revealTrait,
  isTraitRevealed,
} from '../models/player/HiddenTraits';
import {
  GameEventContext,
  GameEventType,
  ConfidenceLevel,
  getTriggersForEvent,
  RevelationTrigger,
} from './RevelationTriggers';
import {
  PlayerPatternData,
  TraitEvidence,
  createPlayerPatternData,
  recordObservation,
  getTraitConfidence,
  getHighConfidenceTraits,
  shouldConfirmTrait,
  confirmTrait,
  applyEvidenceDecay,
} from './PatternRecognitionSystem';
import { NewsEvent, generateTraitNews } from './NewsEventGenerator';
import { chance } from '../generators/utils/RandomUtils';

/**
 * Result of processing a game event
 */
export interface RevelationResult {
  /** Player ID */
  playerId: string;

  /** Events that occurred */
  events: ProcessedEvent[];

  /** Any traits that were revealed */
  revealedTraits: RevealedTrait[];

  /** Generated news events */
  newsEvents: NewsEvent[];

  /** Updated pattern data */
  patternData: PlayerPatternData;
}

/**
 * A processed game event
 */
export interface ProcessedEvent {
  /** The event type */
  eventType: GameEventType;

  /** Whether the event triggered any trait checks */
  triggeredTraitChecks: boolean;

  /** Traits that were checked */
  checkedTraits: Trait[];

  /** Description of the event */
  description: string;
}

/**
 * A trait that was revealed
 */
export interface RevealedTrait {
  /** The trait that was revealed */
  trait: Trait;

  /** Confidence level of the revelation */
  confidence: ConfidenceLevel;

  /** Whether this fully confirms the trait */
  isConfirmed: boolean;

  /** The evidence that led to this revelation */
  evidence: TraitEvidence;
}

/**
 * Options for the revelation engine
 */
export interface RevelationEngineOptions {
  /** Minimum confidence level to generate news */
  minNewsConfidence: ConfidenceLevel;

  /** Whether to automatically reveal traits when confirmed */
  autoRevealConfirmed: boolean;

  /** Probability multiplier for revelations (for testing) */
  revelationMultiplier: number;
}

/**
 * Default engine options
 */
export const DEFAULT_ENGINE_OPTIONS: RevelationEngineOptions = {
  minNewsConfidence: 'suspected',
  autoRevealConfirmed: true,
  revelationMultiplier: 1.0,
};

/**
 * Storage for player pattern data
 */
const playerPatternStorage = new Map<string, PlayerPatternData>();

/**
 * Gets or creates pattern data for a player
 */
export function getPlayerPatternData(playerId: string): PlayerPatternData {
  let data = playerPatternStorage.get(playerId);
  if (!data) {
    data = createPlayerPatternData(playerId);
    playerPatternStorage.set(playerId, data);
  }
  return data;
}

/**
 * Sets pattern data for a player (for loading saved data)
 */
export function setPlayerPatternData(playerId: string, data: PlayerPatternData): void {
  playerPatternStorage.set(playerId, data);
}

/**
 * Clears all stored pattern data (for testing/reset)
 */
export function clearAllPatternData(): void {
  playerPatternStorage.clear();
}

/**
 * Generates an event description based on the event type and context
 */
function generateEventDescription(eventType: GameEventType, context: GameEventContext): string {
  const descriptions: Record<GameEventType, string> = {
    gameWinningPlay: context.isPlayoff
      ? 'Made game-winning play in playoff game'
      : 'Made game-winning play',
    playoffTouchdown: 'Scored touchdown in playoff game',
    crucialDrop: 'Dropped crucial pass in clutch moment',
    practiceAltercation: 'Involved in practice altercation',
    penaltyEjection: 'Ejected from game for penalty',
    fullSeasonPlayed: 'Played every game this season',
    injuryOccurred: 'Suffered injury',
    returnedFromInjury: 'Returned quickly from injury',
    bigGamePerformance: 'Outstanding performance in big game',
    bigGameDisappearance: 'Quiet game in high-stakes situation',
    mediaIncident: 'Involved in media controversy',
    leadershipMoment: 'Demonstrated leadership',
    filmStudyReport: 'Coach report on film study habits',
    practiceEffort: 'Practice effort observation',
    schemeChange: 'Team scheme change affected performance',
    contractNegotiation: 'Contract negotiation behavior noted',
    teamMeetingBehavior: 'Behavior in team meeting observed',
    fumbleEvent: 'Fumbled the ball',
    dropEvent: 'Dropped a pass',
  };

  return descriptions[eventType] || `Event: ${eventType}`;
}

/**
 * Processes a game event for a player and checks for trait revelations
 */
export function processGameEvent(
  player: Player,
  context: GameEventContext,
  teamName: string = 'the team',
  options: Partial<RevelationEngineOptions> = {}
): RevelationResult {
  const engineOptions = { ...DEFAULT_ENGINE_OPTIONS, ...options };
  const patternData = getPlayerPatternData(player.id);
  const playerName = getPlayerFullName(player);
  const description = generateEventDescription(context.eventType, context);

  const result: RevelationResult = {
    playerId: player.id,
    events: [],
    revealedTraits: [],
    newsEvents: [],
    patternData,
  };

  // Get triggers for this event type
  const triggers = getTriggersForEvent(context.eventType);
  const checkedTraits: Trait[] = [];

  // Process each applicable trigger
  for (const trigger of triggers) {
    if (trigger.checkCondition(context)) {
      checkedTraits.push(trigger.trait);

      // Check if player actually has this trait
      if (hasTrait(player.hiddenTraits, trigger.trait)) {
        // Record observation
        recordObservation(patternData, context, description);

        // Check for revelation
        const evidence = getTraitConfidence(patternData, trigger.trait);
        if (evidence) {
          const revelationResult = checkForRevelation(
            player,
            trigger,
            evidence,
            context,
            playerName,
            teamName,
            engineOptions
          );

          if (revelationResult) {
            result.revealedTraits.push(revelationResult.revealed);
            if (revelationResult.news) {
              result.newsEvents.push(revelationResult.news);
            }
          }
        }
      }
    }
  }

  // Record the processed event
  result.events.push({
    eventType: context.eventType,
    triggeredTraitChecks: checkedTraits.length > 0,
    checkedTraits,
    description,
  });

  return result;
}

/**
 * Checks if a trait should be revealed and generates news if appropriate
 */
function checkForRevelation(
  player: Player,
  trigger: RevelationTrigger,
  evidence: TraitEvidence,
  context: GameEventContext,
  playerName: string,
  teamName: string,
  options: RevelationEngineOptions
): { revealed: RevealedTrait; news: NewsEvent | null } | null {
  // Already revealed? Skip
  if (isTraitRevealed(player.hiddenTraits, trigger.trait)) {
    return null;
  }

  // Calculate revelation probability
  const baseProbability = trigger.calculateProbability(context);
  const adjustedProbability = baseProbability * options.revelationMultiplier;

  // Check if this revelation attempt succeeds
  if (!chance(adjustedProbability)) {
    return null;
  }

  // Determine if this is a full confirmation
  const isConfirmed = shouldConfirmTrait(getPlayerPatternData(player.id), trigger.trait);

  // Auto-reveal if confirmed
  if (isConfirmed && options.autoRevealConfirmed) {
    revealTrait(player.hiddenTraits, trigger.trait);
    confirmTrait(getPlayerPatternData(player.id), trigger.trait);
  }

  // Create revealed trait record
  const revealed: RevealedTrait = {
    trait: trigger.trait,
    confidence: evidence.confidence,
    isConfirmed,
    evidence,
  };

  // Generate news if confidence is high enough
  let news: NewsEvent | null = null;
  const confidenceLevels: ConfidenceLevel[] = ['confirmed', 'strong', 'moderate', 'suspected', 'hint'];
  const minConfidenceIndex = confidenceLevels.indexOf(options.minNewsConfidence);
  const currentConfidenceIndex = confidenceLevels.indexOf(evidence.confidence);

  if (currentConfidenceIndex <= minConfidenceIndex) {
    news = generateTraitNews(player.id, playerName, teamName, evidence, context);
  }

  return { revealed, news };
}

/**
 * Processes multiple game events at once
 */
export function processMultipleEvents(
  player: Player,
  events: GameEventContext[],
  teamName: string = 'the team',
  options: Partial<RevelationEngineOptions> = {}
): RevelationResult {
  const engineOptions = { ...DEFAULT_ENGINE_OPTIONS, ...options };

  const combinedResult: RevelationResult = {
    playerId: player.id,
    events: [],
    revealedTraits: [],
    newsEvents: [],
    patternData: getPlayerPatternData(player.id),
  };

  for (const event of events) {
    const result = processGameEvent(player, event, teamName, engineOptions);
    combinedResult.events.push(...result.events);
    combinedResult.revealedTraits.push(...result.revealedTraits);
    combinedResult.newsEvents.push(...result.newsEvents);
  }

  combinedResult.patternData = getPlayerPatternData(player.id);
  return combinedResult;
}

/**
 * Gets all potential traits for a player based on pattern data
 */
export function getPotentialTraits(
  player: Player,
  minConfidence: ConfidenceLevel = 'suspected'
): TraitEvidence[] {
  const patternData = getPlayerPatternData(player.id);
  const allEvidence = getHighConfidenceTraits(patternData);

  const confidenceLevels: ConfidenceLevel[] = ['confirmed', 'strong', 'moderate', 'suspected', 'hint'];
  const minConfidenceIndex = confidenceLevels.indexOf(minConfidence);

  return allEvidence.filter((evidence) => {
    const evidenceIndex = confidenceLevels.indexOf(evidence.confidence);
    return evidenceIndex <= minConfidenceIndex;
  });
}

/**
 * Gets the current revelation status for a specific trait
 */
export function getTraitRevelationStatus(
  player: Player,
  trait: Trait
): {
  hasTrait: boolean;
  isRevealed: boolean;
  confidence: ConfidenceLevel;
  evidence: TraitEvidence | undefined;
} {
  const hasTheTrait = hasTrait(player.hiddenTraits, trait);
  const isRevealed = isTraitRevealed(player.hiddenTraits, trait);
  const patternData = getPlayerPatternData(player.id);
  const evidence = getTraitConfidence(patternData, trait);

  return {
    hasTrait: hasTheTrait,
    isRevealed,
    confidence: evidence?.confidence || 'hint',
    evidence,
  };
}

/**
 * Applies end-of-season decay to evidence (call at season end)
 */
export function applySeasonEndDecay(playerId: string, decayFactor: number = 0.8): void {
  const patternData = getPlayerPatternData(playerId);
  applyEvidenceDecay(patternData, decayFactor);
}

/**
 * Gets a summary of revealed traits for a player
 */
export function getRevealedTraitsSummary(player: Player): {
  revealed: Trait[];
  pending: { trait: Trait; confidence: ConfidenceLevel }[];
} {
  const revealed: Trait[] = [];
  const pending: { trait: Trait; confidence: ConfidenceLevel }[] = [];

  // Get revealed traits from player data
  for (const trait of player.hiddenTraits.revealedToUser) {
    revealed.push(trait as Trait);
  }

  // Get pending revelations from pattern data
  const patternData = getPlayerPatternData(player.id);
  const highConfidenceTraits = getHighConfidenceTraits(patternData);

  for (const evidence of highConfidenceTraits) {
    if (!isTraitRevealed(player.hiddenTraits, evidence.trait)) {
      pending.push({
        trait: evidence.trait,
        confidence: evidence.confidence,
      });
    }
  }

  return { revealed, pending };
}

/**
 * Simulates end-of-season trait revelation check
 * Call this at the end of each season to see if accumulated evidence reveals traits
 */
export function processEndOfSeasonRevelations(
  player: Player,
  teamName: string = 'the team',
  options: Partial<RevelationEngineOptions> = {}
): RevelationResult {
  const engineOptions = { ...DEFAULT_ENGINE_OPTIONS, ...options };
  const patternData = getPlayerPatternData(player.id);
  const playerName = getPlayerFullName(player);

  const result: RevelationResult = {
    playerId: player.id,
    events: [],
    revealedTraits: [],
    newsEvents: [],
    patternData,
  };

  // Check all high-confidence traits
  const highConfidenceTraits = getHighConfidenceTraits(patternData);

  for (const evidence of highConfidenceTraits) {
    // Skip already revealed traits
    if (isTraitRevealed(player.hiddenTraits, evidence.trait)) {
      continue;
    }

    // Only process if player actually has this trait
    if (!hasTrait(player.hiddenTraits, evidence.trait)) {
      continue;
    }

    // Check for confirmation
    if (evidence.confidence === 'confirmed' && engineOptions.autoRevealConfirmed) {
      revealTrait(player.hiddenTraits, evidence.trait);
      confirmTrait(patternData, evidence.trait);

      result.revealedTraits.push({
        trait: evidence.trait,
        confidence: evidence.confidence,
        isConfirmed: true,
        evidence,
      });

      // Generate confirmation news
      const dummyContext: GameEventContext = {
        eventType: 'bigGamePerformance',
        isPlayoff: false,
        season: patternData.seasonsTracked,
        week: 17,
      };

      const news = generateTraitNews(
        player.id,
        playerName,
        teamName,
        evidence,
        dummyContext
      );
      if (news) {
        result.newsEvents.push(news);
      }
    }
  }

  // Apply end-of-season decay
  applySeasonEndDecay(player.id);

  return result;
}

/**
 * Validates a revelation result
 */
export function validateRevelationResult(result: RevelationResult): boolean {
  if (!result.playerId || typeof result.playerId !== 'string') return false;
  if (!Array.isArray(result.events)) return false;
  if (!Array.isArray(result.revealedTraits)) return false;
  if (!Array.isArray(result.newsEvents)) return false;

  return true;
}
