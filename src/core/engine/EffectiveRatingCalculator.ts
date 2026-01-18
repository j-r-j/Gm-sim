/**
 * Effective Rating Calculator
 * Calculates a player's effective rating for a specific play/moment.
 * This value is NEVER shown to the user - it's purely for engine calculations.
 */

import { Player } from '../models/player/Player';
import { Coach } from '../models/staff/Coach';
import { OffensiveScheme, DefensiveScheme } from '../models/player/SchemeFit';
import { getRoleFitModifier, RoleType } from '../models/player/RoleFit';
import { getClutchModifier } from '../models/player/ItFactor';
import { getInjuryPerformanceModifier } from '../models/player/InjuryStatus';
import { hasTrait } from '../models/player/HiddenTraits';
// Import sophisticated scheme fit and chemistry calculators from coaching module
import {
  calculateSchemeFitScore,
  getSchemeFitModifier as getAdvancedSchemeFitModifier,
} from '../coaching/SchemeFitCalculator';
import { getChemistryModifier } from '../coaching/ChemistryCalculator';
import { getGameDayCoachModifier } from '../coaching/CoachEvaluationSystem';

/**
 * Game stakes affecting performance
 */
export type GameStakes = 'preseason' | 'regular' | 'rivalry' | 'playoff' | 'championship';

/**
 * Weather conditions affecting performance
 */
export interface WeatherCondition {
  /** Temperature in Fahrenheit */
  temperature: number;
  /** Type of precipitation */
  precipitation: 'none' | 'rain' | 'snow';
  /** Wind speed in mph */
  wind: number;
  /** Whether the game is in a dome */
  isDome: boolean;
}

/**
 * Parameters for calculating effective rating
 */
export interface EffectiveRatingParams {
  player: Player;
  skill: string;
  positionCoach: Coach | null;
  teamScheme: OffensiveScheme | DefensiveScheme;
  assignedRole: RoleType;
  weather: WeatherCondition;
  gameStakes: GameStakes;
  weeklyVariance: number;
}

/**
 * Stakes multipliers for clutch calculations
 * Higher stakes = more "It" factor influence
 */
const STAKES_MULTIPLIERS: Record<GameStakes, number> = {
  preseason: 0,
  regular: 0.5,
  rivalry: 0.75,
  playoff: 1.0,
  championship: 1.25,
};

/**
 * Calculate scheme fit modifier (-10 to +10 range for effective rating)
 * Uses the sophisticated SchemeFitCalculator that considers:
 * - Position-specific skill requirements for each scheme
 * - Transition penalties for players new to a scheme
 * - Weighted importance of different skills per scheme
 */
export function calculateSchemeFitModifier(
  player: Player,
  scheme: OffensiveScheme | DefensiveScheme,
  yearsInScheme: number = 1
): number {
  // Use the sophisticated scheme fit calculator
  const fitScore = calculateSchemeFitScore(player, scheme, yearsInScheme);

  // Get the fit level modifier (-0.1 to +0.1)
  const fitModifier = getAdvancedSchemeFitModifier(fitScore.fitLevel);

  // Convert to rating points (-10 to +10)
  // The modifier is -0.1 to +0.1, so multiply by 100 to get -10 to +10
  return Math.round(fitModifier * 100);
}

/**
 * Calculate role fit modifier (-8 to +10 range)
 * Uses the existing role fit system and converts to rating points
 */
export function calculateRoleFitModifier(player: Player, role: RoleType): number {
  // getRoleFitModifier returns a multiplier based on roleEffectiveness
  const multiplier = getRoleFitModifier(player.roleFit);

  // Check if current role matches assigned role
  const roleMismatch = player.roleFit.currentRole !== role;

  // Convert multiplier to rating points (-8 to +10)
  // multiplier is 0.9 to 1.1 range
  const basePoints = (multiplier - 1) * 100; // -10 to +10

  // Apply penalty if role mismatch
  return roleMismatch ? Math.max(basePoints - 3, -8) : Math.min(basePoints, 10);
}

/**
 * Calculate coach chemistry modifier (-10 to +10 range)
 * Uses the sophisticated ChemistryCalculator that considers:
 * - Personality compatibility between coach and player
 * - Scheme fit alignment
 * - Time together building rapport
 * - Coach's adaptability and style
 */
export function calculateCoachChemistryModifier(player: Player, coach: Coach | null): number {
  if (!coach) return 0;

  // Use the sophisticated chemistry modifier from ChemistryCalculator
  const chemistryResult = getChemistryModifier(coach, player);

  // The result value is already in -10 to +10 range
  return chemistryResult.value;
}

/**
 * Calculate coach quality modifier (-5 to +10 range)
 * Better coaches help all players perform better on game day
 * Uses the coach's gameDayIQ attribute
 */
export function calculateCoachQualityModifier(coach: Coach | null): number {
  if (!coach) return 0;

  // getGameDayCoachModifier returns -0.05 to +0.10 multiplier
  const gameDayMod = getGameDayCoachModifier(coach);

  // Convert to rating points (-5 to +10)
  return Math.round(gameDayMod * 100);
}

/**
 * Calculate weather modifier (-10 to +2 range)
 * Home dome teams may struggle outdoors, cold weather players may thrive
 */
export function calculateWeatherModifier(player: Player, weather: WeatherCondition): number {
  // Domes negate all weather effects
  if (weather.isDome) return 0;

  let modifier = 0;

  // Temperature effects
  if (weather.temperature < 32) {
    // Freezing conditions
    modifier -= 3;
  } else if (weather.temperature < 45) {
    // Cold conditions
    modifier -= 1;
  } else if (weather.temperature > 90) {
    // Hot conditions
    modifier -= 2;
  }

  // Precipitation effects
  if (weather.precipitation === 'rain') {
    modifier -= 2;
  } else if (weather.precipitation === 'snow') {
    modifier -= 4;
  }

  // Wind effects (affects passing more than running)
  if (weather.wind > 20) {
    modifier -= 3;
  } else if (weather.wind > 15) {
    modifier -= 2;
  } else if (weather.wind > 10) {
    modifier -= 1;
  }

  // Iron Man trait helps with tough conditions
  if (hasTrait(player.hiddenTraits, 'ironMan')) {
    modifier = Math.min(modifier + 2, 2);
  }

  // Clamp to range
  return Math.max(-10, Math.min(2, modifier));
}

/**
 * Calculate stakes modifier (-15 to +15 range)
 * Combines game stakes with player's "It" factor
 */
export function calculateStakesModifier(player: Player, stakes: GameStakes): number {
  // Get base clutch modifier from "It" factor (0.85 to 1.15 multiplier)
  const clutchMultiplier = getClutchModifier(player.itFactor);

  // Get stakes multiplier
  const stakesMultiplier = STAKES_MULTIPLIERS[stakes];

  // Convert clutch multiplier to base points (-15 to +15)
  const basePoints = (clutchMultiplier - 1) * 100; // -15 to +15

  // Apply stakes multiplier (preseason = no effect, championship = full effect)
  let finalModifier = basePoints * stakesMultiplier;

  // Check for clutch/chokes traits
  if (hasTrait(player.hiddenTraits, 'clutch')) {
    finalModifier += 5 * stakesMultiplier;
  }
  if (hasTrait(player.hiddenTraits, 'chokes')) {
    finalModifier -= 5 * stakesMultiplier;
  }

  // Cool under pressure helps in high stakes
  if (hasTrait(player.hiddenTraits, 'coolUnderPressure')) {
    finalModifier += 3 * stakesMultiplier;
  }

  // Clamp to range
  return Math.max(-15, Math.min(15, finalModifier));
}

/**
 * Get a player's true skill value for a given skill
 * Returns average if skill doesn't exist
 */
function getPlayerTrueSkillValue(player: Player, skill: string): number {
  const skillValue = player.skills[skill];
  if (skillValue) {
    return skillValue.trueValue;
  }

  // If skill doesn't exist, calculate average of all skills
  const allSkills = Object.values(player.skills);
  if (allSkills.length === 0) return 50;

  const sum = allSkills.reduce((acc, s) => acc + s.trueValue, 0);
  return sum / allSkills.length;
}

/**
 * Calculate the effective rating for a player
 *
 * Formula:
 * Base True Rating
 * + Scheme Fit (-10 to +8)
 * + Role Fit (-8 to +10)
 * + Coach Chemistry (-10 to +10)
 * + Coach Quality (-5 to +10) - Coach's game-day IQ
 * + Weather Tolerance (-10 to +2)
 * + Game Stakes x "It" Factor (-15 to +15)
 * + Weekly Random (Consistency-based)
 * + Injury Modifier
 * = Effective Rating (clamped 1-100)
 *
 * This value is NEVER shown to the user
 */
export function calculateEffectiveRating(params: EffectiveRatingParams): number {
  const {
    player,
    skill,
    positionCoach,
    teamScheme,
    assignedRole,
    weather,
    gameStakes,
    weeklyVariance,
  } = params;

  // Start with base true rating
  const baseRating = getPlayerTrueSkillValue(player, skill);

  // Apply all modifiers
  const schemeFit = calculateSchemeFitModifier(player, teamScheme);
  const roleFit = calculateRoleFitModifier(player, assignedRole);
  const coachChemistry = calculateCoachChemistryModifier(player, positionCoach);
  const coachQuality = calculateCoachQualityModifier(positionCoach);
  const weatherMod = calculateWeatherModifier(player, weather);
  const stakesMod = calculateStakesModifier(player, gameStakes);

  // Weekly variance is pre-calculated based on consistency tier
  const varianceMod = weeklyVariance;

  // Calculate pre-injury rating
  let effectiveRating =
    baseRating + schemeFit + roleFit + coachChemistry + coachQuality + weatherMod + stakesMod + varianceMod;

  // Apply injury modifier as a multiplier
  const injuryMultiplier = getInjuryPerformanceModifier(player.injuryStatus);
  effectiveRating *= injuryMultiplier;

  // Apply fatigue penalty (small penalty for high fatigue)
  const fatiguePenalty = Math.floor(player.fatigue / 25); // 0-4 point penalty
  effectiveRating -= fatiguePenalty;

  // Apply morale modifier (small bonus/penalty for morale)
  const moraleMod = (player.morale - 50) / 25; // -2 to +2
  effectiveRating += moraleMod;

  // Check for traits that affect overall performance
  if (hasTrait(player.hiddenTraits, 'motor')) {
    effectiveRating += 2; // Always gives effort
  }
  if (hasTrait(player.hiddenTraits, 'lazy')) {
    effectiveRating -= 3; // Sometimes doesn't give full effort
  }

  // Clamp to valid range
  return Math.max(1, Math.min(100, Math.round(effectiveRating)));
}

/**
 * Calculate average effective rating across multiple skills
 */
export function calculateAverageEffectiveRating(
  params: Omit<EffectiveRatingParams, 'skill'>,
  skills: string[]
): number {
  if (skills.length === 0) return 50;

  const total = skills.reduce((sum, skill) => {
    return sum + calculateEffectiveRating({ ...params, skill });
  }, 0);

  return Math.round(total / skills.length);
}

/**
 * Create default weather conditions (neutral)
 */
export function createDefaultWeather(): WeatherCondition {
  return {
    temperature: 70,
    precipitation: 'none',
    wind: 5,
    isDome: false,
  };
}

/**
 * Create dome weather conditions
 */
export function createDomeWeather(): WeatherCondition {
  return {
    temperature: 72,
    precipitation: 'none',
    wind: 0,
    isDome: true,
  };
}
