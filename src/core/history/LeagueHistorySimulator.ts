/**
 * League History Simulator
 * Pre-simulates N years of league history before the user takes over as GM.
 *
 * This creates a rich, lived-in world where every player has a history:
 * - Players were drafted, signed in free agency, traded, or cut
 * - Teams have accumulated all-time records and championship counts
 * - Current rosters are the result of years of team-building
 * - Contracts reflect where players are in their career arcs
 *
 * Uses quick game simulation (not full play-by-play) for performance.
 * 20 years of history should complete in a few seconds.
 */

import { GameState } from '../models/game/GameState';
import { SeasonSummary } from '../models/league/League';
import { Team, createEmptyTeamRecord } from '../models/team/Team';
import { Player } from '../models/player/Player';
import { Coach } from '../models/staff/Coach';
import { Prospect } from '../draft/Prospect';
import {
  generateSeasonSchedule,
  PreviousYearStandings,
  ScheduledGame,
  SeasonSchedule,
} from '../season/ScheduleGenerator';
import { calculateStandings, determinePlayoffTeams } from '../season/StandingsCalculator';
import {
  generatePlayoffBracket,
  PlayoffSchedule,
  PlayoffMatchup,
} from '../season/PlayoffGenerator';
import { calculateDraftOrder } from '../season/DraftOrderCalculator';
import { generateDraftClass } from '../draft/DraftClassGenerator';
import {
  simulateWeekQuick,
  updateTeamRecords,
  simulatePlayoffGameQuick,
} from './QuickGameSimulator';
import {
  processRetirements,
  processContractExpirations,
  processPlayerProgression,
  processCoachingChanges,
  processAIDraft,
  processAIFreeAgency,
  processRosterMaintenance,
  updateTeamFinances,
  updateTeamHistories,
  createDraftPicksForYear,
} from './HistoryOffseasonProcessor';
import {
  PlayerCareerHistory,
  createPlayerCareerHistory,
  addSeasonLog,
  addTransaction,
  addInjuryRecord,
  addAward,
  markRetired,
  PlayerSeasonLog,
} from './PlayerHistoryTracker';
import { generateSeasonStats, generateSeasonInjuries } from './HistoryStatsGenerator';
import { getPlayerFullName } from '../models/player/Player';

/**
 * Configuration for history simulation
 */
export interface HistorySimulationConfig {
  /** Number of years to simulate (default: 20) */
  years: number;
  /** Callback for progress updates */
  onProgress?: (year: number, totalYears: number, phase: string) => void;
}

/**
 * Summary of a simulated historical season
 */
export interface HistoricalSeasonSummary {
  year: number;
  championTeamId: string | null;
  championRecord: string;
  runnerUpTeamId: string | null;
  playoffTeamIds: string[];
  draftOrder: string[];
}

/**
 * Result of the full history simulation
 */
export interface HistorySimulationResult {
  gameState: GameState;
  seasonSummaries: HistoricalSeasonSummary[];
  totalRetirements: number;
  totalDraftPicks: number;
  totalFreeAgencySignings: number;
  totalCoachingChanges: number;
}

/**
 * Build PreviousYearStandings from team records
 */
function buildStandingsFromTeams(teams: Record<string, Team>): PreviousYearStandings {
  const standings: PreviousYearStandings = {
    AFC: { North: [], South: [], East: [], West: [] },
    NFC: { North: [], South: [], East: [], West: [] },
  };

  // Group teams by conference and division
  const divTeams: Record<string, Record<string, Team[]>> = {
    AFC: { North: [], South: [], East: [], West: [] },
    NFC: { North: [], South: [], East: [], West: [] },
  };

  for (const team of Object.values(teams)) {
    divTeams[team.conference]?.[team.division]?.push(team);
  }

  // Sort by win percentage within each division
  for (const conf of ['AFC', 'NFC']) {
    for (const div of ['North', 'South', 'East', 'West']) {
      const teamsInDiv = divTeams[conf][div] || [];
      teamsInDiv.sort((a, b) => {
        const aGames = a.currentRecord.wins + a.currentRecord.losses + a.currentRecord.ties;
        const bGames = b.currentRecord.wins + b.currentRecord.losses + b.currentRecord.ties;
        const aWinPct = aGames > 0 ? a.currentRecord.wins / aGames : 0;
        const bWinPct = bGames > 0 ? b.currentRecord.wins / bGames : 0;
        return bWinPct - aWinPct;
      });
      standings[conf][div] = teamsInDiv.map((t) => t.id);
    }
  }

  return standings;
}

/**
 * Simulate a complete regular season using quick game simulation
 */
function simulateRegularSeason(
  schedule: SeasonSchedule,
  teams: Record<string, Team>,
  players: Record<string, Player>,
  coaches: Record<string, Coach>
): { updatedTeams: Record<string, Team>; completedGames: ScheduledGame[] } {
  let currentTeams = { ...teams };
  const allCompletedGames: ScheduledGame[] = [];

  // Simulate each week (18 regular season weeks)
  for (let week = 1; week <= 18; week++) {
    const weekGames = schedule.regularSeason.filter((g) => g.week === week);
    const completedGames = simulateWeekQuick(weekGames, currentTeams, players, coaches);
    currentTeams = updateTeamRecords(currentTeams, completedGames);
    allCompletedGames.push(...completedGames);
  }

  return { updatedTeams: currentTeams, completedGames: allCompletedGames };
}

/**
 * Simulate playoffs using quick game simulation
 */
function simulatePlayoffs(
  playoffBracket: PlayoffSchedule,
  teams: Record<string, Team>,
  players: Record<string, Player>,
  coaches: Record<string, Coach>
): {
  updatedBracket: PlayoffSchedule;
  championTeamId: string | null;
  runnerUpTeamId: string | null;
  playoffTeamIds: string[];
} {
  let bracket = { ...playoffBracket };
  const playoffTeamIds: string[] = [];

  // Collect all playoff team IDs
  for (const [, teamId] of bracket.afcSeeds) {
    playoffTeamIds.push(teamId);
  }
  for (const [, teamId] of bracket.nfcSeeds) {
    playoffTeamIds.push(teamId);
  }

  // Wild Card Round (6 games: #2v#7, #3v#6, #4v#5 in each conference)
  const wildCardResults = simulatePlayoffRound(bracket.wildCardRound, teams, players, coaches);
  bracket = { ...bracket, wildCardRound: wildCardResults };

  // Determine divisional matchups
  const afcWCWinners = getConferenceWinners(wildCardResults, 'afc');
  const nfcWCWinners = getConferenceWinners(wildCardResults, 'nfc');

  // #1 seed gets bye, plays lowest remaining seed
  const afcSeed1 = bracket.afcSeeds.get(1)!;
  const nfcSeed1 = bracket.nfcSeeds.get(1)!;

  // Build divisional matchups (reseed: highest seed hosts lowest)
  const afcDivMatchups = buildDivisionalMatchups(afcSeed1, afcWCWinners, bracket.afcSeeds, 'afc');
  const nfcDivMatchups = buildDivisionalMatchups(nfcSeed1, nfcWCWinners, bracket.nfcSeeds, 'nfc');

  const divisionalGames = [...afcDivMatchups, ...nfcDivMatchups];
  const divResults = simulatePlayoffRound(divisionalGames, teams, players, coaches);
  bracket = { ...bracket, divisionalRound: divResults };

  // Conference Championships
  const afcDivWinners = getConferenceWinners(divResults, 'afc');
  const nfcDivWinners = getConferenceWinners(divResults, 'nfc');

  const confChampGames: PlayoffMatchup[] = [];
  if (afcDivWinners.length >= 2) {
    confChampGames.push(
      createPlayoffMatchup(
        afcDivWinners[0],
        afcDivWinners[1],
        'conference',
        'afc',
        bracket.afcSeeds
      )
    );
  }
  if (nfcDivWinners.length >= 2) {
    confChampGames.push(
      createPlayoffMatchup(
        nfcDivWinners[0],
        nfcDivWinners[1],
        'conference',
        'nfc',
        bracket.nfcSeeds
      )
    );
  }

  const confResults = simulatePlayoffRound(confChampGames, teams, players, coaches);
  bracket = { ...bracket, conferenceChampionships: confResults };

  const afcChampion = confResults.find((g) => g.conference === 'afc')?.winnerId || null;
  const nfcChampion = confResults.find((g) => g.conference === 'nfc')?.winnerId || null;
  bracket = { ...bracket, afcChampion, nfcChampion };

  // Super Bowl
  let championTeamId: string | null = null;
  let runnerUpTeamId: string | null = null;

  if (afcChampion && nfcChampion) {
    const sbGame: PlayoffMatchup = {
      gameId: `playoff-sb`,
      round: 'superBowl',
      conference: 'neutral',
      homeTeamId: nfcChampion, // NFC is "home" in alternating years
      awayTeamId: afcChampion,
      homeSeed: 0,
      awaySeed: 0,
      isComplete: false,
      homeScore: null,
      awayScore: null,
      winnerId: null,
    };

    const homeTeam = teams[sbGame.homeTeamId];
    const awayTeam = teams[sbGame.awayTeamId];
    if (homeTeam && awayTeam) {
      const result = simulatePlayoffGameQuick(homeTeam, awayTeam, players, coaches);
      const completedSB: PlayoffMatchup = {
        ...sbGame,
        isComplete: true,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        winnerId: result.winnerId,
      };
      bracket = { ...bracket, superBowl: completedSB, superBowlChampion: result.winnerId };
      championTeamId = result.winnerId;
      runnerUpTeamId = result.loserId;
    }
  }

  return { updatedBracket: bracket, championTeamId, runnerUpTeamId, playoffTeamIds };
}

function simulatePlayoffRound(
  matchups: PlayoffMatchup[],
  teams: Record<string, Team>,
  players: Record<string, Player>,
  coaches: Record<string, Coach>
): PlayoffMatchup[] {
  return matchups.map((matchup) => {
    if (matchup.isComplete) return matchup;

    const homeTeam = teams[matchup.homeTeamId];
    const awayTeam = teams[matchup.awayTeamId];
    if (!homeTeam || !awayTeam) return matchup;

    const result = simulatePlayoffGameQuick(homeTeam, awayTeam, players, coaches);
    return {
      ...matchup,
      isComplete: true,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      winnerId: result.winnerId,
    };
  });
}

function getConferenceWinners(matchups: PlayoffMatchup[], conference: string): string[] {
  return matchups
    .filter((m) => m.conference === conference && m.isComplete && m.winnerId)
    .map((m) => m.winnerId!);
}

function buildDivisionalMatchups(
  seed1TeamId: string,
  wildCardWinners: string[],
  seeds: Map<number, string>,
  conference: string
): PlayoffMatchup[] {
  // Add seed 1 to the pool of remaining teams
  const allRemaining = [seed1TeamId, ...wildCardWinners];

  // Sort by seed (highest seed hosts)
  const seedOrder = new Map<string, number>();
  for (const [seed, teamId] of seeds) {
    seedOrder.set(teamId, seed);
  }
  allRemaining.sort((a, b) => (seedOrder.get(a) || 99) - (seedOrder.get(b) || 99));

  const matchups: PlayoffMatchup[] = [];
  if (allRemaining.length >= 4) {
    // Best vs worst, second vs third
    matchups.push(
      createPlayoffMatchup(allRemaining[0], allRemaining[3], 'divisional', conference, seeds)
    );
    matchups.push(
      createPlayoffMatchup(allRemaining[1], allRemaining[2], 'divisional', conference, seeds)
    );
  } else if (allRemaining.length >= 2) {
    matchups.push(
      createPlayoffMatchup(allRemaining[0], allRemaining[1], 'divisional', conference, seeds)
    );
  }

  return matchups;
}

function createPlayoffMatchup(
  higherSeedTeamId: string,
  lowerSeedTeamId: string,
  round: PlayoffMatchup['round'],
  conference: string,
  seeds: Map<number, string>
): PlayoffMatchup {
  const homeSeed = getTeamSeed(higherSeedTeamId, seeds);
  const awaySeed = getTeamSeed(lowerSeedTeamId, seeds);

  return {
    gameId: `playoff-${round}-${higherSeedTeamId}-${lowerSeedTeamId}`,
    round,
    conference: conference as 'afc' | 'nfc' | 'neutral',
    homeTeamId: higherSeedTeamId,
    awayTeamId: lowerSeedTeamId,
    homeSeed,
    awaySeed,
    isComplete: false,
    homeScore: null,
    awayScore: null,
    winnerId: null,
  };
}

function getTeamSeed(teamId: string, seeds: Map<number, string>): number {
  for (const [seed, id] of seeds) {
    if (id === teamId) return seed;
  }
  return 0;
}

// ============================================================================
// MAIN SIMULATOR
// ============================================================================

/**
 * Simulate N years of league history.
 * This is the main entry point that orchestrates the entire pre-simulation.
 *
 * For each year:
 * 1. Generate schedule
 * 2. Simulate 18-week regular season
 * 3. Calculate standings and playoff teams
 * 4. Simulate playoffs and determine champion
 * 5. Process offseason (retirement, contracts, progression, coaching, draft, FA)
 * 6. Update team histories
 */
export function simulateLeagueHistory(
  gameState: GameState,
  config: HistorySimulationConfig
): HistorySimulationResult {
  const { years } = config;
  let state = { ...gameState };
  const seasonSummaries: HistoricalSeasonSummary[] = [];

  let totalRetirements = 0;
  let totalDraftPicks = 0;
  let totalFreeAgencySignings = 0;
  let totalCoachingChanges = 0;

  // Initialize player history tracking
  let playerHistory: Record<string, PlayerCareerHistory> = state.playerHistory || {};

  // Initialize history for all existing players
  for (const player of Object.values(state.players)) {
    if (!playerHistory[player.id]) {
      const teamId = findPlayerTeam(player.id, state.teams);
      playerHistory[player.id] = createPlayerCareerHistory(
        player.id,
        getPlayerFullName(player),
        player.position,
        player.draftYear,
        player.draftRound,
        player.draftPick,
        teamId || '',
        player.collegeId
      );
      // Record initial transaction
      if (teamId) {
        playerHistory[player.id] = addTransaction(playerHistory[player.id], {
          year: player.draftYear,
          type: player.draftRound > 0 ? 'drafted' : 'udfa_signed',
          teamId,
          description:
            player.draftRound > 0
              ? `Drafted round ${player.draftRound}, pick ${player.draftPick}`
              : 'Signed as undrafted free agent',
        });
      }
    }
  }

  // Start simulation from (startYear - years)
  const startYear = state.league.calendar.currentYear;
  const historyStartYear = startYear - years;

  // Reset the year to the beginning of history
  let currentYear = historyStartYear;

  for (let yearIndex = 0; yearIndex < years; yearIndex++) {
    config.onProgress?.(yearIndex + 1, years, 'season');

    // Reset team records for new season
    const teamsWithResetRecords: Record<string, Team> = {};
    for (const [teamId, team] of Object.entries(state.teams)) {
      teamsWithResetRecords[teamId] = {
        ...team,
        currentRecord: createEmptyTeamRecord(),
        playoffSeed: null,
        isEliminated: false,
      };
    }
    state = { ...state, teams: teamsWithResetRecords };

    // 1. Build previous year standings and generate schedule
    const previousStandings = buildStandingsFromTeams(state.teams);
    const teamArray = Object.values(state.teams);
    const schedule = generateSeasonSchedule(teamArray, previousStandings, currentYear);

    // 2. Simulate regular season
    const { updatedTeams: teamsAfterSeason, completedGames } = simulateRegularSeason(
      schedule,
      state.teams,
      state.players,
      state.coaches
    );
    state = { ...state, teams: teamsAfterSeason };

    // 3. Calculate standings and determine playoff teams
    const standings = calculateStandings(completedGames, teamArray);
    // Determine playoff teams (used by generatePlayoffBracket via standings)
    determinePlayoffTeams(standings);

    // 4. Generate playoff bracket and simulate
    const playoffBracket = generatePlayoffBracket(standings);
    const { championTeamId, runnerUpTeamId, playoffTeamIds } = simulatePlayoffs(
      playoffBracket,
      state.teams,
      state.players,
      state.coaches
    );

    // 5. Calculate draft order
    // Calculate draft order - fallback to win-percentage ordering if needed
    const allTeamIds = Object.keys(state.teams);
    let draftOrder: string[];
    try {
      draftOrder = calculateDraftOrder(standings, playoffBracket);
    } catch {
      draftOrder = [];
    }

    // Ensure all 32 teams are in the draft order
    if (draftOrder.length < allTeamIds.length) {
      const inOrder = new Set(draftOrder);
      const missing = allTeamIds
        .filter((id) => !inOrder.has(id))
        .sort((a, b) => {
          const aTeam = state.teams[a];
          const bTeam = state.teams[b];
          const aGames = aTeam.currentRecord.wins + aTeam.currentRecord.losses;
          const bGames = bTeam.currentRecord.wins + bTeam.currentRecord.losses;
          const aWinPct = aGames > 0 ? aTeam.currentRecord.wins / aGames : 0.5;
          const bWinPct = bGames > 0 ? bTeam.currentRecord.wins / bGames : 0.5;
          return aWinPct - bWinPct; // Worst first
        });
      draftOrder = [...draftOrder, ...missing];
    }

    // Record season summary
    const champRecord = championTeamId
      ? `${state.teams[championTeamId]?.currentRecord.wins}-${state.teams[championTeamId]?.currentRecord.losses}`
      : '';

    seasonSummaries.push({
      year: currentYear,
      championTeamId,
      championRecord: champRecord,
      runnerUpTeamId,
      playoffTeamIds,
      draftOrder,
    });

    // ============================
    // PLAYER HISTORY: Generate season stats, injuries, and awards
    // ============================
    const seasonLogs = new Map<string, PlayerSeasonLog>();

    for (const team of Object.values(state.teams)) {
      for (const playerId of team.rosterPlayerIds) {
        const player = state.players[playerId];
        if (!player) continue;

        // Generate season stats
        const log = generateSeasonStats(player, team, currentYear, playoffTeamIds, championTeamId);
        seasonLogs.set(playerId, log);

        // Add season log to player history
        if (!playerHistory[playerId]) {
          playerHistory[playerId] = createPlayerCareerHistory(
            playerId,
            getPlayerFullName(player),
            player.position,
            player.draftYear,
            player.draftRound,
            player.draftPick,
            team.id,
            player.collegeId
          );
        }
        playerHistory[playerId] = addSeasonLog(playerHistory[playerId], log);

        // Generate injuries for players who missed games
        if (log.gamesPlayed < 17) {
          const { injuries } = generateSeasonInjuries(
            playerId,
            team.id,
            currentYear,
            log.gamesPlayed
          );
          for (const injury of injuries) {
            playerHistory[playerId] = addInjuryRecord(playerHistory[playerId], injury);
          }
        }
      }
    }

    // Generate season awards and assign to player histories
    assignAwardsToPlayers(state.players, state.teams, seasonLogs, currentYear, playerHistory);

    // Find MVP player ID for league history
    const mvpPlayerId = findMVPPlayer(state.players, state.teams, seasonLogs) || '';

    // 6. Update team all-time records and championship history
    state = {
      ...state,
      teams: updateTeamHistories(state.teams, championTeamId, currentYear),
    };

    // Add to league season history
    const seasonSummary: SeasonSummary = {
      year: currentYear,
      championTeamId: championTeamId || '',
      mvpPlayerId,
      draftOrder,
    };
    state = {
      ...state,
      league: {
        ...state.league,
        seasonHistory: [...(state.league.seasonHistory || []), seasonSummary],
      },
    };

    config.onProgress?.(yearIndex + 1, years, 'offseason');

    // ============================
    // OFFSEASON PROCESSING
    // ============================

    // 6a. Player progression (age + skill development)
    state = {
      ...state,
      players: processPlayerProgression(state.players, state.coaches, state.teams),
    };

    // 6b. Player retirements
    const retirementResult = processRetirements(state.players, state.contracts, state.teams);
    state = {
      ...state,
      players: retirementResult.updatedPlayers,
      contracts: retirementResult.updatedContracts,
      teams: retirementResult.updatedTeams,
    };
    totalRetirements += retirementResult.retiredPlayerIds.length;

    // Record retirement transactions in player history
    for (const retiredId of retirementResult.retiredPlayerIds) {
      if (playerHistory[retiredId]) {
        playerHistory[retiredId] = markRetired(playerHistory[retiredId], currentYear);
      }
    }

    // 6c. Contract expirations → free agents
    const contractResult = processContractExpirations(state.players, state.contracts, state.teams);
    state = {
      ...state,
      players: contractResult.updatedPlayers,
      contracts: contractResult.updatedContracts,
      teams: contractResult.updatedTeams,
    };

    // Record contract expiration transactions
    for (const faId of contractResult.newFreeAgentIds) {
      if (playerHistory[faId]) {
        const lastTeam =
          playerHistory[faId].seasonLogs.length > 0
            ? playerHistory[faId].seasonLogs[playerHistory[faId].seasonLogs.length - 1].teamId
            : '';
        playerHistory[faId] = addTransaction(playerHistory[faId], {
          year: currentYear,
          type: 'contract_expired',
          teamId: lastTeam,
          description: 'Contract expired, became free agent',
        });
      }
    }

    // 6d. Coaching changes
    const coachResult = processCoachingChanges(state.teams, state.coaches, currentYear);
    state = {
      ...state,
      coaches: coachResult.updatedCoaches,
    };
    totalCoachingChanges += coachResult.changes.length;

    // 6e. AI Draft
    const draftClass = generateDraftClass({ year: currentYear + 1 });
    const draftResult = processAIDraft(
      draftOrder,
      draftClass.prospects,
      state.teams,
      state.players,
      currentYear + 1
    );

    // Add drafted players and contracts
    const newPlayers = { ...state.players };
    const newContracts = { ...state.contracts };
    for (const dp of draftResult.draftedPlayers) {
      newPlayers[dp.id] = dp;
    }
    for (const dc of draftResult.draftedContracts) {
      newContracts[dc.id] = dc;
    }

    state = {
      ...state,
      players: newPlayers,
      contracts: newContracts,
      teams: draftResult.updatedTeams,
    };
    totalDraftPicks += draftResult.draftedPlayers.length;

    // Record draft transactions in player history
    for (const dp of draftResult.draftedPlayers) {
      const teamId = findPlayerTeam(dp.id, state.teams) || '';
      playerHistory[dp.id] = createPlayerCareerHistory(
        dp.id,
        getPlayerFullName(dp),
        dp.position,
        currentYear + 1,
        dp.draftRound,
        dp.draftPick,
        teamId,
        dp.collegeId
      );
      playerHistory[dp.id] = addTransaction(playerHistory[dp.id], {
        year: currentYear + 1,
        type: 'drafted',
        teamId,
        description: `Drafted round ${dp.draftRound}, pick ${dp.draftPick}`,
      });
    }

    // 6f. AI Free Agency
    const freeAgentIds = contractResult.newFreeAgentIds.filter((id) => state.players[id] != null);
    const faResult = processAIFreeAgency(
      freeAgentIds,
      state.players,
      state.teams,
      state.contracts,
      currentYear + 1
    );
    state = {
      ...state,
      players: faResult.updatedPlayers,
      teams: faResult.updatedTeams,
      contracts: faResult.updatedContracts,
    };
    totalFreeAgencySignings += faResult.signings.length;

    // Record FA signing transactions
    for (const signing of faResult.signings) {
      if (playerHistory[signing.playerId]) {
        playerHistory[signing.playerId] = addTransaction(playerHistory[signing.playerId], {
          year: currentYear + 1,
          type: 'free_agent_signed',
          teamId: signing.teamId,
          description: `Signed as free agent`,
        });
      }
    }

    // 6g. Roster maintenance (fill to 53, cut extras)
    const rosterResult = processRosterMaintenance(
      state.teams,
      state.players,
      state.contracts,
      currentYear + 1
    );
    state = {
      ...state,
      teams: rosterResult.updatedTeams,
      players: rosterResult.updatedPlayers,
      contracts: rosterResult.updatedContracts,
    };

    // 6h. Update team finances
    state = {
      ...state,
      teams: updateTeamFinances(state.teams, state.contracts, currentYear + 1),
    };

    // Advance year
    currentYear++;
  }

  // Final state: set the calendar to the user's start year
  state = {
    ...state,
    league: {
      ...state.league,
      calendar: {
        currentYear: startYear,
        currentWeek: 1,
        currentPhase: 'regularSeason',
        offseasonPhase: null,
      },
    },
  };

  // Generate fresh draft picks and prospects for the user's first year
  const teamIds = Object.keys(state.teams);
  const draftPicks = createDraftPicksForYear(teamIds, startYear);
  const draftClass = generateDraftClass({ year: startYear });
  const prospects: Record<string, Prospect> = {};
  for (const prospect of draftClass.prospects) {
    prospects[prospect.id] = prospect;
  }

  state = {
    ...state,
    draftPicks,
    prospects,
    playerHistory,
  };

  // Generate the final season schedule for the user's year
  const finalStandings = buildStandingsFromTeams(state.teams);
  const finalTeamArray = Object.values(state.teams);

  // Reset records for the new season
  const finalTeams: Record<string, Team> = {};
  for (const [teamId, team] of Object.entries(state.teams)) {
    finalTeams[teamId] = {
      ...team,
      currentRecord: createEmptyTeamRecord(),
      playoffSeed: null,
      isEliminated: false,
    };
  }
  state = { ...state, teams: finalTeams };

  const finalSchedule = generateSeasonSchedule(finalTeamArray, finalStandings, startYear);
  state = {
    ...state,
    league: {
      ...state.league,
      schedule: finalSchedule,
    },
  };

  // Update standings in league structure
  const afcTeamIds = Object.keys(state.teams).filter((id) => state.teams[id].conference === 'AFC');
  const nfcTeamIds = Object.keys(state.teams).filter((id) => state.teams[id].conference === 'NFC');

  state = {
    ...state,
    league: {
      ...state.league,
      standings: {
        afc: {
          north: afcTeamIds.filter((id) => state.teams[id].division === 'North'),
          south: afcTeamIds.filter((id) => state.teams[id].division === 'South'),
          east: afcTeamIds.filter((id) => state.teams[id].division === 'East'),
          west: afcTeamIds.filter((id) => state.teams[id].division === 'West'),
        },
        nfc: {
          north: nfcTeamIds.filter((id) => state.teams[id].division === 'North'),
          south: nfcTeamIds.filter((id) => state.teams[id].division === 'South'),
          east: nfcTeamIds.filter((id) => state.teams[id].division === 'East'),
          west: nfcTeamIds.filter((id) => state.teams[id].division === 'West'),
        },
      },
    },
  };

  return {
    gameState: state,
    seasonSummaries,
    totalRetirements,
    totalDraftPicks,
    totalFreeAgencySignings,
    totalCoachingChanges,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Find which team a player is on
 */
function findPlayerTeam(playerId: string, teams: Record<string, Team>): string | null {
  for (const team of Object.values(teams)) {
    if (team.rosterPlayerIds.includes(playerId)) {
      return team.id;
    }
  }
  return null;
}

/**
 * Assign awards to the appropriate players in their career histories
 */
function assignAwardsToPlayers(
  players: Record<string, Player>,
  teams: Record<string, Team>,
  seasonLogs: Map<string, PlayerSeasonLog>,
  year: number,
  playerHistory: Record<string, PlayerCareerHistory>
): void {
  // Build award candidates sorted by score (same logic as generateSeasonAwards)
  const getOverallSkill = (player: Player): number => {
    const vals: number[] = [];
    for (const sv of Object.values(player.skills)) {
      if (sv && typeof sv.trueValue === 'number') vals.push(sv.trueValue);
    }
    return vals.length === 0 ? 50 : vals.reduce((s, v) => s + v, 0) / vals.length;
  };

  // Create candidate-to-player mapping by matching award types
  // MVP → top overall, OPOY → top offensive, DPOY → top defensive, etc.
  const allCandidates: {
    playerId: string;
    score: number;
    isOffense: boolean;
    isRookie: boolean;
  }[] = [];

  for (const [playerId, log] of seasonLogs) {
    const player = players[playerId];
    if (!player || log.gamesPlayed < 8) continue;
    const team = teams[log.teamId];
    if (!team) continue;

    const skill = getOverallSkill(player);
    const totalGames = team.currentRecord.wins + team.currentRecord.losses;
    const winPct = totalGames > 0 ? team.currentRecord.wins / totalGames : 0.5;
    const score = skill + winPct * 20 + (log.gamesPlayed / 17) * 10;

    const offPositions = ['QB', 'RB', 'WR', 'TE', 'LT', 'LG', 'C', 'RG', 'RT'];
    allCandidates.push({
      playerId,
      score,
      isOffense: offPositions.includes(player.position),
      isRookie: player.experience <= 1,
    });
  }

  allCandidates.sort((a, b) => b.score - a.score);

  const offensiveSorted = allCandidates.filter((c) => c.isOffense);
  const defensiveSorted = allCandidates.filter((c) => !c.isOffense);
  const rookieOff = offensiveSorted.filter((c) => c.isRookie);
  const rookieDef = defensiveSorted.filter((c) => c.isRookie);

  // Award mapping: each unique award type → best matching player
  const awarded = new Set<string>();

  const assignOne = (
    type: import('./PlayerHistoryTracker').AwardType,
    list: typeof allCandidates
  ) => {
    for (const c of list) {
      if (!awarded.has(`${type}-${c.playerId}`)) {
        if (playerHistory[c.playerId]) {
          playerHistory[c.playerId] = addAward(playerHistory[c.playerId], {
            year,
            type,
            teamId: seasonLogs.get(c.playerId)?.teamId || '',
          });
        }
        awarded.add(`${type}-${c.playerId}`);
        return;
      }
    }
  };

  assignOne('mvp', allCandidates);
  assignOne('opoy', offensiveSorted);
  assignOne('dpoy', defensiveSorted);
  assignOne('oroy', rookieOff);
  assignOne('droy', rookieDef);

  // All-Pro and Pro Bowl: top N at each position
  // First-team All-Pro: top player at each position group
  const posGroups: { positions: string[]; slots: number }[] = [
    { positions: ['QB'], slots: 1 },
    { positions: ['RB'], slots: 1 },
    { positions: ['WR'], slots: 2 },
    { positions: ['TE'], slots: 1 },
    { positions: ['LT', 'RT'], slots: 2 },
    { positions: ['LG', 'RG'], slots: 2 },
    { positions: ['C'], slots: 1 },
    { positions: ['DE'], slots: 2 },
    { positions: ['DT'], slots: 2 },
    { positions: ['OLB'], slots: 2 },
    { positions: ['ILB'], slots: 2 },
    { positions: ['CB'], slots: 2 },
    { positions: ['FS', 'SS'], slots: 2 },
    { positions: ['K'], slots: 1 },
    { positions: ['P'], slots: 1 },
  ];

  const firstTeam = new Set<string>();
  const secondTeam = new Set<string>();

  for (const group of posGroups) {
    const groupCandidates = allCandidates.filter((c) => {
      const player = players[c.playerId];
      return player && group.positions.includes(player.position);
    });

    for (let i = 0; i < group.slots && i < groupCandidates.length; i++) {
      const pid = groupCandidates[i].playerId;
      if (!firstTeam.has(pid) && playerHistory[pid]) {
        playerHistory[pid] = addAward(playerHistory[pid], {
          year,
          type: 'first_team_all_pro',
          teamId: seasonLogs.get(pid)?.teamId || '',
        });
        firstTeam.add(pid);
      }
    }

    const remaining = groupCandidates.filter((c) => !firstTeam.has(c.playerId));
    for (let i = 0; i < group.slots && i < remaining.length; i++) {
      const pid = remaining[i].playerId;
      if (!secondTeam.has(pid) && playerHistory[pid]) {
        playerHistory[pid] = addAward(playerHistory[pid], {
          year,
          type: 'second_team_all_pro',
          teamId: seasonLogs.get(pid)?.teamId || '',
        });
        secondTeam.add(pid);
      }
    }
  }

  // Pro Bowl: all All-Pros + next ~44 best
  const allProIds = new Set([...firstTeam, ...secondTeam]);
  for (const id of allProIds) {
    if (playerHistory[id]) {
      playerHistory[id] = addAward(playerHistory[id], {
        year,
        type: 'pro_bowl',
        teamId: seasonLogs.get(id)?.teamId || '',
      });
    }
  }

  const proBowlRemaining = allCandidates.filter((c) => !allProIds.has(c.playerId));
  const additionalProBowl = Math.min(44, proBowlRemaining.length);
  for (let i = 0; i < additionalProBowl; i++) {
    const pid = proBowlRemaining[i].playerId;
    if (playerHistory[pid]) {
      playerHistory[pid] = addAward(playerHistory[pid], {
        year,
        type: 'pro_bowl',
        teamId: seasonLogs.get(pid)?.teamId || '',
      });
    }
  }
}

/**
 * Find the MVP (best overall player) for league history tracking
 */
function findMVPPlayer(
  players: Record<string, Player>,
  teams: Record<string, Team>,
  seasonLogs: Map<string, PlayerSeasonLog>
): string | null {
  let bestId: string | null = null;
  let bestScore = -Infinity;

  for (const [playerId, log] of seasonLogs) {
    const player = players[playerId];
    if (!player || log.gamesPlayed < 8) continue;
    const team = teams[log.teamId];
    if (!team) continue;

    const vals: number[] = [];
    for (const sv of Object.values(player.skills)) {
      if (sv && typeof sv.trueValue === 'number') vals.push(sv.trueValue);
    }
    const skill = vals.length === 0 ? 50 : vals.reduce((s, v) => s + v, 0) / vals.length;
    const totalGames = team.currentRecord.wins + team.currentRecord.losses;
    const winPct = totalGames > 0 ? team.currentRecord.wins / totalGames : 0.5;
    const score = skill + winPct * 20 + (log.gamesPlayed / 17) * 10;

    if (score > bestScore) {
      bestScore = score;
      bestId = playerId;
    }
  }

  return bestId;
}
