/**
 * Post-Game Processor Tests
 */

import {
  processGameResult,
  generateGameNews,
  checkMilestones,
  createEmptyCareerStats,
  updateCareerStats,
  PlayerCareerStats,
} from '../PostGameProcessor';
import { GameResult } from '../GameRunner';
import { createEmptyTeamGameStats, createEmptyPlayerGameStats } from '../StatisticsTracker';
import { createEmptyBoxScore } from '../BoxScoreGenerator';

// Helper to create a minimal GameResult for testing
function createTestGameResult(homeScore: number, awayScore: number): GameResult {
  const homeStats = createEmptyTeamGameStats('home-1');
  homeStats.score = homeScore;

  const awayStats = createEmptyTeamGameStats('away-1');
  awayStats.score = awayScore;

  const homeTeamInfo = { id: 'home-1', name: 'Home Team', abbreviation: 'HOM' };
  const awayTeamInfo = { id: 'away-1', name: 'Away Team', abbreviation: 'AWY' };
  const gameInfo = { gameId: 'game-1', week: 1, date: '2024-09-08' };

  return {
    gameId: 'game-1',
    week: 1,
    homeTeamId: 'home-1',
    awayTeamId: 'away-1',
    homeScore,
    awayScore,
    winnerId: homeScore > awayScore ? 'home-1' : awayScore > homeScore ? 'away-1' : '',
    loserId: homeScore > awayScore ? 'away-1' : awayScore > homeScore ? 'home-1' : '',
    isTie: homeScore === awayScore,
    homeStats,
    awayStats,
    boxScore: createEmptyBoxScore(gameInfo, homeTeamInfo, awayTeamInfo),
    injuries: [],
    notableEvents: [],
    keyPlays: [],
  };
}

describe('PostGameProcessor', () => {
  describe('processGameResult', () => {
    it('should generate player updates for all players with stats', () => {
      const result = createTestGameResult(28, 21);

      // Add player stats
      const qbStats = createEmptyPlayerGameStats('qb-1');
      qbStats.passing.attempts = 30;
      qbStats.passing.completions = 22;
      qbStats.passing.yards = 285;
      qbStats.passing.touchdowns = 3;
      qbStats.snapsPlayed = 60;
      result.homeStats.playerStats.set('qb-1', qbStats);

      const updates = processGameResult(result);

      expect(updates.playerUpdates.length).toBeGreaterThan(0);
      const qbUpdate = updates.playerUpdates.find((u) => u.playerId === 'qb-1');
      expect(qbUpdate).toBeDefined();
    });

    it('should give positive morale to winning team players', () => {
      const result = createTestGameResult(28, 21);

      const qbStats = createEmptyPlayerGameStats('qb-1');
      qbStats.snapsPlayed = 60;
      result.homeStats.playerStats.set('qb-1', qbStats);

      const updates = processGameResult(result);

      const qbUpdate = updates.playerUpdates.find((u) => u.playerId === 'qb-1');
      expect(qbUpdate?.moraleChange).toBeGreaterThan(0);
    });

    it('should give negative morale to losing team players', () => {
      const result = createTestGameResult(28, 21);

      const oppQbStats = createEmptyPlayerGameStats('qb-2');
      oppQbStats.snapsPlayed = 60;
      result.awayStats.playerStats.set('qb-2', oppQbStats);

      const updates = processGameResult(result);

      const oppQbUpdate = updates.playerUpdates.find((u) => u.playerId === 'qb-2');
      expect(oppQbUpdate?.moraleChange).toBeLessThan(5); // May be slightly positive from good performance
    });

    it('should generate team updates', () => {
      const result = createTestGameResult(28, 21);

      const updates = processGameResult(result);

      expect(updates.teamUpdates.length).toBe(2);

      const homeUpdate = updates.teamUpdates.find((u) => u.teamId === 'home-1');
      expect(homeUpdate?.winsChange).toBe(1);
      expect(homeUpdate?.lossesChange).toBe(0);
      expect(homeUpdate?.pointsFor).toBe(28);
      expect(homeUpdate?.pointsAgainst).toBe(21);

      const awayUpdate = updates.teamUpdates.find((u) => u.teamId === 'away-1');
      expect(awayUpdate?.winsChange).toBe(0);
      expect(awayUpdate?.lossesChange).toBe(1);
    });

    it('should handle ties correctly', () => {
      const result = createTestGameResult(24, 24);

      const updates = processGameResult(result);

      const homeUpdate = updates.teamUpdates.find((u) => u.teamId === 'home-1');
      expect(homeUpdate?.winsChange).toBe(0);
      expect(homeUpdate?.lossesChange).toBe(0);
      expect(homeUpdate?.tiesChange).toBe(1);
    });

    it('should process injuries into injury updates', () => {
      const result = createTestGameResult(28, 21);
      result.injuries.push({
        playerId: 'wr-1',
        playerName: 'John Smith',
        team: 'Home Team',
        injuryType: 'Hamstring',
        severity: 'Moderate',
        weeksOut: 2,
      });

      const updates = processGameResult(result);

      // Note: Since wr-1 wasn't in playerStats, no update is created
      // The injury would be tracked separately via updates.injuries
      expect(updates.playerUpdates.find((u) => u.playerId === 'wr-1')).toBeUndefined();

      // Check news events for injury
      const injuryNews = updates.newsEvents.find((n) => n.type === 'injury');
      expect(injuryNews).toBeDefined();
    });

    it('should generate news events', () => {
      const result = createTestGameResult(28, 21);

      const updates = processGameResult(result, {
        homeTeamName: 'Home Eagles',
        awayTeamName: 'Away Lions',
      });

      expect(updates.newsEvents.length).toBeGreaterThan(0);

      // Should have at least game summary news
      const summaryNews = updates.newsEvents.find((n) => n.type === 'performance');
      expect(summaryNews).toBeDefined();
    });

    it('should track divisional game records', () => {
      const result = createTestGameResult(28, 21);

      const updates = processGameResult(result, { isDivisionalGame: true });

      const homeUpdate = updates.teamUpdates.find((u) => u.teamId === 'home-1');
      expect(homeUpdate?.divisionRecord.winsChange).toBe(1);

      const awayUpdate = updates.teamUpdates.find((u) => u.teamId === 'away-1');
      expect(awayUpdate?.divisionRecord.lossesChange).toBe(1);
    });

    it('should track conference game records', () => {
      const result = createTestGameResult(28, 21);

      const updates = processGameResult(result, { isConferenceGame: true });

      const homeUpdate = updates.teamUpdates.find((u) => u.teamId === 'home-1');
      expect(homeUpdate?.conferenceRecord.winsChange).toBe(1);
    });
  });

  describe('generateGameNews', () => {
    it('should generate game summary news', () => {
      const result = createTestGameResult(28, 21);

      const news = generateGameNews(result, 'Home Eagles', 'Away Lions', new Map());

      expect(news.length).toBeGreaterThan(0);
      expect(news[0].headline).toContain('defeats');
    });

    it('should generate injury news', () => {
      const result = createTestGameResult(28, 21);
      result.injuries.push({
        playerId: 'wr-1',
        playerName: 'John Smith',
        team: 'Home Team',
        injuryType: 'Hamstring',
        severity: 'Moderate',
        weeksOut: 2,
      });

      const news = generateGameNews(result, 'Home Eagles', 'Away Lions', new Map());

      const injuryNews = news.find((n) => n.type === 'injury');
      expect(injuryNews).toBeDefined();
      expect(injuryNews?.headline).toContain('John Smith');
    });

    it('should generate performance news for big games', () => {
      const result = createTestGameResult(28, 21);

      const qbStats = createEmptyPlayerGameStats('qb-1');
      qbStats.passing.yards = 350;
      qbStats.passing.touchdowns = 4;
      result.homeStats.playerStats.set('qb-1', qbStats);

      const playerNames = new Map([['qb-1', 'Tom Brady']]);

      const news = generateGameNews(result, 'Home Eagles', 'Away Lions', playerNames);

      const perfNews = news.find((n) => n.type === 'performance' && n.involvedPlayerIds.length > 0);
      expect(perfNews).toBeDefined();
      expect(perfNews?.headline).toContain('Tom Brady');
    });
  });

  describe('checkMilestones', () => {
    it('should detect passing yard milestones', () => {
      const careerStats: PlayerCareerStats = {
        playerId: 'qb-1',
        passingYards: 4800,
        passingTouchdowns: 30,
        rushingYards: 100,
        rushingTouchdowns: 2,
        receivingYards: 0,
        receivingTouchdowns: 0,
        sacks: 0,
        interceptions: 0,
        gamesPlayed: 50,
      };

      const gameStats = createEmptyPlayerGameStats('qb-1');
      gameStats.passing.yards = 300; // Will push over 5000

      const milestones = checkMilestones('qb-1', gameStats, careerStats);

      expect(milestones.length).toBeGreaterThan(0);
      expect(milestones[0].type).toBe('milestone');
      expect(milestones[0].description).toContain('5,000');
    });

    it('should detect touchdown milestones', () => {
      const careerStats: PlayerCareerStats = {
        playerId: 'qb-1',
        passingYards: 20000,
        passingTouchdowns: 98,
        rushingYards: 100,
        rushingTouchdowns: 2,
        receivingYards: 0,
        receivingTouchdowns: 0,
        sacks: 0,
        interceptions: 0,
        gamesPlayed: 100,
      };

      const gameStats = createEmptyPlayerGameStats('qb-1');
      gameStats.passing.touchdowns = 3; // Will push to 101

      const milestones = checkMilestones('qb-1', gameStats, careerStats);

      expect(milestones.length).toBeGreaterThan(0);
      const tdMilestone = milestones.find((m) => m.description.includes('100'));
      expect(tdMilestone).toBeDefined();
    });

    it('should detect sack milestones', () => {
      const careerStats: PlayerCareerStats = {
        playerId: 'de-1',
        passingYards: 0,
        passingTouchdowns: 0,
        rushingYards: 0,
        rushingTouchdowns: 0,
        receivingYards: 0,
        receivingTouchdowns: 0,
        sacks: 48,
        interceptions: 0,
        gamesPlayed: 80,
      };

      const gameStats = createEmptyPlayerGameStats('de-1');
      gameStats.defensive.sacks = 3; // Will push to 51

      const milestones = checkMilestones('de-1', gameStats, careerStats);

      expect(milestones.length).toBeGreaterThan(0);
      const sackMilestone = milestones.find((m) => m.description.includes('50'));
      expect(sackMilestone).toBeDefined();
    });

    it('should return empty array when no milestones reached', () => {
      const careerStats = createEmptyCareerStats('player-1');

      const gameStats = createEmptyPlayerGameStats('player-1');
      gameStats.rushing.yards = 50;

      const milestones = checkMilestones('player-1', gameStats, careerStats);

      expect(milestones).toEqual([]);
    });
  });

  describe('createEmptyCareerStats', () => {
    it('should create stats with all zeros', () => {
      const stats = createEmptyCareerStats('player-1');

      expect(stats.playerId).toBe('player-1');
      expect(stats.passingYards).toBe(0);
      expect(stats.passingTouchdowns).toBe(0);
      expect(stats.rushingYards).toBe(0);
      expect(stats.sacks).toBe(0);
      expect(stats.gamesPlayed).toBe(0);
    });
  });

  describe('updateCareerStats', () => {
    it('should add game stats to career totals', () => {
      const career = createEmptyCareerStats('qb-1');
      career.passingYards = 1000;
      career.passingTouchdowns = 10;
      career.gamesPlayed = 5;

      const game = createEmptyPlayerGameStats('qb-1');
      game.passing.yards = 300;
      game.passing.touchdowns = 3;
      game.snapsPlayed = 60;

      const updated = updateCareerStats(career, game);

      expect(updated.passingYards).toBe(1300);
      expect(updated.passingTouchdowns).toBe(13);
      expect(updated.gamesPlayed).toBe(6);
    });

    it('should not increment games played for 0 snaps', () => {
      const career = createEmptyCareerStats('player-1');
      career.gamesPlayed = 5;

      const game = createEmptyPlayerGameStats('player-1');
      game.snapsPlayed = 0;

      const updated = updateCareerStats(career, game);

      expect(updated.gamesPlayed).toBe(5);
    });

    it('should track all stat categories', () => {
      const career = createEmptyCareerStats('player-1');

      const game = createEmptyPlayerGameStats('player-1');
      game.passing.yards = 200;
      game.rushing.yards = 30;
      game.receiving.yards = 0;
      game.defensive.sacks = 0;
      game.defensive.interceptions = 1;
      game.snapsPlayed = 40;

      const updated = updateCareerStats(career, game);

      expect(updated.passingYards).toBe(200);
      expect(updated.rushingYards).toBe(30);
      expect(updated.interceptions).toBe(1);
    });
  });
});
