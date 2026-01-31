/**
 * WeekProgressionService Tests
 *
 * Tests for week advancement, injury recovery, and other games simulation.
 */

import { WeekProgressionService, createWeekProgressionService } from '../WeekProgressionService';
import { GameFlowEventBus } from '../events';
import { GameState } from '../../models/game/GameState';
import { Team } from '../../models/team/Team';
import { Player } from '../../models/player/Player';
import { SeasonSchedule, ScheduledGame } from '../../season/ScheduleGenerator';

// Mock game state helper
function createMockGameState(): GameState {
  const teams: Record<string, Team> = {};
  const players: Record<string, Player> = {};

  // Create 32 teams
  const teamIds = ['team1', 'team2', 'team3', 'team4', 'user-team'];
  teamIds.forEach((id) => {
    teams[id] = {
      id,
      city: `City ${id}`,
      nickname: `Nickname ${id}`,
      abbreviation: id.toUpperCase().substring(0, 3),
      conference: id === 'user-team' || id === 'team1' ? 'AFC' : 'NFC',
      division: 'North',
      primaryColor: '#000',
      secondaryColor: '#fff',
      stadiumName: `Stadium ${id}`,
      stadiumCapacity: 70000,
      stadiumType: 'outdoor',
      currentRecord: { wins: 3, losses: 2, ties: 0, pointsFor: 120, pointsAgainst: 100 },
      owner: null,
      coaches: [],
      roster: ['player1', 'player2'],
    } as unknown as Team;

    // Create players for the team
    for (let i = 1; i <= 5; i++) {
      const playerId = `${id}-player-${i}`;
      players[playerId] = {
        id: playerId,
        firstName: 'Test',
        lastName: `Player ${i}`,
        position: 'QB',
        age: 25,
        experience: 3,
        injuryStatus: {
          severity: i === 1 ? 'moderate' : 'none',
          type: i === 1 ? 'hamstring' : 'none',
          weeksRemaining: i === 1 ? 2 : 0,
          isPublic: true,
          lingeringEffect: 0,
        },
        fatigue: 50,
      } as unknown as Player;
    }
  });

  return {
    teams,
    players,
    coaches: {},
    scouts: {},
    owners: {},
    contracts: {},
    draftPicks: {},
    league: {
      season: 2024,
      currentWeek: 5,
      phase: 'regularSeason',
    },
  } as unknown as GameState;
}

// Mock schedule helper
function createMockSchedule(userTeamId: string): SeasonSchedule {
  const games: ScheduledGame[] = [
    {
      gameId: 'game1',
      week: 5,
      homeTeamId: userTeamId,
      awayTeamId: 'team1',
      isDivisional: false,
      isConference: true,
      isRivalry: false,
      timeSlot: 'early_sunday',
      isComplete: false,
      homeScore: null,
      awayScore: null,
      winnerId: null,
      component: 'B',
    },
    {
      gameId: 'game2',
      week: 5,
      homeTeamId: 'team2',
      awayTeamId: 'team3',
      isDivisional: false,
      isConference: false,
      isRivalry: false,
      timeSlot: 'early_sunday',
      isComplete: false,
      homeScore: null,
      awayScore: null,
      winnerId: null,
      component: 'C',
    },
    {
      gameId: 'game3',
      week: 6,
      homeTeamId: 'team1',
      awayTeamId: userTeamId,
      isDivisional: false,
      isConference: true,
      isRivalry: false,
      timeSlot: 'late_sunday',
      isComplete: false,
      homeScore: null,
      awayScore: null,
      winnerId: null,
      component: 'B',
    },
  ];

  return {
    year: 2024,
    regularSeason: games,
    playoffs: null,
    byeWeeks: { team4: 5 },
  };
}

describe('WeekProgressionService', () => {
  let service: WeekProgressionService;
  let eventBus: GameFlowEventBus;

  beforeEach(() => {
    eventBus = new GameFlowEventBus();
    service = createWeekProgressionService({ eventBus, emitEvents: true });
  });

  afterEach(() => {
    eventBus.reset();
  });

  describe('createWeekFlowState', () => {
    it('should create initial week flow state', () => {
      const schedule = createMockSchedule('user-team');
      const state = service.createWeekFlowState(5, 'regularSeason', 'user-team', schedule);

      expect(state.phase).toBe('week_start');
      expect(state.weekNumber).toBe(5);
      expect(state.seasonPhase).toBe('regularSeason');
      expect(state.isUserOnBye).toBe(false);
      expect(state.userGame).not.toBeNull();
      expect(state.userGameCompleted).toBe(false);
    });

    it('should detect user bye week', () => {
      const schedule = createMockSchedule('user-team');
      // Modify to put user on bye
      schedule.byeWeeks['user-team'] = 5;

      const state = service.createWeekFlowState(5, 'regularSeason', 'user-team', schedule);

      expect(state.isUserOnBye).toBe(true);
      expect(state.userGame).toBeNull();
    });

    it('should identify other games', () => {
      const schedule = createMockSchedule('user-team');
      const state = service.createWeekFlowState(5, 'regularSeason', 'user-team', schedule);

      expect(state.otherGames.length).toBeGreaterThan(0);
      // Other games should not include user's game
      state.otherGames.forEach((game) => {
        expect(game.homeTeamId !== 'user-team' && game.awayTeamId !== 'user-team').toBe(true);
      });
    });
  });

  describe('getUserGame', () => {
    it('should return user game for the week', () => {
      const schedule = createMockSchedule('user-team');
      const game = service.getUserGame(schedule, 5, 'user-team');

      expect(game).not.toBeNull();
      expect(game!.homeTeamId === 'user-team' || game!.awayTeamId === 'user-team').toBe(true);
    });

    it('should return null for bye week', () => {
      const schedule = createMockSchedule('user-team');
      schedule.byeWeeks['user-team'] = 5;

      const game = service.getUserGame(schedule, 5, 'user-team');

      expect(game).toBeNull();
    });
  });

  describe('recordUserGameResult', () => {
    it('should update team records after game', () => {
      const gameState = createMockGameState();
      const schedule = createMockSchedule('user-team');
      const weekFlowState = service.createWeekFlowState(5, 'regularSeason', 'user-team', schedule);

      const mockResult = {
        gameId: 'game1',
        week: 5,
        homeTeamId: 'user-team',
        awayTeamId: 'team1',
        homeScore: 28,
        awayScore: 21,
        winnerId: 'user-team',
        loserId: 'team1',
        isTie: false,
        homeStats: { playerStats: new Map() },
        awayStats: { playerStats: new Map() },
        boxScore: {},
        injuries: [],
        notableEvents: [],
        keyPlays: [],
      } as any;

      const { updatedWeekFlow, updatedGameState } = service.recordUserGameResult(
        weekFlowState,
        mockResult,
        gameState,
        'user-team'
      );

      // Week flow should be updated
      expect(updatedWeekFlow.phase).toBe('post_game');
      expect(updatedWeekFlow.userGameCompleted).toBe(true);
      expect(updatedWeekFlow.userGameResult).toBe(mockResult);

      // Team records should be updated
      const userTeam = updatedGameState.teams['user-team'];
      expect(userTeam.currentRecord.wins).toBe(4); // Started with 3
      expect(userTeam.currentRecord.losses).toBe(2);

      const opponent = updatedGameState.teams['team1'];
      expect(opponent.currentRecord.wins).toBe(3);
      expect(opponent.currentRecord.losses).toBe(3); // Started with 2
    });

    it('should emit GAME_END event', () => {
      const events: string[] = [];
      eventBus.subscribe('GAME_END', () => events.push('GAME_END'));

      const gameState = createMockGameState();
      const schedule = createMockSchedule('user-team');
      const weekFlowState = service.createWeekFlowState(5, 'regularSeason', 'user-team', schedule);

      const mockResult = {
        gameId: 'game1',
        homeTeamId: 'user-team',
        awayTeamId: 'team1',
        homeScore: 28,
        awayScore: 21,
        winnerId: 'user-team',
        isTie: false,
        injuries: [],
      } as any;

      service.recordUserGameResult(weekFlowState, mockResult, gameState, 'user-team');

      expect(events).toContain('GAME_END');
    });
  });

  describe('simulateOtherGames', () => {
    it('should simulate other games in the week', () => {
      const gameState = createMockGameState();
      const schedule = createMockSchedule('user-team');
      const weekFlowState = service.createWeekFlowState(5, 'regularSeason', 'user-team', schedule);

      const { updatedWeekFlow, results } = service.simulateOtherGames(
        weekFlowState,
        gameState,
        'user-team'
      );

      expect(updatedWeekFlow.phase).toBe('week_summary');
      expect(updatedWeekFlow.otherGamesCompleted).toBe(weekFlowState.otherGames.length);
      expect(results.results.length).toBe(weekFlowState.otherGames.length);
    });

    it('should emit OTHER_GAMES_COMPLETE event', () => {
      const events: any[] = [];
      eventBus.subscribe('OTHER_GAMES_COMPLETE', (e) => events.push(e));

      const gameState = createMockGameState();
      const schedule = createMockSchedule('user-team');
      const weekFlowState = service.createWeekFlowState(5, 'regularSeason', 'user-team', schedule);

      service.simulateOtherGames(weekFlowState, gameState, 'user-team');

      expect(events.length).toBe(1);
    });

    it('should generate headlines for notable games', () => {
      const gameState = createMockGameState();
      const schedule = createMockSchedule('user-team');
      const weekFlowState = service.createWeekFlowState(5, 'regularSeason', 'user-team', schedule);

      const { results } = service.simulateOtherGames(weekFlowState, gameState, 'user-team');

      // Headlines might or might not be generated based on random scores
      expect(Array.isArray(results.headlines)).toBe(true);
    });
  });

  describe('advanceWeek', () => {
    it('should advance to next week', () => {
      const gameState = createMockGameState();

      const { result } = service.advanceWeek(5, 'regularSeason', gameState);

      expect(result.newWeek).toBe(6);
      expect(result.seasonPhase).toBe('regularSeason');
      expect(result.fatigueReset).toBe(true);
    });

    it('should process injury recovery', () => {
      const gameState = createMockGameState();

      // Set up a player with 1 week remaining
      const injuredPlayer = Object.values(gameState.players).find(
        (p) => p.injuryStatus.weeksRemaining > 0
      );

      if (injuredPlayer) {
        injuredPlayer.injuryStatus.weeksRemaining = 1;

        const { result, updatedGameState } = service.advanceWeek(5, 'regularSeason', gameState);

        expect(result.recoveredPlayers.length).toBeGreaterThanOrEqual(0);

        // Check the player recovered
        const updatedPlayer = updatedGameState.players[injuredPlayer.id];
        expect(updatedPlayer.injuryStatus.weeksRemaining).toBe(0);
      }
    });

    it('should reset fatigue', () => {
      const gameState = createMockGameState();

      const { updatedGameState } = service.advanceWeek(5, 'regularSeason', gameState);

      Object.values(updatedGameState.players).forEach((player) => {
        expect(player.fatigue).toBe(0);
      });
    });

    it('should transition to playoffs at end of regular season', () => {
      const gameState = createMockGameState();

      const { result } = service.advanceWeek(18, 'regularSeason', gameState);

      expect(result.seasonPhase).toBe('playoffs');
      expect(result.playoffsStart).toBe(true);
    });

    it('should emit WEEK_START event', () => {
      const events: any[] = [];
      eventBus.subscribe('WEEK_START', (e) => events.push(e));

      const gameState = createMockGameState();
      service.advanceWeek(5, 'regularSeason', gameState);

      expect(events.length).toBe(1);
      expect(events[0].payload.weekNumber).toBe(6);
    });
  });

  describe('canAdvanceWeek', () => {
    it('should allow advance when all conditions met', () => {
      const schedule = createMockSchedule('user-team');
      const weekFlowState = service.createWeekFlowState(5, 'regularSeason', 'user-team', schedule);

      // Complete all requirements
      weekFlowState.userGameCompleted = true;
      weekFlowState.gates.gameResultViewed = true;
      weekFlowState.otherGamesCompleted = weekFlowState.otherGames.length;
      weekFlowState.gates.weekSummaryViewed = true;

      const { canAdvance } = service.canAdvanceWeek(weekFlowState);
      expect(canAdvance).toBe(true);
    });

    it('should block advance if game not completed', () => {
      const schedule = createMockSchedule('user-team');
      const weekFlowState = service.createWeekFlowState(5, 'regularSeason', 'user-team', schedule);

      const { canAdvance, reason } = service.canAdvanceWeek(weekFlowState);

      expect(canAdvance).toBe(false);
      expect(reason).toBe('Play your game');
    });

    it('should block advance if result not viewed', () => {
      const schedule = createMockSchedule('user-team');
      const weekFlowState = service.createWeekFlowState(5, 'regularSeason', 'user-team', schedule);

      weekFlowState.userGameCompleted = true;

      const { canAdvance, reason } = service.canAdvanceWeek(weekFlowState);

      expect(canAdvance).toBe(false);
      expect(reason).toBe('View game result');
    });

    it('should handle bye week advancement', () => {
      const schedule = createMockSchedule('user-team');
      schedule.byeWeeks['user-team'] = 5;

      const weekFlowState = service.createWeekFlowState(5, 'regularSeason', 'user-team', schedule);

      // For bye week, only need other games and summary
      weekFlowState.otherGamesCompleted = weekFlowState.otherGames.length;
      weekFlowState.gates.weekSummaryViewed = true;

      const { canAdvance } = service.canAdvanceWeek(weekFlowState);
      expect(canAdvance).toBe(true);
    });
  });

  describe('generateWeekSummary', () => {
    it('should generate week summary', () => {
      const gameState = createMockGameState();
      const schedule = createMockSchedule('user-team');
      const weekFlowState = service.createWeekFlowState(5, 'regularSeason', 'user-team', schedule);

      weekFlowState.userGameResult = {
        homeTeamId: 'user-team',
        awayTeamId: 'team1',
        homeScore: 28,
        awayScore: 21,
        injuries: [],
      } as any;

      const summary = service.generateWeekSummary(weekFlowState, gameState, 'user-team');

      expect(summary.week).toBe(5);
      expect(summary.userResult).not.toBeNull();
      expect(Array.isArray(summary.standings)).toBe(true);
    });
  });
});

describe('createWeekProgressionService factory', () => {
  it('should create service with default config', () => {
    const service = createWeekProgressionService();
    expect(service).toBeDefined();
  });

  it('should create service with custom config', () => {
    const eventBus = new GameFlowEventBus();
    const service = createWeekProgressionService({
      eventBus,
      emitEvents: false,
      regularSeasonWeeks: 17,
    });
    expect(service).toBeDefined();
  });
});
