/**
 * News Event Generator - generates trait-revealing news stories.
 *
 * News stories provide hints about hidden traits without directly labeling them.
 * Stories range from subtle hints to clear confirmations based on confidence level.
 * The "It" factor is NEVER directly revealed through news - only implied through performance.
 */

import { Trait } from '../models/player/HiddenTraits';
import { ConfidenceLevel, GameEventContext, GameEventType } from './RevelationTriggers';
import { TraitEvidence } from './PatternRecognitionSystem';
import { randomElement } from '../generators/utils/RandomUtils';

/**
 * A generated news event/story
 */
export interface NewsEvent {
  /** Unique identifier for the news event */
  id: string;

  /** Headline of the news story */
  headline: string;

  /** Full body text of the news story */
  body: string;

  /** Category of news (team, player, league, rumor) */
  category: NewsCategory;

  /** Priority/importance of the news (higher = more prominent) */
  priority: NewsPriority;

  /** The trait this news hints at (if any) */
  relatedTrait?: Trait;

  /** How strongly this news suggests the trait */
  traitHintStrength: ConfidenceLevel;

  /** Player ID this news is about */
  playerId: string;

  /** Player name for display */
  playerName: string;

  /** Team name for display */
  teamName?: string;

  /** Timestamp when the news was generated */
  timestamp: number;

  /** Season this news is from */
  season: number;

  /** Week this news is from */
  week: number;

  /** Whether this news confirms a trait */
  confirmsTraitRevelation: boolean;
}

/**
 * Categories of news events
 */
export type NewsCategory =
  | 'breaking' // Major breaking news
  | 'game_recap' // Post-game analysis
  | 'practice_report' // Practice/training news
  | 'insider_scoop' // Insider information
  | 'player_profile' // Feature story on player
  | 'rumor_mill' // Unconfirmed rumors
  | 'injury_report' // Injury-related news
  | 'transaction'; // Roster moves

/**
 * Priority levels for news display
 */
export type NewsPriority = 'urgent' | 'high' | 'medium' | 'low';

/**
 * Template for generating news headlines and bodies
 */
interface NewsTemplate {
  trait: Trait;
  confidenceLevel: ConfidenceLevel;
  headlines: string[];
  bodies: string[];
  category: NewsCategory;
  priority: NewsPriority;
}

// ============================================================================
// NEWS TEMPLATES FOR POSITIVE TRAITS
// ============================================================================

const CLUTCH_TEMPLATES: NewsTemplate[] = [
  {
    trait: 'clutch',
    confidenceLevel: 'hint',
    headlines: [
      '{playerName} Comes Through Late',
      'Fourth Quarter Surge Led by {playerName}',
    ],
    bodies: [
      '{playerName} made several key plays in the fourth quarter, helping {teamName} secure the win.',
      'When the game was on the line, {playerName} stepped up with clutch plays down the stretch.',
    ],
    category: 'game_recap',
    priority: 'medium',
  },
  {
    trait: 'clutch',
    confidenceLevel: 'moderate',
    headlines: [
      '{playerName} Developing Reputation for Big Moments',
      'Teammates Praise {playerName}\'s Late-Game Heroics',
    ],
    bodies: [
      'For the third time this season, {playerName} has delivered in crunch time. "Some guys just have it," said one teammate.',
      '{playerName} continues to make plays when they matter most. Scouts are taking notice of the pattern.',
    ],
    category: 'player_profile',
    priority: 'high',
  },
  {
    trait: 'clutch',
    confidenceLevel: 'confirmed',
    headlines: [
      '{playerName}: The Definition of Clutch',
      'No Stage Too Big for {playerName}',
    ],
    bodies: [
      '{playerName} has now made game-winning plays in multiple playoff games. There\'s no questioning this player\'s ability to perform under pressure.',
      'From regular season to playoffs, {playerName} consistently elevates when the stakes are highest. A true big-game performer.',
    ],
    category: 'breaking',
    priority: 'urgent',
  },
];

const IRON_MAN_TEMPLATES: NewsTemplate[] = [
  {
    trait: 'ironMan',
    confidenceLevel: 'hint',
    headlines: [
      '{playerName} Available Despite Minor Injury',
      '{playerName} Plays Through Pain',
    ],
    bodies: [
      'Despite nursing a minor injury, {playerName} suited up and performed at a high level.',
      '{playerName} returned to practice quickly after a minor setback, impressing coaching staff with their durability.',
    ],
    category: 'injury_report',
    priority: 'low',
  },
  {
    trait: 'ironMan',
    confidenceLevel: 'moderate',
    headlines: [
      '{playerName}\'s Streak Continues',
      'Durability a Calling Card for {playerName}',
    ],
    bodies: [
      '{playerName} hasn\'t missed a game in over two seasons. That kind of availability is becoming increasingly rare.',
      'While others deal with injury setbacks, {playerName} keeps showing up week after week. Coaches love the reliability.',
    ],
    category: 'player_profile',
    priority: 'medium',
  },
  {
    trait: 'ironMan',
    confidenceLevel: 'confirmed',
    headlines: [
      '{playerName} the Iron Man: {consecutiveGames} Straight Games',
      'Unprecedented Durability: {playerName}\'s Remarkable Streak',
    ],
    bodies: [
      'With {consecutiveGames} consecutive games played, {playerName} has established himself as one of the most durable players in the league.',
      '{playerName}\'s durability is unmatched. Multiple full seasons without missing a game is a testament to their conditioning and mental toughness.',
    ],
    category: 'player_profile',
    priority: 'high',
  },
];

const LEADER_TEMPLATES: NewsTemplate[] = [
  {
    trait: 'leader',
    confidenceLevel: 'hint',
    headlines: [
      '{playerName} Speaks Up in Team Meeting',
      'Teammates Respond to {playerName}\'s Challenge',
    ],
    bodies: [
      'Sources say {playerName} addressed the team after a tough loss. The response was positive.',
      '{playerName} has started taking on more of a vocal role in the locker room, earning respect from veterans.',
    ],
    category: 'insider_scoop',
    priority: 'medium',
  },
  {
    trait: 'leader',
    confidenceLevel: 'moderate',
    headlines: [
      '{playerName} Emerging as Locker Room Leader',
      'Coaches Lean on {playerName} for Leadership',
    ],
    bodies: [
      'Despite not wearing a captain\'s patch, {playerName} has become a go-to voice for the coaching staff.',
      'Multiple teammates have credited {playerName} with helping them through difficult stretches. Natural leadership is evident.',
    ],
    category: 'player_profile',
    priority: 'high',
  },
  {
    trait: 'leader',
    confidenceLevel: 'confirmed',
    headlines: [
      '{playerName}: A True Captain',
      '{playerName}\'s Leadership Transforms Team Culture',
    ],
    bodies: [
      '{playerName} has established themselves as an unquestioned leader. Teammates and coaches alike point to their impact on team culture.',
      'The transformation of this team starts with {playerName}. Their leadership extends far beyond the field.',
    ],
    category: 'player_profile',
    priority: 'urgent',
  },
];

const FILM_JUNKIE_TEMPLATES: NewsTemplate[] = [
  {
    trait: 'filmJunkie',
    confidenceLevel: 'hint',
    headlines: [
      '{playerName} First In, Last Out',
      'Extra Hours for {playerName}',
    ],
    bodies: [
      'Coaches note that {playerName} is often found in the film room well after team meetings end.',
      '{playerName} has been putting in extra preparation time this week, studying opponent tendencies.',
    ],
    category: 'practice_report',
    priority: 'low',
  },
  {
    trait: 'filmJunkie',
    confidenceLevel: 'moderate',
    headlines: [
      '{playerName}\'s Film Study Paying Dividends',
      'Preparation Key to {playerName}\'s Success',
    ],
    bodies: [
      '"They always know what\'s coming before it happens," said one coach about {playerName}\'s preparation habits.',
      '{playerName}\'s ability to read plays before they develop comes from legendary film study habits.',
    ],
    category: 'player_profile',
    priority: 'medium',
  },
  {
    trait: 'filmJunkie',
    confidenceLevel: 'confirmed',
    headlines: [
      '{playerName}: A True Student of the Game',
      'Inside {playerName}\'s Obsessive Preparation',
    ],
    bodies: [
      'Coaches marvel at {playerName}\'s dedication to film study. Their preparation habits are unmatched in the league.',
      '{playerName} studies more film than anyone on the team. That dedication shows on game day.',
    ],
    category: 'player_profile',
    priority: 'high',
  },
];

// ============================================================================
// NEWS TEMPLATES FOR NEGATIVE TRAITS
// ============================================================================

const CHOKES_TEMPLATES: NewsTemplate[] = [
  {
    trait: 'chokes',
    confidenceLevel: 'hint',
    headlines: [
      '{playerName} Quiet in Critical Moment',
      'Missed Opportunity for {playerName}',
    ],
    bodies: [
      '{playerName} was unable to come through when the team needed it most in the fourth quarter.',
      'A key drop by {playerName} proved costly as {teamName} fell short in the closing minutes.',
    ],
    category: 'game_recap',
    priority: 'medium',
  },
  {
    trait: 'chokes',
    confidenceLevel: 'moderate',
    headlines: [
      'Questions Arise About {playerName} in Big Moments',
      '{playerName} Struggles Continue in Pressure Situations',
    ],
    bodies: [
      'For the second time in a crucial game, {playerName} failed to deliver when it mattered most.',
      'A pattern may be emerging: {playerName} has struggled to make plays when the game is on the line.',
    ],
    category: 'game_recap',
    priority: 'high',
  },
  {
    trait: 'chokes',
    confidenceLevel: 'confirmed',
    headlines: [
      '{playerName}\'s Playoff Struggles Continue',
      'Can {playerName} Overcome Big-Game Issues?',
    ],
    bodies: [
      'Multiple playoff failures have raised serious concerns about {playerName}\'s ability to perform under pressure.',
      'The numbers don\'t lie: {playerName}\'s performance drops significantly when the stakes are highest.',
    ],
    category: 'player_profile',
    priority: 'urgent',
  },
];

const INJURY_PRONE_TEMPLATES: NewsTemplate[] = [
  {
    trait: 'injuryProne',
    confidenceLevel: 'hint',
    headlines: [
      '{playerName} Day-to-Day with Injury',
      '{playerName} Misses Practice',
    ],
    bodies: [
      '{playerName} is dealing with another minor injury and may miss time.',
      'Training staff working with {playerName} on recovery from latest setback.',
    ],
    category: 'injury_report',
    priority: 'low',
  },
  {
    trait: 'injuryProne',
    confidenceLevel: 'moderate',
    headlines: [
      'Injury Concerns Mount for {playerName}',
      '{playerName}\'s Availability Uncertain Again',
    ],
    bodies: [
      'This marks the third significant injury for {playerName} in the past two seasons. Durability is becoming a concern.',
      '{playerName} is back on the injury report. The pattern of setbacks is troubling for team planners.',
    ],
    category: 'injury_report',
    priority: 'medium',
  },
  {
    trait: 'injuryProne',
    confidenceLevel: 'confirmed',
    headlines: [
      '{playerName} Sidelined Again: Durability a Major Concern',
      'Injury History Clouds {playerName}\'s Future',
    ],
    bodies: [
      '{playerName} has now missed significant time in multiple seasons. The injury history is extensive and concerning.',
      'Despite the talent, {playerName}\'s inability to stay healthy has become a defining characteristic of their career.',
    ],
    category: 'injury_report',
    priority: 'high',
  },
];

const HOT_HEAD_TEMPLATES: NewsTemplate[] = [
  {
    trait: 'hotHead',
    confidenceLevel: 'hint',
    headlines: [
      '{playerName} Gets Personal Foul',
      'Tempers Flare for {playerName}',
    ],
    bodies: [
      '{playerName} was flagged for an unnecessary roughness penalty late in the game.',
      'An exchange between {playerName} and an opponent required officials to intervene.',
    ],
    category: 'game_recap',
    priority: 'low',
  },
  {
    trait: 'hotHead',
    confidenceLevel: 'moderate',
    headlines: [
      '{playerName} Involved in Practice Scuffle',
      'Discipline Issues for {playerName}?',
    ],
    bodies: [
      'Sources report {playerName} was involved in a confrontation at practice. Teammates had to separate the parties.',
      'Coaches are monitoring {playerName}\'s temperament after multiple penalty issues this season.',
    ],
    category: 'practice_report',
    priority: 'medium',
  },
  {
    trait: 'hotHead',
    confidenceLevel: 'confirmed',
    headlines: [
      '{playerName} Ejected After Altercation',
      'Pattern of Behavior: {playerName}\'s Discipline Problems',
    ],
    bodies: [
      '{playerName} was ejected from the game after a confrontation. This is not an isolated incident.',
      'Multiple ejections and penalties have established a clear pattern: {playerName} struggles to control their emotions.',
    ],
    category: 'breaking',
    priority: 'urgent',
  },
];

const DIVA_TEMPLATES: NewsTemplate[] = [
  {
    trait: 'diva',
    confidenceLevel: 'hint',
    headlines: [
      '{playerName} Addresses Media After Loss',
      '{playerName} Comments Raise Eyebrows',
    ],
    bodies: [
      '{playerName} made some pointed comments about their role in the offense following the loss.',
      'Some are reading between the lines of {playerName}\'s post-game interview.',
    ],
    category: 'insider_scoop',
    priority: 'low',
  },
  {
    trait: 'diva',
    confidenceLevel: 'moderate',
    headlines: [
      '{playerName} Wants More Targets',
      'Contract Talks Stall for {playerName}',
    ],
    bodies: [
      '{playerName} publicly expressed frustration with their role in the offense. Coaches declined to comment.',
      'Sources say {playerName}\'s contract demands are causing friction with the front office.',
    ],
    category: 'insider_scoop',
    priority: 'medium',
  },
  {
    trait: 'diva',
    confidenceLevel: 'confirmed',
    headlines: [
      '{playerName} Creates Drama Again',
      'Can {teamName} Manage {playerName}\'s Ego?',
    ],
    bodies: [
      'Another week, another controversy surrounding {playerName}. The pattern of attention-seeking behavior is well-established.',
      '{playerName}\'s talent is undeniable, but the constant drama has become a distraction for {teamName}.',
    ],
    category: 'breaking',
    priority: 'high',
  },
];

const LAZY_TEMPLATES: NewsTemplate[] = [
  {
    trait: 'lazy',
    confidenceLevel: 'hint',
    headlines: [
      '{playerName} Rested at Practice',
      'Light Workload for {playerName}',
    ],
    bodies: [
      '{playerName} sat out portions of practice this week. Coaches cite "maintenance."',
      '{playerName} has been managing their workload carefully this season.',
    ],
    category: 'practice_report',
    priority: 'low',
  },
  {
    trait: 'lazy',
    confidenceLevel: 'moderate',
    headlines: [
      'Coaches Want More from {playerName}',
      '{playerName}\'s Effort Questioned',
    ],
    bodies: [
      'Sources indicate coaching staff has addressed {playerName}\'s practice habits behind closed doors.',
      'Some wonder if {playerName} is maximizing their considerable talent with their approach to preparation.',
    ],
    category: 'insider_scoop',
    priority: 'medium',
  },
  {
    trait: 'lazy',
    confidenceLevel: 'confirmed',
    headlines: [
      '{playerName}\'s Work Ethic Under Scrutiny',
      'Talent vs. Effort: The {playerName} Question',
    ],
    bodies: [
      'Multiple sources have confirmed concerns about {playerName}\'s approach to practice and film study.',
      'Despite clear physical gifts, {playerName}\'s development has been hampered by questions about their dedication.',
    ],
    category: 'player_profile',
    priority: 'high',
  },
];

// ============================================================================
// ALL TEMPLATES COMBINED
// ============================================================================

const ALL_TEMPLATES: NewsTemplate[] = [
  ...CLUTCH_TEMPLATES,
  ...IRON_MAN_TEMPLATES,
  ...LEADER_TEMPLATES,
  ...FILM_JUNKIE_TEMPLATES,
  ...CHOKES_TEMPLATES,
  ...INJURY_PRONE_TEMPLATES,
  ...HOT_HEAD_TEMPLATES,
  ...DIVA_TEMPLATES,
  ...LAZY_TEMPLATES,
];

/**
 * Gets templates for a specific trait and confidence level
 */
function getTemplatesForTrait(
  trait: Trait,
  confidenceLevel: ConfidenceLevel
): NewsTemplate[] {
  // Find exact match first
  const exactMatches = ALL_TEMPLATES.filter(
    (t) => t.trait === trait && t.confidenceLevel === confidenceLevel
  );

  if (exactMatches.length > 0) {
    return exactMatches;
  }

  // Fall back to lower confidence levels
  const confidenceLevels: ConfidenceLevel[] = ['confirmed', 'strong', 'moderate', 'suspected', 'hint'];
  const targetIndex = confidenceLevels.indexOf(confidenceLevel);

  for (let i = targetIndex + 1; i < confidenceLevels.length; i++) {
    const fallbackMatches = ALL_TEMPLATES.filter(
      (t) => t.trait === trait && t.confidenceLevel === confidenceLevels[i]
    );
    if (fallbackMatches.length > 0) {
      return fallbackMatches;
    }
  }

  return [];
}

/**
 * Replaces placeholders in a template string
 */
function replacePlaceholders(
  template: string,
  playerName: string,
  teamName: string,
  metadata?: Record<string, unknown>
): string {
  let result = template
    .replace(/{playerName}/g, playerName)
    .replace(/{teamName}/g, teamName);

  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), String(value));
    }
  }

  return result;
}

/**
 * Generates a unique news event ID
 */
function generateNewsId(): string {
  return `news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generates a news event for a trait revelation
 */
export function generateTraitNews(
  playerId: string,
  playerName: string,
  teamName: string,
  traitEvidence: TraitEvidence,
  context: GameEventContext,
  metadata?: Record<string, unknown>
): NewsEvent | null {
  const templates = getTemplatesForTrait(traitEvidence.trait, traitEvidence.confidence);

  if (templates.length === 0) {
    return null;
  }

  const template = randomElement(templates);
  const headline = replacePlaceholders(
    randomElement(template.headlines),
    playerName,
    teamName,
    metadata
  );
  const body = replacePlaceholders(
    randomElement(template.bodies),
    playerName,
    teamName,
    metadata
  );

  return {
    id: generateNewsId(),
    headline,
    body,
    category: template.category,
    priority: template.priority,
    relatedTrait: traitEvidence.trait,
    traitHintStrength: traitEvidence.confidence,
    playerId,
    playerName,
    teamName,
    timestamp: Date.now(),
    season: context.season,
    week: context.week,
    confirmsTraitRevelation: traitEvidence.confidence === 'confirmed',
  };
}

/**
 * Generates a generic news event for a game event (without trait hints)
 */
export function generateGameEventNews(
  playerId: string,
  playerName: string,
  teamName: string,
  context: GameEventContext,
  headline: string,
  body: string
): NewsEvent {
  const categoryMap: Partial<Record<GameEventType, NewsCategory>> = {
    gameWinningPlay: 'game_recap',
    playoffTouchdown: 'breaking',
    crucialDrop: 'game_recap',
    practiceAltercation: 'practice_report',
    penaltyEjection: 'breaking',
    injuryOccurred: 'injury_report',
    mediaIncident: 'breaking',
  };

  const priorityMap: Partial<Record<GameEventType, NewsPriority>> = {
    gameWinningPlay: 'high',
    playoffTouchdown: 'urgent',
    crucialDrop: 'medium',
    practiceAltercation: 'medium',
    penaltyEjection: 'high',
    injuryOccurred: 'high',
    mediaIncident: 'high',
  };

  return {
    id: generateNewsId(),
    headline: replacePlaceholders(headline, playerName, teamName),
    body: replacePlaceholders(body, playerName, teamName),
    category: categoryMap[context.eventType] || 'game_recap',
    priority: priorityMap[context.eventType] || 'medium',
    playerId,
    playerName,
    teamName,
    timestamp: Date.now(),
    season: context.season,
    week: context.week,
    traitHintStrength: 'hint',
    confirmsTraitRevelation: false,
  };
}

/**
 * Validates a news event object
 */
export function validateNewsEvent(event: NewsEvent): boolean {
  if (!event.id || typeof event.id !== 'string') return false;
  if (!event.headline || typeof event.headline !== 'string') return false;
  if (!event.body || typeof event.body !== 'string') return false;
  if (!event.playerId || typeof event.playerId !== 'string') return false;
  if (!event.playerName || typeof event.playerName !== 'string') return false;
  if (typeof event.timestamp !== 'number') return false;
  if (typeof event.season !== 'number') return false;
  if (typeof event.week !== 'number') return false;

  return true;
}

/**
 * Gets the display priority order for news events
 */
export function sortNewsByPriority(events: NewsEvent[]): NewsEvent[] {
  const priorityOrder: Record<NewsPriority, number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return [...events].sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Same priority, sort by timestamp (newest first)
    return b.timestamp - a.timestamp;
  });
}
