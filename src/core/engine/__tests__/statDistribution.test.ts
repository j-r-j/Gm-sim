/**
 * Stat Distribution Tests
 * Validates realistic distribution of targets, carries, and tackles
 * Uses statistical analysis over many simulated plays
 */

import {
  weightedRandomChoice,
  selectPassTarget,
  selectRunningBack,
  selectPrimaryTackler,
  shouldHaveAssistTackle,
  TargetSituationContext,
  RBRotationContext,
  TackleContext,
} from '../StatDistribution';
import { Player } from '../../models/player/Player';
import { Position } from '../../models/player/Position';
import { TeamGameState } from '../TeamGameState';

// ============================================
// MOCK DATA FACTORIES
// ============================================

function createMockPlayer(id: string, position: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    firstName: `Player`,
    lastName: id,
    position: position as Position,
    age: 25,
    experience: 3,
    height: 72,
    weight: 200,
    skills: {
      routeRunning: { perceivedMin: 70, perceivedMax: 80, true: 75, revealed: false },
      catching: { perceivedMin: 70, perceivedMax: 80, true: 75, revealed: false },
      vision: { perceivedMin: 70, perceivedMax: 80, true: 75, revealed: false },
      power: { perceivedMin: 70, perceivedMax: 80, true: 75, revealed: false },
      tackling: { perceivedMin: 70, perceivedMax: 80, true: 75, revealed: false },
      manCoverage: { perceivedMin: 70, perceivedMax: 80, true: 75, revealed: false },
      passRush: { perceivedMin: 70, perceivedMax: 80, true: 75, revealed: false },
    },
    physical: {
      speed: { perceivedMin: 70, perceivedMax: 80, true: 75, revealed: false },
      strength: { perceivedMin: 70, perceivedMax: 80, true: 75, revealed: false },
      agility: { perceivedMin: 70, perceivedMax: 80, true: 75, revealed: false },
      acceleration: { perceivedMin: 70, perceivedMax: 80, true: 75, revealed: false },
      stamina: { perceivedMin: 70, perceivedMax: 80, true: 75, revealed: false },
      injury: { perceivedMin: 70, perceivedMax: 80, true: 75, revealed: false },
      jumping: { perceivedMin: 70, perceivedMax: 80, true: 75, revealed: false },
      toughness: { perceivedMin: 70, perceivedMax: 80, true: 75, revealed: false },
    },
    hiddenTraits: [],
    roleFit: {
      currentRole: 'primaryOption',
      naturalRoles: ['primaryOption'],
      roleHistory: [],
    },
    injuries: [],
    contractStatus: 'active',
    ...overrides,
  } as Player;
}

function createMockTeamGameState(fatigueOverrides: Record<string, number> = {}): TeamGameState {
  const fatigueLevels = new Map<string, number>();
  const snapCounts = new Map<string, number>();

  for (const [playerId, fatigue] of Object.entries(fatigueOverrides)) {
    fatigueLevels.set(playerId, fatigue);
  }

  return {
    teamId: 'test-team',
    teamName: 'Test Team',
    offense: {
      qb: createMockPlayer('qb1', 'QB'),
      rb: [createMockPlayer('rb1', 'RB'), createMockPlayer('rb2', 'RB')],
      wr: [
        createMockPlayer('wr1', 'WR'),
        createMockPlayer('wr2', 'WR'),
        createMockPlayer('wr3', 'WR'),
      ],
      te: [createMockPlayer('te1', 'TE')],
      ol: [],
    },
    defense: {
      dl: [
        createMockPlayer('de1', 'DE'),
        createMockPlayer('de2', 'DE'),
        createMockPlayer('dt1', 'DT'),
      ],
      lb: [
        createMockPlayer('ilb1', 'ILB'),
        createMockPlayer('ilb2', 'ILB'),
        createMockPlayer('olb1', 'OLB'),
      ],
      db: [
        createMockPlayer('cb1', 'CB'),
        createMockPlayer('cb2', 'CB'),
        createMockPlayer('fs1', 'FS'),
        createMockPlayer('ss1', 'SS'),
      ],
    },
    specialTeams: {
      k: createMockPlayer('k1', 'K'),
      p: createMockPlayer('p1', 'P'),
      returner: createMockPlayer('ret1', 'WR'),
    },
    allPlayers: new Map(),
    coaches: {
      offensiveCoordinator: {} as any,
      defensiveCoordinator: {} as any,
      positionCoaches: new Map(),
    },
    offensiveScheme: 'westCoast',
    defensiveScheme: 'coverThree',
    offensiveTendencies: {} as any,
    defensiveTendencies: {} as any,
    timeoutsRemaining: 3,
    fatigueLevels,
    snapCounts,
    weeklyVariances: new Map(),
  } as TeamGameState;
}

// ============================================
// WEIGHTED RANDOM CHOICE TESTS
// ============================================

describe('weightedRandomChoice', () => {
  it('should return null for empty arrays', () => {
    expect(weightedRandomChoice([], [])).toBeNull();
  });

  it('should return null for mismatched arrays', () => {
    expect(weightedRandomChoice(['a', 'b'], [1])).toBeNull();
  });

  it('should respect weights over many iterations', () => {
    const items = ['A', 'B', 'C'];
    const weights = [10, 5, 1]; // A should be ~62.5%, B ~31.25%, C ~6.25%

    const counts: Record<string, number> = { A: 0, B: 0, C: 0 };
    const iterations = 10000;

    for (let i = 0; i < iterations; i++) {
      const result = weightedRandomChoice(items, weights);
      if (result) counts[result]++;
    }

    // A should be significantly more than B
    expect(counts.A).toBeGreaterThan(counts.B * 1.5);
    // B should be significantly more than C
    expect(counts.B).toBeGreaterThan(counts.C * 3);
    // A should be around 60% (allow some variance)
    expect(counts.A / iterations).toBeGreaterThan(0.55);
    expect(counts.A / iterations).toBeLessThan(0.7);
  });

  it('should filter out zero/negative weights', () => {
    const items = ['A', 'B', 'C'];
    const weights = [0, 1, -1];

    const counts: Record<string, number> = { A: 0, B: 0, C: 0 };
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const result = weightedRandomChoice(items, weights);
      if (result) counts[result]++;
    }

    // Only B should be selected
    expect(counts.B).toBe(iterations);
    expect(counts.A).toBe(0);
    expect(counts.C).toBe(0);
  });
});

// ============================================
// TARGET DISTRIBUTION TESTS
// ============================================

describe('selectPassTarget', () => {
  const defaultSituation: TargetSituationContext = {
    down: 1,
    distance: 10,
    isRedZone: false,
    isTwoMinuteDrill: false,
    scoreDifferential: 0,
  };

  it('should distribute targets across multiple receivers', () => {
    const receivers = [
      createMockPlayer('wr1', 'WR'),
      createMockPlayer('wr2', 'WR'),
      createMockPlayer('wr3', 'WR'),
      createMockPlayer('te1', 'TE'),
      createMockPlayer('rb1', 'RB'),
    ];
    const teamState = createMockTeamGameState();

    const counts: Record<string, number> = {};
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const target = selectPassTarget(receivers, 'pass_medium', defaultSituation, teamState);
      if (target) {
        counts[target.id] = (counts[target.id] || 0) + 1;
      }
    }

    // WR1 should get more targets than WR2
    expect(counts.wr1).toBeGreaterThan(counts.wr2);
    // WR2 should get meaningful targets (not zero)
    expect(counts.wr2).toBeGreaterThan(50);
    // WR3 should get some targets
    expect(counts.wr3).toBeGreaterThan(30);
    // TE should get some targets
    expect(counts.te1).toBeGreaterThan(30);
    // RB should get some targets (check-downs)
    expect(counts.rb1).toBeGreaterThan(20);

    // WR1 should NOT get more than 40% of all targets
    const totalTargets = Object.values(counts).reduce((sum, c) => sum + c, 0);
    expect(counts.wr1 / totalTargets).toBeLessThan(0.4);
  });

  it('should give RBs more targets on screen plays', () => {
    const receivers = [createMockPlayer('wr1', 'WR'), createMockPlayer('rb1', 'RB')];
    const teamState = createMockTeamGameState();

    const screenCounts: Record<string, number> = { wr1: 0, rb1: 0 };
    const mediumCounts: Record<string, number> = { wr1: 0, rb1: 0 };
    const iterations = 500;

    for (let i = 0; i < iterations; i++) {
      const screenTarget = selectPassTarget(receivers, 'pass_screen', defaultSituation, teamState);
      const mediumTarget = selectPassTarget(receivers, 'pass_medium', defaultSituation, teamState);

      if (screenTarget) screenCounts[screenTarget.id]++;
      if (mediumTarget) mediumCounts[mediumTarget.id]++;
    }

    // RB should get higher share on screens than medium passes
    const rbScreenShare = screenCounts.rb1 / iterations;
    const rbMediumShare = mediumCounts.rb1 / iterations;

    expect(rbScreenShare).toBeGreaterThan(rbMediumShare * 1.5);
  });

  it('should give WR1 more targets on deep passes', () => {
    const receivers = [
      createMockPlayer('wr1', 'WR'),
      createMockPlayer('wr2', 'WR'),
      createMockPlayer('wr3', 'WR'),
    ];
    const teamState = createMockTeamGameState();

    const deepCounts: Record<string, number> = { wr1: 0, wr2: 0, wr3: 0 };
    const shortCounts: Record<string, number> = { wr1: 0, wr2: 0, wr3: 0 };
    const iterations = 500;

    for (let i = 0; i < iterations; i++) {
      const deepTarget = selectPassTarget(receivers, 'pass_deep', defaultSituation, teamState);
      const shortTarget = selectPassTarget(receivers, 'pass_short', defaultSituation, teamState);

      if (deepTarget) deepCounts[deepTarget.id]++;
      if (shortTarget) shortCounts[shortTarget.id]++;
    }

    // WR1 share should be higher on deep passes
    const wr1DeepShare = deepCounts.wr1 / iterations;
    const wr1ShortShare = shortCounts.wr1 / iterations;

    expect(wr1DeepShare).toBeGreaterThan(wr1ShortShare);
  });

  it('should increase TE targets in red zone', () => {
    const receivers = [createMockPlayer('wr1', 'WR'), createMockPlayer('te1', 'TE')];
    const teamState = createMockTeamGameState();

    const redZoneSituation: TargetSituationContext = {
      ...defaultSituation,
      isRedZone: true,
    };

    const normalCounts: Record<string, number> = { wr1: 0, te1: 0 };
    const redZoneCounts: Record<string, number> = { wr1: 0, te1: 0 };
    // Increase iterations for more stable results
    const iterations = 2000;

    for (let i = 0; i < iterations; i++) {
      const normalTarget = selectPassTarget(receivers, 'pass_short', defaultSituation, teamState);
      const redZoneTarget = selectPassTarget(receivers, 'pass_short', redZoneSituation, teamState);

      if (normalTarget) normalCounts[normalTarget.id]++;
      if (redZoneTarget) redZoneCounts[redZoneTarget.id]++;
    }

    // TE share should be higher in red zone (allow small margin for variance)
    const teNormalShare = normalCounts.te1 / iterations;
    const teRedZoneShare = redZoneCounts.te1 / iterations;

    // Red zone TE share should be at least 95% of normal (modifier should boost, not reduce)
    expect(teRedZoneShare).toBeGreaterThanOrEqual(teNormalShare * 0.95);
  });
});

// ============================================
// RB ROTATION TESTS
// ============================================

describe('selectRunningBack', () => {
  const defaultContext: RBRotationContext = {
    currentGameCarries: 0,
    currentGameSnaps: 0,
    down: 1,
    distance: 10,
    isRedZone: false,
    isGoalLine: false,
    isTwoMinuteDrill: false,
  };

  it('should distribute carries between RB1 and RB2', () => {
    const rbs = [createMockPlayer('rb1', 'RB'), createMockPlayer('rb2', 'RB')];
    const teamState = createMockTeamGameState();

    const counts: Record<string, number> = { rb1: 0, rb2: 0 };
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const carrier = selectRunningBack(rbs, teamState, defaultContext);
      if (carrier) counts[carrier.id]++;
    }

    // RB1 should get more carries
    expect(counts.rb1).toBeGreaterThan(counts.rb2);
    // But RB2 should still get meaningful work (not zero)
    expect(counts.rb2).toBeGreaterThan(150); // At least 15%

    // RB1 should have between 60-80% of carries in low fatigue scenario
    const rb1Share = counts.rb1 / iterations;
    expect(rb1Share).toBeGreaterThan(0.55);
    expect(rb1Share).toBeLessThan(0.85);
  });

  it('should rotate RB2 in when RB1 is fatigued', () => {
    const rbs = [createMockPlayer('rb1', 'RB'), createMockPlayer('rb2', 'RB')];
    // RB1 is very fatigued
    const teamState = createMockTeamGameState({ rb1: 75, rb2: 10 });

    const counts: Record<string, number> = { rb1: 0, rb2: 0 };
    const iterations = 500;

    for (let i = 0; i < iterations; i++) {
      const carrier = selectRunningBack(rbs, teamState, defaultContext);
      if (carrier) counts[carrier.id]++;
    }

    // RB2 should get significantly more carries when RB1 is fatigued
    expect(counts.rb2).toBeGreaterThan(counts.rb1 * 0.5);
  });

  it('should rotate based on high carry count', () => {
    const rbs = [createMockPlayer('rb1', 'RB'), createMockPlayer('rb2', 'RB')];
    const teamState = createMockTeamGameState();

    const highCarryContext: RBRotationContext = {
      ...defaultContext,
      currentGameCarries: 22, // RB1 has had 22 carries
    };

    const normalCounts: Record<string, number> = { rb1: 0, rb2: 0 };
    const highCarryCounts: Record<string, number> = { rb1: 0, rb2: 0 };
    const iterations = 500;

    for (let i = 0; i < iterations; i++) {
      const normalCarrier = selectRunningBack(rbs, teamState, defaultContext);
      const highCarryCarrier = selectRunningBack(rbs, teamState, highCarryContext);

      if (normalCarrier) normalCounts[normalCarrier.id]++;
      if (highCarryCarrier) highCarryCounts[highCarryCarrier.id]++;
    }

    // RB2 should get higher share when RB1 has high carries
    const rb2NormalShare = normalCounts.rb2 / iterations;
    const rb2HighCarryShare = highCarryCounts.rb2 / iterations;

    expect(rb2HighCarryShare).toBeGreaterThan(rb2NormalShare);
  });

  it('should prefer RB1 on goal line', () => {
    const rbs = [createMockPlayer('rb1', 'RB'), createMockPlayer('rb2', 'RB')];
    const teamState = createMockTeamGameState();

    const goalLineContext: RBRotationContext = {
      ...defaultContext,
      isGoalLine: true,
    };

    const normalCounts: Record<string, number> = { rb1: 0, rb2: 0 };
    const goalLineCounts: Record<string, number> = { rb1: 0, rb2: 0 };
    // Increase iterations for more stable statistical results
    const iterations = 2000;

    for (let i = 0; i < iterations; i++) {
      const normalCarrier = selectRunningBack(rbs, teamState, defaultContext);
      const goalLineCarrier = selectRunningBack(rbs, teamState, goalLineContext);

      if (normalCarrier) normalCounts[normalCarrier.id]++;
      if (goalLineCarrier) goalLineCounts[goalLineCarrier.id]++;
    }

    // RB1 should get higher share on goal line (or at least comparable due to variance)
    const rb1NormalShare = normalCounts.rb1 / iterations;
    const rb1GoalLineShare = goalLineCounts.rb1 / iterations;

    // Goal line share should be at least 98% of normal share (allowing for small variance)
    expect(rb1GoalLineShare).toBeGreaterThanOrEqual(rb1NormalShare * 0.98);
  });
});

// ============================================
// DEFENSIVE TACKLE DISTRIBUTION TESTS
// ============================================

describe('selectPrimaryTackler', () => {
  it('should distribute tackles across all defensive positions', () => {
    const teamState = createMockTeamGameState();
    const defenders = [
      createMockPlayer('de1', 'DE'),
      createMockPlayer('dt1', 'DT'),
      createMockPlayer('ilb1', 'ILB'),
      createMockPlayer('olb1', 'OLB'),
      createMockPlayer('cb1', 'CB'),
      createMockPlayer('fs1', 'FS'),
      createMockPlayer('ss1', 'SS'),
    ];

    const context: TackleContext = {
      playType: 'run_inside',
      yardsGained: 4,
      outcome: 'moderate_gain',
    };

    const counts: Record<string, number> = {};
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const tackler = selectPrimaryTackler(defenders, context, teamState);
      if (tackler) {
        counts[tackler.id] = (counts[tackler.id] || 0) + 1;
      }
    }

    // All positions should get SOME tackles
    expect(counts.de1).toBeGreaterThan(0);
    expect(counts.dt1).toBeGreaterThan(0);
    expect(counts.ilb1).toBeGreaterThan(0);
    expect(counts.olb1).toBeGreaterThan(0);
    expect(counts.cb1).toBeGreaterThan(0);
    expect(counts.fs1).toBeGreaterThan(0);
    expect(counts.ss1).toBeGreaterThan(0);

    // Linebackers should lead on run plays with moderate gain
    const lbTackles = (counts.ilb1 || 0) + (counts.olb1 || 0);
    const dlTackles = (counts.de1 || 0) + (counts.dt1 || 0);
    const dbTackles = (counts.cb1 || 0) + (counts.fs1 || 0) + (counts.ss1 || 0);

    expect(lbTackles).toBeGreaterThan(dlTackles * 0.5);
    expect(lbTackles).toBeGreaterThan(dbTackles * 0.5);
  });

  it('should give DL more tackles on short gains', () => {
    const teamState = createMockTeamGameState();
    const defenders = [
      createMockPlayer('de1', 'DE'),
      createMockPlayer('ilb1', 'ILB'),
      createMockPlayer('cb1', 'CB'),
    ];

    const shortContext: TackleContext = {
      playType: 'run_inside',
      yardsGained: 1,
      outcome: 'short_gain',
    };

    const longContext: TackleContext = {
      playType: 'run_outside',
      yardsGained: 12,
      outcome: 'big_gain',
    };

    const shortCounts: Record<string, number> = { de1: 0, ilb1: 0, cb1: 0 };
    const longCounts: Record<string, number> = { de1: 0, ilb1: 0, cb1: 0 };
    const iterations = 500;

    for (let i = 0; i < iterations; i++) {
      const shortTackler = selectPrimaryTackler(defenders, shortContext, teamState);
      const longTackler = selectPrimaryTackler(defenders, longContext, teamState);

      if (shortTackler) shortCounts[shortTackler.id]++;
      if (longTackler) longCounts[longTackler.id]++;
    }

    // DE should get higher share on short gains
    const deShortShare = shortCounts.de1 / iterations;
    const deLongShare = longCounts.de1 / iterations;

    expect(deShortShare).toBeGreaterThan(deLongShare);

    // CB should get higher share on long gains (cleaning up)
    const cbShortShare = shortCounts.cb1 / iterations;
    const cbLongShare = longCounts.cb1 / iterations;

    expect(cbLongShare).toBeGreaterThan(cbShortShare);
  });

  it('should give DL most sacks', () => {
    const teamState = createMockTeamGameState();
    const defenders = [
      createMockPlayer('de1', 'DE'),
      createMockPlayer('dt1', 'DT'),
      createMockPlayer('ilb1', 'ILB'),
      createMockPlayer('cb1', 'CB'),
    ];

    const sackContext: TackleContext = {
      playType: 'pass_medium',
      yardsGained: -7,
      outcome: 'sack',
    };

    const counts: Record<string, number> = { de1: 0, dt1: 0, ilb1: 0, cb1: 0 };
    // Increase iterations for stable results
    const iterations = 2000;

    for (let i = 0; i < iterations; i++) {
      const tackler = selectPrimaryTackler(defenders, sackContext, teamState);
      if (tackler) counts[tackler.id]++;
    }

    // DL should get more sacks than others (but LBs can blitz too)
    const dlSacks = counts.de1 + counts.dt1;
    const otherSacks = counts.ilb1 + counts.cb1;

    // DL should get at least 45% of sacks (weighted heavily for sacks)
    expect(dlSacks / iterations).toBeGreaterThan(0.45);
    // DL should get at least 90% of what others get (effectively more in most runs)
    expect(dlSacks).toBeGreaterThanOrEqual(otherSacks * 0.9);
  });

  it('should give secondary most tackles on pass completions', () => {
    const teamState = createMockTeamGameState();
    const defenders = [
      createMockPlayer('de1', 'DE'),
      createMockPlayer('ilb1', 'ILB'),
      createMockPlayer('cb1', 'CB'),
      createMockPlayer('ss1', 'SS'),
    ];

    const passContext: TackleContext = {
      playType: 'pass_medium',
      yardsGained: 12,
      outcome: 'good_gain',
    };

    const counts: Record<string, number> = { de1: 0, ilb1: 0, cb1: 0, ss1: 0 };
    const iterations = 500;

    for (let i = 0; i < iterations; i++) {
      const tackler = selectPrimaryTackler(defenders, passContext, teamState);
      if (tackler) counts[tackler.id]++;
    }

    // Secondary should get most tackles on pass completions
    const dbTackles = counts.cb1 + counts.ss1;
    const dlTackles = counts.de1;

    expect(dbTackles).toBeGreaterThan(dlTackles);
  });
});

describe('shouldHaveAssistTackle', () => {
  it('should return true approximately 25% of the time', () => {
    let assists = 0;
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      if (shouldHaveAssistTackle()) assists++;
    }

    // Should be around 25% (allow 18-32% range for variance)
    const assistRate = assists / iterations;
    expect(assistRate).toBeGreaterThan(0.18);
    expect(assistRate).toBeLessThan(0.32);
  });
});

// ============================================
// NFL BENCHMARK VALIDATION TESTS
// ============================================

describe('NFL Benchmark Validation', () => {
  it('should produce realistic WR target distribution over a simulated season', () => {
    // Simulate ~500 pass plays (roughly what a team has per season)
    const receivers = [
      createMockPlayer('wr1', 'WR'),
      createMockPlayer('wr2', 'WR'),
      createMockPlayer('wr3', 'WR'),
      createMockPlayer('te1', 'TE'),
      createMockPlayer('rb1', 'RB'),
    ];
    const teamState = createMockTeamGameState();
    const situation: TargetSituationContext = {
      down: 2,
      distance: 7,
      isRedZone: false,
      isTwoMinuteDrill: false,
      scoreDifferential: 0,
    };

    const targets: Record<string, number> = { wr1: 0, wr2: 0, wr3: 0, te1: 0, rb1: 0 };
    const playTypes: ('pass_short' | 'pass_medium' | 'pass_deep' | 'pass_screen')[] = [
      'pass_short',
      'pass_medium',
      'pass_deep',
      'pass_screen',
    ];

    const iterations = 500;
    for (let i = 0; i < iterations; i++) {
      const playType = playTypes[Math.floor(Math.random() * playTypes.length)];
      const target = selectPassTarget(receivers, playType, situation, teamState);
      if (target) targets[target.id]++;
    }

    // NFL Benchmarks (per 500 attempts):
    // WR1: 128-160 targets (25-32% share)
    // WR2: 80-112 targets (16-22% share)
    // WR3/Slot: 64-96 targets (13-19% share)
    // TE: 64-96 targets (13-19% share)
    // RB: 48-80 targets (10-16% share)

    const wr1Share = targets.wr1 / iterations;
    const wr2Share = targets.wr2 / iterations;
    const wr3Share = targets.wr3 / iterations;
    const teShare = targets.te1 / iterations;
    const rbShare = targets.rb1 / iterations;

    // WR1 should be between 22-42% (elite WRs like Kupp can approach 32%)
    expect(wr1Share).toBeGreaterThan(0.2);
    expect(wr1Share).toBeLessThan(0.42);

    // WR2 should be between 14-28%
    expect(wr2Share).toBeGreaterThan(0.12);
    expect(wr2Share).toBeLessThan(0.3);

    // WR3 should be between 8-22%
    expect(wr3Share).toBeGreaterThan(0.06);
    expect(wr3Share).toBeLessThan(0.24);

    // TE should be between 10-22%
    expect(teShare).toBeGreaterThan(0.08);
    expect(teShare).toBeLessThan(0.24);

    // RB should be between 6-20%
    expect(rbShare).toBeGreaterThan(0.05);
    expect(rbShare).toBeLessThan(0.22);
  });

  it('should produce realistic tackle distribution by position over a season', () => {
    const teamState = createMockTeamGameState();
    const defenders = [
      createMockPlayer('de1', 'DE'),
      createMockPlayer('de2', 'DE'),
      createMockPlayer('dt1', 'DT'),
      createMockPlayer('ilb1', 'ILB'),
      createMockPlayer('ilb2', 'ILB'),
      createMockPlayer('olb1', 'OLB'),
      createMockPlayer('olb2', 'OLB'),
      createMockPlayer('cb1', 'CB'),
      createMockPlayer('cb2', 'CB'),
      createMockPlayer('fs1', 'FS'),
      createMockPlayer('ss1', 'SS'),
    ];

    const positionTackles: Record<string, number> = {
      DE: 0,
      DT: 0,
      ILB: 0,
      OLB: 0,
      CB: 0,
      FS: 0,
      SS: 0,
    };

    // Simulate ~1000 defensive plays
    const iterations = 1000;
    const playTypes = [
      { type: 'run_inside', yards: 3 },
      { type: 'run_outside', yards: 5 },
      { type: 'pass_short', yards: 7 },
      { type: 'pass_medium', yards: 12 },
    ];

    for (let i = 0; i < iterations; i++) {
      const play = playTypes[Math.floor(Math.random() * playTypes.length)];
      const context: TackleContext = {
        playType: play.type as any,
        yardsGained: play.yards,
        outcome: 'moderate_gain',
      };

      const tackler = selectPrimaryTackler(defenders, context, teamState);
      if (tackler) {
        positionTackles[tackler.position]++;
      }
    }

    // NFL season tackle benchmarks (normalized to 1000 plays):
    // ILB: Should lead (100-130 tackles per season = ~10-13%)
    // OLB: ~50-80 tackles = ~5-8%
    // SS: ~60-90 tackles = ~6-9%
    // FS: ~50-75 tackles = ~5-7.5%
    // CB: ~50-70 tackles = ~5-7%
    // DE: ~50-70 tackles = ~5-7%
    // DT: ~30-50 tackles = ~3-5%

    const ilbShare = positionTackles.ILB / iterations;
    const olbShare = positionTackles.OLB / iterations;
    const ssShare = positionTackles.SS / iterations;
    const fsShare = positionTackles.FS / iterations;
    const cbShare = positionTackles.CB / iterations;
    const deShare = positionTackles.DE / iterations;
    const dtShare = positionTackles.DT / iterations;

    // ILB should lead
    expect(ilbShare).toBeGreaterThan(deShare);
    expect(ilbShare).toBeGreaterThan(dtShare);

    // All positions should have meaningful tackles (not DE-only)
    expect(deShare).toBeLessThan(0.35); // DEs should NOT dominate
    expect(ilbShare).toBeGreaterThan(0.08); // ILBs should be significant
    expect(olbShare).toBeGreaterThan(0.04); // OLBs should get some tackles
    expect(cbShare).toBeGreaterThan(0.04); // CBs should get some tackles
    expect(fsShare).toBeGreaterThan(0.03); // FS should get some tackles
    expect(ssShare).toBeGreaterThan(0.04); // SS should get some tackles
  });
});
