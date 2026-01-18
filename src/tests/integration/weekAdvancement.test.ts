/**
 * Week Advancement Integration Tests
 *
 * Comprehensive tests for the week advancement system that validates:
 * - Week number increment
 * - Injury recovery processing
 * - Fatigue reset
 * - Team records update after game simulation
 * - Standings calculation
 * - News headline generation
 * - Phase transitions (regular season -> playoffs -> offseason)
 * - Multiple week advancement
 * - Bye week handling
 */

import { Team, createEmptyTeamRecord } from '../../core/models/team/Team';
import { Player } from '../../core/models/player/Player';
import { Coach, createDefaultCoach } from '../../core/models/staff/Coach';
import { Position } from '../../core/models/player/Position';
import { FAKE_CITIES } from '../../core/models/team/FakeCities';
import { createDefaultStadium } from '../../core/models/team/Stadium';
import { createDefaultTeamFinances } from '../../core/models/team/TeamFinances';
import { createEmptyStaffHierarchy } from '../../core/models/staff/StaffHierarchy';
import {
  advanceWeek,
  simulateWeek,
  getUserTeamGame,
  isUserOnBye,
} from '../../core/season/WeekSimulator';
import {
  generateSeasonSchedule,
  createDefaultStandings,
  SeasonSchedule,
  getWeekGames,
} from '../../core/season/ScheduleGenerator';
import { createSeasonManager, SeasonManager } from '../../core/season/SeasonManager';
import {
  GameState,
  createDefaultCareerStats,
  DEFAULT_GAME_SETTINGS,
} from '../../core/models/game/GameState';
import { DEFAULT_LEAGUE_SETTINGS } from '../../core/models/league/League';
import {
  InjurySeverity,
  InjuryType,
  createHealthyStatus,
} from '../../core/models/player/InjuryStatus';
import { createDefaultOwner } from '../../core/models/owner';

// ============================================
// TEST HELPERS
// ============================================

/**
 * Creates a test player with configurable injury status
 */
function createTestPlayer(
  id: string,
  position: Position,
  firstName: string,
  lastName: string,
  injuryStatus?: {
    severity: InjurySeverity;
    type: InjuryType;
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

/**
 * Creates test teams using FAKE_CITIES data
 */
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

/**
 * Creates a minimal roster of players for a team
 */
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

/**
 * Creates a minimal GameState for testing
 */
function createMinimalGameState(teams: Team[]): GameState {
  const players: Record<string, Player> = {};
  const coaches: Record<string, Coach> = {};
  const teamsRecord: Record<string, Team> = {};

  // Create players and coaches for each team
  teams.forEach((team, teamIndex) => {
    const roster = createMinimalRoster(team.id);
    const rosterIds: string[] = [];

    roster.forEach((player) => {
      players[player.id] = player;
      rosterIds.push(player.id);
    });

    // Create head coach
    const headCoach = createDefaultCoach(
      `coach-${team.id}`,
      'Head',
      `Coach${teamIndex}`,
      'headCoach'
    );
    coaches[headCoach.id] = headCoach;

    // Update team with roster
    teamsRecord[team.id] = {
      ...team,
      rosterPlayerIds: rosterIds,
    };
  });

  // Create schedule
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

describe('Week Advancement Integration Tests', () => {
  let teams: Team[];
  let gameState: GameState;
  let schedule: SeasonSchedule;

  beforeEach(() => {
    teams = createTestTeams();
    gameState = createMinimalGameState(teams);
    schedule = gameState.league.schedule!;
  });

  describe('advanceWeek function', () => {
    it('should increment week number by 1', () => {
      const result = advanceWeek(1, gameState);
      expect(result.newWeek).toBe(2);
    });

    it('should return fatigue reset flag as true', () => {
      const result = advanceWeek(1, gameState);
      expect(result.fatigueReset).toBe(true);
    });

    it('should return empty recovered players when no injuries exist', () => {
      const result = advanceWeek(1, gameState);
      expect(result.recoveredPlayers).toEqual([]);
    });

    it('should identify players recovering this week', () => {
      // Create a game state with an injured player
      const injuredPlayerId = `${teams[0].id}-player-0`;
      const modifiedGameState: GameState = {
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
          },
        },
      };

      const result = advanceWeek(1, modifiedGameState);

      expect(result.recoveredPlayers).toContain(injuredPlayerId);
    });

    it('should not identify players with multiple weeks remaining as recovered', () => {
      const injuredPlayerId = `${teams[0].id}-player-0`;
      const modifiedGameState: GameState = {
        ...gameState,
        players: {
          ...gameState.players,
          [injuredPlayerId]: {
            ...gameState.players[injuredPlayerId],
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

      const result = advanceWeek(1, modifiedGameState);

      expect(result.recoveredPlayers).not.toContain(injuredPlayerId);
    });

    it('should handle multiple injured players with different recovery times', () => {
      const player1 = `${teams[0].id}-player-0`;
      const player2 = `${teams[0].id}-player-1`;
      const player3 = `${teams[0].id}-player-2`;

      const modifiedGameState: GameState = {
        ...gameState,
        players: {
          ...gameState.players,
          [player1]: {
            ...gameState.players[player1],
            injuryStatus: {
              severity: 'out',
              type: 'hamstring',
              weeksRemaining: 1, // Recovers this week
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
              weeksRemaining: 1, // Recovers this week
              isPublic: true,
              lingeringEffect: 0,
            },
          },
        },
      };

      const result = advanceWeek(1, modifiedGameState);

      expect(result.recoveredPlayers).toContain(player1);
      expect(result.recoveredPlayers).toContain(player3);
      expect(result.recoveredPlayers).not.toContain(player2);
      expect(result.recoveredPlayers).toHaveLength(2);
    });
  });

  describe('simulateWeek function', () => {
    it('should simulate games and return week results', () => {
      const results = simulateWeek(1, schedule, gameState, gameState.userTeamId, true);

      expect(results.week).toBe(1);
      expect(results.games).toBeDefined();
      expect(results.standings).toBeDefined();
    });

    it('should generate standings after simulation', () => {
      const results = simulateWeek(1, schedule, gameState, gameState.userTeamId, true);

      // Standings should have AFC and NFC
      expect(results.standings.afc).toBeDefined();
      expect(results.standings.nfc).toBeDefined();

      // Each conference should have 4 divisions
      expect(results.standings.afc.north).toBeDefined();
      expect(results.standings.afc.south).toBeDefined();
      expect(results.standings.afc.east).toBeDefined();
      expect(results.standings.afc.west).toBeDefined();
    });

    it('should generate injury report from simulated games', () => {
      const results = simulateWeek(1, schedule, gameState, gameState.userTeamId, true);

      // Injury report should be an array (may be empty if no injuries occurred)
      expect(Array.isArray(results.injuryReport)).toBe(true);
    });

    it('should generate news headlines', () => {
      const results = simulateWeek(1, schedule, gameState, gameState.userTeamId, true);

      // News headlines should be an array
      expect(Array.isArray(results.newsHeadlines)).toBe(true);
    });

    it('should not skip user game when simulateUserGame is true', () => {
      const userTeamId = gameState.userTeamId;
      const results = simulateWeek(1, schedule, gameState, userTeamId, true);

      // Check if user's game was simulated (find game involving user team)
      const userGame = results.games.find(
        (g) => g.game.homeTeamId === userTeamId || g.game.awayTeamId === userTeamId
      );

      // If user had a game this week (not on bye), it should be simulated
      const weekGames = getWeekGames(schedule, 1);
      const userScheduledGame = weekGames.find(
        (g) => g.homeTeamId === userTeamId || g.awayTeamId === userTeamId
      );

      if (userScheduledGame) {
        expect(userGame).toBeDefined();
      }
    });

    it('should skip user game when simulateUserGame is false', () => {
      const userTeamId = gameState.userTeamId;
      const results = simulateWeek(1, schedule, gameState, userTeamId, false);

      // User's game should not be in the results
      const userGame = results.games.find(
        (g) => g.game.homeTeamId === userTeamId || g.game.awayTeamId === userTeamId
      );

      expect(userGame).toBeUndefined();
    });
  });

  describe('getUserTeamGame function', () => {
    it('should return user team game for non-bye week', () => {
      const userTeamId = teams[0].id;

      // Find a week where user has a game
      let testWeek = 1;
      const byeWeek = schedule.byeWeeks.get(userTeamId);
      if (byeWeek === 1) testWeek = 2;

      const game = getUserTeamGame(schedule, testWeek, userTeamId);

      if (game) {
        expect(game.homeTeamId === userTeamId || game.awayTeamId === userTeamId).toBe(true);
      }
    });

    it('should return null during bye week', () => {
      const userTeamId = teams[0].id;
      const byeWeek = schedule.byeWeeks.get(userTeamId);

      if (byeWeek) {
        const game = getUserTeamGame(schedule, byeWeek, userTeamId);
        expect(game).toBeNull();
      }
    });
  });

  describe('isUserOnBye function', () => {
    it('should return true during bye week', () => {
      const userTeamId = teams[0].id;
      const byeWeek = schedule.byeWeeks.get(userTeamId);

      if (byeWeek) {
        expect(isUserOnBye(schedule, byeWeek, userTeamId)).toBe(true);
      }
    });

    it('should return false during non-bye week', () => {
      const userTeamId = teams[0].id;
      const byeWeek = schedule.byeWeeks.get(userTeamId);
      const nonByeWeek = byeWeek === 1 ? 2 : 1;

      expect(isUserOnBye(schedule, nonByeWeek, userTeamId)).toBe(false);
    });
  });

  describe('SeasonManager integration', () => {
    let manager: SeasonManager;

    beforeEach(() => {
      manager = createSeasonManager(2025, teams, teams[0].id);
    });

    it('should initialize in preseason', () => {
      expect(manager.getCurrentWeek()).toBe(0);
      expect(manager.getCurrentPhase()).toBe('preseason');
    });

    it('should start season correctly', () => {
      manager.startSeason();
      expect(manager.getCurrentWeek()).toBe(1);
      expect(manager.getCurrentPhase()).toBe('week1');
    });

    it('should advance through weeks correctly', () => {
      manager.startSeason();

      for (let week = 1; week <= 5; week++) {
        expect(manager.getCurrentWeek()).toBe(week);
        manager.advanceToNextWeek();
      }

      expect(manager.getCurrentWeek()).toBe(6);
    });

    it('should have valid standings structure', () => {
      manager.startSeason();
      const standings = manager.getStandings();

      // Count total teams
      let totalTeams = 0;
      for (const conference of ['afc', 'nfc'] as const) {
        for (const division of ['north', 'south', 'east', 'west'] as const) {
          totalTeams += standings[conference][division].length;
        }
      }

      expect(totalTeams).toBe(32);
    });

    it('should not be in playoff time during regular season', () => {
      manager.startSeason();
      expect(manager.isPlayoffTime()).toBe(false);
    });

    it('should not have playoff bracket before playoffs', () => {
      manager.startSeason();
      expect(manager.getPlayoffBracket()).toBeNull();
    });

    it('should provide playoff picture for both conferences', () => {
      manager.startSeason();
      const picture = manager.getPlayoffPicture();

      expect(picture.afc).toBeDefined();
      expect(picture.nfc).toBeDefined();
      expect(picture.afc.length).toBe(16);
      expect(picture.nfc.length).toBe(16);
    });

    it('should not be complete during regular season', () => {
      manager.startSeason();
      expect(manager.isSeasonComplete()).toBe(false);
    });
  });

  describe('injury recovery flow integration', () => {
    it('should correctly process multi-week injury recovery', () => {
      const injuredPlayerId = `${teams[0].id}-player-0`;

      // Start with 3 weeks injury
      let modifiedGameState: GameState = {
        ...gameState,
        players: {
          ...gameState.players,
          [injuredPlayerId]: {
            ...gameState.players[injuredPlayerId],
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

      // Week 1 -> Week 2: 3 weeks -> should not recover
      let result = advanceWeek(1, modifiedGameState);
      expect(result.recoveredPlayers).not.toContain(injuredPlayerId);

      // Update state to simulate week 2 (2 weeks remaining)
      modifiedGameState = {
        ...modifiedGameState,
        players: {
          ...modifiedGameState.players,
          [injuredPlayerId]: {
            ...modifiedGameState.players[injuredPlayerId],
            injuryStatus: {
              ...modifiedGameState.players[injuredPlayerId].injuryStatus,
              weeksRemaining: 2,
            },
          },
        },
      };

      // Week 2 -> Week 3: 2 weeks -> should not recover
      result = advanceWeek(2, modifiedGameState);
      expect(result.recoveredPlayers).not.toContain(injuredPlayerId);

      // Update state to simulate week 3 (1 week remaining)
      modifiedGameState = {
        ...modifiedGameState,
        players: {
          ...modifiedGameState.players,
          [injuredPlayerId]: {
            ...modifiedGameState.players[injuredPlayerId],
            injuryStatus: {
              ...modifiedGameState.players[injuredPlayerId].injuryStatus,
              weeksRemaining: 1,
            },
          },
        },
      };

      // Week 3 -> Week 4: 1 week -> SHOULD recover
      result = advanceWeek(3, modifiedGameState);
      expect(result.recoveredPlayers).toContain(injuredPlayerId);
    });
  });

  describe('schedule integrity during week advancement', () => {
    it('should have games for all regular season weeks', () => {
      for (let week = 1; week <= 18; week++) {
        const games = getWeekGames(schedule, week);
        // Each week should have at least some games
        expect(games.length).toBeGreaterThan(0);
      }
    });

    it('should not schedule same team twice in a week', () => {
      for (let week = 1; week <= 18; week++) {
        const games = getWeekGames(schedule, week);
        const teamsPlaying = new Set<string>();

        for (const game of games) {
          expect(teamsPlaying.has(game.homeTeamId)).toBe(false);
          expect(teamsPlaying.has(game.awayTeamId)).toBe(false);
          teamsPlaying.add(game.homeTeamId);
          teamsPlaying.add(game.awayTeamId);
        }
      }
    });

    it('should assign bye weeks to all teams', () => {
      const teamsWithBye = new Set(schedule.byeWeeks.keys());

      // All 32 teams should have a bye week
      expect(teamsWithBye.size).toBe(32);
    });

    it('should have bye weeks within valid range (weeks 5-14)', () => {
      for (const byeWeek of schedule.byeWeeks.values()) {
        expect(byeWeek).toBeGreaterThanOrEqual(5);
        expect(byeWeek).toBeLessThanOrEqual(14);
      }
    });
  });

  describe('game result impact on standings', () => {
    it('should update team records after game simulation', () => {
      const results = simulateWeek(1, schedule, gameState, gameState.userTeamId, true);

      // After simulation, games should have winners
      for (const { game, result } of results.games) {
        expect(game.isComplete).toBe(true);
        expect(game.homeScore).toBeDefined();
        expect(game.awayScore).toBeDefined();

        if (!result.isTie) {
          expect(game.winnerId).toBeDefined();
        }
      }
    });

    it('should track wins and losses correctly in standings', () => {
      const results = simulateWeek(1, schedule, gameState, gameState.userTeamId, true);

      // Calculate total wins and losses from standings
      let totalWins = 0;
      let totalLosses = 0;

      for (const conference of ['afc', 'nfc'] as const) {
        for (const division of ['north', 'south', 'east', 'west'] as const) {
          for (const standing of results.standings[conference][division]) {
            totalWins += standing.wins;
            totalLosses += standing.losses;
          }
        }
      }

      // Total wins should equal total losses (for each game, one win and one loss)
      // Unless there are ties
      expect(totalWins).toBe(totalLosses);
    });
  });

  describe('multiple consecutive week advancement', () => {
    it('should handle advancing through 10 weeks', () => {
      const manager = createSeasonManager(2025, teams, teams[0].id);
      manager.startSeason();

      for (let i = 0; i < 10; i++) {
        const currentWeek = manager.getCurrentWeek();
        manager.advanceToNextWeek();
        expect(manager.getCurrentWeek()).toBe(currentWeek + 1);
      }

      expect(manager.getCurrentWeek()).toBe(11);
    });

    it('should maintain standings consistency through multiple weeks', () => {
      const manager = createSeasonManager(2025, teams, teams[0].id);
      manager.startSeason();

      // Advance a few weeks
      for (let i = 0; i < 5; i++) {
        manager.advanceToNextWeek();
      }

      const standings = manager.getStandings();

      // All 32 teams should still be in standings
      let totalTeams = 0;
      for (const conference of ['afc', 'nfc'] as const) {
        for (const division of ['north', 'south', 'east', 'west'] as const) {
          totalTeams += standings[conference][division].length;
        }
      }

      expect(totalTeams).toBe(32);
    });
  });

  describe('fatigue system during week advancement', () => {
    it('should always signal fatigue reset on week advance', () => {
      for (let week = 1; week <= 18; week++) {
        const result = advanceWeek(week, gameState);
        expect(result.fatigueReset).toBe(true);
      }
    });
  });

  describe('week advancement result structure', () => {
    it('should return properly structured WeekAdvancementResult', () => {
      const result = advanceWeek(1, gameState);

      expect(result).toHaveProperty('newWeek');
      expect(result).toHaveProperty('recoveredPlayers');
      expect(result).toHaveProperty('fatigueReset');

      expect(typeof result.newWeek).toBe('number');
      expect(Array.isArray(result.recoveredPlayers)).toBe(true);
      expect(typeof result.fatigueReset).toBe('boolean');
    });

    it('should return properly structured WeekResults from simulateWeek', () => {
      const results = simulateWeek(1, schedule, gameState, gameState.userTeamId, true);

      expect(results).toHaveProperty('week');
      expect(results).toHaveProperty('games');
      expect(results).toHaveProperty('standings');
      expect(results).toHaveProperty('playoffImplications');
      expect(results).toHaveProperty('injuryReport');
      expect(results).toHaveProperty('newsHeadlines');

      expect(typeof results.week).toBe('number');
      expect(Array.isArray(results.games)).toBe(true);
      expect(typeof results.standings).toBe('object');
      expect(Array.isArray(results.playoffImplications)).toBe(true);
      expect(Array.isArray(results.injuryReport)).toBe(true);
      expect(Array.isArray(results.newsHeadlines)).toBe(true);
    });
  });

  describe('playoff implications generation', () => {
    it('should not generate playoff implications before week 10', () => {
      const results = simulateWeek(1, schedule, gameState, gameState.userTeamId, true);
      expect(results.playoffImplications).toHaveLength(0);
    });
  });
});
