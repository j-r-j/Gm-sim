/**
 * Team Model Tests
 * Tests for Team entity validation, conference/division assignments, and roster limits
 */

import {
  TeamRecord,
  validateTeam,
  validateTeamRecord,
  createEmptyTeamRecord,
  createTeamFromCity,
  getTeamFullName,
  getWinningPercentage,
  getPointDifferential,
  updateStreak,
  addPlayerToRoster,
  removePlayerFromRoster,
  moveToInjuredReserve,
  hasRosterSpace,
  hasPracticeSquadSpace,
  getRecordString,
  MAX_ACTIVE_ROSTER_SIZE,
  MAX_PRACTICE_SQUAD_SIZE,
  MAX_IR_SIZE,
} from '../Team';

import {
  validateTeamFinances,
  createDefaultTeamFinances,
  DEFAULT_SALARY_CAP,
} from '../TeamFinances';

import { validateStadium, createDefaultStadium } from '../Stadium';

import { FAKE_CITIES, FakeCity } from '../FakeCities';

describe('TeamRecord', () => {
  describe('createEmptyTeamRecord', () => {
    it('should create a record with all zeros', () => {
      const record = createEmptyTeamRecord();
      expect(record.wins).toBe(0);
      expect(record.losses).toBe(0);
      expect(record.ties).toBe(0);
      expect(record.pointsFor).toBe(0);
      expect(record.pointsAgainst).toBe(0);
      expect(record.streak).toBe(0);
    });
  });

  describe('validateTeamRecord', () => {
    it('should validate a correct record', () => {
      const record: TeamRecord = {
        wins: 10,
        losses: 6,
        ties: 1,
        divisionWins: 4,
        divisionLosses: 2,
        conferenceWins: 8,
        conferenceLosses: 4,
        pointsFor: 350,
        pointsAgainst: 280,
        streak: 3,
      };
      expect(validateTeamRecord(record)).toBe(true);
    });

    it('should reject negative wins', () => {
      const record = createEmptyTeamRecord();
      record.wins = -1;
      expect(validateTeamRecord(record)).toBe(false);
    });

    it('should reject too many wins', () => {
      const record = createEmptyTeamRecord();
      record.wins = 21;
      expect(validateTeamRecord(record)).toBe(false);
    });

    it('should reject invalid streak', () => {
      const record = createEmptyTeamRecord();
      record.streak = 20;
      expect(validateTeamRecord(record)).toBe(false);
    });
  });

  describe('updateStreak', () => {
    it('should start a winning streak', () => {
      const record = createEmptyTeamRecord();
      const updated = updateStreak(record, true);
      expect(updated.streak).toBe(1);
    });

    it('should continue a winning streak', () => {
      const record = { ...createEmptyTeamRecord(), streak: 3 };
      const updated = updateStreak(record, true);
      expect(updated.streak).toBe(4);
    });

    it('should start a losing streak', () => {
      const record = createEmptyTeamRecord();
      const updated = updateStreak(record, false);
      expect(updated.streak).toBe(-1);
    });

    it('should continue a losing streak', () => {
      const record = { ...createEmptyTeamRecord(), streak: -3 };
      const updated = updateStreak(record, false);
      expect(updated.streak).toBe(-4);
    });

    it('should break a winning streak with a loss', () => {
      const record = { ...createEmptyTeamRecord(), streak: 5 };
      const updated = updateStreak(record, false);
      expect(updated.streak).toBe(-1);
    });

    it('should break a losing streak with a win', () => {
      const record = { ...createEmptyTeamRecord(), streak: -4 };
      const updated = updateStreak(record, true);
      expect(updated.streak).toBe(1);
    });
  });

  describe('getRecordString', () => {
    it('should format record without ties', () => {
      const record = { ...createEmptyTeamRecord(), wins: 10, losses: 7 };
      expect(getRecordString(record)).toBe('10-7');
    });

    it('should format record with ties', () => {
      const record = { ...createEmptyTeamRecord(), wins: 10, losses: 6, ties: 1 };
      expect(getRecordString(record)).toBe('10-6-1');
    });
  });
});

describe('TeamFinances', () => {
  describe('createDefaultTeamFinances', () => {
    it('should create valid finances', () => {
      const finances = createDefaultTeamFinances('team-1');
      expect(validateTeamFinances(finances)).toBe(true);
    });

    it('should have full cap space initially', () => {
      const finances = createDefaultTeamFinances('team-1');
      expect(finances.capSpace).toBe(finances.salaryCap);
      expect(finances.currentCapUsage).toBe(0);
    });

    it('should use default salary cap', () => {
      const finances = createDefaultTeamFinances('team-1');
      expect(finances.salaryCap).toBe(DEFAULT_SALARY_CAP);
    });
  });

  describe('validateTeamFinances', () => {
    it('should validate correct finances', () => {
      const finances = createDefaultTeamFinances('team-1');
      expect(validateTeamFinances(finances)).toBe(true);
    });

    it('should reject mismatched cap space calculation', () => {
      const finances = createDefaultTeamFinances('team-1');
      finances.capSpace = 100000; // Wrong value
      expect(validateTeamFinances(finances)).toBe(false);
    });

    it('should reject staff spending over budget', () => {
      const finances = createDefaultTeamFinances('team-1');
      finances.staffSpending = finances.staffBudget + 1000;
      expect(validateTeamFinances(finances)).toBe(false);
    });
  });
});

describe('Stadium', () => {
  describe('createDefaultStadium', () => {
    it('should create a valid stadium', () => {
      const stadium = createDefaultStadium('stadium-1', 'team-1', 'Test City');
      expect(validateStadium(stadium)).toBe(true);
    });

    it('should set city in name', () => {
      const stadium = createDefaultStadium('stadium-1', 'team-1', 'Buffalo');
      expect(stadium.name).toBe('Buffalo Stadium');
      expect(stadium.city).toBe('Buffalo');
    });
  });

  describe('validateStadium', () => {
    it('should reject stadium with invalid type', () => {
      const stadium = createDefaultStadium('stadium-1', 'team-1', 'City');
      (stadium as any).type = 'invalid';
      expect(validateStadium(stadium)).toBe(false);
    });

    it('should reject stadium with invalid capacity', () => {
      const stadium = createDefaultStadium('stadium-1', 'team-1', 'City');
      stadium.capacity = 10000; // Too small
      expect(validateStadium(stadium)).toBe(false);
    });

    it('should reject stadium with invalid noise factor', () => {
      const stadium = createDefaultStadium('stadium-1', 'team-1', 'City');
      stadium.noiseFactor = 15; // Over max of 10
      expect(validateStadium(stadium)).toBe(false);
    });
  });
});

describe('Team', () => {
  const getTestCity = (): FakeCity => FAKE_CITIES[0];

  describe('createTeamFromCity', () => {
    it('should create a valid team', () => {
      const city = getTestCity();
      const team = createTeamFromCity('team-1', city, 'owner-1', DEFAULT_SALARY_CAP);
      expect(validateTeam(team)).toBe(true);
    });

    it('should use city properties', () => {
      const city = getTestCity();
      const team = createTeamFromCity('team-1', city, 'owner-1', DEFAULT_SALARY_CAP);
      expect(team.city).toBe(city.city);
      expect(team.nickname).toBe(city.nickname);
      expect(team.abbreviation).toBe(city.abbreviation);
      expect(team.conference).toBe(city.conference);
      expect(team.division).toBe(city.division);
    });

    it('should have empty roster initially', () => {
      const city = getTestCity();
      const team = createTeamFromCity('team-1', city, 'owner-1', DEFAULT_SALARY_CAP);
      expect(team.rosterPlayerIds).toHaveLength(0);
      expect(team.practiceSquadIds).toHaveLength(0);
      expect(team.injuredReserveIds).toHaveLength(0);
    });
  });

  describe('validateTeam', () => {
    it('should validate a complete team', () => {
      const city = getTestCity();
      const team = createTeamFromCity('team-1', city, 'owner-1', DEFAULT_SALARY_CAP);
      expect(validateTeam(team)).toBe(true);
    });

    it('should reject team with invalid conference', () => {
      const city = getTestCity();
      const team = createTeamFromCity('team-1', city, 'owner-1', DEFAULT_SALARY_CAP);
      (team as any).conference = 'XFL';
      expect(validateTeam(team)).toBe(false);
    });

    it('should reject team with invalid division', () => {
      const city = getTestCity();
      const team = createTeamFromCity('team-1', city, 'owner-1', DEFAULT_SALARY_CAP);
      (team as any).division = 'Central';
      expect(validateTeam(team)).toBe(false);
    });

    it('should reject team with invalid abbreviation length', () => {
      const city = getTestCity();
      const team = createTeamFromCity('team-1', city, 'owner-1', DEFAULT_SALARY_CAP);
      team.abbreviation = 'ABCD';
      expect(validateTeam(team)).toBe(false);
    });

    it('should reject team over roster limit', () => {
      const city = getTestCity();
      const team = createTeamFromCity('team-1', city, 'owner-1', DEFAULT_SALARY_CAP);
      team.rosterPlayerIds = Array(MAX_ACTIVE_ROSTER_SIZE + 1).fill('player-x');
      expect(validateTeam(team)).toBe(false);
    });
  });

  describe('getTeamFullName', () => {
    it('should return city and nickname', () => {
      const city = getTestCity();
      const team = createTeamFromCity('team-1', city, 'owner-1', DEFAULT_SALARY_CAP);
      expect(getTeamFullName(team)).toBe(`${city.city} ${city.nickname}`);
    });
  });

  describe('getWinningPercentage', () => {
    it('should return 0 for no games', () => {
      const city = getTestCity();
      const team = createTeamFromCity('team-1', city, 'owner-1', DEFAULT_SALARY_CAP);
      expect(getWinningPercentage(team)).toBe(0);
    });

    it('should calculate correctly with wins and losses', () => {
      const city = getTestCity();
      const team = createTeamFromCity('team-1', city, 'owner-1', DEFAULT_SALARY_CAP);
      team.currentRecord.wins = 10;
      team.currentRecord.losses = 6;
      expect(getWinningPercentage(team)).toBeCloseTo(0.625, 3);
    });

    it('should count ties as half wins', () => {
      const city = getTestCity();
      const team = createTeamFromCity('team-1', city, 'owner-1', DEFAULT_SALARY_CAP);
      team.currentRecord.wins = 8;
      team.currentRecord.losses = 8;
      team.currentRecord.ties = 1;
      // (8 + 0.5) / 17 = 0.5
      expect(getWinningPercentage(team)).toBeCloseTo(0.5, 3);
    });
  });

  describe('getPointDifferential', () => {
    it('should calculate point differential', () => {
      const city = getTestCity();
      const team = createTeamFromCity('team-1', city, 'owner-1', DEFAULT_SALARY_CAP);
      team.currentRecord.pointsFor = 400;
      team.currentRecord.pointsAgainst = 350;
      expect(getPointDifferential(team)).toBe(50);
    });

    it('should return negative for more points against', () => {
      const city = getTestCity();
      const team = createTeamFromCity('team-1', city, 'owner-1', DEFAULT_SALARY_CAP);
      team.currentRecord.pointsFor = 300;
      team.currentRecord.pointsAgainst = 380;
      expect(getPointDifferential(team)).toBe(-80);
    });
  });

  describe('Roster Management', () => {
    describe('addPlayerToRoster', () => {
      it('should add a player to the roster', () => {
        const city = getTestCity();
        const team = createTeamFromCity('team-1', city, 'owner-1', DEFAULT_SALARY_CAP);
        const updated = addPlayerToRoster(team, 'player-1');
        expect(updated.rosterPlayerIds).toContain('player-1');
      });

      it('should throw when roster is full', () => {
        const city = getTestCity();
        const team = createTeamFromCity('team-1', city, 'owner-1', DEFAULT_SALARY_CAP);
        team.rosterPlayerIds = Array(MAX_ACTIVE_ROSTER_SIZE)
          .fill(0)
          .map((_, i) => `player-${i}`);
        expect(() => addPlayerToRoster(team, 'player-new')).toThrow('Roster is full');
      });

      it('should throw when player already on roster', () => {
        const city = getTestCity();
        let team = createTeamFromCity('team-1', city, 'owner-1', DEFAULT_SALARY_CAP);
        team = addPlayerToRoster(team, 'player-1');
        expect(() => addPlayerToRoster(team, 'player-1')).toThrow('Player already on roster');
      });
    });

    describe('removePlayerFromRoster', () => {
      it('should remove a player from the roster', () => {
        const city = getTestCity();
        let team = createTeamFromCity('team-1', city, 'owner-1', DEFAULT_SALARY_CAP);
        team = addPlayerToRoster(team, 'player-1');
        team = removePlayerFromRoster(team, 'player-1');
        expect(team.rosterPlayerIds).not.toContain('player-1');
      });
    });

    describe('moveToInjuredReserve', () => {
      it('should move player from roster to IR', () => {
        const city = getTestCity();
        let team = createTeamFromCity('team-1', city, 'owner-1', DEFAULT_SALARY_CAP);
        team = addPlayerToRoster(team, 'player-1');
        team = moveToInjuredReserve(team, 'player-1');
        expect(team.rosterPlayerIds).not.toContain('player-1');
        expect(team.injuredReserveIds).toContain('player-1');
      });

      it('should throw when player not on roster', () => {
        const city = getTestCity();
        const team = createTeamFromCity('team-1', city, 'owner-1', DEFAULT_SALARY_CAP);
        expect(() => moveToInjuredReserve(team, 'player-1')).toThrow('Player not on roster');
      });
    });

    describe('hasRosterSpace', () => {
      it('should return true when roster has space', () => {
        const city = getTestCity();
        const team = createTeamFromCity('team-1', city, 'owner-1', DEFAULT_SALARY_CAP);
        expect(hasRosterSpace(team)).toBe(true);
      });

      it('should return false when roster is full', () => {
        const city = getTestCity();
        const team = createTeamFromCity('team-1', city, 'owner-1', DEFAULT_SALARY_CAP);
        team.rosterPlayerIds = Array(MAX_ACTIVE_ROSTER_SIZE)
          .fill(0)
          .map((_, i) => `player-${i}`);
        expect(hasRosterSpace(team)).toBe(false);
      });
    });

    describe('hasPracticeSquadSpace', () => {
      it('should return true when practice squad has space', () => {
        const city = getTestCity();
        const team = createTeamFromCity('team-1', city, 'owner-1', DEFAULT_SALARY_CAP);
        expect(hasPracticeSquadSpace(team)).toBe(true);
      });

      it('should return false when practice squad is full', () => {
        const city = getTestCity();
        const team = createTeamFromCity('team-1', city, 'owner-1', DEFAULT_SALARY_CAP);
        team.practiceSquadIds = Array(MAX_PRACTICE_SQUAD_SIZE)
          .fill(0)
          .map((_, i) => `player-${i}`);
        expect(hasPracticeSquadSpace(team)).toBe(false);
      });
    });
  });

  describe('Roster Size Limits', () => {
    it('should have correct max active roster size', () => {
      expect(MAX_ACTIVE_ROSTER_SIZE).toBe(53);
    });

    it('should have correct max practice squad size', () => {
      expect(MAX_PRACTICE_SQUAD_SIZE).toBe(16);
    });

    it('should have correct max IR size', () => {
      expect(MAX_IR_SIZE).toBe(20);
    });
  });
});
