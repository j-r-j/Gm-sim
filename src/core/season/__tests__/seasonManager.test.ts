/**
 * Season Manager Tests
 */

import { SeasonManager, createSeasonManager, SeasonPhase } from '../SeasonManager';
import { createDefaultStandings } from '../ScheduleGenerator';
import { Team, createEmptyTeamRecord } from '../../models/team/Team';
import { FAKE_CITIES } from '../../models/team/FakeCities';
import { createDefaultStadium } from '../../models/team/Stadium';
import { createDefaultTeamFinances } from '../../models/team/TeamFinances';
import { createEmptyStaffHierarchy } from '../../models/staff/StaffHierarchy';

// Helper to create test teams
function createTestTeams(): Team[] {
  return FAKE_CITIES.map((city, index) => ({
    id: `team-${index}`,
    city: city.city,
    nickname: city.nickname,
    abbreviation: city.abbreviation,
    conference: city.conference,
    division: city.division,
    stadium: {
      ...createDefaultStadium(`stadium-${index}`, `team-${index}`, city.city),
      type: city.stadiumType,
      latitude: city.latitude,
    },
    finances: createDefaultTeamFinances(`team-${index}`, 255000),
    staffHierarchy: createEmptyStaffHierarchy(`team-${index}`, 30000),
    ownerId: `owner-${index}`,
    gmId: null,
    rosterPlayerIds: [],
    practiceSquadIds: [],
    injuredReserveIds: [],
    currentRecord: createEmptyTeamRecord(),
    playoffSeed: null,
    isEliminated: false,
    allTimeRecord: { wins: 0, losses: 0, ties: 0 },
    championships: 0,
    lastChampionshipYear: null,
    marketSize: city.marketSize,
    prestige: 50,
    fanbasePassion: 50,
  }));
}

describe('SeasonManager', () => {
  let teams: Team[];
  let manager: SeasonManager;

  beforeEach(() => {
    teams = createTestTeams();
    manager = createSeasonManager(2025, teams, teams[0].id);
  });

  describe('constructor', () => {
    it('should create a season manager', () => {
      expect(manager).toBeDefined();
    });

    it('should initialize in preseason phase', () => {
      expect(manager.getCurrentPhase()).toBe('preseason');
    });

    it('should initialize with week 0', () => {
      expect(manager.getCurrentWeek()).toBe(0);
    });
  });

  describe('startSeason', () => {
    it('should transition to week 1', () => {
      manager.startSeason();
      expect(manager.getCurrentWeek()).toBe(1);
      expect(manager.getCurrentPhase()).toBe('week1');
    });
  });

  describe('getStandings', () => {
    it('should return initial standings', () => {
      const standings = manager.getStandings();
      expect(standings).toBeDefined();
      expect(standings.afc).toBeDefined();
      expect(standings.nfc).toBeDefined();
    });

    it('should have all 32 teams in standings', () => {
      const standings = manager.getStandings();
      let teamCount = 0;

      for (const conference of ['afc', 'nfc'] as const) {
        for (const division of ['north', 'south', 'east', 'west'] as const) {
          teamCount += standings[conference][division].length;
        }
      }

      expect(teamCount).toBe(32);
    });
  });

  describe('getSchedule', () => {
    it('should return the season schedule', () => {
      const schedule = manager.getSchedule();
      expect(schedule).toBeDefined();
      expect(schedule.year).toBe(2025);
      expect(schedule.regularSeason).toBeDefined();
    });
  });

  describe('getPlayoffPicture', () => {
    it('should return playoff picture for both conferences', () => {
      const picture = manager.getPlayoffPicture();
      expect(picture.afc).toBeDefined();
      expect(picture.nfc).toBeDefined();
      expect(picture.afc.length).toBe(16);
      expect(picture.nfc.length).toBe(16);
    });
  });

  describe('getUserTeamGame', () => {
    it('should return null during preseason', () => {
      const game = manager.getUserTeamGame();
      expect(game).toBeNull();
    });

    it('should return game during regular season week', () => {
      manager.startSeason();

      // May return null if user is on bye in week 1
      const game = manager.getUserTeamGame();
      if (game) {
        expect(game.homeTeamId === teams[0].id || game.awayTeamId === teams[0].id).toBe(true);
      }
    });
  });

  describe('isUserOnBye', () => {
    it('should return false in preseason', () => {
      expect(manager.isUserOnBye()).toBe(false);
    });
  });

  describe('isPlayoffTime', () => {
    it('should return false during regular season', () => {
      manager.startSeason();
      expect(manager.isPlayoffTime()).toBe(false);
    });
  });

  describe('advanceToNextWeek', () => {
    it('should advance from week 1 to week 2', () => {
      manager.startSeason();
      expect(manager.getCurrentWeek()).toBe(1);

      manager.advanceToNextWeek();
      expect(manager.getCurrentWeek()).toBe(2);
      expect(manager.getCurrentPhase()).toBe('week2');
    });

    it('should update phase correctly', () => {
      manager.startSeason();

      for (let week = 1; week <= 10; week++) {
        expect(manager.getCurrentPhase()).toBe(`week${week}`);
        manager.advanceToNextWeek();
      }
    });
  });

  describe('getSeasonState', () => {
    it('should return complete season state', () => {
      const state = manager.getSeasonState();

      expect(state.year).toBe(2025);
      expect(state.phase).toBe('preseason');
      expect(state.currentWeek).toBe(0);
      expect(state.schedule).toBeDefined();
      expect(state.standings).toBeDefined();
      expect(state.playoffBracket).toBeNull();
      expect(state.superBowlChampion).toBeNull();
    });
  });

  describe('isSeasonComplete', () => {
    it('should return false for new season', () => {
      expect(manager.isSeasonComplete()).toBe(false);
    });
  });

  describe('getSuperBowlChampion', () => {
    it('should return null before playoffs', () => {
      expect(manager.getSuperBowlChampion()).toBeNull();
    });
  });

  describe('getDraftOrder', () => {
    it('should return null before season ends', () => {
      expect(manager.getDraftOrder()).toBeNull();
    });
  });

  describe('getWeekResults', () => {
    it('should return undefined for weeks not yet played', () => {
      expect(manager.getWeekResults(1)).toBeUndefined();
    });
  });

  describe('createSeasonManager factory', () => {
    it('should create a manager with default standings', () => {
      const mgr = createSeasonManager(2025, teams, teams[0].id);
      expect(mgr).toBeDefined();
      expect(mgr.getCurrentPhase()).toBe('preseason');
    });

    it('should accept previous year standings', () => {
      const previousStandings = createDefaultStandings(teams);
      const mgr = createSeasonManager(2025, teams, teams[0].id, previousStandings);
      expect(mgr).toBeDefined();
    });
  });

  describe('playoff transitions', () => {
    it('should provide generatePlayoffs method', () => {
      expect(typeof manager.generatePlayoffs).toBe('function');
    });

    it('should provide getPlayoffBracket method', () => {
      expect(manager.getPlayoffBracket()).toBeNull();
    });

    it('should provide isUserInPlayoffs method', () => {
      expect(typeof manager.isUserInPlayoffs).toBe('function');
    });
  });

  describe('phase validation', () => {
    it('should have valid phase types', () => {
      const validPhases: SeasonPhase[] = [
        'preseason',
        'week1',
        'week2',
        'week3',
        'week4',
        'week5',
        'week6',
        'week7',
        'week8',
        'week9',
        'week10',
        'week11',
        'week12',
        'week13',
        'week14',
        'week15',
        'week16',
        'week17',
        'week18',
        'wildCard',
        'divisional',
        'conference',
        'superBowl',
        'offseason',
      ];

      manager.startSeason();
      expect(validPhases).toContain(manager.getCurrentPhase());
    });
  });
});
