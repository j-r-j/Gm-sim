/**
 * Weekly Game Flow Integration Tests
 *
 * Tests the complete weekly flow: week creation, game simulation,
 * post-game processing, fatigue accumulation, injury persistence and healing,
 * stats updates, and bye week handling.
 *
 * These tests verify that the WeekProgressionService, WeekSimulator,
 * and GameFlowManager all work together correctly.
 */

import { Team, createEmptyTeamRecord } from '@core/models/team/Team';
import { Player } from '@core/models/player/Player';
import { Coach, createDefaultCoach } from '@core/models/staff/Coach';
import { Position } from '@core/models/player/Position';
import { FAKE_CITIES } from '@core/models/team/FakeCities';
import { createDefaultStadium } from '@core/models/team/Stadium';
import { createDefaultTeamFinances } from '@core/models/team/TeamFinances';
import { createEmptyStaffHierarchy } from '@core/models/staff/StaffHierarchy';
import {
  generateSeasonSchedule,
  createDefaultStandings,
  getWeekGames,
  SeasonSchedule,
} from '@core/season/ScheduleGenerator';
import {
  simulateWeek,
  advanceWeek,
  getUserTeamGame,
  isUserOnBye,
} from '@core/season/WeekSimulator';
import {
  WeekProgressionService,
  createWeekProgressionService,
} from '@core/gameflow/WeekProgressionService';
import {
  GameFlowManager,
  createGameFlowManager,
} from '@core/gameflow/GameFlowManager';
import {
  GameState,
  createDefaultCareerStats,
  DEFAULT_GAME_SETTINGS,
} from '@core/models/game/GameState';
import { DEFAULT_LEAGUE_SETTINGS } from '@core/models/league/League';
import { createHealthyStatus } from '@core/models/player/InjuryStatus';
import { createDefaultOwner } from '@core/models/owner';

// ============================================
// TEST HELPERS
// ============================================

function createTestPlayer(
  id: string,
  position: Position,
  firstName: string,
  lastName: string,
  injuryStatus?: {
    severity: 'none' | 'questionable' | 'doubtful' | 'out' | 'ir';
    type: 'hamstring' | 'knee' | 'ankle' | 'shoulder' | 'none';
    weeksRemaining: number;
  }
): Player {
  return {
    id,
    firstName,
    lastName,
    position,
    age: 25,
    experience: 3,
    physical: {
      height: 72,
      weight: 200,
      armLength: 32,
      handSize: 9.5,
      wingspan: 76,
      speed: 4.6,
      acceleration: 75,
      agility: 75,
      strength: 75,
      verticalJump: 34,
    },
    skills: {
      accuracy: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      mobility: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      vision: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      tackling: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      catching: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      routeRunning: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      blocking: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      passBlock: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      runBlock: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      passRush: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      runDefense: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      manCoverage: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      zoneCoverage: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      kickPower: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      kickAccuracy: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      tracking: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
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
    contractId: null,
    injuryStatus: injuryStatus
      ? {
          severity: injuryStatus.severity,
          type: injuryStatus.type,
          weeksRemaining: injuryStatus.weeksRemaining,
          isPublic: true,
          lingeringEffect: 0,
        }
      : createHealthyStatus(),
    fatigue: 0,
    morale: 75,
    collegeId: 'college-1',
    draftYear: 2020,
    draftRound: 3,
    draftPick: 80,
  };
}

function createMinimalRoster(teamId: string): Player[] {
  const positions: { position: Position; firstName: string; lastName: string }[] = [
    { position: Position.QB, firstName: 'John', lastName: 'Quarterback' },
    { position: Position.RB, firstName: 'Mike', lastName: 'Runner' },
    { position: Position.RB, firstName: 'Steve', lastName: 'Backup' },
    { position: Position.WR, firstName: 'Tom', lastName: 'Receiver1' },
    { position: Position.WR, firstName: 'Jerry', lastName: 'Receiver2' },
    { position: Position.WR, firstName: 'Larry', lastName: 'Receiver3' },
    { position: Position.TE, firstName: 'Rob', lastName: 'TightEnd' },
    { position: Position.TE, firstName: 'Travis', lastName: 'TightEnd2' },
    { position: Position.LT, firstName: 'Tyron', lastName: 'Tackle' },
    { position: Position.LG, firstName: 'Zack', lastName: 'Guard1' },
    { position: Position.C, firstName: 'Jason', lastName: 'Center' },
    { position: Position.RG, firstName: 'Quenton', lastName: 'Guard2' },
    { position: Position.RT, firstName: 'Lane', lastName: 'Tackle2' },
    { position: Position.DE, firstName: 'Myles', lastName: 'End1' },
    { position: Position.DE, firstName: 'Nick', lastName: 'End2' },
    { position: Position.DT, firstName: 'Aaron', lastName: 'Tackle3' },
    { position: Position.DT, firstName: 'Chris', lastName: 'Tackle4' },
    { position: Position.OLB, firstName: 'TJ', lastName: 'Backer1' },
    { position: Position.OLB, firstName: 'Micah', lastName: 'Backer2' },
    { position: Position.ILB, firstName: 'Fred', lastName: 'Backer3' },
    { position: Position.ILB, firstName: 'Bobby', lastName: 'Backer4' },
    { position: Position.CB, firstName: 'Jalen', lastName: 'Corner1' },
    { position: Position.CB, firstName: 'Sauce', lastName: 'Corner2' },
    { position: Position.CB, firstName: 'Pat', lastName: 'Corner3' },
    { position: Position.FS, firstName: 'Jessie', lastName: 'Safety1' },
    { position: Position.SS, firstName: 'Derwin', lastName: 'Safety2' },
    { position: Position.K, firstName: 'Justin', lastName: 'Kicker' },
    { position: Position.P, firstName: 'Tommy', lastName: 'Punter' },
  ];

  return positions.map((p, index) =>
    createTestPlayer(`${teamId}-player-${index}`, p.position, p.firstName, p.lastName)
  );
}

function createTestTeams(): Team[] {
  return FAKE_CITIES.map((city, index) => ({
    id: `team-${index}`,
    city: city.city,
    nickname: city.nickname,
    abbreviation: city.abbreviation,
    conference: city.conference,
    division: city.division,
    stadium: {
      ...createDefaultStadium(`stadium-${index}`, `team-${index}`, city.city),
      type: city.stadiumType,
      latitude: city.latitude,
    },
    finances: createDefaultTeamFinances(`team-${index}`, 255000),
    staffHierarchy: createEmptyStaffHierarchy(`team-${index}`, 30000),
    ownerId: `owner-${index}`,
    gmId: null,
    rosterPlayerIds: [],
    practiceSquadIds: [],
    injuredReserveIds: [],
    currentRecord: createEmptyTeamRecord(),
    playoffSeed: null,
    isEliminated: false,
    allTimeRecord: { wins: 0, losses: 0, ties: 0 },
    championships: 0,
    lastChampionshipYear: null,
    marketSize: city.marketSize,
    prestige: 50,
    fanbasePassion: 50,
  }));
}

function createMinimalGameState(teams: Team[]): GameState {
  const players: Record<string, Player> = {};
  const coaches: Record<string, Coach> = {};
  const teamsRecord: Record<string, Team> = {};

  teams.forEach((team, teamIndex) => {
    const roster = createMinimalRoster(team.id);
    const rosterIds: string[] = [];

    roster.forEach((player) => {
      players[player.id] = player;
      rosterIds.push(player.id);
    });

    const headCoach = createDefaultCoach(
      `coach-${team.id}`,
      'Head',
      `Coach${teamIndex}`,
      'headCoach'
    );
    coaches[headCoach.id] = headCoach;

    teamsRecord[team.id] = {
      ...team,
      rosterPlayerIds: rosterIds,
    };
  });

  const previousStandings = createDefaultStandings(teams);
  const schedule = generateSeasonSchedule(teams, previousStandings, 2025);

  return {
    saveSlot: 0,
    createdAt: new Date().toISOString(),
    lastSavedAt: new Date().toISOString(),
    userTeamId: teams[0].id,
    userName: 'Test GM',
    league: {
      id: 'league-1',
      name: 'Test League',
      teamIds: teams.map((t) => t.id),
      calendar: {
        currentYear: 2025,
        currentWeek: 1,
        currentPhase: 'regularSeason',
        offseasonPhase: null,
      },
      settings: DEFAULT_LEAGUE_SETTINGS,
      schedule,
      standings: {
        afc: { north: [], south: [], east: [], west: [] },
        nfc: { north: [], south: [], east: [], west: [] },
      },
      playoffBracket: null,
      seasonHistory: [],
      upcomingEvents: [],
    },
    teams: teamsRecord,
    players,
    coaches,
    scouts: {},
    owners: teams.reduce(
      (acc, team) => {
        acc[`owner-${team.id}`] = createDefaultOwner(`owner-${team.id}`, team.id);
        return acc;
      },
      {} as Record<string, ReturnType<typeof createDefaultOwner>>
    ),
    draftPicks: {},
    prospects: {},
    contracts: {},
    careerStats: createDefaultCareerStats(),
    gameSettings: DEFAULT_GAME_SETTINGS,
    newsReadStatus: {},
  };
}

// ============================================
// TESTS
// ============================================

describe('Weekly Game Flow Integration Tests', () => {
  let teams: Team[];
  let gameState: GameState;
  let schedule: SeasonSchedule;

  beforeEach(() => {
    teams = createTestTeams();
    gameState = createMinimalGameState(teams);
    schedule = gameState.league.schedule!;
  });

  describe('complete weekly flow: simulate -> advance -> repeat', () => {
    it('should process multiple weeks in sequence with stats updating', () => {
      for (let week = 1; week <= 5; week++) {
        // Simulate the week
        const results = simulateWeek(week, schedule, gameState, gameState.userTeamId, true);

        // Verify games were played
        expect(results.games.length).toBeGreaterThan(0);
        expect(results.week).toBe(week);

        // Update schedule with completed games
        for (const { game } of results.games) {
          const idx = schedule.regularSeason.findIndex((g) => g.gameId === game.gameId);
          if (idx >= 0) {
            schedule.regularSeason[idx] = game;
          }
        }

        // Advance to next week
        const advancement = advanceWeek(week, gameState);
        expect(advancement.newWeek).toBe(week + 1);
        expect(advancement.fatigueReset).toBe(true);
      }
    }, 60000);

    it('should generate standings that update after each week', () => {
      const standingsHistory: Array<{ week: number; totalWins: number }> = [];

      for (let week = 1; week <= 3; week++) {
        const results = simulateWeek(week, schedule, gameState, gameState.userTeamId, true);

        let totalWins = 0;
        for (const conference of ['afc', 'nfc'] as const) {
          for (const division of ['north', 'south', 'east', 'west'] as const) {
            for (const standing of results.standings[conference][division]) {
              totalWins += standing.wins;
            }
          }
        }

        standingsHistory.push({ week, totalWins });

        for (const { game } of results.games) {
          const idx = schedule.regularSeason.findIndex((g) => g.gameId === game.gameId);
          if (idx >= 0) {
            schedule.regularSeason[idx] = game;
          }
        }
      }

      // Total wins should strictly increase each week
      for (let i = 1; i < standingsHistory.length; i++) {
        expect(standingsHistory[i].totalWins).toBeGreaterThan(standingsHistory[i - 1].totalWins);
      }
    }, 60000);
  });

  describe('injury persistence and healing over time', () => {
    it('should identify recovering players when weeks remaining reaches 1', () => {
      const playerId = `${teams[0].id}-player-0`;

      // Create a 3-week injury
      const injuredState: GameState = {
        ...gameState,
        players: {
          ...gameState.players,
          [playerId]: {
            ...gameState.players[playerId],
            injuryStatus: {
              severity: 'ir',
              type: 'knee',
              weeksRemaining: 3,
              isPublic: true,
              lingeringEffect: 0,
            },
          },
        },
      };

      // Week 1: 3 weeks remaining -> no recovery
      let result = advanceWeek(1, injuredState);
      expect(result.recoveredPlayers).not.toContain(playerId);

      // Week 2: 2 weeks remaining -> no recovery
      const week2State: GameState = {
        ...injuredState,
        players: {
          ...injuredState.players,
          [playerId]: {
            ...injuredState.players[playerId],
            injuryStatus: {
              ...injuredState.players[playerId].injuryStatus,
              weeksRemaining: 2,
            },
          },
        },
      };
      result = advanceWeek(2, week2State);
      expect(result.recoveredPlayers).not.toContain(playerId);

      // Week 3: 1 week remaining -> RECOVERED
      const week3State: GameState = {
        ...injuredState,
        players: {
          ...injuredState.players,
          [playerId]: {
            ...injuredState.players[playerId],
            injuryStatus: {
              ...injuredState.players[playerId].injuryStatus,
              weeksRemaining: 1,
            },
          },
        },
      };
      result = advanceWeek(3, week3State);
      expect(result.recoveredPlayers).toContain(playerId);
    });

    it('should handle multiple injuries with different recovery timelines', () => {
      const player1 = `${teams[0].id}-player-0`;
      const player2 = `${teams[0].id}-player-1`;
      const player3 = `${teams[0].id}-player-2`;
      const player4 = `${teams[0].id}-player-3`;

      const multiInjuryState: GameState = {
        ...gameState,
        players: {
          ...gameState.players,
          [player1]: {
            ...gameState.players[player1],
            injuryStatus: {
              severity: 'out',
              type: 'hamstring',
              weeksRemaining: 1, // Recovers now
              isPublic: true,
              lingeringEffect: 0,
            },
          },
          [player2]: {
            ...gameState.players[player2],
            injuryStatus: {
              severity: 'ir',
              type: 'knee',
              weeksRemaining: 4, // Not recovering
              isPublic: true,
              lingeringEffect: 0,
            },
          },
          [player3]: {
            ...gameState.players[player3],
            injuryStatus: {
              severity: 'questionable',
              type: 'ankle',
              weeksRemaining: 1, // Recovers now
              isPublic: true,
              lingeringEffect: 0,
            },
          },
          [player4]: {
            ...gameState.players[player4],
            injuryStatus: createHealthyStatus(), // Already healthy
          },
        },
      };

      const result = advanceWeek(1, multiInjuryState);

      expect(result.recoveredPlayers).toContain(player1);
      expect(result.recoveredPlayers).toContain(player3);
      expect(result.recoveredPlayers).not.toContain(player2);
      expect(result.recoveredPlayers).not.toContain(player4);
      expect(result.recoveredPlayers).toHaveLength(2);
    });
  });

  describe('WeekProgressionService integration', () => {
    let weekService: WeekProgressionService;

    beforeEach(() => {
      weekService = createWeekProgressionService({ emitEvents: false });
    });

    it('should create correct week flow state for regular week', () => {
      const flowState = weekService.createWeekFlowState(
        1,
        'regularSeason',
        teams[0].id,
        schedule
      );

      expect(flowState.weekNumber).toBe(1);
      expect(flowState.seasonPhase).toBe('regularSeason');
      expect(flowState.phase).toBe('week_start');
      expect(flowState.userGameCompleted).toBe(false);
      expect(flowState.userGameResult).toBeNull();
      expect(flowState.otherGamesCompleted).toBe(0);
    });

    it('should identify user game for non-bye weeks', () => {
      const userTeamId = teams[0].id;
      const byeWeek = schedule.byeWeeks[userTeamId];

      // Find a non-bye week
      const nonByeWeek = byeWeek === 1 ? 2 : 1;

      const flowState = weekService.createWeekFlowState(
        nonByeWeek,
        'regularSeason',
        userTeamId,
        schedule
      );

      expect(flowState.isUserOnBye).toBe(false);
      expect(flowState.userGame).not.toBeNull();
    });

    it('should identify bye week correctly', () => {
      const userTeamId = teams[0].id;
      const byeWeek = schedule.byeWeeks[userTeamId];

      const flowState = weekService.createWeekFlowState(
        byeWeek,
        'regularSeason',
        userTeamId,
        schedule
      );

      expect(flowState.isUserOnBye).toBe(true);
      expect(flowState.userGame).toBeNull();
    });

    it('should separate user game from other games', () => {
      const userTeamId = teams[0].id;
      const byeWeek = schedule.byeWeeks[userTeamId];
      const testWeek = byeWeek === 1 ? 2 : 1;

      const flowState = weekService.createWeekFlowState(
        testWeek,
        'regularSeason',
        userTeamId,
        schedule
      );

      // Other games should not include user's game
      for (const game of flowState.otherGames) {
        expect(game.homeTeamId).not.toBe(userTeamId);
        expect(game.awayTeamId).not.toBe(userTeamId);
      }

      // Total should equal all week games
      const allGames = getWeekGames(schedule, testWeek);
      const expectedOtherGames = allGames.filter(
        (g) => g.homeTeamId !== userTeamId && g.awayTeamId !== userTeamId
      );
      expect(flowState.otherGames).toHaveLength(expectedOtherGames.length);
    });

    it('should not allow advancing week without completing gates', () => {
      const flowState = weekService.createWeekFlowState(
        1,
        'regularSeason',
        teams[0].id,
        schedule
      );

      const { canAdvance, reason } = weekService.canAdvanceWeek(flowState);
      expect(canAdvance).toBe(false);
      expect(reason).toBeDefined();
    });

    it('should advance week and update season phase tracking', () => {
      const { result } = weekService.advanceWeek(
        1,
        'regularSeason',
        gameState
      );

      expect(result.newWeek).toBe(2);
      expect(result.seasonPhase).toBe('regularSeason');
      expect(result.fatigueReset).toBe(true);
      expect(result.seasonEnded).toBe(false);
      expect(result.playoffsStart).toBe(false);
    });

    it('should transition to playoffs after week 18', () => {
      const { result } = weekService.advanceWeek(18, 'regularSeason', gameState);

      expect(result.newWeek).toBe(19);
      expect(result.seasonPhase).toBe('playoffs');
      expect(result.playoffsStart).toBe(true);
    });

    it('should reset fatigue for all players on week advancement', () => {
      // Set some fatigue
      const modifiedPlayers = { ...gameState.players };
      const playerIds = Object.keys(modifiedPlayers).slice(0, 5);
      for (const pid of playerIds) {
        modifiedPlayers[pid] = {
          ...modifiedPlayers[pid],
          fatigue: 50,
        };
      }

      const modifiedState: GameState = {
        ...gameState,
        players: modifiedPlayers,
      };

      const { updatedGameState } = weekService.advanceWeek(1, 'regularSeason', modifiedState);

      // All players should have fatigue reset to 0
      for (const pid of playerIds) {
        expect(updatedGameState.players[pid].fatigue).toBe(0);
      }
    });

    it('should process injury recovery and reset fatigue during advancement', () => {
      const injuredPlayerId = `${teams[0].id}-player-0`;

      const modifiedState: GameState = {
        ...gameState,
        players: {
          ...gameState.players,
          [injuredPlayerId]: {
            ...gameState.players[injuredPlayerId],
            injuryStatus: {
              severity: 'out',
              type: 'hamstring',
              weeksRemaining: 1,
              isPublic: true,
              lingeringEffect: 0,
            },
            fatigue: 75,
          },
        },
      };

      const { result, updatedGameState } = weekService.advanceWeek(
        1,
        'regularSeason',
        modifiedState
      );

      // Should recover
      expect(result.recoveredPlayers).toHaveLength(1);
      expect(result.recoveredPlayers[0].playerId).toBe(injuredPlayerId);

      // Should have severity changed to 'none' and fatigue reset
      expect(updatedGameState.players[injuredPlayerId].injuryStatus.severity).toBe('none');
      expect(updatedGameState.players[injuredPlayerId].injuryStatus.weeksRemaining).toBe(0);
      expect(updatedGameState.players[injuredPlayerId].fatigue).toBe(0);
    });
  });

  describe('bye week handling', () => {
    it('should correctly identify user bye week from schedule', () => {
      const userTeamId = teams[0].id;
      const byeWeek = schedule.byeWeeks[userTeamId];

      expect(isUserOnBye(schedule, byeWeek, userTeamId)).toBe(true);
    });

    it('should return null for user game during bye week', () => {
      const userTeamId = teams[0].id;
      const byeWeek = schedule.byeWeeks[userTeamId];

      const game = getUserTeamGame(schedule, byeWeek, userTeamId);
      expect(game).toBeNull();
    });

    it('should still simulate other games during bye week', () => {
      const userTeamId = teams[0].id;
      const byeWeek = schedule.byeWeeks[userTeamId];

      const results = simulateWeek(byeWeek, schedule, gameState, userTeamId, true);

      // Should have games (from other teams), just not user's
      expect(results.games.length).toBeGreaterThan(0);

      // User's team should not appear in any game
      for (const { game } of results.games) {
        expect(game.homeTeamId).not.toBe(userTeamId);
        expect(game.awayTeamId).not.toBe(userTeamId);
      }
    }, 30000);

    it('should not skip user game when not on bye', () => {
      const userTeamId = teams[0].id;
      const byeWeek = schedule.byeWeeks[userTeamId];
      const nonByeWeek = byeWeek === 1 ? 2 : 1;

      expect(isUserOnBye(schedule, nonByeWeek, userTeamId)).toBe(false);

      const game = getUserTeamGame(schedule, nonByeWeek, userTeamId);
      if (game) {
        expect(
          game.homeTeamId === userTeamId || game.awayTeamId === userTeamId
        ).toBe(true);
      }
    });
  });

  describe('game simulation produces valid results', () => {
    it('should generate injury reports from simulated games', () => {
      const results = simulateWeek(1, schedule, gameState, gameState.userTeamId, true);

      // Injury report should be an array (may be empty)
      expect(Array.isArray(results.injuryReport)).toBe(true);

      // Each injury should have required fields
      for (const injury of results.injuryReport) {
        expect(injury.playerId).toBeDefined();
        expect(injury.playerName).toBeDefined();
        expect(injury.teamId).toBeDefined();
        expect(injury.injury).toBeDefined();
        expect(injury.status).toBeDefined();
        expect(typeof injury.weeksRemaining).toBe('number');
      }
    }, 30000);

    it('should generate news headlines from simulated games', () => {
      const results = simulateWeek(1, schedule, gameState, gameState.userTeamId, true);

      expect(Array.isArray(results.newsHeadlines)).toBe(true);

      for (const headline of results.newsHeadlines) {
        expect(headline.headline).toBeDefined();
        expect(typeof headline.headline).toBe('string');
        expect(['major', 'notable', 'minor']).toContain(headline.importance);
        expect(Array.isArray(headline.teamIds)).toBe(true);
      }
    }, 30000);

    it('should mark simulated games as complete', () => {
      const results = simulateWeek(1, schedule, gameState, gameState.userTeamId, true);

      for (const { game } of results.games) {
        expect(game.isComplete).toBe(true);
        expect(game.homeScore).not.toBeNull();
        expect(game.awayScore).not.toBeNull();
      }
    }, 30000);

    it('should produce game stats with passing and rushing yards', () => {
      const results = simulateWeek(1, schedule, gameState, gameState.userTeamId, true);

      let hasPassing = false;
      let hasRushing = false;

      for (const { result } of results.games) {
        if (result.homeStats.passingYards > 0 || result.awayStats.passingYards > 0) {
          hasPassing = true;
        }
        if (result.homeStats.rushingYards > 0 || result.awayStats.rushingYards > 0) {
          hasRushing = true;
        }
      }

      expect(hasPassing).toBe(true);
      expect(hasRushing).toBe(true);
    }, 30000);
  });

  describe('GameFlowManager week flow integration', () => {
    let manager: GameFlowManager;

    beforeEach(() => {
      manager = createGameFlowManager({ emitEvents: false });
    });

    it('should initialize with correct week flow state', () => {
      manager.initialize(gameState, schedule, teams[0].id, 1, 'regularSeason');

      const state = manager.getState();
      expect(state.weekFlow.weekNumber).toBe(1);
      expect(state.weekFlow.seasonPhase).toBe('regularSeason');
      expect(state.weekFlow.phase).toBe('week_start');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should track game day flow state as null initially', () => {
      manager.initialize(gameState, schedule, teams[0].id, 1, 'regularSeason');

      const gameDayState = manager.getGameDayFlowState();
      expect(gameDayState).toBeNull();
    });

    it('should report cannot advance week at start', () => {
      manager.initialize(gameState, schedule, teams[0].id, 1, 'regularSeason');

      const { canAdvance } = manager.canAdvanceWeek();
      expect(canAdvance).toBe(false);
    });

    it('should handle starting new weeks', () => {
      manager.initialize(gameState, schedule, teams[0].id, 1, 'regularSeason');

      manager.startWeek(2, 'regularSeason');

      const state = manager.getWeekFlowState();
      expect(state.weekNumber).toBe(2);
    });

    it('should reset state on reset()', () => {
      manager.initialize(gameState, schedule, teams[0].id, 5, 'regularSeason');
      manager.reset();

      const state = manager.getState();
      expect(state.weekFlow.weekNumber).toBe(1);
      expect(state.gameDayFlow).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe('week-to-week consistency across simulation', () => {
    it('should not produce negative stats for any team', () => {
      for (let week = 1; week <= 3; week++) {
        const results = simulateWeek(week, schedule, gameState, gameState.userTeamId, true);

        for (const conference of ['afc', 'nfc'] as const) {
          for (const division of ['north', 'south', 'east', 'west'] as const) {
            for (const standing of results.standings[conference][division]) {
              expect(standing.wins).toBeGreaterThanOrEqual(0);
              expect(standing.losses).toBeGreaterThanOrEqual(0);
              expect(standing.ties).toBeGreaterThanOrEqual(0);
              expect(standing.pointsFor).toBeGreaterThanOrEqual(0);
              expect(standing.pointsAgainst).toBeGreaterThanOrEqual(0);
            }
          }
        }

        // Update schedule for next week
        for (const { game } of results.games) {
          const idx = schedule.regularSeason.findIndex((g) => g.gameId === game.gameId);
          if (idx >= 0) {
            schedule.regularSeason[idx] = game;
          }
        }
      }
    }, 60000);

    it('should never schedule a team on their bye week', () => {
      for (let week = 1; week <= 18; week++) {
        const weekGames = getWeekGames(schedule, week);
        const teamsOnBye = Object.entries(schedule.byeWeeks)
          .filter(([, bye]) => bye === week)
          .map(([teamId]) => teamId);

        for (const game of weekGames) {
          for (const byeTeamId of teamsOnBye) {
            expect(game.homeTeamId).not.toBe(byeTeamId);
            expect(game.awayTeamId).not.toBe(byeTeamId);
          }
        }
      }
    });
  });
});
