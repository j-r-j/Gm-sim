/**
 * Week Simulator
 * Simulates all games in a week and generates results
 */

import { Team } from '../models/team/Team';
import { Player } from '../models/player/Player';
import { Coach } from '../models/staff/Coach';
import { GameState } from '../models/game/GameState';
import { GameResult, runGame, GameInjury } from '../game/GameRunner';
import { GameConfig } from '../game/GameSetup';
import {
  ScheduledGame,
  SeasonSchedule,
  getWeekGames,
  updateGameResult,
} from './ScheduleGenerator';
import {
  DetailedDivisionStandings,
  calculateStandings,
  getTeamStanding,
  determinePlayoffTeams,
} from './StandingsCalculator';
import { isOnBye } from './ByeWeekManager';

/**
 * Result of simulating a single game
 */
export interface SimulatedGameResult {
  game: ScheduledGame;
  result: GameResult;
}

/**
 * Playoff implication type
 */
export type PlayoffImplicationType =
  | 'clinched_division'
  | 'clinched_playoff'
  | 'eliminated'
  | 'controls_destiny';

/**
 * Playoff implication for a team
 */
export interface PlayoffImplication {
  teamId: string;
  implication: PlayoffImplicationType;
  description: string;
}

/**
 * Injury report entry
 */
export interface InjuryReportEntry {
  playerId: string;
  playerName: string;
  teamId: string;
  injury: string;
  status: 'out' | 'doubtful' | 'questionable' | 'probable';
  weeksRemaining: number;
}

/**
 * News headline
 */
export interface NewsHeadline {
  headline: string;
  importance: 'major' | 'notable' | 'minor';
  teamIds: string[];
}

/**
 * Results of simulating a complete week
 */
export interface WeekResults {
  week: number;
  games: SimulatedGameResult[];
  standings: DetailedDivisionStandings;
  playoffImplications: PlayoffImplication[];
  injuryReport: InjuryReportEntry[];
  newsHeadlines: NewsHeadline[];
}

/**
 * Week advancement result
 */
export interface WeekAdvancementResult {
  newWeek: number;
  recoveredPlayers: string[];
  fatigueReset: boolean;
}

/**
 * Simulates a single game
 */
function simulateSingleGame(
  game: ScheduledGame,
  teams: Map<string, Team>,
  players: Map<string, Player>,
  coaches: Map<string, Coach>
): GameResult {
  const homeTeam = teams.get(game.homeTeamId);
  const awayTeam = teams.get(game.awayTeamId);

  if (!homeTeam || !awayTeam) {
    throw new Error(`Team not found: ${game.homeTeamId} or ${game.awayTeamId}`);
  }

  const config: GameConfig = {
    homeTeamId: game.homeTeamId,
    awayTeamId: game.awayTeamId,
    week: game.week,
    isPlayoff: false,
  };

  return runGame(config, teams, players, coaches);
}

/**
 * Generates playoff implications based on current standings
 */
function generatePlayoffImplications(
  standings: DetailedDivisionStandings,
  week: number
): PlayoffImplication[] {
  const implications: PlayoffImplication[] = [];
  const playoffTeams = determinePlayoffTeams(standings);

  // Only start generating implications after week 10
  if (week < 10) return implications;

  // Check each team's status
  for (const conference of ['afc', 'nfc'] as const) {
    const confStandings = standings[conference];

    for (const division of ['north', 'south', 'east', 'west'] as const) {
      for (const standing of confStandings[division]) {
        // Division leaders after week 14+ might clinch
        if (week >= 14 && standing.divisionRank === 1) {
          const secondPlace = confStandings[division][1];
          if (secondPlace) {
            const gamesRemaining = 17 - (standing.wins + standing.losses + standing.ties);
            const gapGames = standing.wins - secondPlace.wins;

            // If gap > games remaining for second place, division clinched
            if (gapGames > 17 - (secondPlace.wins + secondPlace.losses + secondPlace.ties)) {
              implications.push({
                teamId: standing.teamId,
                implication: 'clinched_division',
                description: `Clinched ${conference.toUpperCase()} ${division} division title`,
              });
            }
          }
        }

        // Check for playoff clinch (top 7 with insurmountable lead)
        if (week >= 15 && standing.conferenceRank <= 7) {
          const eighthPlace = getTeamAtConferenceRank(standings, conference, 8);
          if (eighthPlace) {
            const gamesRemaining = 17 - (standing.wins + standing.losses + standing.ties);
            if (
              standing.wins > eighthPlace.wins + gamesRemaining &&
              standing.divisionRank !== 1
            ) {
              implications.push({
                teamId: standing.teamId,
                implication: 'clinched_playoff',
                description: `Clinched ${conference.toUpperCase()} wild card berth`,
              });
            }
          }
        }

        // Check for elimination (mathematically cannot make playoffs)
        if (week >= 12) {
          const seventhPlace = getTeamAtConferenceRank(standings, conference, 7);
          if (seventhPlace && standing.conferenceRank > 7) {
            const gamesRemaining = 17 - (standing.wins + standing.losses + standing.ties);
            const maxPossibleWins = standing.wins + gamesRemaining;

            if (maxPossibleWins < seventhPlace.wins) {
              implications.push({
                teamId: standing.teamId,
                implication: 'eliminated',
                description: `Eliminated from playoff contention`,
              });
            }
          }
        }
      }
    }
  }

  return implications;
}

/**
 * Gets team at a specific conference rank
 */
function getTeamAtConferenceRank(
  standings: DetailedDivisionStandings,
  conference: 'afc' | 'nfc',
  rank: number
): import('./StandingsCalculator').TeamStanding | undefined {
  for (const division of ['north', 'south', 'east', 'west'] as const) {
    for (const standing of standings[conference][division]) {
      if (standing.conferenceRank === rank) {
        return standing;
      }
    }
  }
  return undefined;
}

/**
 * Generates injury report from game injuries
 */
function generateInjuryReport(
  gameResults: SimulatedGameResult[]
): InjuryReportEntry[] {
  const injuries: InjuryReportEntry[] = [];

  for (const { result } of gameResults) {
    for (const injury of result.injuries) {
      let status: InjuryReportEntry['status'] = 'out';
      if (injury.weeksOut === 0) status = 'probable';
      else if (injury.weeksOut === 1) status = 'questionable';
      else if (injury.weeksOut <= 2) status = 'doubtful';

      injuries.push({
        playerId: injury.playerId,
        playerName: injury.playerName,
        teamId: injury.team,
        injury: injury.injuryType,
        status,
        weeksRemaining: injury.weeksOut,
      });
    }
  }

  return injuries;
}

/**
 * Generates news headlines from game results
 */
function generateNewsHeadlines(
  gameResults: SimulatedGameResult[],
  teams: Map<string, Team>
): NewsHeadline[] {
  const headlines: NewsHeadline[] = [];

  for (const { game, result } of gameResults) {
    const homeTeam = teams.get(game.homeTeamId);
    const awayTeam = teams.get(game.awayTeamId);

    if (!homeTeam || !awayTeam) continue;

    // High-scoring games
    const totalScore = result.homeScore + result.awayScore;
    if (totalScore >= 70) {
      headlines.push({
        headline: `Shootout! ${homeTeam.nickname} and ${awayTeam.nickname} combine for ${totalScore} points`,
        importance: 'major',
        teamIds: [game.homeTeamId, game.awayTeamId],
      });
    }

    // Shutouts
    if (result.homeScore === 0 || result.awayScore === 0) {
      const winner = result.homeScore > 0 ? homeTeam : awayTeam;
      const loser = result.homeScore === 0 ? homeTeam : awayTeam;
      headlines.push({
        headline: `${winner.nickname} defense dominates, shuts out ${loser.nickname}`,
        importance: 'major',
        teamIds: [game.homeTeamId, game.awayTeamId],
      });
    }

    // Close games
    const scoreDiff = Math.abs(result.homeScore - result.awayScore);
    if (scoreDiff <= 3 && !result.isTie) {
      const winner = result.homeScore > result.awayScore ? homeTeam : awayTeam;
      headlines.push({
        headline: `${winner.nickname} win thriller by ${scoreDiff}`,
        importance: 'notable',
        teamIds: [game.homeTeamId, game.awayTeamId],
      });
    }

    // Upsets (based on score differential)
    if (scoreDiff >= 21) {
      const winner = result.homeScore > result.awayScore ? homeTeam : awayTeam;
      const loser = result.homeScore > result.awayScore ? awayTeam : homeTeam;
      headlines.push({
        headline: `${winner.nickname} blow out ${loser.nickname} ${result.homeScore > result.awayScore ? result.homeScore : result.awayScore}-${result.homeScore > result.awayScore ? result.awayScore : result.homeScore}`,
        importance: 'notable',
        teamIds: [game.homeTeamId, game.awayTeamId],
      });
    }
  }

  // Sort by importance
  headlines.sort((a, b) => {
    const order = { major: 0, notable: 1, minor: 2 };
    return order[a.importance] - order[b.importance];
  });

  return headlines.slice(0, 5); // Top 5 headlines
}

/**
 * Simulates all games in a week
 *
 * @param week - The week number
 * @param schedule - The season schedule
 * @param gameState - Full game state
 * @param userTeamId - The user's team ID
 * @param simulateUserGame - Whether to simulate the user's game
 * @returns Week results including standings and implications
 */
export function simulateWeek(
  week: number,
  schedule: SeasonSchedule,
  gameState: GameState,
  userTeamId: string,
  simulateUserGame: boolean
): WeekResults {
  const weekGames = getWeekGames(schedule, week);
  const gameResults: SimulatedGameResult[] = [];

  // Convert game state entities to Maps
  const teams = new Map(Object.entries(gameState.teams));
  const players = new Map(Object.entries(gameState.players));
  const coaches = new Map(Object.entries(gameState.coaches));

  // Simulate each game
  for (const game of weekGames) {
    // Skip if already complete
    if (game.isComplete) continue;

    // Check if this is the user's game
    const isUserGame =
      game.homeTeamId === userTeamId || game.awayTeamId === userTeamId;

    // Skip user's game if not simulating
    if (isUserGame && !simulateUserGame) {
      continue;
    }

    try {
      const result = simulateSingleGame(game, teams, players, coaches);

      // Update the game in schedule
      const updatedGame: ScheduledGame = {
        ...game,
        isComplete: true,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        winnerId: result.winnerId,
      };

      gameResults.push({
        game: updatedGame,
        result,
      });
    } catch (error) {
      console.error(`Error simulating game ${game.gameId}:`, error);
    }
  }

  // Calculate standings based on all completed games
  const allCompletedGames = [
    ...schedule.regularSeason.filter((g) => g.isComplete),
    ...gameResults.map((r) => r.game),
  ];

  const teamsArray = Object.values(gameState.teams);
  const standings = calculateStandings(allCompletedGames, teamsArray);

  // Generate playoff implications
  const playoffImplications = generatePlayoffImplications(standings, week);

  // Generate injury report
  const injuryReport = generateInjuryReport(gameResults);

  // Generate news headlines
  const newsHeadlines = generateNewsHeadlines(gameResults, teams);

  return {
    week,
    games: gameResults,
    standings,
    playoffImplications,
    injuryReport,
    newsHeadlines,
  };
}

/**
 * Simulates just the user's game
 */
export function simulateUserTeamGame(
  schedule: SeasonSchedule,
  week: number,
  userTeamId: string,
  gameState: GameState
): SimulatedGameResult | null {
  const weekGames = getWeekGames(schedule, week);
  const userGame = weekGames.find(
    (g) => g.homeTeamId === userTeamId || g.awayTeamId === userTeamId
  );

  if (!userGame || userGame.isComplete) {
    return null;
  }

  // Check if user is on bye
  if (isOnBye(userTeamId, week, schedule.byeWeeks)) {
    return null;
  }

  const teams = new Map(Object.entries(gameState.teams));
  const players = new Map(Object.entries(gameState.players));
  const coaches = new Map(Object.entries(gameState.coaches));

  const result = simulateSingleGame(userGame, teams, players, coaches);

  return {
    game: {
      ...userGame,
      isComplete: true,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      winnerId: result.winnerId,
    },
    result,
  };
}

/**
 * Advances to the next week, handling player recovery
 *
 * @param currentWeek - The current week
 * @param gameState - The game state
 * @returns Advancement result
 */
export function advanceWeek(
  currentWeek: number,
  gameState: GameState
): WeekAdvancementResult {
  const recoveredPlayers: string[] = [];

  // Process injury recovery
  for (const player of Object.values(gameState.players)) {
    if (player.injuryStatus.weeksRemaining > 0) {
      const newWeeksRemaining = player.injuryStatus.weeksRemaining - 1;
      if (newWeeksRemaining === 0) {
        recoveredPlayers.push(player.id);
      }
    }
  }

  // Reset fatigue at the start of each week
  const fatigueReset = true;

  return {
    newWeek: currentWeek + 1,
    recoveredPlayers,
    fatigueReset,
  };
}

/**
 * Gets the user's game for a specific week
 */
export function getUserTeamGame(
  schedule: SeasonSchedule,
  week: number,
  userTeamId: string
): ScheduledGame | null {
  // Check if user is on bye
  if (isOnBye(userTeamId, week, schedule.byeWeeks)) {
    return null;
  }

  const weekGames = getWeekGames(schedule, week);
  return (
    weekGames.find(
      (g) => g.homeTeamId === userTeamId || g.awayTeamId === userTeamId
    ) || null
  );
}

/**
 * Checks if the user's team is on bye this week
 */
export function isUserOnBye(
  schedule: SeasonSchedule,
  week: number,
  userTeamId: string
): boolean {
  return isOnBye(userTeamId, week, schedule.byeWeeks);
}

/**
 * Gets a summary of the week's games
 */
export function getWeekSummary(
  weekResults: WeekResults
): { totalGames: number; upsets: number; highScoring: number } {
  let upsets = 0;
  let highScoring = 0;

  for (const { result } of weekResults.games) {
    const totalScore = result.homeScore + result.awayScore;
    if (totalScore >= 60) highScoring++;

    const scoreDiff = Math.abs(result.homeScore - result.awayScore);
    if (scoreDiff >= 17) upsets++;
  }

  return {
    totalGames: weekResults.games.length,
    upsets,
    highScoring,
  };
}
