/**
 * Multi-Year Career Simulation Integration Tests
 *
 * Tests for simulating 5+ year GM careers including multiple seasons,
 * team changes, firings, and career progression
 */

import {
  createCareerRecord,
  startNewTeam,
  recordSeason,
  recordFiring,
  recordResignation,
  recordUnemploymentYear,
  SeasonSnapshot,
  validateCareerRecord,
  getCareerSummary,
  getCurrentTenure,
  getReputationTier,
} from '../../core/career/CareerRecordTracker';
import {
  createRetirementState,
  initiateRetirement,
  calculateLegacyScore,
  validateRetirementState,
} from '../../core/career/RetirementSystem';
import {
  createOffSeasonState,
  simulateRemainingOffSeason,
  validateOffSeasonState,
  PHASE_ORDER,
} from '../../core/offseason/OffSeasonPhaseManager';

describe('Multi-Year Career Simulation Integration Tests', () => {
  describe('5+ year career with single team', () => {
    it('should track a 5-year career with one team correctly', () => {
      let record = createCareerRecord('gm-1', 'Test GM');
      record = startNewTeam(record, 'team-1', 'Test City Eagles', 2025);

      // Simulate 5 seasons
      const seasons: SeasonSnapshot[] = [
        {
          year: 2025,
          teamId: 'team-1',
          teamName: 'Test City Eagles',
          wins: 7,
          losses: 10,
          ties: 0,
          madePlayoffs: false,
          playoffWins: 0,
          wonDivision: false,
          wonConference: false,
          wonChampionship: false,
          fired: false,
        },
        {
          year: 2026,
          teamId: 'team-1',
          teamName: 'Test City Eagles',
          wins: 9,
          losses: 8,
          ties: 0,
          madePlayoffs: true,
          playoffWins: 0,
          wonDivision: false,
          wonConference: false,
          wonChampionship: false,
          fired: false,
        },
        {
          year: 2027,
          teamId: 'team-1',
          teamName: 'Test City Eagles',
          wins: 12,
          losses: 5,
          ties: 0,
          madePlayoffs: true,
          playoffWins: 2,
          wonDivision: true,
          wonConference: false,
          wonChampionship: false,
          fired: false,
        },
        {
          year: 2028,
          teamId: 'team-1',
          teamName: 'Test City Eagles',
          wins: 14,
          losses: 3,
          ties: 0,
          madePlayoffs: true,
          playoffWins: 4,
          wonDivision: true,
          wonConference: true,
          wonChampionship: true,
          fired: false,
        },
        {
          year: 2029,
          teamId: 'team-1',
          teamName: 'Test City Eagles',
          wins: 10,
          losses: 7,
          ties: 0,
          madePlayoffs: true,
          playoffWins: 1,
          wonDivision: false,
          wonConference: false,
          wonChampionship: false,
          fired: false,
        },
      ];

      for (const season of seasons) {
        record = recordSeason(record, season);
      }

      // Verify career totals
      expect(record.totalSeasons).toBe(5);
      expect(record.totalWins).toBe(52);
      expect(record.totalLosses).toBe(33);
      expect(record.championships).toBe(1);
      expect(record.conferenceChampionships).toBe(1);
      expect(record.divisionTitles).toBe(2);
      expect(record.playoffAppearances).toBe(4);

      // Verify tenure
      const currentTenure = getCurrentTenure(record);
      expect(currentTenure).not.toBeNull();
      expect(currentTenure!.seasons).toBe(5);
      expect(currentTenure!.championships).toBe(1);

      // Verify career summary
      expect(validateCareerRecord(record)).toBe(true);
      const summary = getCareerSummary(record);
      expect(summary).toContain('5 seasons');
      expect(summary).toContain('1 championship');
    });

    it('should track career achievements over 5 seasons', () => {
      let record = createCareerRecord('gm-2', 'Achievement GM');
      record = startNewTeam(record, 'team-2', 'Victory Lions', 2025);

      // Season with championship
      const championshipSeason: SeasonSnapshot = {
        year: 2025,
        teamId: 'team-2',
        teamName: 'Victory Lions',
        wins: 15,
        losses: 2,
        ties: 0,
        madePlayoffs: true,
        playoffWins: 4,
        wonDivision: true,
        wonConference: true,
        wonChampionship: true,
        fired: false,
      };

      record = recordSeason(record, championshipSeason);

      // Should have achievement
      expect(record.achievements.length).toBeGreaterThan(0);
      expect(record.achievements.some((a) => a.type === 'championship')).toBe(true);
    });
  });

  describe('career spanning multiple teams', () => {
    it('should track a career across 3 different teams over 8 years', () => {
      let record = createCareerRecord('gm-3', 'Journeyman GM');

      // Team 1: Years 1-3 (fired after losing seasons)
      record = startNewTeam(record, 'team-1', 'First City Bears', 2025);

      for (let year = 2025; year <= 2027; year++) {
        record = recordSeason(record, {
          year,
          teamId: 'team-1',
          teamName: 'First City Bears',
          wins: 5,
          losses: 12,
          ties: 0,
          madePlayoffs: false,
          playoffWins: 0,
          wonDivision: false,
          wonConference: false,
          wonChampionship: false,
          fired: year === 2027,
        });
      }

      // Record firing
      record = recordFiring(record, 'team-1', 2027, 15);

      // Year of unemployment
      record = recordUnemploymentYear(record);

      // Team 2: Years 5-6
      record = startNewTeam(record, 'team-2', 'Second City Tigers', 2029);

      for (let year = 2029; year <= 2030; year++) {
        record = recordSeason(record, {
          year,
          teamId: 'team-2',
          teamName: 'Second City Tigers',
          wins: 10,
          losses: 7,
          ties: 0,
          madePlayoffs: true,
          playoffWins: 1,
          wonDivision: false,
          wonConference: false,
          wonChampionship: false,
          fired: false,
        });
      }

      // Resign for better opportunity
      record = recordResignation(record, 'team-2', 2030);

      // Team 3: Years 7-8
      record = startNewTeam(record, 'team-3', 'Third City Hawks', 2031);

      for (let year = 2031; year <= 2032; year++) {
        record = recordSeason(record, {
          year,
          teamId: 'team-3',
          teamName: 'Third City Hawks',
          wins: 13,
          losses: 4,
          ties: 0,
          madePlayoffs: true,
          playoffWins: 3,
          wonDivision: true,
          wonConference: true,
          wonChampionship: year === 2032,
          fired: false,
        });
      }

      // Verify career spans
      expect(record.totalSeasons).toBe(7); // 3 + 2 + 2 (unemployment doesn't count)
      expect(record.teamsWorkedFor.length).toBe(3);
      expect(record.timesFired).toBe(1);
      // yearsUnemployed resets to 0 when getting a new job (as per startNewTeam)
      expect(record.yearsUnemployed).toBe(0);
      expect(record.championships).toBe(1);

      // Verify team tenures
      const team1Tenure = record.teamsWorkedFor[0];
      expect(team1Tenure.wasFired).toBe(true);
      expect(team1Tenure.seasons).toBe(3);

      const team2Tenure = record.teamsWorkedFor[1];
      expect(team2Tenure.wasFired).toBe(false);
      expect(team2Tenure.reasonForDeparture).toBe('resigned');

      const team3Tenure = record.teamsWorkedFor[2];
      expect(team3Tenure.championships).toBe(1);
      expect(team3Tenure.endYear).toBeNull();

      expect(validateCareerRecord(record)).toBe(true);
    });

    it('should maintain reputation through career changes', () => {
      let record = createCareerRecord('gm-4', 'Reputation GM');
      const initialReputation = record.reputationScore;

      // Start at team and get fired
      record = startNewTeam(record, 'team-1', 'First Team', 2025);
      record = recordSeason(record, {
        year: 2025,
        teamId: 'team-1',
        teamName: 'First Team',
        wins: 3,
        losses: 14,
        ties: 0,
        madePlayoffs: false,
        playoffWins: 0,
        wonDivision: false,
        wonConference: false,
        wonChampionship: false,
        fired: true,
      });
      record = recordFiring(record, 'team-1', 2025, 10);

      // Reputation should decrease after bad season + firing
      expect(record.reputationScore).toBeLessThan(initialReputation);

      // Get new job and succeed
      record = startNewTeam(record, 'team-2', 'Second Team', 2026);

      // Win championship
      record = recordSeason(record, {
        year: 2026,
        teamId: 'team-2',
        teamName: 'Second Team',
        wins: 14,
        losses: 3,
        ties: 0,
        madePlayoffs: true,
        playoffWins: 4,
        wonDivision: true,
        wonConference: true,
        wonChampionship: true,
        fired: false,
      });

      // Reputation should be in reasonable range
      expect(record.reputationScore).toBeGreaterThan(0);
      expect(record.reputationScore).toBeLessThanOrEqual(100);
      expect(validateCareerRecord(record)).toBe(true);
    });
  });

  describe('retirement after long career', () => {
    it('should properly handle retirement after 10+ year career', () => {
      let record = createCareerRecord('gm-5', 'Legend GM');
      record = startNewTeam(record, 'team-1', 'Dynasty Eagles', 2020);

      // Simulate 10 successful seasons
      for (let year = 2020; year <= 2029; year++) {
        const wins = 10 + Math.floor(Math.random() * 5);
        const wonChampionship = year === 2023 || year === 2027;

        record = recordSeason(record, {
          year,
          teamId: 'team-1',
          teamName: 'Dynasty Eagles',
          wins,
          losses: 17 - wins,
          ties: 0,
          madePlayoffs: wins >= 10,
          playoffWins: wonChampionship ? 4 : wins >= 12 ? 2 : 0,
          wonDivision: wins >= 12,
          wonConference: wonChampionship,
          wonChampionship,
          fired: false,
        });
      }

      // Initiate retirement
      const retirementState = initiateRetirement(record, 2029, 'voluntary');

      expect(retirementState.isRetired).toBe(true);
      expect(retirementState.retirementYear).toBe(2029);
      expect(retirementState.careerSummary).not.toBeNull();

      // Verify legacy calculation
      const legacyScore = calculateLegacyScore(record);
      expect(legacyScore).toBeGreaterThan(50); // Should have good legacy
      expect(validateRetirementState(retirementState)).toBe(true);
    });

    it('should calculate legacy tiers correctly', () => {
      // Create legendary career
      let legendRecord = createCareerRecord('gm-legend', 'Hall of Famer');
      legendRecord = startNewTeam(legendRecord, 'team-1', 'Dynasty Team', 2010);

      // 15 seasons with multiple championships
      for (let year = 2010; year <= 2024; year++) {
        const wonChampionship = year === 2012 || year === 2015 || year === 2020;

        legendRecord = recordSeason(legendRecord, {
          year,
          teamId: 'team-1',
          teamName: 'Dynasty Team',
          wins: 13,
          losses: 4,
          ties: 0,
          madePlayoffs: true,
          playoffWins: wonChampionship ? 4 : 2,
          wonDivision: true,
          wonConference: wonChampionship,
          wonChampionship,
          fired: false,
        });
      }

      const legendLegacyScore = calculateLegacyScore(legendRecord);
      expect(legendLegacyScore).toBeGreaterThan(80); // Should be legendary

      // Create mediocre career
      let avgRecord = createCareerRecord('gm-avg', 'Average GM');
      avgRecord = startNewTeam(avgRecord, 'team-2', 'Mediocre Team', 2020);

      for (let year = 2020; year <= 2024; year++) {
        avgRecord = recordSeason(avgRecord, {
          year,
          teamId: 'team-2',
          teamName: 'Mediocre Team',
          wins: 8,
          losses: 9,
          ties: 0,
          madePlayoffs: false,
          playoffWins: 0,
          wonDivision: false,
          wonConference: false,
          wonChampionship: false,
          fired: false,
        });
      }

      const avgLegacyScore = calculateLegacyScore(avgRecord);
      expect(avgLegacyScore).toBeLessThan(legendLegacyScore);
      expect(avgLegacyScore).toBeGreaterThan(20);
    });
  });

  describe('off-season phase integration', () => {
    it('should process all 12 off-season phases', () => {
      const offSeasonState = createOffSeasonState(2025);

      expect(offSeasonState.currentPhase).toBe('season_end');
      expect(offSeasonState.isComplete).toBe(false);

      // Auto-complete all phases
      const completedState = simulateRemainingOffSeason(offSeasonState);

      expect(completedState.isComplete).toBe(true);
      expect(completedState.completedPhases.length).toBe(12);
      expect(validateOffSeasonState(completedState)).toBe(true);

      // Verify all phases were completed
      for (const phase of PHASE_ORDER) {
        expect(completedState.completedPhases).toContain(phase);
      }
    });

    it('should integrate off-season with career progression', () => {
      // Start career
      let record = createCareerRecord('gm-offseason', 'Offseason GM');
      record = startNewTeam(record, 'team-1', 'Test Team', 2025);

      // Complete season
      record = recordSeason(record, {
        year: 2025,
        teamId: 'team-1',
        teamName: 'Test Team',
        wins: 10,
        losses: 7,
        ties: 0,
        madePlayoffs: true,
        playoffWins: 1,
        wonDivision: false,
        wonConference: false,
        wonChampionship: false,
        fired: false,
      });

      // Process off-season
      const offSeasonState = createOffSeasonState(2025);
      const completedOffSeason = simulateRemainingOffSeason(offSeasonState);

      // Start new season
      record = recordSeason(record, {
        year: 2026,
        teamId: 'team-1',
        teamName: 'Test Team',
        wins: 12,
        losses: 5,
        ties: 0,
        madePlayoffs: true,
        playoffWins: 2,
        wonDivision: true,
        wonConference: false,
        wonChampionship: false,
        fired: false,
      });

      expect(record.totalSeasons).toBe(2);
      expect(record.divisionTitles).toBe(1);
      expect(completedOffSeason.isComplete).toBe(true);
    });
  });

  describe('career validation', () => {
    it('should validate career records', () => {
      const validRecord = createCareerRecord('gm-valid', 'Valid GM');
      expect(validateCareerRecord(validRecord)).toBe(true);

      // Invalid records
      const invalidRecord1 = {
        ...validRecord,
        totalSeasons: -1,
      };
      expect(validateCareerRecord(invalidRecord1)).toBe(false);

      const invalidRecord2 = {
        ...validRecord,
        reputationScore: 150,
      };
      expect(validateCareerRecord(invalidRecord2)).toBe(false);
    });

    it('should validate retirement states', () => {
      const initialState = createRetirementState();
      expect(validateRetirementState(initialState)).toBe(true);
      expect(initialState.isRetired).toBe(false);

      // Create a career and retire
      let record = createCareerRecord('gm-retire', 'Retiring GM');
      record = startNewTeam(record, 'team-1', 'Test Team', 2025);
      record = recordSeason(record, {
        year: 2025,
        teamId: 'team-1',
        teamName: 'Test Team',
        wins: 10,
        losses: 7,
        ties: 0,
        madePlayoffs: true,
        playoffWins: 0,
        wonDivision: false,
        wonConference: false,
        wonChampionship: false,
        fired: false,
      });

      const retiredState = initiateRetirement(record, 2025, 'voluntary');
      expect(validateRetirementState(retiredState)).toBe(true);
      expect(retiredState.isRetired).toBe(true);
      expect(retiredState.careerSummary).not.toBeNull();
    });
  });

  describe('reputation system', () => {
    it('should classify reputation into tiers', () => {
      expect(getReputationTier(90)).toBe('elite');
      expect(getReputationTier(75)).toBe('high');
      expect(getReputationTier(55)).toBe('moderate');
      expect(getReputationTier(35)).toBe('low');
      expect(getReputationTier(20)).toBe('none');
    });

    it('should update reputation based on career events', () => {
      let record = createCareerRecord('gm-rep', 'Reputation Test GM');
      const baseReputation = record.reputationScore;

      record = startNewTeam(record, 'team-1', 'Test Team', 2025);

      // Bad season and firing should decrease reputation
      record = recordSeason(record, {
        year: 2025,
        teamId: 'team-1',
        teamName: 'Test Team',
        wins: 3,
        losses: 14,
        ties: 0,
        madePlayoffs: false,
        playoffWins: 0,
        wonDivision: false,
        wonConference: false,
        wonChampionship: false,
        fired: true,
      });

      record = recordFiring(record, 'team-1', 2025, 5);

      // Unemployment should further decrease reputation
      record = recordUnemploymentYear(record);
      record = recordUnemploymentYear(record);

      expect(record.reputationScore).toBeLessThan(baseReputation);
      expect(record.yearsUnemployed).toBe(2);
    });
  });
});
