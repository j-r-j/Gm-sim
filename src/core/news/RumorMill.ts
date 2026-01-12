/**
 * Rumor Mill - Generates realistic trade rumors and speculation.
 *
 * Key feature: Some rumors are true, some are false. This creates
 * realistic uncertainty for the player as a GM.
 */

import { randomElement, chance, generateUUID } from '../generators/utils/RandomUtils';
import { StoryPriority, StoryContext, replacePlaceholders } from './StoryTemplates';

/**
 * Types of rumors that can be generated
 */
export type RumorType =
  | 'trade_interest'
  | 'contract_demand'
  | 'locker_room'
  | 'coaching'
  | 'front_office'
  | 'performance_concern'
  | 'injury_recovery';

/**
 * How confident the rumor source is
 */
export type RumorSourceConfidence = 'confirmed' | 'strong' | 'moderate' | 'whisper';

/**
 * A generated rumor
 */
export interface Rumor {
  /** Unique identifier */
  id: string;
  /** Type of rumor */
  type: RumorType;
  /** Headline of the rumor */
  headline: string;
  /** Body text of the rumor */
  body: string;
  /** Whether this rumor is actually true */
  isTrue: boolean;
  /** How confident the source appears */
  sourceConfidence: RumorSourceConfidence;
  /** When the rumor was created */
  timestamp: number;
  /** Season this rumor is from */
  season: number;
  /** Week this rumor is from */
  week: number;
  /** Player ID if applicable */
  playerId?: string;
  /** Team ID if applicable */
  teamId?: string;
  /** Priority for display */
  priority: StoryPriority;
  /** Expiration time (rumors go stale) */
  expiresAt: number;
  /** Whether the rumor has been resolved (proven true/false) */
  isResolved: boolean;
  /** Resolution text if resolved */
  resolution?: string;
}

/**
 * Configuration for rumor generation
 */
export interface RumorConfig {
  /** Probability that a generated rumor is true (0-1) */
  truthProbability: number;
  /** How long rumors last before expiring (in milliseconds) */
  rumorLifespan: number;
  /** Minimum rumors to keep active */
  minActiveRumors: number;
  /** Maximum rumors to keep active */
  maxActiveRumors: number;
}

/**
 * Default rumor configuration
 */
export const DEFAULT_RUMOR_CONFIG: RumorConfig = {
  truthProbability: 0.4, // 40% of rumors are true
  rumorLifespan: 7 * 24 * 60 * 60 * 1000, // 7 days
  minActiveRumors: 3,
  maxActiveRumors: 15,
};

// ============================================================================
// RUMOR TEMPLATES BY TYPE
// ============================================================================

interface RumorTemplate {
  type: RumorType;
  headlines: string[];
  bodies: string[];
  sourceConfidences: RumorSourceConfidence[];
}

const TRADE_INTEREST_TEMPLATES: RumorTemplate = {
  type: 'trade_interest',
  headlines: [
    'Report: {teamName} Interested in {playerName}',
    'Trade Buzz: {playerName} Drawing Interest',
    'Sources: Multiple Teams Eyeing {playerName}',
    "{playerName} on {teamName}'s Radar",
    'Could {playerName} Be Traded?',
  ],
  bodies: [
    'According to league sources, {teamName} have expressed interest in acquiring {playerName}. No trade is imminent, but conversations have taken place.',
    'Multiple teams are believed to be interested in {playerName}. The {playerPosition} could be a trade candidate if the price is right.',
    'Sources close to the situation say {teamName} have made inquiries about {playerName}. Whether a deal materializes remains to be seen.',
    "Don't be surprised if {playerName} is moved before the deadline. Several teams, including {teamName}, have shown interest.",
    'Whispers around the league suggest {playerName} could be available. {teamName} are among the teams monitoring the situation.',
  ],
  sourceConfidences: ['moderate', 'whisper', 'strong'],
};

const CONTRACT_DEMAND_TEMPLATES: RumorTemplate = {
  type: 'contract_demand',
  headlines: [
    '{playerName} Seeking New Contract',
    'Contract Talks Stall for {playerName}',
    '{playerName} Wants Top Dollar',
    'Report: {playerName} Unhappy with Contract Situation',
  ],
  bodies: [
    "Sources indicate {playerName} is seeking a new contract from {teamName}. The {playerPosition} believes they've outperformed their current deal.",
    'Contract negotiations between {playerName} and {teamName} have reportedly stalled. The {playerPosition} is seeking a significant raise.',
    'According to sources, {playerName} has expressed frustration with the pace of contract talks. The veteran wants to be paid among the top {playerPosition}s.',
    '{playerName} is believed to be seeking a market-setting deal. {teamName} are weighing their options with the {playerPosition}.',
  ],
  sourceConfidences: ['moderate', 'strong', 'whisper'],
};

const LOCKER_ROOM_TEMPLATES: RumorTemplate = {
  type: 'locker_room',
  headlines: [
    'Sources: Tension in {teamName} Locker Room',
    'All Not Well in {teamName}?',
    'Report: {playerName} Clashing with Teammates',
    'Locker Room Issues Brewing for {teamName}',
  ],
  bodies: [
    'Multiple sources describe tension in the {teamName} locker room. The specifics are unclear, but chemistry may be an issue.',
    'All is not well in {teamName}, according to team insiders. There are whispers of friction between certain players.',
    'Sources close to the team say {playerName} has had disagreements with teammates. The situation is being monitored by coaching staff.',
    "The {teamName} locker room isn't as harmonious as it appears. Several sources have described internal issues that could affect the season.",
  ],
  sourceConfidences: ['whisper', 'moderate'],
};

const COACHING_RUMOR_TEMPLATES: RumorTemplate = {
  type: 'coaching',
  headlines: [
    "{coachName}'s Job in Jeopardy?",
    'Hot Seat: {teamName} Coach Under Pressure',
    'Report: {teamName} Evaluating Coaching Staff',
    'Could {teamName} Make a Coaching Change?',
  ],
  bodies: [
    "Sources say {coachName}'s position with {teamName} could be in jeopardy if results don't improve. The pressure is mounting.",
    '{teamName} brass are believed to be evaluating the coaching staff after recent struggles. Changes could be coming.',
    "According to league insiders, {coachName} is on thin ice with {teamName}. The team's performance has been disappointing.",
    "Don't be shocked if {teamName} make a coaching change. Sources indicate ownership is growing impatient with the current direction.",
  ],
  sourceConfidences: ['moderate', 'whisper', 'strong'],
};

const FRONT_OFFICE_TEMPLATES: RumorTemplate = {
  type: 'front_office',
  headlines: [
    '{teamName} Considering Roster Overhaul',
    'Report: {teamName} Planning Big Moves',
    '{teamName} in "Win Now" Mode?',
    'Sources: {teamName} Exploring All Options',
  ],
  bodies: [
    'Multiple sources indicate {teamName} are considering significant roster changes. Several players could be moved.',
    '{teamName} front office is believed to be in "win now" mode. Expect aggressive moves in the coming weeks.',
    'According to insiders, {teamName} are exploring all options to improve the roster. Big changes could be on the horizon.',
    "Sources say {teamName} brass is meeting to discuss the team's direction. Roster changes are expected.",
  ],
  sourceConfidences: ['moderate', 'whisper'],
};

const PERFORMANCE_CONCERN_TEMPLATES: RumorTemplate = {
  type: 'performance_concern',
  headlines: [
    "Questions Emerge About {playerName}'s Form",
    'Is {playerName} Declining?',
    'Report: {teamName} Concerned About {playerName}',
    "{playerName}'s Role Could Change",
  ],
  bodies: [
    "There are growing questions about {playerName}'s recent form. Some around the league believe the {playerPosition} may be declining.",
    "Sources close to {teamName} express concern about {playerName}'s performance. The coaching staff is evaluating options.",
    "{playerName}'s role with {teamName} could be changing, according to sources. The {playerPosition} hasn't performed at the expected level.",
    "League sources suggest {playerName} isn't the same player. Whether it's age or something else, concerns are mounting.",
  ],
  sourceConfidences: ['whisper', 'moderate'],
};

const INJURY_RECOVERY_TEMPLATES: RumorTemplate = {
  type: 'injury_recovery',
  headlines: [
    "{playerName}'s Recovery Ahead of Schedule?",
    'Report: {playerName} Could Return Early',
    "{playerName}'s Rehab Going Well",
    'Sources: {playerName} Making Progress',
  ],
  bodies: [
    "Good news on {playerName}: sources indicate the {playerPosition}'s recovery is ahead of schedule. An early return may be possible.",
    'According to team sources, {playerName} is making excellent progress in rehab. The {playerPosition} could return sooner than expected.',
    "{playerName}'s recovery from injury is reportedly going well. The {teamName} {playerPosition} is targeting an early return.",
    'Sources close to {playerName} say the {playerPosition} is pushing to return as quickly as possible. Progress has been encouraging.',
  ],
  sourceConfidences: ['moderate', 'strong'],
};

const ALL_RUMOR_TEMPLATES: RumorTemplate[] = [
  TRADE_INTEREST_TEMPLATES,
  CONTRACT_DEMAND_TEMPLATES,
  LOCKER_ROOM_TEMPLATES,
  COACHING_RUMOR_TEMPLATES,
  FRONT_OFFICE_TEMPLATES,
  PERFORMANCE_CONCERN_TEMPLATES,
  INJURY_RECOVERY_TEMPLATES,
];

// ============================================================================
// RUMOR GENERATION FUNCTIONS
// ============================================================================

/**
 * Generates a unique rumor ID
 */
function generateRumorId(): string {
  return `rumor_${generateUUID()}`;
}

/**
 * Gets priority based on source confidence
 */
function getPriorityFromConfidence(confidence: RumorSourceConfidence): StoryPriority {
  switch (confidence) {
    case 'confirmed':
      return 'breaking';
    case 'strong':
      return 'high';
    case 'moderate':
      return 'medium';
    case 'whisper':
      return 'low';
  }
}

/**
 * Generates a rumor of a specific type
 */
export function generateRumor(
  type: RumorType,
  context: StoryContext,
  season: number,
  week: number,
  config: RumorConfig = DEFAULT_RUMOR_CONFIG
): Rumor {
  const template = ALL_RUMOR_TEMPLATES.find((t) => t.type === type);
  if (!template) {
    throw new Error(`No template found for rumor type: ${type}`);
  }

  const headline = replacePlaceholders(randomElement(template.headlines), context);
  const body = replacePlaceholders(randomElement(template.bodies), context);
  const sourceConfidence = randomElement(template.sourceConfidences);
  const isTrue = chance(config.truthProbability);

  return {
    id: generateRumorId(),
    type,
    headline,
    body,
    isTrue,
    sourceConfidence,
    timestamp: Date.now(),
    season,
    week,
    playerId: context.playerName ? String(context.playerName) : undefined,
    teamId: context.teamName ? String(context.teamName) : undefined,
    priority: getPriorityFromConfidence(sourceConfidence),
    expiresAt: Date.now() + config.rumorLifespan,
    isResolved: false,
  };
}

/**
 * Generates a random rumor with random type
 */
export function generateRandomRumor(
  context: StoryContext,
  season: number,
  week: number,
  config: RumorConfig = DEFAULT_RUMOR_CONFIG
): Rumor {
  const template = randomElement(ALL_RUMOR_TEMPLATES);
  return generateRumor(template.type, context, season, week, config);
}

/**
 * Checks if a rumor has expired
 */
export function isRumorExpired(rumor: Rumor): boolean {
  return Date.now() > rumor.expiresAt;
}

/**
 * Resolves a rumor as true or false
 */
export function resolveRumor(rumor: Rumor, wasTrue: boolean, resolution: string): Rumor {
  return {
    ...rumor,
    isResolved: true,
    resolution,
    isTrue: wasTrue,
  };
}

/**
 * Filters out expired rumors
 */
export function filterExpiredRumors(rumors: Rumor[]): Rumor[] {
  return rumors.filter((r) => !isRumorExpired(r) || r.isResolved);
}

/**
 * Gets active (non-expired, non-resolved) rumors
 */
export function getActiveRumors(rumors: Rumor[]): Rumor[] {
  return rumors.filter((r) => !isRumorExpired(r) && !r.isResolved);
}

/**
 * Gets rumors by type
 */
export function getRumorsByType(rumors: Rumor[], type: RumorType): Rumor[] {
  return rumors.filter((r) => r.type === type);
}

/**
 * Gets rumors for a specific player
 */
export function getRumorsForPlayer(rumors: Rumor[], playerId: string): Rumor[] {
  return rumors.filter((r) => r.playerId === playerId);
}

/**
 * Gets rumors for a specific team
 */
export function getRumorsForTeam(rumors: Rumor[], teamId: string): Rumor[] {
  return rumors.filter((r) => r.teamId === teamId);
}

/**
 * Sorts rumors by priority and timestamp
 */
export function sortRumors(rumors: Rumor[]): Rumor[] {
  const priorityOrder: Record<StoryPriority, number> = {
    breaking: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return [...rumors].sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.timestamp - a.timestamp;
  });
}

/**
 * Validates a rumor object
 */
export function validateRumor(rumor: Rumor): boolean {
  if (!rumor.id || typeof rumor.id !== 'string') return false;
  if (!rumor.headline || typeof rumor.headline !== 'string') return false;
  if (!rumor.body || typeof rumor.body !== 'string') return false;
  if (typeof rumor.isTrue !== 'boolean') return false;
  if (typeof rumor.timestamp !== 'number') return false;
  if (typeof rumor.season !== 'number') return false;
  if (typeof rumor.week !== 'number') return false;
  if (typeof rumor.expiresAt !== 'number') return false;
  if (typeof rumor.isResolved !== 'boolean') return false;

  return true;
}

/**
 * Gets a resolution message for when a rumor is proven true
 */
export function getTrueResolutionMessage(type: RumorType, context: StoryContext): string {
  const messages: Record<RumorType, string[]> = {
    trade_interest: [
      'The rumors were true! {playerName} has been traded.',
      'As reported, {playerName} is on the move.',
    ],
    contract_demand: [
      '{playerName} has signed a new deal, confirming the contract talks.',
      'The contract situation is resolved: {playerName} got their deal.',
    ],
    locker_room: [
      'Sources were right about locker room issues. Changes have been made.',
      'The reported tension led to roster moves.',
    ],
    coaching: [
      'As rumored, coaching changes have been made.',
      'The coaching staff has been shuffled following the reports.',
    ],
    front_office: [
      'The front office made the moves as reported.',
      'Multiple roster changes confirm the rumors.',
    ],
    performance_concern: [
      'The concerns about {playerName} proved valid.',
      "{playerName}'s role has indeed changed.",
    ],
    injury_recovery: [
      '{playerName} returned early as rumored!',
      'The positive injury update proved accurate.',
    ],
  };

  return replacePlaceholders(randomElement(messages[type]), context);
}

/**
 * Gets a resolution message for when a rumor is proven false
 */
export function getFalseResolutionMessage(type: RumorType, context: StoryContext): string {
  const messages: Record<RumorType, string[]> = {
    trade_interest: [
      'Despite rumors, {playerName} remains with the team.',
      'The trade speculation amounted to nothing.',
    ],
    contract_demand: [
      '{playerName} is content with current contract, contrary to reports.',
      'The contract drama was overblown.',
    ],
    locker_room: [
      'Locker room rumors appear to have been exaggerated.',
      'The team chemistry is fine despite the reports.',
    ],
    coaching: [
      'The coaching staff remains intact despite the speculation.',
      'Reports of coaching changes were premature.',
    ],
    front_office: [
      'The rumored moves never materialized.',
      'Front office is standing pat despite the reports.',
    ],
    performance_concern: [
      '{playerName} has silenced the doubters with strong play.',
      'The concerns about {playerName} were unfounded.',
    ],
    injury_recovery: [
      "{playerName}'s return is proceeding as originally scheduled.",
      "The early return didn't happen as rumored.",
    ],
  };

  return replacePlaceholders(randomElement(messages[type]), context);
}
