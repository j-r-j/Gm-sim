/**
 * Personnel Packages
 * Defines offensive and defensive personnel groupings and their effects.
 * Creates mismatches when personnel doesn't match defensive alignment.
 */

import { PlayType } from './OutcomeTables';

/**
 * Helper to check if play is a run play
 */
const RUN_PLAY_TYPES: PlayType[] = [
  'run_inside',
  'run_outside',
  'run_draw',
  'run_sweep',
  'qb_sneak',
];
function isRunPlayType(playType: PlayType): boolean {
  return RUN_PLAY_TYPES.indexOf(playType) !== -1;
}

/**
 * Offensive personnel packages (# RB, # TE, # WR)
 * e.g., "11" = 1 RB, 1 TE, 3 WR (implied)
 */
export type OffensivePersonnelPackage =
  | '10' // 1 RB, 0 TE, 4 WR (Empty spread)
  | '11' // 1 RB, 1 TE, 3 WR (Standard passing)
  | '12' // 1 RB, 2 TE, 2 WR (Balanced)
  | '13' // 1 RB, 3 TE, 1 WR (Heavy run/goal line)
  | '20' // 2 RB, 0 TE, 3 WR (Spread with 2 backs)
  | '21' // 2 RB, 1 TE, 2 WR (Power run)
  | '22' // 2 RB, 2 TE, 1 WR (Heavy)
  | '23'; // 2 RB, 3 TE, 0 WR (Jumbo/Goal line)

/**
 * Defensive personnel packages
 */
export type DefensivePersonnelPackage =
  | 'base' // 4-3 or 3-4 base (4 DL, 3 LB, 4 DB or 3 DL, 4 LB, 4 DB)
  | 'nickel' // 5 DBs (sub out LB)
  | 'dime' // 6 DBs (sub out 2 LBs)
  | 'quarter' // 7 DBs (prevent defense)
  | 'goalLine' // Heavy front (extra DL/LB)
  | 'bigNickel'; // 3 safeties (vs TE-heavy)

/**
 * Personnel package info
 */
export interface PersonnelInfo {
  package: OffensivePersonnelPackage;
  runTendency: number; // 0-100, expected run %
  description: string;
  strengths: string[];
  weaknesses: string[];
}

/**
 * Offensive personnel package details
 */
export const OFFENSIVE_PERSONNEL: Record<OffensivePersonnelPackage, PersonnelInfo> = {
  '10': {
    package: '10',
    runTendency: 15,
    description: '4 WR Empty',
    strengths: ['spread defense', 'mismatches in coverage', 'quick passing'],
    weaknesses: ['no run threat', 'vulnerable to blitz', 'predictable'],
  },
  '11': {
    package: '11',
    runTendency: 40,
    description: '3 WR Standard',
    strengths: ['balanced attack', 'versatile', 'keeps defense guessing'],
    weaknesses: ['no heavy run support'],
  },
  '12': {
    package: '12',
    runTendency: 50,
    description: '2 TE Balanced',
    strengths: ['play action', 'run/pass balance', 'TE mismatches'],
    weaknesses: ['fewer deep threats'],
  },
  '13': {
    package: '13',
    runTendency: 75,
    description: '3 TE Heavy',
    strengths: ['power run', 'short yardage', 'play action deep'],
    weaknesses: ['limited passing options', 'predictable run'],
  },
  '20': {
    package: '20',
    runTendency: 25,
    description: '2 RB Spread',
    strengths: ['RB screens', 'check-down options', 'delayed run'],
    weaknesses: ['no TE blocking', 'pass heavy tendency'],
  },
  '21': {
    package: '21',
    runTendency: 60,
    description: '2 RB Power',
    strengths: ['power run', 'lead blocking', 'play action'],
    weaknesses: ['limited passing tree', 'slower tempo'],
  },
  '22': {
    package: '22',
    runTendency: 70,
    description: '2 RB Heavy',
    strengths: ['goal line run', 'short yardage', 'clock control'],
    weaknesses: ['very limited passing', 'easy to stack box'],
  },
  '23': {
    package: '23',
    runTendency: 90,
    description: 'Jumbo Package',
    strengths: ['goal line push', 'QB sneak setup', 'maximum blocking'],
    weaknesses: ['no passing threat', 'one dimensional'],
  },
};

/**
 * Defensive personnel package details
 */
export interface DefensivePersonnelInfo {
  package: DefensivePersonnelPackage;
  dlCount: number;
  lbCount: number;
  dbCount: number;
  runDefenseModifier: number; // -20 to +20
  passDefenseModifier: number; // -20 to +20
  blitzEffectiveness: number; // 0.5 to 1.5 multiplier
}

export const DEFENSIVE_PERSONNEL: Record<DefensivePersonnelPackage, DefensivePersonnelInfo> = {
  base: {
    package: 'base',
    dlCount: 4,
    lbCount: 3,
    dbCount: 4,
    runDefenseModifier: 5,
    passDefenseModifier: 0,
    blitzEffectiveness: 1.0,
  },
  nickel: {
    package: 'nickel',
    dlCount: 4,
    lbCount: 2,
    dbCount: 5,
    runDefenseModifier: -5,
    passDefenseModifier: 8,
    blitzEffectiveness: 1.1,
  },
  dime: {
    package: 'dime',
    dlCount: 4,
    lbCount: 1,
    dbCount: 6,
    runDefenseModifier: -12,
    passDefenseModifier: 15,
    blitzEffectiveness: 0.9,
  },
  quarter: {
    package: 'quarter',
    dlCount: 3,
    lbCount: 1,
    dbCount: 7,
    runDefenseModifier: -20,
    passDefenseModifier: 20,
    blitzEffectiveness: 0.5,
  },
  goalLine: {
    package: 'goalLine',
    dlCount: 5,
    lbCount: 4,
    dbCount: 2,
    runDefenseModifier: 15,
    passDefenseModifier: -15,
    blitzEffectiveness: 1.3,
  },
  bigNickel: {
    package: 'bigNickel',
    dlCount: 4,
    lbCount: 2,
    dbCount: 5,
    runDefenseModifier: 0,
    passDefenseModifier: 5,
    blitzEffectiveness: 1.0,
  },
};

/**
 * Mismatch result when personnel packages don't align
 */
export interface PersonnelMismatch {
  type: 'run' | 'pass' | 'none';
  advantage: 'offense' | 'defense' | 'neutral';
  modifier: number; // -15 to +15 to effective ratings
  description: string;
}

/**
 * Calculate mismatch between offensive and defensive personnel
 */
export function calculatePersonnelMismatch(
  offensePackage: OffensivePersonnelPackage,
  defensePackage: DefensivePersonnelPackage,
  isRunPlay: boolean
): PersonnelMismatch {
  const offense = OFFENSIVE_PERSONNEL[offensePackage];
  const defense = DEFENSIVE_PERSONNEL[defensePackage];

  // Get defense modifier based on play type
  const defenseModifier = isRunPlay ? defense.runDefenseModifier : defense.passDefenseModifier;

  // Heavy offense vs light defense = run advantage
  if (offense.runTendency >= 60 && defensePackage === 'dime') {
    // Dime has -12 run defense modifier, amplifies the mismatch
    return {
      type: 'run',
      advantage: 'offense',
      modifier: 12 + Math.abs(defense.runDefenseModifier) / 2,
      description: 'Heavy personnel vs light box - running lanes open',
    };
  }

  if (offense.runTendency >= 60 && defensePackage === 'quarter') {
    // Quarter has -20 run defense modifier
    return {
      type: 'run',
      advantage: 'offense',
      modifier: 18 + Math.abs(defense.runDefenseModifier) / 2,
      description: 'Jumbo vs prevent - massive run advantage',
    };
  }

  // Spread offense vs heavy defense = pass advantage
  if (offense.runTendency <= 30 && defensePackage === 'goalLine') {
    // Goal line has -15 pass defense modifier
    return {
      type: 'pass',
      advantage: 'offense',
      modifier: 15 + Math.abs(defense.passDefenseModifier) / 2,
      description: 'Spread vs goal line - DBs in coverage mismatches',
    };
  }

  if (offense.runTendency <= 30 && defensePackage === 'base') {
    return {
      type: 'pass',
      advantage: 'offense',
      modifier: 8,
      description: 'LB covering slot WR - mismatch in coverage',
    };
  }

  // Defense correctly identifies tendency - use defense modifiers
  if (isRunPlay && offense.runTendency >= 60 && defensePackage === 'goalLine') {
    // Goal line has +15 run defense modifier
    return {
      type: 'run',
      advantage: 'defense',
      modifier: -8 - defense.runDefenseModifier / 2,
      description: 'Defense loaded box against obvious run',
    };
  }

  if (!isRunPlay && offense.runTendency <= 30 && defensePackage === 'dime') {
    // Dime has +15 pass defense modifier
    return {
      type: 'pass',
      advantage: 'defense',
      modifier: -5 - defense.passDefenseModifier / 2,
      description: 'Defense in pass coverage vs pass-heavy personnel',
    };
  }

  // 12 personnel (2 TE) vs nickel = TE mismatch
  if ((offensePackage === '12' || offensePackage === '13') && defensePackage === 'nickel') {
    return {
      type: 'pass',
      advantage: 'offense',
      modifier: 10,
      description: 'TE mismatch against nickel DB',
    };
  }

  // Balanced matchup - apply defense modifier as a base adjustment
  // Positive modifier for defense helps defense, negative helps offense
  const baseModifier = isRunPlay
    ? -defense.runDefenseModifier / 4
    : -defense.passDefenseModifier / 4;

  if (Math.abs(baseModifier) >= 2) {
    return {
      type: isRunPlay ? 'run' : 'pass',
      advantage: baseModifier > 0 ? 'offense' : 'defense',
      modifier: Math.round(baseModifier),
      description: `Defense personnel ${defenseModifier > 0 ? 'strong' : 'weak'} against ${isRunPlay ? 'run' : 'pass'}`,
    };
  }

  return {
    type: 'none',
    advantage: 'neutral',
    modifier: 0,
    description: 'Personnel evenly matched',
  };
}

/**
 * Select optimal defensive personnel based on offensive package
 */
export function selectDefensivePersonnel(
  offensePackage: OffensivePersonnelPackage,
  down: number,
  distance: number,
  fieldPosition: number
): DefensivePersonnelPackage {
  const offense = OFFENSIVE_PERSONNEL[offensePackage];

  // Goal line situations
  if (fieldPosition >= 97 || (down >= 3 && distance <= 1)) {
    if (offense.runTendency >= 60) {
      return 'goalLine';
    }
    return 'base';
  }

  // Long distance passing situations
  if (down === 3 && distance > 10) {
    return 'dime';
  }

  // Based on offensive personnel tendency
  if (offense.runTendency >= 70) {
    return 'base';
  }

  if (offense.runTendency <= 25) {
    return 'nickel';
  }

  // 12/13 personnel - big nickel to match TEs
  if (offensePackage === '12' || offensePackage === '13') {
    return 'bigNickel';
  }

  // Default to nickel for modern NFL
  return 'nickel';
}

/**
 * Select offensive personnel based on play call and situation
 */
export function selectOffensivePersonnel(
  playType: PlayType,
  down: number,
  distance: number,
  fieldPosition: number
): OffensivePersonnelPackage {
  // Goal line
  if (fieldPosition >= 98) {
    if (isRunPlayType(playType)) {
      return '23'; // Jumbo
    }
    return '13'; // Heavy with passing option
  }

  // Short yardage
  if (distance <= 1 && down >= 3) {
    if (isRunPlayType(playType)) {
      return '22';
    }
    return '12';
  }

  // Play type based
  if (playType === 'pass_deep' || playType === 'play_action_deep') {
    return Math.random() < 0.6 ? '11' : '10';
  }

  if (playType === 'pass_screen') {
    return Math.random() < 0.5 ? '11' : '20';
  }

  if (isRunPlayType(playType)) {
    const roll = Math.random();
    if (roll < 0.4) return '11';
    if (roll < 0.7) return '12';
    return '21';
  }

  // Default passing
  const roll = Math.random();
  if (roll < 0.5) return '11';
  if (roll < 0.75) return '12';
  return '10';
}

/**
 * Get run/pass tendency adjustment based on personnel
 */
export function getPersonnelTendencyAdjustment(offensePackage: OffensivePersonnelPackage): {
  runAdjustment: number;
  passAdjustment: number;
} {
  const info = OFFENSIVE_PERSONNEL[offensePackage];

  // How much the personnel signals run vs pass
  const runSignal = info.runTendency / 100;
  const passSignal = 1 - runSignal;

  return {
    runAdjustment: (runSignal - 0.5) * 20, // -10 to +10
    passAdjustment: (passSignal - 0.5) * 20, // -10 to +10
  };
}
