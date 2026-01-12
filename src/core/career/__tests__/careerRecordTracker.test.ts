/**
 * Career Record Tracker Tests
 * Tests for comprehensive career statistics tracking
 */

import {
  createCareerRecord,
  startNewTeam,
  recordSeason,
  recordFiring,
  recordResignation,
  recordUnemploymentYear,
  updateReputationFromSeason,
  getReputationTier,
  getReputationTierDescription,
  getCareerSummary,
  getCurrentTenure,
  calculateReputationScore,
  createDefaultReputationFactors,
  validateCareerRecord,
  CareerRecord,
  SeasonSnapshot,
} from '../CareerRecordTracker';

describe('CareerRecordTracker', () => {
  // Helper to create a test career record
  function createTestCareer(): CareerRecord {
    return createCareerRecord('gm-1', 'John Smith');
  }

  // Helper to create a season snapshot
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
      wonDivision: true,
      wonConference: false,
      wonChampionship: false,
      fired: false,
      ...overrides,
    };
  }

  describe('createCareerRecord', () => {
    it('should create a new career record with defaults', () => {
      const record = createCareerRecord('gm-1', 'John Smith');

      expect(record.gmId).toBe('gm-1');
      expect(record.gmName).toBe('John Smith');
      expect(record.totalSeasons).toBe(0);
      expect(record.totalWins).toBe(0);
      expect(record.championships).toBe(0);
      expect(record.reputationScore).toBe(50);
      expect(record.isRetired).toBe(false);
    });

    it('should start with empty team history', () => {
      const record = createCareerRecord('gm-1', 'John Smith');

      expect(record.teamsWorkedFor).toHaveLength(0);
      expect(record.seasonHistory).toHaveLength(0);
      expect(record.achievements).toHaveLength(0);
      expect(record.currentTeamId).toBeNull();
    });
  });

  describe('startNewTeam', () => {
    it('should add a team to career history', () => {
      let record = createTestCareer();
      record = startNewTeam(record, 'team-1', 'Test City Tigers', 2025);

      expect(record.teamsWorkedFor).toHaveLength(1);
      expect(record.currentTeamId).toBe('team-1');
      expect(record.teamsWorkedFor[0].teamName).toBe('Test City Tigers');
      expect(record.teamsWorkedFor[0].startYear).toBe(2025);
      expect(record.teamsWorkedFor[0].endYear).toBeNull();
    });

    it('should close out previous team when starting new one', () => {
      let record = createTestCareer();
      record = startNewTeam(record, 'team-1', 'Team A', 2025);
      record = startNewTeam(record, 'team-2', 'Team B', 2028);

      expect(record.teamsWorkedFor).toHaveLength(2);
      expect(record.teamsWorkedFor[0].endYear).toBe(2027);
      expect(record.teamsWorkedFor[0].reasonForDeparture).toBe('resigned');
      expect(record.teamsWorkedFor[1].endYear).toBeNull();
      expect(record.currentTeamId).toBe('team-2');
    });

    it('should reset unemployment counter', () => {
      let record = createTestCareer();
      record = { ...record, yearsUnemployed: 2 };
      record = startNewTeam(record, 'team-1', 'Team A', 2025);

      expect(record.yearsUnemployed).toBe(0);
    });
  });

  describe('recordSeason', () => {
    it('should update career totals', () => {
      let record = createTestCareer();
      record = startNewTeam(record, 'team-1', 'Team A', 2025);
      record = recordSeason(record, createTestSeason({ wins: 10, losses: 7 }));

      expect(record.totalSeasons).toBe(1);
      expect(record.totalWins).toBe(10);
      expect(record.totalLosses).toBe(7);
      expect(record.playoffAppearances).toBe(1);
    });

    it('should track championships', () => {
      let record = createTestCareer();
      record = startNewTeam(record, 'team-1', 'Team A', 2025);
      record = recordSeason(record, createTestSeason({
        wonChampionship: true,
        wonConference: true,
        wonDivision: true,
      }));

      expect(record.championships).toBe(1);
      expect(record.conferenceChampionships).toBe(1);
      expect(record.divisionTitles).toBe(1);
    });

    it('should add season to history', () => {
      let record = createTestCareer();
      record = startNewTeam(record, 'team-1', 'Team A', 2025);
      record = recordSeason(record, createTestSeason());

      expect(record.seasonHistory).toHaveLength(1);
      expect(record.seasonHistory[0].year).toBe(2025);
    });

    it('should generate achievements for championships', () => {
      let record = createTestCareer();
      record = startNewTeam(record, 'team-1', 'Team A', 2025);
      record = recordSeason(record, createTestSeason({ wonChampionship: true }));

      expect(record.achievements.length).toBeGreaterThan(0);
      expect(record.achievements.some((a) => a.type === 'championship')).toBe(true);
    });

    it('should update current team tenure', () => {
      let record = createTestCareer();
      record = startNewTeam(record, 'team-1', 'Team A', 2025);
      record = recordSeason(record, createTestSeason({ wins: 12, losses: 5 }));

      const tenure = record.teamsWorkedFor[0];
      expect(tenure.seasons).toBe(1);
      expect(tenure.totalWins).toBe(12);
      expect(tenure.totalLosses).toBe(5);
    });

    it('should calculate win percentage correctly', () => {
      let record = createTestCareer();
      record = startNewTeam(record, 'team-1', 'Team A', 2025);
      record = recordSeason(record, createTestSeason({ wins: 10, losses: 7 }));

      expect(record.careerWinPercentage).toBeCloseTo(10 / 17, 2);
    });
  });

  describe('recordFiring', () => {
    it('should mark team tenure as fired', () => {
      let record = createTestCareer();
      record = startNewTeam(record, 'team-1', 'Team A', 2025);
      record = recordFiring(record, 'team-1', 2027, 15);

      expect(record.teamsWorkedFor[0].wasFired).toBe(true);
      expect(record.teamsWorkedFor[0].endYear).toBe(2027);
      expect(record.teamsWorkedFor[0].reasonForDeparture).toBe('fired');
    });

    it('should increment times fired counter', () => {
      let record = createTestCareer();
      record = startNewTeam(record, 'team-1', 'Team A', 2025);
      record = recordFiring(record, 'team-1', 2027, 15);

      expect(record.timesFired).toBe(1);
    });

    it('should set current team to null', () => {
      let record = createTestCareer();
      record = startNewTeam(record, 'team-1', 'Team A', 2025);
      record = recordFiring(record, 'team-1', 2027, 15);

      expect(record.currentTeamId).toBeNull();
    });

    it('should apply reputation penalty', () => {
      let record = createTestCareer();
      record = startNewTeam(record, 'team-1', 'Team A', 2025);
      const initialRep = record.reputationScore;
      record = recordFiring(record, 'team-1', 2027, 15);

      expect(record.reputationScore).toBeLessThan(initialRep);
    });

    it('should apply larger penalty for low patience firing', () => {
      let record = createTestCareer();
      record = startNewTeam(record, 'team-1', 'Team A', 2025);

      // Low patience = bigger penalty
      const recordLowPatience = recordFiring({ ...record }, 'team-1', 2027, 5);
      const recordHighPatience = recordFiring({ ...record }, 'team-1', 2027, 45);

      expect(recordLowPatience.reputationScore).toBeLessThan(recordHighPatience.reputationScore);
    });
  });

  describe('recordResignation', () => {
    it('should mark team tenure as resigned', () => {
      let record = createTestCareer();
      record = startNewTeam(record, 'team-1', 'Team A', 2025);
      record = recordResignation(record, 'team-1', 2027);

      expect(record.teamsWorkedFor[0].wasFired).toBe(false);
      expect(record.teamsWorkedFor[0].reasonForDeparture).toBe('resigned');
    });

    it('should not increment times fired', () => {
      let record = createTestCareer();
      record = startNewTeam(record, 'team-1', 'Team A', 2025);
      record = recordResignation(record, 'team-1', 2027);

      expect(record.timesFired).toBe(0);
    });
  });

  describe('recordUnemploymentYear', () => {
    it('should increment unemployment counter', () => {
      let record = createTestCareer();
      record = recordUnemploymentYear(record);

      expect(record.yearsUnemployed).toBe(1);
    });

    it('should apply reputation penalty', () => {
      let record = createTestCareer();
      const initialRep = record.reputationScore;
      record = recordUnemploymentYear(record);

      expect(record.reputationFactors.unemploymentPenalty).toBe(3);
      expect(record.reputationScore).toBeLessThan(initialRep);
    });
  });

  describe('updateReputationFromSeason', () => {
    it('should boost reputation for championship', () => {
      let record = createTestCareer();
      record = startNewTeam(record, 'team-1', 'Team A', 2025);
      const season = createTestSeason({ wonChampionship: true });

      record = updateReputationFromSeason(record, season, 10);

      expect(record.reputationFactors.championshipBonus).toBeGreaterThan(0);
    });

    it('should boost reputation for playoffs', () => {
      let record = createTestCareer();
      record = startNewTeam(record, 'team-1', 'Team A', 2025);
      const season = createTestSeason({ madePlayoffs: true });

      record = updateReputationFromSeason(record, season, 0);

      expect(record.reputationFactors.playoffBonus).toBeGreaterThan(0);
    });

    it('should penalize losing seasons', () => {
      let record = createTestCareer();
      record = startNewTeam(record, 'team-1', 'Team A', 2025);
      const season = createTestSeason({ wins: 4, losses: 13, madePlayoffs: false });

      record = updateReputationFromSeason(record, season, -10);

      expect(record.reputationFactors.losingSeasonPenalty).toBeGreaterThan(0);
    });
  });

  describe('getReputationTier', () => {
    it('should return correct tier for each range', () => {
      expect(getReputationTier(90)).toBe('elite');
      expect(getReputationTier(75)).toBe('high');
      expect(getReputationTier(55)).toBe('moderate');
      expect(getReputationTier(35)).toBe('low');
      expect(getReputationTier(20)).toBe('none');
    });
  });

  describe('getReputationTierDescription', () => {
    it('should return description for each tier', () => {
      expect(getReputationTierDescription('elite')).toContain('Top candidate');
      expect(getReputationTierDescription('high')).toContain('Strong interest');
      expect(getReputationTierDescription('none')).toContain('No current interest');
    });
  });

  describe('getCareerSummary', () => {
    it('should return rookie message for new GM', () => {
      const record = createTestCareer();
      expect(getCareerSummary(record)).toContain('Rookie GM');
    });

    it('should include key stats for experienced GM', () => {
      let record = createTestCareer();
      record = startNewTeam(record, 'team-1', 'Team A', 2025);
      record = recordSeason(record, createTestSeason({ wins: 12, losses: 5, wonChampionship: true }));

      const summary = getCareerSummary(record);
      expect(summary).toContain('1 season');
      expect(summary).toContain('12-5');
      expect(summary).toContain('1 championship');
    });
  });

  describe('getCurrentTenure', () => {
    it('should return null when unemployed', () => {
      const record = createTestCareer();
      expect(getCurrentTenure(record)).toBeNull();
    });

    it('should return current team tenure', () => {
      let record = createTestCareer();
      record = startNewTeam(record, 'team-1', 'Team A', 2025);

      const tenure = getCurrentTenure(record);
      expect(tenure).not.toBeNull();
      expect(tenure?.teamId).toBe('team-1');
    });
  });

  describe('calculateReputationScore', () => {
    it('should calculate correct total', () => {
      const factors = {
        baseReputation: 50,
        championshipBonus: 15,
        playoffBonus: 6,
        winningSeasonBonus: 4,
        losingSeasonPenalty: 2,
        firingPenalty: 10,
        unemploymentPenalty: 3,
        ownerApprovalModifier: 5,
      };

      const score = calculateReputationScore(factors);
      expect(score).toBe(50 + 15 + 6 + 4 - 2 - 10 - 3 + 5); // 65
    });

    it('should clamp score between 0 and 100', () => {
      const lowFactors = {
        ...createDefaultReputationFactors(),
        firingPenalty: 100,
        unemploymentPenalty: 50,
      };
      expect(calculateReputationScore(lowFactors)).toBe(0);

      const highFactors = {
        ...createDefaultReputationFactors(),
        championshipBonus: 100,
        playoffBonus: 50,
      };
      expect(calculateReputationScore(highFactors)).toBe(100);
    });
  });

  describe('validateCareerRecord', () => {
    it('should validate a valid career record', () => {
      const record = createTestCareer();
      expect(validateCareerRecord(record)).toBe(true);
    });

    it('should reject invalid records', () => {
      const invalidRecord = {
        ...createTestCareer(),
        totalSeasons: -1,
      };
      expect(validateCareerRecord(invalidRecord)).toBe(false);
    });

    it('should reject invalid reputation score', () => {
      const invalidRecord = {
        ...createTestCareer(),
        reputationScore: 150,
      };
      expect(validateCareerRecord(invalidRecord)).toBe(false);
    });
  });
});
