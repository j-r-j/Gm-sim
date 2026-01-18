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
 * Distributes games across weeks respecting bye weeks
 * Uses NFL-style approach: Week 18 divisional only, structured week preferences
 */
function distributeGamesAcrossWeeks(
  games: ScheduledGame[],
  byeWeeks: Record<string, number>
): ScheduledGame[] {
  const teamWeeklyGames = new Map<string, Set<number>>();

  // Initialize team weekly tracking with bye weeks marked
  const allTeamIds = new Set<string>();
  for (const game of games) {
    allTeamIds.add(game.homeTeamId);
    allTeamIds.add(game.awayTeamId);
  }
  for (const teamId of allTeamIds) {
    const byeWeek = byeWeeks[teamId];
    const unavailable = new Set<number>();
    if (byeWeek) unavailable.add(byeWeek);
    teamWeeklyGames.set(teamId, unavailable);
  }

  const gameWeekAssignment = new Map<string, number>();

  // Helper to check if a week is valid for a game
  const isWeekValid = (game: ScheduledGame, week: number): boolean => {
    const homeUsed = teamWeeklyGames.get(game.homeTeamId)!;
    const awayUsed = teamWeeklyGames.get(game.awayTeamId)!;
    return !homeUsed.has(week) && !awayUsed.has(week);
  };

  // Helper to assign a game to a week
  const assignGame = (game: ScheduledGame, week: number): boolean => {
    if (!isWeekValid(game, week)) return false;
    gameWeekAssignment.set(game.gameId, week);
    teamWeeklyGames.get(game.homeTeamId)!.add(week);
    teamWeeklyGames.get(game.awayTeamId)!.add(week);
    return true;
  };

  // Separate divisional and non-divisional games
  const divisionalGames = games.filter((g) => g.isDivisional);
  const nonDivisionalGames = games.filter((g) => !g.isDivisional);

  // PHASE 1: Assign Week 18 to divisional games only (NFL rule)
  // Each division has 6 unique pairs, we need 16 games total for Week 18
  for (const game of divisionalGames) {
    if (isWeekValid(game, 18)) {
      assignGame(game, 18);
    }
  }

  // PHASE 2: Assign remaining divisional games to weeks 13-17 (late season emphasis)
  const remainingDivisional = divisionalGames.filter((g) => !gameWeekAssignment.has(g.gameId));
  const lateWeeks = [17, 16, 15, 14, 13];
  for (const game of remainingDivisional) {
    for (const week of lateWeeks) {
      if (assignGame(game, week)) break;
    }
  }

  // PHASE 3: Fill any still-unassigned divisional games
  const stillUnassignedDiv = divisionalGames.filter((g) => !gameWeekAssignment.has(g.gameId));
  for (const game of stillUnassignedDiv) {
    for (let week = 12; week >= 1; week--) {
      if (assignGame(game, week)) break;
    }
  }

  // PHASE 4: Assign non-divisional games to remaining slots
  // Sort by constraint level (teams with fewer available weeks first)
  const getTeamAvailability = (teamId: string): number => {
    return 18 - teamWeeklyGames.get(teamId)!.size;
  };

  nonDivisionalGames.sort((a, b) => {
    const aMin = Math.min(getTeamAvailability(a.homeTeamId), getTeamAvailability(a.awayTeamId));
    const bMin = Math.min(getTeamAvailability(b.homeTeamId), getTeamAvailability(b.awayTeamId));
    return aMin - bMin;
  });

  for (const game of nonDivisionalGames) {
    // Try weeks 1-17 (not 18, reserved for divisional)
    for (let week = 1; week <= 17; week++) {
      if (assignGame(game, week)) break;
    }
  }

  // PHASE 5: Final pass - try any remaining games in any valid week
  const allUnassigned = games.filter((g) => !gameWeekAssignment.has(g.gameId));
  for (const game of allUnassigned) {
    for (let week = 1; week <= 18; week++) {
      if (assignGame(game, week)) break;
    }
  }

  // Build the result (silently drop unschedulable games for now)
  const result: ScheduledGame[] = [];
  for (const game of games) {
    const week = gameWeekAssignment.get(game.gameId);
    if (week !== undefined) {
      result.push({ ...game, week });
    }
  }

  return result;
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
