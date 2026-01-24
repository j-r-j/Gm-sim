/**
 * Schedule Generator
 * Generates a complete 17-game NFL season schedule using 2025 NFL template
 *
 * NFL Scheduling Rules:
 * - 6 divisional games (home/away vs 3 division rivals)
 * - 4 games vs another division in same conference (rotates yearly)
 * - 4 games vs a division from other conference (rotates yearly)
 * - 2 games vs same-place finishers from other divisions in conference
 * - 1 game vs same-place finisher from other conference (17th game)
 */

import { Team } from '../models/team/Team';
import { Conference, Division, ALL_DIVISIONS } from '../models/team/FakeCities';
import { assignByeWeeks } from './ByeWeekManager';
import { PlayoffSchedule } from './PlayoffGenerator';

/**
 * Time slots for games
 */
export type TimeSlot =
  | 'thursday'
  | 'early_sunday'
  | 'late_sunday'
  | 'sunday_night'
  | 'monday_night';

/**
 * A scheduled game in the season
 */
export interface ScheduledGame {
  gameId: string;
  week: number;
  homeTeamId: string;
  awayTeamId: string;

  // Game attributes
  isDivisional: boolean;
  isConference: boolean;
  isRivalry: boolean;

  // Time slot
  timeSlot: TimeSlot;

  // Results (filled after game played)
  isComplete: boolean;
  homeScore: number | null;
  awayScore: number | null;
  winnerId: string | null;
}

/**
 * Previous year standings for scheduling purposes
 */
export interface PreviousYearStandings {
  [conference: string]: {
    [division: string]: string[]; // Team IDs ordered by finish (1st to 4th)
  };
}

/**
 * Complete season schedule
 */
export interface SeasonSchedule {
  year: number;
  regularSeason: ScheduledGame[];
  /** Bye weeks stored as plain object (teamId -> week) for JSON serialization compatibility */
  byeWeeks: Record<string, number>;
  playoffs: PlayoffSchedule | null;
}

/**
 * Division rotation mappings based on 2025 NFL schedule
 * Each year the divisions rotate through opponents
 */
const INTRA_CONFERENCE_ROTATION: Record<Conference, Record<Division, Division>> = {
  AFC: {
    East: 'West',
    North: 'South',
    South: 'North',
    West: 'East',
  },
  NFC: {
    East: 'West',
    North: 'South',
    South: 'North',
    West: 'East',
  },
};

const INTER_CONFERENCE_ROTATION: Record<Conference, Record<Division, Division>> = {
  AFC: {
    East: 'East',
    North: 'North',
    South: 'South',
    West: 'West',
  },
  NFC: {
    East: 'East',
    North: 'North',
    South: 'South',
    West: 'West',
  },
};

/**
 * Creates a default previous year standings (for new games or testing)
 * Places teams in order by team ID for determinism
 */
export function createDefaultStandings(teams: Team[]): PreviousYearStandings {
  const standings: PreviousYearStandings = {
    AFC: { North: [], South: [], East: [], West: [] },
    NFC: { North: [], South: [], East: [], West: [] },
  };

  // Group teams by division
  for (const team of teams) {
    standings[team.conference][team.division].push(team.id);
  }

  // Sort each division by team ID for determinism
  for (const conference of ['AFC', 'NFC']) {
    for (const division of ALL_DIVISIONS) {
      standings[conference][division].sort();
    }
  }

  return standings;
}

/**
 * Gets division rivals for a team
 */
function getDivisionRivals(team: Team, teams: Team[]): Team[] {
  return teams.filter(
    (t) => t.conference === team.conference && t.division === team.division && t.id !== team.id
  );
}

/**
 * Gets teams in the intra-conference rotation division
 */
function getIntraConferenceOpponents(team: Team, teams: Team[]): Team[] {
  const targetDivision = INTRA_CONFERENCE_ROTATION[team.conference][team.division];
  return teams.filter((t) => t.conference === team.conference && t.division === targetDivision);
}

/**
 * Gets teams in the inter-conference rotation division
 */
function getInterConferenceOpponents(team: Team, teams: Team[]): Team[] {
  const oppositeConference: Conference = team.conference === 'AFC' ? 'NFC' : 'AFC';
  const targetDivision = INTER_CONFERENCE_ROTATION[team.conference][team.division];
  return teams.filter((t) => t.conference === oppositeConference && t.division === targetDivision);
}

/**
 * Gets same-place finishers from other divisions in conference
 * Returns 2 teams (from the 2 non-rotation divisions)
 */
function getSamePlaceConferenceOpponents(
  team: Team,
  teams: Team[],
  previousStandings: PreviousYearStandings
): Team[] {
  const teamFinish = getTeamFinishPosition(team, previousStandings);
  const rotationDivision = INTRA_CONFERENCE_ROTATION[team.conference][team.division];

  // Get the other 2 divisions (not own, not rotation)
  const otherDivisions = ALL_DIVISIONS.filter((d) => d !== team.division && d !== rotationDivision);

  const opponents: Team[] = [];
  for (const division of otherDivisions) {
    const divisionTeams = previousStandings[team.conference][division];
    const opponentId = divisionTeams[teamFinish];
    const opponent = teams.find((t) => t.id === opponentId);
    if (opponent) {
      opponents.push(opponent);
    }
  }

  return opponents;
}

/**
 * 17th game division pairings (fixed rotation for same-place matchups)
 * Each AFC division pairs with a specific NFC division (not their inter-conference rotation)
 */
const SEVENTEENTH_GAME_PAIRINGS: Record<Conference, Record<Division, Division>> = {
  AFC: {
    East: 'South', // AFC East plays NFC South
    North: 'West', // AFC North plays NFC West
    South: 'East', // AFC South plays NFC East
    West: 'North', // AFC West plays NFC North
  },
  NFC: {
    South: 'East', // NFC South plays AFC East
    West: 'North', // NFC West plays AFC North
    East: 'South', // NFC East plays AFC South
    North: 'West', // NFC North plays AFC West
  },
};

/**
 * Gets same-place finisher from opposite conference for 17th game
 * Uses fixed division pairings to ensure 1:1 matchups
 */
function getSeventeenthGameOpponent(
  team: Team,
  teams: Team[],
  previousStandings: PreviousYearStandings
): Team | null {
  const teamFinish = getTeamFinishPosition(team, previousStandings);
  const oppositeConference: Conference = team.conference === 'AFC' ? 'NFC' : 'AFC';
  const targetDivision = SEVENTEENTH_GAME_PAIRINGS[team.conference][team.division];

  const divisionTeams = previousStandings[oppositeConference][targetDivision];
  const opponentId = divisionTeams[teamFinish];
  return teams.find((t) => t.id === opponentId) || null;
}

/**
 * Gets a team's finish position in their division last year
 */
function getTeamFinishPosition(team: Team, previousStandings: PreviousYearStandings): number {
  const divisionOrder = previousStandings[team.conference][team.division];
  const position = divisionOrder.indexOf(team.id);
  return position >= 0 ? position : 0; // Default to 1st if not found
}

/**
 * Creates a scheduled game
 */
function createGame(
  week: number,
  homeTeam: Team,
  awayTeam: Team,
  gameIndex: number
): ScheduledGame {
  const isDivisional =
    homeTeam.conference === awayTeam.conference && homeTeam.division === awayTeam.division;
  const isConference = homeTeam.conference === awayTeam.conference;

  return {
    gameId: `game-${week}-${gameIndex}`,
    week,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    isDivisional,
    isConference,
    isRivalry: isDivisional, // All divisional games are rivalries
    timeSlot: assignTimeSlot(week, isDivisional),
    isComplete: false,
    homeScore: null,
    awayScore: null,
    winnerId: null,
  };
}

/**
 * Assigns a time slot based on week and game type
 */
function assignTimeSlot(week: number, isDivisional: boolean): TimeSlot {
  // Week 1 gets more prime time slots
  if (week === 1) {
    return 'sunday_night';
  }

  // Divisional games more likely to get prime time
  if (isDivisional && week >= 10) {
    const slots: TimeSlot[] = ['sunday_night', 'monday_night', 'late_sunday'];
    return slots[week % slots.length];
  }

  // Default distribution
  const defaultSlots: TimeSlot[] = [
    'early_sunday',
    'early_sunday',
    'early_sunday',
    'late_sunday',
    'sunday_night',
  ];
  return defaultSlots[week % defaultSlots.length];
}

/**
 * Distributes games across weeks respecting bye weeks.
 * Uses backtracking with MRV heuristic.
 */
function distributeGamesAcrossWeeks(
  games: ScheduledGame[],
  byeWeeks: Record<string, number>
): ScheduledGame[] {
  // Try scheduling with a given game ordering
  const trySchedule = (orderedGames: ScheduledGame[]): Map<string, number> | null => {
    const teamWeeks = new Map<string, Set<number>>();
    for (const game of orderedGames) {
      if (!teamWeeks.has(game.homeTeamId)) teamWeeks.set(game.homeTeamId, new Set());
      if (!teamWeeks.has(game.awayTeamId)) teamWeeks.set(game.awayTeamId, new Set());
    }
    for (const [teamId, byeWeek] of Object.entries(byeWeeks)) {
      teamWeeks.get(teamId)?.add(byeWeek);
    }

    const assignments = new Map<string, number>();

    const canAssign = (game: ScheduledGame, week: number): boolean =>
      !teamWeeks.get(game.homeTeamId)!.has(week) && !teamWeeks.get(game.awayTeamId)!.has(week);

    const assign = (game: ScheduledGame, week: number): void => {
      assignments.set(game.gameId, week);
      teamWeeks.get(game.homeTeamId)!.add(week);
      teamWeeks.get(game.awayTeamId)!.add(week);
    };

    const getValidWeeks = (game: ScheduledGame): number[] => {
      const valid: number[] = [];
      for (let w = 1; w <= 18; w++) {
        if (canAssign(game, w)) valid.push(w);
      }
      return valid;
    };

    // Schedule using MRV - always pick game with fewest valid weeks
    const remaining = [...orderedGames];
    while (remaining.length > 0) {
      // Find game with minimum valid weeks (but > 0)
      let bestIdx = -1;
      let bestWeeks: number[] = [];

      for (let i = 0; i < remaining.length; i++) {
        const weeks = getValidWeeks(remaining[i]);
        if (weeks.length > 0 && (bestIdx === -1 || weeks.length < bestWeeks.length)) {
          bestIdx = i;
          bestWeeks = weeks;
        }
      }

      if (bestIdx === -1) {
        return assignments; // Return partial result instead of null
      }

      // Assign to first valid week (prefer late for divisional, early otherwise)
      const game = remaining[bestIdx];
      const sortedWeeks = [...bestWeeks];
      if (game.isDivisional) {
        sortedWeeks.sort((a, b) => b - a);
      }
      assign(game, sortedWeeks[0]);
      remaining.splice(bestIdx, 1);
    }

    return assignments;
  };

  // Seeded shuffle for deterministic results
  const seededShuffle = <T>(arr: T[], seed: number): T[] => {
    const result = [...arr];
    let s = seed;
    for (let i = result.length - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const j = s % (i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  // Try many different orderings with different seeds
  const orderings = [
    // Standard orderings
    [...games].sort((a, b) => {
      if (a.isDivisional !== b.isDivisional) return a.isDivisional ? -1 : 1;
      return (a.homeTeamId + a.awayTeamId).localeCompare(b.homeTeamId + b.awayTeamId);
    }),
    [...games].sort((a, b) => {
      if (a.isDivisional !== b.isDivisional) return a.isDivisional ? 1 : -1;
      return (a.homeTeamId + a.awayTeamId).localeCompare(b.homeTeamId + b.awayTeamId);
    }),
    [...games].sort((a, b) =>
      (a.awayTeamId + a.homeTeamId).localeCompare(b.awayTeamId + b.homeTeamId)
    ),
    // Many random shuffles - some will find valid schedules
    ...Array.from({ length: 50 }, (_, i) => seededShuffle(games, i * 7919 + 1)),
  ];

  let bestResult: Map<string, number> | null = null;

  for (const ordering of orderings) {
    const result = trySchedule(ordering);
    if (result && result.size === games.length) {
      bestResult = result;
      break; // Perfect schedule found
    }
    if (result && (!bestResult || result.size > bestResult.size)) {
      bestResult = result;
    }
  }

  // Fallback with repair: greedy + swap unscheduled games
  if (!bestResult || bestResult.size < games.length) {
    const teamWeeks = new Map<string, Set<number>>();
    for (const game of games) {
      if (!teamWeeks.has(game.homeTeamId)) teamWeeks.set(game.homeTeamId, new Set());
      if (!teamWeeks.has(game.awayTeamId)) teamWeeks.set(game.awayTeamId, new Set());
    }
    for (const [teamId, byeWeek] of Object.entries(byeWeeks)) {
      teamWeeks.get(teamId)?.add(byeWeek);
    }

    const canAssignFb = (g: ScheduledGame, w: number) =>
      !teamWeeks.get(g.homeTeamId)!.has(w) && !teamWeeks.get(g.awayTeamId)!.has(w);
    const assignFb = (g: ScheduledGame, w: number) => {
      bestResult!.set(g.gameId, w);
      teamWeeks.get(g.homeTeamId)!.add(w);
      teamWeeks.get(g.awayTeamId)!.add(w);
    };
    const unassignFb = (g: ScheduledGame) => {
      const w = bestResult!.get(g.gameId);
      if (w !== undefined) {
        bestResult!.delete(g.gameId);
        teamWeeks.get(g.homeTeamId)!.delete(w);
        teamWeeks.get(g.awayTeamId)!.delete(w);
      }
      return w;
    };

    bestResult = new Map();

    // First pass: greedy
    for (const game of games) {
      for (let w = 1; w <= 18; w++) {
        if (canAssignFb(game, w)) {
          assignFb(game, w);
          break;
        }
      }
    }

    // Repair pass: try swapping for unscheduled games
    for (let iter = 0; iter < 50 && bestResult.size < games.length; iter++) {
      for (const game of games) {
        if (bestResult.has(game.gameId)) continue;

        for (let w = 1; w <= 18; w++) {
          if (canAssignFb(game, w)) {
            assignFb(game, w);
            break;
          }

          // Find blockers and try to move them
          const blockers = games.filter(
            (g) =>
              bestResult!.get(g.gameId) === w &&
              (g.homeTeamId === game.homeTeamId ||
                g.awayTeamId === game.homeTeamId ||
                g.homeTeamId === game.awayTeamId ||
                g.awayTeamId === game.awayTeamId)
          );

          for (const blocker of blockers) {
            const oldW = unassignFb(blocker);
            // Try each week for blocker
            for (let alt = 1; alt <= 18; alt++) {
              if (canAssignFb(blocker, alt)) {
                assignFb(blocker, alt);
                if (canAssignFb(game, w)) {
                  assignFb(game, w);
                  break;
                }
                unassignFb(blocker);
              }
            }
            if (bestResult.has(game.gameId)) break;
            if (oldW !== undefined) assignFb(blocker, oldW);
          }
          if (bestResult.has(game.gameId)) break;
        }
      }
    }
  }

  return games
    .filter((g) => bestResult!.has(g.gameId))
    .map((g) => ({ ...g, week: bestResult!.get(g.gameId)! }));
}

/**
 * Determines home team for a matchup based on deterministic rules
 */
function determineHomeTeam(teamA: Team, teamB: Team, matchupType: string): Team {
  // Sort team IDs for consistent ordering
  const [first] = [teamA.id, teamB.id].sort();
  const isTeamAFirst = teamA.id === first;

  // Use matchup type to vary home/away across different matchup types
  const typeHash = matchupType.charCodeAt(0) % 2;

  if (typeHash === 0) {
    return isTeamAFirst ? teamA : teamB;
  } else {
    return isTeamAFirst ? teamB : teamA;
  }
}

/**
 * Generates a complete 17-week schedule for 32 teams
 *
 * @param teams - Array of all 32 teams
 * @param previousYearStandings - Previous year's final standings
 * @param year - The season year
 * @returns Complete season schedule
 */
export function generateSeasonSchedule(
  teams: Team[],
  previousYearStandings: PreviousYearStandings,
  year: number
): SeasonSchedule {
  const byeWeeksMap = assignByeWeeks(teams);
  // Convert Map to plain object for JSON serialization compatibility
  const byeWeeks: Record<string, number> = Object.fromEntries(byeWeeksMap);
  const allGames: ScheduledGame[] = [];
  const processedPairs = new Set<string>();
  let gameIndex = 0;

  // Helper to create a canonical key for a pair of teams (order-independent)
  const getCanonicalKey = (teamA: Team, teamB: Team): string => {
    const [first, second] = [teamA.id, teamB.id].sort();
    return `${first}-${second}`;
  };

  // Helper to add a divisional game (needs both home and away)
  const addDivisionalGame = (homeTeam: Team, awayTeam: Team) => {
    const key = `${homeTeam.id}-${awayTeam.id}`;
    if (!processedPairs.has(key)) {
      processedPairs.add(key);
      allGames.push(createGame(1, homeTeam, awayTeam, gameIndex++));
    }
  };

  // Helper to add a non-divisional game (only one game per pair)
  const addSingleGame = (teamA: Team, teamB: Team, homeTeam: Team) => {
    const key = getCanonicalKey(teamA, teamB);
    if (!processedPairs.has(key)) {
      processedPairs.add(key);
      const awayTeam = homeTeam.id === teamA.id ? teamB : teamA;
      allGames.push(createGame(1, homeTeam, awayTeam, gameIndex++));
    }
  };

  // Generate games in order of constraint level (most constrained first)
  // This helps the scheduling algorithm find valid assignments

  // 1. 17TH GAME (1 per team = 16 total games) - FIRST, most constrained (unique pairs)
  for (const team of teams) {
    const opponent = getSeventeenthGameOpponent(team, teams, previousYearStandings);
    if (opponent) {
      const homeTeam = determineHomeTeam(team, opponent, 'seventeenth');
      addSingleGame(team, opponent, homeTeam);
    }
  }

  // 2. SAME-PLACE CONFERENCE GAMES (2 per team = 32 total games) - specific pairs
  for (const team of teams) {
    const opponents = getSamePlaceConferenceOpponents(team, teams, previousYearStandings);
    for (let i = 0; i < opponents.length; i++) {
      const opp = opponents[i];
      const homeTeam = determineHomeTeam(team, opp, `samePlaceConf${i}`);
      addSingleGame(team, opp, homeTeam);
    }
  }

  // 3. DIVISIONAL GAMES (6 per team = 12 games per division = 96 total)
  // Each team plays home and away vs each of 3 division rivals
  for (const team of teams) {
    const rivals = getDivisionRivals(team, teams);
    for (const rival of rivals) {
      addDivisionalGame(team, rival);
    }
  }

  // 4. INTRA-CONFERENCE ROTATION (4 per team = 64 total games)
  for (const team of teams) {
    const opponents = getIntraConferenceOpponents(team, teams);
    for (let i = 0; i < opponents.length; i++) {
      const opp = opponents[i];
      const homeTeam = determineHomeTeam(team, opp, `intraConf${i}`);
      addSingleGame(team, opp, homeTeam);
    }
  }

  // 5. INTER-CONFERENCE ROTATION (4 per team = 64 total games)
  for (const team of teams) {
    const opponents = getInterConferenceOpponents(team, teams);
    for (let i = 0; i < opponents.length; i++) {
      const opp = opponents[i];
      const homeTeam = determineHomeTeam(team, opp, `interConf${i}`);
      addSingleGame(team, opp, homeTeam);
    }
  }

  // Distribute games across weeks
  const scheduledGames = distributeGamesAcrossWeeks(allGames, byeWeeks);

  // Update game IDs to reflect actual weeks
  const finalGames = scheduledGames.map((game, index) => ({
    ...game,
    gameId: `game-${year}-w${game.week}-${index}`,
  }));

  return {
    year,
    regularSeason: finalGames,
    byeWeeks,
    playoffs: null,
  };
}

/**
 * Gets games for a specific week
 *
 * @param schedule - The season schedule
 * @param week - Week number (1-18)
 * @returns Array of games for that week
 */
export function getWeekGames(schedule: SeasonSchedule, week: number): ScheduledGame[] {
  return schedule.regularSeason.filter((game) => game.week === week);
}

/**
 * Gets a team's complete schedule
 *
 * @param schedule - The season schedule
 * @param teamId - The team ID
 * @returns Array of games for that team
 */
export function getTeamSchedule(schedule: SeasonSchedule, teamId: string): ScheduledGame[] {
  return schedule.regularSeason
    .filter((game) => game.homeTeamId === teamId || game.awayTeamId === teamId)
    .sort((a, b) => a.week - b.week);
}

/**
 * Gets a team's remaining (incomplete) games
 *
 * @param schedule - The season schedule
 * @param teamId - The team ID
 * @returns Array of remaining games
 */
export function getTeamRemainingSchedule(
  schedule: SeasonSchedule,
  teamId: string
): ScheduledGame[] {
  return getTeamSchedule(schedule, teamId).filter((game) => !game.isComplete);
}

/**
 * Gets a team's completed games
 *
 * @param schedule - The season schedule
 * @param teamId - The team ID
 * @returns Array of completed games
 */
export function getTeamCompletedGames(schedule: SeasonSchedule, teamId: string): ScheduledGame[] {
  return getTeamSchedule(schedule, teamId).filter((game) => game.isComplete);
}

/**
 * Updates a game result in the schedule
 *
 * @param schedule - The season schedule
 * @param gameId - The game ID to update
 * @param homeScore - Home team score
 * @param awayScore - Away team score
 * @returns Updated schedule
 */
export function updateGameResult(
  schedule: SeasonSchedule,
  gameId: string,
  homeScore: number,
  awayScore: number
): SeasonSchedule {
  const updatedGames = schedule.regularSeason.map((game) => {
    if (game.gameId === gameId) {
      const winnerId =
        homeScore > awayScore ? game.homeTeamId : homeScore < awayScore ? game.awayTeamId : null;

      return {
        ...game,
        isComplete: true,
        homeScore,
        awayScore,
        winnerId,
      };
    }
    return game;
  });

  return {
    ...schedule,
    regularSeason: updatedGames,
  };
}

/**
 * Gets the game between two specific teams in a given week
 *
 * @param schedule - The season schedule
 * @param teamId1 - First team ID
 * @param teamId2 - Second team ID
 * @returns The game, or undefined if not found
 */
export function getMatchup(
  schedule: SeasonSchedule,
  teamId1: string,
  teamId2: string
): ScheduledGame | undefined {
  return schedule.regularSeason.find(
    (game) =>
      (game.homeTeamId === teamId1 && game.awayTeamId === teamId2) ||
      (game.homeTeamId === teamId2 && game.awayTeamId === teamId1)
  );
}

/**
 * Counts completed games in the schedule
 */
export function getCompletedGameCount(schedule: SeasonSchedule): number {
  return schedule.regularSeason.filter((game) => game.isComplete).length;
}

/**
 * Checks if the regular season is complete
 */
export function isRegularSeasonComplete(schedule: SeasonSchedule): boolean {
  return schedule.regularSeason.every((game) => game.isComplete);
}
