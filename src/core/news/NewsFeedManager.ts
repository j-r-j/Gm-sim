/**
 * News Feed Manager - Central management for news feed state and operations.
 *
 * Manages all news items, rumors, and weekly digests. Provides a unified
 * interface for generating, storing, and querying news content.
 */

import {
  NewsItem,
  validateNewsItem,
  markAsRead,
  getUnreadNews,
  sortNewsByPriorityAndTime,
  filterByCategory,
  filterByTeam,
  filterByPlayer,
  getNewsFromWeek,
  InjuryNewsContext,
  TradeNewsContext,
  SigningNewsContext,
  PerformanceNewsContext,
  MilestoneNewsContext,
  DraftNewsContext,
  CoachingNewsContext,
  LeagueNewsContext,
  generateInjuryNews,
  generateInjuryReturnNews,
  generateTradeNews,
  generateSigningNews,
  generatePerformanceNews,
  generateMilestoneNews,
  generateDraftNews,
  generateCoachingNews,
  generateLeagueNews,
  generatePlayoffClinchNews,
} from './NewsGenerators';
import {
  Rumor,
  RumorConfig,
  RumorType,
  DEFAULT_RUMOR_CONFIG,
  generateRumor,
  generateRandomRumor,
  resolveRumor,
  filterExpiredRumors,
  getActiveRumors,
  getRumorsByType,
  getRumorsForPlayer,
  getRumorsForTeam,
  sortRumors,
  validateRumor,
  getTrueResolutionMessage,
  getFalseResolutionMessage,
} from './RumorMill';
import {
  WeeklyDigest,
  DigestConfig,
  DEFAULT_DIGEST_CONFIG,
  generateWeeklyDigest,
  markDigestViewed,
  validateWeeklyDigest,
  getDigestsForSeason,
  getLatestDigest,
} from './WeeklyDigest';
import { NewsFeedCategory, StoryContext } from './StoryTemplates';

/**
 * The complete state of the news feed system
 */
export interface NewsFeedState {
  /** All news items */
  newsItems: NewsItem[];
  /** All rumors */
  rumors: Rumor[];
  /** Weekly digests */
  digests: WeeklyDigest[];
  /** Current season */
  currentSeason: number;
  /** Current week */
  currentWeek: number;
  /** Rumor configuration */
  rumorConfig: RumorConfig;
  /** Digest configuration */
  digestConfig: DigestConfig;
  /** Maximum news items to keep (oldest are pruned) */
  maxNewsItems: number;
  /** Maximum rumors to keep */
  maxRumors: number;
  /** Maximum digests to keep */
  maxDigests: number;
}

/**
 * Creates a new news feed state
 */
export function createNewsFeedState(season: number = 1, week: number = 1): NewsFeedState {
  return {
    newsItems: [],
    rumors: [],
    digests: [],
    currentSeason: season,
    currentWeek: week,
    rumorConfig: { ...DEFAULT_RUMOR_CONFIG },
    digestConfig: { ...DEFAULT_DIGEST_CONFIG },
    maxNewsItems: 500,
    maxRumors: 50,
    maxDigests: 36, // About 2 seasons worth
  };
}

// ============================================================================
// STATE MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Advances the news feed to a new week
 */
export function advanceNewsFeedWeek(
  state: NewsFeedState,
  season: number,
  week: number
): NewsFeedState {
  // Generate digest for the ending week before advancing
  const newsThisWeek = getNewsFromWeek(state.newsItems, state.currentSeason, state.currentWeek);
  const rumorsThisWeek = getActiveRumors(state.rumors);

  let newDigests = [...state.digests];
  if (newsThisWeek.length > 0 || rumorsThisWeek.length > 0) {
    const digest = generateWeeklyDigest(
      newsThisWeek,
      rumorsThisWeek,
      state.currentSeason,
      state.currentWeek,
      state.digestConfig
    );
    newDigests.push(digest);
  }

  // Prune old digests
  if (newDigests.length > state.maxDigests) {
    newDigests = newDigests.slice(-state.maxDigests);
  }

  // Filter expired rumors
  const activeRumors = filterExpiredRumors(state.rumors);

  return {
    ...state,
    currentSeason: season,
    currentWeek: week,
    digests: newDigests,
    rumors: activeRumors,
  };
}

/**
 * Advances the news feed to a new season
 */
export function advanceNewsFeedSeason(state: NewsFeedState, newSeason: number): NewsFeedState {
  return advanceNewsFeedWeek(state, newSeason, 1);
}

// ============================================================================
// NEWS ITEM MANAGEMENT
// ============================================================================

/**
 * Adds a news item to the state
 */
export function addNewsItem(state: NewsFeedState, item: NewsItem): NewsFeedState {
  let newsItems = [...state.newsItems, item];

  // Prune oldest if over max
  if (newsItems.length > state.maxNewsItems) {
    newsItems = newsItems.slice(-state.maxNewsItems);
  }

  return { ...state, newsItems };
}

/**
 * Adds multiple news items
 */
export function addNewsItems(state: NewsFeedState, items: NewsItem[]): NewsFeedState {
  let newsItems = [...state.newsItems, ...items];

  // Prune oldest if over max
  if (newsItems.length > state.maxNewsItems) {
    newsItems = newsItems.slice(-state.maxNewsItems);
  }

  return { ...state, newsItems };
}

/**
 * Marks a news item as read
 */
export function markNewsAsRead(state: NewsFeedState, newsId: string): NewsFeedState {
  const newsItems = state.newsItems.map((item) => (item.id === newsId ? markAsRead(item) : item));
  return { ...state, newsItems };
}

/**
 * Marks all news as read
 */
export function markAllNewsAsRead(state: NewsFeedState): NewsFeedState {
  const newsItems = state.newsItems.map((item) => markAsRead(item));
  return { ...state, newsItems };
}

/**
 * Removes a news item
 */
export function removeNewsItem(state: NewsFeedState, newsId: string): NewsFeedState {
  const newsItems = state.newsItems.filter((item) => item.id !== newsId);
  return { ...state, newsItems };
}

// ============================================================================
// RUMOR MANAGEMENT
// ============================================================================

/**
 * Adds a rumor to the state
 */
export function addRumor(state: NewsFeedState, rumor: Rumor): NewsFeedState {
  let rumors = [...state.rumors, rumor];

  // Prune oldest if over max
  if (rumors.length > state.maxRumors) {
    // Keep most recent and any resolved
    const resolved = rumors.filter((r) => r.isResolved);
    const unresolved = rumors.filter((r) => !r.isResolved);
    const sortedUnresolved = sortRumors(unresolved);
    rumors = [...resolved, ...sortedUnresolved.slice(0, state.maxRumors - resolved.length)];
  }

  return { ...state, rumors };
}

/**
 * Resolves a rumor as true or false
 */
export function resolveRumorInState(
  state: NewsFeedState,
  rumorId: string,
  wasTrue: boolean,
  context: StoryContext
): NewsFeedState {
  const rumors = state.rumors.map((rumor) => {
    if (rumor.id !== rumorId) return rumor;

    const resolution = wasTrue
      ? getTrueResolutionMessage(rumor.type, context)
      : getFalseResolutionMessage(rumor.type, context);

    return resolveRumor(rumor, wasTrue, resolution);
  });

  return { ...state, rumors };
}

/**
 * Removes expired rumors from state
 */
export function cleanupExpiredRumors(state: NewsFeedState): NewsFeedState {
  const rumors = filterExpiredRumors(state.rumors);
  return { ...state, rumors };
}

// ============================================================================
// DIGEST MANAGEMENT
// ============================================================================

/**
 * Generates a digest for the current week
 */
export function generateCurrentWeekDigest(state: NewsFeedState): WeeklyDigest {
  const newsThisWeek = getNewsFromWeek(state.newsItems, state.currentSeason, state.currentWeek);
  const activeRumors = getActiveRumors(state.rumors);

  return generateWeeklyDigest(
    newsThisWeek,
    activeRumors,
    state.currentSeason,
    state.currentWeek,
    state.digestConfig
  );
}

/**
 * Marks a digest as viewed
 */
export function markDigestAsViewed(state: NewsFeedState, digestId: string): NewsFeedState {
  const digests = state.digests.map((digest) =>
    digest.id === digestId ? markDigestViewed(digest) : digest
  );
  return { ...state, digests };
}

// ============================================================================
// NEWS GENERATION HELPERS
// ============================================================================

/**
 * Generates and adds injury news
 */
export function generateAndAddInjuryNews(
  state: NewsFeedState,
  context: InjuryNewsContext,
  isReturn: boolean = false
): NewsFeedState {
  const news = isReturn
    ? generateInjuryReturnNews(context, state.currentSeason, state.currentWeek)
    : generateInjuryNews(context, state.currentSeason, state.currentWeek);

  if (news) {
    return addNewsItem(state, news);
  }
  return state;
}

/**
 * Generates and adds trade news
 */
export function generateAndAddTradeNews(
  state: NewsFeedState,
  context: TradeNewsContext
): NewsFeedState {
  const news = generateTradeNews(context, state.currentSeason, state.currentWeek);
  if (news) {
    return addNewsItem(state, news);
  }
  return state;
}

/**
 * Generates and adds signing news
 */
export function generateAndAddSigningNews(
  state: NewsFeedState,
  context: SigningNewsContext
): NewsFeedState {
  const news = generateSigningNews(context, state.currentSeason, state.currentWeek);
  if (news) {
    return addNewsItem(state, news);
  }
  return state;
}

/**
 * Generates and adds performance news
 */
export function generateAndAddPerformanceNews(
  state: NewsFeedState,
  context: PerformanceNewsContext
): NewsFeedState {
  const news = generatePerformanceNews(context, state.currentSeason, state.currentWeek);
  if (news) {
    return addNewsItem(state, news);
  }
  return state;
}

/**
 * Generates and adds milestone news
 */
export function generateAndAddMilestoneNews(
  state: NewsFeedState,
  context: MilestoneNewsContext
): NewsFeedState {
  const news = generateMilestoneNews(context, state.currentSeason, state.currentWeek);
  if (news) {
    return addNewsItem(state, news);
  }
  return state;
}

/**
 * Generates and adds draft news
 */
export function generateAndAddDraftNews(
  state: NewsFeedState,
  context: DraftNewsContext
): NewsFeedState {
  const news = generateDraftNews(context, state.currentSeason, state.currentWeek);
  if (news) {
    return addNewsItem(state, news);
  }
  return state;
}

/**
 * Generates and adds coaching news
 */
export function generateAndAddCoachingNews(
  state: NewsFeedState,
  context: CoachingNewsContext
): NewsFeedState {
  const news = generateCoachingNews(context, state.currentSeason, state.currentWeek);
  if (news) {
    return addNewsItem(state, news);
  }
  return state;
}

/**
 * Generates and adds league news
 */
export function generateAndAddLeagueNews(
  state: NewsFeedState,
  context: LeagueNewsContext
): NewsFeedState {
  const news = generateLeagueNews(context, state.currentSeason, state.currentWeek);
  if (news) {
    return addNewsItem(state, news);
  }
  return state;
}

/**
 * Generates and adds playoff clinch news
 */
export function generateAndAddPlayoffClinchNews(
  state: NewsFeedState,
  context: LeagueNewsContext
): NewsFeedState {
  const news = generatePlayoffClinchNews(context, state.currentSeason, state.currentWeek);
  if (news) {
    return addNewsItem(state, news);
  }
  return state;
}

/**
 * Generates and adds a rumor
 */
export function generateAndAddRumor(
  state: NewsFeedState,
  type: RumorType,
  context: StoryContext
): NewsFeedState {
  const rumor = generateRumor(
    type,
    context,
    state.currentSeason,
    state.currentWeek,
    state.rumorConfig
  );
  return addRumor(state, rumor);
}

/**
 * Generates and adds a random rumor
 */
export function generateAndAddRandomRumor(
  state: NewsFeedState,
  context: StoryContext
): NewsFeedState {
  const rumor = generateRandomRumor(
    context,
    state.currentSeason,
    state.currentWeek,
    state.rumorConfig
  );
  return addRumor(state, rumor);
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Gets all news items sorted by priority and time
 */
export function getAllNews(state: NewsFeedState): NewsItem[] {
  return sortNewsByPriorityAndTime(state.newsItems);
}

/**
 * Gets unread news items
 */
export function getUnreadNewsItems(state: NewsFeedState): NewsItem[] {
  return sortNewsByPriorityAndTime(getUnreadNews(state.newsItems));
}

/**
 * Gets news by category
 */
export function getNewsByCategory(state: NewsFeedState, category: NewsFeedCategory): NewsItem[] {
  return sortNewsByPriorityAndTime(filterByCategory(state.newsItems, category));
}

/**
 * Gets news for a team
 */
export function getNewsForTeam(state: NewsFeedState, teamId: string): NewsItem[] {
  return sortNewsByPriorityAndTime(filterByTeam(state.newsItems, teamId));
}

/**
 * Gets news for a player
 */
export function getNewsForPlayer(state: NewsFeedState, playerId: string): NewsItem[] {
  return sortNewsByPriorityAndTime(filterByPlayer(state.newsItems, playerId));
}

/**
 * Gets news from the current week
 */
export function getCurrentWeekNews(state: NewsFeedState): NewsItem[] {
  return sortNewsByPriorityAndTime(
    getNewsFromWeek(state.newsItems, state.currentSeason, state.currentWeek)
  );
}

/**
 * Gets all active rumors
 */
export function getAllActiveRumors(state: NewsFeedState): Rumor[] {
  return sortRumors(getActiveRumors(state.rumors));
}

/**
 * Gets rumors by type
 */
export function getRumorsByTypeFromState(state: NewsFeedState, type: RumorType): Rumor[] {
  return sortRumors(getRumorsByType(state.rumors, type));
}

/**
 * Gets rumors for a player
 */
export function getRumorsForPlayerFromState(state: NewsFeedState, playerId: string): Rumor[] {
  return sortRumors(getRumorsForPlayer(state.rumors, playerId));
}

/**
 * Gets rumors for a team
 */
export function getRumorsForTeamFromState(state: NewsFeedState, teamId: string): Rumor[] {
  return sortRumors(getRumorsForTeam(state.rumors, teamId));
}

/**
 * Gets the latest weekly digest
 */
export function getLatestWeeklyDigest(state: NewsFeedState): WeeklyDigest | null {
  return getLatestDigest(state.digests);
}

/**
 * Gets all digests for a season
 */
export function getSeasonDigests(state: NewsFeedState, season: number): WeeklyDigest[] {
  return getDigestsForSeason(state.digests, season);
}

/**
 * Gets the total unread count
 */
export function getUnreadCount(state: NewsFeedState): number {
  return state.newsItems.filter((n) => !n.isRead).length;
}

/**
 * Gets breaking news (highest priority)
 */
export function getBreakingNews(state: NewsFeedState): NewsItem[] {
  return sortNewsByPriorityAndTime(state.newsItems.filter((n) => n.priority === 'breaking'));
}

/**
 * Gets news that reveals trait hints
 */
export function getTraitHintingNews(state: NewsFeedState): NewsItem[] {
  return sortNewsByPriorityAndTime(state.newsItems.filter((n) => n.revealsTraitHint));
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validates the news feed state
 */
export function validateNewsFeedState(state: NewsFeedState): boolean {
  // Validate basic structure
  if (typeof state.currentSeason !== 'number') return false;
  if (typeof state.currentWeek !== 'number') return false;
  if (!Array.isArray(state.newsItems)) return false;
  if (!Array.isArray(state.rumors)) return false;
  if (!Array.isArray(state.digests)) return false;

  // Validate all news items
  for (const item of state.newsItems) {
    if (!validateNewsItem(item)) return false;
  }

  // Validate all rumors
  for (const rumor of state.rumors) {
    if (!validateRumor(rumor)) return false;
  }

  // Validate all digests
  for (const digest of state.digests) {
    if (!validateWeeklyDigest(digest)) return false;
  }

  return true;
}

/**
 * Gets statistics about the news feed
 */
export function getNewsFeedStats(state: NewsFeedState): {
  totalNews: number;
  unreadNews: number;
  totalRumors: number;
  activeRumors: number;
  totalDigests: number;
  newsByCategory: Partial<Record<NewsFeedCategory, number>>;
} {
  const newsByCategory: Partial<Record<NewsFeedCategory, number>> = {};
  for (const item of state.newsItems) {
    newsByCategory[item.category] = (newsByCategory[item.category] || 0) + 1;
  }

  return {
    totalNews: state.newsItems.length,
    unreadNews: state.newsItems.filter((n) => !n.isRead).length,
    totalRumors: state.rumors.length,
    activeRumors: getActiveRumors(state.rumors).length,
    totalDigests: state.digests.length,
    newsByCategory,
  };
}
