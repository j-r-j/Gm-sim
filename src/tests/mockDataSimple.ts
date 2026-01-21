/**
 * Simple Mock Data Factory for Snapshot Tests
 * Uses the existing patterns to create valid mock data matching actual types
 */

import { GameState, GameSettings, DEFAULT_GAME_SETTINGS } from '../core/models/game/GameState';
import { Team, createEmptyTeamRecord } from '../core/models/team/Team';
import { FAKE_CITIES } from '../core/models/team/FakeCities';
import { createDefaultTeamFinances } from '../core/models/team/TeamFinances';
import { createDefaultStadium } from '../core/models/team/Stadium';
import { createEmptyStaffHierarchy } from '../core/models/staff/StaffHierarchy';
import { createDefaultLeague } from '../core/models/league/League';

/**
 * Creates a mock GameSettings object
 */
export function createMockGameSettings(): GameSettings {
  return { ...DEFAULT_GAME_SETTINGS };
}

/**
 * Creates a minimal mock GameState for testing
 * This creates just enough data to satisfy the GMDashboardScreen
 */
export function createMockGameState(): GameState {
  const userTeamId = 'team-NYG';
  const teamIds: string[] = [];

  // Create 32 teams from FAKE_CITIES
  const teams: Record<string, Team> = {};
  FAKE_CITIES.forEach((city) => {
    const teamId = `team-${city.abbreviation}`;
    teamIds.push(teamId);

    const team: Team = {
      id: teamId,
      city: city.city,
      nickname: city.nickname,
      abbreviation: city.abbreviation,
      conference: city.conference,
      division: city.division,
      ownerId: `owner-${city.abbreviation}`,
      gmId: teamId === userTeamId ? 'Test GM' : null,

      stadium: createDefaultStadium(`stadium-${teamId}`, teamId, city.city),
      finances: createDefaultTeamFinances(teamId),
      staffHierarchy: createEmptyStaffHierarchy(teamId, 30000),

      rosterPlayerIds: [],
      practiceSquadIds: [],
      injuredReserveIds: [],

      currentRecord: {
        ...createEmptyTeamRecord(),
        wins: teamId === userTeamId ? 8 : Math.floor(Math.random() * 14),
        losses: teamId === userTeamId ? 6 : Math.floor(Math.random() * 14),
        pointsFor: 350,
        pointsAgainst: 320,
      },
      playoffSeed: null,
      isEliminated: false,

      allTimeRecord: { wins: 100, losses: 80, ties: 0 },
      championships: 2,
      lastChampionshipYear: 2011,

      marketSize: city.marketSize,
      prestige: 75,
      fanbasePassion: 80,
    };

    teams[teamId] = team;
  });

  // Create league with proper structure
  const league = createDefaultLeague('league-1', teamIds, 2025);
  league.calendar = {
    currentYear: 2025,
    currentWeek: 10,
    currentPhase: 'regularSeason',
    offseasonPhase: null,
  };

  return {
    saveSlot: 0,
    createdAt: '2025-01-01T00:00:00.000Z',
    lastSavedAt: '2025-01-15T12:00:00.000Z',
    userTeamId,
    userName: 'Test GM',
    league,
    teams,
    players: {},
    coaches: {},
    scouts: {},
    owners: {},
    draftPicks: {},
    prospects: {},
    contracts: {},
    careerStats: {
      seasonsCompleted: 3,
      totalWins: 28,
      totalLosses: 20,
      playoffAppearances: 2,
      championships: 0,
      teamHistory: [],
    },
    gameSettings: { ...DEFAULT_GAME_SETTINGS },
    newsReadStatus: {},
  };
}
