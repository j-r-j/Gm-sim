/**
 * Chemistry Calculator
 * Calculates and tracks coach-player chemistry over time.
 * Chemistry values are HIDDEN from UI (-10 to +10 scale).
 */

import { Coach } from '../models/staff/Coach';
import { Player } from '../models/player/Player';
import { PersonalityType } from './PersonalityEffects';
import { OffensiveScheme, DefensiveScheme, FitLevel } from '../models/player/SchemeFit';

/**
 * Chemistry calculation factors (hidden from UI)
 */
export interface ChemistryFactors {
  personalityMatch: number; // -5 to +5
  schemeFit: number; // -3 to +3
  performanceHistory: number; // -3 to +3
  timeTogether: number; // 0 to +3
  coachStyle: number; // -2 to +2
}

/**
 * Chemistry change event
 */
export interface ChemistryChangeEvent {
  type:
    | 'performance_excellent'
    | 'performance_poor'
    | 'contract_dispute'
    | 'game_winning_play'
    | 'costly_mistake'
    | 'season_together'
    | 'scheme_change'
    | 'initial_meeting'
    | 'practice_incident'
    | 'mentorship_moment';
  change: number;
  description: string;
  timestamp: number;
}

/**
 * Chemistry history record
 */
export interface ChemistryHistory {
  playerId: string;
  coachId: string;
  initialChemistry: number;
  currentChemistry: number;
  events: ChemistryChangeEvent[];
  seasonsTogether: number;
}

/**
 * Qualitative chemistry description for UI (no numbers)
 */
export interface ChemistryDescription {
  level: 'excellent' | 'good' | 'neutral' | 'strained' | 'toxic';
  description: string;
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * Chemistry modifier result for effective rating
 */
export interface ChemistryModifier {
  value: number; // -10 to +10, for engine use only
  description: ChemistryDescription; // For UI
}

/**
 * Player personality type for chemistry calculations
 * Using string for flexibility since player model may use different types
 */
export type PlayerPersonality =
  | 'team_first'
  | 'me_first'
  | 'quiet_leader'
  | 'vocal_leader'
  | 'coachable'
  | 'stubborn'
  | 'hard_worker'
  | 'natural_talent';

/**
 * Map player personality to chemistry tendencies with coaches
 */
const PLAYER_COACH_AFFINITIES: Record<PlayerPersonality, PersonalityType[]> = {
  team_first: ['playersCoach', 'analytical', 'conservative'],
  me_first: ['aggressive', 'innovative'],
  quiet_leader: ['analytical', 'oldSchool', 'conservative'],
  vocal_leader: ['aggressive', 'playersCoach'],
  coachable: ['oldSchool', 'analytical', 'playersCoach'],
  stubborn: ['innovative', 'aggressive'],
  hard_worker: ['oldSchool', 'conservative', 'analytical'],
  natural_talent: ['innovative', 'playersCoach', 'aggressive'],
};

/**
 * Map player personality to chemistry conflicts with coaches
 */
const PLAYER_COACH_CONFLICTS: Record<PlayerPersonality, PersonalityType[]> = {
  team_first: ['aggressive'],
  me_first: ['conservative', 'oldSchool', 'analytical'],
  quiet_leader: ['aggressive'],
  vocal_leader: ['conservative'],
  coachable: ['aggressive'],
  stubborn: ['oldSchool', 'conservative'],
  hard_worker: ['innovative'],
  natural_talent: ['oldSchool'],
};

/**
 * Calculates initial chemistry between a coach and player
 */
export function calculateInitialChemistry(
  coach: Coach,
  player: Player,
  playerPersonality: PlayerPersonality
): number {
  const factors = calculateChemistryFactors(coach, player, playerPersonality, 0);

  const chemistry =
    factors.personalityMatch + factors.schemeFit + factors.coachStyle + factors.timeTogether;

  // Clamp to valid range
  return Math.max(-10, Math.min(10, Math.round(chemistry)));
}

/**
 * Calculates chemistry factors between coach and player
 */
export function calculateChemistryFactors(
  coach: Coach,
  player: Player,
  playerPersonality: PlayerPersonality,
  seasonsTogether: number,
  performanceRating?: number
): ChemistryFactors {
  // Personality match (-5 to +5)
  let personalityMatch = 0;
  const affinities = PLAYER_COACH_AFFINITIES[playerPersonality] || [];
  const conflicts = PLAYER_COACH_CONFLICTS[playerPersonality] || [];

  if (affinities.includes(coach.personality.primary)) {
    personalityMatch += 3;
  }
  if (coach.personality.secondary && affinities.includes(coach.personality.secondary)) {
    personalityMatch += 2;
  }
  if (conflicts.includes(coach.personality.primary)) {
    personalityMatch -= 3;
  }
  if (coach.personality.secondary && conflicts.includes(coach.personality.secondary)) {
    personalityMatch -= 2;
  }

  personalityMatch = Math.max(-5, Math.min(5, personalityMatch));

  // Scheme fit (-3 to +3)
  let schemeFit = 0;
  if (coach.scheme) {
    const fit = getPlayerSchemeFit(player, coach.scheme);
    schemeFit = fitLevelToChemistry(fit);
  }

  // Performance history (-3 to +3)
  let performanceHistory = 0;
  if (performanceRating !== undefined) {
    if (performanceRating >= 85) {
      performanceHistory = 3;
    } else if (performanceRating >= 75) {
      performanceHistory = 1;
    } else if (performanceRating <= 50) {
      performanceHistory = -2;
    } else if (performanceRating <= 60) {
      performanceHistory = -1;
    }
  }

  // Time together bonus (0 to +3)
  const timeTogether = Math.min(3, seasonsTogether * 0.5);

  // Coach style match (-2 to +2)
  let coachStyle = 0;
  if (coach.personality.primary === 'playersCoach') {
    coachStyle += 1;
  }
  if (coach.personality.ego > 80 && playerPersonality === 'me_first') {
    coachStyle -= 2; // Two big egos clash
  }
  if (coach.personality.adaptability > 70) {
    coachStyle += 1; // Adaptable coaches work better with everyone
  }

  return {
    personalityMatch,
    schemeFit,
    performanceHistory,
    timeTogether,
    coachStyle,
  };
}

/**
 * Gets player's scheme fit for a given scheme
 */
function getPlayerSchemeFit(player: Player, scheme: OffensiveScheme | DefensiveScheme): FitLevel {
  // Check offensive schemes
  const offensiveSchemes: OffensiveScheme[] = [
    'westCoast',
    'airRaid',
    'spreadOption',
    'powerRun',
    'zoneRun',
    'playAction',
  ];

  if (offensiveSchemes.includes(scheme as OffensiveScheme)) {
    return player.schemeFits.offensive[scheme as OffensiveScheme] || 'neutral';
  }

  // Check defensive schemes
  return player.schemeFits.defensive[scheme as DefensiveScheme] || 'neutral';
}

/**
 * Converts fit level to chemistry modifier
 */
function fitLevelToChemistry(fit: FitLevel): number {
  switch (fit) {
    case 'perfect':
      return 3;
    case 'good':
      return 1;
    case 'neutral':
      return 0;
    case 'poor':
      return -1;
    case 'terrible':
      return -3;
    default:
      return 0;
  }
}

/**
 * Updates chemistry based on an event
 */
export function updateChemistryFromEvent(
  currentChemistry: number,
  event: ChemistryChangeEvent
): number {
  const newChemistry = currentChemistry + event.change;
  return Math.max(-10, Math.min(10, Math.round(newChemistry)));
}

/**
 * Creates a chemistry change event
 */
export function createChemistryEvent(
  type: ChemistryChangeEvent['type'],
  playerName: string,
  coachName: string
): ChemistryChangeEvent {
  let change: number;
  let description: string;

  switch (type) {
    case 'performance_excellent':
      change = 1;
      description = `${playerName}'s excellent performance impressed ${coachName}`;
      break;
    case 'performance_poor':
      change = -1;
      description = `${coachName} was frustrated with ${playerName}'s performance`;
      break;
    case 'contract_dispute':
      change = -2;
      description = `Contract negotiations created tension between ${playerName} and the coaching staff`;
      break;
    case 'game_winning_play':
      change = 2;
      description = `${playerName}'s clutch play strengthened trust with ${coachName}`;
      break;
    case 'costly_mistake':
      change = -2;
      description = `${playerName}'s mistake led to tension with ${coachName}`;
      break;
    case 'season_together':
      change = 1;
      description = `Another season together has built trust between ${playerName} and ${coachName}`;
      break;
    case 'scheme_change':
      change = -1;
      description = `The new scheme has created an adjustment period for ${playerName}`;
      break;
    case 'initial_meeting':
      change = 0;
      description = `${playerName} and ${coachName} are getting to know each other`;
      break;
    case 'practice_incident':
      change = -1;
      description = `A practice disagreement affected the relationship`;
      break;
    case 'mentorship_moment':
      change = 2;
      description = `${coachName}'s mentorship has helped ${playerName} develop`;
      break;
    default:
      change = 0;
      description = 'Chemistry unchanged';
  }

  return {
    type,
    change,
    description,
    timestamp: Date.now(),
  };
}

/**
 * Advances chemistry history by one season
 */
export function advanceChemistryHistory(
  history: ChemistryHistory,
  performanceRating: number
): ChemistryHistory {
  const newHistory = { ...history };
  newHistory.seasonsTogether += 1;

  // Add tenure bonus event
  const tenureEvent = createChemistryEvent('season_together', 'Player', 'Coach');
  newHistory.events = [...newHistory.events, tenureEvent];
  newHistory.currentChemistry = updateChemistryFromEvent(newHistory.currentChemistry, tenureEvent);

  // Performance-based event
  if (performanceRating >= 85) {
    const perfEvent = createChemistryEvent('performance_excellent', 'Player', 'Coach');
    newHistory.events = [...newHistory.events, perfEvent];
    newHistory.currentChemistry = updateChemistryFromEvent(newHistory.currentChemistry, perfEvent);
  } else if (performanceRating <= 55) {
    const perfEvent = createChemistryEvent('performance_poor', 'Player', 'Coach');
    newHistory.events = [...newHistory.events, perfEvent];
    newHistory.currentChemistry = updateChemistryFromEvent(newHistory.currentChemistry, perfEvent);
  }

  return newHistory;
}

/**
 * Gets chemistry modifier for effective rating calculation
 * Returns value for engine (-10 to +10) and description for UI
 */
export function getChemistryModifier(
  coach: Coach,
  player: Player,
  history?: ChemistryHistory
): ChemistryModifier {
  // If history exists, use current chemistry
  if (history) {
    const value = history.currentChemistry;
    const description = getChemistryDescription(value, history);
    return { value, description };
  }

  // If no history, check coach's playerChemistry record
  const existingChemistry = coach.playerChemistry[player.id];
  if (existingChemistry !== undefined) {
    const description = getChemistryDescription(existingChemistry, undefined);
    return { value: existingChemistry, description };
  }

  // No established chemistry - return neutral
  return {
    value: 0,
    description: {
      level: 'neutral',
      description: 'Relationship still developing',
      trend: 'stable',
    },
  };
}

/**
 * Converts chemistry value to qualitative description (for UI)
 */
export function getChemistryDescription(
  chemistry: number,
  history?: ChemistryHistory
): ChemistryDescription {
  // Determine level
  let level: ChemistryDescription['level'];
  if (chemistry >= 7) {
    level = 'excellent';
  } else if (chemistry >= 3) {
    level = 'good';
  } else if (chemistry >= -2) {
    level = 'neutral';
  } else if (chemistry >= -6) {
    level = 'strained';
  } else {
    level = 'toxic';
  }

  // Determine trend
  let trend: ChemistryDescription['trend'] = 'stable';
  if (history && history.events.length >= 2) {
    const recentEvents = history.events.slice(-3);
    const recentChange = recentEvents.reduce((sum, e) => sum + e.change, 0);
    if (recentChange >= 2) {
      trend = 'improving';
    } else if (recentChange <= -2) {
      trend = 'declining';
    }
  }

  // Generate description
  let description: string;
  switch (level) {
    case 'excellent':
      description = 'Outstanding chemistry - they work very well together';
      break;
    case 'good':
      description = 'Positive relationship with good communication';
      break;
    case 'neutral':
      description = 'Professional relationship';
      break;
    case 'strained':
      description = 'Some tension in the relationship';
      break;
    case 'toxic':
      description = 'Serious relationship issues affecting performance';
      break;
  }

  return { level, description, trend };
}

/**
 * Calculates chemistry impact on development rate
 * Higher chemistry = faster development
 */
export function calculateDevelopmentModifier(chemistry: number): number {
  // Chemistry of 10 gives +20% development, -10 gives -20%
  return chemistry * 0.02;
}

/**
 * Calculates chemistry impact on morale
 */
export function calculateMoraleModifier(chemistry: number): number {
  // Chemistry of 10 gives +10 morale, -10 gives -10
  return chemistry;
}

/**
 * Initializes chemistry history for a new player-coach relationship
 */
export function initializeChemistryHistory(
  coach: Coach,
  player: Player,
  playerPersonality: PlayerPersonality
): ChemistryHistory {
  const initialChemistry = calculateInitialChemistry(coach, player, playerPersonality);

  const initialEvent = createChemistryEvent(
    'initial_meeting',
    `${player.firstName} ${player.lastName}`,
    `${coach.firstName} ${coach.lastName}`
  );
  initialEvent.change = initialChemistry; // First event sets the baseline

  return {
    playerId: player.id,
    coachId: coach.id,
    initialChemistry,
    currentChemistry: initialChemistry,
    events: [initialEvent],
    seasonsTogether: 0,
  };
}

/**
 * Batch updates chemistry for all players with a coach
 */
export function updateTeamChemistry(
  coach: Coach,
  players: Player[],
  playerPersonalities: Map<string, PlayerPersonality>,
  histories: Map<string, ChemistryHistory>
): Map<string, ChemistryHistory> {
  const updatedHistories = new Map<string, ChemistryHistory>();

  for (const player of players) {
    const key = `${coach.id}-${player.id}`;
    let history = histories.get(key);

    if (!history) {
      // Initialize new chemistry
      const personality = playerPersonalities.get(player.id) || 'coachable';
      history = initializeChemistryHistory(coach, player, personality);
    }

    updatedHistories.set(key, history);
  }

  return updatedHistories;
}

/**
 * Gets the average chemistry between a coach and all their players
 * Returns qualitative description only
 */
export function getAverageTeamChemistry(coach: Coach, playerIds: string[]): ChemistryDescription {
  if (playerIds.length === 0) {
    return {
      level: 'neutral',
      description: 'No players to evaluate',
      trend: 'stable',
    };
  }

  let totalChemistry = 0;
  let count = 0;

  for (const playerId of playerIds) {
    const chemistry = coach.playerChemistry[playerId];
    if (chemistry !== undefined) {
      totalChemistry += chemistry;
      count++;
    }
  }

  const avgChemistry = count > 0 ? totalChemistry / count : 0;
  return getChemistryDescription(avgChemistry, undefined);
}

/**
 * Validates chemistry value is in valid range
 */
export function validateChemistry(value: number): boolean {
  return value >= -10 && value <= 10;
}
