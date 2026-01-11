/**
 * Tests for Play Calling Integration
 */

import {
  calculateWeatherImpact,
  contextToGameState,
  selectOffensivePlayWithTendencies,
  selectDefensivePlayWithTendencies,
  makeFourthDownDecision,
  determineTwoMinuteMode,
  getPlayTempo,
  getPlayTypeDistribution,
  validatePlayCallingIntegration,
  PlayCallingDecisionContext,
} from '../PlayCallingIntegration';
import { PlayCallContext, createDefaultPlayCallContext } from '../../engine/PlayCaller';
import { Coach, createDefaultCoach } from '../../models/staff/Coach';
import {
  createDefaultOffensiveTendencies,
  createDefaultDefensiveTendencies,
} from '../../models/staff/CoordinatorTendencies';

// Helper to create a test coach with tendencies
function createTestOC(id: string): Coach {
  const coach = createDefaultCoach(id, 'Test', 'OC', 'offensiveCoordinator');
  coach.tendencies = createDefaultOffensiveTendencies();
  return coach;
}

function createTestDC(id: string): Coach {
  const coach = createDefaultCoach(id, 'Test', 'DC', 'defensiveCoordinator');
  coach.tendencies = createDefaultDefensiveTendencies();
  return coach;
}

function createTestHC(id: string): Coach {
  return createDefaultCoach(id, 'Test', 'HC', 'headCoach');
}

// Helper to create decision context
function createDecisionContext(
  overrides: Partial<PlayCallingDecisionContext> = {}
): PlayCallingDecisionContext {
  return {
    offensiveCoordinator: createTestOC('oc-1'),
    defensiveCoordinator: createTestDC('dc-1'),
    headCoach: createTestHC('hc-1'),
    gameContext: createDefaultPlayCallContext(),
    isHometeam: true,
    ...overrides,
  };
}

describe('Play Calling Integration', () => {
  describe('calculateWeatherImpact', () => {
    it('should return no impact for dome games', () => {
      const impact = calculateWeatherImpact({
        temperature: 70,
        precipitation: 'rain',
        wind: 30,
        isDome: true,
      });

      expect(impact.runModifier).toBe(0);
      expect(impact.deepPassModifier).toBe(0);
      expect(impact.description).toContain('Dome');
    });

    it('should increase run modifier for rain', () => {
      const impact = calculateWeatherImpact({
        temperature: 70,
        precipitation: 'rain',
        wind: 5,
        isDome: false,
      });

      expect(impact.runModifier).toBeGreaterThan(0);
      expect(impact.deepPassModifier).toBeLessThan(0);
    });

    it('should have larger impact for snow', () => {
      const rainImpact = calculateWeatherImpact({
        temperature: 35,
        precipitation: 'rain',
        wind: 5,
        isDome: false,
      });

      const snowImpact = calculateWeatherImpact({
        temperature: 25,
        precipitation: 'snow',
        wind: 5,
        isDome: false,
      });

      expect(snowImpact.runModifier).toBeGreaterThan(rainImpact.runModifier);
      expect(snowImpact.deepPassModifier).toBeLessThan(rainImpact.deepPassModifier);
    });

    it('should reduce deep passing in high wind', () => {
      const calmImpact = calculateWeatherImpact({
        temperature: 70,
        precipitation: 'none',
        wind: 5,
        isDome: false,
      });

      const windyImpact = calculateWeatherImpact({
        temperature: 70,
        precipitation: 'none',
        wind: 25,
        isDome: false,
      });

      expect(windyImpact.deepPassModifier).toBeLessThan(calmImpact.deepPassModifier);
    });

    it('should slightly favor run in freezing temperatures', () => {
      const impact = calculateWeatherImpact({
        temperature: 20,
        precipitation: 'none',
        wind: 5,
        isDome: false,
      });

      expect(impact.runModifier).toBeGreaterThan(0);
    });
  });

  describe('contextToGameState', () => {
    it('should convert PlayCallContext to GameStateContext', () => {
      const playCallContext = createDefaultPlayCallContext();
      const gameState = contextToGameState(playCallContext);

      expect(gameState.down).toBe(playCallContext.down);
      expect(gameState.distance).toBe(playCallContext.distance);
      expect(gameState.fieldPosition).toBe(playCallContext.fieldPosition);
      expect(gameState.scoreDifferential).toBe(playCallContext.scoreDifferential);
      expect(gameState.weather.precipitation).toBe(playCallContext.weather.precipitation);
    });
  });

  describe('selectOffensivePlayWithTendencies', () => {
    it('should return valid offensive play call', () => {
      const context = createDecisionContext();

      const result = selectOffensivePlayWithTendencies(context);

      expect(result.playCall).toBeDefined();
      expect(result.playCall.playType).toBeDefined();
      expect(result.playCall.formation).toBeDefined();
      expect(result.playCall.targetPosition).toBeDefined();
    });

    it('should return probabilities', () => {
      const context = createDecisionContext();

      const result = selectOffensivePlayWithTendencies(context);

      expect(result.probabilities.run).toBeGreaterThanOrEqual(0);
      expect(result.probabilities.run).toBeLessThanOrEqual(1);
      expect(result.probabilities.passShort).toBeDefined();
      expect(result.probabilities.passMedium).toBeDefined();
      expect(result.probabilities.passDeep).toBeDefined();
    });

    it('should use default tendencies when no OC', () => {
      const context = createDecisionContext({
        offensiveCoordinator: null,
        headCoach: createTestHC('hc-1'),
      });

      const result = selectOffensivePlayWithTendencies(context);

      expect(result.situationalOverrides).toContain('Using default tendencies');
    });

    it('should track situational overrides', () => {
      const gameContext: PlayCallContext = {
        ...createDefaultPlayCallContext(),
        isRedZone: true,
        isTwoMinuteWarning: true,
      };

      const context = createDecisionContext({ gameContext });

      const result = selectOffensivePlayWithTendencies(context);

      expect(result.situationalOverrides.length).toBeGreaterThan(0);
    });

    it('should apply weather adjustments', () => {
      const gameContext: PlayCallContext = {
        ...createDefaultPlayCallContext(),
        weather: {
          temperature: 30,
          precipitation: 'snow',
          wind: 25,
          isDome: false,
        },
      };

      const context = createDecisionContext({ gameContext });

      const result = selectOffensivePlayWithTendencies(context);

      expect(result.situationalOverrides.some((o) => o.toLowerCase().includes('snow') || o.toLowerCase().includes('wind'))).toBe(true);
    });
  });

  describe('selectDefensivePlayWithTendencies', () => {
    it('should return valid defensive play call', () => {
      const context = createDecisionContext();

      const result = selectDefensivePlayWithTendencies(context, 'shotgun');

      expect(result.playCall).toBeDefined();
      expect(result.playCall.coverage).toBeDefined();
      expect(typeof result.playCall.blitz).toBe('boolean');
      expect(result.playCall.pressRate).toBeDefined();
    });

    it('should return probabilities', () => {
      const context = createDecisionContext();

      const result = selectDefensivePlayWithTendencies(context, 'singleback');

      expect(result.probabilities.blitz).toBeGreaterThanOrEqual(0);
      expect(result.probabilities.blitz).toBeLessThanOrEqual(1);
      expect(result.probabilities.manCoverage).toBeDefined();
      expect(result.probabilities.zoneCoverage).toBeDefined();
    });

    it('should use default tendencies when no DC', () => {
      const context = createDecisionContext({
        defensiveCoordinator: null,
        headCoach: createTestHC('hc-1'),
      });

      const result = selectDefensivePlayWithTendencies(context, 'shotgun');

      expect(result.situationalOverrides).toContain('Using default tendencies');
    });
  });

  describe('makeFourthDownDecision', () => {
    it('should go for it on short yardage in plus territory', () => {
      const gameContext: PlayCallContext = {
        ...createDefaultPlayCallContext(),
        down: 4,
        distance: 1,
        fieldPosition: 65,
      };

      const oc = createTestOC('oc-1');
      if (oc.tendencies && 'fourthDownAggressiveness' in oc.tendencies) {
        oc.tendencies.fourthDownAggressiveness = 'aggressive';
      }

      const context = createDecisionContext({ gameContext, offensiveCoordinator: oc });

      const decision = makeFourthDownDecision(context, 55);

      expect(decision.decision).toBe('go_for_it');
    });

    it('should kick field goal when in range', () => {
      const gameContext: PlayCallContext = {
        ...createDefaultPlayCallContext(),
        down: 4,
        distance: 5,
        fieldPosition: 75, // ~42 yard FG
      };

      const context = createDecisionContext({ gameContext });

      const decision = makeFourthDownDecision(context, 55);

      expect(decision.decision).toBe('field_goal');
    });

    it('should punt when deep in own territory', () => {
      const gameContext: PlayCallContext = {
        ...createDefaultPlayCallContext(),
        down: 4,
        distance: 8,
        fieldPosition: 20,
      };

      const context = createDecisionContext({ gameContext });

      const decision = makeFourthDownDecision(context, 55);

      expect(decision.decision).toBe('punt');
    });

    it('should include confidence and reasoning', () => {
      const gameContext: PlayCallContext = {
        ...createDefaultPlayCallContext(),
        down: 4,
        distance: 3,
        fieldPosition: 50,
      };

      const context = createDecisionContext({ gameContext });

      const decision = makeFourthDownDecision(context, 55);

      expect(['high', 'medium', 'low']).toContain(decision.confidence);
      expect(decision.reasoning).toBeDefined();
      expect(decision.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('determineTwoMinuteMode', () => {
    it('should return clock_kill when winning big', () => {
      const mode = determineTwoMinuteMode(14, 120, 3);

      expect(mode).toBe('clock_kill');
    });

    it('should return balanced when winning slightly', () => {
      const mode = determineTwoMinuteMode(3, 120, 2);

      expect(mode).toBe('balanced');
    });

    it('should return aggressive when losing', () => {
      const mode = determineTwoMinuteMode(-7, 120, 2);

      expect(mode).toBe('aggressive');
    });

    it('should return aggressive when tied', () => {
      const mode = determineTwoMinuteMode(0, 120, 3);

      expect(mode).toBe('aggressive');
    });
  });

  describe('getPlayTempo', () => {
    it('should return hurry_up at end of half when losing', () => {
      const tendencies = createDefaultOffensiveTendencies();

      const tempo = getPlayTempo(tendencies, -7, 90, 4);

      expect(tempo).toBe('hurry_up');
    });

    it('should return slow at end of half when winning big', () => {
      const tendencies = createDefaultOffensiveTendencies();

      const tempo = getPlayTempo(tendencies, 14, 90, 4);

      expect(tempo).toBe('slow');
    });

    it('should respect uptempo preference', () => {
      const tendencies = {
        ...createDefaultOffensiveTendencies(),
        tempoPreference: 'uptempo' as const,
      };

      const tempo = getPlayTempo(tendencies, 0, 900, 1);

      expect(tempo).toBe('hurry_up');
    });

    it('should respect slow preference', () => {
      const tendencies = {
        ...createDefaultOffensiveTendencies(),
        tempoPreference: 'slow' as const,
      };

      const tempo = getPlayTempo(tendencies, 0, 900, 1);

      expect(tempo).toBe('slow');
    });

    it('should return normal without tendencies', () => {
      const tempo = getPlayTempo(null, 0, 900, 1);

      expect(tempo).toBe('normal');
    });
  });

  describe('getPlayTypeDistribution', () => {
    it('should return distribution map', () => {
      const probabilities = {
        run: 0.4,
        passShort: 0.25,
        passMedium: 0.15,
        passDeep: 0.1,
        playAction: 0.05,
        screen: 0.05,
      };

      const distribution = getPlayTypeDistribution(probabilities);

      expect(distribution.size).toBeGreaterThan(0);
      expect(distribution.has('run_inside')).toBe(true);
      expect(distribution.has('pass_short')).toBe(true);
    });
  });

  describe('validatePlayCallingIntegration', () => {
    it('should validate correct tendencies', () => {
      const offensive = createDefaultOffensiveTendencies();
      const defensive = createDefaultDefensiveTendencies();

      const result = validatePlayCallingIntegration(offensive, defensive);

      expect(result.valid).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it('should detect invalid run/pass split', () => {
      const offensive = {
        ...createDefaultOffensiveTendencies(),
        runPassSplit: { run: 60, pass: 60 }, // Invalid sum
      };

      const result = validatePlayCallingIntegration(offensive, null);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes('run/pass split'))).toBe(true);
    });

    it('should detect out of range play action rate', () => {
      const offensive = {
        ...createDefaultOffensiveTendencies(),
        playActionRate: 75, // Over 50
      };

      const result = validatePlayCallingIntegration(offensive, null);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes('Play action rate'))).toBe(true);
    });

    it('should detect out of range blitz rate', () => {
      const defensive = {
        ...createDefaultDefensiveTendencies(),
        blitzRate: 60, // Over 50
      };

      const result = validatePlayCallingIntegration(null, defensive);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes('Blitz rate'))).toBe(true);
    });

    it('should pass with null tendencies', () => {
      const result = validatePlayCallingIntegration(null, null);

      expect(result.valid).toBe(true);
    });
  });
});
