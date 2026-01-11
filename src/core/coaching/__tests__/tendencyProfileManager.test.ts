/**
 * Tests for Tendency Profile Manager
 */

import {
  generateOffensiveTendencies,
  generateDefensiveTendencies,
  calculateAdjustedOffensiveTendencies,
  calculateAdjustedDefensiveTendencies,
  calculatePlayCallProbabilities,
  calculateDefensiveCallProbabilities,
  getTendencyDescriptionForUI,
  validateTendencyProfile,
  calculateTendencySimilarity,
  GameStateContext,
  TendencyGenerationFactors,
} from '../TendencyProfileManager';
import {
  OffensiveTendencies,
  DefensiveTendencies,
  createDefaultOffensiveTendencies,
  createDefaultDefensiveTendencies,
} from '../../models/staff/CoordinatorTendencies';

// Helper to create game state context
function createTestGameState(overrides: Partial<GameStateContext> = {}): GameStateContext {
  return {
    down: 1,
    distance: 10,
    fieldPosition: 25,
    scoreDifferential: 0,
    timeRemaining: 900,
    quarter: 1,
    isRedZone: false,
    isTwoMinuteWarning: false,
    weather: {
      precipitation: 'none',
      wind: 5,
      temperature: 70,
    },
    ...overrides,
  };
}

// Helper to create tendency generation factors
function createTestFactors(overrides: Partial<TendencyGenerationFactors> = {}): TendencyGenerationFactors {
  return {
    treeName: 'belichick',
    treePhilosophy: {
      offensiveTendency: 'balanced',
      defensiveTendency: 'balanced',
      riskTolerance: 'balanced',
    },
    personalityType: 'analytical',
    yearsExperience: 10,
    ...overrides,
  };
}

describe('Tendency Profile Manager', () => {
  describe('generateOffensiveTendencies', () => {
    it('should generate valid offensive tendencies', () => {
      const factors = createTestFactors();
      const tendencies = generateOffensiveTendencies(factors);

      expect(tendencies.runPassSplit.run + tendencies.runPassSplit.pass).toBe(100);
      expect(tendencies.playActionRate).toBeGreaterThanOrEqual(5);
      expect(tendencies.playActionRate).toBeLessThanOrEqual(50);
      expect(tendencies.deepShotRate).toBeGreaterThanOrEqual(5);
      expect(tendencies.deepShotRate).toBeLessThanOrEqual(40);
    });

    it('should generate pass-heavy tendencies for walsh tree', () => {
      const factors = createTestFactors({ treeName: 'walsh' });
      const tendencies = generateOffensiveTendencies(factors);

      expect(tendencies.runPassSplit.pass).toBeGreaterThan(tendencies.runPassSplit.run);
    });

    it('should generate run-heavy tendencies for parcells tree', () => {
      const factors = createTestFactors({ treeName: 'parcells' });
      const tendencies = generateOffensiveTendencies(factors);

      expect(tendencies.runPassSplit.run).toBeGreaterThanOrEqual(45);
    });

    it('should generate aggressive tendencies for aggressive personality', () => {
      const factors = createTestFactors({ personalityType: 'aggressive' });
      const tendencies = generateOffensiveTendencies(factors);

      expect(tendencies.fourthDownAggressiveness).toBe('aggressive');
      expect(tendencies.tempoPreference).toBe('uptempo');
    });

    it('should generate conservative tendencies for conservative personality', () => {
      const factors = createTestFactors({ personalityType: 'conservative' });
      const tendencies = generateOffensiveTendencies(factors);

      expect(tendencies.fourthDownAggressiveness).toBe('conservative');
      expect(tendencies.tempoPreference).toBe('slow');
    });

    it('should respect high risk tolerance philosophy', () => {
      const factors = createTestFactors({
        treePhilosophy: {
          offensiveTendency: 'balanced',
          defensiveTendency: 'balanced',
          riskTolerance: 'aggressive',
        },
      });
      const tendencies = generateOffensiveTendencies(factors);

      expect(tendencies.fourthDownAggressiveness).toBe('aggressive');
    });
  });

  describe('generateDefensiveTendencies', () => {
    it('should generate valid defensive tendencies', () => {
      const factors = createTestFactors();
      const tendencies = generateDefensiveTendencies(factors);

      expect(tendencies.blitzRate).toBeGreaterThanOrEqual(10);
      expect(tendencies.blitzRate).toBeLessThanOrEqual(50);
      expect(tendencies.manCoverageRate).toBeGreaterThanOrEqual(20);
      expect(tendencies.manCoverageRate).toBeLessThanOrEqual(80);
      expect(tendencies.pressRate).toBeGreaterThanOrEqual(20);
      expect(tendencies.pressRate).toBeLessThanOrEqual(80);
    });

    it('should generate 4-3 base for dungy tree (tampa-2 style)', () => {
      const factors = createTestFactors({ treeName: 'dungy' });
      const tendencies = generateDefensiveTendencies(factors);

      expect(tendencies.baseFormation).toBe('4-3');
      expect(tendencies.blitzRate).toBeLessThan(30); // Tampa-2 is less blitz-heavy
    });

    it('should generate hybrid for belichick tree', () => {
      const factors = createTestFactors({ treeName: 'belichick' });
      const tendencies = generateDefensiveTendencies(factors);

      expect(tendencies.baseFormation).toBe('hybrid');
    });

    it('should generate blitz-heavy for aggressive personality', () => {
      const factors = createTestFactors({ personalityType: 'aggressive' });
      const tendencies = generateDefensiveTendencies(factors);

      expect(tendencies.blitzRate).toBeGreaterThan(25);
      expect(tendencies.situational.twoMinuteDrill).toBe('blitz');
    });

    it('should generate conservative for conservative personality', () => {
      const factors = createTestFactors({ personalityType: 'conservative' });
      const tendencies = generateDefensiveTendencies(factors);

      expect(tendencies.blitzRate).toBeLessThan(30);
      expect(tendencies.situational.twoMinuteDrill).toBe('prevent');
    });
  });

  describe('calculateAdjustedOffensiveTendencies', () => {
    it('should increase run rate when winning big', () => {
      const tendencies = createDefaultOffensiveTendencies();
      const context = createTestGameState({ scoreDifferential: 17 });

      const adjusted = calculateAdjustedOffensiveTendencies(tendencies, context);

      expect(adjusted.effectiveRunRate).toBeGreaterThan(tendencies.runPassSplit.run);
    });

    it('should decrease run rate when losing big', () => {
      const tendencies = createDefaultOffensiveTendencies();
      const context = createTestGameState({ scoreDifferential: -17 });

      const adjusted = calculateAdjustedOffensiveTendencies(tendencies, context);

      expect(adjusted.effectiveRunRate).toBeLessThan(tendencies.runPassSplit.run);
    });

    it('should increase run rate in bad weather', () => {
      const tendencies = createDefaultOffensiveTendencies();
      const context = createTestGameState({
        weather: { precipitation: 'rain', wind: 20, temperature: 50 },
      });

      const adjusted = calculateAdjustedOffensiveTendencies(tendencies, context);

      expect(adjusted.effectiveRunRate).toBeGreaterThan(tendencies.runPassSplit.run);
      expect(adjusted.effectiveDeepRate).toBeLessThan(tendencies.deepShotRate);
    });

    it('should reduce run rate during two-minute drill', () => {
      const tendencies = createDefaultOffensiveTendencies();
      const context = createTestGameState({
        isTwoMinuteWarning: true,
        scoreDifferential: -3,
      });

      const adjusted = calculateAdjustedOffensiveTendencies(tendencies, context);

      expect(adjusted.effectiveRunRate).toBeLessThan(tendencies.runPassSplit.run);
    });

    it('should reduce deep shots in red zone', () => {
      const tendencies = createDefaultOffensiveTendencies();
      const context = createTestGameState({ isRedZone: true, fieldPosition: 85 });

      const adjusted = calculateAdjustedOffensiveTendencies(tendencies, context);

      expect(adjusted.effectiveDeepRate).toBeLessThan(tendencies.deepShotRate);
    });
  });

  describe('calculateAdjustedDefensiveTendencies', () => {
    it('should increase blitz rate in red zone for aggressive defense', () => {
      const tendencies: DefensiveTendencies = {
        ...createDefaultDefensiveTendencies(),
        situational: {
          redZone: 'aggressive',
          twoMinuteDrill: 'normal',
          thirdAndLong: 'balanced',
        },
      };
      const context = createTestGameState({ isRedZone: true, fieldPosition: 85 });

      const adjusted = calculateAdjustedDefensiveTendencies(tendencies, context);

      expect(adjusted.effectiveBlitzRate).toBeGreaterThan(tendencies.blitzRate);
    });

    it('should decrease blitz rate during two-minute drill with prevent', () => {
      const tendencies: DefensiveTendencies = {
        ...createDefaultDefensiveTendencies(),
        situational: {
          redZone: 'aggressive',
          twoMinuteDrill: 'prevent',
          thirdAndLong: 'balanced',
        },
      };
      const context = createTestGameState({ isTwoMinuteWarning: true });

      const adjusted = calculateAdjustedDefensiveTendencies(tendencies, context);

      expect(adjusted.effectiveBlitzRate).toBeLessThan(tendencies.blitzRate);
      expect(adjusted.effectiveManRate).toBeLessThan(tendencies.manCoverageRate);
    });

    it('should adjust for third and long', () => {
      const tendencies: DefensiveTendencies = {
        ...createDefaultDefensiveTendencies(),
        situational: {
          redZone: 'aggressive',
          twoMinuteDrill: 'normal',
          thirdAndLong: 'blitz',
        },
      };
      const context = createTestGameState({ down: 3, distance: 12 });

      const adjusted = calculateAdjustedDefensiveTendencies(tendencies, context);

      expect(adjusted.effectiveBlitzRate).toBeGreaterThan(tendencies.blitzRate);
    });

    it('should play conservative when winning big', () => {
      const tendencies = createDefaultDefensiveTendencies();
      const context = createTestGameState({ scoreDifferential: 21 });

      const adjusted = calculateAdjustedDefensiveTendencies(tendencies, context);

      expect(adjusted.effectiveBlitzRate).toBeLessThan(tendencies.blitzRate);
    });
  });

  describe('calculatePlayCallProbabilities', () => {
    it('should return probabilities that roughly sum to 1', () => {
      const tendencies = createDefaultOffensiveTendencies();
      const context = createTestGameState();
      const adjusted = calculateAdjustedOffensiveTendencies(tendencies, context);

      const probs = calculatePlayCallProbabilities(adjusted);

      const total =
        probs.run + probs.passShort + probs.passMedium + probs.passDeep + probs.playAction + probs.screen;

      // Allow some tolerance due to calculation methods
      expect(total).toBeGreaterThan(0.9);
      expect(total).toBeLessThanOrEqual(1.1);
    });

    it('should have higher run probability with run-heavy tendencies', () => {
      const tendencies: OffensiveTendencies = {
        ...createDefaultOffensiveTendencies(),
        runPassSplit: { run: 60, pass: 40 },
      };
      const context = createTestGameState();
      const adjusted = calculateAdjustedOffensiveTendencies(tendencies, context);

      const probs = calculatePlayCallProbabilities(adjusted);

      expect(probs.run).toBeGreaterThan(0.5);
    });
  });

  describe('calculateDefensiveCallProbabilities', () => {
    it('should return valid probabilities', () => {
      const tendencies = createDefaultDefensiveTendencies();
      const context = createTestGameState();
      const adjusted = calculateAdjustedDefensiveTendencies(tendencies, context);

      const probs = calculateDefensiveCallProbabilities(adjusted);

      expect(probs.blitz).toBeGreaterThanOrEqual(0);
      expect(probs.blitz).toBeLessThanOrEqual(1);
      expect(probs.manCoverage).toBeGreaterThanOrEqual(0);
      expect(probs.manCoverage).toBeLessThanOrEqual(1);
      expect(probs.zoneCoverage).toBeCloseTo(1 - probs.manCoverage);
    });
  });

  describe('getTendencyDescriptionForUI', () => {
    it('should return qualitative description for offensive tendencies', () => {
      const tendencies = createDefaultOffensiveTendencies();

      const description = getTendencyDescriptionForUI(tendencies);

      expect(description.overall).toBeDefined();
      expect(description.runPassBalance).toBeDefined();
      expect(description.aggressiveness).toBeDefined();
      expect(Array.isArray(description.specialTraits)).toBe(true);
    });

    it('should return qualitative description for defensive tendencies', () => {
      const tendencies = createDefaultDefensiveTendencies();

      const description = getTendencyDescriptionForUI(tendencies);

      expect(description.overall).toBeDefined();
      expect(description.runPassBalance).toBeDefined();
      expect(description.aggressiveness).toBeDefined();
    });

    it('should not expose raw numbers', () => {
      const tendencies: OffensiveTendencies = {
        ...createDefaultOffensiveTendencies(),
        runPassSplit: { run: 65, pass: 35 },
        playActionRate: 35,
      };

      const description = getTendencyDescriptionForUI(tendencies);

      // Description should be qualitative, not contain specific percentages
      expect(description.overall).not.toContain('65');
      expect(description.overall).not.toContain('35%');
    });
  });

  describe('validateTendencyProfile', () => {
    it('should validate correct offensive tendencies', () => {
      const tendencies = createDefaultOffensiveTendencies();
      expect(validateTendencyProfile(tendencies)).toBe(true);
    });

    it('should validate correct defensive tendencies', () => {
      const tendencies = createDefaultDefensiveTendencies();
      expect(validateTendencyProfile(tendencies)).toBe(true);
    });
  });

  describe('calculateTendencySimilarity', () => {
    it('should return high similarity for identical tendencies', () => {
      const tendencies1 = createDefaultOffensiveTendencies();
      const tendencies2 = createDefaultOffensiveTendencies();

      const similarity = calculateTendencySimilarity(tendencies1, tendencies2);

      expect(similarity).toBeGreaterThan(90);
    });

    it('should return low similarity for very different tendencies', () => {
      const tendencies1: OffensiveTendencies = {
        ...createDefaultOffensiveTendencies(),
        runPassSplit: { run: 70, pass: 30 },
        fourthDownAggressiveness: 'aggressive',
        tempoPreference: 'uptempo',
      };
      const tendencies2: OffensiveTendencies = {
        ...createDefaultOffensiveTendencies(),
        runPassSplit: { run: 30, pass: 70 },
        fourthDownAggressiveness: 'conservative',
        tempoPreference: 'slow',
      };

      const similarity = calculateTendencySimilarity(tendencies1, tendencies2);

      expect(similarity).toBeLessThan(80);
    });

    it('should return 0 for different tendency types', () => {
      const offensive = createDefaultOffensiveTendencies();
      const defensive = createDefaultDefensiveTendencies();

      const similarity = calculateTendencySimilarity(offensive, defensive);

      expect(similarity).toBe(0);
    });
  });
});
