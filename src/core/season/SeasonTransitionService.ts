/**
 * Season Transition Service
 * Orchestrates the full year-over-year season transition in 10 steps.
 * Takes an immutable GameState and returns a new GameState for the next season.
 */

import { GameState, updateCareerStatsAfterSeason } from '@core/models/game/GameState';
import { SeasonSummary, createEmptyStandings } from '@core/models/league/League';
import { createEmptyTeamRecord } from '@core/models/team/Team';
import { advanceContractYear } from '@core/contracts/Contract';
import {
  calculateTotalCapUsage,
  calculateFutureCommitments,
} from '@core/contracts/ContractGenerator';
import { generateDraftClass } from '@core/draft/DraftClassGenerator';
import { generateDraftPicksForYear } from '@core/models/league/DraftPick';
import { generateSeasonSchedule, PreviousYearStandings } from '@core/season/ScheduleGenerator';
import { applySkillChanges, applyOffseasonProgression } from '@core/career/PlayerProgression';
import { createHealthyStatus } from '@core/models/player/InjuryStatus';
import { Player } from '@core/models/player/Player';
import { Team } from '@core/models/team/Team';
import { Coach } from '@core/models/staff/Coach';
import {
  DEFAULT_SALARY_CAP,
  advanceCapPenalties,
} from '@core/models/team/TeamFinances';

/**
 * Transitions the game state to a new season.
 * Performs 10 sequential steps to prepare for the next year.
 */
export function transitionToNewSeason(gameState: GameState): GameState {
  let state = gameState;

  // Step 1: Record season history
  state = recordSeasonHistory(state);

  // Step 2: Process retirements (age-based player removal)
  state = processRetirements(state);

  // Step 3: Advance contracts
  state = advanceAllContracts(state);

  // Step 4: Age all players
  state = ageAllPlayers(state);

  // Step 5: Apply development/regression
  state = applyDevelopmentRegression(state);

  // Step 6: Generate new draft class
  state = generateNewDraftClass(state);

  // Step 7: Create draft picks
  state = createNewDraftPicks(state);

  // Step 8: Generate new schedule
  state = generateNewSchedule(state);

  // Step 9: Update career stats
  state = updateCareerStats(state);

  // Step 10: Recalculate team finances for new year
  state = recalculateAllTeamFinances(state);

  // Step 11: Reset transient state
  state = resetTransientState(state);

  return state;
}

/**
 * Step 1: Record season history
 * Creates a season summary and appends to league.seasonHistory.
 */
function recordSeasonHistory(state: GameState): GameState {
  const { league, teams } = state;
  const year = league.calendar.currentYear;

  // Determine champion from playoff bracket
  let championTeamId = '';
  if (league.playoffBracket?.superBowl?.winnerId) {
    championTeamId = league.playoffBracket.superBowl.winnerId;
  }

  // Find MVP: pick the best player from the champion team, or fallback to user team
  const mvpPlayerId = findSeasonMvp(state, championTeamId);

  // Build draft order from current standings (team IDs sorted by record, worst first)
  const draftOrder = buildDraftOrderFromRecords(teams);

  const summary: SeasonSummary = {
    year,
    championTeamId,
    mvpPlayerId,
    draftOrder,
  };

  return {
    ...state,
    league: {
      ...league,
      seasonHistory: [...league.seasonHistory, summary],
    },
  };
}

/**
 * Step 2: Process retirements
 * Players 36+ have increasing retirement chance; 40+ almost certain.
 */
function processRetirements(state: GameState): GameState {
  const retiredPlayerIds: string[] = [];
  const updatedPlayers = { ...state.players };

  for (const player of Object.values(updatedPlayers)) {
    if (shouldRetire(player)) {
      retiredPlayerIds.push(player.id);
    }
  }

  if (retiredPlayerIds.length === 0) {
    return state;
  }

  // Remove retired players from all team rosters
  const retiredSet = new Set(retiredPlayerIds);
  const updatedTeams = { ...state.teams };

  for (const [teamId, team] of Object.entries(updatedTeams)) {
    const hadRetirements =
      team.rosterPlayerIds.some((id) => retiredSet.has(id)) ||
      team.practiceSquadIds.some((id) => retiredSet.has(id)) ||
      team.injuredReserveIds.some((id) => retiredSet.has(id));

    if (hadRetirements) {
      updatedTeams[teamId] = {
        ...team,
        rosterPlayerIds: team.rosterPlayerIds.filter((id) => !retiredSet.has(id)),
        practiceSquadIds: team.practiceSquadIds.filter((id) => !retiredSet.has(id)),
        injuredReserveIds: team.injuredReserveIds.filter((id) => !retiredSet.has(id)),
      };
    }
  }

  // Remove retired players and their contracts from the state
  for (const id of retiredPlayerIds) {
    delete updatedPlayers[id];
  }

  const updatedContracts = { ...state.contracts };
  for (const [contractId, contract] of Object.entries(updatedContracts)) {
    if (retiredSet.has(contract.playerId)) {
      delete updatedContracts[contractId];
    }
  }

  return {
    ...state,
    players: updatedPlayers,
    teams: updatedTeams,
    contracts: updatedContracts,
  };
}

/**
 * Step 3: Advance all contracts
 * Decrements yearsRemaining. Contracts with 0 years expire; player becomes free agent.
 */
function advanceAllContracts(state: GameState): GameState {
  const updatedContracts = { ...state.contracts };
  const expiredPlayerIds: string[] = [];

  for (const [contractId, contract] of Object.entries(updatedContracts)) {
    const advanced = advanceContractYear(contract);
    if (advanced === null || advanced.status === 'expired') {
      // Contract expired — player becomes free agent
      expiredPlayerIds.push(contract.playerId);
      if (advanced) {
        updatedContracts[contractId] = advanced;
      } else {
        delete updatedContracts[contractId];
      }
    } else {
      updatedContracts[contractId] = advanced;
    }
  }

  // Clear contractId on expired players
  const updatedPlayers = { ...state.players };
  for (const playerId of expiredPlayerIds) {
    const player = updatedPlayers[playerId];
    if (player) {
      updatedPlayers[playerId] = {
        ...player,
        contractId: null,
      };
    }
  }

  return {
    ...state,
    contracts: updatedContracts,
    players: updatedPlayers,
  };
}

/**
 * Step 4: Age all players
 * Increments age and experience for every player.
 */
function ageAllPlayers(state: GameState): GameState {
  const updatedPlayers: Record<string, Player> = {};

  for (const [playerId, player] of Object.entries(state.players)) {
    updatedPlayers[playerId] = {
      ...player,
      age: player.age + 1,
      experience: player.experience + 1,
    };
  }

  return {
    ...state,
    players: updatedPlayers,
  };
}

/**
 * Step 5: Apply development/regression
 * Uses PlayerProgression to develop young players and regress veterans.
 */
function applyDevelopmentRegression(state: GameState): GameState {
  const updatedPlayers = { ...state.players };

  for (const team of Object.values(state.teams)) {
    // Find the head coach for this team
    const coach = findHeadCoach(state, team);
    if (!coach) continue;

    // Get all players on this team's roster
    const rosterPlayerIds = [
      ...team.rosterPlayerIds,
      ...team.practiceSquadIds,
      ...team.injuredReserveIds,
    ];

    for (const playerId of rosterPlayerIds) {
      const player = updatedPlayers[playerId];
      if (!player) continue;

      const result = applyOffseasonProgression(player, coach);
      updatedPlayers[playerId] = applySkillChanges(player, result);
    }
  }

  return {
    ...state,
    players: updatedPlayers,
  };
}

/**
 * Step 6: Generate new draft class
 * Creates ~250 prospects for the upcoming draft year.
 */
function generateNewDraftClass(state: GameState): GameState {
  const nextYear = state.league.calendar.currentYear + 1;
  const draftClass = generateDraftClass({ year: nextYear });

  // Convert prospects to a Record
  const newProspects: Record<string, GameState['prospects'][string]> = {};
  for (const prospect of draftClass.prospects) {
    newProspects[prospect.player.id] = prospect;
  }

  return {
    ...state,
    prospects: newProspects,
  };
}

/**
 * Step 7: Create draft picks
 * Generates 7 rounds x 32 teams = 224 picks for the new year.
 */
function createNewDraftPicks(state: GameState): GameState {
  const nextYear = state.league.calendar.currentYear + 1;
  const teamIds = state.league.teamIds;

  const picks = generateDraftPicksForYear(nextYear, teamIds, 'pick');

  // Convert to Record, keeping any existing future picks that teams may have traded for
  const updatedPicks = { ...state.draftPicks };

  // Remove old picks from the current/past year
  const currentYear = state.league.calendar.currentYear;
  for (const [pickId, pick] of Object.entries(updatedPicks)) {
    if (pick.year <= currentYear) {
      delete updatedPicks[pickId];
    }
  }

  // Add new picks
  for (const pick of picks) {
    updatedPicks[pick.id] = pick;
  }

  return {
    ...state,
    draftPicks: updatedPicks,
  };
}

/**
 * Step 8: Generate new schedule
 * Uses the existing ScheduleGenerator to create the next season's schedule.
 */
function generateNewSchedule(state: GameState): GameState {
  const nextYear = state.league.calendar.currentYear + 1;
  const teams = Object.values(state.teams);

  // Build previous year standings from current team records
  const previousStandings = buildPreviousYearStandings(teams);

  const schedule = generateSeasonSchedule(teams, previousStandings, nextYear);

  return {
    ...state,
    league: {
      ...state.league,
      schedule,
    },
  };
}

/**
 * Step 9: Update career stats
 * Updates the user's career stats with this season's results.
 */
function updateCareerStats(state: GameState): GameState {
  const userTeam = state.teams[state.userTeamId];
  if (!userTeam) return state;

  const wins = userTeam.currentRecord.wins;
  const losses = userTeam.currentRecord.losses;
  const madePlayoffs = userTeam.playoffSeed !== null;

  // Determine if user won championship
  const wonChampionship = state.league.playoffBracket?.superBowl?.winnerId === state.userTeamId;

  const updatedCareerStats = updateCareerStatsAfterSeason(
    state.careerStats,
    wins,
    losses,
    madePlayoffs,
    wonChampionship
  );

  return {
    ...state,
    careerStats: updatedCareerStats,
  };
}

/**
 * Step 10: Reset transient state
 * Clears season-specific data and resets calendar for the new season.
 */
function resetTransientState(state: GameState): GameState {
  const nextYear = state.league.calendar.currentYear + 1;

  // Reset all team records to 0-0
  const updatedTeams: Record<string, Team> = {};
  for (const [teamId, team] of Object.entries(state.teams)) {
    updatedTeams[teamId] = {
      ...team,
      currentRecord: createEmptyTeamRecord(),
      playoffSeed: null,
      isEliminated: false,
      // Update all-time record from the season that just ended
      allTimeRecord: {
        wins: team.allTimeRecord.wins + team.currentRecord.wins,
        losses: team.allTimeRecord.losses + team.currentRecord.losses,
        ties: team.allTimeRecord.ties + team.currentRecord.ties,
      },
    };
  }

  // Reset player fatigue, morale, and injuries
  const updatedPlayers: Record<string, Player> = {};
  for (const [playerId, player] of Object.entries(state.players)) {
    updatedPlayers[playerId] = {
      ...player,
      fatigue: 0,
      morale: Math.min(100, Math.max(25, player.morale)), // Clamp but don't fully reset
      injuryStatus: createHealthyStatus(),
    };
  }

  return {
    ...state,
    teams: updatedTeams,
    players: updatedPlayers,
    league: {
      ...state.league,
      calendar: {
        currentYear: nextYear,
        currentWeek: 1,
        currentPhase: 'regularSeason',
        offseasonPhase: null,
      },
      standings: createEmptyStandings(),
      playoffBracket: null,
      upcomingEvents: [],
    },
    // Clear transient state
    seasonStats: undefined,
    offseasonState: undefined,
    offseasonData: undefined,
    weeklyGamePlan: undefined,
    tradeOffers: undefined,
    startSitDecisions: undefined,
    weeklyAwards: undefined,
    waiverWire: undefined,
    halftimeDecisions: undefined,
  };
}

/**
 * Step 10: Recalculate all team finances
 * After contracts are advanced/expired, recalculate cap usage and space for each team.
 */
function recalculateAllTeamFinances(state: GameState): GameState {
  const nextYear = state.league.calendar.currentYear + 1;
  const updatedTeams = { ...state.teams };

  for (const [teamId, team] of Object.entries(updatedTeams)) {
    // Get all active contracts for this team
    const teamContracts: Record<string, (typeof state.contracts)[string]> = {};
    for (const [contractId, contract] of Object.entries(state.contracts)) {
      if (contract.teamId === teamId && contract.status === 'active') {
        teamContracts[contractId] = contract;
      }
    }

    const capUsage = calculateTotalCapUsage(teamContracts, nextYear);
    const futureCommitments = calculateFutureCommitments(teamContracts, nextYear);

    // Advance cap penalties (reduce years remaining, remove expired)
    const advancedFinances = advanceCapPenalties(team.finances);

    // Apply ~3% annual cap growth
    const newSalaryCap = Math.round(DEFAULT_SALARY_CAP * (1 + 0.03 * (nextYear - 2025)));

    updatedTeams[teamId] = {
      ...team,
      finances: {
        ...advancedFinances,
        salaryCap: newSalaryCap,
        currentCapUsage: capUsage,
        capSpace: newSalaryCap - capUsage,
        nextYearCommitted: futureCommitments.nextYear,
        twoYearsOutCommitted: futureCommitments.twoYearsOut,
        threeYearsOutCommitted: futureCommitments.threeYearsOut,
      },
    };
  }

  return {
    ...state,
    teams: updatedTeams,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determines if a player should retire based on age.
 */
function shouldRetire(player: Player): boolean {
  if (player.age < 34) return false;
  if (player.age >= 40) return Math.random() < 0.9;
  if (player.age >= 38) return Math.random() < 0.5;
  if (player.age >= 36) return Math.random() < 0.25;
  if (player.age >= 34) return Math.random() < 0.1;
  return false;
}

/**
 * Finds a simple MVP candidate from the champion team.
 * Falls back to a random player if no champion.
 */
function findSeasonMvp(state: GameState, championTeamId: string): string {
  if (championTeamId) {
    const team = state.teams[championTeamId];
    if (team && team.rosterPlayerIds.length > 0) {
      // Return the first player on the champion's roster as a simple MVP pick
      return team.rosterPlayerIds[0];
    }
  }

  // Fallback: first player from any team
  const allPlayers = Object.keys(state.players);
  return allPlayers.length > 0 ? allPlayers[0] : '';
}

/**
 * Builds draft order from team records (worst to best).
 */
function buildDraftOrderFromRecords(teams: Record<string, Team>): string[] {
  return Object.values(teams)
    .sort((a, b) => {
      const aWinPct = getTeamWinPct(a);
      const bWinPct = getTeamWinPct(b);
      if (aWinPct !== bWinPct) return aWinPct - bWinPct; // Worst first
      // Tiebreaker: lower points differential gets higher pick
      const aDiff = a.currentRecord.pointsFor - a.currentRecord.pointsAgainst;
      const bDiff = b.currentRecord.pointsFor - b.currentRecord.pointsAgainst;
      return aDiff - bDiff;
    })
    .map((t) => t.id);
}

/**
 * Calculates a team's win percentage from their current record.
 */
function getTeamWinPct(team: Team): number {
  const { wins, losses, ties } = team.currentRecord;
  const total = wins + losses + ties;
  if (total === 0) return 0;
  return (wins + ties * 0.5) / total;
}

/**
 * Builds PreviousYearStandings from current team records for schedule generation.
 */
function buildPreviousYearStandings(teams: Team[]): PreviousYearStandings {
  const standings: PreviousYearStandings = {
    AFC: { North: [], South: [], East: [], West: [] },
    NFC: { North: [], South: [], East: [], West: [] },
  };

  // Group teams by conference/division
  const grouped: Record<string, Record<string, Team[]>> = {
    AFC: { North: [], South: [], East: [], West: [] },
    NFC: { North: [], South: [], East: [], West: [] },
  };

  for (const team of teams) {
    grouped[team.conference][team.division].push(team);
  }

  // Sort each division by record (best to worst)
  for (const conference of ['AFC', 'NFC'] as const) {
    for (const division of ['North', 'South', 'East', 'West'] as const) {
      const sorted = grouped[conference][division].sort((a, b) => {
        const aWinPct = getTeamWinPct(a);
        const bWinPct = getTeamWinPct(b);
        if (aWinPct !== bWinPct) return bWinPct - aWinPct; // Best first
        const aDiff = a.currentRecord.pointsFor - a.currentRecord.pointsAgainst;
        const bDiff = b.currentRecord.pointsFor - b.currentRecord.pointsAgainst;
        return bDiff - aDiff;
      });
      standings[conference][division] = sorted.map((t) => t.id);
    }
  }

  return standings;
}

/**
 * Finds the head coach for a team.
 */
function findHeadCoach(state: GameState, team: Team): Coach | null {
  const headCoachId = team.staffHierarchy.headCoach;
  if (!headCoachId) return null;
  return state.coaches[headCoachId] || null;
}
