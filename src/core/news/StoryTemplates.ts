/**
 * Story Templates - Template-based news story generation.
 *
 * Provides rich, varied templates for news headlines and bodies across all
 * news categories. Templates support placeholder replacement for dynamic content.
 */

import { randomElement } from '../generators/utils/RandomUtils';

/**
 * News categories for the feed
 */
export type NewsFeedCategory =
  | 'injury'
  | 'trade'
  | 'signing'
  | 'performance'
  | 'milestone'
  | 'draft'
  | 'coaching'
  | 'rumor'
  | 'league';

/**
 * Priority levels for news display
 */
export type StoryPriority = 'breaking' | 'high' | 'medium' | 'low';

/**
 * Template for a story headline and body
 */
export interface StoryTemplate {
  /** Category of the news */
  category: NewsFeedCategory;
  /** Available headline templates */
  headlines: string[];
  /** Available body templates */
  bodies: string[];
  /** Priority level */
  priority: StoryPriority;
  /** Whether this is positive news */
  isPositive: boolean;
}

/**
 * Context for story generation with placeholder values
 */
export interface StoryContext {
  playerName?: string;
  playerFirstName?: string;
  playerLastName?: string;
  playerPosition?: string;
  teamName?: string;
  opponentName?: string;
  injuryType?: string;
  weeksOut?: number;
  yards?: number;
  touchdowns?: number;
  interceptions?: number;
  completions?: number;
  attempts?: number;
  tackles?: number;
  sacks?: number;
  contractYears?: number;
  contractValue?: number;
  draftRound?: number;
  draftPick?: number;
  draftYear?: number;
  season?: number;
  week?: number;
  consecutiveGames?: number;
  careerYards?: number;
  careerTouchdowns?: number;
  gameScore?: string;
  winStreak?: number;
  lossStreak?: number;
  coachName?: string;
  newTeam?: string;
  oldTeam?: string;
  age?: number;
  experience?: number;
  [key: string]: string | number | undefined;
}

// ============================================================================
// INJURY TEMPLATES
// ============================================================================

export const INJURY_TEMPLATES: StoryTemplate[] = [
  {
    category: 'injury',
    headlines: [
      '{playerName} Placed on Injured Reserve',
      '{teamName} Lose {playerName} to Injury',
      '{playerName} Out {weeksOut} Weeks with {injuryType}',
      'Injury Report: {playerName} Sidelined',
    ],
    bodies: [
      '{teamName} announced that {playerName} has been placed on injured reserve with a {injuryType}. The {playerPosition} is expected to miss {weeksOut} weeks.',
      'Bad news for {teamName} as {playerName} suffered a {injuryType} and will be out approximately {weeksOut} weeks. The team is evaluating options at {playerPosition}.',
      '{playerName} underwent evaluation and was diagnosed with a {injuryType}. Head coach expects the {playerPosition} to return in about {weeksOut} weeks.',
    ],
    priority: 'high',
    isPositive: false,
  },
  {
    category: 'injury',
    headlines: [
      '{playerName} Returns to Practice',
      'Good News: {playerName} Cleared to Play',
      '{playerName} Back for {teamName}',
      '{teamName} Get {playerName} Back',
    ],
    bodies: [
      '{playerName} returned to practice today and is expected to play this week. The {playerPosition} has been cleared by team doctors.',
      'Great news for {teamName}: {playerName} has been medically cleared and will return to the lineup this week.',
      'After missing time with a {injuryType}, {playerName} is back in action. The {playerPosition} practiced fully and has no limitations.',
    ],
    priority: 'medium',
    isPositive: true,
  },
  {
    category: 'injury',
    headlines: [
      '{playerName} Day-to-Day with {injuryType}',
      '{playerName} Listed as Questionable',
      '{teamName} Monitoring {playerName}',
    ],
    bodies: [
      '{playerName} is listed as day-to-day with a {injuryType}. The {teamName} are hopeful the {playerPosition} can play this week.',
      'The status of {playerName} is uncertain after suffering a minor {injuryType} in practice. Team officials are optimistic.',
      "{playerName} appeared on the injury report with a {injuryType}. The {playerPosition}'s availability for this week is questionable.",
    ],
    priority: 'medium',
    isPositive: false,
  },
];

// ============================================================================
// TRADE TEMPLATES
// ============================================================================

export const TRADE_TEMPLATES: StoryTemplate[] = [
  {
    category: 'trade',
    headlines: [
      'BREAKING: {playerName} Traded to {newTeam}',
      '{oldTeam} Deal {playerName} to {newTeam}',
      'Trade Alert: {playerName} Heading to {newTeam}',
      'Blockbuster Trade Sends {playerName} to {newTeam}',
    ],
    bodies: [
      'In a surprising move, {oldTeam} have traded {playerName} to {newTeam}. The {playerPosition} had been with {oldTeam} for {experience} seasons.',
      '{playerName} is on the move. {newTeam} acquired the {playerPosition} from {oldTeam} in a deal announced today.',
      'Sources confirm {playerName} has been traded to {newTeam}. The veteran {playerPosition} brings {experience} years of experience.',
    ],
    priority: 'breaking',
    isPositive: true,
  },
  {
    category: 'trade',
    headlines: [
      '{teamName} Exploring Trade Options for {playerName}',
      'Trade Talks Involving {playerName}',
      '{playerName} Could Be on the Move',
    ],
    bodies: [
      'Multiple sources indicate {teamName} are fielding offers for {playerName}. The {playerPosition} has drawn interest from several teams.',
      '{playerName} has reportedly been made available by {teamName}. Teams looking for help at {playerPosition} have expressed interest.',
      'Trade discussions involving {playerName} are ongoing. {teamName} are listening to offers for the {experience}-year veteran.',
    ],
    priority: 'high',
    isPositive: false,
  },
];

// ============================================================================
// SIGNING TEMPLATES
// ============================================================================

export const SIGNING_TEMPLATES: StoryTemplate[] = [
  {
    category: 'signing',
    headlines: [
      '{playerName} Signs {contractYears}-Year Deal with {teamName}',
      '{teamName} Lock Up {playerName}',
      'Done Deal: {playerName} Stays with {teamName}',
      '{playerName} Agrees to Extension',
    ],
    bodies: [
      '{playerName} has agreed to a {contractYears}-year contract extension with {teamName}. The deal is worth approximately ${contractValue} million.',
      '{teamName} announced the signing of {playerName} to a {contractYears}-year extension. The {playerPosition} was a priority to retain.',
      'The {playerName} era continues in {teamName}. The {playerPosition} signed a {contractYears}-year deal worth ${contractValue} million.',
    ],
    priority: 'high',
    isPositive: true,
  },
  {
    category: 'signing',
    headlines: [
      '{teamName} Sign Free Agent {playerName}',
      '{playerName} Joins {teamName}',
      'New Addition: {playerName} Signs with {teamName}',
    ],
    bodies: [
      '{teamName} have signed free agent {playerName} to a {contractYears}-year contract. The {age}-year-old {playerPosition} adds depth to the roster.',
      '{playerName} is heading to {teamName} after agreeing to a {contractYears}-year deal. The veteran {playerPosition} brings experience.',
      'Free agent {playerName} has found a new home with {teamName}. The {playerPosition} signed a contract worth ${contractValue} million.',
    ],
    priority: 'medium',
    isPositive: true,
  },
];

// ============================================================================
// PERFORMANCE TEMPLATES
// ============================================================================

export const PERFORMANCE_TEMPLATES: StoryTemplate[] = [
  {
    category: 'performance',
    headlines: [
      '{playerName} Dominates in Win Over {opponentName}',
      'Monster Game from {playerName}',
      '{playerName} Leads {teamName} to Victory',
      'Player of the Week: {playerName}',
    ],
    bodies: [
      '{playerName} put on a show against {opponentName}, helping {teamName} secure the win. The {playerPosition} was nearly unstoppable.',
      'What a performance by {playerName}! The {teamName} {playerPosition} was the clear difference maker in the {gameScore} victory over {opponentName}.',
      '{playerName} continues to impress. Another stellar performance led {teamName} past {opponentName}.',
    ],
    priority: 'high',
    isPositive: true,
  },
  {
    category: 'performance',
    headlines: [
      '{playerName} Throws {touchdowns} TDs in Win',
      '{playerName} Racks Up {yards} Yards',
      'Career Day for {playerName}: {touchdowns} Touchdowns',
    ],
    bodies: [
      '{playerName} had one of the best games of the season, throwing for {yards} yards and {touchdowns} touchdowns. {teamName} cruised to a {gameScore} victory.',
      'An incredible performance by {playerName}, who finished with {yards} yards and {touchdowns} touchdowns against {opponentName}.',
      '{playerName} was on fire, completing {completions} of {attempts} passes for {yards} yards and {touchdowns} scores.',
    ],
    priority: 'high',
    isPositive: true,
  },
  {
    category: 'performance',
    headlines: [
      '{playerName} Struggles in Loss',
      'Rough Day for {playerName}',
      '{playerName} Has Game to Forget',
    ],
    bodies: [
      '{playerName} had a forgettable outing against {opponentName}. The {playerPosition} struggled throughout the {gameScore} loss.',
      "It wasn't {playerName}'s day. The {teamName} {playerPosition} couldn't get going against a tough {opponentName} defense.",
      "{playerName} will want to forget this one. Multiple mistakes contributed to {teamName}'s loss to {opponentName}.",
    ],
    priority: 'medium',
    isPositive: false,
  },
  {
    category: 'performance',
    headlines: [
      '{playerName} Records {sacks} Sacks',
      'Defensive Masterclass from {playerName}',
      '{playerName} Wreaks Havoc on {opponentName}',
    ],
    bodies: [
      '{playerName} was a force on defense, recording {sacks} sacks and {tackles} tackles in the win over {opponentName}.',
      'The {opponentName} offensive line had no answer for {playerName}, who dominated with {sacks} sacks.',
      "{playerName} made life miserable for {opponentName}'s quarterback, finishing with {sacks} sacks and constant pressure.",
    ],
    priority: 'high',
    isPositive: true,
  },
];

// ============================================================================
// MILESTONE TEMPLATES
// ============================================================================

export const MILESTONE_TEMPLATES: StoryTemplate[] = [
  {
    category: 'milestone',
    headlines: [
      '{playerName} Reaches {careerYards} Career Yards',
      'Historic: {playerName} Joins Elite Company',
      '{playerName} Sets Franchise Record',
      'Milestone Moment for {playerName}',
    ],
    bodies: [
      '{playerName} has officially reached {careerYards} career yards, joining an elite group of players. The {teamName} {playerPosition} achieved the milestone in the win over {opponentName}.',
      "Congratulations to {playerName} on reaching {careerYards} career yards. The veteran {playerPosition} has been one of the league's most consistent performers.",
      'History was made today as {playerName} became just the latest player to reach {careerYards} career yards.',
    ],
    priority: 'high',
    isPositive: true,
  },
  {
    category: 'milestone',
    headlines: [
      '{playerName} Scores {careerTouchdowns}th Career TD',
      '{playerName} Reaches Touchdown Milestone',
      '{careerTouchdowns} and Counting for {playerName}',
    ],
    bodies: [
      '{playerName} scored their {careerTouchdowns}th career touchdown in the game against {opponentName}. What a career for the {teamName} {playerPosition}.',
      'Another milestone for {playerName}: career touchdown number {careerTouchdowns}. The {playerPosition} shows no signs of slowing down.',
      '{playerName} continues to add to an impressive resume with career touchdown number {careerTouchdowns}.',
    ],
    priority: 'medium',
    isPositive: true,
  },
  {
    category: 'milestone',
    headlines: [
      '{playerName} Plays {consecutiveGames} Consecutive Games',
      "Iron Man: {playerName}'s Streak Hits {consecutiveGames}",
      "{playerName}'s Durability on Display",
    ],
    bodies: [
      '{playerName} extended their consecutive games played streak to {consecutiveGames}. The {teamName} {playerPosition} is the definition of reliable.',
      'Remarkable durability from {playerName}, who has now played {consecutiveGames} straight games. Coaches can always count on the {playerPosition}.',
      '{consecutiveGames} consecutive games and counting for {playerName}. That kind of availability is invaluable.',
    ],
    priority: 'medium',
    isPositive: true,
  },
];

// ============================================================================
// DRAFT TEMPLATES
// ============================================================================

export const DRAFT_TEMPLATES: StoryTemplate[] = [
  {
    category: 'draft',
    headlines: [
      '{teamName} Select {playerName} with Pick #{draftPick}',
      'Welcome to {teamName}, {playerName}!',
      '{playerName} Goes to {teamName} in Round {draftRound}',
    ],
    bodies: [
      '{teamName} have selected {playerName} with the {draftPick}th overall pick. The {playerPosition} is expected to compete for playing time immediately.',
      'With the {draftPick}th pick, {teamName} address their {playerPosition} need by selecting {playerName}.',
      '{playerName} is heading to {teamName} after being selected in round {draftRound}. The {playerPosition} was highly regarded by scouts.',
    ],
    priority: 'high',
    isPositive: true,
  },
];

// ============================================================================
// COACHING TEMPLATES
// ============================================================================

export const COACHING_TEMPLATES: StoryTemplate[] = [
  {
    category: 'coaching',
    headlines: [
      '{teamName} Fire Head Coach',
      'Coaching Change: {teamName} Part Ways with HC',
      '{teamName} Make Coaching Move',
    ],
    bodies: [
      '{teamName} have fired their head coach following a disappointing stretch. An interim replacement has been named.',
      'A coaching change in {teamName} as the head coach has been relieved of duties. The search for a replacement begins.',
      '{teamName} are making a change at the top. The head coach has been let go after failing to meet expectations.',
    ],
    priority: 'breaking',
    isPositive: false,
  },
  {
    category: 'coaching',
    headlines: [
      '{teamName} Hire {coachName} as Head Coach',
      '{coachName} Named {teamName} Head Coach',
      'New Era: {coachName} Takes Over {teamName}',
    ],
    bodies: [
      '{teamName} have hired {coachName} as their new head coach. The move signals a new direction for the franchise.',
      '{coachName} is the new head coach of {teamName}. The hire brings excitement and optimism to the organization.',
      "It's official: {coachName} will lead {teamName} as head coach. The new hire addressed the team today.",
    ],
    priority: 'breaking',
    isPositive: true,
  },
];

// ============================================================================
// LEAGUE TEMPLATES
// ============================================================================

export const LEAGUE_TEMPLATES: StoryTemplate[] = [
  {
    category: 'league',
    headlines: [
      '{teamName} Clinch Playoff Berth',
      'Playoffs Bound: {teamName}',
      '{teamName} Secure Postseason Spot',
    ],
    bodies: [
      '{teamName} have clinched a playoff spot with their victory over {opponentName}. The team will compete for a championship.',
      'The {teamName} are heading to the playoffs! A {gameScore} win over {opponentName} secured their postseason berth.',
      'Congratulations to {teamName} on clinching a playoff spot. The season continues into the postseason.',
    ],
    priority: 'high',
    isPositive: true,
  },
  {
    category: 'league',
    headlines: [
      '{teamName} on {winStreak}-Game Win Streak',
      'Hot Streak: {teamName} Win {winStreak} Straight',
      '{teamName} Keep Rolling',
    ],
    bodies: [
      '{teamName} have won {winStreak} games in a row. The team is playing their best football at the right time.',
      'Another win for {teamName}, extending their winning streak to {winStreak} games. They are one of the hottest teams in the league.',
      '{teamName} keep winning, now {winStreak} in a row. Confidence is sky high in the locker room.',
    ],
    priority: 'medium',
    isPositive: true,
  },
  {
    category: 'league',
    headlines: [
      '{teamName} Mired in {lossStreak}-Game Skid',
      'Struggling: {teamName} Lose {lossStreak} Straight',
      "{teamName} Can't Find a Win",
    ],
    bodies: [
      '{teamName} have now lost {lossStreak} games in a row. Questions are mounting about the direction of the team.',
      'The losing continues for {teamName}, who dropped their {lossStreak}th straight game. Changes may be coming.',
      'Another loss for {teamName}, extending their losing streak to {lossStreak} games. The frustration is evident.',
    ],
    priority: 'medium',
    isPositive: false,
  },
];

// ============================================================================
// STREAK TEMPLATES
// ============================================================================

export const STREAK_TEMPLATES: string[] = [
  '{teamName} have won {count} straight — are they for real?',
  '{teamName} riding high on a {count}-game winning streak',
  'Wheels are falling off for {teamName} — {count} straight losses',
  "{teamName} can't find a win — losing streak hits {count}",
  'Hot streak alert: {teamName} winners of {count} in a row',
  '{teamName} in freefall with {count} consecutive losses',
  'Is this the year? {teamName} rolling with {count} straight wins',
  'Crisis mode for {teamName} after {count} straight defeats',
];

// ============================================================================
// RIVALRY TEMPLATES
// ============================================================================

export const RIVALRY_TEMPLATES: string[] = [
  'Division showdown: {team1} vs {team2} this week',
  'Bad blood brewing? {team1} and {team2} meet in a crucial divisional clash',
  'All eyes on the {division} as {team1} hosts {team2}',
  'Divisional grudge match: {team1} and {team2} square off',
  'Bragging rights on the line as {team1} faces {team2} in {division} action',
  '{division} battle: {team1} and {team2} renew their rivalry',
];

// ============================================================================
// CONTRACT YEAR TEMPLATES
// ============================================================================

export const CONTRACT_YEAR_TEMPLATES: string[] = [
  '{playerName} is playing for his next contract — and it shows',
  'Contract year magic? {playerName} is having a career year for {teamName}',
  '{playerName} struggling in a contract year — tough timing for {teamName}',
  'Playing for a payday: {playerName} raising his stock with {teamName}',
  '{playerName} looking to cash in with strong play in a walk year',
  'Contract year pressure getting to {playerName}? Production dipping for {teamName}',
];

// ============================================================================
// AI TEAM STORYLINE TEMPLATES
// ============================================================================

export const AI_TEAM_STORYLINE_TEMPLATES: string[] = [
  'Nobody saw this coming: {teamName} are {record} and in the playoff hunt',
  '{teamName} were supposed to contend — instead they sit at {record}',
  'Rebuild ahead? {teamName} at {record} with tough schedule remaining',
  '{teamName} quietly building something — currently sitting at {record}',
  'Surprise squad: {teamName} defying expectations at {record}',
  'What happened to {teamName}? Sitting at {record} and searching for answers',
  '{teamName} making noise at {record} — league better take notice',
  'Disappointing season continues for {teamName} who sit at {record}',
];

// ============================================================================
// TRADE DEADLINE TEMPLATES
// ============================================================================

export const TRADE_DEADLINE_TEMPLATES: string[] = [
  'Trade deadline approaches — who is buying and who is selling?',
  'Teams making calls as the trade deadline looms in week {deadlineWeek}',
  'Contenders looking to add pieces before the week {deadlineWeek} deadline',
  'The trade deadline is near — expect fireworks around week {deadlineWeek}',
  'Buy or sell? Front offices weighing options ahead of week {deadlineWeek} deadline',
  'Phones ringing across the league with week {deadlineWeek} trade deadline approaching',
];

// ============================================================================
// ALL TEMPLATES COMBINED BY CATEGORY
// ============================================================================

export const TEMPLATES_BY_CATEGORY: Record<NewsFeedCategory, StoryTemplate[]> = {
  injury: INJURY_TEMPLATES,
  trade: TRADE_TEMPLATES,
  signing: SIGNING_TEMPLATES,
  performance: PERFORMANCE_TEMPLATES,
  milestone: MILESTONE_TEMPLATES,
  draft: DRAFT_TEMPLATES,
  coaching: COACHING_TEMPLATES,
  rumor: [], // Rumors have their own generation system
  league: LEAGUE_TEMPLATES,
};

// ============================================================================
// TEMPLATE UTILITY FUNCTIONS
// ============================================================================

/**
 * Replaces placeholders in a template string with context values
 */
export function replacePlaceholders(template: string, context: StoryContext): string {
  let result = template;

  for (const [key, value] of Object.entries(context)) {
    if (value !== undefined) {
      const placeholder = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(placeholder, String(value));
    }
  }

  return result;
}

/**
 * Gets a random template for a category
 */
export function getRandomTemplate(category: NewsFeedCategory): StoryTemplate | null {
  const templates = TEMPLATES_BY_CATEGORY[category];
  if (!templates || templates.length === 0) {
    return null;
  }
  return randomElement(templates);
}

/**
 * Gets templates filtered by positive/negative sentiment
 */
export function getTemplatesBySentiment(
  category: NewsFeedCategory,
  isPositive: boolean
): StoryTemplate[] {
  const templates = TEMPLATES_BY_CATEGORY[category] || [];
  return templates.filter((t) => t.isPositive === isPositive);
}

/**
 * Gets templates filtered by priority
 */
export function getTemplatesByPriority(
  category: NewsFeedCategory,
  priority: StoryPriority
): StoryTemplate[] {
  const templates = TEMPLATES_BY_CATEGORY[category] || [];
  return templates.filter((t) => t.priority === priority);
}

/**
 * Generates a story using a template and context
 */
export function generateStoryFromTemplate(
  template: StoryTemplate,
  context: StoryContext
): { headline: string; body: string } {
  const headline = replacePlaceholders(randomElement(template.headlines), context);
  const body = replacePlaceholders(randomElement(template.bodies), context);

  return { headline, body };
}

/**
 * Validates that all required placeholders in a template have values
 */
export function validateTemplateContext(template: string, context: StoryContext): boolean {
  const placeholders = template.match(/\{(\w+)\}/g) || [];
  const keys = placeholders.map((p) => p.replace(/[{}]/g, ''));

  for (const key of keys) {
    if (context[key] === undefined) {
      return false;
    }
  }

  return true;
}
