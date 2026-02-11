/**
 * Weekly Digest - Summarizes important news from the week.
 *
 * Provides a curated summary of the most important news events
 * to help players catch up on what they might have missed.
 */

import { generateUUID, randomElement } from '../generators/utils/RandomUtils';
import {
  NewsItem,
  sortNewsByPriorityAndTime,
  generateStreakNews,
  generateRivalryNews,
  generateContractYearNews,
  generateAITeamStoryline,
  generateTradeDeadlineNews,
} from './NewsGenerators';
import { Rumor, sortRumors } from './RumorMill';
import { NewsFeedCategory, StoryPriority } from './StoryTemplates';

/**
 * A weekly digest summary
 */
export interface WeeklyDigest {
  /** Unique identifier */
  id: string;
  /** Season number */
  season: number;
  /** Week number */
  week: number;
  /** Generated headline for the digest */
  headline: string;
  /** Summary text */
  summary: string;
  /** Top stories of the week */
  topStories: NewsItem[];
  /** Active rumors */
  activeRumors: Rumor[];
  /** News that reveals trait hints */
  traitHintingNews: NewsItem[];
  /** Total news count for the week */
  totalNewsCount: number;
  /** Unread news count */
  unreadCount: number;
  /** Categories with news this week */
  categoriesWithNews: NewsFeedCategory[];
  /** When the digest was generated */
  timestamp: number;
  /** Whether the digest has been viewed */
  isViewed: boolean;
}

/**
 * Configuration for digest generation
 */
export interface DigestConfig {
  /** Maximum number of top stories to include */
  maxTopStories: number;
  /** Maximum number of rumors to include */
  maxRumors: number;
  /** Minimum priority for top stories */
  minPriorityForTop: StoryPriority;
}

/**
 * Default digest configuration
 */
export const DEFAULT_DIGEST_CONFIG: DigestConfig = {
  maxTopStories: 5,
  maxRumors: 3,
  minPriorityForTop: 'medium',
};

// ============================================================================
// DIGEST HEADLINE TEMPLATES
// ============================================================================

const DIGEST_HEADLINES: Record<string, string[]> = {
  eventful: [
    'A Wild Week in the League',
    'Major Moves Shake Up the League',
    'This Week Was Anything But Quiet',
    'Busy Week Around the League',
  ],
  quiet: [
    'A Quiet Week in the League',
    'All Eyes on the Games',
    'Steady as She Goes',
    'Not Much Drama This Week',
  ],
  injury_heavy: [
    'Injury Bug Hits the League',
    'Trainers Working Overtime',
    'A Tough Week for Player Health',
    'Multiple Stars Go Down',
  ],
  trade_heavy: [
    'Trade Season in Full Swing',
    'GMs Have Been Busy',
    'The Phones Are Ringing',
    'Roster Shakeups Galore',
  ],
  performance_heavy: [
    'Star Performances Light Up the Week',
    'Players Making Their Mark',
    'Standout Performances Abound',
    'The Stars Came Out to Play',
  ],
};

// ============================================================================
// DIGEST SUMMARY TEMPLATES
// ============================================================================

const SUMMARY_TEMPLATES = {
  intro: [
    "Here's what you need to know from Week {week}:",
    'Catch up on the biggest stories from Week {week}:',
    "Week {week} had it all. Here's the rundown:",
    "Don't miss these stories from Week {week}:",
  ],
  injury_summary: [
    '{count} players hit the injury report this week.',
    'The injury bug struck {count} players.',
    '{count} notable injuries were reported.',
  ],
  trade_summary: [
    '{count} trades went down this week.',
    'Front offices made {count} deals.',
    '{count} players found new homes.',
  ],
  performance_summary: [
    '{count} players had standout performances.',
    '{count} players made headlines with their play.',
    'We saw {count} noteworthy individual performances.',
  ],
  rumor_summary: [
    'Plus, {count} rumors are swirling around the league.',
    '{count} rumors worth keeping an eye on.',
    'The rumor mill is churning with {count} stories.',
  ],
};

// ============================================================================
// DIGEST GENERATION FUNCTIONS
// ============================================================================

/**
 * Generates a unique digest ID
 */
function generateDigestId(): string {
  return `digest_${generateUUID()}`;
}

/**
 * Determines the type of week based on news content
 */
function determineWeekType(news: NewsItem[]): keyof typeof DIGEST_HEADLINES {
  const categoryCounts: Partial<Record<NewsFeedCategory, number>> = {};

  for (const item of news) {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
  }

  const injuryCount = categoryCounts.injury || 0;
  const tradeCount = categoryCounts.trade || 0;
  const performanceCount = categoryCounts.performance || 0;
  const totalCount = news.length;

  // Check for dominant categories
  if (injuryCount >= 3 && injuryCount > tradeCount && injuryCount > performanceCount) {
    return 'injury_heavy';
  }
  if (tradeCount >= 2 && tradeCount > injuryCount && tradeCount > performanceCount) {
    return 'trade_heavy';
  }
  if (performanceCount >= 3 && performanceCount > injuryCount && performanceCount > tradeCount) {
    return 'performance_heavy';
  }
  if (totalCount >= 5) {
    return 'eventful';
  }

  return 'quiet';
}

/**
 * Generates a summary text for the digest
 */
function generateSummaryText(news: NewsItem[], rumors: Rumor[], week: number): string {
  const parts: string[] = [];

  // Intro
  const intro = randomElement(SUMMARY_TEMPLATES.intro).replace('{week}', String(week));
  parts.push(intro);

  // Count by category
  const categoryCounts: Partial<Record<NewsFeedCategory, number>> = {};
  for (const item of news) {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
  }

  // Add category-specific summaries
  if (categoryCounts.injury && categoryCounts.injury > 0) {
    const template = randomElement(SUMMARY_TEMPLATES.injury_summary);
    parts.push(template.replace('{count}', String(categoryCounts.injury)));
  }

  if (categoryCounts.trade && categoryCounts.trade > 0) {
    const template = randomElement(SUMMARY_TEMPLATES.trade_summary);
    parts.push(template.replace('{count}', String(categoryCounts.trade)));
  }

  if (categoryCounts.performance && categoryCounts.performance > 0) {
    const template = randomElement(SUMMARY_TEMPLATES.performance_summary);
    parts.push(template.replace('{count}', String(categoryCounts.performance)));
  }

  // Add rumor summary if there are rumors
  if (rumors.length > 0) {
    const template = randomElement(SUMMARY_TEMPLATES.rumor_summary);
    parts.push(template.replace('{count}', String(rumors.length)));
  }

  return parts.join(' ');
}

/**
 * Gets unique categories present in news items
 */
function getUniqueCategories(news: NewsItem[]): NewsFeedCategory[] {
  const categories = new Set<NewsFeedCategory>();
  for (const item of news) {
    categories.add(item.category);
  }
  return Array.from(categories);
}

/**
 * Filters news to only include items meeting minimum priority
 */
function filterByMinPriority(news: NewsItem[], minPriority: StoryPriority): NewsItem[] {
  const priorityOrder: Record<StoryPriority, number> = {
    breaking: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  const minPriorityValue = priorityOrder[minPriority];
  return news.filter((item) => priorityOrder[item.priority] <= minPriorityValue);
}

/**
 * Generates a weekly digest from news and rumors
 */
export function generateWeeklyDigest(
  news: NewsItem[],
  rumors: Rumor[],
  season: number,
  week: number,
  config: DigestConfig = DEFAULT_DIGEST_CONFIG
): WeeklyDigest {
  // Sort news by priority and time
  const sortedNews = sortNewsByPriorityAndTime(news);
  const sortedRumors = sortRumors(rumors);

  // Filter to top stories
  const topNews = filterByMinPriority(sortedNews, config.minPriorityForTop);
  const topStories = topNews.slice(0, config.maxTopStories);
  const activeRumors = sortedRumors.slice(0, config.maxRumors);

  // Get trait-hinting news
  const traitHintingNews = news.filter((n) => n.revealsTraitHint);

  // Determine week type and generate headline
  const weekType = determineWeekType(news);
  const headline = randomElement(DIGEST_HEADLINES[weekType]);

  // Generate summary
  const summary = generateSummaryText(news, rumors, week);

  // Count unread
  const unreadCount = news.filter((n) => !n.isRead).length;

  return {
    id: generateDigestId(),
    season,
    week,
    headline,
    summary,
    topStories,
    activeRumors,
    traitHintingNews,
    totalNewsCount: news.length,
    unreadCount,
    categoriesWithNews: getUniqueCategories(news),
    timestamp: Date.now(),
    isViewed: false,
  };
}

/**
 * Marks a digest as viewed
 */
export function markDigestViewed(digest: WeeklyDigest): WeeklyDigest {
  return { ...digest, isViewed: true };
}

/**
 * Checks if a digest should be regenerated (news changed significantly)
 */
export function shouldRegenerateDigest(
  existingDigest: WeeklyDigest,
  currentNews: NewsItem[]
): boolean {
  // Regenerate if news count changed significantly
  const newsDiff = Math.abs(existingDigest.totalNewsCount - currentNews.length);
  if (newsDiff >= 3) return true;

  // Regenerate if there's new breaking news
  const breakingNews = currentNews.filter(
    (n) => n.priority === 'breaking' && n.timestamp > existingDigest.timestamp
  );
  if (breakingNews.length > 0) return true;

  return false;
}

/**
 * Gets a short preview of the digest
 */
export function getDigestPreview(digest: WeeklyDigest): string {
  if (digest.totalNewsCount === 0) {
    return 'No major news this week.';
  }

  const parts: string[] = [digest.headline];

  if (digest.unreadCount > 0) {
    parts.push(`${digest.unreadCount} unread item${digest.unreadCount === 1 ? '' : 's'}.`);
  }

  if (digest.activeRumors.length > 0) {
    parts.push(
      `${digest.activeRumors.length} active rumor${digest.activeRumors.length === 1 ? '' : 's'}.`
    );
  }

  return parts.join(' ');
}

/**
 * Validates a weekly digest
 */
export function validateWeeklyDigest(digest: WeeklyDigest): boolean {
  if (!digest.id || typeof digest.id !== 'string') return false;
  if (typeof digest.season !== 'number') return false;
  if (typeof digest.week !== 'number') return false;
  if (!digest.headline || typeof digest.headline !== 'string') return false;
  if (!digest.summary || typeof digest.summary !== 'string') return false;
  if (!Array.isArray(digest.topStories)) return false;
  if (!Array.isArray(digest.activeRumors)) return false;
  if (!Array.isArray(digest.traitHintingNews)) return false;
  if (typeof digest.totalNewsCount !== 'number') return false;
  if (typeof digest.unreadCount !== 'number') return false;
  if (!Array.isArray(digest.categoriesWithNews)) return false;
  if (typeof digest.timestamp !== 'number') return false;
  if (typeof digest.isViewed !== 'boolean') return false;

  return true;
}

/**
 * Compares two digests for the same week
 */
export function areDigestsEqual(a: WeeklyDigest, b: WeeklyDigest): boolean {
  return (
    a.season === b.season &&
    a.week === b.week &&
    a.totalNewsCount === b.totalNewsCount &&
    a.topStories.length === b.topStories.length
  );
}

/**
 * Gets digests for a season
 */
export function getDigestsForSeason(digests: WeeklyDigest[], season: number): WeeklyDigest[] {
  return digests.filter((d) => d.season === season).sort((a, b) => a.week - b.week);
}

/**
 * Gets the latest digest
 */
export function getLatestDigest(digests: WeeklyDigest[]): WeeklyDigest | null {
  if (digests.length === 0) return null;

  return digests.reduce((latest, current) => {
    if (current.season > latest.season) return current;
    if (current.season === latest.season && current.week > latest.week) return current;
    return latest;
  });
}

// ============================================================================
// MID-SEASON NARRATIVE GENERATION
// ============================================================================

/** Minimal team info needed for narrative generation */
export interface NarrativeTeamInfo {
  teamId: string;
  teamName: string;
  conference: string;
  division: string;
  wins: number;
  losses: number;
  /** Positive = win streak, negative = loss streak */
  currentStreak: number;
}

/** Upcoming game info for rivalry detection */
export interface NarrativeGameInfo {
  homeTeamId: string;
  awayTeamId: string;
  isDivisional: boolean;
}

/** Contract year player info */
export interface NarrativeContractPlayerInfo {
  playerName: string;
  teamName: string;
  performance: 'strong' | 'struggling';
}

/** Trade deadline week constant */
const TRADE_DEADLINE_WEEK = 9;

/**
 * Generates mid-season narrative news items for the "living world" feel.
 *
 * Call this each week with data about all 32 teams. It returns a batch of
 * NewsItems covering streaks, AI team storylines, division rivalries,
 * contract year drama, and trade deadline buzz.
 *
 * The function limits output to avoid flooding the news feed.
 */
export function generateMidSeasonNarratives(
  allTeams: NarrativeTeamInfo[],
  userTeamId: string,
  season: number,
  week: number,
  upcomingGames: NarrativeGameInfo[],
  contractYearPlayers: NarrativeContractPlayerInfo[]
): NewsItem[] {
  const news: NewsItem[] = [];

  // --- Streak detection (limit to 2-3) ---
  const streakTeams = allTeams.filter(
    (t) => Math.abs(t.currentStreak) >= 3 && t.teamId !== userTeamId
  );
  // Sort by streak magnitude descending to pick the most notable
  const sortedStreakTeams = [...streakTeams].sort(
    (a, b) => Math.abs(b.currentStreak) - Math.abs(a.currentStreak)
  );
  const streakLimit = Math.min(sortedStreakTeams.length, 3);
  for (let i = 0; i < streakLimit; i++) {
    const team = sortedStreakTeams[i];
    const streakType = team.currentStreak > 0 ? 'winning' : 'losing';
    news.push(
      generateStreakNews(
        team.teamName,
        team.teamId,
        streakType,
        Math.abs(team.currentStreak),
        season,
        week
      )
    );
  }

  // --- AI team storylines (1-2 per week) ---
  // Find teams performing significantly above or below .500
  const aiTeams = allTeams.filter((t) => {
    if (t.teamId === userTeamId) return false;
    const totalGames = t.wins + t.losses;
    if (totalGames < 3) return false; // Too early to tell
    const winPct = t.wins / totalGames;
    return winPct >= 0.7 || winPct <= 0.3;
  });

  const shuffledAiTeams = [...aiTeams].sort(() => Math.random() - 0.5);
  const storylineLimit = Math.min(shuffledAiTeams.length, 2);
  for (let i = 0; i < storylineLimit; i++) {
    const team = shuffledAiTeams[i];
    const totalGames = team.wins + team.losses;
    const winPct = team.wins / totalGames;
    const record = `${team.wins}-${team.losses}`;

    let narrativeType: 'surprise_contender' | 'disappointing' | 'rebuilding' | 'rising';
    if (winPct >= 0.7) {
      narrativeType = Math.random() > 0.5 ? 'surprise_contender' : 'rising';
    } else {
      narrativeType = Math.random() > 0.5 ? 'disappointing' : 'rebuilding';
    }

    news.push(
      generateAITeamStoryline(team.teamName, team.teamId, record, narrativeType, season, week)
    );
  }

  // --- Rivalry previews (1-2 division matchups from upcoming schedule) ---
  const divisionalGames = upcomingGames.filter((g) => g.isDivisional);
  const shuffledDivisional = [...divisionalGames].sort(() => Math.random() - 0.5);
  const rivalryLimit = Math.min(shuffledDivisional.length, 2);
  for (let i = 0; i < rivalryLimit; i++) {
    const game = shuffledDivisional[i];
    const homeTeam = allTeams.find((t) => t.teamId === game.homeTeamId);
    const awayTeam = allTeams.find((t) => t.teamId === game.awayTeamId);
    if (homeTeam && awayTeam) {
      const divisionName = `${homeTeam.conference} ${homeTeam.division}`;
      news.push(
        generateRivalryNews(homeTeam.teamName, awayTeam.teamName, divisionName, season, week)
      );
    }
  }

  // --- Contract year drama (1 per week) ---
  if (contractYearPlayers.length > 0) {
    const player = randomElement(contractYearPlayers);
    news.push(
      generateContractYearNews(player.playerName, player.teamName, player.performance, season, week)
    );
  }

  // --- Trade deadline buzz (weeks 7-9) ---
  if (week >= 7 && week <= TRADE_DEADLINE_WEEK) {
    news.push(generateTradeDeadlineNews(week, TRADE_DEADLINE_WEEK, season));
  }

  return news;
}
