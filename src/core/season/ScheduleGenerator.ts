/**
 * NFL Schedule Generator
 * Generates a complete, accurate 17-game regular season schedule for all 32 NFL teams.
 * Implements the exact NFL scheduling formula with proper year-based rotations.
 *
 * NFL Scheduling Formula (5 Components):
 * - Component A: 6 divisional games (home/away vs 3 division rivals)
 * - Component B: 4 intraconference rotation games (rotates on 3-year cycle)
 * - Component C: 4 interconference rotation games (rotates on 4-year cycle)
 * - Component D: 2 intraconference standings-based games
 * - Component E: 1 interconference "17th game" (from division played 2 years ago)
 */

import { Team } from '../models/team/Team';
import { Conference, Division, ALL_DIVISIONS, ALL_CONFERENCES } from '../models/team/FakeCities';
import { assignByeWeeks } from './ByeWeekManager';
import { PlayoffSchedule } from './PlayoffGenerator';

// ============================================================================
// TYPES
// ============================================================================

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
 * Which component generated this game
 */
export type GameComponent = 'A' | 'B' | 'C' | 'D' | 'E';

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

  // Component that generated this game
  component: GameComponent;

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
 * Validation result
 */
export interface ValidationResult {
  passed: boolean;
  errors: string[];
}

// ============================================================================
// DIVISION INDEX MAPPING
// ============================================================================

const DIVISION_INDICES: Record<Division, number> = {
  East: 0,
  North: 1,
  South: 2,
  West: 3,
};

const INDEX_TO_DIVISION: Division[] = ['East', 'North', 'South', 'West'];

// ============================================================================
// ROTATION LOOKUP FUNCTIONS
// ============================================================================

/**
 * Intraconference rotation: which same-conference division does each division play?
 * This is a 3-year cycle where each division plays the other 3 divisions in sequence.
 *
 * CRITICAL: The table MUST be symmetric - if division A plays B, then B plays A.
 * Each year has 2 pairs per conference.
 *
 * Table verified against NFL schedule data:
 * | Season Mod 3 | Pairs                          |
 * |--------------|--------------------------------|
 * | 0 (2022...)  | (East, South), (North, West)   |
 * | 1 (2023...)  | (East, North), (South, West)   |
 * | 2 (2024...)  | (East, West), (North, South)   |
 */
const INTRA_ROTATION: number[][] = [
  // [year%3 === 0, year%3 === 1, year%3 === 2]
  [2, 1, 3], // East  (0) plays: South, North, West
  [3, 0, 2], // North (1) plays: West, East, South  (symmetric with East)
  [0, 3, 1], // South (2) plays: East, West, North  (symmetric with East, West)
  [1, 2, 0], // West  (3) plays: North, South, East (symmetric with North, South, East)
];

/**
 * Gets the intraconference opponent division index for a given division and year.
 */
export function getIntraconfOpponentDivision(divisionIndex: number, seasonYear: number): number {
  return INTRA_ROTATION[divisionIndex][seasonYear % 3];
}

/**
 * Interconference rotation: which opposite-conference division does each division play?
 * This is a 4-year cycle.
 *
 * Table verified against NFL schedule data (AFC division → NFC division):
 * Using year % 4 (NOT (year-2022) % 4):
 * | year % 4 | Example | AFC East | AFC North | AFC South | AFC West |
 * |----------|---------|----------|-----------|-----------|----------|
 * | 0        | 2024    | NFC West | NFC South | NFC North | NFC East |
 * | 1        | 2025    | NFC South| NFC North | NFC East  | NFC West |
 * | 2        | 2022    | NFC North| NFC East  | NFC West  | NFC South|
 * | 3        | 2023    | NFC East | NFC West  | NFC South | NFC North|
 */
const INTER_ROTATION_AFC: number[][] = [
  // [year%4 === 0, year%4 === 1, year%4 === 2, year%4 === 3]
  [3, 2, 1, 0], // AFC East  → NFC: West, South, North, East
  [2, 1, 0, 3], // AFC North → NFC: South, North, East, West
  [1, 0, 3, 2], // AFC South → NFC: North, East, West, South
  [0, 3, 2, 1], // AFC West  → NFC: East, West, South, North
];

/**
 * Gets the interconference opponent for a given conference, division, and year.
 * Returns the opposing conference division index.
 */
export function getInterconfOpponentDivision(
  conference: Conference,
  divisionIndex: number,
  seasonYear: number
): { conference: Conference; divisionIndex: number } {
  if (conference === 'AFC') {
    return {
      conference: 'NFC',
      divisionIndex: INTER_ROTATION_AFC[divisionIndex][seasonYear % 4],
    };
  } else {
    // NFC: reverse lookup — find which AFC division maps to this NFC division
    for (let afcDiv = 0; afcDiv < 4; afcDiv++) {
      if (INTER_ROTATION_AFC[afcDiv][seasonYear % 4] === divisionIndex) {
        return { conference: 'AFC', divisionIndex: afcDiv };
      }
    }
    throw new Error('Interconf rotation lookup failed');
  }
}

/**
 * Gets the 17th game opponent division.
 * The 17th game comes from the interconference division played 2 years ago.
 */
export function get17thGameOpponentDivision(
  conference: Conference,
  divisionIndex: number,
  seasonYear: number
): { conference: Conference; divisionIndex: number } {
  return getInterconfOpponentDivision(conference, divisionIndex, seasonYear - 2);
}

/**
 * Gets which conference hosts the 17th game for a given season.
 * AFC hosts in odd years (2021, 2023, 2025...)
 * NFC hosts in even years (2022, 2024, 2026...)
 */
export function get17thGameHomeConference(seasonYear: number): Conference {
  return seasonYear % 2 === 1 ? 'AFC' : 'NFC';
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
  for (const conference of ALL_CONFERENCES) {
    for (const division of ALL_DIVISIONS) {
      standings[conference][division].sort();
    }
  }

  return standings;
}

/**
 * Gets a team's finish position in their division last year (0-indexed)
 */
function getTeamFinishPosition(team: Team, previousStandings: PreviousYearStandings): number {
  const divisionOrder = previousStandings[team.conference][team.division];
  const position = divisionOrder.indexOf(team.id);
  return position >= 0 ? position : 0; // Default to 1st if not found
}

/**
 * Gets teams in a specific division
 */
function getTeamsInDivision(teams: Team[], conference: Conference, division: Division): Team[] {
  return teams.filter((t) => t.conference === conference && t.division === division);
}

/**
 * Gets teams in a specific division by index
 */
function getTeamsInDivisionByIndex(
  teams: Team[],
  conference: Conference,
  divisionIndex: number
): Team[] {
  const division = INDEX_TO_DIVISION[divisionIndex];
  return getTeamsInDivision(teams, conference, division);
}

/**
 * Gets a team by ID
 */
function getTeamById(teams: Team[], teamId: string): Team | undefined {
  return teams.find((t) => t.id === teamId);
}

/**
 * Gets the opponent conference
 */
function getOppositeConference(conference: Conference): Conference {
  return conference === 'AFC' ? 'NFC' : 'AFC';
}

/**
 * Assigns a time slot based on week and game type
 */
function assignTimeSlot(week: number, isDivisional: boolean): TimeSlot {
  if (week === 1) return 'sunday_night';
  if (isDivisional && week >= 10) {
    const slots: TimeSlot[] = ['sunday_night', 'monday_night', 'late_sunday'];
    return slots[week % slots.length];
  }
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
 * Creates a scheduled game
 */
function createGame(
  week: number,
  homeTeam: Team,
  awayTeam: Team,
  component: GameComponent,
  gameIndex: number
): ScheduledGame {
  const isDivisional =
    homeTeam.conference === awayTeam.conference && homeTeam.division === awayTeam.division;
  const isConference = homeTeam.conference === awayTeam.conference;

  return {
    // Use component prefix to ensure unique IDs across all components
    gameId: `game-${component}-${gameIndex}`,
    week,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    isDivisional,
    isConference,
    isRivalry: isDivisional,
    component,
    timeSlot: assignTimeSlot(week, isDivisional),
    isComplete: false,
    homeScore: null,
    awayScore: null,
    winnerId: null,
  };
}

// ============================================================================
// SCHEDULE GENERATION
// ============================================================================

/**
 * Generates all games for Component A: Divisional Games (6 per team)
 * Each team plays home and away vs each of 3 division rivals.
 */
function generateComponentA(teams: Team[]): ScheduledGame[] {
  const games: ScheduledGame[] = [];
  const processedPairs = new Set<string>();
  let gameIndex = 0;

  for (const team of teams) {
    const rivals = teams.filter(
      (t) => t.conference === team.conference && t.division === team.division && t.id !== team.id
    );

    for (const rival of rivals) {
      // Create home game
      const homeKey = `${team.id}-${rival.id}`;
      if (!processedPairs.has(homeKey)) {
        processedPairs.add(homeKey);
        games.push(createGame(1, team, rival, 'A', gameIndex++));
      }

      // Create away game
      const awayKey = `${rival.id}-${team.id}`;
      if (!processedPairs.has(awayKey)) {
        processedPairs.add(awayKey);
        games.push(createGame(1, rival, team, 'A', gameIndex++));
      }
    }
  }

  return games;
}

/**
 * Generates all games for Component B: Intraconference Rotation (4 per team)
 * Each team plays all 4 teams from one other division in their conference.
 * 2 home, 2 away per rotation rules.
 *
 * Algorithm: For each division pair (A vs B), we create 16 games.
 * Teams are sorted by ID within each division. Home/away is assigned using
 * a checkerboard pattern based on team indices to ensure exactly 2H/2A per team.
 */
function generateComponentB(teams: Team[], seasonYear: number): ScheduledGame[] {
  const games: ScheduledGame[] = [];
  const processedDivisionPairs = new Set<string>();
  let gameIndex = 0;

  // Process by division pairs to ensure proper home/away distribution
  for (const conference of ALL_CONFERENCES) {
    for (let divIndex = 0; divIndex < 4; divIndex++) {
      const opponentDivIndex = getIntraconfOpponentDivision(divIndex, seasonYear);

      // Only process each division pair once (avoid processing A-B and B-A)
      const pairKey = [divIndex, opponentDivIndex].sort().join('-') + `-${conference}`;
      if (processedDivisionPairs.has(pairKey)) continue;
      processedDivisionPairs.add(pairKey);

      const divisionA = INDEX_TO_DIVISION[divIndex];
      const divisionB = INDEX_TO_DIVISION[opponentDivIndex];

      const teamsA = getTeamsInDivision(teams, conference, divisionA).sort((a, b) =>
        a.id.localeCompare(b.id)
      );
      const teamsB = getTeamsInDivision(teams, conference, divisionB).sort((a, b) =>
        a.id.localeCompare(b.id)
      );

      // Create 16 games between the two divisions
      // Use checkerboard pattern for home/away: (i + j + yearOffset) % 2
      // This ensures each team gets exactly 2 home and 2 away
      const yearOffset = seasonYear % 2;
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          const teamA = teamsA[i];
          const teamB = teamsB[j];

          // Checkerboard: alternate home/away based on sum of indices
          const teamAIsHome = (i + j + yearOffset) % 2 === 0;

          if (teamAIsHome) {
            games.push(createGame(1, teamA, teamB, 'B', gameIndex++));
          } else {
            games.push(createGame(1, teamB, teamA, 'B', gameIndex++));
          }
        }
      }
    }
  }

  return games;
}

/**
 * Generates all games for Component C: Interconference Rotation (4 per team)
 * Each team plays all 4 teams from one division in the opposite conference.
 * 2 home, 2 away per rotation rules.
 *
 * Algorithm: For each interconference division pair (AFC-X vs NFC-Y), we create 16 games.
 * Teams are sorted by ID within each division. Home/away is assigned using
 * a checkerboard pattern based on team indices to ensure exactly 2H/2A per team.
 */
function generateComponentC(teams: Team[], seasonYear: number): ScheduledGame[] {
  const games: ScheduledGame[] = [];
  const processedDivisionPairs = new Set<string>();
  let gameIndex = 0;

  // Process AFC divisions and find their NFC opponents
  for (let afcDivIndex = 0; afcDivIndex < 4; afcDivIndex++) {
    const { divisionIndex: nfcDivIndex } = getInterconfOpponentDivision(
      'AFC',
      afcDivIndex,
      seasonYear
    );

    // Create unique key for this division pair
    const pairKey = `${afcDivIndex}-${nfcDivIndex}`;
    if (processedDivisionPairs.has(pairKey)) continue;
    processedDivisionPairs.add(pairKey);

    const afcDivision = INDEX_TO_DIVISION[afcDivIndex];
    const nfcDivision = INDEX_TO_DIVISION[nfcDivIndex];

    const afcTeams = getTeamsInDivision(teams, 'AFC', afcDivision).sort((a, b) =>
      a.id.localeCompare(b.id)
    );
    const nfcTeams = getTeamsInDivision(teams, 'NFC', nfcDivision).sort((a, b) =>
      a.id.localeCompare(b.id)
    );

    // Create 16 games between the two divisions
    // Use checkerboard pattern for home/away: (i + j + yearOffset) % 2
    // This ensures each team gets exactly 2 home and 2 away
    const yearOffset = seasonYear % 2;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const afcTeam = afcTeams[i];
        const nfcTeam = nfcTeams[j];

        // Checkerboard: alternate home/away based on sum of indices
        const afcIsHome = (i + j + yearOffset) % 2 === 0;

        if (afcIsHome) {
          games.push(createGame(1, afcTeam, nfcTeam, 'C', gameIndex++));
        } else {
          games.push(createGame(1, nfcTeam, afcTeam, 'C', gameIndex++));
        }
      }
    }
  }

  return games;
}

/**
 * Generates all games for Component D: Intraconference Standings-Based (2 per team)
 * Each team plays 1 team from each of the 2 remaining same-conference divisions
 * (not own division, not the rotation division from Component B).
 * Opponent is the team that finished in the same position.
 * 1 home, 1 away.
 *
 * Algorithm: For each conference and finish position, we have 4 teams from 2 rotation groups
 * that must play each other in a complete bipartite graph (K_{2,2} = 4 games).
 * We use a diagonal pattern to ensure each team gets exactly 1H and 1A:
 * - Games (0,0)/(1,1) are one diagonal, games (0,1)/(1,0) are the other diagonal
 * - One diagonal has group1 as home, the other has group2 as home
 * - This guarantees 1H/1A per team since each team appears once per diagonal
 */
function generateComponentD(
  teams: Team[],
  previousStandings: PreviousYearStandings,
  seasonYear: number
): ScheduledGame[] {
  const games: ScheduledGame[] = [];
  let gameIndex = 0;

  for (const conference of ALL_CONFERENCES) {
    // Find the two rotation pairs (divisions that play Component B games)
    // Each pair consists of a division and its intraconf rotation opponent
    const divIndex0Opp = getIntraconfOpponentDivision(0, seasonYear);
    const rotationPair1 = [0, divIndex0Opp].sort((a, b) => a - b);
    const rotationPair2 = [0, 1, 2, 3]
      .filter((d) => !rotationPair1.includes(d))
      .sort((a, b) => a - b);

    // For each finish position, create the 4 standings games
    for (let finishPos = 0; finishPos < 4; finishPos++) {
      // Get teams at this finish position, grouped by rotation pair
      const group1Teams: { divIndex: number; team: Team }[] = [];
      const group2Teams: { divIndex: number; team: Team }[] = [];

      for (const divIndex of rotationPair1) {
        const division = INDEX_TO_DIVISION[divIndex];
        const teamId = previousStandings[conference][division][finishPos];
        const team = getTeamById(teams, teamId);
        if (team) {
          group1Teams.push({ divIndex, team });
        }
      }

      for (const divIndex of rotationPair2) {
        const division = INDEX_TO_DIVISION[divIndex];
        const teamId = previousStandings[conference][division][finishPos];
        const team = getTeamById(teams, teamId);
        if (team) {
          group2Teams.push({ divIndex, team });
        }
      }

      // Sort each group by division index for determinism
      group1Teams.sort((a, b) => a.divIndex - b.divIndex);
      group2Teams.sort((a, b) => a.divIndex - b.divIndex);

      if (group1Teams.length !== 2 || group2Teams.length !== 2) {
        continue; // Skip if teams missing
      }

      // Create 4 games between the groups using diagonal pattern for home/away
      // Use (seasonYear + finishPos) % 2 to vary which diagonal has group1 as home
      const homePattern = (seasonYear + finishPos) % 2;

      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          const team1 = group1Teams[i].team;
          const team2 = group2Teams[j].team;

          // Diagonal pattern: (i + j) % 2 determines which diagonal
          // If diagonal matches homePattern, group1 team is home
          const diagonal = (i + j) % 2;
          const team1IsHome = diagonal === homePattern;

          if (team1IsHome) {
            games.push(createGame(1, team1, team2, 'D', gameIndex++));
          } else {
            games.push(createGame(1, team2, team1, 'D', gameIndex++));
          }
        }
      }
    }
  }

  return games;
}

/**
 * Generates all games for Component E: 17th Game (1 per team)
 * Each team plays 1 team from an opposite-conference division
 * (the division they played 2 years ago in Component C).
 * Opponent is the team that finished in the same position.
 * AFC hosts in odd years, NFC hosts in even years.
 */
function generateComponentE(
  teams: Team[],
  previousStandings: PreviousYearStandings,
  seasonYear: number
): ScheduledGame[] {
  const games: ScheduledGame[] = [];
  const processedPairs = new Set<string>();
  const homeConference = get17thGameHomeConference(seasonYear);
  let gameIndex = 0;

  for (const team of teams) {
    const teamFinish = getTeamFinishPosition(team, previousStandings);
    const divIndex = DIVISION_INDICES[team.division];

    const { conference: oppConf, divisionIndex: oppDivIndex } = get17thGameOpponentDivision(
      team.conference,
      divIndex,
      seasonYear
    );
    const oppDivision = INDEX_TO_DIVISION[oppDivIndex];

    // Get the team that finished in the same position
    const divisionTeamIds = previousStandings[oppConf][oppDivision];
    const opponentId = divisionTeamIds[teamFinish];
    const opponent = getTeamById(teams, opponentId);

    if (!opponent) continue;

    const pairKey = [team.id, opponent.id].sort().join('-');

    if (!processedPairs.has(pairKey)) {
      processedPairs.add(pairKey);

      // Home team is determined by which conference hosts this year
      const homeTeam = team.conference === homeConference ? team : opponent;
      const awayTeam = team.conference === homeConference ? opponent : team;

      games.push(createGame(1, homeTeam, awayTeam, 'E', gameIndex++));
    }
  }

  return games;
}

/**
 * Distributes games across weeks, respecting bye weeks where possible.
 *
 * Uses an incremental approach: process games in order, assigning each to
 * a week where both teams are available. Tries multiple orderings to find
 * a complete assignment that respects bye weeks.
 */
function distributeGamesAcrossWeeks(
  games: ScheduledGame[],
  byeWeeks: Record<string, number>
): ScheduledGame[] {
  // Helper to attempt scheduling with a given game order
  const trySchedule = (
    orderedGames: ScheduledGame[],
    respectByes: boolean
  ): Map<string, number> | null => {
    const teamWeeks = new Map<string, Set<number>>();
    const assignment = new Map<string, number>();

    // Initialize all teams with bye weeks marked as used (if respecting byes)
    for (const game of orderedGames) {
      if (!teamWeeks.has(game.homeTeamId)) {
        const used = new Set<number>();
        if (respectByes && byeWeeks[game.homeTeamId]) {
          used.add(byeWeeks[game.homeTeamId]);
        }
        teamWeeks.set(game.homeTeamId, used);
      }
      if (!teamWeeks.has(game.awayTeamId)) {
        const used = new Set<number>();
        if (respectByes && byeWeeks[game.awayTeamId]) {
          used.add(byeWeeks[game.awayTeamId]);
        }
        teamWeeks.set(game.awayTeamId, used);
      }
    }

    for (const game of orderedGames) {
      const homeUsed = teamWeeks.get(game.homeTeamId)!;
      const awayUsed = teamWeeks.get(game.awayTeamId)!;

      // Find a valid week
      let assigned = false;
      for (let week = 1; week <= 18; week++) {
        if (!homeUsed.has(week) && !awayUsed.has(week)) {
          assignment.set(game.gameId, week);
          homeUsed.add(week);
          awayUsed.add(week);
          assigned = true;
          break;
        }
      }

      if (!assigned) return null; // Failed to schedule this game
    }

    return assignment;
  };

  // Simple seeded random shuffle
  const shuffle = (arr: ScheduledGame[], seed: number): ScheduledGame[] => {
    const result = [...arr];
    let s = seed;
    for (let i = result.length - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const j = s % (i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  // Try different orderings
  const orderings = [
    // 1. Divisional games first
    [...games].sort((a, b) => (a.isDivisional === b.isDivisional ? 0 : a.isDivisional ? -1 : 1)),
    // 2. Divisional games last
    [...games].sort((a, b) => (a.isDivisional === b.isDivisional ? 0 : a.isDivisional ? 1 : -1)),
    // 3. Random shuffles
    shuffle(games, 12345),
    shuffle(games, 67890),
    shuffle(games, 11111),
    shuffle(games, 22222),
    shuffle(games, 33333),
    shuffle(games, 44444),
    shuffle(games, 55555),
    shuffle(games, 99999),
  ];

  // First try with bye weeks respected
  for (const ordering of orderings) {
    const assignment = trySchedule(ordering, true);
    if (assignment && assignment.size === games.length) {
      // Success! Build result
      return games.map((game) => ({
        ...game,
        week: assignment.get(game.gameId)!,
      }));
    }
  }

  // If no ordering works with bye weeks, try without
  for (const ordering of orderings) {
    const assignment = trySchedule(ordering, false);
    if (assignment && assignment.size === games.length) {
      // Success (but some bye weeks may be violated)
      return games.map((game) => ({
        ...game,
        week: assignment.get(game.gameId)!,
      }));
    }
  }

  // Last resort: use best partial result ignoring byes
  let bestAssignment = new Map<string, number>();
  for (const ordering of orderings) {
    const assignment = trySchedule(ordering, false);
    if (assignment && assignment.size > bestAssignment.size) {
      bestAssignment = assignment;
    }
  }

  // Return partial result
  return games
    .filter((game) => bestAssignment.has(game.gameId))
    .map((game) => ({
      ...game,
      week: bestAssignment.get(game.gameId)!,
    }));
}

/**
 * Generates a complete 17-week schedule for 32 teams
 */
export function generateSeasonSchedule(
  teams: Team[],
  previousYearStandings: PreviousYearStandings,
  year: number
): SeasonSchedule {
  const byeWeeksMap = assignByeWeeks(teams);
  const byeWeeks: Record<string, number> = Object.fromEntries(byeWeeksMap);

  // Generate all 5 components
  const componentA = generateComponentA(teams);
  const componentB = generateComponentB(teams, year);
  const componentC = generateComponentC(teams, year);
  const componentD = generateComponentD(teams, previousYearStandings, year);
  const componentE = generateComponentE(teams, previousYearStandings, year);

  // Merge all games
  const allGames = [...componentA, ...componentB, ...componentC, ...componentD, ...componentE];

  // Distribute across weeks
  const scheduledGames = distributeGamesAcrossWeeks(allGames, byeWeeks);

  // Update game IDs
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

// ============================================================================
// VALIDATION GATES
// ============================================================================

/**
 * Gate 1: Each team must have exactly 17 games
 */
export function validateGate1GameCountPerTeam(
  games: ScheduledGame[],
  teams: Team[]
): ValidationResult {
  const errors: string[] = [];
  const teamGameCounts = new Map<string, number>();

  for (const team of teams) {
    teamGameCounts.set(team.id, 0);
  }

  for (const game of games) {
    teamGameCounts.set(game.homeTeamId, (teamGameCounts.get(game.homeTeamId) || 0) + 1);
    teamGameCounts.set(game.awayTeamId, (teamGameCounts.get(game.awayTeamId) || 0) + 1);
  }

  for (const [teamId, count] of teamGameCounts) {
    if (count !== 17) {
      const team = teams.find((t) => t.id === teamId);
      errors.push(`${team?.city || teamId} has ${count} games, expected 17`);
    }
  }

  return { passed: errors.length === 0, errors };
}

/**
 * Gate 2: Total league games must equal 272
 */
export function validateGate2TotalLeagueGames(games: ScheduledGame[]): ValidationResult {
  const errors: string[] = [];
  const expectedGames = 272;

  if (games.length !== expectedGames) {
    errors.push(`League has ${games.length} total games, expected ${expectedGames}`);
  }

  return { passed: errors.length === 0, errors };
}

/**
 * Gate 3: Home/Away balance based on 17th game home conference
 */
export function validateGate3HomeAwayBalance(
  games: ScheduledGame[],
  teams: Team[],
  seasonYear: number
): ValidationResult {
  const errors: string[] = [];
  const homeConference = get17thGameHomeConference(seasonYear);

  const teamHomeCounts = new Map<string, number>();
  const teamAwayCounts = new Map<string, number>();

  for (const team of teams) {
    teamHomeCounts.set(team.id, 0);
    teamAwayCounts.set(team.id, 0);
  }

  for (const game of games) {
    teamHomeCounts.set(game.homeTeamId, (teamHomeCounts.get(game.homeTeamId) || 0) + 1);
    teamAwayCounts.set(game.awayTeamId, (teamAwayCounts.get(game.awayTeamId) || 0) + 1);
  }

  for (const team of teams) {
    const homeGames = teamHomeCounts.get(team.id) || 0;
    const awayGames = teamAwayCounts.get(team.id) || 0;

    let expectedHome: number;
    let expectedAway: number;

    if (team.conference === homeConference) {
      expectedHome = 9;
      expectedAway = 8;
    } else {
      expectedHome = 8;
      expectedAway = 9;
    }

    if (homeGames !== expectedHome || awayGames !== expectedAway) {
      errors.push(
        `${team.city} has ${homeGames}H/${awayGames}A, expected ${expectedHome}H/${expectedAway}A`
      );
    }
  }

  return { passed: errors.length === 0, errors };
}

/**
 * Gate 4: Divisional game structure (6 games, 3H/3A per team)
 */
export function validateGate4DivisionalGames(
  games: ScheduledGame[],
  teams: Team[]
): ValidationResult {
  const errors: string[] = [];

  for (const team of teams) {
    const rivals = teams.filter(
      (t) => t.conference === team.conference && t.division === team.division && t.id !== team.id
    );

    for (const rival of rivals) {
      const gamesVsRival = games.filter(
        (g) =>
          (g.homeTeamId === team.id && g.awayTeamId === rival.id) ||
          (g.homeTeamId === rival.id && g.awayTeamId === team.id)
      );

      if (gamesVsRival.length !== 2) {
        errors.push(`${team.city} plays ${rival.city} ${gamesVsRival.length} times (expected 2)`);
        continue;
      }

      const homeGames = gamesVsRival.filter((g) => g.homeTeamId === team.id).length;
      const awayGames = gamesVsRival.filter((g) => g.awayTeamId === team.id).length;

      if (homeGames !== 1 || awayGames !== 1) {
        errors.push(`${team.city} vs ${rival.city}: ${homeGames}H/${awayGames}A (expected 1H/1A)`);
      }
    }
  }

  return { passed: errors.length === 0, errors };
}

/**
 * Gate 5: Intraconference rotation correctness
 */
export function validateGate5IntraconfRotation(
  games: ScheduledGame[],
  teams: Team[],
  seasonYear: number
): ValidationResult {
  const errors: string[] = [];

  for (const team of teams) {
    const divIndex = DIVISION_INDICES[team.division];
    const expectedDivIndex = getIntraconfOpponentDivision(divIndex, seasonYear);
    const expectedDivision = INDEX_TO_DIVISION[expectedDivIndex];
    const expectedOpponents = getTeamsInDivision(teams, team.conference, expectedDivision);

    const componentBGames = games.filter(
      (g) => g.component === 'B' && (g.homeTeamId === team.id || g.awayTeamId === team.id)
    );

    for (const expectedOpp of expectedOpponents) {
      const gamesVsOpp = componentBGames.filter(
        (g) => g.homeTeamId === expectedOpp.id || g.awayTeamId === expectedOpp.id
      );

      if (gamesVsOpp.length !== 1) {
        errors.push(
          `${team.city} missing intraconf opponent ${expectedOpp.city} from ${team.conference} ${expectedDivision}`
        );
      }
    }

    // Check 2H/2A
    const homeCount = componentBGames.filter((g) => g.homeTeamId === team.id).length;
    const awayCount = componentBGames.filter((g) => g.awayTeamId === team.id).length;

    if (homeCount !== 2 || awayCount !== 2) {
      errors.push(`${team.city} intraconf rotation: ${homeCount}H/${awayCount}A (expected 2H/2A)`);
    }
  }

  return { passed: errors.length === 0, errors };
}

/**
 * Gate 6: Interconference rotation correctness
 */
export function validateGate6InterconfRotation(
  games: ScheduledGame[],
  teams: Team[],
  seasonYear: number
): ValidationResult {
  const errors: string[] = [];

  for (const team of teams) {
    const divIndex = DIVISION_INDICES[team.division];
    const { conference: oppConf, divisionIndex: expectedDivIndex } = getInterconfOpponentDivision(
      team.conference,
      divIndex,
      seasonYear
    );
    const expectedDivision = INDEX_TO_DIVISION[expectedDivIndex];
    const expectedOpponents = getTeamsInDivision(teams, oppConf, expectedDivision);

    const componentCGames = games.filter(
      (g) => g.component === 'C' && (g.homeTeamId === team.id || g.awayTeamId === team.id)
    );

    for (const expectedOpp of expectedOpponents) {
      const gamesVsOpp = componentCGames.filter(
        (g) => g.homeTeamId === expectedOpp.id || g.awayTeamId === expectedOpp.id
      );

      if (gamesVsOpp.length !== 1) {
        errors.push(
          `${team.city} missing interconf opponent ${expectedOpp.city} from ${oppConf} ${expectedDivision}`
        );
      }
    }

    // Check 2H/2A
    const homeCount = componentCGames.filter((g) => g.homeTeamId === team.id).length;
    const awayCount = componentCGames.filter((g) => g.awayTeamId === team.id).length;

    if (homeCount !== 2 || awayCount !== 2) {
      errors.push(`${team.city} interconf rotation: ${homeCount}H/${awayCount}A (expected 2H/2A)`);
    }
  }

  return { passed: errors.length === 0, errors };
}

/**
 * Gate 7: Standings-based intraconference games
 */
export function validateGate7StandingsIntraconf(
  games: ScheduledGame[],
  teams: Team[],
  previousStandings: PreviousYearStandings,
  seasonYear: number
): ValidationResult {
  const errors: string[] = [];

  for (const team of teams) {
    const teamFinish = getTeamFinishPosition(team, previousStandings);
    const divIndex = DIVISION_INDICES[team.division];
    const intraRotationDivIndex = getIntraconfOpponentDivision(divIndex, seasonYear);

    const remainingDivIndices = [0, 1, 2, 3].filter(
      (d) => d !== divIndex && d !== intraRotationDivIndex
    );

    if (remainingDivIndices.length !== 2) {
      errors.push(
        `${team.city}: expected 2 remaining divisions, got ${remainingDivIndices.length}`
      );
      continue;
    }

    const componentDGames = games.filter(
      (g) => g.component === 'D' && (g.homeTeamId === team.id || g.awayTeamId === team.id)
    );

    for (const oppDivIndex of remainingDivIndices) {
      const oppDivision = INDEX_TO_DIVISION[oppDivIndex];
      const divisionTeamIds = previousStandings[team.conference][oppDivision];
      const expectedOpponentId = divisionTeamIds[teamFinish];

      const gamesVsExpected = componentDGames.filter(
        (g) => g.homeTeamId === expectedOpponentId || g.awayTeamId === expectedOpponentId
      );

      if (gamesVsExpected.length !== 1) {
        errors.push(
          `${team.city} (finished ${teamFinish + 1}) missing standings opponent from ${team.conference} ${oppDivision}`
        );
      }
    }

    // Check 1H/1A
    const homeCount = componentDGames.filter((g) => g.homeTeamId === team.id).length;
    const awayCount = componentDGames.filter((g) => g.awayTeamId === team.id).length;

    if (homeCount !== 1 || awayCount !== 1) {
      errors.push(`${team.city} standings games: ${homeCount}H/${awayCount}A (expected 1H/1A)`);
    }
  }

  return { passed: errors.length === 0, errors };
}

/**
 * Gate 8: 17th game correctness
 */
export function validateGate8SeventeenthGame(
  games: ScheduledGame[],
  teams: Team[],
  previousStandings: PreviousYearStandings,
  seasonYear: number
): ValidationResult {
  const errors: string[] = [];
  const homeConference = get17thGameHomeConference(seasonYear);

  for (const team of teams) {
    const teamFinish = getTeamFinishPosition(team, previousStandings);
    const divIndex = DIVISION_INDICES[team.division];

    const { conference: oppConf, divisionIndex: g17DivIndex } = get17thGameOpponentDivision(
      team.conference,
      divIndex,
      seasonYear
    );
    const g17Division = INDEX_TO_DIVISION[g17DivIndex];

    const divisionTeamIds = previousStandings[oppConf][g17Division];
    const expectedOpponentId = divisionTeamIds[teamFinish];
    const expectedOpponent = getTeamById(teams, expectedOpponentId);

    const componentEGames = games.filter(
      (g) => g.component === 'E' && (g.homeTeamId === team.id || g.awayTeamId === team.id)
    );

    if (componentEGames.length !== 1) {
      errors.push(`${team.city} has ${componentEGames.length} 17th games (expected 1)`);
      continue;
    }

    const game = componentEGames[0];
    const actualOpponentId = game.homeTeamId === team.id ? game.awayTeamId : game.homeTeamId;

    if (actualOpponentId !== expectedOpponentId) {
      const actualOpponent = getTeamById(teams, actualOpponentId);
      errors.push(
        `${team.city} 17th game: expected ${expectedOpponent?.city}, got ${actualOpponent?.city}`
      );
    }

    // Check home/away based on home conference
    if (team.conference === homeConference) {
      if (game.homeTeamId !== team.id) {
        errors.push(`${team.city} should be home for 17th game (${homeConference} hosts)`);
      }
    } else {
      if (game.awayTeamId !== team.id) {
        errors.push(`${team.city} should be away for 17th game (${homeConference} hosts)`);
      }
    }
  }

  return { passed: errors.length === 0, errors };
}

/**
 * Gate 9: No duplicate matchups beyond divisional
 */
export function validateGate9NoDuplicates(games: ScheduledGame[], teams: Team[]): ValidationResult {
  const errors: string[] = [];

  for (const team of teams) {
    const teamGames = games.filter((g) => g.homeTeamId === team.id || g.awayTeamId === team.id);

    const opponentCounts = new Map<string, number>();

    for (const game of teamGames) {
      const opponentId = game.homeTeamId === team.id ? game.awayTeamId : game.homeTeamId;
      opponentCounts.set(opponentId, (opponentCounts.get(opponentId) || 0) + 1);
    }

    for (const [opponentId, count] of opponentCounts) {
      const opponent = getTeamById(teams, opponentId);
      const isDivisional =
        opponent?.conference === team.conference && opponent?.division === team.division;

      if (isDivisional) {
        if (count !== 2) {
          errors.push(
            `${team.city} plays divisional rival ${opponent?.city} ${count} times (expected 2)`
          );
        }
      } else {
        if (count !== 1) {
          errors.push(
            `${team.city} has duplicate non-divisional opponent: ${opponent?.city} (${count} times)`
          );
        }
      }
    }
  }

  return { passed: errors.length === 0, errors };
}

/**
 * Gate 10: Component bucket sizes
 */
export function validateGate10BucketSizes(games: ScheduledGame[], teams: Team[]): ValidationResult {
  const errors: string[] = [];

  for (const team of teams) {
    const teamGames = games.filter((g) => g.homeTeamId === team.id || g.awayTeamId === team.id);

    const componentCounts: Record<GameComponent, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      E: 0,
    };

    for (const game of teamGames) {
      componentCounts[game.component]++;
    }

    if (componentCounts.A !== 6) {
      errors.push(`${team.city} bucket A: ${componentCounts.A} (expected 6)`);
    }
    if (componentCounts.B !== 4) {
      errors.push(`${team.city} bucket B: ${componentCounts.B} (expected 4)`);
    }
    if (componentCounts.C !== 4) {
      errors.push(`${team.city} bucket C: ${componentCounts.C} (expected 4)`);
    }
    if (componentCounts.D !== 2) {
      errors.push(`${team.city} bucket D: ${componentCounts.D} (expected 2)`);
    }
    if (componentCounts.E !== 1) {
      errors.push(`${team.city} bucket E: ${componentCounts.E} (expected 1)`);
    }

    const total =
      componentCounts.A +
      componentCounts.B +
      componentCounts.C +
      componentCounts.D +
      componentCounts.E;
    if (total !== 17) {
      errors.push(
        `${team.city} bucket mismatch: A=${componentCounts.A} B=${componentCounts.B} ` +
          `C=${componentCounts.C} D=${componentCounts.D} E=${componentCounts.E} = ${total} (expected 17)`
      );
    }
  }

  return { passed: errors.length === 0, errors };
}

/**
 * Gate 11: Symmetry check - if A plays B, B plays A with matching home/away
 */
export function validateGate11Symmetry(games: ScheduledGame[]): ValidationResult {
  const errors: string[] = [];

  for (const game of games) {
    // Every game should have proper home/away symmetry by definition
    // But let's verify each matchup exists in both directions where expected

    if (game.isDivisional) {
      // Should find the reverse game
      const reverseGame = games.find(
        (g) =>
          g.homeTeamId === game.awayTeamId && g.awayTeamId === game.homeTeamId && g.isDivisional
      );

      if (!reverseGame) {
        errors.push(
          `Asymmetric divisional game: ${game.homeTeamId} vs ${game.awayTeamId} missing reverse`
        );
      }
    }
  }

  return { passed: errors.length === 0, errors };
}

/**
 * Gate 12: 17th game division doesn't collide with Component C division
 */
export function validateGate12SeventeenthGameDivisionSeparation(
  teams: Team[],
  seasonYear: number
): ValidationResult {
  const errors: string[] = [];

  for (const team of teams) {
    const divIndex = DIVISION_INDICES[team.division];

    const interconfDivIndex = getInterconfOpponentDivision(
      team.conference,
      divIndex,
      seasonYear
    ).divisionIndex;

    const g17DivIndex = get17thGameOpponentDivision(
      team.conference,
      divIndex,
      seasonYear
    ).divisionIndex;

    if (interconfDivIndex === g17DivIndex) {
      const interconfDiv = INDEX_TO_DIVISION[interconfDivIndex];
      errors.push(
        `${team.city} 17th game division ${interconfDiv} collides with interconf rotation ${interconfDiv}`
      );
    }
  }

  return { passed: errors.length === 0, errors };
}

/**
 * Gate 13: Multi-season rotation verification
 */
export function validateGate13RotationAdvancement(baseYear: number): ValidationResult {
  const errors: string[] = [];

  // Verify intraconference rotation cycles through all 3 divisions over 3 years
  for (let divIndex = 0; divIndex < 4; divIndex++) {
    const opponents = new Set<number>();
    for (let year = baseYear; year < baseYear + 3; year++) {
      opponents.add(getIntraconfOpponentDivision(divIndex, year));
    }

    // Should have played 3 different divisions (all except own)
    const expectedOthers = [0, 1, 2, 3].filter((d) => d !== divIndex);
    for (const expected of expectedOthers) {
      if (!opponents.has(expected)) {
        errors.push(
          `Division ${INDEX_TO_DIVISION[divIndex]} doesn't play ${INDEX_TO_DIVISION[expected]} in 3-year intraconf cycle`
        );
      }
    }
  }

  // Verify interconference rotation cycles through all 4 divisions over 4 years
  for (let divIndex = 0; divIndex < 4; divIndex++) {
    const opponents = new Set<number>();
    for (let year = baseYear; year < baseYear + 4; year++) {
      opponents.add(getInterconfOpponentDivision('AFC', divIndex, year).divisionIndex);
    }

    // Should have played all 4 divisions
    if (opponents.size !== 4) {
      errors.push(
        `AFC ${INDEX_TO_DIVISION[divIndex]} doesn't cycle through all 4 NFC divisions in 4-year interconf cycle`
      );
    }
  }

  // Verify 17th game matches interconf from 2 years prior
  for (let divIndex = 0; divIndex < 4; divIndex++) {
    for (let year = baseYear + 2; year < baseYear + 6; year++) {
      const g17Div = get17thGameOpponentDivision('AFC', divIndex, year).divisionIndex;
      const interconfTwoYearsAgo = getInterconfOpponentDivision(
        'AFC',
        divIndex,
        year - 2
      ).divisionIndex;

      if (g17Div !== interconfTwoYearsAgo) {
        errors.push(
          `AFC ${INDEX_TO_DIVISION[divIndex]} year ${year}: 17th game div ${INDEX_TO_DIVISION[g17Div]} doesn't match interconf from ${year - 2} (${INDEX_TO_DIVISION[interconfTwoYearsAgo]})`
        );
      }
    }
  }

  return { passed: errors.length === 0, errors };
}

/**
 * Gate 14: 17th game home conference alternation
 */
export function validateGate14HomeConferenceAlternation(): ValidationResult {
  const errors: string[] = [];

  for (let year = 2021; year <= 2030; year++) {
    const homeConf = get17thGameHomeConference(year);
    const expectedHomeConf: Conference = year % 2 === 1 ? 'AFC' : 'NFC';

    if (homeConf !== expectedHomeConf) {
      errors.push(
        `17th game home conference wrong for year ${year}: got ${homeConf}, expected ${expectedHomeConf}`
      );
    }
  }

  return { passed: errors.length === 0, errors };
}

/**
 * Runs all validation gates on a schedule
 */
export function validateSchedule(
  schedule: SeasonSchedule,
  teams: Team[],
  previousStandings: PreviousYearStandings
): ValidationResult {
  const allErrors: string[] = [];
  const games = schedule.regularSeason;
  const year = schedule.year;

  const gates = [
    { name: 'Gate 1: Game Count Per Team', fn: () => validateGate1GameCountPerTeam(games, teams) },
    { name: 'Gate 2: Total League Games', fn: () => validateGate2TotalLeagueGames(games) },
    {
      name: 'Gate 3: Home/Away Balance',
      fn: () => validateGate3HomeAwayBalance(games, teams, year),
    },
    { name: 'Gate 4: Divisional Games', fn: () => validateGate4DivisionalGames(games, teams) },
    {
      name: 'Gate 5: Intraconf Rotation',
      fn: () => validateGate5IntraconfRotation(games, teams, year),
    },
    {
      name: 'Gate 6: Interconf Rotation',
      fn: () => validateGate6InterconfRotation(games, teams, year),
    },
    {
      name: 'Gate 7: Standings Intraconf',
      fn: () => validateGate7StandingsIntraconf(games, teams, previousStandings, year),
    },
    {
      name: 'Gate 8: 17th Game',
      fn: () => validateGate8SeventeenthGame(games, teams, previousStandings, year),
    },
    { name: 'Gate 9: No Duplicates', fn: () => validateGate9NoDuplicates(games, teams) },
    { name: 'Gate 10: Bucket Sizes', fn: () => validateGate10BucketSizes(games, teams) },
    { name: 'Gate 11: Symmetry', fn: () => validateGate11Symmetry(games) },
    {
      name: 'Gate 12: 17th Game Division Separation',
      fn: () => validateGate12SeventeenthGameDivisionSeparation(teams, year),
    },
    {
      name: 'Gate 13: Rotation Advancement',
      fn: () => validateGate13RotationAdvancement(year - 2),
    },
    {
      name: 'Gate 14: Home Conference Alternation',
      fn: () => validateGate14HomeConferenceAlternation(),
    },
  ];

  for (const gate of gates) {
    const result = gate.fn();
    if (!result.passed) {
      allErrors.push(`${gate.name} FAILED:`);
      allErrors.push(...result.errors.map((e) => `  - ${e}`));
    }
  }

  return {
    passed: allErrors.length === 0,
    errors: allErrors,
  };
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Gets games for a specific week
 */
export function getWeekGames(schedule: SeasonSchedule, week: number): ScheduledGame[] {
  return schedule.regularSeason.filter((game) => game.week === week);
}

/**
 * Gets a team's complete schedule
 */
export function getTeamSchedule(schedule: SeasonSchedule, teamId: string): ScheduledGame[] {
  return schedule.regularSeason
    .filter((game) => game.homeTeamId === teamId || game.awayTeamId === teamId)
    .sort((a, b) => a.week - b.week);
}

/**
 * Gets a team's remaining (incomplete) games
 */
export function getTeamRemainingSchedule(
  schedule: SeasonSchedule,
  teamId: string
): ScheduledGame[] {
  return getTeamSchedule(schedule, teamId).filter((game) => !game.isComplete);
}

/**
 * Gets a team's completed games
 */
export function getTeamCompletedGames(schedule: SeasonSchedule, teamId: string): ScheduledGame[] {
  return getTeamSchedule(schedule, teamId).filter((game) => game.isComplete);
}

/**
 * Updates a game result in the schedule
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
 * Gets the game between two specific teams
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
