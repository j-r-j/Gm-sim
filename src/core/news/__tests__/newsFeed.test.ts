/**
 * Tests for the News Feed & Narrative System
 */

import {
  // Story Templates
  StoryContext,
  INJURY_TEMPLATES,
  TRADE_TEMPLATES,
  SIGNING_TEMPLATES,
  PERFORMANCE_TEMPLATES,
  MILESTONE_TEMPLATES,
  DRAFT_TEMPLATES,
  COACHING_TEMPLATES,
  LEAGUE_TEMPLATES,
  TEMPLATES_BY_CATEGORY,
  replacePlaceholders,
  getRandomTemplate,
  getTemplatesBySentiment,
  generateStoryFromTemplate,
  validateTemplateContext,
} from '../StoryTemplates';

import {
  // News Generators
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
  generateSigningNews,
  generatePerformanceNews,
  generateMilestoneNews,
  generateDraftNews,
  generateCoachingNews,
  generateLeagueNews,
  validateNewsItem,
  markAsRead,
  getUnreadNews,
  sortNewsByPriorityAndTime,
  filterByCategory,
  filterByTeam,
  filterByPlayer,
  getNewsFromWeek,
} from '../NewsGenerators';

import {
  // Rumor Mill
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
} from '../RumorMill';

import {
  // Weekly Digest
  generateWeeklyDigest,
  markDigestViewed,
  shouldRegenerateDigest,
  getDigestPreview,
  validateWeeklyDigest,
  getDigestsForSeason,
  getLatestDigest,
} from '../WeeklyDigest';

import {
  // News Feed Manager
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
  generateAndAddRumor,
  getAllNews,
  getUnreadNewsItems,
  getNewsByCategory,
  getNewsForTeam,
  getNewsForPlayer,
  getCurrentWeekNews,
  getAllActiveRumors,
  getUnreadCount,
  getBreakingNews,
  getTraitHintingNews,
  validateNewsFeedState,
  getNewsFeedStats,
} from '../NewsFeedManager';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createTestInjuryContext(): InjuryNewsContext {
  return {
    playerName: 'John Smith',
    playerPosition: 'QB',
    teamName: 'Test City Tigers',
    injuryType: 'knee sprain',
    weeksOut: 4,
    playerId: 'player-001',
    teamId: 'team-001',
  };
}

function createTestTradeContext(): TradeNewsContext {
  return {
    playerName: 'Mike Johnson',
    playerPosition: 'WR',
    oldTeam: 'Old City Hawks',
    newTeam: 'New Town Eagles',
    experience: 5,
    playerId: 'player-002',
    newTeamId: 'team-002',
    oldTeamId: 'team-001',
  };
}

function createTestSigningContext(): SigningNewsContext {
  return {
    playerName: 'Chris Davis',
    playerPosition: 'RB',
    teamName: 'Test City Tigers',
    contractYears: 3,
    contractValue: 45,
    age: 27,
    playerId: 'player-003',
    teamId: 'team-001',
    isExtension: true,
  };
}

function createTestPerformanceContext(): PerformanceNewsContext {
  return {
    playerName: 'Tom Brady',
    playerPosition: 'QB',
    teamName: 'Test City Tigers',
    opponentName: 'Rival Town Ravens',
    gameScore: '35-21',
    yards: 380,
    touchdowns: 4,
    interceptions: 0,
    completions: 28,
    attempts: 35,
    playerId: 'player-004',
    teamId: 'team-001',
    isPositivePerformance: true,
  };
}

function createTestMilestoneContext(): MilestoneNewsContext {
  return {
    playerName: 'Jerry Rice',
    playerPosition: 'WR',
    teamName: 'Test City Tigers',
    opponentName: 'Rival Town Ravens',
    careerYards: 15000,
    playerId: 'player-005',
    teamId: 'team-001',
  };
}

function createTestDraftContext(): DraftNewsContext {
  return {
    playerName: 'Rookie Star',
    playerPosition: 'DE',
    teamName: 'Test City Tigers',
    draftRound: 1,
    draftPick: 5,
    playerId: 'player-006',
    teamId: 'team-001',
  };
}

function createTestCoachingContext(): CoachingNewsContext {
  return {
    teamName: 'Test City Tigers',
    coachName: 'Bill Belichick',
    teamId: 'team-001',
    isFiring: false,
  };
}

function createTestLeagueContext(): LeagueNewsContext {
  return {
    teamName: 'Test City Tigers',
    opponentName: 'Rival Town Ravens',
    gameScore: '28-24',
    winStreak: 5,
    teamId: 'team-001',
  };
}

function createTestNewsItem(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: `news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    category: 'performance',
    headline: 'Test Headline',
    body: 'Test body content.',
    priority: 'medium',
    isPositive: true,
    timestamp: Date.now(),
    season: 2024,
    week: 10,
    playerId: 'player-001',
    teamId: 'team-001',
    isRead: false,
    revealsTraitHint: false,
    ...overrides,
  };
}

function createTestRumor(overrides: Partial<Rumor> = {}): Rumor {
  return {
    id: `rumor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'trade_interest',
    headline: 'Test Rumor Headline',
    body: 'Test rumor body.',
    isTrue: true,
    sourceConfidence: 'moderate',
    timestamp: Date.now(),
    season: 2024,
    week: 10,
    playerId: 'player-001',
    teamId: 'team-001',
    priority: 'medium',
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    isResolved: false,
    ...overrides,
  };
}

// ============================================================================
// STORY TEMPLATES TESTS
// ============================================================================

describe('StoryTemplates', () => {
  describe('Template Collections', () => {
    it('should have injury templates', () => {
      expect(INJURY_TEMPLATES.length).toBeGreaterThan(0);
      INJURY_TEMPLATES.forEach((template) => {
        expect(template.category).toBe('injury');
        expect(template.headlines.length).toBeGreaterThan(0);
        expect(template.bodies.length).toBeGreaterThan(0);
      });
    });

    it('should have trade templates', () => {
      expect(TRADE_TEMPLATES.length).toBeGreaterThan(0);
      TRADE_TEMPLATES.forEach((template) => {
        expect(template.category).toBe('trade');
      });
    });

    it('should have signing templates', () => {
      expect(SIGNING_TEMPLATES.length).toBeGreaterThan(0);
      SIGNING_TEMPLATES.forEach((template) => {
        expect(template.category).toBe('signing');
      });
    });

    it('should have performance templates', () => {
      expect(PERFORMANCE_TEMPLATES.length).toBeGreaterThan(0);
      PERFORMANCE_TEMPLATES.forEach((template) => {
        expect(template.category).toBe('performance');
      });
    });

    it('should have milestone templates', () => {
      expect(MILESTONE_TEMPLATES.length).toBeGreaterThan(0);
      MILESTONE_TEMPLATES.forEach((template) => {
        expect(template.category).toBe('milestone');
      });
    });

    it('should have draft templates', () => {
      expect(DRAFT_TEMPLATES.length).toBeGreaterThan(0);
      DRAFT_TEMPLATES.forEach((template) => {
        expect(template.category).toBe('draft');
      });
    });

    it('should have coaching templates', () => {
      expect(COACHING_TEMPLATES.length).toBeGreaterThan(0);
      COACHING_TEMPLATES.forEach((template) => {
        expect(template.category).toBe('coaching');
      });
    });

    it('should have league templates', () => {
      expect(LEAGUE_TEMPLATES.length).toBeGreaterThan(0);
      LEAGUE_TEMPLATES.forEach((template) => {
        expect(template.category).toBe('league');
      });
    });

    it('should organize templates by category', () => {
      expect(TEMPLATES_BY_CATEGORY.injury.length).toBeGreaterThan(0);
      expect(TEMPLATES_BY_CATEGORY.trade.length).toBeGreaterThan(0);
      expect(TEMPLATES_BY_CATEGORY.signing.length).toBeGreaterThan(0);
      expect(TEMPLATES_BY_CATEGORY.performance.length).toBeGreaterThan(0);
      expect(TEMPLATES_BY_CATEGORY.milestone.length).toBeGreaterThan(0);
    });
  });

  describe('replacePlaceholders', () => {
    it('should replace single placeholder', () => {
      const result = replacePlaceholders('{playerName} scored!', { playerName: 'John' });
      expect(result).toBe('John scored!');
    });

    it('should replace multiple placeholders', () => {
      const result = replacePlaceholders('{playerName} of {teamName}', {
        playerName: 'John',
        teamName: 'Tigers',
      });
      expect(result).toBe('John of Tigers');
    });

    it('should replace same placeholder multiple times', () => {
      const result = replacePlaceholders('{playerName} is great. {playerName} wins!', {
        playerName: 'John',
      });
      expect(result).toBe('John is great. John wins!');
    });

    it('should leave unreplaced placeholders', () => {
      const result = replacePlaceholders('{playerName} of {teamName}', {
        playerName: 'John',
      });
      expect(result).toContain('John');
      expect(result).toContain('{teamName}');
    });
  });

  describe('getRandomTemplate', () => {
    it('should return a template for valid category', () => {
      const template = getRandomTemplate('injury');
      expect(template).not.toBeNull();
      expect(template?.category).toBe('injury');
    });

    it('should return null for empty category', () => {
      const template = getRandomTemplate('rumor');
      expect(template).toBeNull();
    });
  });

  describe('getTemplatesBySentiment', () => {
    it('should filter positive templates', () => {
      const positiveTemplates = getTemplatesBySentiment('injury', true);
      positiveTemplates.forEach((t) => {
        expect(t.isPositive).toBe(true);
      });
    });

    it('should filter negative templates', () => {
      const negativeTemplates = getTemplatesBySentiment('injury', false);
      negativeTemplates.forEach((t) => {
        expect(t.isPositive).toBe(false);
      });
    });
  });

  describe('generateStoryFromTemplate', () => {
    it('should generate headline and body', () => {
      const template = INJURY_TEMPLATES[0];
      const context: StoryContext = {
        playerName: 'John Smith',
        teamName: 'Tigers',
        injuryType: 'knee',
        weeksOut: 4,
        playerPosition: 'QB',
      };
      const story = generateStoryFromTemplate(template, context);
      expect(story.headline).toBeDefined();
      expect(story.body).toBeDefined();
      expect(story.headline).not.toContain('{playerName}');
    });
  });

  describe('validateTemplateContext', () => {
    it('should return true when all placeholders have values', () => {
      const template = '{playerName} of {teamName}';
      const context: StoryContext = { playerName: 'John', teamName: 'Tigers' };
      expect(validateTemplateContext(template, context)).toBe(true);
    });

    it('should return false when placeholder is missing', () => {
      const template = '{playerName} of {teamName}';
      const context: StoryContext = { playerName: 'John' };
      expect(validateTemplateContext(template, context)).toBe(false);
    });
  });
});

// ============================================================================
// NEWS GENERATORS TESTS
// ============================================================================

describe('NewsGenerators', () => {
  describe('generateInjuryNews', () => {
    it('should generate valid injury news', () => {
      const context = createTestInjuryContext();
      const news = generateInjuryNews(context, 2024, 10);

      expect(news).not.toBeNull();
      if (news) {
        expect(news.category).toBe('injury');
        expect(news.playerId).toBe(context.playerId);
        expect(news.teamId).toBe(context.teamId);
        expect(news.headline).toContain(context.playerName);
        expect(validateNewsItem(news)).toBe(true);
      }
    });

    it('should hint at injury-prone trait for long injuries', () => {
      const context = { ...createTestInjuryContext(), weeksOut: 8 };
      const news = generateInjuryNews(context, 2024, 10);

      expect(news).not.toBeNull();
      if (news) {
        expect(news.revealsTraitHint).toBe(true);
        expect(news.hintedTrait).toBe('injuryProne');
      }
    });
  });

  describe('generateInjuryReturnNews', () => {
    it('should generate return news', () => {
      const context = createTestInjuryContext();
      const news = generateInjuryReturnNews(context, 2024, 10);

      expect(news).not.toBeNull();
      if (news) {
        expect(news.isPositive).toBe(true);
      }
    });

    it('should hint at ironMan trait for quick returns', () => {
      const context = { ...createTestInjuryContext(), weeksOut: 1 };
      const news = generateInjuryReturnNews(context, 2024, 10);

      expect(news).not.toBeNull();
      if (news) {
        expect(news.revealsTraitHint).toBe(true);
        expect(news.hintedTrait).toBe('ironMan');
      }
    });
  });

  describe('generateTradeNews', () => {
    it('should generate trade news', () => {
      const context = createTestTradeContext();
      const news = generateTradeNews(context, 2024, 10);

      expect(news).not.toBeNull();
      if (news) {
        expect(news.category).toBe('trade');
        expect(news.priority).toBe('breaking');
        expect(validateNewsItem(news)).toBe(true);
      }
    });
  });

  describe('generateSigningNews', () => {
    it('should generate signing news', () => {
      const context = createTestSigningContext();
      const news = generateSigningNews(context, 2024, 10);

      expect(news).not.toBeNull();
      if (news) {
        expect(news.category).toBe('signing');
        expect(validateNewsItem(news)).toBe(true);
      }
    });
  });

  describe('generatePerformanceNews', () => {
    it('should generate performance news', () => {
      const context = createTestPerformanceContext();
      const news = generatePerformanceNews(context, 2024, 10);

      expect(news).not.toBeNull();
      if (news) {
        expect(news.category).toBe('performance');
        expect(validateNewsItem(news)).toBe(true);
      }
    });

    it('should hint at clutch for big performances', () => {
      const context = { ...createTestPerformanceContext(), touchdowns: 5 };
      const news = generatePerformanceNews(context, 2024, 10);

      expect(news).not.toBeNull();
      if (news) {
        expect(news.revealsTraitHint).toBe(true);
        expect(news.hintedTrait).toBe('clutch');
      }
    });
  });

  describe('generateMilestoneNews', () => {
    it('should generate milestone news', () => {
      const context = createTestMilestoneContext();
      const news = generateMilestoneNews(context, 2024, 10);

      expect(news).not.toBeNull();
      if (news) {
        expect(news.category).toBe('milestone');
        expect(validateNewsItem(news)).toBe(true);
      }
    });

    it('should hint at ironMan for consecutive games milestones', () => {
      const context = { ...createTestMilestoneContext(), consecutiveGames: 64 };
      const news = generateMilestoneNews(context, 2024, 10);

      expect(news).not.toBeNull();
      if (news) {
        expect(news.revealsTraitHint).toBe(true);
        expect(news.hintedTrait).toBe('ironMan');
      }
    });
  });

  describe('generateDraftNews', () => {
    it('should generate draft news', () => {
      const context = createTestDraftContext();
      const news = generateDraftNews(context, 2024, 10);

      expect(news).not.toBeNull();
      if (news) {
        expect(news.category).toBe('draft');
        expect(validateNewsItem(news)).toBe(true);
      }
    });
  });

  describe('generateCoachingNews', () => {
    it('should generate coaching news', () => {
      const context = createTestCoachingContext();
      const news = generateCoachingNews(context, 2024, 10);

      expect(news).not.toBeNull();
      if (news) {
        expect(news.category).toBe('coaching');
        expect(validateNewsItem(news)).toBe(true);
      }
    });
  });

  describe('generateLeagueNews', () => {
    it('should generate league news', () => {
      const context = createTestLeagueContext();
      const news = generateLeagueNews(context, 2024, 10);

      expect(news).not.toBeNull();
      if (news) {
        expect(news.category).toBe('league');
        expect(validateNewsItem(news)).toBe(true);
      }
    });
  });

  describe('News Item Utilities', () => {
    it('should validate valid news item', () => {
      const news = createTestNewsItem();
      expect(validateNewsItem(news)).toBe(true);
    });

    it('should invalidate news item without id', () => {
      const news = createTestNewsItem({ id: '' });
      expect(validateNewsItem(news)).toBe(false);
    });

    it('should mark news as read', () => {
      const news = createTestNewsItem({ isRead: false });
      const readNews = markAsRead(news);
      expect(readNews.isRead).toBe(true);
    });

    it('should filter unread news', () => {
      const news = [
        createTestNewsItem({ id: 'n1', isRead: false }),
        createTestNewsItem({ id: 'n2', isRead: true }),
        createTestNewsItem({ id: 'n3', isRead: false }),
      ];
      const unread = getUnreadNews(news);
      expect(unread.length).toBe(2);
    });

    it('should sort by priority and time', () => {
      const news = [
        createTestNewsItem({ id: 'n1', priority: 'low', timestamp: 100 }),
        createTestNewsItem({ id: 'n2', priority: 'breaking', timestamp: 50 }),
        createTestNewsItem({ id: 'n3', priority: 'medium', timestamp: 200 }),
      ];
      const sorted = sortNewsByPriorityAndTime(news);
      expect(sorted[0].id).toBe('n2'); // breaking first
    });

    it('should filter by category', () => {
      const news = [
        createTestNewsItem({ id: 'n1', category: 'injury' }),
        createTestNewsItem({ id: 'n2', category: 'trade' }),
        createTestNewsItem({ id: 'n3', category: 'injury' }),
      ];
      const injuries = filterByCategory(news, 'injury');
      expect(injuries.length).toBe(2);
    });

    it('should filter by team', () => {
      const news = [
        createTestNewsItem({ id: 'n1', teamId: 'team-001' }),
        createTestNewsItem({ id: 'n2', teamId: 'team-002' }),
        createTestNewsItem({ id: 'n3', teamId: 'team-001' }),
      ];
      const teamNews = filterByTeam(news, 'team-001');
      expect(teamNews.length).toBe(2);
    });

    it('should filter by player', () => {
      const news = [
        createTestNewsItem({ id: 'n1', playerId: 'player-001' }),
        createTestNewsItem({ id: 'n2', playerId: 'player-002' }),
      ];
      const playerNews = filterByPlayer(news, 'player-001');
      expect(playerNews.length).toBe(1);
    });

    it('should filter by week', () => {
      const news = [
        createTestNewsItem({ id: 'n1', season: 2024, week: 10 }),
        createTestNewsItem({ id: 'n2', season: 2024, week: 11 }),
        createTestNewsItem({ id: 'n3', season: 2024, week: 10 }),
      ];
      const weekNews = getNewsFromWeek(news, 2024, 10);
      expect(weekNews.length).toBe(2);
    });
  });
});

// ============================================================================
// RUMOR MILL TESTS
// ============================================================================

describe('RumorMill', () => {
  describe('generateRumor', () => {
    it('should generate valid rumor', () => {
      const context: StoryContext = {
        playerName: 'Test Player',
        teamName: 'Test Team',
        playerPosition: 'QB',
        experience: 5,
      };
      const rumor = generateRumor('trade_interest', context, 2024, 10);

      expect(rumor).toBeDefined();
      expect(rumor.type).toBe('trade_interest');
      expect(rumor.headline).toContain('Test');
      expect(validateRumor(rumor)).toBe(true);
    });

    it('should generate rumors with configured truth probability', () => {
      const context: StoryContext = { playerName: 'Test', teamName: 'Team' };
      const config: RumorConfig = { ...DEFAULT_RUMOR_CONFIG, truthProbability: 1 };
      const rumor = generateRumor('trade_interest', context, 2024, 10, config);

      expect(rumor.isTrue).toBe(true);
    });
  });

  describe('generateRandomRumor', () => {
    it('should generate random rumor type', () => {
      const context: StoryContext = { playerName: 'Test', teamName: 'Team' };
      const rumor = generateRandomRumor(context, 2024, 10);

      expect(rumor).toBeDefined();
      expect(validateRumor(rumor)).toBe(true);
    });
  });

  describe('isRumorExpired', () => {
    it('should return false for fresh rumor', () => {
      const rumor = createTestRumor();
      expect(isRumorExpired(rumor)).toBe(false);
    });

    it('should return true for expired rumor', () => {
      const rumor = createTestRumor({ expiresAt: Date.now() - 1000 });
      expect(isRumorExpired(rumor)).toBe(true);
    });
  });

  describe('resolveRumor', () => {
    it('should resolve rumor as true', () => {
      const rumor = createTestRumor({ isResolved: false });
      const resolved = resolveRumor(rumor, true, 'Trade completed');

      expect(resolved.isResolved).toBe(true);
      expect(resolved.isTrue).toBe(true);
      expect(resolved.resolution).toBe('Trade completed');
    });

    it('should resolve rumor as false', () => {
      const rumor = createTestRumor({ isResolved: false });
      const resolved = resolveRumor(rumor, false, 'Nothing happened');

      expect(resolved.isResolved).toBe(true);
      expect(resolved.isTrue).toBe(false);
    });
  });

  describe('filterExpiredRumors', () => {
    it('should remove expired unresolved rumors', () => {
      const rumors = [
        createTestRumor({ id: 'r1', expiresAt: Date.now() - 1000, isResolved: false }),
        createTestRumor({ id: 'r2', expiresAt: Date.now() + 100000, isResolved: false }),
        createTestRumor({ id: 'r3', expiresAt: Date.now() - 1000, isResolved: true }),
      ];
      const filtered = filterExpiredRumors(rumors);

      expect(filtered.length).toBe(2);
      expect(filtered.some((r) => r.id === 'r2')).toBe(true);
      expect(filtered.some((r) => r.id === 'r3')).toBe(true);
    });
  });

  describe('getActiveRumors', () => {
    it('should return only active rumors', () => {
      const rumors = [
        createTestRumor({ id: 'r1', isResolved: false, expiresAt: Date.now() + 100000 }),
        createTestRumor({ id: 'r2', isResolved: true }),
        createTestRumor({ id: 'r3', expiresAt: Date.now() - 1000 }),
      ];
      const active = getActiveRumors(rumors);

      expect(active.length).toBe(1);
      expect(active[0].id).toBe('r1');
    });
  });

  describe('Rumor Filtering Functions', () => {
    it('should filter by type', () => {
      const rumors = [
        createTestRumor({ id: 'r1', type: 'trade_interest' }),
        createTestRumor({ id: 'r2', type: 'contract_demand' }),
        createTestRumor({ id: 'r3', type: 'trade_interest' }),
      ];
      const filtered = getRumorsByType(rumors, 'trade_interest');
      expect(filtered.length).toBe(2);
    });

    it('should filter by player', () => {
      const rumors = [
        createTestRumor({ id: 'r1', playerId: 'player-001' }),
        createTestRumor({ id: 'r2', playerId: 'player-002' }),
      ];
      const filtered = getRumorsForPlayer(rumors, 'player-001');
      expect(filtered.length).toBe(1);
    });

    it('should filter by team', () => {
      const rumors = [
        createTestRumor({ id: 'r1', teamId: 'team-001' }),
        createTestRumor({ id: 'r2', teamId: 'team-002' }),
      ];
      const filtered = getRumorsForTeam(rumors, 'team-001');
      expect(filtered.length).toBe(1);
    });
  });

  describe('sortRumors', () => {
    it('should sort by priority then timestamp', () => {
      const rumors = [
        createTestRumor({ id: 'r1', priority: 'low', timestamp: 100 }),
        createTestRumor({ id: 'r2', priority: 'breaking', timestamp: 50 }),
        createTestRumor({ id: 'r3', priority: 'medium', timestamp: 200 }),
      ];
      const sorted = sortRumors(rumors);
      expect(sorted[0].id).toBe('r2');
    });
  });

  describe('Resolution Messages', () => {
    it('should generate true resolution message', () => {
      const context: StoryContext = { playerName: 'Test Player' };
      const message = getTrueResolutionMessage('trade_interest', context);
      expect(message).toBeDefined();
      expect(message.length).toBeGreaterThan(0);
    });

    it('should generate false resolution message', () => {
      const context: StoryContext = { playerName: 'Test Player' };
      const message = getFalseResolutionMessage('trade_interest', context);
      expect(message).toBeDefined();
      expect(message.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// WEEKLY DIGEST TESTS
// ============================================================================

describe('WeeklyDigest', () => {
  describe('generateWeeklyDigest', () => {
    it('should generate valid digest', () => {
      const news = [
        createTestNewsItem({ id: 'n1', priority: 'high' }),
        createTestNewsItem({ id: 'n2', priority: 'medium' }),
      ];
      const rumors = [createTestRumor()];

      const digest = generateWeeklyDigest(news, rumors, 2024, 10);

      expect(digest).toBeDefined();
      expect(digest.season).toBe(2024);
      expect(digest.week).toBe(10);
      expect(digest.headline).toBeDefined();
      expect(digest.summary).toBeDefined();
      expect(digest.totalNewsCount).toBe(2);
      expect(validateWeeklyDigest(digest)).toBe(true);
    });

    it('should include top stories', () => {
      const news = [
        createTestNewsItem({ id: 'n1', priority: 'breaking' }),
        createTestNewsItem({ id: 'n2', priority: 'high' }),
        createTestNewsItem({ id: 'n3', priority: 'low' }),
      ];

      const digest = generateWeeklyDigest(news, [], 2024, 10);

      expect(digest.topStories.length).toBeGreaterThan(0);
      expect(digest.topStories[0].priority).toBe('breaking');
    });

    it('should track unread count', () => {
      const news = [
        createTestNewsItem({ id: 'n1', isRead: false }),
        createTestNewsItem({ id: 'n2', isRead: true }),
        createTestNewsItem({ id: 'n3', isRead: false }),
      ];

      const digest = generateWeeklyDigest(news, [], 2024, 10);
      expect(digest.unreadCount).toBe(2);
    });
  });

  describe('markDigestViewed', () => {
    it('should mark digest as viewed', () => {
      const digest = generateWeeklyDigest([], [], 2024, 10);
      expect(digest.isViewed).toBe(false);

      const viewed = markDigestViewed(digest);
      expect(viewed.isViewed).toBe(true);
    });
  });

  describe('shouldRegenerateDigest', () => {
    it('should regenerate for significant news change', () => {
      const existingDigest = generateWeeklyDigest([], [], 2024, 10);
      const newNews = [
        createTestNewsItem({ id: 'n1' }),
        createTestNewsItem({ id: 'n2' }),
        createTestNewsItem({ id: 'n3' }),
      ];

      expect(shouldRegenerateDigest(existingDigest, newNews)).toBe(true);
    });

    it('should regenerate for new breaking news', () => {
      const existingDigest = generateWeeklyDigest([], [], 2024, 10);
      const newNews = [
        createTestNewsItem({
          id: 'n1',
          priority: 'breaking',
          timestamp: Date.now() + 1000,
        }),
      ];

      expect(shouldRegenerateDigest(existingDigest, newNews)).toBe(true);
    });
  });

  describe('getDigestPreview', () => {
    it('should return preview for empty digest', () => {
      const digest = generateWeeklyDigest([], [], 2024, 10);
      const preview = getDigestPreview(digest);
      expect(preview).toContain('No major news');
    });

    it('should include unread count in preview', () => {
      const news = [createTestNewsItem({ isRead: false })];
      const digest = generateWeeklyDigest(news, [], 2024, 10);
      const preview = getDigestPreview(digest);
      expect(preview).toContain('unread');
    });
  });

  describe('Digest Utilities', () => {
    it('should get digests for season', () => {
      const digests = [
        generateWeeklyDigest([], [], 2024, 1),
        generateWeeklyDigest([], [], 2024, 2),
        generateWeeklyDigest([], [], 2023, 18),
      ];
      const season2024 = getDigestsForSeason(digests, 2024);
      expect(season2024.length).toBe(2);
    });

    it('should get latest digest', () => {
      const digests = [
        generateWeeklyDigest([], [], 2024, 1),
        generateWeeklyDigest([], [], 2024, 5),
        generateWeeklyDigest([], [], 2024, 3),
      ];
      const latest = getLatestDigest(digests);
      expect(latest?.week).toBe(5);
    });

    it('should return null for empty digests', () => {
      const latest = getLatestDigest([]);
      expect(latest).toBeNull();
    });
  });
});

// ============================================================================
// NEWS FEED MANAGER TESTS
// ============================================================================

describe('NewsFeedManager', () => {
  describe('createNewsFeedState', () => {
    it('should create valid initial state', () => {
      const state = createNewsFeedState(2024, 1);

      expect(state.currentSeason).toBe(2024);
      expect(state.currentWeek).toBe(1);
      expect(state.newsItems).toEqual([]);
      expect(state.rumors).toEqual([]);
      expect(state.digests).toEqual([]);
      expect(validateNewsFeedState(state)).toBe(true);
    });

    it('should use defaults for missing parameters', () => {
      const state = createNewsFeedState();
      expect(state.currentSeason).toBe(1);
      expect(state.currentWeek).toBe(1);
    });
  });

  describe('advanceWeek', () => {
    it('should update season and week', () => {
      let state = createNewsFeedState(2024, 10);
      state = advanceNewsFeedWeek(state, 2024, 11);

      expect(state.currentSeason).toBe(2024);
      expect(state.currentWeek).toBe(11);
    });

    it('should generate digest for previous week with news', () => {
      let state = createNewsFeedState(2024, 10);
      state = addNewsItem(state, createTestNewsItem({ season: 2024, week: 10 }));
      state = advanceNewsFeedWeek(state, 2024, 11);

      expect(state.digests.length).toBe(1);
      expect(state.digests[0].week).toBe(10);
    });
  });

  describe('advanceSeason', () => {
    it('should advance to new season week 1', () => {
      let state = createNewsFeedState(2024, 18);
      state = advanceNewsFeedSeason(state, 2025);

      expect(state.currentSeason).toBe(2025);
      expect(state.currentWeek).toBe(1);
    });
  });

  describe('News Item Management', () => {
    it('should add news item', () => {
      let state = createNewsFeedState();
      const news = createTestNewsItem();
      state = addNewsItem(state, news);

      expect(state.newsItems.length).toBe(1);
      expect(state.newsItems[0].id).toBe(news.id);
    });

    it('should add multiple news items', () => {
      let state = createNewsFeedState();
      const news = [createTestNewsItem({ id: 'n1' }), createTestNewsItem({ id: 'n2' })];
      state = addNewsItems(state, news);

      expect(state.newsItems.length).toBe(2);
    });

    it('should prune oldest news when over max', () => {
      let state = createNewsFeedState();
      state = { ...state, maxNewsItems: 2 };

      state = addNewsItem(state, createTestNewsItem({ id: 'n1' }));
      state = addNewsItem(state, createTestNewsItem({ id: 'n2' }));
      state = addNewsItem(state, createTestNewsItem({ id: 'n3' }));

      expect(state.newsItems.length).toBe(2);
      expect(state.newsItems.some((n) => n.id === 'n1')).toBe(false);
    });

    it('should mark news as read', () => {
      let state = createNewsFeedState();
      const news = createTestNewsItem({ id: 'n1', isRead: false });
      state = addNewsItem(state, news);
      state = markNewsAsRead(state, 'n1');

      expect(state.newsItems[0].isRead).toBe(true);
    });

    it('should mark all news as read', () => {
      let state = createNewsFeedState();
      state = addNewsItem(state, createTestNewsItem({ id: 'n1', isRead: false }));
      state = addNewsItem(state, createTestNewsItem({ id: 'n2', isRead: false }));
      state = markAllNewsAsRead(state);

      expect(state.newsItems.every((n) => n.isRead)).toBe(true);
    });

    it('should remove news item', () => {
      let state = createNewsFeedState();
      state = addNewsItem(state, createTestNewsItem({ id: 'n1' }));
      state = addNewsItem(state, createTestNewsItem({ id: 'n2' }));
      state = removeNewsItem(state, 'n1');

      expect(state.newsItems.length).toBe(1);
      expect(state.newsItems[0].id).toBe('n2');
    });
  });

  describe('Rumor Management', () => {
    it('should add rumor', () => {
      let state = createNewsFeedState();
      const rumor = createTestRumor();
      state = addRumor(state, rumor);

      expect(state.rumors.length).toBe(1);
    });

    it('should resolve rumor', () => {
      let state = createNewsFeedState();
      const rumor = createTestRumor({ id: 'r1' });
      state = addRumor(state, rumor);
      state = resolveRumorInState(state, 'r1', true, { playerName: 'Test' });

      expect(state.rumors[0].isResolved).toBe(true);
      expect(state.rumors[0].resolution).toBeDefined();
    });

    it('should cleanup expired rumors', () => {
      let state = createNewsFeedState();
      state = addRumor(state, createTestRumor({ id: 'r1', expiresAt: Date.now() - 1000 }));
      state = addRumor(state, createTestRumor({ id: 'r2', expiresAt: Date.now() + 100000 }));
      state = cleanupExpiredRumors(state);

      expect(state.rumors.length).toBe(1);
      expect(state.rumors[0].id).toBe('r2');
    });
  });

  describe('Digest Management', () => {
    it('should generate current week digest', () => {
      let state = createNewsFeedState(2024, 10);
      state = addNewsItem(state, createTestNewsItem({ season: 2024, week: 10 }));

      const digest = generateCurrentWeekDigest(state);
      expect(digest.week).toBe(10);
      expect(digest.totalNewsCount).toBe(1);
    });

    it('should mark digest as viewed', () => {
      let state = createNewsFeedState(2024, 10);
      state = addNewsItem(state, createTestNewsItem({ season: 2024, week: 10 }));
      state = advanceNewsFeedWeek(state, 2024, 11);

      const digestId = state.digests[0].id;
      state = markDigestAsViewed(state, digestId);

      expect(state.digests[0].isViewed).toBe(true);
    });
  });

  describe('News Generation Helpers', () => {
    it('should generate and add injury news', () => {
      let state = createNewsFeedState(2024, 10);
      state = generateAndAddInjuryNews(state, createTestInjuryContext());

      expect(state.newsItems.length).toBe(1);
      expect(state.newsItems[0].category).toBe('injury');
    });

    it('should generate and add trade news', () => {
      let state = createNewsFeedState(2024, 10);
      state = generateAndAddTradeNews(state, createTestTradeContext());

      expect(state.newsItems.length).toBe(1);
      expect(state.newsItems[0].category).toBe('trade');
    });

    it('should generate and add signing news', () => {
      let state = createNewsFeedState(2024, 10);
      state = generateAndAddSigningNews(state, createTestSigningContext());

      expect(state.newsItems.length).toBe(1);
      expect(state.newsItems[0].category).toBe('signing');
    });

    it('should generate and add performance news', () => {
      let state = createNewsFeedState(2024, 10);
      state = generateAndAddPerformanceNews(state, createTestPerformanceContext());

      expect(state.newsItems.length).toBe(1);
      expect(state.newsItems[0].category).toBe('performance');
    });

    it('should generate and add milestone news', () => {
      let state = createNewsFeedState(2024, 10);
      state = generateAndAddMilestoneNews(state, createTestMilestoneContext());

      expect(state.newsItems.length).toBe(1);
      expect(state.newsItems[0].category).toBe('milestone');
    });

    it('should generate and add rumor', () => {
      let state = createNewsFeedState(2024, 10);
      state = generateAndAddRumor(state, 'trade_interest', {
        playerName: 'Test',
        teamName: 'Team',
      });

      expect(state.rumors.length).toBe(1);
    });
  });

  describe('Query Functions', () => {
    it('should get all news sorted', () => {
      let state = createNewsFeedState();
      state = addNewsItem(state, createTestNewsItem({ id: 'n1', priority: 'low' }));
      state = addNewsItem(state, createTestNewsItem({ id: 'n2', priority: 'high' }));

      const all = getAllNews(state);
      expect(all[0].id).toBe('n2'); // High priority first
    });

    it('should get unread news items', () => {
      let state = createNewsFeedState();
      state = addNewsItem(state, createTestNewsItem({ id: 'n1', isRead: false }));
      state = addNewsItem(state, createTestNewsItem({ id: 'n2', isRead: true }));

      const unread = getUnreadNewsItems(state);
      expect(unread.length).toBe(1);
      expect(unread[0].id).toBe('n1');
    });

    it('should get news by category', () => {
      let state = createNewsFeedState();
      state = addNewsItem(state, createTestNewsItem({ id: 'n1', category: 'injury' }));
      state = addNewsItem(state, createTestNewsItem({ id: 'n2', category: 'trade' }));

      const injuries = getNewsByCategory(state, 'injury');
      expect(injuries.length).toBe(1);
    });

    it('should get news for team', () => {
      let state = createNewsFeedState();
      state = addNewsItem(state, createTestNewsItem({ id: 'n1', teamId: 'team-001' }));
      state = addNewsItem(state, createTestNewsItem({ id: 'n2', teamId: 'team-002' }));

      const teamNews = getNewsForTeam(state, 'team-001');
      expect(teamNews.length).toBe(1);
    });

    it('should get news for player', () => {
      let state = createNewsFeedState();
      state = addNewsItem(state, createTestNewsItem({ id: 'n1', playerId: 'player-001' }));
      state = addNewsItem(state, createTestNewsItem({ id: 'n2', playerId: 'player-002' }));

      const playerNews = getNewsForPlayer(state, 'player-001');
      expect(playerNews.length).toBe(1);
    });

    it('should get current week news', () => {
      let state = createNewsFeedState(2024, 10);
      state = addNewsItem(state, createTestNewsItem({ id: 'n1', season: 2024, week: 10 }));
      state = addNewsItem(state, createTestNewsItem({ id: 'n2', season: 2024, week: 9 }));

      const currentNews = getCurrentWeekNews(state);
      expect(currentNews.length).toBe(1);
    });

    it('should get all active rumors', () => {
      let state = createNewsFeedState();
      state = addRumor(state, createTestRumor({ id: 'r1' }));
      state = addRumor(state, createTestRumor({ id: 'r2', isResolved: true }));

      const active = getAllActiveRumors(state);
      expect(active.length).toBe(1);
    });

    it('should get unread count', () => {
      let state = createNewsFeedState();
      state = addNewsItem(state, createTestNewsItem({ id: 'n1', isRead: false }));
      state = addNewsItem(state, createTestNewsItem({ id: 'n2', isRead: false }));
      state = addNewsItem(state, createTestNewsItem({ id: 'n3', isRead: true }));

      expect(getUnreadCount(state)).toBe(2);
    });

    it('should get breaking news', () => {
      let state = createNewsFeedState();
      state = addNewsItem(state, createTestNewsItem({ id: 'n1', priority: 'breaking' }));
      state = addNewsItem(state, createTestNewsItem({ id: 'n2', priority: 'high' }));

      const breaking = getBreakingNews(state);
      expect(breaking.length).toBe(1);
      expect(breaking[0].priority).toBe('breaking');
    });

    it('should get trait hinting news', () => {
      let state = createNewsFeedState();
      state = addNewsItem(
        state,
        createTestNewsItem({ id: 'n1', revealsTraitHint: true, hintedTrait: 'clutch' })
      );
      state = addNewsItem(state, createTestNewsItem({ id: 'n2', revealsTraitHint: false }));

      const hinting = getTraitHintingNews(state);
      expect(hinting.length).toBe(1);
    });
  });

  describe('Validation', () => {
    it('should validate valid state', () => {
      const state = createNewsFeedState();
      expect(validateNewsFeedState(state)).toBe(true);
    });

    it('should invalidate state with invalid news', () => {
      const state = createNewsFeedState();
      state.newsItems.push({ id: '' } as NewsItem);
      expect(validateNewsFeedState(state)).toBe(false);
    });

    it('should invalidate state with invalid rumor', () => {
      const state = createNewsFeedState();
      state.rumors.push({ id: '' } as Rumor);
      expect(validateNewsFeedState(state)).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should calculate stats correctly', () => {
      let state = createNewsFeedState();
      state = addNewsItem(
        state,
        createTestNewsItem({ id: 'n1', isRead: false, category: 'injury' })
      );
      state = addNewsItem(
        state,
        createTestNewsItem({ id: 'n2', isRead: true, category: 'injury' })
      );
      state = addNewsItem(
        state,
        createTestNewsItem({ id: 'n3', isRead: false, category: 'trade' })
      );
      state = addRumor(state, createTestRumor({ id: 'r1' }));
      state = addRumor(state, createTestRumor({ id: 'r2', isResolved: true }));

      const stats = getNewsFeedStats(state);

      expect(stats.totalNews).toBe(3);
      expect(stats.unreadNews).toBe(2);
      expect(stats.totalRumors).toBe(2);
      expect(stats.activeRumors).toBe(1);
      expect(stats.newsByCategory.injury).toBe(2);
      expect(stats.newsByCategory.trade).toBe(1);
    });
  });
});

// ============================================================================
// BRAND GUIDELINES COMPLIANCE TESTS
// ============================================================================

describe('Brand Guidelines Compliance', () => {
  it('news should reveal traits subtly through narrative', () => {
    const context = createTestPerformanceContext();
    context.touchdowns = 5; // Big performance
    const news = generatePerformanceNews(context, 2024, 10);

    expect(news).not.toBeNull();
    if (news) {
      // Should hint at trait, not label it directly
      expect(news.revealsTraitHint).toBe(true);
      // Headline should not contain the word "trait"
      expect(news.headline.toLowerCase()).not.toContain('trait');
      // Body should not directly label the trait
      expect(news.body.toLowerCase()).not.toContain('has the clutch trait');
    }
  });

  it('rumors should have realistic true/false distribution', () => {
    const context: StoryContext = { playerName: 'Test', teamName: 'Team' };
    const config: RumorConfig = { ...DEFAULT_RUMOR_CONFIG, truthProbability: 0.4 };

    // Generate many rumors to test distribution
    let trueCount = 0;
    const iterations = 100;

    for (let i = 0; i < iterations; i++) {
      const rumor = generateRandomRumor(context, 2024, 10, config);
      if (rumor.isTrue) trueCount++;
    }

    // Should be roughly 40% true (with some variance)
    const trueRate = trueCount / iterations;
    expect(trueRate).toBeGreaterThan(0.2);
    expect(trueRate).toBeLessThan(0.6);
  });

  it('news templates should not directly mention hidden mechanics', () => {
    const allTemplates = [
      ...INJURY_TEMPLATES,
      ...TRADE_TEMPLATES,
      ...SIGNING_TEMPLATES,
      ...PERFORMANCE_TEMPLATES,
      ...MILESTONE_TEMPLATES,
      ...DRAFT_TEMPLATES,
      ...COACHING_TEMPLATES,
      ...LEAGUE_TEMPLATES,
    ];

    for (const template of allTemplates) {
      for (const headline of template.headlines) {
        const lower = headline.toLowerCase();
        expect(lower).not.toContain('it factor');
        expect(lower).not.toContain('hidden trait');
        expect(lower).not.toContain('skill rating');
      }

      for (const body of template.bodies) {
        const lower = body.toLowerCase();
        expect(lower).not.toContain('it factor');
        expect(lower).not.toContain('hidden trait');
        expect(lower).not.toContain('skill rating');
      }
    }
  });
});
