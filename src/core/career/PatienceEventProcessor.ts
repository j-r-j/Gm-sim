/**
 * Patience Event Processor
 * Processes game events and updates patience accordingly
 * Handles season results, playoff outcomes, PR events, and demand compliance
 */

import { Owner } from '../models/owner';
import {
  calculatePatienceImpact,
  PATIENCE_POSITIVE,
  PATIENCE_NEGATIVE,
} from '../models/owner/PatienceMeter';
import {
  PatienceMeterState,
  updatePatienceValue,
  applyPersonalityModifiers,
  getImpactDescription,
  ImpactDescription,
} from './PatienceMeterManager';

/**
 * Types of patience events that can occur
 */
export type PatienceEventType =
  // Season results
  | 'superBowlWin'
  | 'superBowlLoss'
  | 'conferenceChampionshipWin'
  | 'conferenceChampionshipLoss'
  | 'divisionalWin'
  | 'divisionalLoss'
  | 'wildCardWin'
  | 'wildCardLoss'
  | 'playoffAppearance'
  | 'missedPlayoffs'
  | 'winningSeason'
  | 'losingSeason'
  | 'winlessStreak'
  // Game results
  | 'blowoutWin'
  | 'blowoutLoss'
  | 'rivalryWin'
  | 'rivalryLoss'
  | 'losingStreak5Plus'
  | 'winningStreak5Plus'
  // Personnel decisions
  | 'majorFASigningWorks'
  | 'majorFASigningBusts'
  | 'draftPickBecomesStar'
  | 'topDraftPickBusts'
  | 'tradedForStar'
  | 'tradedAwayStar'
  // Expectations
  | 'exceededExpectations'
  | 'metExpectations'
  | 'missedExpectedPlayoffs'
  | 'missedExpectations'
  // PR events
  | 'positiveMediaCoverage'
  | 'negativeMediaCoverage'
  | 'playerScandal'
  | 'communityInvolvement'
  | 'badPR'
  // Demand compliance
  | 'demandComplied'
  | 'defiedOwner'
  | 'demandPartiallyMet';

/**
 * Patience event with metadata
 */
export interface PatienceEvent {
  type: PatienceEventType;
  week: number;
  season: number;
  description: string;
  context?: Record<string, unknown>;
}

/**
 * Result of processing a patience event
 */
export interface PatienceEventResult {
  event: PatienceEvent;
  impactValue: number;
  impactDescription: ImpactDescription;
  newState: PatienceMeterState;
  previousLevel: string;
  newLevel: string;
  levelChanged: boolean;
  wouldBeFired: boolean;
}

/**
 * Base impact values for events not in PATIENCE_POSITIVE/NEGATIVE
 */
const ADDITIONAL_EVENT_IMPACTS: Record<string, { minImpact: number; maxImpact: number }> = {
  superBowlLoss: { minImpact: 5, maxImpact: 15 }, // Still made it to the Super Bowl
  conferenceChampionshipWin: { minImpact: 15, maxImpact: 25 },
  conferenceChampionshipLoss: { minImpact: 3, maxImpact: 10 },
  divisionalWin: { minImpact: 10, maxImpact: 18 },
  divisionalLoss: { minImpact: 0, maxImpact: 5 },
  wildCardWin: { minImpact: 8, maxImpact: 15 },
  wildCardLoss: { minImpact: -5, maxImpact: 2 },
  missedPlayoffs: { minImpact: -15, maxImpact: -5 },
  blowoutWin: { minImpact: 2, maxImpact: 5 },
  rivalryWin: { minImpact: 3, maxImpact: 8 },
  rivalryLoss: { minImpact: -8, maxImpact: -3 },
  winningStreak5Plus: { minImpact: 5, maxImpact: 12 },
  tradedForStar: { minImpact: 3, maxImpact: 10 },
  tradedAwayStar: { minImpact: -15, maxImpact: -5 },
  metExpectations: { minImpact: 2, maxImpact: 8 },
  missedExpectations: { minImpact: -18, maxImpact: -8 },
  positiveMediaCoverage: { minImpact: 2, maxImpact: 6 },
  negativeMediaCoverage: { minImpact: -8, maxImpact: -2 },
  playerScandal: { minImpact: -12, maxImpact: -4 },
  communityInvolvement: { minImpact: 1, maxImpact: 5 },
  demandComplied: { minImpact: 5, maxImpact: 12 },
  demandPartiallyMet: { minImpact: 0, maxImpact: 5 },
  winlessStreak: { minImpact: -20, maxImpact: -10 },
};

/**
 * Gets the base impact range for an event type
 */
export function getEventImpactRange(
  eventType: PatienceEventType
): { minImpact: number; maxImpact: number } | null {
  // First check the standard patience modifiers
  const positiveModifier = PATIENCE_POSITIVE.find((m) => m.event === eventType);
  if (positiveModifier) {
    return { minImpact: positiveModifier.minImpact, maxImpact: positiveModifier.maxImpact };
  }

  const negativeModifier = PATIENCE_NEGATIVE.find((m) => m.event === eventType);
  if (negativeModifier) {
    return { minImpact: negativeModifier.minImpact, maxImpact: negativeModifier.maxImpact };
  }

  // Check additional events
  const additional = ADDITIONAL_EVENT_IMPACTS[eventType];
  if (additional) {
    return additional;
  }

  return null;
}

/**
 * Calculates the raw impact for an event
 */
export function calculateEventImpact(
  eventType: PatienceEventType,
  owner: Owner,
  randomFactor: number = Math.random()
): number {
  // Try the standard calculatePatienceImpact first
  const standardImpact = calculatePatienceImpact(
    eventType,
    owner.personality.traits.patience,
    randomFactor
  );

  if (standardImpact !== 0) {
    return standardImpact;
  }

  // Fall back to additional events
  const range = ADDITIONAL_EVENT_IMPACTS[eventType];
  if (!range) {
    return 0;
  }

  const baseImpact = range.minImpact + (range.maxImpact - range.minImpact) * randomFactor;

  // Apply owner personality modifiers
  return applyPersonalityModifiers(Math.round(baseImpact), owner.personality.traits.patience);
}

/**
 * Processes a single patience event
 */
export function processPatienceEvent(
  event: PatienceEvent,
  state: PatienceMeterState,
  owner: Owner,
  randomFactor: number = Math.random()
): PatienceEventResult {
  const previousLevel =
    state.currentValue >= 70
      ? 'secure'
      : state.currentValue >= 50
        ? 'stable'
        : state.currentValue >= 35
          ? 'warmSeat'
          : state.currentValue >= 20
            ? 'hotSeat'
            : 'fired';

  const impactValue = calculateEventImpact(event.type, owner, randomFactor);
  const impactDescription = getImpactDescription(impactValue);

  const newState = updatePatienceValue(
    state,
    impactValue,
    event.week,
    event.season,
    event.description
  );

  const newLevel =
    newState.currentValue >= 70
      ? 'secure'
      : newState.currentValue >= 50
        ? 'stable'
        : newState.currentValue >= 35
          ? 'warmSeat'
          : newState.currentValue >= 20
            ? 'hotSeat'
            : 'fired';

  return {
    event,
    impactValue,
    impactDescription,
    newState,
    previousLevel,
    newLevel,
    levelChanged: previousLevel !== newLevel,
    wouldBeFired: newLevel === 'fired',
  };
}

/**
 * Processes multiple patience events in sequence
 */
export function processMultipleEvents(
  events: PatienceEvent[],
  state: PatienceMeterState,
  owner: Owner,
  randomFactors?: number[]
): PatienceEventResult[] {
  const results: PatienceEventResult[] = [];
  let currentState = state;

  for (let i = 0; i < events.length; i++) {
    const randomFactor = randomFactors?.[i] ?? Math.random();
    const result = processPatienceEvent(events[i], currentState, owner, randomFactor);
    results.push(result);
    currentState = result.newState;
  }

  return results;
}

/**
 * Season result context for processing end-of-season
 */
export interface SeasonResultContext {
  wins: number;
  losses: number;
  playoffResult:
    | 'superBowlWin'
    | 'superBowlLoss'
    | 'conferenceChampionshipWin'
    | 'conferenceChampionshipLoss'
    | 'divisionalWin'
    | 'divisionalLoss'
    | 'wildCardWin'
    | 'wildCardLoss'
    | 'missedPlayoffs'
    | null;
  expectedWins: number;
  season: number;
}

/**
 * Generates patience events from a season result
 */
export function generateSeasonEvents(context: SeasonResultContext): PatienceEvent[] {
  const events: PatienceEvent[] = [];
  const endOfSeasonWeek = 18; // NFL regular season ends week 18

  // Win/loss record events
  if (context.wins > context.losses) {
    events.push({
      type: 'winningSeason',
      week: endOfSeasonWeek,
      season: context.season,
      description: `Finished season with ${context.wins}-${context.losses} record`,
      context: { wins: context.wins, losses: context.losses },
    });
  } else if (context.losses > context.wins) {
    events.push({
      type: 'losingSeason',
      week: endOfSeasonWeek,
      season: context.season,
      description: `Finished season with ${context.wins}-${context.losses} record`,
      context: { wins: context.wins, losses: context.losses },
    });
  }

  // Expectations events
  const winDifference = context.wins - context.expectedWins;
  if (winDifference >= 4) {
    events.push({
      type: 'exceededExpectations',
      week: endOfSeasonWeek,
      season: context.season,
      description: `Exceeded expectations with ${winDifference} more wins than projected`,
      context: { winDifference },
    });
  } else if (winDifference >= 0) {
    events.push({
      type: 'metExpectations',
      week: endOfSeasonWeek,
      season: context.season,
      description: 'Met preseason expectations',
      context: { winDifference },
    });
  } else if (winDifference <= -4) {
    events.push({
      type: 'missedExpectations',
      week: endOfSeasonWeek,
      season: context.season,
      description: `Fell ${Math.abs(winDifference)} wins short of expectations`,
      context: { winDifference },
    });
  }

  // Playoff events
  if (context.playoffResult) {
    const playoffWeek = endOfSeasonWeek + 4; // Approximate playoff timing

    if (context.playoffResult === 'missedPlayoffs') {
      // Check if playoffs were expected
      if (context.expectedWins >= 9) {
        events.push({
          type: 'missedExpectedPlayoffs',
          week: playoffWeek,
          season: context.season,
          description: 'Failed to make playoffs despite expectations',
        });
      } else {
        events.push({
          type: 'missedPlayoffs',
          week: playoffWeek,
          season: context.season,
          description: 'Did not qualify for playoffs',
        });
      }
    } else {
      // Add playoff appearance first
      events.push({
        type: 'playoffAppearance',
        week: playoffWeek,
        season: context.season,
        description: 'Qualified for playoffs',
      });

      // Add specific playoff result
      const playoffDescriptions: Record<string, string> = {
        superBowlWin: 'Won the Super Bowl!',
        superBowlLoss: 'Lost in the Super Bowl',
        conferenceChampionshipWin: 'Won the conference championship',
        conferenceChampionshipLoss: 'Lost in the conference championship',
        divisionalWin: 'Won divisional playoff game',
        divisionalLoss: 'Lost in divisional round',
        wildCardWin: 'Won wild card game',
        wildCardLoss: 'Lost in wild card round',
      };

      events.push({
        type: context.playoffResult as PatienceEventType,
        week: playoffWeek + 1,
        season: context.season,
        description: playoffDescriptions[context.playoffResult] || 'Playoff result',
      });
    }
  }

  return events;
}

/**
 * Processes end-of-season patience changes
 */
export function processSeasonEnd(
  context: SeasonResultContext,
  state: PatienceMeterState,
  owner: Owner,
  randomFactors?: number[]
): PatienceEventResult[] {
  const events = generateSeasonEvents(context);
  return processMultipleEvents(events, state, owner, randomFactors);
}

/**
 * Creates a demand compliance event
 */
export function createDemandComplianceEvent(
  demandId: string,
  demandDescription: string,
  complied: boolean,
  week: number,
  season: number
): PatienceEvent {
  return {
    type: complied ? 'demandComplied' : 'defiedOwner',
    week,
    season,
    description: complied
      ? `Complied with owner demand: ${demandDescription}`
      : `Defied owner demand: ${demandDescription}`,
    context: { demandId, complied },
  };
}

/**
 * Creates a PR event
 */
export function createPREvent(
  positive: boolean,
  description: string,
  week: number,
  season: number,
  severity: 'minor' | 'moderate' | 'major' = 'moderate'
): PatienceEvent {
  let eventType: PatienceEventType;

  if (positive) {
    eventType = severity === 'major' ? 'positiveMediaCoverage' : 'communityInvolvement';
  } else {
    eventType =
      severity === 'major'
        ? 'badPR'
        : severity === 'moderate'
          ? 'negativeMediaCoverage'
          : 'playerScandal';
  }

  return {
    type: eventType,
    week,
    season,
    description,
    context: { positive, severity },
  };
}

/**
 * Creates a personnel decision event
 */
export function createPersonnelEvent(
  eventType:
    | 'majorFASigningWorks'
    | 'majorFASigningBusts'
    | 'draftPickBecomesStar'
    | 'topDraftPickBusts'
    | 'tradedForStar'
    | 'tradedAwayStar',
  playerName: string,
  week: number,
  season: number
): PatienceEvent {
  const descriptions: Record<string, string> = {
    majorFASigningWorks: `Free agent signing ${playerName} is performing well`,
    majorFASigningBusts: `Free agent signing ${playerName} has been a disappointment`,
    draftPickBecomesStar: `Draft pick ${playerName} has become a star`,
    topDraftPickBusts: `Top draft pick ${playerName} has failed to develop`,
    tradedForStar: `Trade acquisition ${playerName} has been a success`,
    tradedAwayStar: `Trading away ${playerName} is being questioned`,
  };

  return {
    type: eventType,
    week,
    season,
    description: descriptions[eventType] || `Personnel event: ${playerName}`,
    context: { playerName },
  };
}

/**
 * Creates a game result event
 */
export function createGameResultEvent(
  result:
    | 'blowoutWin'
    | 'blowoutLoss'
    | 'rivalryWin'
    | 'rivalryLoss'
    | 'losingStreak5Plus'
    | 'winningStreak5Plus',
  week: number,
  season: number,
  opponent?: string
): PatienceEvent {
  const descriptions: Record<string, string> = {
    blowoutWin: opponent ? `Dominated ${opponent}` : 'Blowout victory',
    blowoutLoss: opponent ? `Embarrassing loss to ${opponent}` : 'Blowout loss',
    rivalryWin: opponent ? `Beat rival ${opponent}` : 'Rivalry game victory',
    rivalryLoss: opponent ? `Lost to rival ${opponent}` : 'Rivalry game loss',
    losingStreak5Plus: 'Extended losing streak continues',
    winningStreak5Plus: 'Extended winning streak continues',
  };

  return {
    type: result,
    week,
    season,
    description: descriptions[result] || 'Game result',
    context: { opponent },
  };
}

/**
 * Calculates the cumulative impact of multiple events
 */
export function calculateCumulativeImpact(results: PatienceEventResult[]): {
  totalImpact: number;
  netDescription: ImpactDescription;
  positiveEvents: number;
  negativeEvents: number;
} {
  const totalImpact = results.reduce((sum, r) => sum + r.impactValue, 0);
  const positiveEvents = results.filter((r) => r.impactValue > 0).length;
  const negativeEvents = results.filter((r) => r.impactValue < 0).length;

  return {
    totalImpact,
    netDescription: getImpactDescription(totalImpact),
    positiveEvents,
    negativeEvents,
  };
}

/**
 * Gets all event types that are currently active/supported
 */
export function getSupportedEventTypes(): PatienceEventType[] {
  return [
    'superBowlWin',
    'superBowlLoss',
    'conferenceChampionshipWin',
    'conferenceChampionshipLoss',
    'divisionalWin',
    'divisionalLoss',
    'wildCardWin',
    'wildCardLoss',
    'playoffAppearance',
    'missedPlayoffs',
    'winningSeason',
    'losingSeason',
    'winlessStreak',
    'blowoutWin',
    'blowoutLoss',
    'rivalryWin',
    'rivalryLoss',
    'losingStreak5Plus',
    'winningStreak5Plus',
    'majorFASigningWorks',
    'majorFASigningBusts',
    'draftPickBecomesStar',
    'topDraftPickBusts',
    'tradedForStar',
    'tradedAwayStar',
    'exceededExpectations',
    'metExpectations',
    'missedExpectedPlayoffs',
    'missedExpectations',
    'positiveMediaCoverage',
    'negativeMediaCoverage',
    'playerScandal',
    'communityInvolvement',
    'badPR',
    'demandComplied',
    'defiedOwner',
    'demandPartiallyMet',
  ];
}

/**
 * Validates a patience event
 */
export function validatePatienceEvent(event: PatienceEvent): boolean {
  if (!getSupportedEventTypes().includes(event.type)) return false;
  if (typeof event.week !== 'number' || event.week < 0) return false;
  if (typeof event.season !== 'number' || event.season < 0) return false;
  if (typeof event.description !== 'string' || event.description.length === 0) return false;

  return true;
}
