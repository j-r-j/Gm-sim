/**
 * Tests for Scheme Fit Calculator
 */

import {
  calculateRawSchemeFitScore,
  scoreToFitLevel,
  calculateTransitionPenalty,
  calculateDeterministicTransitionPenalty,
  calculateSchemeFitScore,
  createSchemeFitViewModel,
  calculateAllSchemeFits,
  getBestSchemeFit,
  getWorstSchemeFit,
  compareSchemeFits,
  createPlayerSchemeHistory,
  advanceSchemeHistory,
  changeScheme,
  validateSchemeFitScore,
  getSchemeFitModifier,
  getTeamSchemeFitSummary,
  SCHEME_TRANSITION_PENALTIES,
  SchemeFitScore,
} from '../SchemeFitCalculator';
import { Player } from '../../models/player/Player';
import { Position } from '../../models/player/Position';
import { createDefaultSchemeFits } from '../../models/player/SchemeFit';

// Helper to create a test player
function createTestPlayer(
  position: Position,
  skills: Record<string, number> = {}
): Player {
  const technicalSkills: Record<string, { trueValue: number; perceivedMin: number; perceivedMax: number; maturityAge: number }> = {};

  for (const [name, value] of Object.entries(skills)) {
    technicalSkills[name] = {
      trueValue: value,
      perceivedMin: value - 10,
      perceivedMax: value + 10,
      maturityAge: 27,
    };
  }

  return {
    id: 'test-player-1',
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
    skills: technicalSkills,
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
    collegeId: 'test-college',
    draftYear: 2020,
    draftRound: 2,
    draftPick: 45,
  };
}

describe('Scheme Fit Calculator', () => {
  describe('scoreToFitLevel', () => {
    it('should return perfect for scores >= 90', () => {
      expect(scoreToFitLevel(90)).toBe('perfect');
      expect(scoreToFitLevel(100)).toBe('perfect');
    });

    it('should return good for scores 75-89', () => {
      expect(scoreToFitLevel(75)).toBe('good');
      expect(scoreToFitLevel(89)).toBe('good');
    });

    it('should return neutral for scores 50-74', () => {
      expect(scoreToFitLevel(50)).toBe('neutral');
      expect(scoreToFitLevel(74)).toBe('neutral');
    });

    it('should return poor for scores 25-49', () => {
      expect(scoreToFitLevel(25)).toBe('poor');
      expect(scoreToFitLevel(49)).toBe('poor');
    });

    it('should return terrible for scores < 25', () => {
      expect(scoreToFitLevel(0)).toBe('terrible');
      expect(scoreToFitLevel(24)).toBe('terrible');
    });
  });

  describe('calculateDeterministicTransitionPenalty', () => {
    it('should return 0 for 3+ years in scheme', () => {
      expect(calculateDeterministicTransitionPenalty(3)).toBe(0);
      expect(calculateDeterministicTransitionPenalty(5)).toBe(0);
    });

    it('should return -3.5 for year 2', () => {
      expect(calculateDeterministicTransitionPenalty(2)).toBe(-3.5);
    });

    it('should return -7.5 for year 1', () => {
      expect(calculateDeterministicTransitionPenalty(1)).toBe(-7.5);
      expect(calculateDeterministicTransitionPenalty(0)).toBe(-7.5);
    });
  });

  describe('calculateTransitionPenalty', () => {
    it('should return 0 for 3+ years', () => {
      expect(calculateTransitionPenalty(3)).toBe(0);
    });

    it('should return value in year 2 range', () => {
      const penalty = calculateTransitionPenalty(2);
      expect(penalty).toBeGreaterThanOrEqual(SCHEME_TRANSITION_PENALTIES.year2.min);
      expect(penalty).toBeLessThanOrEqual(SCHEME_TRANSITION_PENALTIES.year2.max);
    });

    it('should return value in year 1 range', () => {
      const penalty = calculateTransitionPenalty(0);
      expect(penalty).toBeGreaterThanOrEqual(SCHEME_TRANSITION_PENALTIES.year1.min);
      expect(penalty).toBeLessThanOrEqual(SCHEME_TRANSITION_PENALTIES.year1.max);
    });
  });

  describe('calculateRawSchemeFitScore', () => {
    it('should return 50 for special teams players', () => {
      const kicker = createTestPlayer(Position.K);
      const score = calculateRawSchemeFitScore(kicker, 'westCoast');
      expect(score).toBe(50);
    });

    it('should return 50 for wrong side of ball', () => {
      const defender = createTestPlayer(Position.CB);
      const score = calculateRawSchemeFitScore(defender, 'westCoast');
      expect(score).toBe(50);
    });

    it('should calculate based on skills for matching positions', () => {
      const qb = createTestPlayer(Position.QB, {
        accuracy: 85,
        decisionMaking: 80,
        presnap: 75,
      });
      const score = calculateRawSchemeFitScore(qb, 'westCoast');
      expect(score).toBeGreaterThan(50);
    });
  });

  describe('calculateSchemeFitScore', () => {
    it('should include transition penalty', () => {
      const qb = createTestPlayer(Position.QB, {
        accuracy: 85,
        decisionMaking: 80,
      });

      const year0Score = calculateSchemeFitScore(qb, 'westCoast', 0);
      const year3Score = calculateSchemeFitScore(qb, 'westCoast', 3);

      expect(year3Score.adjustedScore).toBeGreaterThan(year0Score.adjustedScore);
    });

    it('should have valid structure', () => {
      const qb = createTestPlayer(Position.QB);
      const score = calculateSchemeFitScore(qb, 'westCoast', 1);

      expect(score.scheme).toBe('westCoast');
      expect(score.rawScore).toBeGreaterThanOrEqual(0);
      expect(score.rawScore).toBeLessThanOrEqual(100);
      expect(score.yearsInScheme).toBe(1);
      expect(score.transitionPenalty).toBeLessThanOrEqual(0);
    });
  });

  describe('createSchemeFitViewModel', () => {
    it('should create qualitative view model', () => {
      const score: SchemeFitScore = {
        scheme: 'westCoast',
        rawScore: 85,
        fitLevel: 'good',
        yearsInScheme: 3,
        transitionPenalty: 0,
        adjustedScore: 85,
      };

      const viewModel = createSchemeFitViewModel(score, 'West Coast Offense');

      expect(viewModel.schemeName).toBe('West Coast Offense');
      expect(viewModel.fitDescription).toBe('Good fit');
      expect(viewModel.transitionStatus).toBe('Fully adapted');
    });

    it('should show Learning for year 0-1', () => {
      const score: SchemeFitScore = {
        scheme: 'westCoast',
        rawScore: 85,
        fitLevel: 'good',
        yearsInScheme: 0,
        transitionPenalty: -7.5,
        adjustedScore: 77.5,
      };

      const viewModel = createSchemeFitViewModel(score, 'West Coast Offense');
      expect(viewModel.transitionStatus).toBe('Learning');
    });

    it('should show Adjusting for year 2', () => {
      const score: SchemeFitScore = {
        scheme: 'westCoast',
        rawScore: 85,
        fitLevel: 'good',
        yearsInScheme: 2,
        transitionPenalty: -3.5,
        adjustedScore: 81.5,
      };

      const viewModel = createSchemeFitViewModel(score, 'West Coast Offense');
      expect(viewModel.transitionStatus).toBe('Adjusting');
    });
  });

  describe('calculateAllSchemeFits', () => {
    it('should calculate fits for offensive schemes for offensive players', () => {
      const qb = createTestPlayer(Position.QB);
      const fits = calculateAllSchemeFits(qb);

      expect(fits.length).toBe(6); // 6 offensive schemes
      fits.forEach((fit) => {
        expect(['westCoast', 'airRaid', 'spreadOption', 'powerRun', 'zoneRun', 'playAction']).toContain(fit.scheme);
      });
    });

    it('should calculate fits for defensive schemes for defensive players', () => {
      const cb = createTestPlayer(Position.CB);
      const fits = calculateAllSchemeFits(cb);

      expect(fits.length).toBe(6); // 6 defensive schemes
      fits.forEach((fit) => {
        expect(['fourThreeUnder', 'threeFour', 'coverThree', 'coverTwo', 'manPress', 'blitzHeavy']).toContain(fit.scheme);
      });
    });
  });

  describe('getBestSchemeFit', () => {
    it('should return scheme with highest adjusted score', () => {
      const qb = createTestPlayer(Position.QB, {
        accuracy: 95,
        decisionMaking: 90,
        presnap: 85,
      });

      const bestFit = getBestSchemeFit(qb);
      expect(bestFit).not.toBeNull();

      const allFits = calculateAllSchemeFits(qb);
      const maxScore = Math.max(...allFits.map((f) => f.adjustedScore));
      expect(bestFit!.adjustedScore).toBe(maxScore);
    });

    it('should return null for special teams players', () => {
      const kicker = createTestPlayer(Position.K);
      const bestFit = getBestSchemeFit(kicker);
      expect(bestFit).toBeNull();
    });
  });

  describe('getWorstSchemeFit', () => {
    it('should return scheme with lowest adjusted score', () => {
      const qb = createTestPlayer(Position.QB);

      const worstFit = getWorstSchemeFit(qb);
      expect(worstFit).not.toBeNull();

      const allFits = calculateAllSchemeFits(qb);
      const minScore = Math.min(...allFits.map((f) => f.adjustedScore));
      expect(worstFit!.adjustedScore).toBe(minScore);
    });
  });

  describe('compareSchemeFits', () => {
    it('should compare two scheme fits for a player', () => {
      const qb = createTestPlayer(Position.QB);

      const comparison = compareSchemeFits(qb, 'westCoast', 'airRaid');

      expect(comparison.scheme1Fit.scheme).toBe('westCoast');
      expect(comparison.scheme2Fit.scheme).toBe('airRaid');
      expect(['westCoast', 'airRaid']).toContain(comparison.betterScheme);
    });
  });

  describe('PlayerSchemeHistory', () => {
    it('should create empty history', () => {
      const history = createPlayerSchemeHistory('player-1');

      expect(history.playerId).toBe('player-1');
      expect(history.currentScheme).toBeNull();
      expect(history.yearsInCurrentScheme).toBe(0);
      expect(history.previousSchemes).toEqual([]);
    });

    it('should create history with initial scheme', () => {
      const history = createPlayerSchemeHistory('player-1', 'westCoast');

      expect(history.currentScheme).toBe('westCoast');
      expect(history.yearsInCurrentScheme).toBe(0);
    });

    it('should advance years in scheme', () => {
      let history = createPlayerSchemeHistory('player-1', 'westCoast');
      history = advanceSchemeHistory(history);

      expect(history.yearsInCurrentScheme).toBe(1);
    });

    it('should track scheme changes', () => {
      let history = createPlayerSchemeHistory('player-1', 'westCoast');
      history = advanceSchemeHistory(history);
      history = advanceSchemeHistory(history);
      history = changeScheme(history, 'airRaid');

      expect(history.currentScheme).toBe('airRaid');
      expect(history.yearsInCurrentScheme).toBe(0);
      expect(history.previousSchemes).toHaveLength(1);
      expect(history.previousSchemes[0].scheme).toBe('westCoast');
      expect(history.previousSchemes[0].years).toBe(2);
    });
  });

  describe('validateSchemeFitScore', () => {
    it('should validate correct score', () => {
      const score: SchemeFitScore = {
        scheme: 'westCoast',
        rawScore: 75,
        fitLevel: 'good',
        yearsInScheme: 2,
        transitionPenalty: -3.5,
        adjustedScore: 71.5,
      };

      expect(validateSchemeFitScore(score)).toBe(true);
    });

    it('should reject invalid raw score', () => {
      const score: SchemeFitScore = {
        scheme: 'westCoast',
        rawScore: 150, // Invalid
        fitLevel: 'good',
        yearsInScheme: 2,
        transitionPenalty: -3.5,
        adjustedScore: 71.5,
      };

      expect(validateSchemeFitScore(score)).toBe(false);
    });

    it('should reject positive transition penalty', () => {
      const score: SchemeFitScore = {
        scheme: 'westCoast',
        rawScore: 75,
        fitLevel: 'good',
        yearsInScheme: 2,
        transitionPenalty: 5, // Invalid
        adjustedScore: 80,
      };

      expect(validateSchemeFitScore(score)).toBe(false);
    });
  });

  describe('getSchemeFitModifier', () => {
    it('should return positive modifier for good fits', () => {
      expect(getSchemeFitModifier('perfect')).toBe(0.10);
      expect(getSchemeFitModifier('good')).toBe(0.05);
    });

    it('should return 0 for neutral fit', () => {
      expect(getSchemeFitModifier('neutral')).toBe(0);
    });

    it('should return negative modifier for poor fits', () => {
      expect(getSchemeFitModifier('poor')).toBe(-0.05);
      expect(getSchemeFitModifier('terrible')).toBe(-0.10);
    });
  });

  describe('getTeamSchemeFitSummary', () => {
    it('should summarize team scheme fits', () => {
      const fits: SchemeFitScore[] = [
        { scheme: 'westCoast', rawScore: 90, fitLevel: 'perfect', yearsInScheme: 3, transitionPenalty: 0, adjustedScore: 90 },
        { scheme: 'westCoast', rawScore: 80, fitLevel: 'good', yearsInScheme: 3, transitionPenalty: 0, adjustedScore: 80 },
        { scheme: 'westCoast', rawScore: 60, fitLevel: 'neutral', yearsInScheme: 3, transitionPenalty: 0, adjustedScore: 60 },
        { scheme: 'westCoast', rawScore: 40, fitLevel: 'poor', yearsInScheme: 3, transitionPenalty: 0, adjustedScore: 40 },
      ];

      const summary = getTeamSchemeFitSummary(fits);

      expect(summary.strongFits).toBe(2);
      expect(summary.averageFits).toBe(1);
      expect(summary.weakFits).toBe(1);
      expect(summary.overallDescription).toBeDefined();
    });

    it('should describe excellent fit when majority are strong', () => {
      const fits: SchemeFitScore[] = Array(10).fill(null).map(() => ({
        scheme: 'westCoast' as const,
        rawScore: 90,
        fitLevel: 'perfect' as const,
        yearsInScheme: 3,
        transitionPenalty: 0,
        adjustedScore: 90,
      }));

      const summary = getTeamSchemeFitSummary(fits);
      expect(summary.overallDescription).toContain('Excellent');
    });
  });
});
