/**
 * Playoff Generator Tests
 */

import {
  generatePlayoffBracket,
  advancePlayoffRound,
  getCurrentPlayoffRound,
  arePlayoffsComplete,
  getTeamsAlive,
  getTeamEliminationRound,
  getTeamPlayoffSeed,
  PlayoffSchedule,
  PlayoffMatchup,
} from '../PlayoffGenerator';
import { calculateStandings, DetailedDivisionStandings } from '../StandingsCalculator';
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

describe('PlayoffGenerator', () => {
  let teams: Team[];
  let standings: DetailedDivisionStandings;
  let bracket: PlayoffSchedule;

  beforeEach(() => {
    teams = createTestTeams();
    standings = calculateStandings([], teams);
    bracket = generatePlayoffBracket(standings);
  });

  describe('generatePlayoffBracket', () => {
    it('should create a playoff bracket', () => {
      expect(bracket).toBeDefined();
      expect(bracket.afcSeeds).toBeDefined();
      expect(bracket.nfcSeeds).toBeDefined();
    });

    it('should have 7 seeds per conference', () => {
      expect(bracket.afcSeeds.size).toBe(7);
      expect(bracket.nfcSeeds.size).toBe(7);
    });

    it('should generate Wild Card matchups', () => {
      expect(bracket.wildCardRound).toBeDefined();
      expect(bracket.wildCardRound.length).toBe(6); // 3 per conference
    });

    it('should have correct Wild Card matchups (#2 vs #7, #3 vs #6, #4 vs #5)', () => {
      for (const conference of ['afc', 'nfc'] as const) {
        const seeds = conference === 'afc' ? bracket.afcSeeds : bracket.nfcSeeds;
        const confMatchups = bracket.wildCardRound.filter((m) => m.conference === conference);

        const expectedMatchups = [
          { home: 2, away: 7 },
          { home: 3, away: 6 },
          { home: 4, away: 5 },
        ];

        for (const expected of expectedMatchups) {
          const matchup = confMatchups.find(
            (m) =>
              m.homeTeamId === seeds.get(expected.home) && m.awayTeamId === seeds.get(expected.away)
          );
          expect(matchup).toBeDefined();
        }
      }
    });

    it('should have higher seed as home team', () => {
      for (const matchup of bracket.wildCardRound) {
        expect(matchup.homeSeed).toBeLessThan(matchup.awaySeed);
      }
    });

    it('should not have games marked complete initially', () => {
      for (const matchup of bracket.wildCardRound) {
        expect(matchup.isComplete).toBe(false);
        expect(matchup.homeScore).toBeNull();
        expect(matchup.awayScore).toBeNull();
        expect(matchup.winnerId).toBeNull();
      }
    });
  });

  describe('advancePlayoffRound', () => {
    it('should advance Wild Card results to Divisional round', () => {
      // Complete Wild Card games
      const wcResults: PlayoffMatchup[] = bracket.wildCardRound.map((m) => ({
        ...m,
        isComplete: true,
        homeScore: 24,
        awayScore: 17,
        winnerId: m.homeTeamId,
      }));

      const advancedBracket = advancePlayoffRound(bracket, wcResults);

      expect(advancedBracket.divisionalRound.length).toBe(4);
    });

    it('should include #1 seed in Divisional round', () => {
      // Complete Wild Card games
      const wcResults: PlayoffMatchup[] = bracket.wildCardRound.map((m) => ({
        ...m,
        isComplete: true,
        homeScore: 24,
        awayScore: 17,
        winnerId: m.homeTeamId,
      }));

      const advancedBracket = advancePlayoffRound(bracket, wcResults);

      // #1 seeds should be playing in divisional
      const afc1Seed = bracket.afcSeeds.get(1);
      const nfc1Seed = bracket.nfcSeeds.get(1);

      const afcDivMatchups = advancedBracket.divisionalRound.filter((m) => m.conference === 'afc');
      const nfcDivMatchups = advancedBracket.divisionalRound.filter((m) => m.conference === 'nfc');

      expect(
        afcDivMatchups.some((m) => m.homeTeamId === afc1Seed || m.awayTeamId === afc1Seed)
      ).toBe(true);
      expect(
        nfcDivMatchups.some((m) => m.homeTeamId === nfc1Seed || m.awayTeamId === nfc1Seed)
      ).toBe(true);
    });
  });

  describe('getCurrentPlayoffRound', () => {
    it('should return wildCard for fresh bracket', () => {
      expect(getCurrentPlayoffRound(bracket)).toBe('wildCard');
    });

    it('should return divisional after Wild Card complete', () => {
      const wcResults: PlayoffMatchup[] = bracket.wildCardRound.map((m) => ({
        ...m,
        isComplete: true,
        homeScore: 24,
        awayScore: 17,
        winnerId: m.homeTeamId,
      }));

      const advancedBracket = advancePlayoffRound(bracket, wcResults);
      expect(getCurrentPlayoffRound(advancedBracket)).toBe('divisional');
    });
  });

  describe('arePlayoffsComplete', () => {
    it('should return false for incomplete playoffs', () => {
      expect(arePlayoffsComplete(bracket)).toBe(false);
    });

    it('should return true when Super Bowl is complete', () => {
      // Simulate complete playoffs
      let currentBracket = bracket;

      // Wild Card
      const wcResults = currentBracket.wildCardRound.map((m) => ({
        ...m,
        isComplete: true,
        homeScore: 24,
        awayScore: 17,
        winnerId: m.homeTeamId,
      }));
      currentBracket = advancePlayoffRound(currentBracket, wcResults);

      // Divisional
      const divResults = currentBracket.divisionalRound.map((m) => ({
        ...m,
        isComplete: true,
        homeScore: 21,
        awayScore: 14,
        winnerId: m.homeTeamId,
      }));
      currentBracket = advancePlayoffRound(currentBracket, divResults);

      // Conference
      const confResults = currentBracket.conferenceChampionships.map((m) => ({
        ...m,
        isComplete: true,
        homeScore: 28,
        awayScore: 21,
        winnerId: m.homeTeamId,
      }));
      currentBracket = advancePlayoffRound(currentBracket, confResults);

      // Super Bowl
      const sbResult = {
        ...currentBracket.superBowl!,
        isComplete: true,
        homeScore: 31,
        awayScore: 24,
        winnerId: currentBracket.superBowl!.homeTeamId,
      };
      currentBracket = advancePlayoffRound(currentBracket, [sbResult]);

      expect(arePlayoffsComplete(currentBracket)).toBe(true);
      expect(currentBracket.superBowlChampion).toBeDefined();
    });
  });

  describe('getTeamsAlive', () => {
    it('should return all 14 teams at start', () => {
      const alive = getTeamsAlive(bracket);
      expect(alive.length).toBe(14);
    });

    it('should remove losers after Wild Card', () => {
      const wcResults: PlayoffMatchup[] = bracket.wildCardRound.map((m) => ({
        ...m,
        isComplete: true,
        homeScore: 24,
        awayScore: 17,
        winnerId: m.homeTeamId,
      }));

      const advancedBracket = advancePlayoffRound(bracket, wcResults);
      const alive = getTeamsAlive(advancedBracket);

      // 14 teams - 6 Wild Card losers = 8 teams
      expect(alive.length).toBe(8);
    });
  });

  describe('getTeamPlayoffSeed', () => {
    it('should return correct seed for playoff team', () => {
      const afc1Seed = bracket.afcSeeds.get(1);
      expect(getTeamPlayoffSeed(bracket, afc1Seed!)).toBe(1);

      const nfc7Seed = bracket.nfcSeeds.get(7);
      expect(getTeamPlayoffSeed(bracket, nfc7Seed!)).toBe(7);
    });

    it('should return null for non-playoff team', () => {
      // Get a team not in playoffs (need to find one not in seeds)
      const playoffTeams = new Set([...bracket.afcSeeds.values(), ...bracket.nfcSeeds.values()]);

      const nonPlayoffTeam = teams.find((t) => !playoffTeams.has(t.id));
      if (nonPlayoffTeam) {
        expect(getTeamPlayoffSeed(bracket, nonPlayoffTeam.id)).toBeNull();
      }
    });
  });

  describe('getTeamEliminationRound', () => {
    it('should return null for teams still alive', () => {
      expect(getTeamEliminationRound(bracket, bracket.afcSeeds.get(1)!)).toBeNull();
    });

    it('should return correct round for eliminated team', () => {
      const wcResults: PlayoffMatchup[] = bracket.wildCardRound.map((m) => ({
        ...m,
        isComplete: true,
        homeScore: 24,
        awayScore: 17,
        winnerId: m.homeTeamId,
      }));

      const advancedBracket = advancePlayoffRound(bracket, wcResults);

      // The away team (loser) in first WC game
      const loser = bracket.wildCardRound[0].awayTeamId;
      expect(getTeamEliminationRound(advancedBracket, loser)).toBe('wildCard');
    });
  });
});
