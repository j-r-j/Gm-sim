/**
 * Standings Calculator Tests
 */

import {
  calculateStandings,
  determinePlayoffTeams,
  getTeamStanding,
  formatStandingRecord,
  getPlayoffPicture,
  resolveWildcardTiebreaker,
  TeamStanding,
} from '../StandingsCalculator';
import { ScheduledGame } from '../ScheduleGenerator';
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

// Helper to create a game result
function createGameResult(
  homeTeamId: string,
  awayTeamId: string,
  homeScore: number,
  awayScore: number,
  week: number,
  isDivisional: boolean = false,
  isConference: boolean = true
): ScheduledGame {
  return {
    gameId: `game-${week}-${homeTeamId}-${awayTeamId}`,
    week,
    homeTeamId,
    awayTeamId,
    isDivisional,
    isConference,
    isRivalry: isDivisional,
    timeSlot: 'early_sunday',
    isComplete: true,
    homeScore,
    awayScore,
    winnerId: homeScore > awayScore ? homeTeamId : homeScore < awayScore ? awayTeamId : null,
    component: isDivisional ? 'A' : isConference ? 'B' : 'C',
  };
}

describe('StandingsCalculator', () => {
  let teams: Team[];

  beforeEach(() => {
    teams = createTestTeams();
  });

  describe('calculateStandings', () => {
    it('should create standings for all teams with no games', () => {
      const standings = calculateStandings([], teams);

      expect(standings.afc).toBeDefined();
      expect(standings.nfc).toBeDefined();

      // Check all divisions exist
      for (const conference of ['afc', 'nfc'] as const) {
        for (const division of ['north', 'south', 'east', 'west'] as const) {
          expect(standings[conference][division]).toBeDefined();
          expect(standings[conference][division].length).toBe(4);
        }
      }
    });

    it('should have all teams at 0-0 with no games', () => {
      const standings = calculateStandings([], teams);

      for (const conference of ['afc', 'nfc'] as const) {
        for (const division of ['north', 'south', 'east', 'west'] as const) {
          for (const standing of standings[conference][division]) {
            expect(standing.wins).toBe(0);
            expect(standing.losses).toBe(0);
            expect(standing.winPercentage).toBe(0);
          }
        }
      }
    });

    it('should calculate standings correctly after games', () => {
      // AFC East teams
      const afcEastTeams = teams.filter((t) => t.conference === 'AFC' && t.division === 'East');

      // Team 0 beats Team 1
      const games: ScheduledGame[] = [
        createGameResult(afcEastTeams[0].id, afcEastTeams[1].id, 24, 17, 1, true, true),
      ];

      const standings = calculateStandings(games, teams);
      const afcEast = standings.afc.east;

      const team0Standing = afcEast.find((s) => s.teamId === afcEastTeams[0].id);
      const team1Standing = afcEast.find((s) => s.teamId === afcEastTeams[1].id);

      expect(team0Standing?.wins).toBe(1);
      expect(team0Standing?.losses).toBe(0);
      expect(team0Standing?.divisionWins).toBe(1);
      expect(team0Standing?.pointsFor).toBe(24);
      expect(team0Standing?.pointsAgainst).toBe(17);

      expect(team1Standing?.wins).toBe(0);
      expect(team1Standing?.losses).toBe(1);
      expect(team1Standing?.divisionLosses).toBe(1);
    });

    it('should rank teams by win percentage', () => {
      const afcEastTeams = teams.filter((t) => t.conference === 'AFC' && t.division === 'East');

      // Team 0: 2-0, Team 1: 1-1, Team 2: 1-1, Team 3: 0-2
      const games: ScheduledGame[] = [
        createGameResult(afcEastTeams[0].id, afcEastTeams[1].id, 24, 17, 1, true, true),
        createGameResult(afcEastTeams[0].id, afcEastTeams[3].id, 21, 14, 2, true, true),
        createGameResult(afcEastTeams[1].id, afcEastTeams[2].id, 28, 21, 1, true, true),
        createGameResult(afcEastTeams[2].id, afcEastTeams[3].id, 17, 10, 2, true, true),
      ];

      const standings = calculateStandings(games, teams);
      const afcEast = standings.afc.east;

      expect(afcEast[0].teamId).toBe(afcEastTeams[0].id);
      expect(afcEast[0].divisionRank).toBe(1);
      expect(afcEast[3].teamId).toBe(afcEastTeams[3].id);
      expect(afcEast[3].divisionRank).toBe(4);
    });

    it('should track head-to-head records', () => {
      const afcEastTeams = teams.filter((t) => t.conference === 'AFC' && t.division === 'East');

      const games: ScheduledGame[] = [
        createGameResult(afcEastTeams[0].id, afcEastTeams[1].id, 24, 17, 1, true, true),
        createGameResult(afcEastTeams[1].id, afcEastTeams[0].id, 21, 20, 10, true, true),
      ];

      const standings = calculateStandings(games, teams);
      const team0Standing = standings.afc.east.find((s) => s.teamId === afcEastTeams[0].id);

      expect(team0Standing).toBeDefined();
      const h2h = team0Standing?.headToHead.get(afcEastTeams[1].id);
      expect(h2h?.wins).toBe(1);
      expect(h2h?.losses).toBe(1);
    });

    it('should track win/loss streaks', () => {
      const afcEastTeams = teams.filter((t) => t.conference === 'AFC' && t.division === 'East');

      // Team 0 wins 3 in a row
      const games: ScheduledGame[] = [
        createGameResult(afcEastTeams[0].id, afcEastTeams[1].id, 24, 17, 1, true, true),
        createGameResult(afcEastTeams[0].id, afcEastTeams[2].id, 21, 14, 2, true, true),
        createGameResult(afcEastTeams[0].id, afcEastTeams[3].id, 28, 21, 3, true, true),
      ];

      const standings = calculateStandings(games, teams);
      const team0Standing = standings.afc.east.find((s) => s.teamId === afcEastTeams[0].id);

      expect(team0Standing?.currentStreak).toBe(3);
    });
  });

  describe('determinePlayoffTeams', () => {
    it('should return division winners and wild cards', () => {
      const standings = calculateStandings([], teams);
      const playoffTeams = determinePlayoffTeams(standings);

      expect(playoffTeams.afc.divisionWinners.length).toBe(4);
      expect(playoffTeams.afc.wildCards.length).toBe(3);
      expect(playoffTeams.nfc.divisionWinners.length).toBe(4);
      expect(playoffTeams.nfc.wildCards.length).toBe(3);
    });
  });

  describe('getTeamStanding', () => {
    it('should find a team standing', () => {
      const standings = calculateStandings([], teams);
      const standing = getTeamStanding(standings, teams[0].id);

      expect(standing).toBeDefined();
      expect(standing?.teamId).toBe(teams[0].id);
    });

    it('should return undefined for invalid team', () => {
      const standings = calculateStandings([], teams);
      const standing = getTeamStanding(standings, 'invalid-id');

      expect(standing).toBeUndefined();
    });
  });

  describe('formatStandingRecord', () => {
    it('should format record without ties', () => {
      const standing: Partial<TeamStanding> = {
        wins: 10,
        losses: 5,
        ties: 0,
      };

      expect(formatStandingRecord(standing as TeamStanding)).toBe('10-5');
    });

    it('should format record with ties', () => {
      const standing: Partial<TeamStanding> = {
        wins: 9,
        losses: 6,
        ties: 2,
      };

      expect(formatStandingRecord(standing as TeamStanding)).toBe('9-6-2');
    });
  });

  describe('resolveWildcardTiebreaker', () => {
    it('should sort teams by win percentage', () => {
      const teamA: TeamStanding = {
        teamId: 'team-a',
        conference: 'AFC',
        division: 'East',
        wins: 10,
        losses: 7,
        ties: 0,
        winPercentage: 10 / 17,
        divisionWins: 4,
        divisionLosses: 2,
        divisionTies: 0,
        conferenceWins: 7,
        conferenceLosses: 5,
        conferenceTies: 0,
        pointsFor: 350,
        pointsAgainst: 300,
        pointDifferential: 50,
        headToHead: new Map(),
        strengthOfVictory: 0.5,
        strengthOfSchedule: 0.5,
        netTouchdowns: 7,
        divisionRank: 2,
        conferenceRank: 5,
        playoffPosition: 'wildcard',
        currentStreak: 2,
        gamesBehind: 1,
      };

      const teamB: TeamStanding = {
        ...teamA,
        teamId: 'team-b',
        wins: 11,
        losses: 6,
        winPercentage: 11 / 17,
      };

      const sorted = resolveWildcardTiebreaker([teamA, teamB]);
      expect(sorted[0].teamId).toBe('team-b');
    });

    it('should use strength of victory for tiebreaker', () => {
      const teamA: TeamStanding = {
        teamId: 'team-a',
        conference: 'AFC',
        division: 'East',
        wins: 10,
        losses: 7,
        ties: 0,
        winPercentage: 10 / 17,
        divisionWins: 4,
        divisionLosses: 2,
        divisionTies: 0,
        conferenceWins: 7,
        conferenceLosses: 5,
        conferenceTies: 0,
        pointsFor: 350,
        pointsAgainst: 300,
        pointDifferential: 50,
        headToHead: new Map(),
        strengthOfVictory: 0.6,
        strengthOfSchedule: 0.5,
        netTouchdowns: 7,
        divisionRank: 2,
        conferenceRank: 5,
        playoffPosition: 'wildcard',
        currentStreak: 2,
        gamesBehind: 1,
      };

      const teamB: TeamStanding = {
        ...teamA,
        teamId: 'team-b',
        strengthOfVictory: 0.4,
      };

      const sorted = resolveWildcardTiebreaker([teamA, teamB]);
      expect(sorted[0].teamId).toBe('team-a');
    });
  });

  describe('getPlayoffPicture', () => {
    it('should return teams sorted by conference rank', () => {
      const standings = calculateStandings([], teams);
      const picture = getPlayoffPicture(standings, 'afc');

      expect(picture.length).toBe(16);

      // Check that ranks are in order
      for (let i = 1; i < picture.length; i++) {
        expect(picture[i].conferenceRank).toBeGreaterThanOrEqual(picture[i - 1].conferenceRank);
      }
    });
  });
});
