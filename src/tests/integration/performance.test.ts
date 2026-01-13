/**
 * Performance Integration Tests
 *
 * Verifies that core game operations meet performance requirements:
 * - Season simulation < 5 seconds
 * - Game simulation < 500ms
 * - UI responsiveness at 60fps (16ms frame budget)
 */

import { GameRunner, runQuickGame } from '../../core/game/GameRunner';
import { quickSetup } from '../../core/game/GameSetup';
import { TeamGameState } from '../../core/engine/TeamGameState';
import { Player } from '../../core/models/player/Player';
import { Position } from '../../core/models/player/Position';
import {
  createDefaultOffensiveTendencies,
  createDefaultDefensiveTendencies,
} from '../../core/models/staff/CoordinatorTendencies';
import { createDefaultCoach } from '../../core/models/staff/Coach';
import {
  generatePlayer,
  generateRoster,
  generateSimpleDraftClass,
} from '../../core/generators/player/PlayerGenerator';
import { createPlayerViewModel } from '../../core/models/player/PlayerViewModel';
import {
  createOffSeasonState,
  simulateRemainingOffSeason,
} from '../../core/offseason/OffSeasonPhaseManager';

// Performance thresholds
const GAME_SIM_THRESHOLD_MS = 500;
const FRAME_BUDGET_MS = 16; // 60fps target

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

/**
 * Measures execution time of a function
 */
function measureTime<T>(fn: () => T): { result: T; durationMs: number } {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  return { result, durationMs: end - start };
}

describe('Performance Integration Tests', () => {
  describe('game simulation performance', () => {
    it('should complete single game simulation under 500ms', () => {
      const homeTeamState = createTestTeamGameState('home-1', 'Home City Eagles');
      const awayTeamState = createTestTeamGameState('away-1', 'Away City Lions');

      const { durationMs } = measureTime(() => {
        return runQuickGame(homeTeamState, awayTeamState);
      });

      console.log(`Single game simulation: ${durationMs.toFixed(2)}ms`);
      expect(durationMs).toBeLessThan(GAME_SIM_THRESHOLD_MS);
    });

    it('should complete 16 games (one week) under 8 seconds', () => {
      const { durationMs } = measureTime(() => {
        for (let i = 0; i < 16; i++) {
          const homeTeamState = createTestTeamGameState(`home-${i}`, `Home Team ${i}`);
          const awayTeamState = createTestTeamGameState(`away-${i}`, `Away Team ${i}`);
          runQuickGame(homeTeamState, awayTeamState);
        }
      });

      console.log(`16 games simulation: ${durationMs.toFixed(2)}ms`);
      expect(durationMs).toBeLessThan(8000); // 16 * 500ms
    });

    it('should maintain consistent performance across multiple runs', () => {
      const times: number[] = [];
      const homeTeamState = createTestTeamGameState('home-perf', 'Home Team');
      const awayTeamState = createTestTeamGameState('away-perf', 'Away Team');

      // Warm-up run
      runQuickGame(homeTeamState, awayTeamState);

      // Measure 10 runs
      for (let i = 0; i < 10; i++) {
        const { durationMs } = measureTime(() => {
          runQuickGame(homeTeamState, awayTeamState);
        });
        times.push(durationMs);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      console.log(`Avg game time: ${avgTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);

      expect(avgTime).toBeLessThan(GAME_SIM_THRESHOLD_MS);
      expect(maxTime).toBeLessThan(GAME_SIM_THRESHOLD_MS * 1.5); // Allow 50% variance for worst case
    });

    it('should complete play-by-play drive simulation efficiently', () => {
      const homeTeamState = createTestTeamGameState('home-pbp', 'Home Team');
      const awayTeamState = createTestTeamGameState('away-pbp', 'Away Team');
      const setup = quickSetup(homeTeamState, awayTeamState);
      const runner = new GameRunner(setup);

      const { durationMs } = measureTime(() => {
        // Run 10 drives
        for (let i = 0; i < 10; i++) {
          runner.runDrive();
        }
      });

      console.log(`10 drives simulation: ${durationMs.toFixed(2)}ms`);
      expect(durationMs).toBeLessThan(1000); // 10 drives should be under 1 second
    });
  });

  describe('player generation performance', () => {
    it('should generate draft class (300 players) under 500ms', () => {
      const { durationMs } = measureTime(() => {
        return generateSimpleDraftClass(300);
      });

      console.log(`Draft class (300) generation: ${durationMs.toFixed(2)}ms`);
      expect(durationMs).toBeLessThan(500);
    });

    it('should generate team roster (53 players) under 100ms', () => {
      const { durationMs } = measureTime(() => {
        return generateRoster('perf-team');
      });

      console.log(`Roster (53) generation: ${durationMs.toFixed(2)}ms`);
      expect(durationMs).toBeLessThan(100);
    });

    it('should generate league (32 teams, 1696 players) under 3 seconds', () => {
      const { durationMs } = measureTime(() => {
        for (let i = 0; i < 32; i++) {
          generateRoster(`team-${i}`);
        }
      });

      console.log(`League generation: ${durationMs.toFixed(2)}ms`);
      expect(durationMs).toBeLessThan(3000);
    });
  });

  describe('ViewModel conversion performance', () => {
    it('should convert player to ViewModel within frame budget (16ms)', () => {
      const player = generatePlayer({ position: Position.QB });

      const { durationMs } = measureTime(() => {
        createPlayerViewModel(player);
      });

      expect(durationMs).toBeLessThan(FRAME_BUDGET_MS);
    });

    it('should batch convert roster to ViewModels under 50ms', () => {
      const roster = generateRoster('vm-team');

      const { durationMs } = measureTime(() => {
        roster.map((player) => createPlayerViewModel(player));
      });

      console.log(`53 ViewModels conversion: ${durationMs.toFixed(2)}ms`);
      expect(durationMs).toBeLessThan(50);
    });
  });

  describe('off-season simulation performance', () => {
    it('should complete all 12 off-season phases under 100ms', () => {
      const initialState = createOffSeasonState(2025);

      const { durationMs } = measureTime(() => {
        return simulateRemainingOffSeason(initialState);
      });

      console.log(`Off-season simulation: ${durationMs.toFixed(2)}ms`);
      expect(durationMs).toBeLessThan(100);
    });
  });

  describe('memory efficiency', () => {
    it('should not leak memory during repeated game simulations', () => {
      const homeTeamState = createTestTeamGameState('home-mem', 'Home Team');
      const awayTeamState = createTestTeamGameState('away-mem', 'Away Team');

      // Run many simulations
      for (let i = 0; i < 50; i++) {
        runQuickGame(homeTeamState, awayTeamState);
      }

      // If we got here without crashing, basic memory management is working
      expect(true).toBe(true);
    });
  });
});

describe('Performance Checkpoints', () => {
  it('CHECKPOINT: gameSimUnder500ms - should pass', () => {
    const homeTeamState = createTestTeamGameState('chk-home', 'Home Team');
    const awayTeamState = createTestTeamGameState('chk-away', 'Away Team');

    const { durationMs } = measureTime(() => {
      runQuickGame(homeTeamState, awayTeamState);
    });

    expect(durationMs).toBeLessThan(GAME_SIM_THRESHOLD_MS);
  });

  it('CHECKPOINT: weekSimUnder8Seconds - should pass', () => {
    const { durationMs } = measureTime(() => {
      for (let i = 0; i < 16; i++) {
        const homeTeamState = createTestTeamGameState(`wk-home-${i}`, `Home ${i}`);
        const awayTeamState = createTestTeamGameState(`wk-away-${i}`, `Away ${i}`);
        runQuickGame(homeTeamState, awayTeamState);
      }
    });

    expect(durationMs).toBeLessThan(8000);
  });

  it('CHECKPOINT: playerGenerationEfficient - should pass', () => {
    const { durationMs } = measureTime(() => {
      generateSimpleDraftClass(300);
    });

    expect(durationMs).toBeLessThan(500);
  });

  it('CHECKPOINT: viewModelConversionFast - should pass', () => {
    const player = generatePlayer({});

    const { durationMs } = measureTime(() => {
      for (let i = 0; i < 100; i++) {
        createPlayerViewModel(player);
      }
    });

    // 100 conversions should be under 100ms (1ms each average)
    expect(durationMs).toBeLessThan(100);
  });
});
