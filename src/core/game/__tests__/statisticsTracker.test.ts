/**
 * Statistics Tracker Tests
 */

import {
  StatisticsTracker,
  calculatePasserRating,
  createEmptyPassingStats,
  createEmptyPlayerGameStats,
  createEmptyTeamGameStats,
  PassingStats,
} from '../StatisticsTracker';
import { PlayResult } from '../../engine/PlayResolver';

describe('StatisticsTracker', () => {
  let tracker: StatisticsTracker;

  beforeEach(() => {
    tracker = new StatisticsTracker('home-team-1', 'away-team-1');
  });

  describe('constructor', () => {
    it('should initialize with empty stats for both teams', () => {
      const homeStats = tracker.getHomeStats();
      const awayStats = tracker.getAwayStats();

      expect(homeStats.teamId).toBe('home-team-1');
      expect(awayStats.teamId).toBe('away-team-1');
      expect(homeStats.score).toBe(0);
      expect(awayStats.score).toBe(0);
      expect(homeStats.totalYards).toBe(0);
    });
  });

  describe('recordPlay', () => {
    it('should record a passing play correctly', () => {
      const play: PlayResult = {
        playType: 'pass_short',
        outcome: 'good_gain',
        yardsGained: 12,
        primaryOffensivePlayer: 'qb-1',
        primaryDefensivePlayer: 'wr-1',
        newDown: 1,
        newDistance: 10,
        newFieldPosition: 47,
        turnover: false,
        touchdown: false,
        firstDown: true,
        injuryOccurred: false,
        injuredPlayerId: null,
        penaltyOccurred: false,
        penaltyDetails: null,
        safety: false,
        description: 'Complete pass for 12 yards',
      };

      tracker.recordPlay(play, 'home-team-1', {
        down: 1,
        distance: 10,
        fieldPosition: 35,
        timeElapsed: 8,
      });

      const homeStats = tracker.getHomeStats();
      expect(homeStats.passingYards).toBe(12);
      expect(homeStats.totalYards).toBe(12);
      expect(homeStats.firstDowns).toBe(1);

      const qbStats = tracker.getPlayerStats('qb-1');
      expect(qbStats).not.toBeNull();
      expect(qbStats?.passing.attempts).toBe(1);
      expect(qbStats?.passing.completions).toBe(1);
      expect(qbStats?.passing.yards).toBe(12);
    });

    it('should record a rushing play correctly', () => {
      const play: PlayResult = {
        playType: 'run_inside',
        outcome: 'moderate_gain',
        yardsGained: 5,
        primaryOffensivePlayer: 'rb-1',
        primaryDefensivePlayer: 'lb-1',
        newDown: 2,
        newDistance: 5,
        newFieldPosition: 40,
        turnover: false,
        touchdown: false,
        firstDown: false,
        injuryOccurred: false,
        injuredPlayerId: null,
        penaltyOccurred: false,
        penaltyDetails: null,
        safety: false,
        description: 'Rush for 5 yards',
      };

      tracker.recordPlay(play, 'home-team-1', {
        down: 1,
        distance: 10,
        fieldPosition: 35,
        timeElapsed: 6,
      });

      const homeStats = tracker.getHomeStats();
      expect(homeStats.rushingYards).toBe(5);
      expect(homeStats.totalYards).toBe(5);

      const rbStats = tracker.getPlayerStats('rb-1');
      expect(rbStats).not.toBeNull();
      expect(rbStats?.rushing.attempts).toBe(1);
      expect(rbStats?.rushing.yards).toBe(5);
    });

    it('should record a sack correctly', () => {
      const play: PlayResult = {
        playType: 'pass_short',
        outcome: 'sack',
        yardsGained: -7,
        primaryOffensivePlayer: 'qb-1',
        primaryDefensivePlayer: 'de-1',
        newDown: 2,
        newDistance: 17,
        newFieldPosition: 28,
        turnover: false,
        touchdown: false,
        firstDown: false,
        injuryOccurred: false,
        injuredPlayerId: null,
        penaltyOccurred: false,
        penaltyDetails: null,
        safety: false,
        description: 'Sacked for -7 yards',
      };

      tracker.recordPlay(play, 'home-team-1', {
        down: 1,
        distance: 10,
        fieldPosition: 35,
        timeElapsed: 5,
      });

      const qbStats = tracker.getPlayerStats('qb-1');
      expect(qbStats?.passing.sacks).toBe(1);
      expect(qbStats?.passing.sackYardsLost).toBe(7);

      const deStats = tracker.getPlayerStats('de-1');
      expect(deStats?.defensive.sacks).toBe(1);
      expect(deStats?.defensive.tackles).toBe(1);
    });

    it('should record an interception correctly', () => {
      const play: PlayResult = {
        playType: 'pass_deep',
        outcome: 'interception',
        yardsGained: 0,
        primaryOffensivePlayer: 'qb-1',
        primaryDefensivePlayer: 'cb-1',
        newDown: 1,
        newDistance: 10,
        newFieldPosition: 70,
        turnover: true,
        touchdown: false,
        firstDown: false,
        injuryOccurred: false,
        injuredPlayerId: null,
        penaltyOccurred: false,
        penaltyDetails: null,
        safety: false,
        description: 'Pass intercepted',
      };

      tracker.recordPlay(play, 'home-team-1', {
        down: 3,
        distance: 8,
        fieldPosition: 55,
        timeElapsed: 4,
      });

      const homeStats = tracker.getHomeStats();
      expect(homeStats.turnovers).toBe(1);

      const qbStats = tracker.getPlayerStats('qb-1');
      expect(qbStats?.passing.interceptions).toBe(1);
      expect(qbStats?.passing.attempts).toBe(1);

      const cbStats = tracker.getPlayerStats('cb-1');
      expect(cbStats?.defensive.interceptions).toBe(1);
    });

    it('should track third down efficiency', () => {
      // Third down conversion
      const play1: PlayResult = {
        playType: 'pass_short',
        outcome: 'good_gain',
        yardsGained: 8,
        primaryOffensivePlayer: 'qb-1',
        primaryDefensivePlayer: 'wr-1',
        newDown: 1,
        newDistance: 10,
        newFieldPosition: 43,
        turnover: false,
        touchdown: false,
        firstDown: true,
        injuryOccurred: false,
        injuredPlayerId: null,
        penaltyOccurred: false,
        penaltyDetails: null,
        safety: false,
        description: 'First down',
      };

      tracker.recordPlay(play1, 'home-team-1', {
        down: 3,
        distance: 6,
        fieldPosition: 35,
        timeElapsed: 5,
      });

      // Third down failure
      const play2: PlayResult = {
        playType: 'pass_short',
        outcome: 'incomplete',
        yardsGained: 0,
        primaryOffensivePlayer: 'qb-1',
        primaryDefensivePlayer: null,
        newDown: 4,
        newDistance: 6,
        newFieldPosition: 43,
        turnover: false,
        touchdown: false,
        firstDown: false,
        injuryOccurred: false,
        injuredPlayerId: null,
        penaltyOccurred: false,
        penaltyDetails: null,
        safety: false,
        description: 'Incomplete',
      };

      tracker.recordPlay(play2, 'home-team-1', {
        down: 3,
        distance: 6,
        fieldPosition: 43,
        timeElapsed: 3,
      });

      const homeStats = tracker.getHomeStats();
      expect(homeStats.thirdDownAttempts).toBe(2);
      expect(homeStats.thirdDownConversions).toBe(1);
    });

    it('should record penalties correctly', () => {
      const play: PlayResult = {
        playType: 'run_inside',
        outcome: 'penalty_offense',
        yardsGained: -10,
        primaryOffensivePlayer: 'rb-1',
        primaryDefensivePlayer: null,
        newDown: 1,
        newDistance: 20,
        newFieldPosition: 25,
        turnover: false,
        touchdown: false,
        firstDown: false,
        injuryOccurred: false,
        injuredPlayerId: null,
        penaltyOccurred: true,
        penaltyDetails: {
          team: 'offense',
          type: 'Holding',
          yards: 10,
          playerId: 'ol-1',
          declined: false,
        },
        safety: false,
        description: 'Holding penalty',
      };

      tracker.recordPlay(play, 'home-team-1', {
        down: 1,
        distance: 10,
        fieldPosition: 35,
        timeElapsed: 0,
      });

      const homeStats = tracker.getHomeStats();
      expect(homeStats.penalties).toBe(1);
      expect(homeStats.penaltyYards).toBe(10);
    });
  });

  describe('recordExtraPoint', () => {
    it('should record a made extra point', () => {
      tracker.recordExtraPoint('home-team-1', true, 'k-1');

      const homeStats = tracker.getHomeStats();
      expect(homeStats.score).toBe(1);

      const kickerStats = tracker.getPlayerStats('k-1');
      expect(kickerStats?.kicking.extraPointAttempts).toBe(1);
      expect(kickerStats?.kicking.extraPointsMade).toBe(1);
    });

    it('should record a missed extra point', () => {
      tracker.recordExtraPoint('home-team-1', false, 'k-1');

      const homeStats = tracker.getHomeStats();
      expect(homeStats.score).toBe(0);

      const kickerStats = tracker.getPlayerStats('k-1');
      expect(kickerStats?.kicking.extraPointAttempts).toBe(1);
      expect(kickerStats?.kicking.extraPointsMade).toBe(0);
    });
  });

  describe('recordTwoPointConversion', () => {
    it('should add 2 points for successful conversion', () => {
      tracker.recordTwoPointConversion('home-team-1', true);

      const homeStats = tracker.getHomeStats();
      expect(homeStats.score).toBe(2);
    });

    it('should add 0 points for failed conversion', () => {
      tracker.recordTwoPointConversion('home-team-1', false);

      const homeStats = tracker.getHomeStats();
      expect(homeStats.score).toBe(0);
    });
  });

  describe('stat accumulation', () => {
    it('should accumulate stats over multiple plays', () => {
      // First play - 5 yard run
      const play1: PlayResult = {
        playType: 'run_inside',
        outcome: 'moderate_gain',
        yardsGained: 5,
        primaryOffensivePlayer: 'rb-1',
        primaryDefensivePlayer: 'lb-1',
        newDown: 2,
        newDistance: 5,
        newFieldPosition: 40,
        turnover: false,
        touchdown: false,
        firstDown: false,
        injuryOccurred: false,
        injuredPlayerId: null,
        penaltyOccurred: false,
        penaltyDetails: null,
        safety: false,
        description: 'Run for 5 yards',
      };

      // Second play - 8 yard run
      const play2: PlayResult = {
        playType: 'run_outside',
        outcome: 'good_gain',
        yardsGained: 8,
        primaryOffensivePlayer: 'rb-1',
        primaryDefensivePlayer: 'lb-1',
        newDown: 1,
        newDistance: 10,
        newFieldPosition: 48,
        turnover: false,
        touchdown: false,
        firstDown: true,
        injuryOccurred: false,
        injuredPlayerId: null,
        penaltyOccurred: false,
        penaltyDetails: null,
        safety: false,
        description: 'Run for 8 yards',
      };

      tracker.recordPlay(play1, 'home-team-1', {
        down: 1,
        distance: 10,
        fieldPosition: 35,
        timeElapsed: 5,
      });

      tracker.recordPlay(play2, 'home-team-1', {
        down: 2,
        distance: 5,
        fieldPosition: 40,
        timeElapsed: 6,
      });

      const rbStats = tracker.getPlayerStats('rb-1');
      expect(rbStats?.rushing.attempts).toBe(2);
      expect(rbStats?.rushing.yards).toBe(13);
      expect(rbStats?.rushing.longestRush).toBe(8);

      const homeStats = tracker.getHomeStats();
      expect(homeStats.rushingYards).toBe(13);
      expect(homeStats.totalYards).toBe(13);
    });
  });
});

describe('calculatePasserRating', () => {
  it('should return 0 for no attempts', () => {
    const stats = createEmptyPassingStats();
    expect(calculatePasserRating(stats)).toBe(0);
  });

  it('should calculate perfect passer rating correctly', () => {
    // Perfect rating conditions: 77.5% completion, 12.5 YPA, 11.875% TD rate, 0% INT rate
    const stats: PassingStats = {
      attempts: 10,
      completions: 10,
      yards: 125, // 12.5 YPA
      touchdowns: 1,
      interceptions: 0,
      sacks: 0,
      sackYardsLost: 0,
      longestPass: 40,
      rating: 0,
    };

    const rating = calculatePasserRating(stats);
    // Perfect passer rating is 158.3
    expect(rating).toBeGreaterThan(150);
  });

  it('should calculate a typical good game correctly', () => {
    const stats: PassingStats = {
      attempts: 30,
      completions: 22, // 73.3%
      yards: 280, // 9.3 YPA
      touchdowns: 2,
      interceptions: 1,
      sacks: 2,
      sackYardsLost: 15,
      longestPass: 45,
      rating: 0,
    };

    const rating = calculatePasserRating(stats);
    // Should be a good rating (90-110 range)
    expect(rating).toBeGreaterThan(85);
    expect(rating).toBeLessThan(120);
  });

  it('should penalize interceptions', () => {
    const goodStats: PassingStats = {
      attempts: 30,
      completions: 20,
      yards: 200,
      touchdowns: 2,
      interceptions: 0,
      sacks: 0,
      sackYardsLost: 0,
      longestPass: 30,
      rating: 0,
    };

    const badStats: PassingStats = {
      ...goodStats,
      interceptions: 3,
    };

    const goodRating = calculatePasserRating(goodStats);
    const badRating = calculatePasserRating(badStats);

    expect(goodRating).toBeGreaterThan(badRating);
  });
});

describe('createEmptyPlayerGameStats', () => {
  it('should create stats with all zeros', () => {
    const stats = createEmptyPlayerGameStats('player-1');

    expect(stats.playerId).toBe('player-1');
    expect(stats.passing.attempts).toBe(0);
    expect(stats.rushing.yards).toBe(0);
    expect(stats.receiving.receptions).toBe(0);
    expect(stats.defensive.tackles).toBe(0);
    expect(stats.kicking.fieldGoalsMade).toBe(0);
    expect(stats.snapsPlayed).toBe(0);
  });
});

describe('createEmptyTeamGameStats', () => {
  it('should create stats with all zeros', () => {
    const stats = createEmptyTeamGameStats('team-1');

    expect(stats.teamId).toBe('team-1');
    expect(stats.score).toBe(0);
    expect(stats.totalYards).toBe(0);
    expect(stats.turnovers).toBe(0);
    expect(stats.penalties).toBe(0);
    expect(stats.firstDowns).toBe(0);
    expect(stats.playerStats.size).toBe(0);
  });

  it('should have 4 quarters initialized to 0', () => {
    const stats = createEmptyTeamGameStats('team-1');

    expect(stats.scoreByQuarter).toHaveLength(4);
    expect(stats.scoreByQuarter.every((q) => q === 0)).toBe(true);
  });
});
