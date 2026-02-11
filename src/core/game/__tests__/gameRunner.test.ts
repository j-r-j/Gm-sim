/**
 * Game Runner Tests
 */

import { GameRunner, runQuickGame, GameResult } from '../GameRunner';
import { quickSetup, GameSetupResult } from '../GameSetup';
import { TeamGameState } from '../../engine/TeamGameState';
import { Player } from '../../models/player/Player';
import { Position } from '../../models/player/Position';
import {
  createDefaultOffensiveTendencies,
  createDefaultDefensiveTendencies,
} from '../../models/staff/CoordinatorTendencies';
import { createDefaultCoach } from '../../models/staff/Coach';

// Helper function to create a test player
function createTestPlayer(
  id: string,
  position: Position,
  firstName: string,
  lastName: string
): Player {
  return {
    id,
    firstName,
    lastName,
    position,
    age: 25,
    experience: 3,
    physical: {
      height: 72,
      weight: 200,
      armLength: 32,
      handSize: 9.5,
      wingspan: 76,
      speed: 4.6,
      acceleration: 75,
      agility: 75,
      strength: 75,
      verticalJump: 34,
    },
    skills: {
      accuracy: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      mobility: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      vision: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      tackling: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      catching: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      routeRunning: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      blocking: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      passBlock: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      runBlock: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      passRush: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      runDefense: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      manCoverage: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      zoneCoverage: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      kickPower: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      kickAccuracy: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      tracking: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
    },
    hiddenTraits: { positive: [], negative: [], revealedToUser: [] },
    itFactor: { value: 50 },
    consistency: { tier: 'average', currentStreak: 'neutral', streakGamesRemaining: 0 },
    schemeFits: {
      offensive: {
        westCoast: 'good',
        airRaid: 'good',
        spreadOption: 'good',
        powerRun: 'good',
        zoneRun: 'good',
        playAction: 'good',
      },
      defensive: {
        fourThreeUnder: 'good',
        threeFour: 'good',
        coverThree: 'good',
        coverTwo: 'good',
        manPress: 'good',
        blitzHeavy: 'good',
      },
    },
    roleFit: { ceiling: 'solidStarter', currentRole: 'solidStarter', roleEffectiveness: 75 },
    contractId: null,
    injuryStatus: {
      severity: 'none',
      type: 'none',
      weeksRemaining: 0,
      isPublic: true,
      lingeringEffect: 0,
    },
    fatigue: 0,
    morale: 75,
    collegeId: 'college-1',
    draftYear: 2020,
    draftRound: 3,
    draftPick: 80,
  };
}

// Helper to create a minimal team game state for testing
function createTestTeamGameState(teamId: string, teamName: string): TeamGameState {
  const qb = createTestPlayer('qb-' + teamId, Position.QB, 'John', 'Quarterback');
  const rb1 = createTestPlayer('rb1-' + teamId, Position.RB, 'Mike', 'Runner');
  const rb2 = createTestPlayer('rb2-' + teamId, Position.RB, 'Steve', 'Backup');
  const wr1 = createTestPlayer('wr1-' + teamId, Position.WR, 'Tom', 'Receiver1');
  const wr2 = createTestPlayer('wr2-' + teamId, Position.WR, 'Jerry', 'Receiver2');
  const wr3 = createTestPlayer('wr3-' + teamId, Position.WR, 'Larry', 'Receiver3');
  const te1 = createTestPlayer('te1-' + teamId, Position.TE, 'Rob', 'TightEnd1');
  const te2 = createTestPlayer('te2-' + teamId, Position.TE, 'Travis', 'TightEnd2');
  const lt = createTestPlayer('lt-' + teamId, Position.LT, 'Tyron', 'Tackle');
  const lg = createTestPlayer('lg-' + teamId, Position.LG, 'Zack', 'Guard1');
  const c = createTestPlayer('c-' + teamId, Position.C, 'Jason', 'Center');
  const rg = createTestPlayer('rg-' + teamId, Position.RG, 'Quenton', 'Guard2');
  const rt = createTestPlayer('rt-' + teamId, Position.RT, 'Lane', 'Tackle2');

  const de1 = createTestPlayer('de1-' + teamId, Position.DE, 'Myles', 'End1');
  const de2 = createTestPlayer('de2-' + teamId, Position.DE, 'Nick', 'End2');
  const dt1 = createTestPlayer('dt1-' + teamId, Position.DT, 'Aaron', 'Tackle3');
  const dt2 = createTestPlayer('dt2-' + teamId, Position.DT, 'Chris', 'Tackle4');
  const olb1 = createTestPlayer('olb1-' + teamId, Position.OLB, 'TJ', 'Backer1');
  const olb2 = createTestPlayer('olb2-' + teamId, Position.OLB, 'Micah', 'Backer2');
  const ilb1 = createTestPlayer('ilb1-' + teamId, Position.ILB, 'Fred', 'Backer3');
  const ilb2 = createTestPlayer('ilb2-' + teamId, Position.ILB, 'Bobby', 'Backer4');
  const cb1 = createTestPlayer('cb1-' + teamId, Position.CB, 'Jalen', 'Corner1');
  const cb2 = createTestPlayer('cb2-' + teamId, Position.CB, 'Sauce', 'Corner2');
  const cb3 = createTestPlayer('cb3-' + teamId, Position.CB, 'Pat', 'Corner3');
  const fs = createTestPlayer('fs-' + teamId, Position.FS, 'Jessie', 'Safety1');
  const ss = createTestPlayer('ss-' + teamId, Position.SS, 'Derwin', 'Safety2');

  const k = createTestPlayer('k-' + teamId, Position.K, 'Justin', 'Kicker');
  const p = createTestPlayer('p-' + teamId, Position.P, 'Tommy', 'Punter');

  const allPlayers = new Map<string, Player>();
  [
    qb,
    rb1,
    rb2,
    wr1,
    wr2,
    wr3,
    te1,
    te2,
    lt,
    lg,
    c,
    rg,
    rt,
    de1,
    de2,
    dt1,
    dt2,
    olb1,
    olb2,
    ilb1,
    ilb2,
    cb1,
    cb2,
    cb3,
    fs,
    ss,
    k,
    p,
  ].forEach((p) => {
    allPlayers.set(p.id, p);
  });

  return {
    teamId,
    teamName,
    offense: {
      qb,
      rb: [rb1, rb2],
      wr: [wr1, wr2, wr3],
      te: [te1, te2],
      ol: [lt, lg, c, rg, rt],
    },
    defense: {
      dl: [de1, de2, dt1, dt2],
      lb: [olb1, olb2, ilb1, ilb2],
      db: [cb1, cb2, cb3, fs, ss],
    },
    specialTeams: {
      k,
      p,
      returner: wr1,
    },
    allPlayers,
    coaches: {
      offensiveCoordinator: createDefaultCoach(
        'oc-' + teamId,
        'Offensive',
        'Coordinator',
        'offensiveCoordinator'
      ),
      defensiveCoordinator: createDefaultCoach(
        'dc-' + teamId,
        'Defensive',
        'Coordinator',
        'defensiveCoordinator'
      ),
      positionCoaches: new Map(),
    },
    offensiveScheme: 'westCoast',
    defensiveScheme: 'coverThree',
    offensiveTendencies: createDefaultOffensiveTendencies(),
    defensiveTendencies: createDefaultDefensiveTendencies(),
    timeoutsRemaining: 3,
    fatigueLevels: new Map(),
    snapCounts: new Map(),
    weeklyVariances: new Map(),
  };
}

describe('GameRunner', () => {
  let homeTeamState: TeamGameState;
  let awayTeamState: TeamGameState;
  let setup: GameSetupResult;

  beforeEach(() => {
    homeTeamState = createTestTeamGameState('home-1', 'Home City Eagles');
    awayTeamState = createTestTeamGameState('away-1', 'Away City Lions');
    setup = quickSetup(homeTeamState, awayTeamState);
  });

  describe('constructor', () => {
    it('should create a game runner without errors', () => {
      const runner = new GameRunner(setup);
      expect(runner).toBeDefined();
    });
  });

  describe('runToCompletion', () => {
    it('should complete a game and return a result', () => {
      const runner = new GameRunner(setup);
      const result = runner.runToCompletion();

      expect(result).toBeDefined();
      expect(result.gameId).toBeDefined();
      expect(typeof result.homeScore).toBe('number');
      expect(typeof result.awayScore).toBe('number');
    });

    it('should determine a winner or tie', () => {
      const runner = new GameRunner(setup);
      const result = runner.runToCompletion();

      if (result.isTie) {
        expect(result.winnerId).toBe('');
        expect(result.loserId).toBe('');
      } else {
        expect(result.winnerId).toBeTruthy();
        expect(result.loserId).toBeTruthy();
        expect(result.winnerId).not.toBe(result.loserId);
      }
    });

    it('should generate a valid box score', () => {
      const runner = new GameRunner(setup);
      const result = runner.runToCompletion();

      expect(result.boxScore).toBeDefined();
      expect(result.boxScore.homeTeam).toBeDefined();
      expect(result.boxScore.awayTeam).toBeDefined();
      expect(result.boxScore.homeTeam.score).toBe(result.homeScore);
      expect(result.boxScore.awayTeam.score).toBe(result.awayScore);
    });

    it('should collect key plays', () => {
      const runner = new GameRunner(setup);
      const result = runner.runToCompletion();

      expect(result.keyPlays).toBeDefined();
      expect(Array.isArray(result.keyPlays)).toBe(true);
    });

    it('should track scoring plays', () => {
      const runner = new GameRunner(setup);
      const result = runner.runToCompletion();

      if (result.homeScore > 0 || result.awayScore > 0) {
        expect(result.boxScore.scoringSummary.length).toBeGreaterThan(0);
      }
    });
  });

  describe('runNextPlay', () => {
    it('should run a single play and return result', () => {
      const runner = new GameRunner(setup);
      const { play, state, isComplete } = runner.runNextPlay();

      expect(play).toBeDefined();
      expect(state).toBeDefined();
      expect(typeof isComplete).toBe('boolean');
    });

    it('should advance game state', () => {
      const runner = new GameRunner(setup);
      const initialState = runner.getCurrentState();
      const initialPlays = initialState.plays.length;

      runner.runNextPlay();

      const newState = runner.getCurrentState();
      expect(newState.plays.length).toBeGreaterThan(initialPlays);
    });
  });

  describe('runDrive', () => {
    it('should run a complete drive', () => {
      const runner = new GameRunner(setup);
      const { plays, state, isComplete } = runner.runDrive();

      expect(plays).toBeDefined();
      expect(plays.length).toBeGreaterThan(0);
      expect(state).toBeDefined();
      expect(typeof isComplete).toBe('boolean');
    });
  });

  describe('runQuarter', () => {
    it('should run a complete quarter', () => {
      const runner = new GameRunner(setup);
      const { plays, state, isComplete } = runner.runQuarter();

      expect(plays).toBeDefined();
      expect(state).toBeDefined();
      // Quarter should advance (or game should end)
      expect(state.clock.quarter !== 1 || isComplete || state.clock.timeRemaining < 900).toBe(true);
    });
  });

  describe('getBoxScore', () => {
    it('should return current box score mid-game', () => {
      const runner = new GameRunner(setup);
      runner.runDrive();

      const boxScore = runner.getBoxScore();

      expect(boxScore).toBeDefined();
      expect(boxScore.gameId).toBeDefined();
      expect(boxScore.homeTeam).toBeDefined();
      expect(boxScore.awayTeam).toBeDefined();
    });
  });

  describe('callbacks', () => {
    it('should call onPlayComplete callback', () => {
      const onPlayComplete = jest.fn();
      const runner = new GameRunner(setup, { mode: 'playByPlay', onPlayComplete });

      runner.runNextPlay();

      expect(onPlayComplete).toHaveBeenCalled();
    });

    it('should call onScoreChange callback when score changes', () => {
      const onScoreChange = jest.fn();
      const runner = new GameRunner(setup, { mode: 'playByPlay', onScoreChange });

      // Run until a score happens (may not happen in one play)
      runner.runToCompletion();

      // If there was scoring, callback should have been called
      const result = runner.getBoxScore();
      if (result.homeTeam.score > 0 || result.awayTeam.score > 0) {
        expect(onScoreChange).toHaveBeenCalled();
      }
    });
  });
});

describe('runQuickGame', () => {
  it('should run a complete game with minimal setup', () => {
    const homeTeamState = createTestTeamGameState('home-1', 'Home City Eagles');
    const awayTeamState = createTestTeamGameState('away-1', 'Away City Lions');

    const result = runQuickGame(homeTeamState, awayTeamState);

    expect(result).toBeDefined();
    expect(result.homeTeamId).toBe('home-1');
    expect(result.awayTeamId).toBe('away-1');
    expect(typeof result.homeScore).toBe('number');
    expect(typeof result.awayScore).toBe('number');
  });

  it('should accept optional week and playoff parameters', () => {
    const homeTeamState = createTestTeamGameState('home-1', 'Home City Eagles');
    const awayTeamState = createTestTeamGameState('away-1', 'Away City Lions');

    const result = runQuickGame(homeTeamState, awayTeamState, { week: 15, isPlayoff: true });

    expect(result.week).toBe(15);
  });
});

describe('GameResult structure', () => {
  it('should not expose internal engine data', () => {
    const homeTeamState = createTestTeamGameState('home-1', 'Home City Eagles');
    const awayTeamState = createTestTeamGameState('away-1', 'Away City Lions');

    const result = runQuickGame(homeTeamState, awayTeamState);
    const serialized = JSON.stringify(result);

    // These internal values should NOT appear in the result
    expect(serialized).not.toContain('effectiveRating');
    expect(serialized).not.toContain('probability');
    expect(serialized).not.toContain('rollValue');
  });

  it('should contain all expected fields', () => {
    const homeTeamState = createTestTeamGameState('home-1', 'Home City Eagles');
    const awayTeamState = createTestTeamGameState('away-1', 'Away City Lions');

    const result: GameResult = runQuickGame(homeTeamState, awayTeamState);

    expect(result.gameId).toBeDefined();
    expect(result.week).toBeDefined();
    expect(result.homeTeamId).toBeDefined();
    expect(result.awayTeamId).toBeDefined();
    expect(result.homeScore).toBeDefined();
    expect(result.awayScore).toBeDefined();
    expect(result.winnerId).toBeDefined();
    expect(result.loserId).toBeDefined();
    expect(typeof result.isTie).toBe('boolean');
    expect(result.homeStats).toBeDefined();
    expect(result.awayStats).toBeDefined();
    expect(result.boxScore).toBeDefined();
    expect(result.injuries).toBeDefined();
    expect(result.notableEvents).toBeDefined();
    expect(result.keyPlays).toBeDefined();
  });

  it('should have playerStats as Map instances with player data', () => {
    const homeTeamState = createTestTeamGameState('home-1', 'Home City Eagles');
    const awayTeamState = createTestTeamGameState('away-1', 'Away City Lions');

    const result = runQuickGame(homeTeamState, awayTeamState);

    // Verify playerStats are Maps (not plain objects)
    expect(result.homeStats.playerStats).toBeInstanceOf(Map);
    expect(result.awayStats.playerStats).toBeInstanceOf(Map);

    // Verify Maps contain player stats
    expect(result.homeStats.playerStats.size).toBeGreaterThan(0);
    expect(result.awayStats.playerStats.size).toBeGreaterThan(0);

    // Verify Map entries have correct structure
    for (const [playerId, stats] of result.homeStats.playerStats) {
      expect(typeof playerId).toBe('string');
      expect(stats.playerId).toBe(playerId);
      expect(stats.passing).toBeDefined();
      expect(stats.rushing).toBeDefined();
      expect(stats.receiving).toBeDefined();
      expect(stats.defensive).toBeDefined();
    }
  });

  it('should have playerStats that can be iterated with for...of', () => {
    const homeTeamState = createTestTeamGameState('home-1', 'Home City Eagles');
    const awayTeamState = createTestTeamGameState('away-1', 'Away City Lions');

    const result = runQuickGame(homeTeamState, awayTeamState);

    // This is the exact pattern used by updateSeasonStatsFromGame
    // If this fails, the skip button save will fail
    let iterationCount = 0;
    for (const [playerId, gameStats] of result.homeStats.playerStats) {
      expect(playerId).toBeDefined();
      expect(gameStats).toBeDefined();
      iterationCount++;
    }
    expect(iterationCount).toBeGreaterThan(0);

    iterationCount = 0;
    for (const [playerId, gameStats] of result.awayStats.playerStats) {
      expect(playerId).toBeDefined();
      expect(gameStats).toBeDefined();
      iterationCount++;
    }
    expect(iterationCount).toBeGreaterThan(0);
  });
});

describe('getResult', () => {
  it('should return same structure as runToCompletion', () => {
    const homeTeamState = createTestTeamGameState('home-1', 'Home City Eagles');
    const awayTeamState = createTestTeamGameState('away-1', 'Away City Lions');
    const setup = quickSetup(homeTeamState, awayTeamState);

    const runner = new GameRunner(setup);
    runner.runToCompletion();

    const result = runner.getResult();

    expect(result.homeStats.playerStats).toBeInstanceOf(Map);
    expect(result.awayStats.playerStats).toBeInstanceOf(Map);
    expect(result.homeStats.playerStats.size).toBeGreaterThan(0);
  });

  it('should return valid result after running plays individually', () => {
    const homeTeamState = createTestTeamGameState('home-1', 'Home City Eagles');
    const awayTeamState = createTestTeamGameState('away-1', 'Away City Lions');
    const setup = quickSetup(homeTeamState, awayTeamState);

    const runner = new GameRunner(setup);

    // Simulate skip behavior: run plays until complete
    while (!runner.getCurrentState().isComplete) {
      runner.runNextPlay();
      if (runner.getCurrentState().plays.length > 300) break;
    }

    // This is what handleGameComplete now calls
    const result = runner.getResult();

    expect(result.homeStats.playerStats).toBeInstanceOf(Map);
    expect(result.awayStats.playerStats).toBeInstanceOf(Map);
    expect(result.homeStats.playerStats.size).toBeGreaterThan(0);
    expect(result.awayStats.playerStats.size).toBeGreaterThan(0);
  });
});
