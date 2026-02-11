/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Firing Mechanics Tests
 * Tests for GM termination, reason generation, severance, and legacy
 */

import {
  generateFiringReason,
  calculateSeverance,
  calculateLegacy,
  createDefaultTenureStats,
  updateTenureStats,
  recordCoachingChange,
  recordDraftPick,
  recordFreeAgentSigning,
  createFiringRecord,
  shouldFire,
  getLegacyDescription,
  validateTenureStats,
  validateFiringRecord,
  FiringContext,
  FiringRecord,
  TenureStats,
} from '../FiringMechanics';
import { createPatienceMeterState } from '../PatienceMeterManager';
import { createDefaultOwner } from '../../models/owner/Owner';

describe('FiringMechanics', () => {
  // Helper to create test owner
  function createTestOwner(overrides?: Partial<ReturnType<typeof createDefaultOwner>>) {
    const owner = createDefaultOwner('owner-1', 'team-1');
    return { ...owner, ...overrides };
  }

  // Helper to create test firing context
  function createTestContext(overrides?: Partial<FiringContext>): FiringContext {
    return {
      consecutiveLosingSeason: 0,
      missedPlayoffsCount: 0,
      ownerDefianceCount: 0,
      majorScandals: 0,
      recentPatienceHistory: [50, 50, 50],
      ownershipJustChanged: false,
      seasonExpectation: 'competitive',
      ...overrides,
    };
  }

  describe('generateFiringReason', () => {
    it('should generate performance reason for consecutive losing seasons', () => {
      const owner = createTestOwner();
      const state = createPatienceMeterState('owner-1', 25);
      const context = createTestContext({ consecutiveLosingSeason: 3 });

      const reason = generateFiringReason(context, owner, state);

      expect(reason.category).toBe('performance');
      expect(reason.primaryReason).toContain('losing');
    });

    it('should generate relationship reason for defiance', () => {
      const owner = createTestOwner();
      owner.personality.traits.control = 80; // High control owner
      const state = createPatienceMeterState('owner-1', 25);
      const context = createTestContext({ ownerDefianceCount: 3 });

      const reason = generateFiringReason(context, owner, state);

      expect(reason.category).toBe('relationship');
      expect(reason.primaryReason).toContain('difference');
    });

    it('should generate PR reason for scandals', () => {
      const owner = createTestOwner();
      const state = createPatienceMeterState('owner-1', 25);
      const context = createTestContext({ majorScandals: 2 });

      const reason = generateFiringReason(context, owner, state);

      expect(reason.category).toBe('pr');
    });

    it('should generate ownership change reason', () => {
      const owner = createTestOwner();
      const state = createPatienceMeterState('owner-1', 25);
      const context = createTestContext({ ownershipJustChanged: true });

      const reason = generateFiringReason(context, owner, state);

      expect(reason.category).toBe('ownershipChange');
    });

    it('should include public statement', () => {
      const owner = createTestOwner();
      const state = createPatienceMeterState('owner-1', 25);
      const context = createTestContext({ consecutiveLosingSeason: 2 });

      const reason = generateFiringReason(context, owner, state);

      expect(reason.publicStatement).toBeTruthy();
      expect(typeof reason.publicStatement).toBe('string');
    });

    it('should include internal reason', () => {
      const owner = createTestOwner();
      const state = createPatienceMeterState('owner-1', 25);
      const context = createTestContext({ consecutiveLosingSeason: 2 });

      const reason = generateFiringReason(context, owner, state);

      expect(reason.internalReason).toBeTruthy();
    });
  });

  describe('calculateSeverance', () => {
    it('should calculate basic severance from remaining contract', () => {
      const tenure = createDefaultTenureStats();
      const severance = calculateSeverance(2, 2000000, false, tenure);

      expect(severance.baseSeverance).toBe(4000000);
      expect(severance.yearsRemaining).toBe(2);
    });

    it('should add performance bonus for Super Bowl wins', () => {
      const tenure: TenureStats = {
        ...createDefaultTenureStats(),
        superBowlWins: 1,
      };
      const severance = calculateSeverance(1, 2000000, false, tenure);

      expect(severance.performanceBonus).toBeGreaterThan(0);
    });

    it('should reduce severance for forced departures', () => {
      const tenure = createDefaultTenureStats();
      const normalSeverance = calculateSeverance(2, 2000000, false, tenure);
      const forcedSeverance = calculateSeverance(2, 2000000, true, tenure);

      expect(forcedSeverance.totalValue).toBeLessThan(normalSeverance.totalValue);
    });

    it('should return appropriate description', () => {
      const tenure = createDefaultTenureStats();

      const noSeverance = calculateSeverance(0, 2000000, false, tenure);
      expect(noSeverance.description).toContain('expired');

      const bigSeverance = calculateSeverance(5, 3000000, false, tenure);
      expect(bigSeverance.description).not.toContain('expired');
    });
  });

  describe('calculateLegacy', () => {
    it('should rate Super Bowl winner as excellent or better', () => {
      const tenure: TenureStats = {
        ...createDefaultTenureStats(),
        totalSeasons: 5,
        totalWins: 55,
        totalLosses: 30,
        winPercentage: 0.647,
        superBowlWins: 1,
        superBowlAppearances: 1,
        playoffAppearances: 4,
      };

      const legacy = calculateLegacy(tenure);

      expect(['legendary', 'excellent']).toContain(legacy.overall);
      expect(legacy.achievements).toContain('1 Super Bowl championship(s)');
    });

    it('should rate losing record tenure as poor or average', () => {
      const tenure: TenureStats = {
        ...createDefaultTenureStats(),
        totalSeasons: 4,
        totalWins: 24,
        totalLosses: 44,
        winPercentage: 0.353,
        playoffAppearances: 0,
      };

      const legacy = calculateLegacy(tenure);

      expect(['poor', 'disastrous', 'average']).toContain(legacy.overall);
      expect(legacy.failures.length).toBeGreaterThan(0);
    });

    it('should identify consistent playoff contender', () => {
      const tenure: TenureStats = {
        ...createDefaultTenureStats(),
        totalSeasons: 5,
        playoffAppearances: 4,
        totalWins: 50,
        totalLosses: 35,
        winPercentage: 0.588,
      };

      const legacy = calculateLegacy(tenure);

      expect(legacy.achievements.some((a) => a.includes('playoff'))).toBe(true);
    });

    it('should penalize high coaching turnover', () => {
      const stableTenure: TenureStats = {
        ...createDefaultTenureStats(),
        totalSeasons: 5,
        coachesFired: 0,
        totalWins: 40,
        totalLosses: 45,
        winPercentage: 0.47,
      };

      const unstableTenure: TenureStats = {
        ...createDefaultTenureStats(),
        totalSeasons: 5,
        coachesFired: 4,
        totalWins: 40,
        totalLosses: 45,
        winPercentage: 0.47,
      };

      const stableLegacy = calculateLegacy(stableTenure);
      const unstableLegacy = calculateLegacy(unstableTenure);

      expect(stableLegacy.score).toBeGreaterThan(unstableLegacy.score);
    });
  });

  describe('createDefaultTenureStats', () => {
    it('should create empty tenure stats', () => {
      const stats = createDefaultTenureStats();

      expect(stats.totalSeasons).toBe(0);
      expect(stats.totalWins).toBe(0);
      expect(stats.totalLosses).toBe(0);
      expect(stats.winPercentage).toBe(0);
      expect(stats.superBowlWins).toBe(0);
    });
  });

  describe('updateTenureStats', () => {
    it('should update stats with season result', () => {
      const stats = createDefaultTenureStats();
      const updated = updateTenureStats(stats, {
        wins: 10,
        losses: 7,
        madePlayoffs: true,
        wonDivision: true,
        wonConference: false,
        wonSuperBowl: false,
        madeSuperBowl: false,
      });

      expect(updated.totalSeasons).toBe(1);
      expect(updated.totalWins).toBe(10);
      expect(updated.totalLosses).toBe(7);
      expect(updated.playoffAppearances).toBe(1);
      expect(updated.divisionTitles).toBe(1);
    });

    it('should correctly calculate win percentage', () => {
      let stats = createDefaultTenureStats();
      stats = updateTenureStats(stats, {
        wins: 10,
        losses: 7,
        madePlayoffs: false,
        wonDivision: false,
        wonConference: false,
        wonSuperBowl: false,
        madeSuperBowl: false,
      });

      expect(stats.winPercentage).toBeCloseTo(0.588, 2);
    });

    it('should track Super Bowl appearances and wins', () => {
      const stats = createDefaultTenureStats();
      const updated = updateTenureStats(stats, {
        wins: 14,
        losses: 3,
        madePlayoffs: true,
        wonDivision: true,
        wonConference: true,
        wonSuperBowl: true,
        madeSuperBowl: true,
      });

      expect(updated.superBowlAppearances).toBe(1);
      expect(updated.superBowlWins).toBe(1);
      expect(updated.conferenceChampionships).toBe(1);
    });
  });

  describe('recordCoachingChange', () => {
    it('should record coach hire', () => {
      const stats = createDefaultTenureStats();
      const updated = recordCoachingChange(stats, true);

      expect(updated.coachesHired).toBe(1);
      expect(updated.coachesFired).toBe(0);
    });

    it('should record coach fire', () => {
      const stats = createDefaultTenureStats();
      const updated = recordCoachingChange(stats, false);

      expect(updated.coachesHired).toBe(0);
      expect(updated.coachesFired).toBe(1);
    });
  });

  describe('recordDraftPick', () => {
    it('should record first round pick', () => {
      const stats = createDefaultTenureStats();
      const updated = recordDraftPick(stats, 1);

      expect(updated.firstRoundPicks).toBe(1);
    });

    it('should not record later round picks', () => {
      const stats = createDefaultTenureStats();
      const updated = recordDraftPick(stats, 3);

      expect(updated.firstRoundPicks).toBe(0);
    });
  });

  describe('recordFreeAgentSigning', () => {
    it('should record free agent signing', () => {
      const stats = createDefaultTenureStats();
      const updated = recordFreeAgentSigning(stats);

      expect(updated.majorFreeAgents).toBe(1);
    });
  });

  describe('createFiringRecord', () => {
    it('should create complete firing record', () => {
      const owner = createTestOwner();
      const tenure: TenureStats = {
        ...createDefaultTenureStats(),
        totalSeasons: 3,
        totalWins: 20,
        totalLosses: 31,
        winPercentage: 0.392,
      };
      const patienceState = createPatienceMeterState('owner-1', 15);
      const context = createTestContext({ consecutiveLosingSeason: 2 });

      const record = createFiringRecord(
        'gm-1',
        'team-1',
        owner,
        3,
        18,
        tenure,
        patienceState,
        context,
        2,
        2000000
      );

      expect(record.gmId).toBe('gm-1');
      expect(record.teamId).toBe('team-1');
      expect(record.season).toBe(3);
      expect(record.reason).toBeTruthy();
      expect(record.tenure).toBe(tenure);
      expect(record.severance).toBeTruthy();
      expect(record.legacy).toBeTruthy();
      expect(record.finalPatienceValue).toBe(15);
    });
  });

  describe('shouldFire', () => {
    it('should fire when patience below 20', () => {
      const state = createPatienceMeterState('owner-1', 15);
      const context = createTestContext();
      const owner = createTestOwner();

      const result = shouldFire(state, context, owner);

      expect(result.shouldFire).toBe(true);
      expect(result.isImmediate).toBe(true);
    });

    it('should fire for multiple scandals with PR-obsessed owner', () => {
      const state = createPatienceMeterState('owner-1', 40);
      const context = createTestContext({ majorScandals: 2 });
      const owner = createTestOwner();
      owner.personality.secondaryTraits = ['prObsessed'];

      const result = shouldFire(state, context, owner);

      expect(result.shouldFire).toBe(true);
    });

    it('should fire for repeated defiance with controlling owner', () => {
      const state = createPatienceMeterState('owner-1', 40);
      const context = createTestContext({ ownerDefianceCount: 3 });
      const owner = createTestOwner();
      owner.personality.traits.control = 80;

      const result = shouldFire(state, context, owner);

      expect(result.shouldFire).toBe(true);
    });

    it('should not fire when patience is healthy', () => {
      const state = createPatienceMeterState('owner-1', 70);
      const context = createTestContext();
      const owner = createTestOwner();

      const result = shouldFire(state, context, owner);

      expect(result.shouldFire).toBe(false);
    });
  });

  describe('getLegacyDescription', () => {
    it('should return appropriate descriptions', () => {
      expect(getLegacyDescription({ overall: 'legendary' } as any)).toContain('greatest');
      expect(getLegacyDescription({ overall: 'excellent' } as any)).toContain('positive impact');
      expect(getLegacyDescription({ overall: 'good' } as any)).toContain('notable');
      expect(getLegacyDescription({ overall: 'average' } as any)).toContain('some');
      expect(getLegacyDescription({ overall: 'poor' } as any)).toContain('short');
      expect(getLegacyDescription({ overall: 'disastrous' } as any)).toContain('difficult');
    });
  });

  describe('validateTenureStats', () => {
    it('should return true for valid stats', () => {
      const stats = createDefaultTenureStats();
      expect(validateTenureStats(stats)).toBe(true);
    });

    it('should return false for negative values', () => {
      const stats = { ...createDefaultTenureStats(), totalWins: -5 };
      expect(validateTenureStats(stats)).toBe(false);
    });

    it('should return false for invalid win percentage', () => {
      const stats = { ...createDefaultTenureStats(), winPercentage: 1.5 };
      expect(validateTenureStats(stats)).toBe(false);
    });

    it('should return false when Super Bowl wins exceed appearances', () => {
      const stats = {
        ...createDefaultTenureStats(),
        superBowlWins: 2,
        superBowlAppearances: 1,
      };
      expect(validateTenureStats(stats)).toBe(false);
    });
  });

  describe('validateFiringRecord', () => {
    it('should return true for valid record', () => {
      const owner = createTestOwner();
      const tenure = createDefaultTenureStats();
      tenure.totalSeasons = 3;
      const patienceState = createPatienceMeterState('owner-1', 15);
      const context = createTestContext();

      const record = createFiringRecord(
        'gm-1',
        'team-1',
        owner,
        3,
        18,
        tenure,
        patienceState,
        context,
        0,
        2000000
      );

      expect(validateFiringRecord(record)).toBe(true);
    });

    it('should return false for missing ids', () => {
      const record: FiringRecord = {
        gmId: '',
        teamId: 'team-1',
        ownerId: 'owner-1',
        season: 3,
        week: 18,
        reason: {
          primaryReason: 'test',
          category: 'performance' as const,
          secondaryReasons: [],
          publicStatement: '',
          internalReason: '',
        },
        tenure: createDefaultTenureStats(),
        severance: {
          yearsRemaining: 0,
          baseSeverance: 0,
          performanceBonus: 0,
          totalValue: 0,
          description: '',
        },
        legacy: {
          overall: 'average' as const,
          score: 50,
          achievements: [],
          failures: [],
          memorableMoments: [],
        },
        finalPatienceValue: 15,
        wasForced: false,
      };

      expect(validateFiringRecord(record)).toBe(false);
    });
  });
});
