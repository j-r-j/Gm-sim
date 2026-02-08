/**
 * Tests for the week results game filtering logic used in WeekResultsScreenWrapper.
 *
 * Validates that the weeklyGames list built for WeeklySchedulePopup
 * always includes ALL games for the current week, regardless of completion status.
 * This ensures the "AROUND THE LEAGUE" section remains visible after simulation.
 */

import { ScheduledGame } from '../../core/season/ScheduleGenerator';

interface MinimalTeam {
  city: string;
  nickname: string;
  abbreviation: string;
  currentRecord: { wins: number; losses: number };
}

interface WeeklyGameEntry {
  gameId: string;
  isUserGame: boolean;
  isComplete?: boolean;
  homeScore?: number;
  awayScore?: number;
}

/**
 * Replicates the filtering logic from WeekResultsScreenWrapper.
 * All games for the current week should be included regardless of isComplete.
 */
function buildWeeklyGames(
  regularSeasonGames: ScheduledGame[],
  week: number,
  userTeamId: string,
  teams: Record<string, MinimalTeam>
): WeeklyGameEntry[] {
  const weeklyGames: WeeklyGameEntry[] = [];

  for (const game of regularSeasonGames) {
    if (game.week !== week) continue;

    const homeTeam = teams[game.homeTeamId];
    const awayTeam = teams[game.awayTeamId];
    if (!homeTeam || !awayTeam) continue;

    const isUserGame = game.homeTeamId === userTeamId || game.awayTeamId === userTeamId;

    weeklyGames.push({
      gameId: game.gameId,
      isUserGame,
      ...(game.isComplete && {
        homeScore: game.homeScore ?? undefined,
        awayScore: game.awayScore ?? undefined,
        isComplete: true,
      }),
    });
  }

  return weeklyGames;
}

// Test fixtures
function createTestGames(week: number, userTeamId: string): ScheduledGame[] {
  return [
    {
      gameId: 'game-1',
      week,
      homeTeamId: userTeamId,
      awayTeamId: 'team-b',
      isComplete: false,
      homeScore: null,
      awayScore: null,
      winnerId: null,
      timeSlot: 'early_sunday',
      isDivisional: false,
    },
    {
      gameId: 'game-2',
      week,
      homeTeamId: 'team-c',
      awayTeamId: 'team-d',
      isComplete: false,
      homeScore: null,
      awayScore: null,
      winnerId: null,
      timeSlot: 'early_sunday',
      isDivisional: false,
    },
    {
      gameId: 'game-3',
      week,
      homeTeamId: 'team-e',
      awayTeamId: 'team-f',
      isComplete: false,
      homeScore: null,
      awayScore: null,
      winnerId: null,
      timeSlot: 'late_sunday',
      isDivisional: true,
    },
  ] as ScheduledGame[];
}

function createTestTeams(): Record<string, MinimalTeam> {
  return {
    'team-a': {
      city: 'City A',
      nickname: 'Alphas',
      abbreviation: 'AA',
      currentRecord: { wins: 0, losses: 0 },
    },
    'team-b': {
      city: 'City B',
      nickname: 'Betas',
      abbreviation: 'BB',
      currentRecord: { wins: 0, losses: 0 },
    },
    'team-c': {
      city: 'City C',
      nickname: 'Charlies',
      abbreviation: 'CC',
      currentRecord: { wins: 0, losses: 0 },
    },
    'team-d': {
      city: 'City D',
      nickname: 'Deltas',
      abbreviation: 'DD',
      currentRecord: { wins: 0, losses: 0 },
    },
    'team-e': {
      city: 'City E',
      nickname: 'Echoes',
      abbreviation: 'EE',
      currentRecord: { wins: 0, losses: 0 },
    },
    'team-f': {
      city: 'City F',
      nickname: 'Foxtrots',
      abbreviation: 'FF',
      currentRecord: { wins: 0, losses: 0 },
    },
  };
}

describe('WeekResults game filtering', () => {
  const userTeamId = 'team-a';
  const week = 1;

  it('should include all games when none are complete', () => {
    const games = createTestGames(week, userTeamId);
    const teams = createTestTeams();

    const result = buildWeeklyGames(games, week, userTeamId, teams);
    expect(result).toHaveLength(3);

    const otherGames = result.filter((g) => !g.isUserGame);
    expect(otherGames).toHaveLength(2);
  });

  it('should keep other games visible after they are simulated', () => {
    const games = createTestGames(week, userTeamId);
    const teams = createTestTeams();

    // All games completed (state after handleSimOtherGames + re-render)
    games[0].isComplete = true;
    games[0].homeScore = 24;
    games[0].awayScore = 17;
    games[0].winnerId = userTeamId;

    games[1].isComplete = true;
    games[1].homeScore = 31;
    games[1].awayScore = 28;
    games[1].winnerId = 'team-c';

    games[2].isComplete = true;
    games[2].homeScore = 14;
    games[2].awayScore = 21;
    games[2].winnerId = 'team-f';

    const result = buildWeeklyGames(games, week, userTeamId, teams);

    // All 3 games must still be present after simulation
    expect(result).toHaveLength(3);
    const otherGames = result.filter((g) => !g.isUserGame);
    expect(otherGames).toHaveLength(2);
  });

  it('should include scores for completed games', () => {
    const games = createTestGames(week, userTeamId);
    const teams = createTestTeams();

    games[1].isComplete = true;
    games[1].homeScore = 31;
    games[1].awayScore = 28;
    games[1].winnerId = 'team-c';

    const result = buildWeeklyGames(games, week, userTeamId, teams);

    const completedOther = result.find((g) => g.gameId === 'game-2');
    expect(completedOther).toBeDefined();
    expect(completedOther!.isComplete).toBe(true);
    expect(completedOther!.homeScore).toBe(31);
    expect(completedOther!.awayScore).toBe(28);
  });

  it('should work correctly during bye weeks', () => {
    const games = createTestGames(week, userTeamId);
    const teams = createTestTeams();

    // Remove user game for bye week scenario
    const byeGames = games.filter(
      (g) => g.homeTeamId !== userTeamId && g.awayTeamId !== userTeamId
    );

    // Complete all games
    byeGames.forEach((g, i) => {
      g.isComplete = true;
      g.homeScore = 20 + i;
      g.awayScore = 17 + i;
      g.winnerId = g.homeTeamId;
    });

    const result = buildWeeklyGames(byeGames, week, userTeamId, teams);
    expect(result).toHaveLength(2);
  });

  it('should maintain correct totalCount for allComplete check', () => {
    const games = createTestGames(week, userTeamId);
    const teams = createTestTeams();

    // All games completed
    games.forEach((g, i) => {
      g.isComplete = true;
      g.homeScore = 20 + i;
      g.awayScore = 17 + i;
      g.winnerId = g.homeTeamId;
    });

    const result = buildWeeklyGames(games, week, userTeamId, teams);

    // totalCount must match actual number of weekly games
    expect(result.length).toBe(3);

    // allComplete check: simulatedGames.size === games.length
    const simulatedGamesCount = 3;
    expect(simulatedGamesCount === result.length).toBe(true);
  });

  it('should only include games from the specified week', () => {
    const games = createTestGames(week, userTeamId);
    const teams = createTestTeams();

    // Add a game from a different week
    games.push({
      gameId: 'game-other-week',
      week: week + 1,
      homeTeamId: 'team-c',
      awayTeamId: 'team-e',
      isComplete: false,
      homeScore: null,
      awayScore: null,
      winnerId: null,
      timeSlot: 'early_sunday',
      isDivisional: false,
    } as ScheduledGame);

    const result = buildWeeklyGames(games, week, userTeamId, teams);
    expect(result).toHaveLength(3);
    expect(result.find((g) => g.gameId === 'game-other-week')).toBeUndefined();
  });
});
