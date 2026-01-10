/**
 * League Model Tests
 * Tests for league structure, playoff bracket logic, and standings
 */

import {
  SeasonCalendar,
  PlayoffMatchup,
  LeagueEvent,
  validateLeague,
  validateSeasonCalendar,
  validateLeagueSettings,
  validatePlayoffMatchup,
  createDefaultLeague,
  createDefaultCalendar,
  createEmptyPlayoffBracket,
  advanceWeek,
  advanceOffseasonPhase,
  getPhaseDescription,
  addLeagueEvent,
  clearWeekEvents,
  DEFAULT_LEAGUE_SETTINGS,
  REGULAR_SEASON_WEEKS,
  PLAYOFF_WEEKS,
} from '../League';

import {
  validateDraftPick,
  createDraftPick,
  createCompensatoryPick,
  tradePick,
  hasBeenTraded,
  getTradeCount,
  assignOverallPick,
  recordSelection,
  isPicked,
  getPickDisplayString,
  calculatePickValue,
  generateDraftPicksForYear,
  getTeamPicksForYear,
  DRAFT_ROUNDS,
} from '../DraftPick';

describe('SeasonCalendar', () => {
  describe('createDefaultCalendar', () => {
    it('should create a valid calendar', () => {
      const calendar = createDefaultCalendar(2025);
      expect(validateSeasonCalendar(calendar)).toBe(true);
    });

    it('should start in preseason week 1', () => {
      const calendar = createDefaultCalendar(2025);
      expect(calendar.currentYear).toBe(2025);
      expect(calendar.currentWeek).toBe(1);
      expect(calendar.currentPhase).toBe('preseason');
    });

    it('should have no offseason phase initially', () => {
      const calendar = createDefaultCalendar(2025);
      expect(calendar.offseasonPhase).toBeNull();
    });
  });

  describe('validateSeasonCalendar', () => {
    it('should validate a correct calendar', () => {
      const calendar = createDefaultCalendar(2025);
      expect(validateSeasonCalendar(calendar)).toBe(true);
    });

    it('should reject invalid year', () => {
      const calendar = createDefaultCalendar(2025);
      calendar.currentYear = 1900;
      expect(validateSeasonCalendar(calendar)).toBe(false);
    });

    it('should reject invalid week', () => {
      const calendar = createDefaultCalendar(2025);
      calendar.currentWeek = 25;
      expect(validateSeasonCalendar(calendar)).toBe(false);
    });

    it('should reject offseason without phase', () => {
      const calendar: SeasonCalendar = {
        currentYear: 2025,
        currentWeek: 1,
        currentPhase: 'offseason',
        offseasonPhase: null, // Invalid: offseason needs phase
      };
      expect(validateSeasonCalendar(calendar)).toBe(false);
    });

    it('should reject non-offseason with phase', () => {
      const calendar: SeasonCalendar = {
        currentYear: 2025,
        currentWeek: 5,
        currentPhase: 'regularSeason',
        offseasonPhase: 3, // Invalid: not in offseason
      };
      expect(validateSeasonCalendar(calendar)).toBe(false);
    });
  });

  describe('advanceWeek', () => {
    it('should advance week by 1', () => {
      const calendar = createDefaultCalendar(2025);
      calendar.currentPhase = 'regularSeason';
      const advanced = advanceWeek(calendar);
      expect(advanced.currentWeek).toBe(2);
    });

    it('should transition to playoffs after regular season', () => {
      const calendar: SeasonCalendar = {
        currentYear: 2025,
        currentWeek: REGULAR_SEASON_WEEKS,
        currentPhase: 'regularSeason',
        offseasonPhase: null,
      };
      const advanced = advanceWeek(calendar);
      expect(advanced.currentPhase).toBe('playoffs');
    });

    it('should transition to offseason after playoffs', () => {
      const calendar: SeasonCalendar = {
        currentYear: 2025,
        currentWeek: REGULAR_SEASON_WEEKS + PLAYOFF_WEEKS,
        currentPhase: 'playoffs',
        offseasonPhase: null,
      };
      const advanced = advanceWeek(calendar);
      expect(advanced.currentPhase).toBe('offseason');
      expect(advanced.offseasonPhase).toBe(1);
    });
  });

  describe('advanceOffseasonPhase', () => {
    it('should advance offseason phase', () => {
      const calendar: SeasonCalendar = {
        currentYear: 2025,
        currentWeek: 1,
        currentPhase: 'offseason',
        offseasonPhase: 5,
      };
      const advanced = advanceOffseasonPhase(calendar);
      expect(advanced.offseasonPhase).toBe(6);
    });

    it('should transition to preseason after offseason ends', () => {
      const calendar: SeasonCalendar = {
        currentYear: 2025,
        currentWeek: 1,
        currentPhase: 'offseason',
        offseasonPhase: 12,
      };
      const advanced = advanceOffseasonPhase(calendar);
      expect(advanced.currentPhase).toBe('preseason');
      expect(advanced.currentYear).toBe(2026);
      expect(advanced.offseasonPhase).toBeNull();
    });

    it('should throw if not in offseason', () => {
      const calendar = createDefaultCalendar(2025);
      expect(() => advanceOffseasonPhase(calendar)).toThrow('Not in offseason');
    });
  });

  describe('getPhaseDescription', () => {
    it('should describe regular season week', () => {
      const calendar: SeasonCalendar = {
        currentYear: 2025,
        currentWeek: 10,
        currentPhase: 'regularSeason',
        offseasonPhase: null,
      };
      expect(getPhaseDescription(calendar)).toBe('Week 10');
    });

    it('should describe offseason phase', () => {
      const calendar: SeasonCalendar = {
        currentYear: 2025,
        currentWeek: 1,
        currentPhase: 'offseason',
        offseasonPhase: 8,
      };
      expect(getPhaseDescription(calendar)).toBe('NFL Draft');
    });

    it('should describe playoff rounds', () => {
      const calendar: SeasonCalendar = {
        currentYear: 2025,
        currentWeek: 19,
        currentPhase: 'playoffs',
        offseasonPhase: null,
      };
      expect(getPhaseDescription(calendar)).toBe('Wild Card Round');
    });
  });
});

describe('LeagueSettings', () => {
  describe('DEFAULT_LEAGUE_SETTINGS', () => {
    it('should have valid default settings', () => {
      expect(validateLeagueSettings(DEFAULT_LEAGUE_SETTINGS)).toBe(true);
    });

    it('should have salary floor below cap', () => {
      expect(DEFAULT_LEAGUE_SETTINGS.salaryFloor).toBeLessThan(DEFAULT_LEAGUE_SETTINGS.salaryCap);
    });

    it('should have roster size of 53', () => {
      expect(DEFAULT_LEAGUE_SETTINGS.activeRosterSize).toBe(53);
    });

    it('should have practice squad of 16', () => {
      expect(DEFAULT_LEAGUE_SETTINGS.practiceSquadSize).toBe(16);
    });
  });

  describe('validateLeagueSettings', () => {
    it('should reject floor above cap', () => {
      const settings = { ...DEFAULT_LEAGUE_SETTINGS, salaryFloor: 300000 };
      expect(validateLeagueSettings(settings)).toBe(false);
    });

    it('should reject invalid roster size', () => {
      const settings = { ...DEFAULT_LEAGUE_SETTINGS, activeRosterSize: 100 };
      expect(validateLeagueSettings(settings)).toBe(false);
    });
  });
});

describe('PlayoffMatchup', () => {
  describe('validatePlayoffMatchup', () => {
    it('should validate a pending matchup', () => {
      const matchup: PlayoffMatchup = {
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        homeScore: null,
        awayScore: null,
        winnerId: null,
      };
      expect(validatePlayoffMatchup(matchup)).toBe(true);
    });

    it('should validate a completed matchup', () => {
      const matchup: PlayoffMatchup = {
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        homeScore: 28,
        awayScore: 21,
        winnerId: 'team-1',
      };
      expect(validatePlayoffMatchup(matchup)).toBe(true);
    });

    it('should reject winner without scores', () => {
      const matchup: PlayoffMatchup = {
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        homeScore: null,
        awayScore: null,
        winnerId: 'team-1',
      };
      expect(validatePlayoffMatchup(matchup)).toBe(false);
    });

    it('should reject winner not in matchup', () => {
      const matchup: PlayoffMatchup = {
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        homeScore: 28,
        awayScore: 21,
        winnerId: 'team-3',
      };
      expect(validatePlayoffMatchup(matchup)).toBe(false);
    });
  });

  describe('createEmptyPlayoffBracket', () => {
    it('should create empty bracket', () => {
      const bracket = createEmptyPlayoffBracket();
      expect(Object.keys(bracket.afcSeeds)).toHaveLength(0);
      expect(Object.keys(bracket.nfcSeeds)).toHaveLength(0);
      expect(bracket.wildCardResults).toHaveLength(0);
      expect(bracket.superBowl).toBeNull();
    });
  });
});

describe('League', () => {
  const teamIds = Array.from({ length: 32 }, (_, i) => `team-${i + 1}`);

  describe('createDefaultLeague', () => {
    it('should create a valid league', () => {
      const league = createDefaultLeague('league-1', teamIds, 2025);
      expect(validateLeague(league)).toBe(true);
    });

    it('should have 32 teams', () => {
      const league = createDefaultLeague('league-1', teamIds, 2025);
      expect(league.teamIds).toHaveLength(32);
    });
  });

  describe('validateLeague', () => {
    it('should reject league with wrong team count', () => {
      const league = createDefaultLeague('league-1', teamIds.slice(0, 30), 2025);
      expect(validateLeague(league)).toBe(false);
    });

    it('should reject league with invalid calendar', () => {
      const league = createDefaultLeague('league-1', teamIds, 2025);
      league.calendar.currentYear = 1800;
      expect(validateLeague(league)).toBe(false);
    });
  });

  describe('addLeagueEvent', () => {
    it('should add an event', () => {
      let league = createDefaultLeague('league-1', teamIds, 2025);
      const event: LeagueEvent = {
        id: 'event-1',
        type: 'trade',
        week: 5,
        description: 'Big trade',
        involvedTeamIds: ['team-1', 'team-2'],
        involvedPlayerIds: ['player-1'],
      };
      league = addLeagueEvent(league, event);
      expect(league.upcomingEvents).toHaveLength(1);
    });
  });

  describe('clearWeekEvents', () => {
    it('should clear events from a week', () => {
      let league = createDefaultLeague('league-1', teamIds, 2025);
      const event1: LeagueEvent = {
        id: 'event-1',
        type: 'trade',
        week: 5,
        description: 'Trade 1',
        involvedTeamIds: ['team-1'],
        involvedPlayerIds: [],
      };
      const event2: LeagueEvent = {
        id: 'event-2',
        type: 'injury',
        week: 6,
        description: 'Injury',
        involvedTeamIds: ['team-2'],
        involvedPlayerIds: ['player-1'],
      };
      league = addLeagueEvent(league, event1);
      league = addLeagueEvent(league, event2);
      league = clearWeekEvents(league, 5);
      expect(league.upcomingEvents).toHaveLength(1);
      expect(league.upcomingEvents[0].week).toBe(6);
    });
  });
});

describe('DraftPick', () => {
  describe('createDraftPick', () => {
    it('should create a valid pick', () => {
      const pick = createDraftPick('pick-1', 2025, 1, 'team-1');
      expect(validateDraftPick(pick)).toBe(true);
    });

    it('should have no trade history initially', () => {
      const pick = createDraftPick('pick-1', 2025, 1, 'team-1');
      expect(pick.tradeHistory).toHaveLength(0);
    });

    it('should have null selection initially', () => {
      const pick = createDraftPick('pick-1', 2025, 1, 'team-1');
      expect(pick.selectedPlayerId).toBeNull();
      expect(pick.overallPick).toBeNull();
    });
  });

  describe('tradePick', () => {
    it('should transfer ownership', () => {
      const pick = createDraftPick('pick-1', 2025, 1, 'team-1');
      const traded = tradePick(pick, 'team-2', 'trade-1', 10, 2024);
      expect(traded.currentTeamId).toBe('team-2');
      expect(traded.originalTeamId).toBe('team-1');
    });

    it('should record trade history', () => {
      const pick = createDraftPick('pick-1', 2025, 1, 'team-1');
      const traded = tradePick(pick, 'team-2', 'trade-1', 10, 2024);
      expect(traded.tradeHistory).toHaveLength(1);
      expect(traded.tradeHistory[0].fromTeamId).toBe('team-1');
      expect(traded.tradeHistory[0].toTeamId).toBe('team-2');
    });
  });

  describe('hasBeenTraded', () => {
    it('should return false for original pick', () => {
      const pick = createDraftPick('pick-1', 2025, 1, 'team-1');
      expect(hasBeenTraded(pick)).toBe(false);
    });

    it('should return true after trade', () => {
      const pick = createDraftPick('pick-1', 2025, 1, 'team-1');
      const traded = tradePick(pick, 'team-2', 'trade-1', 10, 2024);
      expect(hasBeenTraded(traded)).toBe(true);
    });
  });

  describe('getTradeCount', () => {
    it('should return 0 for untreaded pick', () => {
      const pick = createDraftPick('pick-1', 2025, 1, 'team-1');
      expect(getTradeCount(pick)).toBe(0);
    });

    it('should count multiple trades', () => {
      let pick = createDraftPick('pick-1', 2025, 1, 'team-1');
      pick = tradePick(pick, 'team-2', 'trade-1', 10, 2024);
      pick = tradePick(pick, 'team-3', 'trade-2', 15, 2024);
      expect(getTradeCount(pick)).toBe(2);
    });
  });

  describe('assignOverallPick', () => {
    it('should assign overall pick number', () => {
      const pick = createDraftPick('pick-1', 2025, 1, 'team-1');
      const assigned = assignOverallPick(pick, 15);
      expect(assigned.overallPick).toBe(15);
    });
  });

  describe('recordSelection', () => {
    it('should record selected player', () => {
      const pick = createDraftPick('pick-1', 2025, 1, 'team-1');
      const selected = recordSelection(pick, 'player-1');
      expect(selected.selectedPlayerId).toBe('player-1');
    });
  });

  describe('isPicked', () => {
    it('should return false before selection', () => {
      const pick = createDraftPick('pick-1', 2025, 1, 'team-1');
      expect(isPicked(pick)).toBe(false);
    });

    it('should return true after selection', () => {
      let pick = createDraftPick('pick-1', 2025, 1, 'team-1');
      pick = recordSelection(pick, 'player-1');
      expect(isPicked(pick)).toBe(true);
    });
  });

  describe('getPickDisplayString', () => {
    it('should display future pick without overall', () => {
      const pick = createDraftPick('pick-1', 2025, 1, 'team-1');
      expect(getPickDisplayString(pick)).toBe('2025 Round 1');
    });

    it('should display pick with overall number', () => {
      let pick = createDraftPick('pick-1', 2025, 1, 'team-1');
      pick = assignOverallPick(pick, 15);
      expect(getPickDisplayString(pick)).toBe('Round 1, Pick 15');
    });
  });

  describe('calculatePickValue', () => {
    it('should value first round highest', () => {
      expect(calculatePickValue(1, 1)).toBeGreaterThan(calculatePickValue(2, 33));
    });

    it('should decrease value by round', () => {
      expect(calculatePickValue(1, null)).toBeGreaterThan(calculatePickValue(2, null));
      expect(calculatePickValue(2, null)).toBeGreaterThan(calculatePickValue(3, null));
    });

    it('should value early picks in round more', () => {
      expect(calculatePickValue(1, 1)).toBeGreaterThan(calculatePickValue(1, 32));
    });
  });

  describe('generateDraftPicksForYear', () => {
    it('should generate picks for all rounds and teams', () => {
      const teamIds = ['team-1', 'team-2', 'team-3'];
      const picks = generateDraftPicksForYear(2025, teamIds, 'pick');
      expect(picks).toHaveLength(DRAFT_ROUNDS * teamIds.length);
    });

    it('should assign correct teams', () => {
      const teamIds = ['team-1', 'team-2'];
      const picks = generateDraftPicksForYear(2025, teamIds, 'pick');
      const team1Picks = picks.filter((p) => p.currentTeamId === 'team-1');
      expect(team1Picks).toHaveLength(DRAFT_ROUNDS);
    });
  });

  describe('getTeamPicksForYear', () => {
    it('should return team picks for a year', () => {
      const picks = [
        createDraftPick('pick-1', 2025, 1, 'team-1'),
        createDraftPick('pick-2', 2025, 2, 'team-1'),
        createDraftPick('pick-3', 2025, 1, 'team-2'),
        createDraftPick('pick-4', 2026, 1, 'team-1'),
      ];
      const team1Picks2025 = getTeamPicksForYear(picks, 'team-1', 2025);
      expect(team1Picks2025).toHaveLength(2);
    });
  });

  describe('CompensatoryPick', () => {
    it('should create valid compensatory pick', () => {
      const pick = createCompensatoryPick('comp-1', 2025, 4, 'team-1', 'Lost FA: John Smith');
      expect(pick.compensatoryReason).toBe('Lost FA: John Smith');
      expect(pick.round).toBe(4);
    });
  });
});
