/**
 * News Generators - Category-specific news event generation.
 *
 * Provides generators for each news category: injury, trade, signing,
 * performance, milestone, draft, coaching, and league news.
 */

import { generateUUID, randomElement } from '../generators/utils/RandomUtils';
import {
  NewsFeedCategory,
  StoryPriority,
  StoryContext,
  StoryTemplate,
  TRADE_TEMPLATES,
  SIGNING_TEMPLATES,
  MILESTONE_TEMPLATES,
  DRAFT_TEMPLATES,
  LEAGUE_TEMPLATES,
  STREAK_TEMPLATES,
  RIVALRY_TEMPLATES,
  CONTRACT_YEAR_TEMPLATES,
  AI_TEAM_STORYLINE_TEMPLATES,
  TRADE_DEADLINE_TEMPLATES,
  replacePlaceholders,
  getTemplatesBySentiment,
} from './StoryTemplates';

/**
 * A generated news item
 */
export interface NewsItem {
  /** Unique identifier */
  id: string;
  /** Category of news */
  category: NewsFeedCategory;
  /** Headline */
  headline: string;
  /** Body text */
  body: string;
  /** Priority for display */
  priority: StoryPriority;
  /** Whether this is positive news */
  isPositive: boolean;
  /** Timestamp when created */
  timestamp: number;
  /** Season number */
  season: number;
  /** Week number */
  week: number;
  /** Related player ID if applicable */
  playerId?: string;
  /** Related team ID if applicable */
  teamId?: string;
  /** Whether the user has read this item */
  isRead: boolean;
  /** Whether this news reveals hints about hidden traits */
  revealsTraitHint: boolean;
  /** The trait being hinted at (if any) */
  hintedTrait?: string;
}

/**
 * Generates a unique news item ID
 */
function generateNewsItemId(): string {
  return `news_${generateUUID()}`;
}

/**
 * Base function to generate news from a template
 */
function generateFromTemplate(
  templates: StoryTemplate[],
  context: StoryContext,
  season: number,
  week: number,
  playerId?: string,
  teamId?: string
): NewsItem | null {
  if (templates.length === 0) return null;

  const template = randomElement(templates);
  const headline = replacePlaceholders(randomElement(template.headlines), context);
  const body = replacePlaceholders(randomElement(template.bodies), context);

  return {
    id: generateNewsItemId(),
    category: template.category,
    headline,
    body,
    priority: template.priority,
    isPositive: template.isPositive,
    timestamp: Date.now(),
    season,
    week,
    playerId,
    teamId,
    isRead: false,
    revealsTraitHint: false,
  };
}

// ============================================================================
// INJURY NEWS GENERATOR
// ============================================================================

/**
 * Context for injury news
 */
export interface InjuryNewsContext {
  playerName: string;
  playerPosition: string;
  teamName: string;
  injuryType: string;
  weeksOut: number;
  playerId: string;
  teamId: string;
}

/**
 * Generates injury news for when a player gets injured
 */
export function generateInjuryNews(
  context: InjuryNewsContext,
  season: number,
  week: number
): NewsItem | null {
  const templates = getTemplatesBySentiment('injury', false);
  const storyContext: StoryContext = {
    playerName: context.playerName,
    playerPosition: context.playerPosition,
    teamName: context.teamName,
    injuryType: context.injuryType,
    weeksOut: context.weeksOut,
  };

  const news = generateFromTemplate(
    templates,
    storyContext,
    season,
    week,
    context.playerId,
    context.teamId
  );

  // Injury news can subtly hint at injury-prone trait
  if (news && context.weeksOut > 4) {
    news.revealsTraitHint = true;
    news.hintedTrait = 'injuryProne';
  }

  return news;
}

/**
 * Generates news for when a player returns from injury
 */
export function generateInjuryReturnNews(
  context: InjuryNewsContext,
  season: number,
  week: number
): NewsItem | null {
  const templates = getTemplatesBySentiment('injury', true);
  const storyContext: StoryContext = {
    playerName: context.playerName,
    playerPosition: context.playerPosition,
    teamName: context.teamName,
    injuryType: context.injuryType,
    weeksOut: context.weeksOut,
  };

  const news = generateFromTemplate(
    templates,
    storyContext,
    season,
    week,
    context.playerId,
    context.teamId
  );

  // Quick returns can hint at ironMan trait
  if (news && context.weeksOut <= 1) {
    news.revealsTraitHint = true;
    news.hintedTrait = 'ironMan';
  }

  return news;
}

// ============================================================================
// TRADE NEWS GENERATOR
// ============================================================================

/**
 * Context for trade news
 */
export interface TradeNewsContext {
  playerName: string;
  playerPosition: string;
  oldTeam: string;
  newTeam: string;
  experience: number;
  playerId: string;
  newTeamId: string;
  oldTeamId: string;
}

/**
 * Generates news for a completed trade
 */
export function generateTradeNews(
  context: TradeNewsContext,
  season: number,
  week: number
): NewsItem | null {
  const templates = TRADE_TEMPLATES.filter((t) => t.priority === 'breaking');
  const storyContext: StoryContext = {
    playerName: context.playerName,
    playerPosition: context.playerPosition,
    oldTeam: context.oldTeam,
    newTeam: context.newTeam,
    teamName: context.newTeam,
    experience: context.experience,
  };

  return generateFromTemplate(
    templates,
    storyContext,
    season,
    week,
    context.playerId,
    context.newTeamId
  );
}

/**
 * Generates news about trade speculation
 */
export function generateTradeSpeculationNews(
  context: Omit<TradeNewsContext, 'newTeam' | 'newTeamId'> & { teamName: string; teamId: string },
  season: number,
  week: number
): NewsItem | null {
  const templates = TRADE_TEMPLATES.filter((t) => t.priority === 'high');
  const storyContext: StoryContext = {
    playerName: context.playerName,
    playerPosition: context.playerPosition,
    teamName: context.teamName,
    experience: context.experience,
  };

  return generateFromTemplate(
    templates,
    storyContext,
    season,
    week,
    context.playerId,
    context.teamId
  );
}

// ============================================================================
// SIGNING NEWS GENERATOR
// ============================================================================

/**
 * Context for signing news
 */
export interface SigningNewsContext {
  playerName: string;
  playerPosition: string;
  teamName: string;
  contractYears: number;
  contractValue: number;
  age: number;
  playerId: string;
  teamId: string;
  isExtension?: boolean;
}

/**
 * Generates news for a contract signing
 */
export function generateSigningNews(
  context: SigningNewsContext,
  season: number,
  week: number
): NewsItem | null {
  const templates = context.isExtension
    ? SIGNING_TEMPLATES.filter((t) =>
        t.headlines.some((h) => h.includes('Extension') || h.includes('Lock Up'))
      )
    : SIGNING_TEMPLATES.filter((t) =>
        t.headlines.some((h) => h.includes('Free Agent') || h.includes('Joins'))
      );

  // Fall back to all signing templates if no specific match
  const templatestoUse = templates.length > 0 ? templates : SIGNING_TEMPLATES;

  const storyContext: StoryContext = {
    playerName: context.playerName,
    playerPosition: context.playerPosition,
    teamName: context.teamName,
    contractYears: context.contractYears,
    contractValue: context.contractValue,
    age: context.age,
  };

  return generateFromTemplate(
    templatestoUse,
    storyContext,
    season,
    week,
    context.playerId,
    context.teamId
  );
}

// ============================================================================
// PERFORMANCE NEWS GENERATOR
// ============================================================================

/**
 * Context for performance news
 */
export interface PerformanceNewsContext {
  playerName: string;
  playerPosition: string;
  teamName: string;
  opponentName: string;
  gameScore: string;
  yards?: number;
  touchdowns?: number;
  interceptions?: number;
  completions?: number;
  attempts?: number;
  tackles?: number;
  sacks?: number;
  playerId: string;
  teamId: string;
  isPositivePerformance: boolean;
}

/**
 * Generates news for a player's performance
 */
export function generatePerformanceNews(
  context: PerformanceNewsContext,
  season: number,
  week: number
): NewsItem | null {
  const templates = getTemplatesBySentiment('performance', context.isPositivePerformance);

  // For defensive players with sacks, use defensive templates
  const defensiveTemplates = templates.filter((t) =>
    t.headlines.some((h) => h.includes('Sacks') || h.includes('Defensive'))
  );
  const offensiveTemplates = templates.filter((t) =>
    t.headlines.some((h) => h.includes('TDs') || h.includes('Yards') || h.includes('Dominates'))
  );

  let templatestoUse = templates;
  if (context.sacks && context.sacks > 0) {
    templatestoUse = defensiveTemplates.length > 0 ? defensiveTemplates : templates;
  } else if (context.yards || context.touchdowns) {
    templatestoUse = offensiveTemplates.length > 0 ? offensiveTemplates : templates;
  }

  const storyContext: StoryContext = {
    playerName: context.playerName,
    playerPosition: context.playerPosition,
    teamName: context.teamName,
    opponentName: context.opponentName,
    gameScore: context.gameScore,
    yards: context.yards,
    touchdowns: context.touchdowns,
    interceptions: context.interceptions,
    completions: context.completions,
    attempts: context.attempts,
    tackles: context.tackles,
    sacks: context.sacks,
  };

  const news = generateFromTemplate(
    templatestoUse,
    storyContext,
    season,
    week,
    context.playerId,
    context.teamId
  );

  // Big performances can hint at clutch trait
  if (news && context.isPositivePerformance && (context.touchdowns ?? 0) >= 3) {
    news.revealsTraitHint = true;
    news.hintedTrait = 'clutch';
  }

  // Poor performances can hint at chokes trait
  if (news && !context.isPositivePerformance && (context.interceptions ?? 0) >= 3) {
    news.revealsTraitHint = true;
    news.hintedTrait = 'chokes';
  }

  return news;
}

// ============================================================================
// MILESTONE NEWS GENERATOR
// ============================================================================

/**
 * Context for milestone news
 */
export interface MilestoneNewsContext {
  playerName: string;
  playerPosition: string;
  teamName: string;
  opponentName?: string;
  careerYards?: number;
  careerTouchdowns?: number;
  consecutiveGames?: number;
  playerId: string;
  teamId: string;
}

/**
 * Generates news for a career milestone
 */
export function generateMilestoneNews(
  context: MilestoneNewsContext,
  season: number,
  week: number
): NewsItem | null {
  let templates = MILESTONE_TEMPLATES;

  // Filter to relevant templates based on milestone type
  if (context.careerYards) {
    templates = MILESTONE_TEMPLATES.filter((t) => t.headlines.some((h) => h.includes('Yards')));
  } else if (context.careerTouchdowns) {
    templates = MILESTONE_TEMPLATES.filter((t) =>
      t.headlines.some((h) => h.includes('TD') || h.includes('Touchdown'))
    );
  } else if (context.consecutiveGames) {
    templates = MILESTONE_TEMPLATES.filter((t) =>
      t.headlines.some((h) => h.includes('Consecutive') || h.includes('Iron Man'))
    );
  }

  // Fall back to all milestone templates if no specific match
  if (templates.length === 0) {
    templates = MILESTONE_TEMPLATES;
  }

  const storyContext: StoryContext = {
    playerName: context.playerName,
    playerPosition: context.playerPosition,
    teamName: context.teamName,
    opponentName: context.opponentName,
    careerYards: context.careerYards,
    careerTouchdowns: context.careerTouchdowns,
    consecutiveGames: context.consecutiveGames,
  };

  const news = generateFromTemplate(
    templates,
    storyContext,
    season,
    week,
    context.playerId,
    context.teamId
  );

  // Consecutive games milestones hint at ironMan trait
  if (news && context.consecutiveGames && context.consecutiveGames >= 48) {
    news.revealsTraitHint = true;
    news.hintedTrait = 'ironMan';
  }

  return news;
}

// ============================================================================
// DRAFT NEWS GENERATOR
// ============================================================================

/**
 * Context for draft news
 */
export interface DraftNewsContext {
  playerName: string;
  playerPosition: string;
  teamName: string;
  draftRound: number;
  draftPick: number;
  playerId: string;
  teamId: string;
}

/**
 * Generates news for a draft pick
 */
export function generateDraftNews(
  context: DraftNewsContext,
  season: number,
  week: number
): NewsItem | null {
  const storyContext: StoryContext = {
    playerName: context.playerName,
    playerPosition: context.playerPosition,
    teamName: context.teamName,
    draftRound: context.draftRound,
    draftPick: context.draftPick,
  };

  return generateFromTemplate(
    DRAFT_TEMPLATES,
    storyContext,
    season,
    week,
    context.playerId,
    context.teamId
  );
}

// ============================================================================
// COACHING NEWS GENERATOR
// ============================================================================

/**
 * Context for coaching news
 */
export interface CoachingNewsContext {
  teamName: string;
  coachName?: string;
  teamId: string;
  isFiring?: boolean;
}

/**
 * Generates coaching change news
 */
export function generateCoachingNews(
  context: CoachingNewsContext,
  season: number,
  week: number
): NewsItem | null {
  const templates = context.isFiring
    ? getTemplatesBySentiment('coaching', false)
    : getTemplatesBySentiment('coaching', true);

  const storyContext: StoryContext = {
    teamName: context.teamName,
    coachName: context.coachName,
  };

  return generateFromTemplate(templates, storyContext, season, week, undefined, context.teamId);
}

// ============================================================================
// LEAGUE NEWS GENERATOR
// ============================================================================

/**
 * Context for league news
 */
export interface LeagueNewsContext {
  teamName: string;
  opponentName?: string;
  gameScore?: string;
  winStreak?: number;
  lossStreak?: number;
  teamId: string;
}

/**
 * Generates league news (playoffs, streaks, etc.)
 */
export function generateLeagueNews(
  context: LeagueNewsContext,
  season: number,
  week: number
): NewsItem | null {
  let templates = LEAGUE_TEMPLATES;

  // Filter based on context
  if (context.winStreak && context.winStreak >= 3) {
    templates = LEAGUE_TEMPLATES.filter((t) =>
      t.headlines.some((h) => h.includes('Win Streak') || h.includes('Rolling'))
    );
  } else if (context.lossStreak && context.lossStreak >= 3) {
    templates = LEAGUE_TEMPLATES.filter((t) =>
      t.headlines.some((h) => h.includes('Skid') || h.includes('Lose'))
    );
  }

  if (templates.length === 0) {
    templates = LEAGUE_TEMPLATES;
  }

  const storyContext: StoryContext = {
    teamName: context.teamName,
    opponentName: context.opponentName,
    gameScore: context.gameScore,
    winStreak: context.winStreak,
    lossStreak: context.lossStreak,
  };

  return generateFromTemplate(templates, storyContext, season, week, undefined, context.teamId);
}

/**
 * Generates playoff clinch news
 */
export function generatePlayoffClinchNews(
  context: LeagueNewsContext,
  season: number,
  week: number
): NewsItem | null {
  const templates = LEAGUE_TEMPLATES.filter((t) =>
    t.headlines.some((h) => h.includes('Playoff') || h.includes('Clinch'))
  );

  if (templates.length === 0) {
    return null;
  }

  const storyContext: StoryContext = {
    teamName: context.teamName,
    opponentName: context.opponentName,
    gameScore: context.gameScore,
  };

  return generateFromTemplate(templates, storyContext, season, week, undefined, context.teamId);
}

// ============================================================================
// STREAK NEWS GENERATOR
// ============================================================================

/**
 * Generates news for a team on a winning or losing streak
 */
export function generateStreakNews(
  teamName: string,
  teamId: string,
  streakType: 'winning' | 'losing',
  streakLength: number,
  season: number,
  week: number
): NewsItem {
  const template = randomElement(STREAK_TEMPLATES);
  const context: StoryContext = { teamName, count: streakLength };
  const headline = replacePlaceholders(template, context);

  const isPositive = streakType === 'winning';
  const body = isPositive
    ? `The ${teamName} have won ${streakLength} games in a row and are one of the hottest teams in the league right now.`
    : `It has been a rough stretch for the ${teamName}, who have now dropped ${streakLength} straight games. The pressure is mounting.`;

  return {
    id: generateNewsItemId(),
    category: 'league',
    headline,
    body,
    priority: streakLength >= 5 ? 'high' : 'medium',
    isPositive,
    timestamp: Date.now(),
    season,
    week,
    teamId,
    isRead: false,
    revealsTraitHint: false,
  };
}

// ============================================================================
// RIVALRY NEWS GENERATOR
// ============================================================================

/**
 * Generates news for an upcoming division rivalry game
 */
export function generateRivalryNews(
  team1Name: string,
  team2Name: string,
  divisionName: string,
  season: number,
  week: number
): NewsItem {
  const template = randomElement(RIVALRY_TEMPLATES);
  const context: StoryContext = {
    team1: team1Name,
    team2: team2Name,
    division: divisionName,
  };
  const headline = replacePlaceholders(template, context);
  const body = `A key divisional matchup this week features the ${team1Name} against the ${team2Name}. Division games always carry extra weight in the standings race.`;

  return {
    id: generateNewsItemId(),
    category: 'league',
    headline,
    body,
    priority: 'medium',
    isPositive: true,
    timestamp: Date.now(),
    season,
    week,
    isRead: false,
    revealsTraitHint: false,
  };
}

// ============================================================================
// CONTRACT YEAR NEWS GENERATOR
// ============================================================================

/**
 * Generates news for a player in a contract year
 */
export function generateContractYearNews(
  playerName: string,
  teamName: string,
  performance: 'strong' | 'struggling',
  season: number,
  week: number
): NewsItem {
  const template = randomElement(CONTRACT_YEAR_TEMPLATES);
  const context: StoryContext = { playerName, teamName };
  const headline = replacePlaceholders(template, context);

  const isPositive = performance === 'strong';
  const body = isPositive
    ? `${playerName} is making the most of a contract year, posting impressive numbers for the ${teamName}. The front office will have a decision to make this offseason.`
    : `${playerName} has not lived up to expectations in a contract year with the ${teamName}. This could significantly impact his market value this offseason.`;

  return {
    id: generateNewsItemId(),
    category: 'performance',
    headline,
    body,
    priority: 'medium',
    isPositive,
    timestamp: Date.now(),
    season,
    week,
    isRead: false,
    revealsTraitHint: false,
  };
}

// ============================================================================
// AI TEAM STORYLINE GENERATOR
// ============================================================================

/**
 * Generates a storyline news item for an AI-controlled team
 */
export function generateAITeamStoryline(
  teamName: string,
  teamId: string,
  record: string,
  narrativeType: 'surprise_contender' | 'disappointing' | 'rebuilding' | 'rising',
  season: number,
  week: number
): NewsItem {
  const template = randomElement(AI_TEAM_STORYLINE_TEMPLATES);
  const context: StoryContext = { teamName, record };
  const headline = replacePlaceholders(template, context);

  const bodyMap: Record<typeof narrativeType, string> = {
    surprise_contender: `The ${teamName} came into the season with low expectations but sit at ${record} and look like legitimate playoff contenders.`,
    disappointing: `Expectations were high for the ${teamName} this season, but a ${record} record has fans and analysts questioning the direction of the franchise.`,
    rebuilding: `At ${record}, the ${teamName} appear to be heading toward a long offseason. The front office may be looking to the future.`,
    rising: `The ${teamName} are quietly putting together a solid season at ${record}. They may not grab headlines, but they are earning respect around the league.`,
  };

  const isPositive = narrativeType === 'surprise_contender' || narrativeType === 'rising';

  return {
    id: generateNewsItemId(),
    category: 'league',
    headline,
    body: bodyMap[narrativeType],
    priority: 'medium',
    isPositive,
    timestamp: Date.now(),
    season,
    week,
    teamId,
    isRead: false,
    revealsTraitHint: false,
  };
}

// ============================================================================
// TRADE DEADLINE NEWS GENERATOR
// ============================================================================

/**
 * Generates trade deadline buzz news
 */
export function generateTradeDeadlineNews(
  week: number,
  deadlineWeek: number,
  season: number
): NewsItem {
  const template = randomElement(TRADE_DEADLINE_TEMPLATES);
  const context: StoryContext = { deadlineWeek };
  const headline = replacePlaceholders(template, context);

  const weeksUntil = deadlineWeek - week;
  const body =
    weeksUntil <= 0
      ? `The trade deadline has arrived. Expect a flurry of moves as contenders and pretenders sort themselves out.`
      : `With the trade deadline just ${weeksUntil} week${weeksUntil === 1 ? '' : 's'} away, front offices around the league are making their final evaluations on whether to buy or sell.`;

  return {
    id: generateNewsItemId(),
    category: 'trade',
    headline,
    body,
    priority: weeksUntil <= 1 ? 'high' : 'medium',
    isPositive: true,
    timestamp: Date.now(),
    season,
    week,
    isRead: false,
    revealsTraitHint: false,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates a news item
 */
export function validateNewsItem(item: NewsItem): boolean {
  if (!item.id || typeof item.id !== 'string') return false;
  if (!item.headline || typeof item.headline !== 'string') return false;
  if (!item.body || typeof item.body !== 'string') return false;
  if (typeof item.timestamp !== 'number') return false;
  if (typeof item.season !== 'number') return false;
  if (typeof item.week !== 'number') return false;
  if (typeof item.isRead !== 'boolean') return false;
  if (typeof item.isPositive !== 'boolean') return false;
  if (typeof item.revealsTraitHint !== 'boolean') return false;

  return true;
}

/**
 * Marks a news item as read
 */
export function markAsRead(item: NewsItem): NewsItem {
  return { ...item, isRead: true };
}

/**
 * Gets unread news items
 */
export function getUnreadNews(items: NewsItem[]): NewsItem[] {
  return items.filter((item) => !item.isRead);
}

/**
 * Gets news items that reveal trait hints
 */
export function getTraitRevealingNews(items: NewsItem[]): NewsItem[] {
  return items.filter((item) => item.revealsTraitHint);
}

/**
 * Sorts news by priority and timestamp
 */
export function sortNewsByPriorityAndTime(items: NewsItem[]): NewsItem[] {
  const priorityOrder: Record<StoryPriority, number> = {
    breaking: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return [...items].sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.timestamp - a.timestamp;
  });
}

/**
 * Filters news by category
 */
export function filterByCategory(items: NewsItem[], category: NewsFeedCategory): NewsItem[] {
  return items.filter((item) => item.category === category);
}

/**
 * Filters news by team
 */
export function filterByTeam(items: NewsItem[], teamId: string): NewsItem[] {
  return items.filter((item) => item.teamId === teamId);
}

/**
 * Filters news by player
 */
export function filterByPlayer(items: NewsItem[], playerId: string): NewsItem[] {
  return items.filter((item) => item.playerId === playerId);
}

/**
 * Gets news from a specific week
 */
export function getNewsFromWeek(items: NewsItem[], season: number, week: number): NewsItem[] {
  return items.filter((item) => item.season === season && item.week === week);
}
