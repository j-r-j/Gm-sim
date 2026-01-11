/**
 * Tendency Profile Manager
 * Generates and manages coordinator tendency profiles for play calling.
 * Handles situational adjustments and calculates play call probabilities.
 */

import {
  OffensiveTendencies,
  DefensiveTendencies,
  CoordinatorTendencies,
  FourthDownAggressiveness,
  TempoPreference,
  SituationalPreference,
  BaseFormation,
  RedZoneDefense,
  TwoMinuteApproach,
  ThirdAndLongApproach,
  SplitModifier,
  isOffensiveTendencies,
  validateOffensiveTendencies,
  validateDefensiveTendencies,
} from '../models/staff/CoordinatorTendencies';
import { TreeName, TreePhilosophy } from '../models/staff/CoachingTree';
import { PersonalityType } from '../models/staff/CoachPersonality';

/**
 * Game state context for tendency adjustments
 */
export interface GameStateContext {
  down: number;
  distance: number;
  fieldPosition: number; // Yards from own end zone
  scoreDifferential: number; // Positive = winning
  timeRemaining: number; // Seconds remaining in game
  quarter: 1 | 2 | 3 | 4 | 'OT';
  isRedZone: boolean;
  isTwoMinuteWarning: boolean;
  weather: {
    precipitation: 'none' | 'rain' | 'snow';
    wind: number;
    temperature: number;
  };
}

/**
 * Play call probability distribution
 */
export interface PlayCallProbabilities {
  run: number;
  passShort: number;
  passMedium: number;
  passDeep: number;
  playAction: number;
  screen: number;
}

/**
 * Defensive call probability distribution
 */
export interface DefensiveCallProbabilities {
  blitz: number;
  manCoverage: number;
  zoneCoverage: number;
  press: number;
}

/**
 * Adjusted tendencies after situational modifications
 */
export interface AdjustedOffensiveTendencies extends OffensiveTendencies {
  effectiveRunRate: number;
  effectiveDeepRate: number;
  effectivePlayActionRate: number;
}

/**
 * Adjusted defensive tendencies after situational modifications
 */
export interface AdjustedDefensiveTendencies extends DefensiveTendencies {
  effectiveBlitzRate: number;
  effectiveManRate: number;
  effectivePressRate: number;
}

/**
 * Tendency profile generation seed factors
 */
export interface TendencyGenerationFactors {
  treeName: TreeName;
  treePhilosophy: TreePhilosophy;
  personalityType: PersonalityType;
  yearsExperience: number;
}

/**
 * Qualitative tendency description for UI (no raw numbers)
 */
export interface TendencyDescription {
  overall: string;
  runPassBalance: string;
  aggressiveness: string;
  specialTraits: string[];
}

/**
 * Generates offensive tendency profile based on coaching tree and personality
 */
export function generateOffensiveTendencies(
  factors: TendencyGenerationFactors
): OffensiveTendencies {
  const { treeName, treePhilosophy, personalityType, yearsExperience } = factors;

  // Base run/pass split influenced by tree
  let runBase = 45;
  let passBase = 55;

  // Tree-based adjustments
  switch (treeName) {
    case 'walsh':
    case 'reid':
      passBase += 10;
      runBase -= 10;
      break;
    case 'shanahan':
      runBase += 5;
      passBase -= 5;
      break;
    case 'parcells':
    case 'coughlin':
      runBase += 8;
      passBase -= 8;
      break;
    case 'belichick':
      // Adapts to opponent, balanced
      break;
    default:
      break;
  }

  // Philosophy adjustments
  if (treePhilosophy.offensiveTendency === 'pass') {
    passBase += 5;
    runBase -= 5;
  } else if (treePhilosophy.offensiveTendency === 'run') {
    runBase += 5;
    passBase -= 5;
  }

  // Personality adjustments
  let fourthDownAggressiveness: FourthDownAggressiveness = 'average';
  let tempoPreference: TempoPreference = 'balanced';
  let playActionRate = 20;
  let deepShotRate = 15;

  switch (personalityType) {
    case 'aggressive':
      fourthDownAggressiveness = 'aggressive';
      tempoPreference = 'uptempo';
      deepShotRate += 8;
      break;
    case 'conservative':
      fourthDownAggressiveness = 'conservative';
      tempoPreference = 'slow';
      deepShotRate -= 5;
      playActionRate -= 5;
      break;
    case 'innovative':
      tempoPreference = 'uptempo';
      playActionRate += 10;
      deepShotRate += 5;
      break;
    case 'oldSchool':
      tempoPreference = 'slow';
      runBase += 5;
      passBase -= 5;
      playActionRate += 8;
      break;
    case 'analytical':
      // Data-driven, balanced but adjusts to situations
      playActionRate += 3;
      break;
    case 'playersCoach':
      // Uses players' strengths
      break;
  }

  // Experience adjustments (more experienced = more conservative on 4th)
  if (yearsExperience > 15 && fourthDownAggressiveness === 'aggressive') {
    fourthDownAggressiveness = 'average';
  }

  // Risk tolerance from philosophy
  if (treePhilosophy.riskTolerance === 'aggressive') {
    fourthDownAggressiveness = 'aggressive';
    deepShotRate += 5;
  } else if (treePhilosophy.riskTolerance === 'conservative') {
    fourthDownAggressiveness = 'conservative';
    deepShotRate -= 5;
  }

  // Normalize run/pass split
  const total = runBase + passBase;
  runBase = Math.round((runBase / total) * 100);
  passBase = 100 - runBase;

  // Clamp values
  playActionRate = Math.max(5, Math.min(50, playActionRate));
  deepShotRate = Math.max(5, Math.min(40, deepShotRate));

  const tendencies: OffensiveTendencies = {
    runPassSplit: { run: runBase, pass: passBase },
    playActionRate,
    deepShotRate,
    fourthDownAggressiveness,
    tempoPreference,
    situational: generateOffensiveSituational(personalityType, treePhilosophy),
  };

  return tendencies;
}

/**
 * Generates offensive situational adjustments
 */
function generateOffensiveSituational(
  personality: PersonalityType,
  philosophy: TreePhilosophy
): OffensiveTendencies['situational'] {
  // Base situational modifiers
  let aheadBy14Plus: SplitModifier = { runModifier: 15, passModifier: -15 };
  let behindBy14Plus: SplitModifier = { runModifier: -20, passModifier: 20 };
  let thirdAndShort: SituationalPreference = 'balanced';
  let redZone: SituationalPreference = 'balanced';
  let badWeather: SplitModifier = { runModifier: 10, passModifier: -10 };

  // Personality-based adjustments
  if (personality === 'aggressive') {
    aheadBy14Plus = { runModifier: 10, passModifier: -10 }; // Keeps foot on gas
    thirdAndShort = 'pass'; // Takes shots
  } else if (personality === 'conservative') {
    aheadBy14Plus = { runModifier: 25, passModifier: -25 }; // Runs clock
    behindBy14Plus = { runModifier: -15, passModifier: 15 }; // More cautious comeback
    thirdAndShort = 'run';
  } else if (personality === 'oldSchool') {
    thirdAndShort = 'run';
    redZone = 'run'; // Power football in red zone
  } else if (personality === 'innovative') {
    thirdAndShort = 'pass'; // Surprise element
    redZone = 'pass';
  }

  // Philosophy adjustments
  if (philosophy.riskTolerance === 'aggressive') {
    behindBy14Plus.passModifier += 5;
  }

  return {
    aheadBy14Plus,
    behindBy14Plus,
    thirdAndShort,
    redZone,
    badWeather,
  };
}

/**
 * Generates defensive tendency profile based on coaching tree and personality
 */
export function generateDefensiveTendencies(
  factors: TendencyGenerationFactors
): DefensiveTendencies {
  const { treeName, treePhilosophy, personalityType, yearsExperience } = factors;

  // Base formation influenced by tree
  let baseFormation: BaseFormation = '4-3';
  let blitzRate = 25;
  let manCoverageRate = 40;
  let pressRate = 50;

  // Tree-based adjustments
  switch (treeName) {
    case 'belichick':
      baseFormation = 'hybrid';
      manCoverageRate = 55;
      pressRate = 60;
      break;
    case 'parcells':
    case 'coughlin':
      baseFormation = '4-3';
      manCoverageRate = 50;
      break;
    case 'dungy':
      // Tampa-2 style
      baseFormation = '4-3';
      blitzRate = 20;
      manCoverageRate = 35;
      break;
    case 'payton':
      // Balanced approach
      baseFormation = '4-3';
      blitzRate = 28;
      break;
    default:
      break;
  }

  // Philosophy adjustments
  if (treePhilosophy.defensiveTendency === 'aggressive') {
    blitzRate += 10;
    pressRate += 10;
  } else if (treePhilosophy.defensiveTendency === 'conservative') {
    blitzRate -= 10;
    manCoverageRate -= 10;
  }

  // Personality adjustments
  let redZone: RedZoneDefense = 'aggressive';
  let twoMinuteDrill: TwoMinuteApproach = 'normal';
  let thirdAndLong: ThirdAndLongApproach = 'balanced';

  switch (personalityType) {
    case 'aggressive':
      blitzRate += 10;
      pressRate += 10;
      redZone = 'aggressive';
      twoMinuteDrill = 'blitz';
      thirdAndLong = 'blitz';
      break;
    case 'conservative':
      blitzRate -= 10;
      redZone = 'conservative';
      twoMinuteDrill = 'prevent';
      thirdAndLong = 'coverage';
      break;
    case 'analytical':
      // Adapts to situations
      thirdAndLong = 'coverage';
      break;
    case 'innovative':
      blitzRate += 5;
      baseFormation = 'hybrid';
      break;
    case 'oldSchool':
      // Traditional approach
      twoMinuteDrill = 'normal';
      break;
    case 'playersCoach':
      // Uses player strengths
      break;
  }

  // Experience adjustments
  if (yearsExperience > 15) {
    // More experienced DCs are more calculated
    if (blitzRate > 40) blitzRate -= 5;
  }

  // Risk tolerance
  if (treePhilosophy.riskTolerance === 'aggressive') {
    blitzRate += 5;
    twoMinuteDrill = 'blitz';
  } else if (treePhilosophy.riskTolerance === 'conservative') {
    blitzRate -= 5;
    twoMinuteDrill = 'prevent';
  }

  // Clamp values
  blitzRate = Math.max(10, Math.min(50, blitzRate));
  manCoverageRate = Math.max(20, Math.min(80, manCoverageRate));
  pressRate = Math.max(20, Math.min(80, pressRate));

  const tendencies: DefensiveTendencies = {
    baseFormation,
    blitzRate,
    manCoverageRate,
    pressRate,
    situational: {
      redZone,
      twoMinuteDrill,
      thirdAndLong,
    },
  };

  return tendencies;
}

/**
 * Calculates adjusted offensive tendencies based on game state
 */
export function calculateAdjustedOffensiveTendencies(
  tendencies: OffensiveTendencies,
  context: GameStateContext
): AdjustedOffensiveTendencies {
  let runRate = tendencies.runPassSplit.run;
  let deepRate = tendencies.deepShotRate;
  let playActionRate = tendencies.playActionRate;

  const { situational } = tendencies;

  // Score differential adjustments
  if (context.scoreDifferential >= 14) {
    runRate += situational.aheadBy14Plus.runModifier;
  } else if (context.scoreDifferential <= -14) {
    runRate += situational.behindBy14Plus.runModifier;
  }

  // Weather adjustments
  if (context.weather.precipitation !== 'none' || context.weather.wind > 15) {
    runRate += situational.badWeather.runModifier;
    deepRate -= 5;
    playActionRate -= 5;
  }

  // Down and distance
  if (context.down === 3 && context.distance <= 2) {
    if (situational.thirdAndShort === 'run') {
      runRate += 20;
    } else if (situational.thirdAndShort === 'pass') {
      runRate -= 15;
      deepRate += 5;
    }
  }

  // Third and long - reduce run rate
  if (context.down === 3 && context.distance > 7) {
    runRate -= 20;
  }

  // Red zone adjustments
  if (context.isRedZone) {
    if (situational.redZone === 'run') {
      runRate += 15;
    } else if (situational.redZone === 'pass') {
      runRate -= 10;
    }
    // Less deep shots in red zone
    deepRate = Math.max(5, deepRate - 10);
  }

  // Two minute warning
  if (context.isTwoMinuteWarning && context.scoreDifferential < 14) {
    runRate -= 25;
    deepRate += 5;
  }

  // End of half urgency
  const isEndOfHalf = context.quarter === 2 || context.quarter === 4;
  if (isEndOfHalf && context.timeRemaining < 120 && context.scoreDifferential < 0) {
    runRate -= 30;
    deepRate += 10;
  }

  // Time management - running out the clock
  if (isEndOfHalf && context.timeRemaining < 120 && context.scoreDifferential > 7) {
    runRate += 20;
    deepRate -= 10;
  }

  // Clamp values
  runRate = Math.max(10, Math.min(85, runRate));
  deepRate = Math.max(5, Math.min(40, deepRate));
  playActionRate = Math.max(5, Math.min(50, playActionRate));

  return {
    ...tendencies,
    effectiveRunRate: runRate,
    effectiveDeepRate: deepRate,
    effectivePlayActionRate: playActionRate,
  };
}

/**
 * Calculates adjusted defensive tendencies based on game state
 */
export function calculateAdjustedDefensiveTendencies(
  tendencies: DefensiveTendencies,
  context: GameStateContext
): AdjustedDefensiveTendencies {
  let blitzRate = tendencies.blitzRate;
  let manRate = tendencies.manCoverageRate;
  let pressRate = tendencies.pressRate;

  const { situational } = tendencies;

  // Red zone adjustments
  if (context.isRedZone) {
    if (situational.redZone === 'aggressive') {
      blitzRate += 15;
      pressRate += 10;
    } else {
      blitzRate -= 10;
    }
  }

  // Two minute drill
  if (context.isTwoMinuteWarning) {
    switch (situational.twoMinuteDrill) {
      case 'prevent':
        blitzRate -= 20;
        manRate -= 25;
        pressRate -= 20;
        break;
      case 'blitz':
        blitzRate += 15;
        manRate += 10;
        pressRate += 10;
        break;
      case 'normal':
        // No change
        break;
    }
  }

  // Third and long
  if (context.down === 3 && context.distance > 7) {
    switch (situational.thirdAndLong) {
      case 'blitz':
        blitzRate += 20;
        break;
      case 'coverage':
        blitzRate -= 15;
        manRate -= 10;
        break;
      case 'balanced':
        blitzRate += 5;
        break;
    }
  }

  // Score differential
  if (context.scoreDifferential >= 14) {
    // Winning big - play conservative
    blitzRate -= 15;
    manRate -= 10;
  } else if (context.scoreDifferential <= -14) {
    // Losing big - get aggressive
    blitzRate += 10;
    pressRate += 10;
  }

  // End of half scenarios
  const isEndOfHalf = context.quarter === 2 || context.quarter === 4;
  if (isEndOfHalf && context.timeRemaining < 60 && context.scoreDifferential > 0) {
    // Protect the lead - prevent deep
    blitzRate -= 15;
    manRate -= 20;
    pressRate -= 15;
  }

  // Clamp values
  blitzRate = Math.max(5, Math.min(55, blitzRate));
  manRate = Math.max(15, Math.min(85, manRate));
  pressRate = Math.max(10, Math.min(85, pressRate));

  return {
    ...tendencies,
    effectiveBlitzRate: blitzRate,
    effectiveManRate: manRate,
    effectivePressRate: pressRate,
  };
}

/**
 * Calculates play call probabilities based on adjusted tendencies
 */
export function calculatePlayCallProbabilities(
  adjustedTendencies: AdjustedOffensiveTendencies
): PlayCallProbabilities {
  const { effectiveRunRate, effectiveDeepRate, effectivePlayActionRate } = adjustedTendencies;

  const passRate = 100 - effectiveRunRate;

  // Distribute pass types
  const deepPassShare = effectiveDeepRate / 100;
  const playActionShare = effectivePlayActionRate / 100;

  // Calculate individual probabilities
  const run = effectiveRunRate / 100;
  const passDeep = (passRate / 100) * deepPassShare;
  const playAction = (passRate / 100) * playActionShare * 0.5; // Play action can be short or deep
  const screen = (passRate / 100) * 0.1; // ~10% of passes are screens

  const remainingPass = passRate / 100 - passDeep - playAction - screen;
  const passShort = remainingPass * 0.55;
  const passMedium = remainingPass * 0.45;

  return {
    run: Math.max(0, Math.min(1, run)),
    passShort: Math.max(0, Math.min(1, passShort)),
    passMedium: Math.max(0, Math.min(1, passMedium)),
    passDeep: Math.max(0, Math.min(1, passDeep)),
    playAction: Math.max(0, Math.min(1, playAction)),
    screen: Math.max(0, Math.min(1, screen)),
  };
}

/**
 * Calculates defensive call probabilities based on adjusted tendencies
 */
export function calculateDefensiveCallProbabilities(
  adjustedTendencies: AdjustedDefensiveTendencies
): DefensiveCallProbabilities {
  const { effectiveBlitzRate, effectiveManRate, effectivePressRate } = adjustedTendencies;

  return {
    blitz: effectiveBlitzRate / 100,
    manCoverage: effectiveManRate / 100,
    zoneCoverage: 1 - effectiveManRate / 100,
    press: effectivePressRate / 100,
  };
}

/**
 * Gets a qualitative description of tendencies for UI (no raw numbers exposed)
 */
export function getTendencyDescriptionForUI(
  tendencies: CoordinatorTendencies
): TendencyDescription {
  if (isOffensiveTendencies(tendencies)) {
    return getOffensiveTendencyDescription(tendencies);
  } else {
    return getDefensiveTendencyDescription(tendencies);
  }
}

/**
 * Gets offensive tendency description
 */
function getOffensiveTendencyDescription(tendencies: OffensiveTendencies): TendencyDescription {
  const specialTraits: string[] = [];

  // Run/pass balance description
  let runPassBalance: string;
  if (tendencies.runPassSplit.run >= 55) {
    runPassBalance = 'Run-heavy approach';
  } else if (tendencies.runPassSplit.pass >= 60) {
    runPassBalance = 'Pass-focused attack';
  } else {
    runPassBalance = 'Balanced offensive philosophy';
  }

  // Aggressiveness description
  let aggressiveness: string;
  switch (tendencies.fourthDownAggressiveness) {
    case 'aggressive':
      aggressiveness = 'Aggressive on fourth down decisions';
      break;
    case 'conservative':
      aggressiveness = 'Conservative with game management';
      break;
    default:
      aggressiveness = 'Calculated approach to risk';
  }

  // Special traits
  if (tendencies.playActionRate >= 30) {
    specialTraits.push('Heavy play-action usage');
  }
  if (tendencies.deepShotRate >= 25) {
    specialTraits.push('Likes to take deep shots');
  }
  if (tendencies.tempoPreference === 'uptempo') {
    specialTraits.push('Up-tempo pace');
  } else if (tendencies.tempoPreference === 'slow') {
    specialTraits.push('Methodical pace');
  }

  // Overall description
  let overall: string;
  if (tendencies.runPassSplit.pass >= 60 && tendencies.tempoPreference === 'uptempo') {
    overall = 'Modern, aggressive passing attack';
  } else if (tendencies.runPassSplit.run >= 55) {
    overall = 'Ground-and-pound mentality';
  } else if (tendencies.playActionRate >= 25) {
    overall = 'Play-action oriented scheme';
  } else {
    overall = 'Versatile, situation-based approach';
  }

  return {
    overall,
    runPassBalance,
    aggressiveness,
    specialTraits,
  };
}

/**
 * Gets defensive tendency description
 */
function getDefensiveTendencyDescription(tendencies: DefensiveTendencies): TendencyDescription {
  const specialTraits: string[] = [];

  // Base formation
  specialTraits.push(`${tendencies.baseFormation} base defense`);

  // Run/pass balance (man vs zone)
  let runPassBalance: string;
  if (tendencies.manCoverageRate >= 60) {
    runPassBalance = 'Man coverage preference';
  } else if (tendencies.manCoverageRate <= 35) {
    runPassBalance = 'Zone coverage emphasis';
  } else {
    runPassBalance = 'Mixed coverage approach';
  }

  // Aggressiveness
  let aggressiveness: string;
  if (tendencies.blitzRate >= 35) {
    aggressiveness = 'Aggressive, blitz-heavy scheme';
    specialTraits.push('High blitz rate');
  } else if (tendencies.blitzRate <= 20) {
    aggressiveness = 'Conservative, coverage-first approach';
  } else {
    aggressiveness = 'Situationally aggressive';
  }

  // Press rate
  if (tendencies.pressRate >= 65) {
    specialTraits.push('Likes to press at the line');
  }

  // Overall description
  let overall: string;
  if (tendencies.blitzRate >= 40 && tendencies.manCoverageRate >= 55) {
    overall = 'Attacking, high-risk high-reward defense';
  } else if (tendencies.blitzRate <= 20 && tendencies.manCoverageRate <= 40) {
    overall = "Bend-but-don't-break mentality";
  } else {
    overall = 'Adaptable defensive system';
  }

  return {
    overall,
    runPassBalance,
    aggressiveness,
    specialTraits,
  };
}

/**
 * Validates tendency profile
 */
export function validateTendencyProfile(tendencies: CoordinatorTendencies): boolean {
  if (isOffensiveTendencies(tendencies)) {
    return validateOffensiveTendencies(tendencies);
  } else {
    return validateDefensiveTendencies(tendencies);
  }
}

/**
 * Calculates how similar two tendency profiles are (0-100)
 * Used for scheme compatibility checks
 */
export function calculateTendencySimilarity(
  tendencies1: CoordinatorTendencies,
  tendencies2: CoordinatorTendencies
): number {
  // Must be same type
  if (isOffensiveTendencies(tendencies1) !== isOffensiveTendencies(tendencies2)) {
    return 0;
  }

  if (isOffensiveTendencies(tendencies1) && isOffensiveTendencies(tendencies2)) {
    return calculateOffensiveSimilarity(tendencies1, tendencies2);
  } else if (!isOffensiveTendencies(tendencies1) && !isOffensiveTendencies(tendencies2)) {
    return calculateDefensiveSimilarity(
      tendencies1 as DefensiveTendencies,
      tendencies2 as DefensiveTendencies
    );
  }

  return 0;
}

/**
 * Calculates offensive tendency similarity
 */
function calculateOffensiveSimilarity(t1: OffensiveTendencies, t2: OffensiveTendencies): number {
  let similarity = 100;

  // Run/pass difference
  const runDiff = Math.abs(t1.runPassSplit.run - t2.runPassSplit.run);
  similarity -= runDiff * 0.5;

  // Play action difference
  const playActionDiff = Math.abs(t1.playActionRate - t2.playActionRate);
  similarity -= playActionDiff * 0.3;

  // Deep shot difference
  const deepDiff = Math.abs(t1.deepShotRate - t2.deepShotRate);
  similarity -= deepDiff * 0.3;

  // Aggressiveness match
  if (t1.fourthDownAggressiveness !== t2.fourthDownAggressiveness) {
    similarity -= 10;
  }

  // Tempo match
  if (t1.tempoPreference !== t2.tempoPreference) {
    similarity -= 8;
  }

  return Math.max(0, Math.min(100, similarity));
}

/**
 * Calculates defensive tendency similarity
 */
function calculateDefensiveSimilarity(t1: DefensiveTendencies, t2: DefensiveTendencies): number {
  let similarity = 100;

  // Formation match
  if (t1.baseFormation !== t2.baseFormation) {
    if (t1.baseFormation === 'hybrid' || t2.baseFormation === 'hybrid') {
      similarity -= 10;
    } else {
      similarity -= 20;
    }
  }

  // Blitz rate difference
  const blitzDiff = Math.abs(t1.blitzRate - t2.blitzRate);
  similarity -= blitzDiff * 0.5;

  // Man coverage difference
  const manDiff = Math.abs(t1.manCoverageRate - t2.manCoverageRate);
  similarity -= manDiff * 0.3;

  // Press rate difference
  const pressDiff = Math.abs(t1.pressRate - t2.pressRate);
  similarity -= pressDiff * 0.2;

  return Math.max(0, Math.min(100, similarity));
}
