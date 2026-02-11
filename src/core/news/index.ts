/**
 * News Feed & Narrative System
 *
 * This module provides an immersive news feed with headlines, trade rumors,
 * milestones, and narrative events. Key features:
 *
 * - News categories: injury, trade, signing, performance, milestone, draft, coaching, league
 * - Rumor Mill: generates realistic rumors (some true, some false)
 * - Template-based story generation with rich, varied content
 * - Weekly digest system for catching up on important news
 * - Integration with trait revelation system for subtle character hints
 *
 * Key Principles:
 * - News reveals traits subtly through narrative, never as direct labels
 * - Some rumors are intentionally false to create realistic uncertainty
 * - Digests provide curated summaries for busy players
 */

// Story Templates - Template-based generation
export {
  NewsFeedCategory,
  StoryPriority,
  StoryTemplate,
  StoryContext,
  INJURY_TEMPLATES,
  TRADE_TEMPLATES,
  SIGNING_TEMPLATES,
  PERFORMANCE_TEMPLATES,
  MILESTONE_TEMPLATES,
  DRAFT_TEMPLATES,
  COACHING_TEMPLATES,
  LEAGUE_TEMPLATES,
  STREAK_TEMPLATES,
  RIVALRY_TEMPLATES,
  CONTRACT_YEAR_TEMPLATES,
  AI_TEAM_STORYLINE_TEMPLATES,
  TRADE_DEADLINE_TEMPLATES,
  TEMPLATES_BY_CATEGORY,
  replacePlaceholders,
  getRandomTemplate,
  getTemplatesBySentiment,
  getTemplatesByPriority,
  generateStoryFromTemplate,
  validateTemplateContext,
} from './StoryTemplates';

// News Generators - Category-specific generation
export {
  NewsItem,
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
  generateTradeSpeculationNews,
  generateSigningNews,
  generatePerformanceNews,
  generateMilestoneNews,
  generateDraftNews,
  generateCoachingNews,
  generateLeagueNews,
  generatePlayoffClinchNews,
  generateStreakNews,
  generateRivalryNews,
  generateContractYearNews,
  generateAITeamStoryline,
  generateTradeDeadlineNews,
  validateNewsItem,
  markAsRead,
  getUnreadNews,
  getTraitRevealingNews,
  sortNewsByPriorityAndTime,
  filterByCategory,
  filterByTeam,
  filterByPlayer,
  getNewsFromWeek,
} from './NewsGenerators';

// Rumor Mill - True/false rumor generation
export {
  RumorType,
  RumorSourceConfidence,
  Rumor,
  RumorConfig,
  DEFAULT_RUMOR_CONFIG,
  generateRumor,
  generateRandomRumor,
  isRumorExpired,
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

// Weekly Digest - News summaries
export {
  WeeklyDigest,
  DigestConfig,
  DEFAULT_DIGEST_CONFIG,
  generateWeeklyDigest,
  markDigestViewed,
  shouldRegenerateDigest,
  getDigestPreview,
  validateWeeklyDigest,
  areDigestsEqual,
  getDigestsForSeason,
  getLatestDigest,
  generateMidSeasonNarratives,
  NarrativeTeamInfo,
  NarrativeGameInfo,
  NarrativeContractPlayerInfo,
} from './WeeklyDigest';

// News Feed Manager - Central state management
export {
  NewsFeedState,
  createNewsFeedState,
  advanceNewsFeedWeek,
  advanceNewsFeedSeason,
  addNewsItem,
  addNewsItems,
  markNewsAsRead,
  markAllNewsAsRead,
  removeNewsItem,
  addRumor,
  resolveRumorInState,
  cleanupExpiredRumors,
  generateCurrentWeekDigest,
  markDigestAsViewed,
  generateAndAddInjuryNews,
  generateAndAddTradeNews,
  generateAndAddSigningNews,
  generateAndAddPerformanceNews,
  generateAndAddMilestoneNews,
  generateAndAddDraftNews,
  generateAndAddCoachingNews,
  generateAndAddLeagueNews,
  generateAndAddPlayoffClinchNews,
  generateAndAddRumor,
  generateAndAddRandomRumor,
  getAllNews,
  getUnreadNewsItems,
  getNewsByCategory,
  getNewsForTeam,
  getNewsForPlayer,
  getCurrentWeekNews,
  getAllActiveRumors,
  getRumorsByTypeFromState,
  getRumorsForPlayerFromState,
  getRumorsForTeamFromState,
  getLatestWeeklyDigest,
  getSeasonDigests,
  getUnreadCount,
  getBreakingNews,
  getTraitHintingNews,
  validateNewsFeedState,
  getNewsFeedStats,
} from './NewsFeedManager';
