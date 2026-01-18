/**
 * Full Season Simulation Integration Tests
 *
 * Tests for simulating a complete NFL season from week 1 through Super Bowl
 */

import { SeasonManager, createSeasonManager } from '../../core/season/SeasonManager';
import { Team, createEmptyTeamRecord } from '../../core/models/team/Team';
import { FAKE_CITIES } from '../../core/models/team/FakeCities';
import { createDefaultStadium } from '../../core/models/team/Stadium';
import { createDefaultTeamFinances } from '../../core/models/team/TeamFinances';
import { createEmptyStaffHierarchy } from '../../core/models/staff/StaffHierarchy';

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

describe('Full Season Simulation Integration Tests', () => {
  let teams: Team[];
  let manager: SeasonManager;

  beforeEach(() => {
    teams = createTestTeams();
    manager = createSeasonManager(2025, teams, teams[0].id);
  });

  describe('season manager structure', () => {
    it('should initialize correctly', () => {
      expect(manager.getCurrentWeek()).toBe(0);
      expect(manager.getCurrentPhase()).toBe('preseason');
    });

    it('should start season and advance weeks', () => {
      manager.startSeason();
      expect(manager.getCurrentWeek()).toBe(1);
      expect(manager.getCurrentPhase()).toBe('week1');

      manager.advanceToNextWeek();
      expect(manager.getCurrentWeek()).toBe(2);
    });

    it('should track standings structure correctly', () => {
      manager.startSeason();

      const standings = manager.getStandings();

      // Verify standings structure
      expect(standings.afc).toBeDefined();
      expect(standings.nfc).toBeDefined();

      // Count total teams
      let totalTeams = 0;
      for (const conference of ['afc', 'nfc'] as const) {
        for (const division of ['north', 'south', 'east', 'west'] as const) {
          totalTeams += standings[conference][division].length;
        }
      }
      expect(totalTeams).toBe(32);
    });

    it('should advance through multiple weeks', () => {
      manager.startSeason();

      for (let week = 1; week <= 10; week++) {
        expect(manager.getCurrentWeek()).toBe(week);
        manager.advanceToNextWeek();
      }

      expect(manager.getCurrentWeek()).toBe(11);
    });
  });

  describe('playoff preparation', () => {
    it('should have playoff generation methods', () => {
      expect(typeof manager.generatePlayoffs).toBe('function');
      expect(typeof manager.getPlayoffBracket).toBe('function');
      expect(typeof manager.isPlayoffTime).toBe('function');
    });

    it('should not be in playoff time during regular season', () => {
      manager.startSeason();
      expect(manager.isPlayoffTime()).toBe(false);
    });

    it('should not have playoff bracket before playoffs start', () => {
      manager.startSeason();
      expect(manager.getPlayoffBracket()).toBeNull();
    });

    it('should provide playoff picture for both conferences', () => {
      const picture = manager.getPlayoffPicture();
      expect(picture.afc).toBeDefined();
      expect(picture.nfc).toBeDefined();
      expect(picture.afc.length).toBe(16);
      expect(picture.nfc.length).toBe(16);
    });
  });

  describe('season completion methods', () => {
    it('should have season completion methods', () => {
      expect(typeof manager.isSeasonComplete).toBe('function');
      expect(typeof manager.getSuperBowlChampion).toBe('function');
      expect(typeof manager.getDraftOrder).toBe('function');
    });

    it('should not be complete during regular season', () => {
      manager.startSeason();
      expect(manager.isSeasonComplete()).toBe(false);
    });

    it('should not have champion before playoffs', () => {
      manager.startSeason();
      expect(manager.getSuperBowlChampion()).toBeNull();
    });

    it('should not have draft order before season ends', () => {
      manager.startSeason();
      expect(manager.getDraftOrder()).toBeNull();
    });
  });

  describe('schedule structure', () => {
    it('should have schedule with regular season games', () => {
      const schedule = manager.getSchedule();

      expect(schedule).toBeDefined();
      expect(schedule.regularSeason).toBeDefined();
      expect(schedule.regularSeason.length).toBeGreaterThan(0);
    });

    it('should have games for each week', () => {
      const schedule = manager.getSchedule();

      // Count games per week
      const gamesPerWeek = new Map<number, number>();

      for (const game of schedule.regularSeason) {
        const count = gamesPerWeek.get(game.week) || 0;
        gamesPerWeek.set(game.week, count + 1);
      }

      // Should have multiple games each week
      for (let week = 1; week <= 18; week++) {
        const weekGames = gamesPerWeek.get(week) || 0;
        // Each week should have some games (accounting for bye weeks)
        expect(weekGames).toBeGreaterThan(0);
      }
    });

    it('should assign games to both conferences', () => {
      const schedule = manager.getSchedule();

      // Count AFC and NFC teams in games
      let afcGames = 0;
      let nfcGames = 0;

      for (const game of schedule.regularSeason) {
        const homeTeam = teams.find((t) => t.id === game.homeTeamId);
        if (homeTeam?.conference === 'AFC') afcGames++;
        if (homeTeam?.conference === 'NFC') nfcGames++;
      }

      expect(afcGames).toBeGreaterThan(0);
      expect(nfcGames).toBeGreaterThan(0);
    });

    it('should track bye weeks', () => {
      const schedule = manager.getSchedule();

      // Bye weeks should be defined as a plain object (for JSON serialization compatibility)
      expect(schedule.byeWeeks).toBeDefined();
      expect(typeof schedule.byeWeeks).toBe('object');
      expect(Object.keys(schedule.byeWeeks).length).toBeGreaterThan(0);
    });
  });
});
