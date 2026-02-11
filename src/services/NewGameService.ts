/**
 * NewGameService
 * Initializes a complete game state with all 32 teams, players, coaches, scouts, and owners
 */

import {
  GameState,
  SaveSlot,
  createDefaultCareerStats,
  DEFAULT_GAME_SETTINGS,
  addCareerTeamEntry,
} from '../core/models/game/GameState';
import { createDefaultLeague } from '../core/models/league/League';
import { Team, createTeamFromCity } from '../core/models/team/Team';
import { FAKE_CITIES, FakeCity, getFullTeamName } from '../core/models/team/FakeCities';
import { Player } from '../core/models/player/Player';
import { generateRoster } from '../core/generators/player/PlayerGenerator';
import { Coach } from '../core/models/staff/Coach';
import { Scout, createDefaultScout, createScoutContract } from '../core/models/staff/Scout';
import { Owner, NetWorth } from '../core/models/owner/Owner';
import { createDefaultOwnerPersonality } from '../core/models/owner/OwnerPersonality';
import { DraftPick } from '../core/models/league/DraftPick';
import { generateFullName } from '../core/generators/player/NameGenerator';
import { generateUUID, randomInt } from '../core/generators/utils/RandomUtils';
import { generateDraftClass } from '../core/draft/DraftClassGenerator';
import { Prospect } from '../core/draft/Prospect';
import { generateSeasonSchedule, PreviousYearStandings } from '../core/season/ScheduleGenerator';
import { CoachRole } from '../core/models/staff/StaffSalary';
import { generateCoach } from '../core/coaching/CoachGenerator';
import { createNewsFeedState } from '../core/news/NewsFeedManager';
import { createPatienceMeterState } from '../core/career/PatienceMeterManager';
import { createDefaultTenureStats } from '../core/career/FiringMechanics';
import { seedInitialFreeAgentPool } from '../core/freeAgency/FreeAgentSeeder';
import { PlayerContract } from '../core/contracts/Contract';
import {
  generateInitialRosterContracts,
  calculateTotalCapUsage,
  calculateFutureCommitments,
} from '../core/contracts/ContractGenerator';
import { DEFAULT_SALARY_CAP } from '../core/models/team/TeamFinances';
import { simulateLeagueHistory } from '../core/history/LeagueHistorySimulator';

const SALARY_CAP = 255000000; // $255 million

/** Default number of years to pre-simulate for league history */
const DEFAULT_HISTORY_YEARS = 10;

interface NewGameOptions {
  saveSlot: SaveSlot;
  gmName: string;
  selectedTeam: FakeCity;
  startYear?: number;
  /** Number of years of league history to pre-simulate (default: 20, 0 to skip) */
  historyYears?: number;
  /** Callback for history simulation progress */
  onHistoryProgress?: (year: number, totalYears: number, phase: string) => void;
}

/**
 * Creates all 32 teams for the league
 */
function createAllTeams(): Record<string, Team> {
  const teams: Record<string, Team> = {};

  FAKE_CITIES.forEach((city) => {
    const teamId = `team-${city.abbreviation}`;
    const ownerId = `owner-${city.abbreviation}`;

    const team = createTeamFromCity(teamId, city, ownerId, SALARY_CAP);

    // Set some random history/prestige variance
    const randomPrestige = 40 + randomInt(0, 40);
    const randomPassion = 40 + randomInt(0, 40);

    teams[teamId] = {
      ...team,
      prestige: randomPrestige,
      fanbasePassion: randomPassion,
      // Initialize with clean slate for new game (no historical data)
      allTimeRecord: {
        wins: 0,
        losses: 0,
        ties: 0,
      },
      championships: 0,
      lastChampionshipYear: null,
    };
  });

  return teams;
}

/**
 * Creates owner for a team
 */
function createOwnerForTeam(teamId: string): Owner {
  const ownerId = `owner-${teamId.replace('team-', '')}`;
  const { firstName, lastName } = generateFullName();

  const netWorthOptions: NetWorth[] = ['modest', 'wealthy', 'billionaire', 'oligarch'];
  const netWorthWeights = [0.15, 0.45, 0.3, 0.1];
  let netWorth: NetWorth = 'wealthy';
  const roll = Math.random();
  let cumulative = 0;
  for (let i = 0; i < netWorthWeights.length; i++) {
    cumulative += netWorthWeights[i];
    if (roll < cumulative) {
      netWorth = netWorthOptions[i];
      break;
    }
  }

  return {
    id: ownerId,
    firstName,
    lastName,
    teamId,
    personality: createDefaultOwnerPersonality(),
    patienceMeter: 50 + randomInt(-20, 20),
    trustLevel: 50 + randomInt(-10, 10),
    activeDemands: [],
    yearsAsOwner: randomInt(2, 25),
    previousGMsFired: randomInt(0, 5),
    championshipsWon: randomInt(0, 3),
    netWorth,
  };
}

/**
 * Creates coaches for a team (Head Coach, OC, DC)
 * Uses the new coach generator for varied, realistic attributes.
 * Coaches start with varied contract years remaining for realism.
 */
function createCoachesForTeam(teamId: string, startYear: number = 2025): Coach[] {
  const coaches: Coach[] = [];

  const coachRoles: CoachRole[] = ['headCoach', 'offensiveCoordinator', 'defensiveCoordinator'];

  for (const role of coachRoles) {
    const coach = generateCoach(role, teamId, startYear, { randomizeContractYears: true });
    coaches.push(coach);
  }

  return coaches;
}

/**
 * Creates scouts for a team (Head Scout, Offensive Scout, Defensive Scout)
 * Scouts start with varied contract years remaining for realism.
 */
function createScoutsForTeam(teamId: string): Scout[] {
  const scouts: Scout[] = [];

  // Head Scout
  const headName = generateFullName();
  const headScout = createDefaultScout(
    generateUUID(),
    headName.firstName,
    headName.lastName,
    'headScout'
  );
  headScout.teamId = teamId;
  headScout.isAvailable = false;
  const headYearsTotal = randomInt(2, 4);
  headScout.contract = {
    ...createScoutContract(1000000 + randomInt(0, 2000000), headYearsTotal),
    yearsRemaining: randomInt(1, headYearsTotal),
  };
  scouts.push(headScout);

  // Offensive Scout
  const offensiveName = generateFullName();
  const offensiveScout = createDefaultScout(
    generateUUID(),
    offensiveName.firstName,
    offensiveName.lastName,
    'offensiveScout'
  );
  offensiveScout.teamId = teamId;
  offensiveScout.isAvailable = false;
  const offYearsTotal = randomInt(2, 4);
  offensiveScout.contract = {
    ...createScoutContract(500000 + randomInt(0, 700000), offYearsTotal),
    yearsRemaining: randomInt(1, offYearsTotal),
  };
  scouts.push(offensiveScout);

  // Defensive Scout
  const defensiveName = generateFullName();
  const defensiveScout = createDefaultScout(
    generateUUID(),
    defensiveName.firstName,
    defensiveName.lastName,
    'defensiveScout'
  );
  defensiveScout.teamId = teamId;
  defensiveScout.isAvailable = false;
  const defYearsTotal = randomInt(2, 4);
  defensiveScout.contract = {
    ...createScoutContract(500000 + randomInt(0, 700000), defYearsTotal),
    yearsRemaining: randomInt(1, defYearsTotal),
  };
  scouts.push(defensiveScout);

  return scouts;
}

/**
 * Creates draft picks for all teams for the upcoming draft
 */
function createDraftPicks(teamIds: string[], year: number): Record<string, DraftPick> {
  const draftPicks: Record<string, DraftPick> = {};

  for (let round = 1; round <= 7; round++) {
    teamIds.forEach((teamId, index) => {
      const pickNumber = (round - 1) * 32 + index + 1;
      const pickId = `pick-${year}-${round}-${pickNumber}`;

      draftPicks[pickId] = {
        id: pickId,
        year,
        round,
        overallPick: pickNumber,
        originalTeamId: teamId,
        currentTeamId: teamId,
        selectedPlayerId: null,
        tradeHistory: [],
      };
    });
  }

  return draftPicks;
}

/**
 * Creates a complete new game state
 */
export function createNewGame(options: NewGameOptions): GameState {
  const {
    saveSlot,
    gmName,
    selectedTeam,
    startYear = 2025,
    historyYears = DEFAULT_HISTORY_YEARS,
    onHistoryProgress,
  } = options;

  // Create all 32 teams
  const teams = createAllTeams();
  const teamIds = Object.keys(teams);

  // Find user's team
  const userTeamId = `team-${selectedTeam.abbreviation}`;
  const userTeam = teams[userTeamId];

  // Set user as GM of their team
  teams[userTeamId] = {
    ...userTeam,
    gmId: gmName,
  };

  // Create players and contracts for all teams
  const players: Record<string, Player> = {};
  const contracts: Record<string, PlayerContract> = {};

  for (const teamId of teamIds) {
    const roster = generateRoster(teamId);
    const playerIds: string[] = [];

    // Generate contracts for the roster with realistic mid-deal diversity
    const { contracts: teamContracts, updatedPlayers } = generateInitialRosterContracts(
      roster,
      teamId,
      startYear
    );

    // Add contracts to the contracts collection
    for (const [contractId, contract] of Object.entries(teamContracts)) {
      contracts[contractId] = contract;
    }

    // Add players with their contract IDs
    for (const player of updatedPlayers) {
      players[player.id] = player;
      playerIds.push(player.id);
    }

    // Calculate cap usage from contracts
    const teamContractsOnly = Object.fromEntries(
      Object.entries(teamContracts).filter(([, c]) => c.teamId === teamId)
    );
    const capUsage = calculateTotalCapUsage(teamContractsOnly, startYear);
    const futureCommitments = calculateFutureCommitments(teamContractsOnly, startYear);

    // Assign roster to team and update finances
    teams[teamId] = {
      ...teams[teamId],
      rosterPlayerIds: playerIds,
      finances: {
        ...teams[teamId].finances,
        currentCapUsage: capUsage,
        capSpace: DEFAULT_SALARY_CAP - capUsage,
        nextYearCommitted: futureCommitments.nextYear,
        twoYearsOutCommitted: futureCommitments.twoYearsOut,
        threeYearsOutCommitted: futureCommitments.threeYearsOut,
      },
    };
  }

  // Seed initial free agent pool (approximately 250 free agents)
  // Free agents don't have contracts (they will sign when joining a team)
  const freeAgents = seedInitialFreeAgentPool(startYear);
  for (const freeAgent of freeAgents) {
    players[freeAgent.id] = freeAgent;
  }

  // Create owners for all teams
  const owners: Record<string, Owner> = {};
  for (const teamId of teamIds) {
    const owner = createOwnerForTeam(teamId);
    owners[owner.id] = owner;
  }

  // Create coaches for all teams
  const coaches: Record<string, Coach> = {};
  for (const teamId of teamIds) {
    const teamCoaches = createCoachesForTeam(teamId, startYear);
    for (const coach of teamCoaches) {
      coaches[coach.id] = coach;
    }
  }

  // Create scouts for all teams
  const scouts: Record<string, Scout> = {};
  for (const teamId of teamIds) {
    const teamScouts = createScoutsForTeam(teamId);
    for (const scout of teamScouts) {
      scouts[scout.id] = scout;
    }
  }

  // Create draft picks
  const draftPicks = createDraftPicks(teamIds, startYear);

  // Generate draft class prospects
  const draftClass = generateDraftClass({ year: startYear });
  const prospects: Record<string, Prospect> = {};
  for (const prospect of draftClass.prospects) {
    prospects[prospect.id] = prospect;
  }

  // Create league
  const league = createDefaultLeague('league-1', teamIds, startYear);
  // Start in regular season week 1 for immediate gameplay
  league.calendar = {
    currentYear: startYear,
    currentWeek: 1,
    currentPhase: 'regularSeason',
    offseasonPhase: null,
  };

  // Initialize standings with team IDs
  const afcTeams = teamIds.filter((id) => teams[id].conference === 'AFC');
  const nfcTeams = teamIds.filter((id) => teams[id].conference === 'NFC');

  league.standings = {
    afc: {
      north: afcTeams.filter((id) => teams[id].division === 'North'),
      south: afcTeams.filter((id) => teams[id].division === 'South'),
      east: afcTeams.filter((id) => teams[id].division === 'East'),
      west: afcTeams.filter((id) => teams[id].division === 'West'),
    },
    nfc: {
      north: nfcTeams.filter((id) => teams[id].division === 'North'),
      south: nfcTeams.filter((id) => teams[id].division === 'South'),
      east: nfcTeams.filter((id) => teams[id].division === 'East'),
      west: nfcTeams.filter((id) => teams[id].division === 'West'),
    },
  };

  // Generate season schedule
  // For new game, use current standings as "previous year" standings
  const previousYearStandings: PreviousYearStandings = {
    AFC: {
      North: league.standings.afc.north,
      South: league.standings.afc.south,
      East: league.standings.afc.east,
      West: league.standings.afc.west,
    },
    NFC: {
      North: league.standings.nfc.north,
      South: league.standings.nfc.south,
      East: league.standings.nfc.east,
      West: league.standings.nfc.west,
    },
  };

  const teamArray = Object.values(teams);
  league.schedule = generateSeasonSchedule(teamArray, previousYearStandings, startYear);

  // Create career stats with initial team entry
  const careerStats = addCareerTeamEntry(
    createDefaultCareerStats(),
    userTeamId,
    getFullTeamName(selectedTeam),
    startYear
  );

  const now = new Date().toISOString();

  // Get user's team owner for patience initialization
  const userOwnerId = `owner-${selectedTeam.abbreviation}`;
  const userOwner = owners[userOwnerId];

  // Initialize patience meter with owner's starting patience
  const initialPatience = userOwner?.patienceMeter ?? 50;
  const patienceMeter = createPatienceMeterState(userOwnerId, initialPatience, 1, startYear);

  // Initialize tenure stats
  const tenureStats = createDefaultTenureStats();

  let baseGameState: GameState = {
    saveSlot,
    createdAt: now,
    lastSavedAt: now,
    userTeamId,
    userName: gmName,
    league,
    teams,
    players,
    coaches,
    scouts,
    owners,
    draftPicks,
    prospects,
    contracts,
    careerStats,
    gameSettings: { ...DEFAULT_GAME_SETTINGS },
    newsReadStatus: {},
    newsFeed: createNewsFeedState(startYear, 1),
    patienceMeter,
    tenureStats,
  };

  // Pre-simulate league history if requested
  if (historyYears > 0) {
    const historyResult = simulateLeagueHistory(baseGameState, {
      years: historyYears,
      onProgress: onHistoryProgress,
    });

    // Use the history-simulated state but preserve user-specific fields
    baseGameState = {
      ...historyResult.gameState,
      saveSlot,
      createdAt: now,
      lastSavedAt: now,
      userTeamId,
      userName: gmName,
      careerStats,
      gameSettings: { ...DEFAULT_GAME_SETTINGS },
      newsReadStatus: {},
      newsFeed: createNewsFeedState(startYear, 1),
      patienceMeter,
      tenureStats,
      scouts, // Keep original scouts (not simulated)
      owners, // Keep original owners (not simulated)
    };

    // Re-set the user as GM of their team
    baseGameState.teams[userTeamId] = {
      ...baseGameState.teams[userTeamId],
      gmId: gmName,
    };
  }

  return baseGameState;
}

/**
 * Gets a summary of team information for selection screen
 */
export function getTeamSelectionInfo(city: FakeCity): {
  fullName: string;
  conference: string;
  division: string;
  marketSize: string;
  stadiumType: string;
} {
  return {
    fullName: getFullTeamName(city),
    conference: city.conference,
    division: `${city.conference} ${city.division}`,
    marketSize: city.marketSize.charAt(0).toUpperCase() + city.marketSize.slice(1),
    stadiumType: city.stadiumType,
  };
}
