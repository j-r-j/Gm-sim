/**
 * Play Calling Integration
 * Connects coordinator tendencies to the simulation engine.
 * Handles weather adjustments, situational overrides, and tendency-based play selection.
 * User never sees this - play calling happens automatically.
 */

import { Coach } from '../models/staff/Coach';
import {
  OffensiveTendencies,
  DefensiveTendencies,
  isOffensiveTendencies,
} from '../models/staff/CoordinatorTendencies';
import {
  GameStateContext,
  calculateAdjustedOffensiveTendencies,
  calculateAdjustedDefensiveTendencies,
  calculatePlayCallProbabilities,
  calculateDefensiveCallProbabilities,
  AdjustedOffensiveTendencies,
  AdjustedDefensiveTendencies,
  PlayCallProbabilities,
  DefensiveCallProbabilities,
} from './TendencyProfileManager';
import {
  selectOffensivePlay,
  selectDefensivePlay,
  PlayCallContext,
  OffensivePlayCall,
  DefensivePlayCall,
} from '../engine/PlayCaller';
import { WeatherCondition } from '../engine/EffectiveRatingCalculator';
import { PlayType } from '../engine/OutcomeTables';

/**
 * Play calling decision context (includes coaching info)
 */
export interface PlayCallingDecisionContext {
  offensiveCoordinator: Coach | null;
  defensiveCoordinator: Coach | null;
  headCoach: Coach | null;
  gameContext: PlayCallContext;
  isHometeam: boolean;
}

/**
 * Play calling result with tendency metadata
 */
export interface OffensivePlayCallResult {
  playCall: OffensivePlayCall;
  probabilities: PlayCallProbabilities;
  adjustedTendencies: AdjustedOffensiveTendencies | null;
  situationalOverrides: string[];
}

/**
 * Defensive play call result with tendency metadata
 */
export interface DefensivePlayCallResult {
  playCall: DefensivePlayCall;
  probabilities: DefensiveCallProbabilities;
  adjustedTendencies: AdjustedDefensiveTendencies | null;
  situationalOverrides: string[];
}

/**
 * Weather impact on play calling
 */
export interface WeatherImpact {
  runModifier: number; // Adjustment to run probability
  deepPassModifier: number; // Adjustment to deep pass probability
  description: string;
}

/**
 * Fourth down decision result
 */
export interface FourthDownDecision {
  decision: 'go_for_it' | 'field_goal' | 'punt';
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

/**
 * Two-minute drill mode
 */
export type TwoMinuteMode = 'aggressive' | 'balanced' | 'clock_kill';

/**
 * Calculates weather impact on play calling
 */
export function calculateWeatherImpact(weather: WeatherCondition): WeatherImpact {
  let runModifier = 0;
  let deepPassModifier = 0;
  const impacts: string[] = [];

  // Precipitation effects
  if (weather.precipitation === 'rain') {
    runModifier += 10;
    deepPassModifier -= 15;
    impacts.push('Rain favors running game');
  } else if (weather.precipitation === 'snow') {
    runModifier += 20;
    deepPassModifier -= 25;
    impacts.push('Snow significantly impacts passing');
  }

  // Wind effects
  if (weather.wind > 20) {
    deepPassModifier -= 20;
    impacts.push('High winds limit deep passing');
  } else if (weather.wind > 15) {
    deepPassModifier -= 10;
    impacts.push('Wind affects passing game');
  } else if (weather.wind > 10) {
    deepPassModifier -= 5;
  }

  // Temperature effects
  if (weather.temperature < 32) {
    runModifier += 5;
    impacts.push('Freezing conditions favor ground game');
  } else if (weather.temperature > 90) {
    // Hot weather doesn't significantly change strategy
  }

  // Dome negates all effects
  if (weather.isDome) {
    return {
      runModifier: 0,
      deepPassModifier: 0,
      description: 'Dome conditions - no weather impact',
    };
  }

  return {
    runModifier,
    deepPassModifier,
    description: impacts.length > 0 ? impacts.join('; ') : 'Normal conditions',
  };
}

/**
 * Converts PlayCallContext to GameStateContext
 */
export function contextToGameState(context: PlayCallContext): GameStateContext {
  return {
    down: context.down,
    distance: context.distance,
    fieldPosition: context.fieldPosition,
    scoreDifferential: context.scoreDifferential,
    timeRemaining: context.timeRemaining,
    quarter: context.quarter,
    isRedZone: context.isRedZone,
    isTwoMinuteWarning: context.isTwoMinuteWarning,
    weather: {
      precipitation: context.weather.precipitation,
      wind: context.weather.wind,
      temperature: context.weather.temperature,
    },
  };
}

/**
 * Selects offensive play using coordinator tendencies
 */
export function selectOffensivePlayWithTendencies(
  context: PlayCallingDecisionContext
): OffensivePlayCallResult {
  const situationalOverrides: string[] = [];
  const oc = context.offensiveCoordinator;
  const hc = context.headCoach;

  // Get tendencies from OC or HC
  let tendencies: OffensiveTendencies | null = null;
  if (oc?.tendencies && isOffensiveTendencies(oc.tendencies)) {
    tendencies = oc.tendencies;
  } else if (hc?.tendencies && isOffensiveTendencies(hc.tendencies)) {
    tendencies = hc.tendencies;
  }

  // If no tendencies, use default play selection
  if (!tendencies) {
    const playCall = selectOffensivePlay(
      {
        runPassSplit: { run: 45, pass: 55 },
        playActionRate: 20,
        deepShotRate: 15,
        fourthDownAggressiveness: 'average',
        tempoPreference: 'balanced',
        situational: {
          aheadBy14Plus: { runModifier: 15, passModifier: -15 },
          behindBy14Plus: { runModifier: -20, passModifier: 20 },
          thirdAndShort: 'balanced',
          redZone: 'balanced',
          badWeather: { runModifier: 10, passModifier: -10 },
        },
      },
      context.gameContext
    );

    return {
      playCall,
      probabilities: {
        run: 0.45,
        passShort: 0.25,
        passMedium: 0.15,
        passDeep: 0.08,
        playAction: 0.04,
        screen: 0.03,
      },
      adjustedTendencies: null,
      situationalOverrides: ['Using default tendencies'],
    };
  }

  // Calculate weather impact
  const weatherImpact = calculateWeatherImpact(context.gameContext.weather);
  if (weatherImpact.runModifier !== 0 || weatherImpact.deepPassModifier !== 0) {
    situationalOverrides.push(weatherImpact.description);
  }

  // Convert to game state context
  const gameState = contextToGameState(context.gameContext);

  // Calculate adjusted tendencies
  const adjustedTendencies = calculateAdjustedOffensiveTendencies(tendencies, gameState);

  // Apply weather impact to adjusted tendencies
  const weatherAdjustedTendencies: AdjustedOffensiveTendencies = {
    ...adjustedTendencies,
    effectiveRunRate: Math.max(
      10,
      Math.min(85, adjustedTendencies.effectiveRunRate + weatherImpact.runModifier)
    ),
    effectiveDeepRate: Math.max(
      5,
      Math.min(40, adjustedTendencies.effectiveDeepRate + weatherImpact.deepPassModifier)
    ),
  };

  // Check for situational overrides
  if (gameState.isRedZone) {
    situationalOverrides.push('Red zone adjustments');
  }
  if (gameState.isTwoMinuteWarning) {
    situationalOverrides.push('Two-minute drill');
  }
  if (Math.abs(gameState.scoreDifferential) >= 14) {
    situationalOverrides.push(
      gameState.scoreDifferential > 0 ? 'Protecting large lead' : 'Comeback mode'
    );
  }

  // Calculate probabilities
  const probabilities = calculatePlayCallProbabilities(weatherAdjustedTendencies);

  // Generate play call
  const playCall = selectOffensivePlay(tendencies, context.gameContext);

  return {
    playCall,
    probabilities,
    adjustedTendencies: weatherAdjustedTendencies,
    situationalOverrides,
  };
}

/**
 * Selects defensive play using coordinator tendencies
 */
export function selectDefensivePlayWithTendencies(
  context: PlayCallingDecisionContext,
  offensiveFormation: OffensivePlayCall['formation']
): DefensivePlayCallResult {
  const situationalOverrides: string[] = [];
  const dc = context.defensiveCoordinator;
  const hc = context.headCoach;

  // Get tendencies from DC or HC
  let tendencies: DefensiveTendencies | null = null;
  if (dc?.tendencies && !isOffensiveTendencies(dc.tendencies)) {
    tendencies = dc.tendencies;
  } else if (hc?.tendencies && !isOffensiveTendencies(hc.tendencies)) {
    tendencies = hc.tendencies;
  }

  // If no tendencies, use default play selection
  if (!tendencies) {
    const playCall = selectDefensivePlay(
      {
        baseFormation: '4-3',
        blitzRate: 25,
        manCoverageRate: 40,
        pressRate: 50,
        situational: {
          redZone: 'aggressive',
          twoMinuteDrill: 'normal',
          thirdAndLong: 'coverage',
        },
      },
      context.gameContext,
      offensiveFormation
    );

    return {
      playCall,
      probabilities: {
        blitz: 0.25,
        manCoverage: 0.4,
        zoneCoverage: 0.6,
        press: 0.5,
      },
      adjustedTendencies: null,
      situationalOverrides: ['Using default tendencies'],
    };
  }

  // Convert to game state context
  const gameState = contextToGameState(context.gameContext);

  // Calculate adjusted tendencies
  const adjustedTendencies = calculateAdjustedDefensiveTendencies(tendencies, gameState);

  // Check for situational overrides
  if (gameState.isRedZone) {
    situationalOverrides.push('Red zone defense');
  }
  if (gameState.isTwoMinuteWarning) {
    situationalOverrides.push('Two-minute drill defense');
  }
  if (gameState.down === 3 && gameState.distance > 7) {
    situationalOverrides.push('Third and long situation');
  }
  if (Math.abs(gameState.scoreDifferential) >= 14) {
    situationalOverrides.push(
      gameState.scoreDifferential > 0 ? 'Protecting lead' : 'Need stops'
    );
  }

  // Calculate probabilities
  const probabilities = calculateDefensiveCallProbabilities(adjustedTendencies);

  // Generate play call
  const playCall = selectDefensivePlay(tendencies, context.gameContext, offensiveFormation);

  return {
    playCall,
    probabilities,
    adjustedTendencies,
    situationalOverrides,
  };
}

/**
 * Makes fourth down decision based on coach tendencies
 */
export function makeFourthDownDecision(
  context: PlayCallingDecisionContext,
  kickerRange: number
): FourthDownDecision {
  const { gameContext } = context;
  const hc = context.headCoach;
  const oc = context.offensiveCoordinator;

  // Get aggressiveness from coach
  let aggressiveness: 'conservative' | 'average' | 'aggressive' = 'average';
  if (oc?.tendencies && isOffensiveTendencies(oc.tendencies)) {
    aggressiveness = oc.tendencies.fourthDownAggressiveness;
  } else if (hc?.tendencies && isOffensiveTendencies(hc.tendencies)) {
    aggressiveness = hc.tendencies.fourthDownAggressiveness;
  }

  // Field goal range check
  const kickDistance = 100 - gameContext.fieldPosition + 17;
  const inFieldGoalRange = kickDistance <= kickerRange;

  // Distance to convert
  const distance = gameContext.distance;

  // Score differential
  const scoreDiff = gameContext.scoreDifferential;

  // Time remaining factor
  const isLateGame = gameContext.quarter === 4 && gameContext.timeRemaining < 300;
  const isEndOfHalf = gameContext.quarter === 2 && gameContext.timeRemaining < 60;

  // Decision logic
  let decision: FourthDownDecision['decision'];
  let confidence: FourthDownDecision['confidence'];
  let reasoning: string;

  // Very short distance - more likely to go
  if (distance <= 1) {
    if (aggressiveness === 'aggressive' || gameContext.fieldPosition >= 50) {
      decision = 'go_for_it';
      confidence = 'high';
      reasoning = 'Short distance, going for it';
    } else if (inFieldGoalRange && kickDistance <= 40) {
      decision = 'field_goal';
      confidence = 'high';
      reasoning = 'Short field goal, taking the points';
    } else if (gameContext.fieldPosition < 35) {
      decision = 'punt';
      confidence = 'medium';
      reasoning = 'Deep in own territory, punting';
    } else {
      decision = 'go_for_it';
      confidence = 'medium';
      reasoning = 'Short yardage in plus territory';
    }
  }
  // Field goal range
  else if (inFieldGoalRange && kickDistance <= 45) {
    if (isLateGame && scoreDiff < 0 && Math.abs(scoreDiff) > 3) {
      decision = 'go_for_it';
      confidence = 'medium';
      reasoning = 'Need touchdown, going for it';
    } else {
      decision = 'field_goal';
      confidence = 'high';
      reasoning = 'In field goal range, taking points';
    }
  }
  // Long field goal
  else if (inFieldGoalRange && kickDistance <= kickerRange) {
    if (scoreDiff <= 0 || isEndOfHalf) {
      decision = 'field_goal';
      confidence = 'low';
      reasoning = 'Attempting long field goal';
    } else {
      decision = 'punt';
      confidence = 'medium';
      reasoning = 'Too long for field goal while winning';
    }
  }
  // No mans land
  else if (gameContext.fieldPosition >= 35 && gameContext.fieldPosition <= 55) {
    if (aggressiveness === 'aggressive' && distance <= 3) {
      decision = 'go_for_it';
      confidence = 'medium';
      reasoning = 'Aggressive approach, going for it';
    } else if (isLateGame && scoreDiff < -7) {
      decision = 'go_for_it';
      confidence = 'medium';
      reasoning = 'Must have points, going for it';
    } else {
      decision = 'punt';
      confidence = 'medium';
      reasoning = 'Punting from midfield';
    }
  }
  // Opponent territory
  else if (gameContext.fieldPosition > 55) {
    if (aggressiveness === 'aggressive' && distance <= 4) {
      decision = 'go_for_it';
      confidence = 'high';
      reasoning = 'Plus territory, going for it';
    } else if (distance <= 2 && aggressiveness !== 'conservative') {
      decision = 'go_for_it';
      confidence = 'medium';
      reasoning = 'Short distance in red zone area';
    } else {
      decision = 'punt';
      confidence = 'low';
      reasoning = 'Pinning them deep';
    }
  }
  // Own territory
  else {
    decision = 'punt';
    confidence = 'high';
    reasoning = 'Deep in own territory, punting for field position';
  }

  return { decision, confidence, reasoning };
}

/**
 * Determines two-minute drill mode based on game state
 */
export function determineTwoMinuteMode(
  scoreDifferential: number,
  _timeRemaining: number,
  _hasTimeouts: number
): TwoMinuteMode {
  // Winning by more than 7 - kill clock
  if (scoreDifferential > 7) {
    return 'clock_kill';
  }

  // Winning by 1-7 - balanced
  if (scoreDifferential > 0) {
    return 'balanced';
  }

  // Tied or losing - aggressive
  return 'aggressive';
}

/**
 * Gets play tempo based on game situation and tendencies
 */
export function getPlayTempo(
  tendencies: OffensiveTendencies | null,
  scoreDifferential: number,
  timeRemaining: number,
  quarter: PlayCallContext['quarter']
): 'hurry_up' | 'normal' | 'slow' {
  const isEndOfHalf = quarter === 2 || quarter === 4;

  // End of half scenarios
  if (isEndOfHalf && timeRemaining < 120) {
    if (scoreDifferential < 0) {
      return 'hurry_up';
    }
    if (scoreDifferential > 7) {
      return 'slow';
    }
  }

  // Use tendencies
  if (tendencies) {
    switch (tendencies.tempoPreference) {
      case 'uptempo':
        return scoreDifferential > 14 ? 'normal' : 'hurry_up';
      case 'slow':
        return 'slow';
      default:
        return 'normal';
    }
  }

  return 'normal';
}

/**
 * Calculates play type distribution based on adjusted tendencies
 */
export function getPlayTypeDistribution(
  probabilities: PlayCallProbabilities
): Map<PlayType, number> {
  const distribution = new Map<PlayType, number>();

  // Run plays
  const runShare = probabilities.run;
  distribution.set('run_inside', runShare * 0.4);
  distribution.set('run_outside', runShare * 0.25);
  distribution.set('run_draw', runShare * 0.2);
  distribution.set('run_sweep', runShare * 0.15);

  // Pass plays
  distribution.set('pass_short', probabilities.passShort);
  distribution.set('pass_medium', probabilities.passMedium);
  distribution.set('pass_deep', probabilities.passDeep * 0.6);
  distribution.set('pass_screen', probabilities.screen);

  // Play action
  distribution.set('play_action_short', probabilities.playAction * 0.5);
  distribution.set('play_action_deep', probabilities.playAction * 0.5 + probabilities.passDeep * 0.4);

  // Edge cases
  distribution.set('qb_sneak', 0.01);
  distribution.set('qb_scramble', 0.02);

  return distribution;
}

/**
 * Validates that play calling integration is working correctly
 */
export function validatePlayCallingIntegration(
  offensiveTendencies: OffensiveTendencies | null,
  defensiveTendencies: DefensiveTendencies | null
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (offensiveTendencies) {
    if (offensiveTendencies.runPassSplit.run + offensiveTendencies.runPassSplit.pass !== 100) {
      issues.push('Offensive run/pass split does not sum to 100');
    }
    if (offensiveTendencies.playActionRate < 0 || offensiveTendencies.playActionRate > 50) {
      issues.push('Play action rate out of valid range');
    }
    if (offensiveTendencies.deepShotRate < 0 || offensiveTendencies.deepShotRate > 40) {
      issues.push('Deep shot rate out of valid range');
    }
  }

  if (defensiveTendencies) {
    if (defensiveTendencies.blitzRate < 0 || defensiveTendencies.blitzRate > 50) {
      issues.push('Blitz rate out of valid range');
    }
    if (defensiveTendencies.manCoverageRate < 0 || defensiveTendencies.manCoverageRate > 100) {
      issues.push('Man coverage rate out of valid range');
    }
    if (defensiveTendencies.pressRate < 0 || defensiveTendencies.pressRate > 100) {
      issues.push('Press rate out of valid range');
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
