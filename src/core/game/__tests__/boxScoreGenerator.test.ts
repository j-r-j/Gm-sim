/**
 * Box Score Generator Tests
 */

import {
  generateBoxScore,
  createEmptyBoxScore,
  getBoxScoreWinner,
  formatBoxScoreSummary,
  ScoringPlay,
  TeamInfo,
  PlayerInfo,
  GameInfo,
} from '../BoxScoreGenerator';
import { createEmptyTeamGameStats, createEmptyPlayerGameStats } from '../StatisticsTracker';

describe('BoxScoreGenerator', () => {
  // Test fixtures
  const homeTeamInfo: TeamInfo = {
    id: 'home-1',
    name: 'Home City Eagles',
    abbreviation: 'HCE',
  };

  const awayTeamInfo: TeamInfo = {
    id: 'away-1',
    name: 'Away City Lions',
    abbreviation: 'ACL',
  };

  const gameInfo: GameInfo = {
    gameId: 'game-1',
    week: 5,
    date: '2024-10-15',
  };

  const playerInfo: Map<string, PlayerInfo> = new Map([
    ['qb-1', { id: 'qb-1', firstName: 'John', lastName: 'Quarterback', position: 'QB' }],
    ['rb-1', { id: 'rb-1', firstName: 'Mike', lastName: 'Runner', position: 'RB' }],
    ['wr-1', { id: 'wr-1', firstName: 'Steve', lastName: 'Receiver', position: 'WR' }],
    ['de-1', { id: 'de-1', firstName: 'David', lastName: 'Defender', position: 'DE' }],
  ]);

  describe('generateBoxScore', () => {
    it('should generate a box score with correct team info', () => {
      const homeStats = createEmptyTeamGameStats('home-1');
      const awayStats = createEmptyTeamGameStats('away-1');
      homeStats.score = 24;
      awayStats.score = 17;

      const boxScore = generateBoxScore(
        homeStats,
        awayStats,
        [],
        gameInfo,
        homeTeamInfo,
        awayTeamInfo,
        playerInfo
      );

      expect(boxScore.gameId).toBe('game-1');
      expect(boxScore.week).toBe(5);
      expect(boxScore.date).toBe('2024-10-15');
      expect(boxScore.homeTeam.id).toBe('home-1');
      expect(boxScore.homeTeam.name).toBe('Home City Eagles');
      expect(boxScore.homeTeam.score).toBe(24);
      expect(boxScore.awayTeam.id).toBe('away-1');
      expect(boxScore.awayTeam.name).toBe('Away City Lions');
      expect(boxScore.awayTeam.score).toBe(17);
    });

    it('should include scoring summary', () => {
      const homeStats = createEmptyTeamGameStats('home-1');
      const awayStats = createEmptyTeamGameStats('away-1');

      const scoringPlays: ScoringPlay[] = [
        {
          quarter: 1,
          time: '10:30',
          team: 'Home City Eagles',
          teamId: 'home-1',
          description: '15 yard touchdown pass',
          homeScore: 7,
          awayScore: 0,
        },
        {
          quarter: 2,
          time: '5:45',
          team: 'Away City Lions',
          teamId: 'away-1',
          description: '32 yard field goal',
          homeScore: 7,
          awayScore: 3,
        },
      ];

      const boxScore = generateBoxScore(
        homeStats,
        awayStats,
        scoringPlays,
        gameInfo,
        homeTeamInfo,
        awayTeamInfo,
        playerInfo
      );

      expect(boxScore.scoringSummary).toHaveLength(2);
      expect(boxScore.scoringSummary[0].description).toBe('15 yard touchdown pass');
      expect(boxScore.scoringSummary[1].description).toBe('32 yard field goal');
    });

    it('should generate team comparison categories', () => {
      const homeStats = createEmptyTeamGameStats('home-1');
      homeStats.firstDowns = 22;
      homeStats.totalYards = 385;
      homeStats.passingYards = 245;
      homeStats.rushingYards = 140;
      homeStats.turnovers = 1;

      const awayStats = createEmptyTeamGameStats('away-1');
      awayStats.firstDowns = 18;
      awayStats.totalYards = 310;
      awayStats.passingYards = 220;
      awayStats.rushingYards = 90;
      awayStats.turnovers = 2;

      const boxScore = generateBoxScore(
        homeStats,
        awayStats,
        [],
        gameInfo,
        homeTeamInfo,
        awayTeamInfo,
        playerInfo
      );

      expect(boxScore.teamComparison.length).toBeGreaterThan(0);

      const firstDownsCategory = boxScore.teamComparison.find((c) => c.category === 'First Downs');
      expect(firstDownsCategory).toBeDefined();
      expect(firstDownsCategory?.home).toBe(22);
      expect(firstDownsCategory?.away).toBe(18);

      const totalYardsCategory = boxScore.teamComparison.find((c) => c.category === 'Total Yards');
      expect(totalYardsCategory).toBeDefined();
      expect(totalYardsCategory?.home).toBe(385);
    });

    it('should extract passing leaders', () => {
      const homeStats = createEmptyTeamGameStats('home-1');
      const qbStats = createEmptyPlayerGameStats('qb-1');
      qbStats.passing.attempts = 32;
      qbStats.passing.completions = 24;
      qbStats.passing.yards = 287;
      qbStats.passing.touchdowns = 2;
      qbStats.passing.interceptions = 1;
      homeStats.playerStats.set('qb-1', qbStats);

      const awayStats = createEmptyTeamGameStats('away-1');

      const boxScore = generateBoxScore(
        homeStats,
        awayStats,
        [],
        gameInfo,
        homeTeamInfo,
        awayTeamInfo,
        playerInfo
      );

      expect(boxScore.passingLeaders.length).toBeGreaterThan(0);
      const leader = boxScore.passingLeaders[0];
      expect(leader.playerId).toBe('qb-1');
      expect(leader.playerName).toBe('John Quarterback');
      expect(leader.statLine).toContain('24/32');
      expect(leader.statLine).toContain('287 YDS');
    });

    it('should extract rushing leaders', () => {
      const homeStats = createEmptyTeamGameStats('home-1');
      const rbStats = createEmptyPlayerGameStats('rb-1');
      rbStats.rushing.attempts = 22;
      rbStats.rushing.yards = 115;
      rbStats.rushing.touchdowns = 1;
      homeStats.playerStats.set('rb-1', rbStats);

      const awayStats = createEmptyTeamGameStats('away-1');

      const boxScore = generateBoxScore(
        homeStats,
        awayStats,
        [],
        gameInfo,
        homeTeamInfo,
        awayTeamInfo,
        playerInfo
      );

      expect(boxScore.rushingLeaders.length).toBeGreaterThan(0);
      const leader = boxScore.rushingLeaders[0];
      expect(leader.playerId).toBe('rb-1');
      expect(leader.statLine).toContain('22 CAR');
      expect(leader.statLine).toContain('115 YDS');
    });

    it('should extract receiving leaders', () => {
      const homeStats = createEmptyTeamGameStats('home-1');
      const wrStats = createEmptyPlayerGameStats('wr-1');
      wrStats.receiving.targets = 10;
      wrStats.receiving.receptions = 7;
      wrStats.receiving.yards = 95;
      wrStats.receiving.touchdowns = 1;
      homeStats.playerStats.set('wr-1', wrStats);

      const awayStats = createEmptyTeamGameStats('away-1');

      const boxScore = generateBoxScore(
        homeStats,
        awayStats,
        [],
        gameInfo,
        homeTeamInfo,
        awayTeamInfo,
        playerInfo
      );

      expect(boxScore.receivingLeaders.length).toBeGreaterThan(0);
      const leader = boxScore.receivingLeaders[0];
      expect(leader.playerId).toBe('wr-1');
      expect(leader.statLine).toContain('7 REC');
      expect(leader.statLine).toContain('95 YDS');
    });

    it('should extract defensive leaders', () => {
      const homeStats = createEmptyTeamGameStats('home-1');

      const awayStats = createEmptyTeamGameStats('away-1');
      const deStats = createEmptyPlayerGameStats('de-1');
      deStats.defensive.tackles = 5;
      deStats.defensive.sacks = 2;
      deStats.defensive.tacklesForLoss = 3;
      awayStats.playerStats.set('de-1', deStats);

      const boxScore = generateBoxScore(
        homeStats,
        awayStats,
        [],
        gameInfo,
        homeTeamInfo,
        awayTeamInfo,
        playerInfo
      );

      // Defensive leaders are from stats against (away offense has home defense)
      expect(boxScore.defensiveLeaders.length).toBeGreaterThan(0);
    });
  });

  describe('createEmptyBoxScore', () => {
    it('should create an empty box score with correct structure', () => {
      const boxScore = createEmptyBoxScore(gameInfo, homeTeamInfo, awayTeamInfo);

      expect(boxScore.gameId).toBe('game-1');
      expect(boxScore.homeTeam.score).toBe(0);
      expect(boxScore.awayTeam.score).toBe(0);
      expect(boxScore.scoringSummary).toHaveLength(0);
      expect(boxScore.passingLeaders).toHaveLength(0);
      expect(boxScore.homePlayerStats).toHaveLength(0);
    });

    it('should have 4 quarters initialized to 0', () => {
      const boxScore = createEmptyBoxScore(gameInfo, homeTeamInfo, awayTeamInfo);

      expect(boxScore.homeTeam.scoreByQuarter).toHaveLength(4);
      expect(boxScore.awayTeam.scoreByQuarter).toHaveLength(4);
      expect(boxScore.homeTeam.scoreByQuarter.every((q) => q === 0)).toBe(true);
    });
  });

  describe('getBoxScoreWinner', () => {
    it('should return home team as winner when home score is higher', () => {
      const boxScore = createEmptyBoxScore(gameInfo, homeTeamInfo, awayTeamInfo);
      boxScore.homeTeam.score = 28;
      boxScore.awayTeam.score = 21;

      const result = getBoxScoreWinner(boxScore);

      expect(result.isTie).toBe(false);
      expect(result.winnerId).toBe('home-1');
      expect(result.loserId).toBe('away-1');
      expect(result.winnerName).toBe('Home City Eagles');
    });

    it('should return away team as winner when away score is higher', () => {
      const boxScore = createEmptyBoxScore(gameInfo, homeTeamInfo, awayTeamInfo);
      boxScore.homeTeam.score = 14;
      boxScore.awayTeam.score = 35;

      const result = getBoxScoreWinner(boxScore);

      expect(result.isTie).toBe(false);
      expect(result.winnerId).toBe('away-1');
      expect(result.loserId).toBe('home-1');
      expect(result.winnerName).toBe('Away City Lions');
    });

    it('should return a tie when scores are equal', () => {
      const boxScore = createEmptyBoxScore(gameInfo, homeTeamInfo, awayTeamInfo);
      boxScore.homeTeam.score = 24;
      boxScore.awayTeam.score = 24;

      const result = getBoxScoreWinner(boxScore);

      expect(result.isTie).toBe(true);
      expect(result.winnerId).toBe('');
      expect(result.loserId).toBe('');
    });
  });

  describe('formatBoxScoreSummary', () => {
    it('should format a text summary correctly', () => {
      const boxScore = createEmptyBoxScore(gameInfo, homeTeamInfo, awayTeamInfo);
      boxScore.homeTeam.score = 28;
      boxScore.awayTeam.score = 21;
      boxScore.homeTeam.scoreByQuarter = [7, 7, 7, 7];
      boxScore.awayTeam.scoreByQuarter = [0, 14, 7, 0];

      const summary = formatBoxScoreSummary(boxScore);

      expect(summary).toContain('ACL 21 @ HCE 28');
      expect(summary).toContain('Week 5');
      expect(summary).toContain('2024-10-15');
      expect(summary).toContain('Quarter Scores');
    });
  });
});
