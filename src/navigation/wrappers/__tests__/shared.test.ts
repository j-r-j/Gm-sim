/**
 * Tests for shared.tsx - processWeekEnd and offseason task helpers
 */

// Mock react-native since shared.tsx imports it for LoadingFallback component
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: { create: (styles: Record<string, unknown>) => styles },
  ActivityIndicator: 'ActivityIndicator',
}));

import {
  GameState,
  createDefaultCareerStats,
  DEFAULT_GAME_SETTINGS,
} from '@core/models/game/GameState';
import { DEFAULT_LEAGUE_SETTINGS } from '@core/models/league/League';
import { Team, createEmptyTeamRecord } from '@core/models/team/Team';
import { Player } from '@core/models/player/Player';
import { Position } from '@core/models/player/Position';
import { createHealthyStatus } from '@core/models/player/InjuryStatus';
import { createDefaultOwner } from '@core/models/owner';
import { createDefaultTeamFinances } from '@core/models/team/TeamFinances';
import { createEmptyStaffHierarchy } from '@core/models/staff/StaffHierarchy';
import { createDefaultStadium } from '@core/models/team/Stadium';
import {
  processWeekEnd,
  tryCompleteOffseasonTask,
  tryCompleteViewTask,
  validateOffseasonPhaseAdvance,
} from '../shared';

// ============================================
// HELPERS
// ============================================

function createTestPlayer(id: string, overrides?: Partial<Player>): Player {
  const baseSkill = { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 };
  return {
    id,
    firstName: 'Test',
    lastName: `Player-${id}`,
    position: Position.QB,
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
    contractId: null,
    injuryStatus: createHealthyStatus(),
    fatigue: 0,
    morale: 75,
    collegeId: 'college-1',
    draftYear: 2020,
    draftRound: 3,
    draftPick: 80,
    ...overrides,
  };
}

function createMinimalGameState(overrides?: {
  week?: number;
  phase?: 'preseason' | 'regularSeason' | 'playoffs' | 'offseason';
  players?: Record<string, Player>;
  teamRecord?: { wins: number; losses: number };
}): GameState {
  const userTeamId = 'team-user';
  const abbreviation = 'TST';
  const ownerKey = `owner-${abbreviation}`;

  const userTeam: Team = {
    id: userTeamId,
    city: 'Test',
    nickname: 'Testers',
    abbreviation,
    conference: 'AFC',
    division: 'North',
    stadium: createDefaultStadium('stadium-1', userTeamId, 'Test'),
    finances: createDefaultTeamFinances(userTeamId, 255000),
    staffHierarchy: createEmptyStaffHierarchy(userTeamId, 30000),
    ownerId: ownerKey,
    gmId: null,
    rosterPlayerIds: [],
    practiceSquadIds: [],
    injuredReserveIds: [],
    currentRecord: {
      ...createEmptyTeamRecord(),
      wins: overrides?.teamRecord?.wins ?? 5,
      losses: overrides?.teamRecord?.losses ?? 3,
    },
    playoffSeed: null,
    isEliminated: false,
    allTimeRecord: { wins: 0, losses: 0, ties: 0 },
    championships: 0,
    lastChampionshipYear: null,
    marketSize: 'large',
    prestige: 50,
    fanbasePassion: 50,
  };

  const owner = createDefaultOwner(ownerKey, userTeamId);

  const players: Record<string, Player> = overrides?.players ?? {
    'player-1': createTestPlayer('player-1'),
    'player-2': createTestPlayer('player-2'),
  };

  return {
    saveSlot: 0,
    createdAt: new Date().toISOString(),
    lastSavedAt: new Date().toISOString(),
    userTeamId,
    userName: 'Test GM',
    league: {
      id: 'league-1',
      name: 'Test League',
      teamIds: [userTeamId],
      calendar: {
        currentYear: 2025,
        currentWeek: overrides?.week ?? 5,
        currentPhase: overrides?.phase ?? 'regularSeason',
        offseasonPhase: null,
      },
      settings: DEFAULT_LEAGUE_SETTINGS,
      schedule: {
        year: 2025,
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
    teams: { [userTeamId]: userTeam },
    players,
    coaches: {},
    scouts: {},
    owners: { [ownerKey]: owner },
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

describe('processWeekEnd', () => {
  describe('week advancement', () => {
    it('should advance the week by 1', () => {
      const state = createMinimalGameState({ week: 5 });
      const result = processWeekEnd(state);
      expect(result.state.league.calendar.currentWeek).toBe(6);
    });

    it('should advance from week 1 to week 2', () => {
      const state = createMinimalGameState({ week: 1 });
      const result = processWeekEnd(state);
      expect(result.state.league.calendar.currentWeek).toBe(2);
    });

    it('should advance from week 17 to week 18 staying in regularSeason', () => {
      const state = createMinimalGameState({ week: 17 });
      const result = processWeekEnd(state);
      expect(result.state.league.calendar.currentWeek).toBe(18);
      expect(result.state.league.calendar.currentPhase).toBe('regularSeason');
    });
  });

  describe('phase transitions', () => {
    it('should transition from regularSeason to playoffs after week 18', () => {
      const state = createMinimalGameState({ week: 18 });
      const result = processWeekEnd(state);
      expect(result.state.league.calendar.currentWeek).toBe(19);
      expect(result.state.league.calendar.currentPhase).toBe('playoffs');
    });

    it('should stay in regularSeason when week <= 18', () => {
      const state = createMinimalGameState({ week: 15 });
      const result = processWeekEnd(state);
      expect(result.state.league.calendar.currentPhase).toBe('regularSeason');
    });

    it('should stay in playoffs phase when already in playoffs', () => {
      const state = createMinimalGameState({ week: 20, phase: 'playoffs' });
      const result = processWeekEnd(state);
      expect(result.state.league.calendar.currentPhase).toBe('playoffs');
    });
  });

  describe('injury recovery', () => {
    it('should recover players with 1 week remaining', () => {
      const injuredPlayer = createTestPlayer('injured-1', {
        injuryStatus: {
          severity: 'out',
          type: 'hamstring',
          weeksRemaining: 1,
          isPublic: true,
          lingeringEffect: 0,
        },
      });

      const state = createMinimalGameState({
        players: { 'injured-1': injuredPlayer },
      });

      const result = processWeekEnd(state);
      expect(result.state.players['injured-1'].injuryStatus.severity).toBe('none');
      expect(result.state.players['injured-1'].injuryStatus.weeksRemaining).toBe(0);
    });

    it('should decrement weeks remaining for players with > 1 week', () => {
      const injuredPlayer = createTestPlayer('injured-1', {
        injuryStatus: {
          severity: 'ir',
          type: 'knee',
          weeksRemaining: 4,
          isPublic: true,
          lingeringEffect: 0,
        },
      });

      const state = createMinimalGameState({
        players: { 'injured-1': injuredPlayer },
      });

      const result = processWeekEnd(state);
      expect(result.state.players['injured-1'].injuryStatus.weeksRemaining).toBe(3);
    });

    it('should handle mix of recovering and still-injured players', () => {
      const players: Record<string, Player> = {
        'recover-now': createTestPlayer('recover-now', {
          injuryStatus: {
            severity: 'out',
            type: 'ankle',
            weeksRemaining: 1,
            isPublic: true,
            lingeringEffect: 0,
          },
        }),
        'still-hurt': createTestPlayer('still-hurt', {
          injuryStatus: {
            severity: 'ir',
            type: 'knee',
            weeksRemaining: 3,
            isPublic: true,
            lingeringEffect: 0,
          },
        }),
        healthy: createTestPlayer('healthy'),
      };

      const state = createMinimalGameState({ players });
      const result = processWeekEnd(state);

      expect(result.state.players['recover-now'].injuryStatus.severity).toBe('none');
      expect(result.state.players['still-hurt'].injuryStatus.weeksRemaining).toBe(2);
      expect(result.state.players['healthy'].injuryStatus.severity).toBe('none');
    });

    it('should not modify healthy players', () => {
      const players: Record<string, Player> = {
        healthy: createTestPlayer('healthy'),
      };
      const state = createMinimalGameState({ players });
      const result = processWeekEnd(state);

      expect(result.state.players['healthy'].injuryStatus.severity).toBe('none');
      expect(result.state.players['healthy'].injuryStatus.weeksRemaining).toBe(0);
    });
  });

  describe('news generation', () => {
    it('should initialize newsFeed if not present', () => {
      const state = createMinimalGameState();
      const result = processWeekEnd(state);
      expect(result.state.newsFeed).toBeDefined();
    });

    it('should preserve existing newsFeed and update it', () => {
      const state = createMinimalGameState();
      const result1 = processWeekEnd(state);
      expect(result1.state.newsFeed).toBeDefined();

      const result2 = processWeekEnd(result1.state);
      expect(result2.state.newsFeed).toBeDefined();
      expect(result2.state.newsFeed!.currentWeek).toBe(
        result1.state.league.calendar.currentWeek + 1
      );
    });

    it('should not generate game news in preseason phase', () => {
      const state = createMinimalGameState({ phase: 'preseason' });
      const result = processWeekEnd(state);
      expect(result.state.newsFeed).toBeDefined();
    });
  });

  describe('patience meter', () => {
    it('should create patience meter if not present during regular season', () => {
      const state = createMinimalGameState({ phase: 'regularSeason' });
      expect(state.patienceMeter).toBeUndefined();

      const result = processWeekEnd(state);
      expect(result.state.patienceMeter).toBeDefined();
    });

    it('should increase patience for winning team (>= 70% win pct)', () => {
      const state = createMinimalGameState({
        phase: 'regularSeason',
        teamRecord: { wins: 10, losses: 2 },
      });

      const result = processWeekEnd(state);
      expect(result.state.patienceMeter).toBeDefined();
      expect(result.state.patienceMeter!.currentValue).toBeGreaterThan(50);
    });

    it('should decrease patience for losing team (< 35% win pct)', () => {
      const state = createMinimalGameState({
        phase: 'regularSeason',
        teamRecord: { wins: 2, losses: 10 },
      });

      const result = processWeekEnd(state);
      expect(result.state.patienceMeter).toBeDefined();
      expect(result.state.patienceMeter!.currentValue).toBeLessThan(50);
    });

    it('should not update patience meter in preseason', () => {
      const state = createMinimalGameState({ phase: 'preseason' });
      const result = processWeekEnd(state);
      expect(result.state.patienceMeter).toBeUndefined();
    });

    it('should update patience meter during playoffs', () => {
      const state = createMinimalGameState({
        phase: 'playoffs',
        week: 19,
        teamRecord: { wins: 12, losses: 5 },
      });

      const result = processWeekEnd(state);
      expect(result.state.patienceMeter).toBeDefined();
    });
  });

  describe('per-week decision resets', () => {
    it('should reset weeklyGamePlan', () => {
      const state = createMinimalGameState();
      (state as unknown as Record<string, unknown>).weeklyGamePlan = { some: 'plan' };

      const result = processWeekEnd(state);
      expect(result.state.weeklyGamePlan).toBeUndefined();
    });

    it('should reset startSitDecisions', () => {
      const state = createMinimalGameState();
      (state as unknown as Record<string, unknown>).startSitDecisions = { some: 'decision' };

      const result = processWeekEnd(state);
      expect(result.state.startSitDecisions).toBeUndefined();
    });

    it('should reset halftimeDecisions', () => {
      const state = createMinimalGameState();
      (state as unknown as Record<string, unknown>).halftimeDecisions = { some: 'adjustment' };

      const result = processWeekEnd(state);
      expect(result.state.halftimeDecisions).toBeUndefined();
    });
  });

  describe('immutability', () => {
    it('should not mutate the original state', () => {
      const state = createMinimalGameState({ week: 5 });
      const originalWeek = state.league.calendar.currentWeek;

      processWeekEnd(state);

      expect(state.league.calendar.currentWeek).toBe(originalWeek);
    });

    it('should return a new state object', () => {
      const state = createMinimalGameState();
      const result = processWeekEnd(state);
      expect(result.state).not.toBe(state);
    });
  });
});

describe('tryCompleteOffseasonTask', () => {
  it('should return null when no offseason state exists', () => {
    const state = createMinimalGameState();
    const result = tryCompleteOffseasonTask(state, 'task-1');
    expect(result).toBeNull();
  });
});

describe('tryCompleteViewTask', () => {
  it('should return null when no offseason state exists', () => {
    const state = createMinimalGameState();
    const result = tryCompleteViewTask(state, 'Roster');
    expect(result).toBeNull();
  });
});

describe('validateOffseasonPhaseAdvance', () => {
  it('should return null when no offseason state exists', () => {
    const state = createMinimalGameState();
    const result = validateOffseasonPhaseAdvance(state);
    expect(result).toBeNull();
  });

  it('should return error when final_cuts roster > 53', () => {
    const state = createMinimalGameState();
    // Create 54 players on the roster
    const playerIds: string[] = [];
    const players: Record<string, Player> = {};
    for (let i = 0; i < 54; i++) {
      const id = `player-${i}`;
      playerIds.push(id);
      players[id] = createTestPlayer(id);
    }
    state.players = players;
    state.teams[state.userTeamId] = {
      ...state.teams[state.userTeamId],
      rosterPlayerIds: playerIds,
    };
    state.offseasonState = {
      year: 2025,
      currentPhase: 'final_cuts',
      phaseDay: 1,
      phaseTasks: {} as OffseasonPhaseTasks,
      events: [],
      completedPhases: [],
      isComplete: false,
      seasonRecap: null,
      draftOrder: [],
      rosterChanges: [],
      signings: [],
      releases: [],
    };

    const result = validateOffseasonPhaseAdvance(state);
    expect(result).not.toBeNull();
    expect(result).toContain('53');
  });
});

// Type helper for offseason tasks
type OffseasonPhaseTasks = GameState['offseasonState'] extends infer T
  ? T extends { phaseTasks: infer PT }
    ? PT
    : never
  : never;
