/**
 * Playoff Generator
 * Manages NFL playoff bracket generation and advancement
 *
 * NFL Playoff Format (since 2020):
 * - 7 teams per conference (4 division winners + 3 wild cards)
 * - #1 seed gets bye in Wild Card round
 * - Bracket reseeds after each round
 * - Higher seed always hosts
 */

import { GameState } from '../models/game/GameState';
import { GameResult, runGame } from '../game/GameRunner';
import { GameConfig } from '../game/GameSetup';
import {
  DetailedDivisionStandings,
  getPlayoffSeeds,
} from './StandingsCalculator';

/**
 * Playoff round types
 */
export type PlayoffRound = 'wildCard' | 'divisional' | 'conference' | 'superBowl';

/**
 * A playoff matchup
 */
export interface PlayoffMatchup {
  gameId: string;
  round: PlayoffRound;
  conference: 'afc' | 'nfc' | 'neutral'; // neutral for Super Bowl
  homeTeamId: string;
  awayTeamId: string;
  homeSeed: number;
  awaySeed: number;

  // Results
  isComplete: boolean;
  homeScore: number | null;
  awayScore: number | null;
  winnerId: string | null;
}

/**
 * Complete playoff bracket
 */
export interface PlayoffSchedule {
  // Seeds for each conference
  afcSeeds: Map<number, string>; // seed -> teamId
  nfcSeeds: Map<number, string>;

  // Matchups by round
  wildCardRound: PlayoffMatchup[];
  divisionalRound: PlayoffMatchup[];
  conferenceChampionships: PlayoffMatchup[];
  superBowl: PlayoffMatchup | null;

  // Championship results
  afcChampion: string | null;
  nfcChampion: string | null;
  superBowlChampion: string | null;
}

/**
 * Creates an empty playoff schedule
 */
export function createEmptyPlayoffSchedule(): PlayoffSchedule {
  return {
    afcSeeds: new Map(),
    nfcSeeds: new Map(),
    wildCardRound: [],
    divisionalRound: [],
    conferenceChampionships: [],
    superBowl: null,
    afcChampion: null,
    nfcChampion: null,
    superBowlChampion: null,
  };
}

/**
 * Generates the playoff bracket from final standings
 *
 * @param standings - Final regular season standings
 * @returns Complete playoff schedule
 */
export function generatePlayoffBracket(
  standings: DetailedDivisionStandings
): PlayoffSchedule {
  const schedule = createEmptyPlayoffSchedule();

  // Get seeds for each conference
  for (const conference of ['afc', 'nfc'] as const) {
    const seeds = getPlayoffSeeds(standings, conference);
    const seedMap = conference === 'afc' ? schedule.afcSeeds : schedule.nfcSeeds;

    seeds.forEach((teamId, index) => {
      seedMap.set(index + 1, teamId);
    });
  }

  // Generate Wild Card matchups
  // #1 has bye, #2 vs #7, #3 vs #6, #4 vs #5
  schedule.wildCardRound = generateWildCardMatchups(schedule);

  return schedule;
}

/**
 * Generates Wild Card round matchups
 */
function generateWildCardMatchups(schedule: PlayoffSchedule): PlayoffMatchup[] {
  const matchups: PlayoffMatchup[] = [];
  let gameIndex = 0;

  for (const conference of ['afc', 'nfc'] as const) {
    const seeds = conference === 'afc' ? schedule.afcSeeds : schedule.nfcSeeds;

    // Wild Card games: #2 vs #7, #3 vs #6, #4 vs #5
    const wcMatchups = [
      { home: 2, away: 7 },
      { home: 3, away: 6 },
      { home: 4, away: 5 },
    ];

    for (const { home, away } of wcMatchups) {
      const homeTeamId = seeds.get(home);
      const awayTeamId = seeds.get(away);

      if (homeTeamId && awayTeamId) {
        matchups.push({
          gameId: `playoff-wc-${conference}-${gameIndex++}`,
          round: 'wildCard',
          conference,
          homeTeamId,
          awayTeamId,
          homeSeed: home,
          awaySeed: away,
          isComplete: false,
          homeScore: null,
          awayScore: null,
          winnerId: null,
        });
      }
    }
  }

  return matchups;
}

/**
 * Generates Divisional round matchups after Wild Card
 */
function generateDivisionalMatchups(
  schedule: PlayoffSchedule,
  _wildCardWinners: Map<string, number> // teamId -> seed they beat
): PlayoffMatchup[] {
  const matchups: PlayoffMatchup[] = [];
  let gameIndex = 0;

  for (const conference of ['afc', 'nfc'] as const) {
    const seeds = conference === 'afc' ? schedule.afcSeeds : schedule.nfcSeeds;

    // Get #1 seed (had bye)
    const topSeed = seeds.get(1);
    if (!topSeed) continue;

    // Get Wild Card winners for this conference
    const wcWinners: { teamId: string; originalSeed: number }[] = [];
    for (const matchup of schedule.wildCardRound) {
      if (matchup.conference === conference && matchup.winnerId) {
        const originalSeed =
          matchup.winnerId === matchup.homeTeamId
            ? matchup.homeSeed
            : matchup.awaySeed;
        wcWinners.push({ teamId: matchup.winnerId, originalSeed });
      }
    }

    // Sort by original seed (lower seed is better)
    wcWinners.sort((a, b) => a.originalSeed - b.originalSeed);

    if (wcWinners.length >= 3) {
      // #1 plays lowest remaining seed
      // Best remaining seed plays second-best remaining seed
      const lowestSeed = wcWinners[wcWinners.length - 1];
      const bestRemaining = wcWinners[0];
      const secondBest = wcWinners[1];

      // Game 1: #1 vs lowest remaining
      matchups.push({
        gameId: `playoff-div-${conference}-${gameIndex++}`,
        round: 'divisional',
        conference,
        homeTeamId: topSeed,
        awayTeamId: lowestSeed.teamId,
        homeSeed: 1,
        awaySeed: lowestSeed.originalSeed,
        isComplete: false,
        homeScore: null,
        awayScore: null,
        winnerId: null,
      });

      // Game 2: Best remaining vs second-best
      matchups.push({
        gameId: `playoff-div-${conference}-${gameIndex++}`,
        round: 'divisional',
        conference,
        homeTeamId: bestRemaining.teamId,
        awayTeamId: secondBest.teamId,
        homeSeed: bestRemaining.originalSeed,
        awaySeed: secondBest.originalSeed,
        isComplete: false,
        homeScore: null,
        awayScore: null,
        winnerId: null,
      });
    }
  }

  return matchups;
}

/**
 * Generates Conference Championship matchups
 */
function generateConferenceChampionships(
  schedule: PlayoffSchedule
): PlayoffMatchup[] {
  const matchups: PlayoffMatchup[] = [];

  for (const conference of ['afc', 'nfc'] as const) {
    // Get divisional winners for this conference
    const divWinners: { teamId: string; originalSeed: number }[] = [];
    for (const matchup of schedule.divisionalRound) {
      if (matchup.conference === conference && matchup.winnerId) {
        const originalSeed =
          matchup.winnerId === matchup.homeTeamId
            ? matchup.homeSeed
            : matchup.awaySeed;
        divWinners.push({ teamId: matchup.winnerId, originalSeed });
      }
    }

    if (divWinners.length === 2) {
      // Higher seed hosts
      divWinners.sort((a, b) => a.originalSeed - b.originalSeed);

      matchups.push({
        gameId: `playoff-conf-${conference}`,
        round: 'conference',
        conference,
        homeTeamId: divWinners[0].teamId,
        awayTeamId: divWinners[1].teamId,
        homeSeed: divWinners[0].originalSeed,
        awaySeed: divWinners[1].originalSeed,
        isComplete: false,
        homeScore: null,
        awayScore: null,
        winnerId: null,
      });
    }
  }

  return matchups;
}

/**
 * Generates the Super Bowl matchup
 */
function generateSuperBowl(schedule: PlayoffSchedule): PlayoffMatchup | null {
  let afcChamp: { teamId: string; seed: number } | null = null;
  let nfcChamp: { teamId: string; seed: number } | null = null;

  for (const matchup of schedule.conferenceChampionships) {
    if (matchup.winnerId) {
      const seed =
        matchup.winnerId === matchup.homeTeamId
          ? matchup.homeSeed
          : matchup.awaySeed;

      if (matchup.conference === 'afc') {
        afcChamp = { teamId: matchup.winnerId, seed };
      } else {
        nfcChamp = { teamId: matchup.winnerId, seed };
      }
    }
  }

  if (!afcChamp || !nfcChamp) return null;

  // Super Bowl is at neutral site, but NFC "hosts" in odd years, AFC in even
  // For simplicity, we'll alternate based on some deterministic factor
  const nfcHosts = Date.now() % 2 === 0;

  return {
    gameId: 'playoff-super-bowl',
    round: 'superBowl',
    conference: 'neutral',
    homeTeamId: nfcHosts ? nfcChamp.teamId : afcChamp.teamId,
    awayTeamId: nfcHosts ? afcChamp.teamId : nfcChamp.teamId,
    homeSeed: nfcHosts ? nfcChamp.seed : afcChamp.seed,
    awaySeed: nfcHosts ? afcChamp.seed : nfcChamp.seed,
    isComplete: false,
    homeScore: null,
    awayScore: null,
    winnerId: null,
  };
}

/**
 * Advances the playoff bracket after a round is complete
 *
 * @param schedule - Current playoff schedule
 * @param roundResults - Results of the completed round
 * @returns Updated playoff schedule
 */
export function advancePlayoffRound(
  schedule: PlayoffSchedule,
  roundResults: PlayoffMatchup[]
): PlayoffSchedule {
  const updatedSchedule = { ...schedule };

  // Update the completed round
  const round = roundResults[0]?.round;
  if (!round) return schedule;

  switch (round) {
    case 'wildCard':
      updatedSchedule.wildCardRound = roundResults;
      updatedSchedule.divisionalRound = generateDivisionalMatchups(
        updatedSchedule,
        new Map()
      );
      break;

    case 'divisional':
      updatedSchedule.divisionalRound = roundResults;
      updatedSchedule.conferenceChampionships =
        generateConferenceChampionships(updatedSchedule);
      break;

    case 'conference':
      updatedSchedule.conferenceChampionships = roundResults;
      // Set conference champions
      for (const matchup of roundResults) {
        if (matchup.winnerId) {
          if (matchup.conference === 'afc') {
            updatedSchedule.afcChampion = matchup.winnerId;
          } else {
            updatedSchedule.nfcChampion = matchup.winnerId;
          }
        }
      }
      updatedSchedule.superBowl = generateSuperBowl(updatedSchedule);
      break;

    case 'superBowl':
      if (roundResults[0]) {
        updatedSchedule.superBowl = roundResults[0];
        updatedSchedule.superBowlChampion = roundResults[0].winnerId;
      }
      break;
  }

  return updatedSchedule;
}

/**
 * Simulates a playoff game with enhanced stakes
 *
 * @param matchup - The playoff matchup
 * @param gameState - The game state
 * @returns Game result
 */
export function simulatePlayoffGame(
  matchup: PlayoffMatchup,
  gameState: GameState
): GameResult {
  const teams = new Map(Object.entries(gameState.teams));
  const players = new Map(Object.entries(gameState.players));
  const coaches = new Map(Object.entries(gameState.coaches));

  const config: GameConfig = {
    homeTeamId: matchup.homeTeamId,
    awayTeamId: matchup.awayTeamId,
    week: getPlayoffWeek(matchup.round),
    isPlayoff: true,
    playoffRound: matchup.round,
  };

  return runGame(config, teams, players, coaches);
}

/**
 * Gets the week number for a playoff round
 */
function getPlayoffWeek(round: PlayoffRound): number {
  switch (round) {
    case 'wildCard':
      return 19;
    case 'divisional':
      return 20;
    case 'conference':
      return 21;
    case 'superBowl':
      return 22;
  }
}

/**
 * Simulates an entire playoff round
 */
export function simulatePlayoffRound(
  schedule: PlayoffSchedule,
  round: PlayoffRound,
  gameState: GameState
): PlayoffMatchup[] {
  let matchups: PlayoffMatchup[];

  switch (round) {
    case 'wildCard':
      matchups = schedule.wildCardRound;
      break;
    case 'divisional':
      matchups = schedule.divisionalRound;
      break;
    case 'conference':
      matchups = schedule.conferenceChampionships;
      break;
    case 'superBowl':
      matchups = schedule.superBowl ? [schedule.superBowl] : [];
      break;
  }

  const results: PlayoffMatchup[] = [];

  for (const matchup of matchups) {
    if (matchup.isComplete) {
      results.push(matchup);
      continue;
    }

    const result = simulatePlayoffGame(matchup, gameState);

    results.push({
      ...matchup,
      isComplete: true,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      winnerId: result.winnerId,
    });
  }

  return results;
}

/**
 * Gets the current playoff round
 */
export function getCurrentPlayoffRound(
  schedule: PlayoffSchedule
): PlayoffRound | null {
  if (schedule.superBowl?.isComplete) {
    return null; // Playoffs complete
  }
  if (schedule.superBowl && !schedule.superBowl.isComplete) {
    return 'superBowl';
  }
  if (
    schedule.conferenceChampionships.length > 0 &&
    !schedule.conferenceChampionships.every((m) => m.isComplete)
  ) {
    return 'conference';
  }
  if (
    schedule.divisionalRound.length > 0 &&
    !schedule.divisionalRound.every((m) => m.isComplete)
  ) {
    return 'divisional';
  }
  if (
    schedule.wildCardRound.length > 0 &&
    !schedule.wildCardRound.every((m) => m.isComplete)
  ) {
    return 'wildCard';
  }
  return null;
}

/**
 * Checks if playoffs are complete
 */
export function arePlayoffsComplete(schedule: PlayoffSchedule): boolean {
  return schedule.superBowl?.isComplete === true;
}

/**
 * Gets all teams still alive in playoffs
 */
export function getTeamsAlive(schedule: PlayoffSchedule): string[] {
  const alive = new Set<string>();

  // Start with all seeded teams
  for (const teamId of schedule.afcSeeds.values()) {
    alive.add(teamId);
  }
  for (const teamId of schedule.nfcSeeds.values()) {
    alive.add(teamId);
  }

  // Remove losers from each completed round
  const allMatchups = [
    ...schedule.wildCardRound,
    ...schedule.divisionalRound,
    ...schedule.conferenceChampionships,
    ...(schedule.superBowl ? [schedule.superBowl] : []),
  ];

  for (const matchup of allMatchups) {
    if (matchup.isComplete && matchup.winnerId) {
      const loserId =
        matchup.winnerId === matchup.homeTeamId
          ? matchup.awayTeamId
          : matchup.homeTeamId;
      alive.delete(loserId);
    }
  }

  return Array.from(alive);
}

/**
 * Gets the round a team was eliminated in
 */
export function getTeamEliminationRound(
  schedule: PlayoffSchedule,
  teamId: string
): PlayoffRound | null {
  const rounds: { matchups: PlayoffMatchup[]; round: PlayoffRound }[] = [
    { matchups: schedule.wildCardRound, round: 'wildCard' },
    { matchups: schedule.divisionalRound, round: 'divisional' },
    { matchups: schedule.conferenceChampionships, round: 'conference' },
    { matchups: schedule.superBowl ? [schedule.superBowl] : [], round: 'superBowl' },
  ];

  for (const { matchups, round } of rounds) {
    for (const matchup of matchups) {
      if (!matchup.isComplete) continue;

      const isInGame =
        matchup.homeTeamId === teamId || matchup.awayTeamId === teamId;
      const lost = isInGame && matchup.winnerId !== teamId;

      if (lost) {
        return round;
      }
    }
  }

  return null;
}

/**
 * Gets a team's playoff seed
 */
export function getTeamPlayoffSeed(
  schedule: PlayoffSchedule,
  teamId: string
): number | null {
  for (const [seed, id] of schedule.afcSeeds) {
    if (id === teamId) return seed;
  }
  for (const [seed, id] of schedule.nfcSeeds) {
    if (id === teamId) return seed;
  }
  return null;
}
