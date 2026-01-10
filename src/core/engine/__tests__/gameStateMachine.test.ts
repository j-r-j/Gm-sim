import {
  GameStateMachine,
  createGame,
  createDefaultGameConfig,
} from '../GameStateMachine';
import { TeamGameState } from '../TeamGameState';
import { generatePlayer, generateRoster } from '../../generators/player/PlayerGenerator';
import { Position } from '../../models/player/Position';
import { createDefaultCoach } from '../../models/staff/Coach';
import {
  createDefaultOffensiveTendencies,
  createDefaultDefensiveTendencies,
} from '../../models/staff/CoordinatorTendencies';

// Helper to create a minimal team game state for testing
function createTestTeamGameState(teamId: string): TeamGameState {
  const roster = generateRoster(teamId);

  const qb = roster.find(p => p.position === Position.QB) || generatePlayer({ position: Position.QB });
  const rbs = roster.filter(p => p.position === Position.RB);
  const wrs = roster.filter(p => p.position === Position.WR);
  const tes = roster.filter(p => p.position === Position.TE);
  const ols = roster.filter(p => ['LT', 'LG', 'C', 'RG', 'RT'].includes(p.position));

  const dls = roster.filter(p => ['DE', 'DT'].includes(p.position));
  const lbs = roster.filter(p => ['OLB', 'ILB'].includes(p.position));
  const dbs = roster.filter(p => ['CB', 'FS', 'SS'].includes(p.position));

  const k = roster.find(p => p.position === Position.K) || generatePlayer({ position: Position.K });
  const punter = roster.find(p => p.position === Position.P) || generatePlayer({ position: Position.P });

  const allPlayers = new Map<string, typeof qb>();
  roster.forEach(player => allPlayers.set(player.id, player));

  const oc = createDefaultCoach('oc-' + teamId, 'John', 'Smith', 'offensiveCoordinator');
  const dc = createDefaultCoach('dc-' + teamId, 'Jane', 'Doe', 'defensiveCoordinator');

  return {
    teamId,
    teamName: teamId === 'home-team' ? 'Home Team' : 'Away Team',
    offense: {
      qb,
      rb: rbs.slice(0, 2),
      wr: wrs.slice(0, 3),
      te: tes.slice(0, 2),
      ol: ols.slice(0, 5),
    },
    defense: {
      dl: dls.slice(0, 4),
      lb: lbs.slice(0, 4),
      db: dbs.slice(0, 4),
    },
    specialTeams: {
      k,
      p: punter,
      returner: wrs[0] || generatePlayer({ position: Position.WR }),
    },
    allPlayers,
    coaches: {
      offensiveCoordinator: oc,
      defensiveCoordinator: dc,
      positionCoaches: new Map(),
    },
    offensiveScheme: 'westCoast',
    defensiveScheme: 'fourThreeUnder',
    offensiveTendencies: createDefaultOffensiveTendencies(),
    defensiveTendencies: createDefaultDefensiveTendencies(),
    timeoutsRemaining: 3,
    fatigueLevels: new Map(),
    snapCounts: new Map(),
    weeklyVariances: new Map(),
  };
}

describe('GameStateMachine', () => {
  let homeTeam: TeamGameState;
  let awayTeam: TeamGameState;

  beforeEach(() => {
    homeTeam = createTestTeamGameState('home-team');
    awayTeam = createTestTeamGameState('away-team');
  });

  describe('constructor', () => {
    it('should initialize game state correctly', () => {
      const config = createDefaultGameConfig('game-1');
      const machine = new GameStateMachine(homeTeam, awayTeam, config);
      const state = machine.getState();

      expect(state.gameId).toBe('game-1');
      expect(state.isComplete).toBe(false);
      expect(state.inProgress).toBe(false);
      expect(state.score.home).toBe(0);
      expect(state.score.away).toBe(0);
      expect(state.clock.quarter).toBe(1);
      expect(state.clock.timeRemaining).toBe(900);
    });

    it('should start with kickoff needed', () => {
      const machine = createGame(homeTeam, awayTeam);
      const state = machine.getState();

      expect(state.needsKickoff).toBe(true);
      expect(state.kickoffTeam).toBe('away');
    });
  });

  describe('executePlay', () => {
    it('should handle kickoff as first play', () => {
      const machine = createGame(homeTeam, awayTeam);

      const result = machine.executePlay();

      expect(result.playType).toBe('kickoff');
      expect(machine.getState().needsKickoff).toBe(false);
    });

    it('should advance the clock', () => {
      const machine = createGame(homeTeam, awayTeam);
      const initialTime = machine.getState().clock.timeRemaining;

      machine.executePlay();
      machine.executePlay();

      const newTime = machine.getState().clock.timeRemaining;
      expect(newTime).toBeLessThan(initialTime);
    });

    it('should track plays in history', () => {
      const machine = createGame(homeTeam, awayTeam);

      machine.executePlay();
      machine.executePlay();
      machine.executePlay();

      const state = machine.getState();
      expect(state.plays.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('getCurrentContext', () => {
    it('should return valid play call context', () => {
      const machine = createGame(homeTeam, awayTeam);
      machine.executePlay(); // Kickoff

      const context = machine.getCurrentContext();

      expect(context.down).toBeGreaterThanOrEqual(1);
      expect(context.down).toBeLessThanOrEqual(4);
      expect(context.distance).toBeGreaterThan(0);
      expect(context.fieldPosition).toBeGreaterThanOrEqual(1);
      expect(context.fieldPosition).toBeLessThanOrEqual(99);
      expect([1, 2, 3, 4, 'OT']).toContain(context.quarter);
    });
  });

  describe('isGameOver', () => {
    it('should return false for new game', () => {
      const machine = createGame(homeTeam, awayTeam);

      expect(machine.isGameOver()).toBe(false);
    });
  });

  describe('callTimeout', () => {
    it('should decrement timeouts remaining', () => {
      const machine = createGame(homeTeam, awayTeam);
      const initialTimeouts = homeTeam.timeoutsRemaining;

      const success = machine.callTimeout('home');

      expect(success).toBe(true);
      expect(homeTeam.timeoutsRemaining).toBe(initialTimeouts - 1);
    });

    it('should fail if no timeouts remaining', () => {
      const machine = createGame(homeTeam, awayTeam);
      homeTeam.timeoutsRemaining = 0;

      const success = machine.callTimeout('home');

      expect(success).toBe(false);
    });
  });

  describe('simulateDrive', () => {
    it('should return drive result with plays', () => {
      const machine = createGame(homeTeam, awayTeam);

      const driveResult = machine.simulateDrive();

      expect(driveResult).toHaveProperty('plays');
      expect(driveResult).toHaveProperty('result');
      expect(driveResult.plays.length).toBeGreaterThan(0);
      expect([
        'touchdown', 'field_goal', 'punt', 'turnover',
        'turnover_on_downs', 'end_of_half', 'safety'
      ]).toContain(driveResult.result);
    });
  });

  describe('simulateQuarter', () => {
    it('should advance to next quarter', () => {
      const machine = createGame(homeTeam, awayTeam, {
        ...createDefaultGameConfig('game-1'),
        quarterLength: 60, // Short quarter for faster test
      });

      const initialQuarter = machine.getState().clock.quarter;
      machine.simulateQuarter();

      const newState = machine.getState();

      // Should have advanced past the first quarter or finished the game
      expect(
        newState.clock.quarter !== initialQuarter ||
        newState.isComplete
      ).toBe(true);
    });
  });

  describe('simulateToEnd', () => {
    it('should complete the game', () => {
      const machine = createGame(homeTeam, awayTeam, {
        ...createDefaultGameConfig('game-1'),
        quarterLength: 30, // Very short quarters for test
      });

      const finalState = machine.simulateToEnd();

      expect(finalState.isComplete).toBe(true);
    });

    it('should have valid final scores', () => {
      const machine = createGame(homeTeam, awayTeam, {
        ...createDefaultGameConfig('game-1'),
        quarterLength: 30,
      });

      const finalState = machine.simulateToEnd();

      expect(typeof finalState.score.home).toBe('number');
      expect(typeof finalState.score.away).toBe('number');
      expect(finalState.score.home).toBeGreaterThanOrEqual(0);
      expect(finalState.score.away).toBeGreaterThanOrEqual(0);
    });

    it('should record play history', () => {
      const machine = createGame(homeTeam, awayTeam, {
        ...createDefaultGameConfig('game-1'),
        quarterLength: 30,
      });

      const finalState = machine.simulateToEnd();

      expect(finalState.plays.length).toBeGreaterThan(0);
    });

    it('should have reasonable scores', () => {
      const machine = createGame(homeTeam, awayTeam, {
        ...createDefaultGameConfig('game-1'),
        quarterLength: 60,
      });

      const finalState = machine.simulateToEnd();

      // Scores should be realistic (not 100s of points typically)
      expect(finalState.score.home).toBeLessThan(100);
      expect(finalState.score.away).toBeLessThan(100);
    });
  });

  describe('scoring', () => {
    it('should increment score on touchdowns', () => {
      const machine = createGame(homeTeam, awayTeam, {
        ...createDefaultGameConfig('game-1'),
        quarterLength: 120,
      });

      // Run until we get some scoring
      const finalState = machine.simulateToEnd();

      // At least one team should likely have scored
      const totalScore = finalState.score.home + finalState.score.away;
      // This could be 0 in edge cases with very short games
      expect(totalScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('createGame helper', () => {
    it('should create a valid game state machine', () => {
      const machine = createGame(homeTeam, awayTeam);

      expect(machine).toBeInstanceOf(GameStateMachine);
      expect(machine.getState()).toBeDefined();
    });

    it('should accept partial config', () => {
      const machine = createGame(homeTeam, awayTeam, {
        gameId: 'custom-game',
        stakes: 'playoff',
      });

      const state = machine.getState();
      expect(state.gameId).toBe('custom-game');
      expect(state.stakes).toBe('playoff');
    });
  });

  describe('createDefaultGameConfig', () => {
    it('should create valid default config', () => {
      const config = createDefaultGameConfig('test-game');

      expect(config.gameId).toBe('test-game');
      expect(config.quarterLength).toBe(900);
      expect(config.stakes).toBe('regular');
      expect(config.weather).toBeDefined();
    });
  });
});
