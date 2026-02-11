/**
 * StandingsService Tests
 * Tests head-to-head tiebreaker logic in standings calculations
 */

import { calculateStandings, createStandingsEntry } from '../StandingsService';
import { Team, createEmptyTeamRecord } from '../../core/models/team/Team';
import { ScheduledGame } from '../../core/season/ScheduleGenerator';
import { createDefaultStadium } from '../../core/models/team/Stadium';
import { createDefaultTeamFinances } from '../../core/models/team/TeamFinances';
import { createEmptyStaffHierarchy } from '../../core/models/staff/StaffHierarchy';
import { Conference, Division } from '../../core/models/team/FakeCities';

/** Creates a minimal test team */
function createTestTeam(
  id: string,
  conference: Conference,
  division: Division,
  record: { wins: number; losses: number; pointsFor?: number; pointsAgainst?: number }
): Team {
  const teamRecord = {
    ...createEmptyTeamRecord(),
    wins: record.wins,
    losses: record.losses,
    pointsFor: record.pointsFor ?? 0,
    pointsAgainst: record.pointsAgainst ?? 0,
  };
  return {
    id,
    city: 'Test City',
    nickname: id,
    abbreviation: id.toUpperCase().slice(0, 3),
    conference,
    division,
    stadium: createDefaultStadium(`stadium-${id}`, id, 'Test City'),
    finances: createDefaultTeamFinances(id, 255000),
    staffHierarchy: createEmptyStaffHierarchy(id, 30000),
    ownerId: `owner-${id}`,
    gmId: null,
    rosterPlayerIds: [],
    practiceSquadIds: [],
    injuredReserveIds: [],
    currentRecord: teamRecord,
    playoffSeed: null,
    isEliminated: false,
    allTimeRecord: { wins: 0, losses: 0, ties: 0 },
    championships: 0,
    lastChampionshipYear: null,
    marketSize: 'medium',
    prestige: 50,
    fanbasePassion: 50,
  };
}

/** Creates a completed game for head-to-head records */
function createCompletedGame(
  homeTeamId: string,
  awayTeamId: string,
  homeScore: number,
  awayScore: number,
  week: number = 1
): ScheduledGame {
  return {
    gameId: `game-${week}-${homeTeamId}-${awayTeamId}`,
    week,
    homeTeamId,
    awayTeamId,
    isDivisional: true,
    isConference: true,
    isRivalry: false,
    timeSlot: 'early_sunday',
    isComplete: true,
    homeScore,
    awayScore,
    winnerId: homeScore > awayScore ? homeTeamId : homeScore < awayScore ? awayTeamId : null,
    component: 'A',
  };
}

describe('StandingsService', () => {
  describe('createStandingsEntry', () => {
    it('should create a standings entry from a team', () => {
      const team = createTestTeam('team-a', 'AFC', 'North', {
        wins: 10,
        losses: 7,
        pointsFor: 350,
        pointsAgainst: 300,
      });
      const entry = createStandingsEntry(team, 'team-a');

      expect(entry.teamId).toBe('team-a');
      expect(entry.wins).toBe(10);
      expect(entry.losses).toBe(7);
      expect(entry.pointsDiff).toBe(50);
      expect(entry.isUserTeam).toBe(true);
    });
  });

  describe('head-to-head tiebreaker', () => {
    it('should break ties using head-to-head record when teams have same win percentage', () => {
      // Two teams with identical records
      const teamA = createTestTeam('team-a', 'AFC', 'North', {
        wins: 10,
        losses: 7,
        pointsFor: 300,
        pointsAgainst: 280,
      });
      const teamB = createTestTeam('team-b', 'AFC', 'North', {
        wins: 10,
        losses: 7,
        pointsFor: 280,
        pointsAgainst: 300,
      });

      const teams: Record<string, Team> = {
        'team-a': teamA,
        'team-b': teamB,
      };

      // Team B beat Team A in their matchup
      const games = [createCompletedGame('team-b', 'team-a', 24, 17, 1)];

      const standings = calculateStandings(teams, 'team-a', games);

      // Team B should be ranked higher due to head-to-head win
      const allEntries = standings.all;
      const teamBIndex = allEntries.findIndex((e) => e.teamId === 'team-b');
      const teamAIndex = allEntries.findIndex((e) => e.teamId === 'team-a');
      expect(teamBIndex).toBeLessThan(teamAIndex);
    });

    it('should use point differential when head-to-head is split', () => {
      const teamA = createTestTeam('team-a', 'AFC', 'North', {
        wins: 10,
        losses: 7,
        pointsFor: 400,
        pointsAgainst: 300,
      });
      const teamB = createTestTeam('team-b', 'AFC', 'North', {
        wins: 10,
        losses: 7,
        pointsFor: 300,
        pointsAgainst: 350,
      });

      const teams: Record<string, Team> = {
        'team-a': teamA,
        'team-b': teamB,
      };

      // Split head-to-head (1-1)
      const games = [
        createCompletedGame('team-a', 'team-b', 24, 17, 1),
        createCompletedGame('team-b', 'team-a', 21, 14, 2),
      ];

      const standings = calculateStandings(teams, 'team-a', games);

      // Team A should be ranked higher due to better point differential (tiebreaker falls through)
      const allEntries = standings.all;
      const teamAIndex = allEntries.findIndex((e) => e.teamId === 'team-a');
      const teamBIndex = allEntries.findIndex((e) => e.teamId === 'team-b');
      expect(teamAIndex).toBeLessThan(teamBIndex);
    });

    it('should still work without completed games (backwards compatible)', () => {
      const teamA = createTestTeam('team-a', 'AFC', 'North', {
        wins: 12,
        losses: 5,
        pointsFor: 400,
        pointsAgainst: 300,
      });
      const teamB = createTestTeam('team-b', 'AFC', 'North', {
        wins: 10,
        losses: 7,
        pointsFor: 350,
        pointsAgainst: 320,
      });

      const teams: Record<string, Team> = {
        'team-a': teamA,
        'team-b': teamB,
      };

      // No completed games passed
      const standings = calculateStandings(teams, 'team-a');

      const allEntries = standings.all;
      expect(allEntries[0].teamId).toBe('team-a');
      expect(allEntries[1].teamId).toBe('team-b');
    });

    it('should correctly apply head-to-head within division standings', () => {
      const teamA = createTestTeam('team-a', 'AFC', 'North', {
        wins: 10,
        losses: 7,
        pointsFor: 300,
        pointsAgainst: 280,
      });
      const teamB = createTestTeam('team-b', 'AFC', 'North', {
        wins: 10,
        losses: 7,
        pointsFor: 280,
        pointsAgainst: 300,
      });

      const teams: Record<string, Team> = {
        'team-a': teamA,
        'team-b': teamB,
      };

      // Team B swept Team A (2-0 h2h)
      const games = [
        createCompletedGame('team-b', 'team-a', 24, 17, 1),
        createCompletedGame('team-a', 'team-b', 14, 21, 10),
      ];

      const standings = calculateStandings(teams, 'team-a', games);

      // Check division standings
      const afcNorth = standings.byDivision['AFC']['North'];
      expect(afcNorth[0].teamId).toBe('team-b');
      expect(afcNorth[1].teamId).toBe('team-a');
    });

    it('should ignore incomplete games when building head-to-head records', () => {
      const teamA = createTestTeam('team-a', 'AFC', 'North', {
        wins: 10,
        losses: 7,
        pointsFor: 300,
        pointsAgainst: 280,
      });
      const teamB = createTestTeam('team-b', 'AFC', 'North', {
        wins: 10,
        losses: 7,
        pointsFor: 350,
        pointsAgainst: 300,
      });

      const teams: Record<string, Team> = {
        'team-a': teamA,
        'team-b': teamB,
      };

      // One incomplete game (should be ignored), no complete h2h games
      const incompleteGame: ScheduledGame = {
        gameId: 'game-future',
        week: 15,
        homeTeamId: 'team-a',
        awayTeamId: 'team-b',
        isDivisional: true,
        isConference: true,
        isRivalry: false,
        timeSlot: 'early_sunday',
        isComplete: false,
        homeScore: null,
        awayScore: null,
        winnerId: null,
        component: 'A',
      };

      const standings = calculateStandings(teams, 'team-a', [incompleteGame]);

      // Without h2h data, should fall through to point differential
      // Team B has better point diff (+50 vs +20)
      const allEntries = standings.all;
      expect(allEntries[0].teamId).toBe('team-b');
    });
  });
});
