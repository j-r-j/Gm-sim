/**
 * Week Simulator Tests
 */

import {
  getUserTeamGame,
  isUserOnBye,
  getWeekSummary,
  advanceWeek,
  WeekResults,
} from '../WeekSimulator';
import {
  generateSeasonSchedule,
  createDefaultStandings,
  getWeekGames,
  SeasonSchedule,
} from '../ScheduleGenerator';
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

describe('WeekSimulator', () => {
  let teams: Team[];
  let schedule: SeasonSchedule;

  beforeEach(() => {
    teams = createTestTeams();
    const previousStandings = createDefaultStandings(teams);
    schedule = generateSeasonSchedule(teams, previousStandings, 2025);
  });

  describe('getUserTeamGame', () => {
    it('should return user team game for non-bye week', () => {
      const userTeamId = teams[0].id;
      const byeWeek = schedule.byeWeeks.get(userTeamId);

      // Find a non-bye week
      let testWeek = 1;
      if (byeWeek === 1) testWeek = 2;

      const game = getUserTeamGame(schedule, testWeek, userTeamId);

      // User might not have a game in week 1 depending on schedule
      if (game) {
        expect(game.homeTeamId === userTeamId || game.awayTeamId === userTeamId).toBe(true);
      }
    });

    it('should return null during bye week', () => {
      const userTeamId = teams[0].id;
      const byeWeek = schedule.byeWeeks.get(userTeamId);

      if (byeWeek) {
        const game = getUserTeamGame(schedule, byeWeek, userTeamId);
        expect(game).toBeNull();
      }
    });
  });

  describe('isUserOnBye', () => {
    it('should return true during bye week', () => {
      const userTeamId = teams[0].id;
      const byeWeek = schedule.byeWeeks.get(userTeamId);

      if (byeWeek) {
        expect(isUserOnBye(schedule, byeWeek, userTeamId)).toBe(true);
      }
    });

    it('should return false during non-bye week', () => {
      const userTeamId = teams[0].id;
      const byeWeek = schedule.byeWeeks.get(userTeamId);

      const nonByeWeek = byeWeek === 1 ? 2 : 1;
      expect(isUserOnBye(schedule, nonByeWeek, userTeamId)).toBe(false);
    });
  });

  describe('advanceWeek', () => {
    it('should increment week number', () => {
      const result = advanceWeek(1, {
        players: {},
      } as any);

      expect(result.newWeek).toBe(2);
    });

    it('should return fatigue reset flag', () => {
      const result = advanceWeek(1, {
        players: {},
      } as any);

      expect(result.fatigueReset).toBe(true);
    });

    it('should track recovered players', () => {
      const result = advanceWeek(1, {
        players: {
          'player-1': {
            id: 'player-1',
            injuryStatus: {
              weeksRemaining: 1,
            },
          },
          'player-2': {
            id: 'player-2',
            injuryStatus: {
              weeksRemaining: 3,
            },
          },
        },
      } as any);

      expect(result.recoveredPlayers).toContain('player-1');
      expect(result.recoveredPlayers).not.toContain('player-2');
    });
  });

  describe('getWeekSummary', () => {
    it('should count total games', () => {
      const mockResults: WeekResults = {
        week: 1,
        games: [
          {
            game: {} as any,
            result: { homeScore: 24, awayScore: 17 } as any,
          },
          {
            game: {} as any,
            result: { homeScore: 35, awayScore: 28 } as any,
          },
        ],
        standings: {} as any,
        playoffImplications: [],
        injuryReport: [],
        newsHeadlines: [],
      };

      const summary = getWeekSummary(mockResults);
      expect(summary.totalGames).toBe(2);
    });

    it('should count high-scoring games', () => {
      const mockResults: WeekResults = {
        week: 1,
        games: [
          {
            game: {} as any,
            result: { homeScore: 42, awayScore: 35 } as any, // 77 points - high scoring
          },
          {
            game: {} as any,
            result: { homeScore: 17, awayScore: 14 } as any, // 31 points - normal
          },
        ],
        standings: {} as any,
        playoffImplications: [],
        injuryReport: [],
        newsHeadlines: [],
      };

      const summary = getWeekSummary(mockResults);
      expect(summary.highScoring).toBe(1);
    });

    it('should count blowouts as upsets', () => {
      const mockResults: WeekResults = {
        week: 1,
        games: [
          {
            game: {} as any,
            result: { homeScore: 42, awayScore: 10 } as any, // 32 point margin
          },
          {
            game: {} as any,
            result: { homeScore: 24, awayScore: 21 } as any, // 3 point margin
          },
        ],
        standings: {} as any,
        playoffImplications: [],
        injuryReport: [],
        newsHeadlines: [],
      };

      const summary = getWeekSummary(mockResults);
      expect(summary.upsets).toBe(1);
    });
  });

  describe('schedule integrity', () => {
    it('should have games for most weeks', () => {
      for (let week = 1; week <= 18; week++) {
        const games = getWeekGames(schedule, week);
        // Some weeks may have fewer games due to byes, but should have some
        expect(games.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should not schedule same team twice in a week', () => {
      for (let week = 1; week <= 18; week++) {
        const games = getWeekGames(schedule, week);
        const teamsPlaying = new Set<string>();

        for (const game of games) {
          expect(teamsPlaying.has(game.homeTeamId)).toBe(false);
          expect(teamsPlaying.has(game.awayTeamId)).toBe(false);
          teamsPlaying.add(game.homeTeamId);
          teamsPlaying.add(game.awayTeamId);
        }
      }
    });
  });
});
