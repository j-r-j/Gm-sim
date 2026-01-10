/**
 * Coordinator Tendencies Model
 * Defines play-calling tendencies for offensive and defensive coordinators
 */

/**
 * Fourth down aggressiveness level
 */
export type FourthDownAggressiveness = 'conservative' | 'average' | 'aggressive';

/**
 * Tempo preference
 */
export type TempoPreference = 'slow' | 'balanced' | 'uptempo';

/**
 * Situational play call preference
 */
export type SituationalPreference = 'run' | 'pass' | 'balanced';

/**
 * Defensive red zone approach
 */
export type RedZoneDefense = 'aggressive' | 'conservative';

/**
 * Two minute drill approach
 */
export type TwoMinuteApproach = 'prevent' | 'normal' | 'blitz';

/**
 * Third and long approach
 */
export type ThirdAndLongApproach = 'blitz' | 'coverage' | 'balanced';

/**
 * Base defensive formation
 */
export type BaseFormation = '4-3' | '3-4' | 'hybrid';

/**
 * Run/pass split modifier
 */
export interface SplitModifier {
  runModifier: number;
  passModifier: number;
}

/**
 * Offensive situational adjustments
 */
export interface OffensiveSituational {
  aheadBy14Plus: SplitModifier;
  behindBy14Plus: SplitModifier;
  thirdAndShort: SituationalPreference;
  redZone: SituationalPreference;
  badWeather: SplitModifier;
}

/**
 * Defensive situational adjustments
 */
export interface DefensiveSituational {
  redZone: RedZoneDefense;
  twoMinuteDrill: TwoMinuteApproach;
  thirdAndLong: ThirdAndLongApproach;
}

/**
 * Offensive coordinator tendencies
 */
export interface OffensiveTendencies {
  runPassSplit: { run: number; pass: number }; // Must sum to 100
  playActionRate: number; // 0-50 percentage
  deepShotRate: number; // 0-40 percentage
  fourthDownAggressiveness: FourthDownAggressiveness;
  tempoPreference: TempoPreference;
  situational: OffensiveSituational;
}

/**
 * Defensive coordinator tendencies
 */
export interface DefensiveTendencies {
  baseFormation: BaseFormation;
  blitzRate: number; // 0-50 percentage
  manCoverageRate: number; // 0-100 percentage
  pressRate: number; // 0-100 percentage (when in man)
  situational: DefensiveSituational;
}

/**
 * Union type for coordinator tendencies
 */
export type CoordinatorTendencies = OffensiveTendencies | DefensiveTendencies;

/**
 * Type guard to check if tendencies are offensive
 */
export function isOffensiveTendencies(
  tendencies: CoordinatorTendencies
): tendencies is OffensiveTendencies {
  return 'runPassSplit' in tendencies;
}

/**
 * Type guard to check if tendencies are defensive
 */
export function isDefensiveTendencies(
  tendencies: CoordinatorTendencies
): tendencies is DefensiveTendencies {
  return 'baseFormation' in tendencies;
}

/**
 * Validates offensive tendencies
 */
export function validateOffensiveTendencies(tendencies: OffensiveTendencies): boolean {
  // Run/pass split must sum to 100
  if (tendencies.runPassSplit.run + tendencies.runPassSplit.pass !== 100) {
    return false;
  }

  // Play action rate must be 0-50
  if (tendencies.playActionRate < 0 || tendencies.playActionRate > 50) {
    return false;
  }

  // Deep shot rate must be 0-40
  if (tendencies.deepShotRate < 0 || tendencies.deepShotRate > 40) {
    return false;
  }

  return true;
}

/**
 * Validates defensive tendencies
 */
export function validateDefensiveTendencies(tendencies: DefensiveTendencies): boolean {
  // Blitz rate must be 0-50
  if (tendencies.blitzRate < 0 || tendencies.blitzRate > 50) {
    return false;
  }

  // Man coverage rate must be 0-100
  if (tendencies.manCoverageRate < 0 || tendencies.manCoverageRate > 100) {
    return false;
  }

  // Press rate must be 0-100
  if (tendencies.pressRate < 0 || tendencies.pressRate > 100) {
    return false;
  }

  return true;
}

/**
 * Creates default offensive tendencies
 */
export function createDefaultOffensiveTendencies(): OffensiveTendencies {
  return {
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
  };
}

/**
 * Creates default defensive tendencies
 */
export function createDefaultDefensiveTendencies(): DefensiveTendencies {
  return {
    baseFormation: '4-3',
    blitzRate: 25,
    manCoverageRate: 40,
    pressRate: 50,
    situational: {
      redZone: 'aggressive',
      twoMinuteDrill: 'normal',
      thirdAndLong: 'coverage',
    },
  };
}

/**
 * Gets a vague description of tendencies for UI (does not reveal exact numbers)
 */
export function getTendenciesDescription(tendencies: CoordinatorTendencies): string {
  if (isOffensiveTendencies(tendencies)) {
    const runHeavy = tendencies.runPassSplit.run > 50;
    const aggressive = tendencies.fourthDownAggressiveness === 'aggressive';
    const fastPaced = tendencies.tempoPreference === 'uptempo';

    const traits: string[] = [];
    if (runHeavy) traits.push('Run-oriented');
    else traits.push('Pass-heavy');
    if (aggressive) traits.push('Aggressive on 4th down');
    if (fastPaced) traits.push('Up-tempo');

    return traits.join(', ') || 'Balanced approach';
  } else {
    const blitzHeavy = tendencies.blitzRate > 30;
    const manHeavy = tendencies.manCoverageRate > 60;

    const traits: string[] = [];
    traits.push(`${tendencies.baseFormation} base`);
    if (blitzHeavy) traits.push('Blitz-heavy');
    if (manHeavy) traits.push('Man coverage preference');

    return traits.join(', ') || 'Balanced defense';
  }
}
