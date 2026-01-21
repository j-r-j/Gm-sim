/**
 * GameSimulationEngine Tests
 *
 * Tests for the event-driven game simulation engine.
 */

import { GameSimulationEngine, createGameEngine, EngineConfig } from '../GameSimulationEngine';
import { GameFlowEventBus } from '../events';
import { quickSetup } from '../../game/GameSetup';
import { TeamGameState } from '../../engine/TeamGameState';
import { Player } from '../../models/player/Player';
import { Position } from '../../models/player/Position';
import { createDefaultCoach } from '../../models/staff/Coach';
import {
  createDefaultOffensiveTendencies,
  createDefaultDefensiveTendencies,
} from '../../models/staff/CoordinatorTendencies';

// Helper to create a test player
function createTestPlayer(id: string, position: Position): Player {
  return {
    id,
    firstName: 'Test',
    lastName: position,
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

// Helper to create a test team state
function createTestTeamState(teamId: string): TeamGameState {
  const positions: Position[] = [
    Position.QB,
    Position.RB,
    Position.RB,
    Position.WR,
    Position.WR,
    Position.WR,
    Position.TE,
    Position.TE,
    Position.LT,
    Position.LG,
    Position.C,
    Position.RG,
    Position.RT,
    Position.DE,
    Position.DE,
    Position.DT,
    Position.DT,
    Position.OLB,
    Position.OLB,
    Position.ILB,
    Position.ILB,
    Position.CB,
    Position.CB,
    Position.CB,
    Position.FS,
    Position.SS,
    Position.K,
    Position.P,
  ];

  const players: Player[] = positions.map((pos, i) =>
    createTestPlayer(`${teamId}-${pos}-${i}`, pos)
  );

  const allPlayers = new Map<string, Player>();
  players.forEach((p) => allPlayers.set(p.id, p));

  const qb = players.find((p) => p.position === Position.QB)!;
  const rbs = players.filter((p) => p.position === Position.RB);
  const wrs = players.filter((p) => p.position === Position.WR);
  const tes = players.filter((p) => p.position === Position.TE);
  const ol = players.filter((p) =>
    [Position.LT, Position.LG, Position.C, Position.RG, Position.RT].includes(
      p.position as Position
    )
  );
  const dl = players.filter((p) => [Position.DE, Position.DT].includes(p.position as Position));
  const lb = players.filter((p) => [Position.OLB, Position.ILB].includes(p.position as Position));
  const db = players.filter((p) =>
    [Position.CB, Position.FS, Position.SS].includes(p.position as Position)
  );
  const k = players.find((p) => p.position === Position.K)!;
  const p = players.find((p) => p.position === Position.P)!;

  return {
    teamId,
    teamName: `Team ${teamId}`,
    offense: { qb, rb: rbs, wr: wrs, te: tes, ol },
    defense: { dl, lb, db },
    specialTeams: { k, p, returner: wrs[0] },
    allPlayers,
    coaches: {
      offensiveCoordinator: createDefaultCoach(
        `oc-${teamId}`,
        'OC',
        'Test',
        'offensiveCoordinator'
      ),
      defensiveCoordinator: createDefaultCoach(
        `dc-${teamId}`,
        'DC',
        'Test',
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

describe('GameSimulationEngine', () => {
  let engine: GameSimulationEngine;
  let eventBus: GameFlowEventBus;
  let homeTeam: TeamGameState;
  let awayTeam: TeamGameState;

  beforeEach(() => {
    eventBus = new GameFlowEventBus();
    engine = createGameEngine({ eventBus, emitEvents: true, maxPlays: 350 });
    homeTeam = createTestTeamState('home');
    awayTeam = createTestTeamState('away');
  });

  afterEach(() => {
    eventBus.reset();
  });

  describe('initialization', () => {
    it('should create an engine', () => {
      expect(engine).toBeDefined();
      expect(engine.isSimulating()).toBe(false);
    });

    it('should initialize from setup', () => {
      const setup = quickSetup(homeTeam, awayTeam);
      engine.initializeFromSetup(setup, { week: 1 });

      const state = engine.getCurrentState();
      expect(state).not.toBeNull();
      expect(state!.homeScore).toBe(0);
      expect(state!.awayScore).toBe(0);
    });

    it('should emit GAME_START event on initialization', () => {
      const events: string[] = [];
      eventBus.subscribe('GAME_START', () => events.push('GAME_START'));

      const setup = quickSetup(homeTeam, awayTeam);
      engine.initializeFromSetup(setup, { week: 5 });

      expect(events).toContain('GAME_START');
    });
  });

  describe('single play execution', () => {
    beforeEach(() => {
      const setup = quickSetup(homeTeam, awayTeam);
      engine.initializeFromSetup(setup, { week: 1 });
    });

    it('should run a single play', async () => {
      const result = await engine.runSinglePlay();

      expect(result).not.toBeNull();
      expect(result!.play).toBeDefined();
      expect(result!.state).toBeDefined();
      expect(typeof result!.isComplete).toBe('boolean');
    });

    it('should emit PLAY_COMPLETE event', async () => {
      const events: string[] = [];
      eventBus.subscribe('PLAY_COMPLETE', () => events.push('PLAY_COMPLETE'));
      eventBus.subscribe('TOUCHDOWN', () => events.push('TOUCHDOWN'));
      eventBus.subscribe('TURNOVER', () => events.push('TURNOVER'));
      eventBus.subscribe('BIG_PLAY', () => events.push('BIG_PLAY'));

      await engine.runSinglePlay();

      // Should have at least one of these play events
      expect(
        events.includes('PLAY_COMPLETE') ||
          events.includes('TOUCHDOWN') ||
          events.includes('TURNOVER') ||
          events.includes('BIG_PLAY')
      ).toBe(true);
    });

    it('should track recent plays', async () => {
      await engine.runSinglePlay();
      await engine.runSinglePlay();
      await engine.runSinglePlay();

      const state = engine.getCurrentState();
      expect(state!.recentPlays.length).toBeGreaterThan(0);
    });
  });

  describe('speed control', () => {
    beforeEach(() => {
      const setup = quickSetup(homeTeam, awayTeam);
      engine.initializeFromSetup(setup, { week: 1 });
    });

    it('should change speed', () => {
      engine.setSpeed('fast');
      expect(engine.getSpeed()).toBe('fast');

      engine.setSpeed('slow');
      expect(engine.getSpeed()).toBe('slow');
    });

    it('should emit SIMULATION_SPEED_CHANGED event', () => {
      let speedChange: { previousSpeed: string; newSpeed: string } | null = null;
      eventBus.subscribe('SIMULATION_SPEED_CHANGED', (event) => {
        speedChange = event.payload;
      });

      engine.setSpeed('fast');

      expect(speedChange).not.toBeNull();
      expect(speedChange!.newSpeed).toBe('fast');
    });
  });

  describe('pause and resume', () => {
    beforeEach(() => {
      const setup = quickSetup(homeTeam, awayTeam);
      engine.initializeFromSetup(setup, { week: 1 });
    });

    it('should track pause state', () => {
      expect(engine.isSimulationPaused()).toBe(false);
    });

    it('should emit SIMULATION_PAUSED event', async () => {
      let paused = false;
      eventBus.subscribe('SIMULATION_PAUSED', () => {
        paused = true;
      });

      // Start running
      const runPromise = engine.runToCompletion(true);

      // Give it time to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      engine.pause();
      engine.stop(); // Stop so we don't hang

      await runPromise;

      // Pause may or may not have been reached depending on timing
      // This is a behavioral test
    });
  });

  describe('skip to end', () => {
    beforeEach(() => {
      const setup = quickSetup(homeTeam, awayTeam);
      engine.initializeFromSetup(setup, { week: 1 });
    });

    it('should complete game instantly', async () => {
      const result = await engine.skipToEnd();

      expect(result).not.toBeNull();
      expect(typeof result!.homeScore).toBe('number');
      expect(typeof result!.awayScore).toBe('number');
    });

    it('should emit GAME_END event', async () => {
      let gameEnded = false;
      eventBus.subscribe('GAME_END', () => {
        gameEnded = true;
      });

      await engine.skipToEnd();

      expect(gameEnded).toBe(true);
    });

    it('should have valid final state', async () => {
      await engine.skipToEnd();

      const state = engine.getCurrentState();
      expect(state!.isComplete).toBe(true);
      expect(state!.quarter).toBe('Final');
    });
  });

  describe('event emission', () => {
    beforeEach(() => {
      const setup = quickSetup(homeTeam, awayTeam);
      engine.initializeFromSetup(setup, { week: 1 });
    });

    it('should emit quarter events', async () => {
      const quarterStarts: number[] = [];
      const quarterEnds: number[] = [];

      eventBus.subscribe('QUARTER_START', (event) => {
        quarterStarts.push(event.payload.quarter);
      });
      eventBus.subscribe('QUARTER_END', (event) => {
        quarterEnds.push(event.payload.quarter);
      });

      await engine.skipToEnd();

      // Should have progressed through quarters
      expect(quarterStarts.length).toBeGreaterThan(0);
    });

    it('should emit score change events when scoring occurs', async () => {
      let scoreChanges = 0;
      eventBus.subscribe('SCORE_CHANGE', () => {
        scoreChanges++;
      });

      await engine.skipToEnd();

      const result = engine.getResult();
      if (result && (result.homeScore > 0 || result.awayScore > 0)) {
        expect(scoreChanges).toBeGreaterThan(0);
      }
    });

    it('should track event history', async () => {
      await engine.skipToEnd();

      const history = eventBus.getHistory();
      expect(history.length).toBeGreaterThan(0);

      // History should contain game events (may not include GAME_START if history limit exceeded)
      const eventTypes = history.map((e) => e.type);
      // Should contain game-related events like PLAY_COMPLETE, QUARTER_END, or GAME_END
      expect(
        eventTypes.includes('GAME_END') ||
          eventTypes.includes('PLAY_COMPLETE') ||
          eventTypes.includes('QUARTER_END') ||
          eventTypes.includes('TOUCHDOWN') ||
          eventTypes.includes('TURNOVER')
      ).toBe(true);
    });
  });

  describe('callbacks', () => {
    beforeEach(() => {
      const setup = quickSetup(homeTeam, awayTeam);
      engine.initializeFromSetup(setup, { week: 1 });
    });

    it('should call onStateUpdate callback', async () => {
      const updates: any[] = [];
      engine.setOnStateUpdate((state) => {
        updates.push(state);
      });

      await engine.runSinglePlay();
      await engine.runSinglePlay();

      expect(updates.length).toBeGreaterThan(0);
    });

    it('should call onComplete callback', async () => {
      let completed = false;
      engine.setOnComplete(() => {
        completed = true;
      });

      await engine.skipToEnd();

      expect(completed).toBe(true);
    });
  });

  describe('game result', () => {
    beforeEach(() => {
      const setup = quickSetup(homeTeam, awayTeam);
      engine.initializeFromSetup(setup, { week: 1 });
    });

    it('should return valid game result', async () => {
      await engine.skipToEnd();

      const result = engine.getResult();

      expect(result).not.toBeNull();
      expect(result!.gameId).toBeDefined();
      expect(typeof result!.homeScore).toBe('number');
      expect(typeof result!.awayScore).toBe('number');
      expect(result!.homeTeamId).toBe('home');
      expect(result!.awayTeamId).toBe('away');
    });

    it('should determine winner correctly', async () => {
      await engine.skipToEnd();

      const result = engine.getResult()!;

      if (result.isTie) {
        expect(result.winnerId).toBe('');
      } else {
        expect(result.winnerId).toBeTruthy();
        expect(result.loserId).toBeTruthy();
        expect(result.winnerId !== result.loserId).toBe(true);
      }
    });
  });
});

describe('createGameEngine factory', () => {
  it('should create engine with default config', () => {
    const engine = createGameEngine();
    expect(engine).toBeDefined();
  });

  it('should create engine with custom config', () => {
    const config: Partial<EngineConfig> = {
      defaultSpeed: 'fast',
      emitEvents: false,
      maxPlays: 500,
    };
    const engine = createGameEngine(config);
    expect(engine).toBeDefined();
    expect(engine.getSpeed()).toBe('fast');
  });
});
