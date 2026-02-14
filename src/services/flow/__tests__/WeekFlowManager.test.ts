/**
 * Tests for WeekFlowManager
 * Verifies the week flow state machine, phase transitions, and flag management
 */

import {
  GameState,
  createDefaultCareerStats,
  DEFAULT_GAME_SETTINGS,
} from '@core/models/game/GameState';
import { DEFAULT_LEAGUE_SETTINGS } from '@core/models/league/League';
import { createEmptyTeamRecord } from '@core/models/team/Team';
import { createDefaultOwner } from '@core/models/owner';
import { createDefaultTeamFinances } from '@core/models/team/TeamFinances';
import { createEmptyStaffHierarchy } from '@core/models/staff/StaffHierarchy';
import { createDefaultStadium } from '@core/models/team/Stadium';
import {
  getWeekFlowState,
  updateWeekFlags,
  markPreGameViewed,
  markGameSimulated,
  markPostGameViewed,
  markOtherGamesSimulated,
  markWeekSummaryViewed,
  resetWeekFlags,
  advanceWeek,
  isUserByeWeek,
  getWeekFlowProgress,
  getRemainingSteps,
  DEFAULT_WEEK_FLAGS,
  WeekFlowFlags,
} from '../WeekFlowManager';

// ============================================
// HELPERS
// ============================================

function createMinimalGameState(overrides?: {
  week?: number;
  phase?: 'preseason' | 'regularSeason' | 'playoffs' | 'offseason';
  weekFlags?: WeekFlowFlags;
}): GameState {
  const userTeamId = 'team-user';

  const state: GameState = {
    saveSlot: 0,
    createdAt: new Date().toISOString(),
    lastSavedAt: new Date().toISOString(),
    userTeamId,
    userName: 'Test GM',
    league: {
      id: 'league-1',
      name: 'Test League',
      teamIds: [userTeamId, 'team-opponent'],
      calendar: {
        currentYear: 2025,
        currentWeek: overrides?.week ?? 1,
        currentPhase: overrides?.phase ?? 'regularSeason',
        offseasonPhase: null,
      },
      settings: DEFAULT_LEAGUE_SETTINGS,
      schedule: {
        year: 2025,
        regularSeason: [
          {
            gameId: 'g1',
            week: 1,
            homeTeamId: userTeamId,
            awayTeamId: 'team-opponent',
            isComplete: false,
            homeScore: null,
            awayScore: null,
            winnerId: null,
          } as never,
        ],
        byeWeeks: { [userTeamId]: 10 },
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
    teams: {
      [userTeamId]: {
        id: userTeamId,
        city: 'Test',
        nickname: 'Testers',
        abbreviation: 'TST',
        conference: 'AFC',
        division: 'North',
        stadium: createDefaultStadium('stadium-1', userTeamId, 'Test'),
        finances: createDefaultTeamFinances(userTeamId, 255000),
        staffHierarchy: createEmptyStaffHierarchy(userTeamId, 30000),
        ownerId: 'owner-1',
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
        marketSize: 'large',
        prestige: 50,
        fanbasePassion: 50,
      },
      'team-opponent': {
        id: 'team-opponent',
        city: 'Rival',
        nickname: 'Rivals',
        abbreviation: 'RVL',
        conference: 'AFC',
        division: 'North',
        stadium: createDefaultStadium('stadium-2', 'team-opponent', 'Rival'),
        finances: createDefaultTeamFinances('team-opponent', 255000),
        staffHierarchy: createEmptyStaffHierarchy('team-opponent', 30000),
        ownerId: 'owner-2',
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
        marketSize: 'medium',
        prestige: 50,
        fanbasePassion: 50,
      },
    },
    players: {},
    coaches: {},
    scouts: {},
    owners: {
      'owner-1': createDefaultOwner('owner-1', userTeamId),
      'owner-2': createDefaultOwner('owner-2', 'team-opponent'),
    },
    draftPicks: {},
    prospects: {},
    contracts: {},
    careerStats: createDefaultCareerStats(),
    gameSettings: DEFAULT_GAME_SETTINGS,
    newsReadStatus: {},
  };

  if (overrides?.weekFlags) {
    (state as GameState & { weekFlags?: WeekFlowFlags }).weekFlags = overrides.weekFlags;
  }

  return state;
}

// ============================================
// TESTS
// ============================================

describe('WeekFlowManager', () => {
  describe('determinePhase (via getWeekFlowState)', () => {
    it('should start at pre_game with default flags', () => {
      const state = createMinimalGameState();
      const flow = getWeekFlowState(state);
      expect(flow.phase).toBe('pre_game');
      expect(flow.canAdvanceWeek).toBe(false);
    });

    it('should move to simulating after pre-game viewed', () => {
      const state = createMinimalGameState({
        weekFlags: { ...DEFAULT_WEEK_FLAGS, preGameViewed: true },
      });
      const flow = getWeekFlowState(state);
      expect(flow.phase).toBe('simulating');
    });

    it('should move to post_game after game simulated', () => {
      const state = createMinimalGameState({
        weekFlags: { ...DEFAULT_WEEK_FLAGS, preGameViewed: true, gameSimulated: true },
      });
      const flow = getWeekFlowState(state);
      expect(flow.phase).toBe('post_game');
    });

    it('should move to sim_other after post-game viewed', () => {
      const state = createMinimalGameState({
        weekFlags: {
          ...DEFAULT_WEEK_FLAGS,
          preGameViewed: true,
          gameSimulated: true,
          postGameViewed: true,
        },
      });
      const flow = getWeekFlowState(state);
      expect(flow.phase).toBe('sim_other');
    });

    it('should move to week_summary after other games simulated', () => {
      const state = createMinimalGameState({
        weekFlags: {
          ...DEFAULT_WEEK_FLAGS,
          preGameViewed: true,
          gameSimulated: true,
          postGameViewed: true,
          otherGamesSimulated: true,
        },
      });
      const flow = getWeekFlowState(state);
      expect(flow.phase).toBe('week_summary');
    });

    it('should be ready_to_advance when all flags true', () => {
      const state = createMinimalGameState({
        weekFlags: {
          preGameViewed: true,
          gameSimulated: true,
          postGameViewed: true,
          otherGamesSimulated: true,
          weekSummaryViewed: true,
        },
      });
      const flow = getWeekFlowState(state);
      expect(flow.phase).toBe('ready_to_advance');
      expect(flow.canAdvanceWeek).toBe(true);
    });
  });

  describe('getWeekFlowState metadata', () => {
    it('should return current week from calendar', () => {
      const state = createMinimalGameState({ week: 7 });
      const flow = getWeekFlowState(state);
      expect(flow.currentWeek).toBe(7);
    });

    it('should return current season phase', () => {
      const state = createMinimalGameState({ phase: 'playoffs' });
      const flow = getWeekFlowState(state);
      expect(flow.seasonPhase).toBe('playoffs');
    });
  });

  describe('nextAction', () => {
    it('should suggest pre-game action when in pre_game phase', () => {
      const state = createMinimalGameState();
      const flow = getWeekFlowState(state);
      expect(flow.nextAction.label).toContain('Play Week');
      expect(flow.nextAction.isEnabled).toBe(true);
    });

    it('should suggest simulate action when in simulating phase', () => {
      const state = createMinimalGameState({
        weekFlags: { ...DEFAULT_WEEK_FLAGS, preGameViewed: true },
      });
      const flow = getWeekFlowState(state);
      expect(flow.nextAction.label).toBe('Simulate Game');
    });

    it('should suggest view results when in post_game phase', () => {
      const state = createMinimalGameState({
        weekFlags: { ...DEFAULT_WEEK_FLAGS, preGameViewed: true, gameSimulated: true },
      });
      const flow = getWeekFlowState(state);
      expect(flow.nextAction.label).toBe('View Results');
    });

    it('should suggest advance when ready', () => {
      const state = createMinimalGameState({
        week: 5,
        weekFlags: {
          preGameViewed: true,
          gameSimulated: true,
          postGameViewed: true,
          otherGamesSimulated: true,
          weekSummaryViewed: true,
        },
      });
      const flow = getWeekFlowState(state);
      expect(flow.nextAction.label).toContain('Advance to Week 6');
      expect(flow.nextAction.type).toBe('success');
    });
  });

  describe('flag update functions', () => {
    it('markPreGameViewed should set preGameViewed', () => {
      const state = createMinimalGameState();
      const updated = markPreGameViewed(state);
      const flow = getWeekFlowState(updated);
      expect(flow.flags.preGameViewed).toBe(true);
      expect(flow.phase).toBe('simulating');
    });

    it('markGameSimulated should set gameSimulated', () => {
      let state = createMinimalGameState();
      state = markPreGameViewed(state);
      state = markGameSimulated(state);
      const flow = getWeekFlowState(state);
      expect(flow.flags.gameSimulated).toBe(true);
      expect(flow.phase).toBe('post_game');
    });

    it('markPostGameViewed should set postGameViewed', () => {
      let state = createMinimalGameState();
      state = markPreGameViewed(state);
      state = markGameSimulated(state);
      state = markPostGameViewed(state);
      const flow = getWeekFlowState(state);
      expect(flow.flags.postGameViewed).toBe(true);
      expect(flow.phase).toBe('sim_other');
    });

    it('markOtherGamesSimulated should set otherGamesSimulated', () => {
      let state = createMinimalGameState();
      state = markPreGameViewed(state);
      state = markGameSimulated(state);
      state = markPostGameViewed(state);
      state = markOtherGamesSimulated(state);
      const flow = getWeekFlowState(state);
      expect(flow.flags.otherGamesSimulated).toBe(true);
      expect(flow.phase).toBe('week_summary');
    });

    it('markWeekSummaryViewed should set weekSummaryViewed', () => {
      let state = createMinimalGameState();
      state = markPreGameViewed(state);
      state = markGameSimulated(state);
      state = markPostGameViewed(state);
      state = markOtherGamesSimulated(state);
      state = markWeekSummaryViewed(state);
      const flow = getWeekFlowState(state);
      expect(flow.flags.weekSummaryViewed).toBe(true);
      expect(flow.phase).toBe('ready_to_advance');
      expect(flow.canAdvanceWeek).toBe(true);
    });

    it('should complete full state machine cycle', () => {
      let state = createMinimalGameState();

      // Step through entire flow
      expect(getWeekFlowState(state).phase).toBe('pre_game');

      state = markPreGameViewed(state);
      expect(getWeekFlowState(state).phase).toBe('simulating');

      state = markGameSimulated(state);
      expect(getWeekFlowState(state).phase).toBe('post_game');

      state = markPostGameViewed(state);
      expect(getWeekFlowState(state).phase).toBe('sim_other');

      state = markOtherGamesSimulated(state);
      expect(getWeekFlowState(state).phase).toBe('week_summary');

      state = markWeekSummaryViewed(state);
      expect(getWeekFlowState(state).phase).toBe('ready_to_advance');
      expect(getWeekFlowState(state).canAdvanceWeek).toBe(true);
    });
  });

  describe('updateWeekFlags', () => {
    it('should update only specified flags', () => {
      const state = createMinimalGameState();
      const updated = updateWeekFlags(state, { preGameViewed: true, gameSimulated: true });
      const flow = getWeekFlowState(updated);
      expect(flow.flags.preGameViewed).toBe(true);
      expect(flow.flags.gameSimulated).toBe(true);
      expect(flow.flags.postGameViewed).toBe(false);
    });

    it('should preserve existing flags when updating', () => {
      let state = createMinimalGameState();
      state = updateWeekFlags(state, { preGameViewed: true });
      state = updateWeekFlags(state, { gameSimulated: true });
      const flow = getWeekFlowState(state);
      expect(flow.flags.preGameViewed).toBe(true);
      expect(flow.flags.gameSimulated).toBe(true);
    });
  });

  describe('resetWeekFlags', () => {
    it('should reset all flags to false', () => {
      let state = createMinimalGameState();
      state = markPreGameViewed(state);
      state = markGameSimulated(state);
      state = markPostGameViewed(state);

      state = resetWeekFlags(state);
      const flow = getWeekFlowState(state);
      expect(flow.flags).toEqual(DEFAULT_WEEK_FLAGS);
      expect(flow.phase).toBe('pre_game');
    });
  });

  describe('advanceWeek', () => {
    it('should return null if not ready to advance', () => {
      const state = createMinimalGameState();
      const result = advanceWeek(state);
      expect(result).toBeNull();
    });

    it('should advance week when all flags are set', () => {
      let state = createMinimalGameState({ week: 3 });
      state = markPreGameViewed(state);
      state = markGameSimulated(state);
      state = markPostGameViewed(state);
      state = markOtherGamesSimulated(state);
      state = markWeekSummaryViewed(state);

      const result = advanceWeek(state);
      expect(result).not.toBeNull();
      // Flags should be reset for new week
      const flow = getWeekFlowState(result!);
      expect(flow.flags).toEqual(DEFAULT_WEEK_FLAGS);
    });
  });

  describe('isUserByeWeek', () => {
    it('should return true during bye week', () => {
      const state = createMinimalGameState({ week: 10 });
      expect(isUserByeWeek(state)).toBe(true);
    });

    it('should return false during non-bye week', () => {
      const state = createMinimalGameState({ week: 1 });
      expect(isUserByeWeek(state)).toBe(false);
    });
  });

  describe('getWeekFlowProgress', () => {
    it('should return 0 for no flags completed', () => {
      expect(getWeekFlowProgress(DEFAULT_WEEK_FLAGS)).toBe(0);
    });

    it('should return 1 for all flags completed', () => {
      const flags: WeekFlowFlags = {
        preGameViewed: true,
        gameSimulated: true,
        postGameViewed: true,
        otherGamesSimulated: true,
        weekSummaryViewed: true,
      };
      expect(getWeekFlowProgress(flags)).toBe(1);
    });

    it('should return 0.2 for one flag completed', () => {
      const flags: WeekFlowFlags = {
        ...DEFAULT_WEEK_FLAGS,
        preGameViewed: true,
      };
      expect(getWeekFlowProgress(flags)).toBeCloseTo(0.2);
    });

    it('should return 0.6 for three flags completed', () => {
      const flags: WeekFlowFlags = {
        preGameViewed: true,
        gameSimulated: true,
        postGameViewed: true,
        otherGamesSimulated: false,
        weekSummaryViewed: false,
      };
      expect(getWeekFlowProgress(flags)).toBeCloseTo(0.6);
    });
  });

  describe('getRemainingSteps', () => {
    it('should return all 5 steps when no flags set', () => {
      const remaining = getRemainingSteps(DEFAULT_WEEK_FLAGS);
      expect(remaining).toHaveLength(5);
    });

    it('should return 0 steps when all flags set', () => {
      const flags: WeekFlowFlags = {
        preGameViewed: true,
        gameSimulated: true,
        postGameViewed: true,
        otherGamesSimulated: true,
        weekSummaryViewed: true,
      };
      expect(getRemainingSteps(flags)).toHaveLength(0);
    });

    it('should return correct remaining steps', () => {
      const flags: WeekFlowFlags = {
        preGameViewed: true,
        gameSimulated: true,
        postGameViewed: false,
        otherGamesSimulated: false,
        weekSummaryViewed: false,
      };
      const remaining = getRemainingSteps(flags);
      expect(remaining).toHaveLength(3);
      expect(remaining).toContain('View results');
      expect(remaining).toContain('Simulate other games');
      expect(remaining).toContain('Review week summary');
    });
  });

  describe('immutability', () => {
    it('markPreGameViewed should not mutate the original state', () => {
      const state = createMinimalGameState();
      const original = JSON.parse(JSON.stringify(state));

      markPreGameViewed(state);

      expect(state).toEqual(original);
    });

    it('resetWeekFlags should not mutate the original state', () => {
      let state = createMinimalGameState();
      state = markPreGameViewed(state);
      const snapshot = JSON.parse(JSON.stringify(state));

      resetWeekFlags(state);

      expect(state).toEqual(snapshot);
    });
  });
});
