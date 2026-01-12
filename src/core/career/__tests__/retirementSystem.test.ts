/**
 * Retirement System Tests
 * Tests for career ending and legacy calculation
 */

import {
  createRetirementState,
  initiateRetirement,
  generateCareerSummary,
  calculateLegacyScore,
  getRetirementHeadline,
  getLegacyTierDisplayName,
  getHallOfFameStatusDisplay,
  validateRetirementState,
  LegacyTier,
  HallOfFameStatus,
} from '../RetirementSystem';
import {
  createCareerRecord,
  startNewTeam,
  recordSeason,
  SeasonSnapshot,
  CareerRecord,
} from '../CareerRecordTracker';

describe('RetirementSystem', () => {
  // Helper to create test season
  function createTestSeason(overrides?: Partial<SeasonSnapshot>): SeasonSnapshot {
    return {
      year: 2025,
      teamId: 'team-1',
      teamName: 'Test City Tigers',
      wins: 10,
      losses: 7,
      ties: 0,
      madePlayoffs: true,
      playoffWins: 1,
      wonDivision: false,
      wonConference: false,
      wonChampionship: false,
      fired: false,
      ...overrides,
    };
  }

  // Helper to create career with history
  function createTestCareerWithHistory(): CareerRecord {
    let record = createCareerRecord('gm-1', 'John Smith');
    record = startNewTeam(record, 'team-1', 'Test City Tigers', 2020);

    // Add 5 seasons
    for (let i = 0; i < 5; i++) {
      record = recordSeason(
        record,
        createTestSeason({
          year: 2020 + i,
          wins: 10 + i,
          losses: 7 - i,
          madePlayoffs: i >= 2,
          wonDivision: i >= 3,
          wonChampionship: i === 4,
          wonConference: i === 4,
        })
      );
    }

    return record;
  }

  describe('createRetirementState', () => {
    it('should create initial state', () => {
      const state = createRetirementState();

      expect(state.isRetired).toBe(false);
      expect(state.retirementYear).toBeNull();
      expect(state.retirementReason).toBeNull();
      expect(state.careerSummary).toBeNull();
    });
  });

  describe('initiateRetirement', () => {
    it('should create retirement state with summary', () => {
      const record = createTestCareerWithHistory();
      const state = initiateRetirement(record, 2025);

      expect(state.isRetired).toBe(true);
      expect(state.retirementYear).toBe(2025);
      expect(state.retirementReason).toBe('voluntary');
      expect(state.careerSummary).not.toBeNull();
    });

    it('should support different retirement reasons', () => {
      const record = createTestCareerWithHistory();

      const voluntary = initiateRetirement(record, 2025, 'voluntary');
      expect(voluntary.retirementReason).toBe('voluntary');

      const forced = initiateRetirement(record, 2025, 'forced');
      expect(forced.retirementReason).toBe('forced');

      const health = initiateRetirement(record, 2025, 'health');
      expect(health.retirementReason).toBe('health');
    });
  });

  describe('generateCareerSummary', () => {
    it('should include GM name and totals', () => {
      const record = createTestCareerWithHistory();
      const summary = generateCareerSummary(record, 2025);

      expect(summary.gmName).toBe('John Smith');
      expect(summary.totalSeasons).toBe(5);
      expect(summary.stats.totalWins).toBeGreaterThan(0);
    });

    it('should calculate legacy tier', () => {
      const record = createTestCareerWithHistory();
      const summary = generateCareerSummary(record, 2025);

      expect(summary.legacyTier).toBeTruthy();
      expect(summary.legacyScore).toBeGreaterThan(0);
      expect(summary.legacyDescription).toBeTruthy();
    });

    it('should include highlights', () => {
      const record = createTestCareerWithHistory();
      const summary = generateCareerSummary(record, 2025);

      expect(Array.isArray(summary.highlights)).toBe(true);
      // Should have championship highlight
      expect(summary.highlights.some((h) => h.type === 'championship')).toBe(true);
    });

    it('should include team legacies', () => {
      const record = createTestCareerWithHistory();
      const summary = generateCareerSummary(record, 2025);

      expect(summary.teamLegacies.length).toBeGreaterThan(0);
      expect(summary.teamLegacies[0].teamName).toBe('Test City Tigers');
    });

    it('should include farewell and media reaction', () => {
      const record = createTestCareerWithHistory();
      const summary = generateCareerSummary(record, 2025);

      expect(summary.farewellStatement).toBeTruthy();
      expect(summary.mediaReaction).toBeTruthy();
    });

    it('should calculate hall of fame status', () => {
      const record = createTestCareerWithHistory();
      const summary = generateCareerSummary(record, 2025);

      expect(summary.hallOfFameStatus).toBeTruthy();
      expect(Array.isArray(summary.hallOfFameReasons)).toBe(true);
    });
  });

  describe('calculateLegacyScore', () => {
    it('should give base score of 30', () => {
      const record = createCareerRecord('gm-1', 'Test GM');
      const score = calculateLegacyScore(record);

      expect(score).toBe(30);
    });

    it('should add points for championships', () => {
      let record = createCareerRecord('gm-1', 'Test GM');
      record = startNewTeam(record, 'team-1', 'Team', 2020);
      record = recordSeason(
        record,
        createTestSeason({ wonChampionship: true, wonConference: true })
      );

      const score = calculateLegacyScore(record);

      // Should be much higher than base
      expect(score).toBeGreaterThan(50);
    });

    it('should add points for longevity', () => {
      let record = createCareerRecord('gm-1', 'Test GM');
      record = startNewTeam(record, 'team-1', 'Team', 2005);

      // Add 20 seasons
      for (let i = 0; i < 20; i++) {
        record = recordSeason(record, createTestSeason({ year: 2005 + i }));
      }

      const score = calculateLegacyScore(record);

      // Should include longevity bonus
      expect(score).toBeGreaterThan(40);
    });

    it('should penalize firings', () => {
      let record = createCareerRecord('gm-1', 'Test GM');
      record = { ...record, timesFired: 3 };

      const score = calculateLegacyScore(record);

      // Should be lower than base due to firings
      expect(score).toBeLessThan(30);
    });

    it('should clamp score between 0 and 100', () => {
      // Create legendary career
      let record = createCareerRecord('gm-1', 'Test GM');
      record = {
        ...record,
        championships: 10,
        conferenceChampionships: 15,
        divisionTitles: 20,
        playoffAppearances: 20,
        totalSeasons: 25,
        careerWinPercentage: 0.7,
      };

      const score = calculateLegacyScore(record);

      expect(score).toBeLessThanOrEqual(100);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getRetirementHeadline', () => {
    it('should format headline correctly', () => {
      const record = createTestCareerWithHistory();
      const summary = generateCareerSummary(record, 2025);
      const headline = getRetirementHeadline(summary);

      expect(headline).toContain('John Smith');
      expect(headline).toContain('Retires');
      expect(headline).toContain('5 Seasons');
    });
  });

  describe('getLegacyTierDisplayName', () => {
    it('should return display names for all tiers', () => {
      const tiers: LegacyTier[] = [
        'hall_of_fame',
        'legendary',
        'excellent',
        'good',
        'average',
        'forgettable',
        'poor',
      ];

      for (const tier of tiers) {
        const displayName = getLegacyTierDisplayName(tier);
        expect(displayName).toBeTruthy();
        expect(typeof displayName).toBe('string');
      }
    });

    it('should return proper formatting', () => {
      expect(getLegacyTierDisplayName('hall_of_fame')).toBe('Hall of Fame');
      expect(getLegacyTierDisplayName('legendary')).toBe('Legendary');
    });
  });

  describe('getHallOfFameStatusDisplay', () => {
    it('should return display for all statuses', () => {
      const statuses: HallOfFameStatus[] = [
        'first_ballot',
        'eventual',
        'borderline',
        'unlikely',
        'no',
      ];

      for (const status of statuses) {
        const display = getHallOfFameStatusDisplay(status);
        expect(display).toBeTruthy();
        expect(typeof display).toBe('string');
      }
    });

    it('should return proper formatting', () => {
      expect(getHallOfFameStatusDisplay('first_ballot')).toContain('First Ballot');
      expect(getHallOfFameStatusDisplay('no')).toContain('Not');
    });
  });

  describe('validateRetirementState', () => {
    it('should validate initial state', () => {
      const state = createRetirementState();
      expect(validateRetirementState(state)).toBe(true);
    });

    it('should validate retired state', () => {
      const record = createTestCareerWithHistory();
      const state = initiateRetirement(record, 2025);
      expect(validateRetirementState(state)).toBe(true);
    });

    it('should reject invalid retired state without year', () => {
      const state = {
        isRetired: true,
        retirementYear: null,
        retirementReason: 'voluntary' as const,
        careerSummary: null,
      };
      expect(validateRetirementState(state)).toBe(false);
    });

    it('should reject invalid retired state without reason', () => {
      const state = {
        isRetired: true,
        retirementYear: 2025,
        retirementReason: null,
        careerSummary: null,
      };
      expect(validateRetirementState(state)).toBe(false);
    });

    it('should reject invalid year', () => {
      const state = {
        isRetired: true,
        retirementYear: 1900,
        retirementReason: 'voluntary' as const,
        careerSummary: null,
      };
      expect(validateRetirementState(state)).toBe(false);
    });
  });

  describe('Final Stats Calculation', () => {
    it('should calculate win percentage correctly', () => {
      const record = createTestCareerWithHistory();
      const summary = generateCareerSummary(record, 2025);

      const expectedWinPct =
        record.totalWins / (record.totalWins + record.totalLosses + record.totalTies);
      expect(summary.stats.winPercentage).toBeCloseTo(expectedWinPct, 2);
    });

    it('should find longest tenure', () => {
      let record = createCareerRecord('gm-1', 'Test GM');
      record = startNewTeam(record, 'team-1', 'Short Team', 2020);
      record = recordSeason(record, createTestSeason({ year: 2020 }));

      record = startNewTeam(record, 'team-2', 'Long Team', 2021);
      for (let i = 0; i < 5; i++) {
        record = recordSeason(
          record,
          createTestSeason({
            year: 2021 + i,
            teamId: 'team-2',
            teamName: 'Long Team',
          })
        );
      }

      const summary = generateCareerSummary(record, 2026);

      expect(summary.stats.longestTenure.teamName).toBe('Long Team');
      expect(summary.stats.longestTenure.seasons).toBe(5);
    });

    it('should find best season', () => {
      let record = createCareerRecord('gm-1', 'Test GM');
      record = startNewTeam(record, 'team-1', 'Team', 2020);
      record = recordSeason(record, createTestSeason({ year: 2020, wins: 8, losses: 9 }));
      record = recordSeason(record, createTestSeason({ year: 2021, wins: 14, losses: 3 }));
      record = recordSeason(record, createTestSeason({ year: 2022, wins: 10, losses: 7 }));

      const summary = generateCareerSummary(record, 2023);

      expect(summary.stats.bestSeason.year).toBe(2021);
      expect(summary.stats.bestSeason.wins).toBe(14);
    });
  });

  describe('Team Legacies', () => {
    it('should include tenure dates', () => {
      const record = createTestCareerWithHistory();
      const summary = generateCareerSummary(record, 2025);

      expect(summary.teamLegacies[0].tenure).toContain('2020');
    });

    it('should include record', () => {
      const record = createTestCareerWithHistory();
      const summary = generateCareerSummary(record, 2025);

      expect(summary.teamLegacies[0].record).toMatch(/\d+-\d+/);
    });

    it('should include achievements', () => {
      const record = createTestCareerWithHistory();
      const summary = generateCareerSummary(record, 2025);

      expect(Array.isArray(summary.teamLegacies[0].achievements)).toBe(true);
    });

    it('should include fan memory', () => {
      const record = createTestCareerWithHistory();
      const summary = generateCareerSummary(record, 2025);

      expect(summary.teamLegacies[0].fanMemory).toBeTruthy();
    });
  });
});
