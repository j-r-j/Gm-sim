import {
  GameState,
  DEFAULT_GAME_SETTINGS,
  createDefaultCareerStats,
} from '@core/models/game/GameState';
import { Team, createEmptyTeamRecord } from '@core/models/team/Team';
import { createDefaultTeamFinances } from '@core/models/team/TeamFinances';
import { createDefaultStadium } from '@core/models/team/Stadium';
import { createEmptyStaffHierarchy } from '@core/models/staff/StaffHierarchy';
import { createDefaultOwner } from '@core/models/owner';
import { DEFAULT_LEAGUE_SETTINGS } from '@core/models/league/League';
import { Player } from '@core/models/player/Player';
import { Position } from '@core/models/player/Position';
import { createHealthyStatus } from '@core/models/player/InjuryStatus';
import { createPlayerContract, getCutBreakdown } from '@core/contracts';
import { applyContractRestructure, applyPlayerCut, mapPlayerForComparison } from '../rosterHelpers';

function createTestPlayer(id: string, contractId: string | null): Player {
  const baseSkill = { trueValue: 75, perceivedMin: 65, perceivedMax: 85, maturityAge: 26 };
  return {
    id,
    firstName: 'Test',
    lastName: 'Player',
    position: Position.QB,
    age: 27,
    experience: 5,
    physical: {
      height: 75,
      weight: 220,
      armLength: 33,
      handSize: 10,
      wingspan: 78,
      speed: 4.7,
      acceleration: 78,
      agility: 76,
      strength: 80,
      verticalJump: 31,
    },
    skills: {
      accuracy: baseSkill,
      mobility: baseSkill,
      vision: baseSkill,
      tackling: baseSkill,
      catching: baseSkill,
      routeRunning: baseSkill,
      blocking: baseSkill,
      passBlock: baseSkill,
      runBlock: baseSkill,
      passRush: baseSkill,
      runDefense: baseSkill,
      manCoverage: baseSkill,
      zoneCoverage: baseSkill,
      kickPower: baseSkill,
      kickAccuracy: baseSkill,
      tracking: baseSkill,
    },
    hiddenTraits: { positive: [], negative: [], revealedToUser: [] },
    itFactor: { value: 50 },
    consistency: { tier: 'average', currentStreak: 'neutral', streakGamesRemaining: 0 },
    schemeFits: {
      offensive: {
        westCoast: 'good',
        airRaid: 'good',
        spreadOption: 'good',
        powerRun: 'good',
        zoneRun: 'good',
        playAction: 'good',
      },
      defensive: {
        fourThreeUnder: 'good',
        threeFour: 'good',
        coverThree: 'good',
        coverTwo: 'good',
        manPress: 'good',
        blitzHeavy: 'good',
      },
    },
    roleFit: { ceiling: 'solidStarter', currentRole: 'solidStarter', roleEffectiveness: 75 },
    contractId,
    injuryStatus: createHealthyStatus(),
    fatigue: 0,
    morale: 75,
    collegeId: 'college-1',
    draftYear: 2020,
    draftRound: 2,
    draftPick: 54,
  };
}

function createGameStateForRosterTests(): {
  gameState: GameState;
  playerId: string;
  contractId: string;
} {
  const userTeamId = 'team-user';
  const ownerId = 'owner-TST';
  const year = 2026;
  const playerId = 'player-1';

  const contract = createPlayerContract(
    playerId,
    'Test Player',
    userTeamId,
    Position.QB,
    { years: 3, bonusPerYear: 2000, salaryPerYear: 4000, noTradeClause: false },
    year - 1,
    'veteran'
  );

  const team: Team = {
    id: userTeamId,
    city: 'Test',
    nickname: 'Team',
    abbreviation: 'TST',
    conference: 'AFC',
    division: 'North',
    stadium: createDefaultStadium('stadium-user', userTeamId, 'Test'),
    finances: {
      ...createDefaultTeamFinances(userTeamId),
      currentCapUsage: 150000,
      capSpace: 105000,
      deadMoney: 1000,
    },
    staffHierarchy: createEmptyStaffHierarchy(userTeamId, 30000),
    ownerId,
    gmId: 'gm-user',
    rosterPlayerIds: [playerId],
    practiceSquadIds: [],
    injuredReserveIds: [],
    currentRecord: { ...createEmptyTeamRecord(), wins: 9, losses: 7 },
    playoffSeed: null,
    isEliminated: false,
    allTimeRecord: { wins: 0, losses: 0, ties: 0 },
    championships: 0,
    lastChampionshipYear: null,
    marketSize: 'medium',
    prestige: 55,
    fanbasePassion: 60,
  };

  const player = createTestPlayer(playerId, contract.id);

  const gameState: GameState = {
    saveSlot: 0,
    createdAt: new Date().toISOString(),
    lastSavedAt: new Date().toISOString(),
    userTeamId,
    userName: 'GM',
    league: {
      id: 'league-1',
      name: 'League',
      teamIds: [userTeamId],
      calendar: {
        currentYear: year,
        currentWeek: 10,
        currentPhase: 'regularSeason',
        offseasonPhase: null,
      },
      settings: DEFAULT_LEAGUE_SETTINGS,
      schedule: {
        year,
        regularSeason: [],
        byeWeeks: {},
        playoffs: null,
      },
      standings: {
        afc: { north: [], south: [], east: [], west: [] },
        nfc: { north: [], south: [], east: [], west: [] },
      },
      playoffBracket: null,
      seasonHistory: [],
      upcomingEvents: [],
    },
    teams: { [userTeamId]: team },
    players: { [playerId]: player },
    coaches: {},
    scouts: {},
    owners: { [ownerId]: createDefaultOwner(ownerId, userTeamId) },
    draftPicks: {},
    prospects: {},
    contracts: { [contract.id]: contract },
    careerStats: createDefaultCareerStats(),
    gameSettings: DEFAULT_GAME_SETTINGS,
    newsReadStatus: {},
  };

  return { gameState, playerId, contractId: contract.id };
}

describe('rosterHelpers', () => {
  it('updates restructured contracts by contract id key', () => {
    const { gameState, contractId, playerId } = createGameStateForRosterTests();
    const updated = applyContractRestructure(gameState, {
      contractId,
      amountToConvert: 3000,
      voidYears: 1,
    });

    expect(updated.contracts[contractId]).toBeDefined();
    expect(updated.contracts[contractId].voidYears).toBe(
      gameState.contracts[contractId].voidYears + 1
    );
    expect(updated.contracts[playerId]).toBeUndefined();
  });

  it('cuts player by mutating roster, player contract link, and team finances', () => {
    const { gameState, playerId, contractId } = createGameStateForRosterTests();
    const breakdown = getCutBreakdown(
      gameState.contracts[contractId],
      gameState.league.calendar.currentYear
    );

    const updated = applyPlayerCut(gameState, playerId, breakdown);
    const updatedTeam = updated.teams[updated.userTeamId];

    expect(updatedTeam.rosterPlayerIds).not.toContain(playerId);
    expect(updated.players[playerId].contractId).toBeNull();
    expect(updated.contracts[contractId].status).toBe('voided');
    expect(updatedTeam.finances.currentCapUsage).toBeLessThan(
      gameState.teams[gameState.userTeamId].finances.currentCapUsage
    );
    expect(updatedTeam.finances.deadMoney).toBeGreaterThan(
      gameState.teams[gameState.userTeamId].finances.deadMoney
    );
  });

  it('maps comparison skills from perceived min/max midpoint', () => {
    const { gameState, playerId } = createGameStateForRosterTests();
    const mapped = mapPlayerForComparison(gameState.players[playerId], { passingYards: 4100 });

    expect(mapped.skills.accuracy).toBe(75);
    expect(mapped.overall).toBeGreaterThan(0);
    expect(mapped.stats.passingYards).toBe(4100);
  });
});
