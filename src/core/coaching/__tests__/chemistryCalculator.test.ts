/**
 * Tests for Chemistry Calculator
 */

import {
  calculateInitialChemistry,
  calculateChemistryFactors,
  updateChemistryFromEvent,
  createChemistryEvent,
  advanceChemistryHistory,
  getChemistryModifier,
  getChemistryDescription,
  calculateDevelopmentModifier,
  calculateMoraleModifier,
  initializeChemistryHistory,
  getAverageTeamChemistry,
  validateChemistry,
} from '../ChemistryCalculator';
import { Coach, createDefaultCoach } from '../../models/staff/Coach';
import { Player } from '../../models/player/Player';
import { Position } from '../../models/player/Position';
import { createDefaultPersonality } from '../../models/staff/CoachPersonality';
import { createDefaultSchemeFits } from '../../models/player/SchemeFit';

// Helper to create a test coach
function createTestCoach(
  id: string,
  personality:
    | 'analytical'
    | 'aggressive'
    | 'conservative'
    | 'innovative'
    | 'oldSchool'
    | 'playersCoach',
  scheme: 'westCoast' | 'powerRun' | null = null
): Coach {
  const coach = createDefaultCoach(id, 'Test', 'Coach', 'headCoach');
  coach.personality = {
    ...createDefaultPersonality(),
    primary: personality,
    secondary: null,
    ego: 50,
    adaptability: 50,
  };
  coach.scheme = scheme;
  return coach;
}

// Helper to create a minimal test player
function createTestPlayer(id: string, position: Position = Position.QB): Player {
  return {
    id,
    firstName: 'Test',
    lastName: 'Player',
    position,
    age: 25,
    experience: 3,
    physical: {
      height: 72,
      weight: 200,
      armLength: 32,
      handSize: 9.5,
      wingspan: 76,
      speed: 4.5,
      acceleration: 80,
      agility: 80,
      strength: 70,
      verticalJump: 35,
    },
    skills: {},
    hiddenTraits: {
      positive: [],
      negative: [],
      revealedToUser: [],
    },
    itFactor: {
      value: 50,
    },
    consistency: {
      tier: 'average',
      currentStreak: 'neutral',
      streakGamesRemaining: 0,
    },
    schemeFits: createDefaultSchemeFits(),
    roleFit: {
      ceiling: 'solidStarter',
      currentRole: 'solidStarter',
      roleEffectiveness: 75,
    },
    contractId: null,
    injuryStatus: {
      severity: 'none',
      type: 'none',
      weeksRemaining: 0,
      isPublic: true,
      lingeringEffect: 0,
    },
    fatigue: 0,
    morale: 75,
    collegeId: 'college-1',
    draftYear: 2020,
    draftRound: 1,
    draftPick: 1,
  };
}

describe('Chemistry Calculator', () => {
  describe('calculateInitialChemistry', () => {
    it('should calculate positive chemistry for compatible personalities', () => {
      const coach = createTestCoach('coach-1', 'playersCoach');
      const player = createTestPlayer('player-1');

      const chemistry = calculateInitialChemistry(coach, player, 'coachable');

      expect(chemistry).toBeGreaterThanOrEqual(0);
    });

    it('should calculate negative chemistry for conflicting personalities', () => {
      const coach = createTestCoach('coach-1', 'conservative');
      const player = createTestPlayer('player-1');

      const chemistry = calculateInitialChemistry(coach, player, 'me_first');

      expect(chemistry).toBeLessThan(3);
    });

    it('should be within valid range', () => {
      const coach = createTestCoach('coach-1', 'aggressive');
      const player = createTestPlayer('player-1');

      const chemistry = calculateInitialChemistry(coach, player, 'team_first');

      expect(chemistry).toBeGreaterThanOrEqual(-10);
      expect(chemistry).toBeLessThanOrEqual(10);
    });
  });

  describe('calculateChemistryFactors', () => {
    it('should include personality match factor', () => {
      const coach = createTestCoach('coach-1', 'playersCoach');
      const player = createTestPlayer('player-1');

      const factors = calculateChemistryFactors(coach, player, 'coachable', 0);

      expect(factors.personalityMatch).toBeDefined();
      expect(factors.personalityMatch).toBeGreaterThanOrEqual(-5);
      expect(factors.personalityMatch).toBeLessThanOrEqual(5);
    });

    it('should include scheme fit factor when coach has scheme', () => {
      const coach = createTestCoach('coach-1', 'analytical', 'westCoast');
      const player = createTestPlayer('player-1');

      const factors = calculateChemistryFactors(coach, player, 'coachable', 0);

      expect(factors.schemeFit).toBeDefined();
    });

    it('should include time together bonus', () => {
      const coach = createTestCoach('coach-1', 'analytical');
      const player = createTestPlayer('player-1');

      const factorsNew = calculateChemistryFactors(coach, player, 'coachable', 0);
      const factorsVeteran = calculateChemistryFactors(coach, player, 'coachable', 5);

      expect(factorsVeteran.timeTogether).toBeGreaterThan(factorsNew.timeTogether);
    });

    it('should include performance history when provided', () => {
      const coach = createTestCoach('coach-1', 'analytical');
      const player = createTestPlayer('player-1');

      const factorsGood = calculateChemistryFactors(coach, player, 'coachable', 0, 90);
      const factorsBad = calculateChemistryFactors(coach, player, 'coachable', 0, 45);

      expect(factorsGood.performanceHistory).toBeGreaterThan(factorsBad.performanceHistory);
    });
  });

  describe('updateChemistryFromEvent', () => {
    it('should increase chemistry for positive events', () => {
      const event = createChemistryEvent('game_winning_play', 'Player', 'Coach');

      const newChemistry = updateChemistryFromEvent(0, event);

      expect(newChemistry).toBeGreaterThan(0);
    });

    it('should decrease chemistry for negative events', () => {
      const event = createChemistryEvent('costly_mistake', 'Player', 'Coach');

      const newChemistry = updateChemistryFromEvent(0, event);

      expect(newChemistry).toBeLessThan(0);
    });

    it('should clamp chemistry to valid range', () => {
      const positiveEvent = createChemistryEvent('game_winning_play', 'Player', 'Coach');
      const negativeEvent = createChemistryEvent('contract_dispute', 'Player', 'Coach');

      const maxChemistry = updateChemistryFromEvent(10, positiveEvent);
      const minChemistry = updateChemistryFromEvent(-10, negativeEvent);

      expect(maxChemistry).toBeLessThanOrEqual(10);
      expect(minChemistry).toBeGreaterThanOrEqual(-10);
    });
  });

  describe('createChemistryEvent', () => {
    it('should create event with positive change for positive types', () => {
      const event = createChemistryEvent('mentorship_moment', 'Player', 'Coach');

      expect(event.change).toBeGreaterThan(0);
      expect(event.type).toBe('mentorship_moment');
      expect(event.description).toContain('Player');
      expect(event.description).toContain('Coach');
    });

    it('should create event with negative change for negative types', () => {
      const event = createChemistryEvent('contract_dispute', 'Player', 'Coach');

      expect(event.change).toBeLessThan(0);
    });

    it('should include timestamp', () => {
      const event = createChemistryEvent('season_together', 'Player', 'Coach');

      expect(event.timestamp).toBeDefined();
      expect(event.timestamp).toBeGreaterThan(0);
    });
  });

  describe('advanceChemistryHistory', () => {
    it('should increment seasons together', () => {
      const coach = createTestCoach('coach-1', 'analytical');
      const player = createTestPlayer('player-1');
      const history = initializeChemistryHistory(coach, player, 'coachable');

      const advanced = advanceChemistryHistory(history, 75);

      expect(advanced.seasonsTogether).toBe(1);
    });

    it('should add tenure event', () => {
      const coach = createTestCoach('coach-1', 'analytical');
      const player = createTestPlayer('player-1');
      const history = initializeChemistryHistory(coach, player, 'coachable');

      const advanced = advanceChemistryHistory(history, 75);

      expect(advanced.events.length).toBeGreaterThan(history.events.length);
    });

    it('should add performance event for excellent performance', () => {
      const coach = createTestCoach('coach-1', 'analytical');
      const player = createTestPlayer('player-1');
      const history = initializeChemistryHistory(coach, player, 'coachable');

      const advanced = advanceChemistryHistory(history, 90);

      const perfEvent = advanced.events.find((e) => e.type === 'performance_excellent');
      expect(perfEvent).toBeDefined();
    });

    it('should add performance event for poor performance', () => {
      const coach = createTestCoach('coach-1', 'analytical');
      const player = createTestPlayer('player-1');
      const history = initializeChemistryHistory(coach, player, 'coachable');

      const advanced = advanceChemistryHistory(history, 50);

      const perfEvent = advanced.events.find((e) => e.type === 'performance_poor');
      expect(perfEvent).toBeDefined();
    });
  });

  describe('getChemistryModifier', () => {
    it('should return modifier with value and description', () => {
      const coach = createTestCoach('coach-1', 'analytical');
      coach.playerChemistry = { 'player-1': 5 };
      const player = createTestPlayer('player-1');

      const modifier = getChemistryModifier(coach, player);

      expect(modifier.value).toBe(5);
      expect(modifier.description).toBeDefined();
      expect(modifier.description.level).toBeDefined();
    });

    it('should return neutral for no established chemistry', () => {
      const coach = createTestCoach('coach-1', 'analytical');
      const player = createTestPlayer('player-1');

      const modifier = getChemistryModifier(coach, player);

      expect(modifier.value).toBe(0);
      expect(modifier.description.level).toBe('neutral');
    });
  });

  describe('getChemistryDescription', () => {
    it('should return excellent for high chemistry', () => {
      const description = getChemistryDescription(8);

      expect(description.level).toBe('excellent');
    });

    it('should return good for positive chemistry', () => {
      const description = getChemistryDescription(4);

      expect(description.level).toBe('good');
    });

    it('should return neutral for near-zero chemistry', () => {
      const description = getChemistryDescription(0);

      expect(description.level).toBe('neutral');
    });

    it('should return strained for negative chemistry', () => {
      const description = getChemistryDescription(-4);

      expect(description.level).toBe('strained');
    });

    it('should return toxic for very negative chemistry', () => {
      const description = getChemistryDescription(-8);

      expect(description.level).toBe('toxic');
    });

    it('should not expose raw numbers in description', () => {
      const description = getChemistryDescription(7);

      expect(description.description).not.toContain('7');
      expect(description.description).not.toContain('-10');
      expect(description.description).not.toContain('+10');
    });
  });

  describe('calculateDevelopmentModifier', () => {
    it('should return positive modifier for positive chemistry', () => {
      const modifier = calculateDevelopmentModifier(10);

      expect(modifier).toBeGreaterThan(0);
      expect(modifier).toBeCloseTo(0.2);
    });

    it('should return negative modifier for negative chemistry', () => {
      const modifier = calculateDevelopmentModifier(-10);

      expect(modifier).toBeLessThan(0);
      expect(modifier).toBeCloseTo(-0.2);
    });

    it('should return zero for neutral chemistry', () => {
      const modifier = calculateDevelopmentModifier(0);

      expect(modifier).toBe(0);
    });
  });

  describe('calculateMoraleModifier', () => {
    it('should return chemistry value directly', () => {
      expect(calculateMoraleModifier(5)).toBe(5);
      expect(calculateMoraleModifier(-3)).toBe(-3);
      expect(calculateMoraleModifier(0)).toBe(0);
    });
  });

  describe('initializeChemistryHistory', () => {
    it('should create history with initial chemistry', () => {
      const coach = createTestCoach('coach-1', 'playersCoach');
      const player = createTestPlayer('player-1');

      const history = initializeChemistryHistory(coach, player, 'coachable');

      expect(history.playerId).toBe('player-1');
      expect(history.coachId).toBe('coach-1');
      expect(history.seasonsTogether).toBe(0);
      expect(history.currentChemistry).toBe(history.initialChemistry);
      expect(history.events.length).toBe(1);
    });
  });

  describe('getAverageTeamChemistry', () => {
    it('should return neutral for no players', () => {
      const coach = createTestCoach('coach-1', 'analytical');

      const avg = getAverageTeamChemistry(coach, []);

      expect(avg.level).toBe('neutral');
    });

    it('should calculate average chemistry', () => {
      const coach = createTestCoach('coach-1', 'analytical');
      coach.playerChemistry = {
        'player-1': 8,
        'player-2': 6,
        'player-3': 4,
      };

      const avg = getAverageTeamChemistry(coach, ['player-1', 'player-2', 'player-3']);

      expect(avg.level).toBe('good');
    });
  });

  describe('validateChemistry', () => {
    it('should return true for valid chemistry values', () => {
      expect(validateChemistry(0)).toBe(true);
      expect(validateChemistry(10)).toBe(true);
      expect(validateChemistry(-10)).toBe(true);
      expect(validateChemistry(5)).toBe(true);
    });

    it('should return false for invalid chemistry values', () => {
      expect(validateChemistry(11)).toBe(false);
      expect(validateChemistry(-11)).toBe(false);
      expect(validateChemistry(100)).toBe(false);
    });
  });
});
