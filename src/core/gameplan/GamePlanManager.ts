/**
 * Game Plan / Practice Focus Manager
 *
 * Allows the user to set weekly practice priorities and game plan focus
 * that affect team performance in the upcoming game.
 *
 * Practice Focus Areas:
 * - Pass Offense / Rush Offense / Red Zone Offense
 * - Pass Defense / Rush Defense / Red Zone Defense
 * - Special Teams / Conditioning
 *
 * Game Plan Focus:
 * - Target opponent weakness (e.g., weak secondary, lightweight front)
 * - Emphasize a specific player matchup
 */

import { GameState } from '../models/game/GameState';
import { Team } from '../models/team/Team';
import { Player } from '../models/player/Player';
import { SkillValue } from '../models/player/TechnicalSkills';

/**
 * Practice focus areas the user can allocate reps to
 */
export type PracticeFocusArea =
  | 'passOffense'
  | 'rushOffense'
  | 'redZoneOffense'
  | 'passDefense'
  | 'rushDefense'
  | 'redZoneDefense'
  | 'specialTeams'
  | 'conditioning';

/**
 * Game plan emphasis for the upcoming game
 */
export type GamePlanEmphasis =
  | 'attackWeakSecondary'
  | 'attackWeakFront'
  | 'establishRun'
  | 'spreadThemOut'
  | 'blitzHeavy'
  | 'coverageShells'
  | 'ballControl'
  | 'balanced';

/**
 * Weekly game plan state
 */
export interface WeeklyGamePlan {
  /** Week this game plan is for */
  week: number;

  /** Practice focus allocations (must sum to 100) */
  practiceFocus: Record<PracticeFocusArea, number>;

  /** Chosen game plan emphasis */
  gamePlanEmphasis: GamePlanEmphasis;

  /** Whether the game plan has been set this week */
  isSet: boolean;
}

/**
 * Performance modifiers from game plan
 */
export interface GamePlanModifiers {
  passOffenseBonus: number;
  rushOffenseBonus: number;
  redZoneOffenseBonus: number;
  passDefenseBonus: number;
  rushDefenseBonus: number;
  redZoneDefenseBonus: number;
  specialTeamsBonus: number;
  fatigueReduction: number;
  emphasisBonus: string;
}

/**
 * Opponent analysis for game plan screen
 */
export interface OpponentAnalysis {
  teamId: string;
  teamName: string;
  record: string;
  weaknesses: OpponentWeakness[];
  strengths: OpponentStrength[];
}

export interface OpponentWeakness {
  area: string;
  description: string;
  suggestedEmphasis: GamePlanEmphasis;
}

export interface OpponentStrength {
  area: string;
  description: string;
}

/** All practice focus areas */
export const ALL_PRACTICE_FOCUS_AREAS: PracticeFocusArea[] = [
  'passOffense',
  'rushOffense',
  'redZoneOffense',
  'passDefense',
  'rushDefense',
  'redZoneDefense',
  'specialTeams',
  'conditioning',
];

/** Display names */
export const PRACTICE_FOCUS_LABELS: Record<PracticeFocusArea, string> = {
  passOffense: 'Pass Offense',
  rushOffense: 'Rush Offense',
  redZoneOffense: 'Red Zone O',
  passDefense: 'Pass Defense',
  rushDefense: 'Rush Defense',
  redZoneDefense: 'Red Zone D',
  specialTeams: 'Special Teams',
  conditioning: 'Conditioning',
};

/** Emphasis display names */
export const GAME_PLAN_EMPHASIS_LABELS: Record<GamePlanEmphasis, string> = {
  attackWeakSecondary: 'Attack Weak Secondary',
  attackWeakFront: 'Attack Weak Front',
  establishRun: 'Establish the Run',
  spreadThemOut: 'Spread Them Out',
  blitzHeavy: 'Blitz Heavy',
  coverageShells: 'Play Coverage',
  ballControl: 'Ball Control',
  balanced: 'Balanced',
};

/** Emphasis descriptions */
export const GAME_PLAN_EMPHASIS_DESCRIPTIONS: Record<GamePlanEmphasis, string> = {
  attackWeakSecondary: 'Target their weak cornerbacks and safeties with aggressive passing',
  attackWeakFront: 'Run right at their undersized defensive line',
  establishRun: 'Focus on controlling the clock and wearing down their defense',
  spreadThemOut: 'Use 4-5 WR sets to create mismatches in space',
  blitzHeavy: 'Send extra rushers to pressure their QB',
  coverageShells: 'Play conservative coverage and make them earn every yard',
  ballControl: 'Short passes and runs to maintain possession and limit turnovers',
  balanced: 'No specific emphasis - play your standard scheme',
};

/**
 * Create default weekly game plan (balanced allocation)
 */
export function createDefaultGamePlan(week: number): WeeklyGamePlan {
  return {
    week,
    practiceFocus: {
      passOffense: 15,
      rushOffense: 15,
      redZoneOffense: 10,
      passDefense: 15,
      rushDefense: 15,
      redZoneDefense: 10,
      specialTeams: 10,
      conditioning: 10,
    },
    gamePlanEmphasis: 'balanced',
    isSet: false,
  };
}

/**
 * Update practice focus allocation
 * Validates that allocations sum to 100
 */
export function updatePracticeFocus(
  plan: WeeklyGamePlan,
  area: PracticeFocusArea,
  value: number
): WeeklyGamePlan {
  const clampedValue = Math.max(0, Math.min(50, value));
  const newFocus = { ...plan.practiceFocus, [area]: clampedValue };

  // Calculate the sum of all values
  const total = Object.values(newFocus).reduce((sum, v) => sum + v, 0);

  // If total exceeds 100, proportionally reduce other areas
  if (total > 100) {
    const excess = total - 100;
    const otherAreas = ALL_PRACTICE_FOCUS_AREAS.filter((a) => a !== area);
    const otherTotal = otherAreas.reduce((sum, a) => sum + newFocus[a], 0);

    if (otherTotal > 0) {
      for (const otherArea of otherAreas) {
        const proportion = newFocus[otherArea] / otherTotal;
        newFocus[otherArea] = Math.max(0, Math.round(newFocus[otherArea] - excess * proportion));
      }
    }
  }

  return { ...plan, practiceFocus: newFocus };
}

/**
 * Set game plan emphasis
 */
export function setGamePlanEmphasis(
  plan: WeeklyGamePlan,
  emphasis: GamePlanEmphasis
): WeeklyGamePlan {
  return { ...plan, gamePlanEmphasis: emphasis };
}

/**
 * Mark game plan as set (locks it in)
 */
export function confirmGamePlan(plan: WeeklyGamePlan): WeeklyGamePlan {
  return { ...plan, isSet: true };
}

/**
 * Calculate performance modifiers from game plan
 * Returns bonuses/penalties based on practice focus vs baseline (12.5% each)
 */
export function calculateGamePlanModifiers(plan: WeeklyGamePlan): GamePlanModifiers {
  const baseline = 12.5; // Equal distribution baseline
  const bonusScale = 0.3; // Each % above baseline = 0.3 rating points

  const focusBonus = (area: PracticeFocusArea): number => {
    const deviation = plan.practiceFocus[area] - baseline;
    return Math.round(deviation * bonusScale * 10) / 10;
  };

  return {
    passOffenseBonus: focusBonus('passOffense'),
    rushOffenseBonus: focusBonus('rushOffense'),
    redZoneOffenseBonus: focusBonus('redZoneOffense'),
    passDefenseBonus: focusBonus('passDefense'),
    rushDefenseBonus: focusBonus('rushDefense'),
    redZoneDefenseBonus: focusBonus('redZoneDefense'),
    specialTeamsBonus: focusBonus('specialTeams'),
    fatigueReduction: plan.practiceFocus.conditioning > 15 ? 0.85 : 1.0,
    emphasisBonus: plan.gamePlanEmphasis,
  };
}

/**
 * Analyze opponent to generate weaknesses/strengths for game plan screen
 */
export function analyzeOpponent(
  opponentTeam: Team,
  opponentPlayers: Player[],
  _gameState: GameState
): OpponentAnalysis {
  const weaknesses: OpponentWeakness[] = [];
  const strengths: OpponentStrength[] = [];

  // Analyze by position group ratings
  const positionGroups = {
    secondary: ['CB', 'SS', 'FS'],
    frontSeven: ['DT', 'DE', 'MLB', 'OLB'],
    offensiveLine: ['LT', 'LG', 'C', 'RG', 'RT'],
    receivers: ['WR', 'TE'],
    rushing: ['RB', 'FB'],
  };

  const getGroupAverage = (positions: string[]): number => {
    const groupPlayers = opponentPlayers.filter((p) => positions.includes(p.position));
    if (groupPlayers.length === 0) return 50;
    const totalRating = groupPlayers.reduce((sum, p) => {
      const skills = Object.values(p.skills || {});
      const skillValues = skills
        .filter((s): s is SkillValue => s != null && typeof s === 'object' && 'trueValue' in s)
        .map((s) => s.trueValue);
      return (
        sum +
        (skillValues.length > 0 ? skillValues.reduce((a, b) => a + b, 0) / skillValues.length : 50)
      );
    }, 0);
    return totalRating / groupPlayers.length;
  };

  const secondaryRating = getGroupAverage(positionGroups.secondary);
  const frontRating = getGroupAverage(positionGroups.frontSeven);
  const oLineRating = getGroupAverage(positionGroups.offensiveLine);
  const receiverRating = getGroupAverage(positionGroups.receivers);

  // Identify weaknesses (below 55 average)
  if (secondaryRating < 55) {
    weaknesses.push({
      area: 'Secondary',
      description: `Their DBs average a ${Math.round(secondaryRating)} rating - vulnerable to the pass`,
      suggestedEmphasis: 'attackWeakSecondary',
    });
  }

  if (frontRating < 55) {
    weaknesses.push({
      area: 'Defensive Front',
      description: `Their front seven averages a ${Math.round(frontRating)} rating - run the ball`,
      suggestedEmphasis: 'attackWeakFront',
    });
  }

  if (oLineRating < 55) {
    weaknesses.push({
      area: 'Offensive Line',
      description: `Their O-line averages a ${Math.round(oLineRating)} rating - bring pressure`,
      suggestedEmphasis: 'blitzHeavy',
    });
  }

  // Identify strengths (above 65 average)
  if (secondaryRating >= 65) {
    strengths.push({
      area: 'Secondary',
      description: `Elite DBs averaging ${Math.round(secondaryRating)} - run the ball instead`,
    });
  }

  if (frontRating >= 65) {
    strengths.push({
      area: 'Defensive Front',
      description: `Strong front seven averaging ${Math.round(frontRating)} - quick passing game`,
    });
  }

  if (receiverRating >= 65) {
    strengths.push({
      area: 'Receiving Corps',
      description: `Dangerous receivers averaging ${Math.round(receiverRating)} - play coverage`,
    });
  }

  // Always include at least one weakness and strength
  if (weaknesses.length === 0) {
    weaknesses.push({
      area: 'No Clear Weakness',
      description: 'Well-rounded team - stick to your scheme',
      suggestedEmphasis: 'balanced',
    });
  }

  if (strengths.length === 0) {
    strengths.push({
      area: 'Balanced',
      description: 'No dominant unit - play your game',
    });
  }

  return {
    teamId: opponentTeam.id,
    teamName: `${opponentTeam.city} ${opponentTeam.nickname}`,
    record: `${opponentTeam.currentRecord.wins}-${opponentTeam.currentRecord.losses}`,
    weaknesses,
    strengths,
  };
}

/**
 * Apply game plan to GameState (set the current week's game plan)
 */
export function applyGamePlan(gameState: GameState, plan: WeeklyGamePlan): GameState {
  return {
    ...gameState,
    weeklyGamePlan: plan,
  } as GameState;
}
