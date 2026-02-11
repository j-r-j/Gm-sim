/**
 * Formation Packages
 * Defines NFL personnel groupings and defensive packages for depth chart management
 */

import { DepthChartSlot } from './DepthChartSlots';

/**
 * Offensive personnel groupings
 * Named using NFL convention: first digit = RBs, second digit = TEs
 * WRs = 5 - (RBs + TEs)
 */
export enum OffensivePersonnel {
  // Standard formations
  ELEVEN = '11', // 1 RB, 1 TE, 3 WR (most common in modern NFL ~60%)
  TWELVE = '12', // 1 RB, 2 TE, 2 WR
  TWENTY_ONE = '21', // 2 RB, 1 TE, 2 WR
  TWENTY_TWO = '22', // 2 RB, 2 TE, 1 WR (goal line, power)

  // Spread formations
  TEN = '10', // 1 RB, 0 TE, 4 WR (4-wide)
  EMPTY = '00', // 0 RB, 0 TE, 5 WR (empty backfield)
  OH_ONE = '01', // 0 RB, 1 TE, 4 WR

  // Heavy formations
  THIRTEEN = '13', // 1 RB, 3 TE, 1 WR (heavy package)
  TWENTY_THREE = '23', // 2 RB, 3 TE, 0 WR (jumbo)
  GOAL_LINE = 'GL', // 2+ RB, 2+ TE, heavy OL
}

/**
 * Defensive packages
 */
export enum DefensivePackage {
  BASE_43 = 'BASE_43', // 4 DL, 3 LB, 4 DB (standard 4-3)
  BASE_34 = 'BASE_34', // 3 DL, 4 LB, 4 DB (standard 3-4)
  NICKEL = 'NICKEL', // 4 DL, 2 LB, 5 DB (vs 3+ WR)
  DIME = 'DIME', // 4 DL, 1 LB, 6 DB (obvious passing)
  QUARTER = 'QUARTER', // 3-4 DL, 0-1 LB, 7 DB (prevent)
  GOAL_LINE = 'GOAL_LINE', // 5+ DL, 3+ LB, 2-3 DB
  BIG_NICKEL = 'BIG_NICKEL', // 4 DL, 2 LB, 5 DB (extra safety instead of CB)
}

/**
 * Personnel package configuration
 */
export interface PersonnelPackage {
  id: string;
  name: string;
  shortName: string;
  description: string;
  slots: DepthChartSlot[]; // Which depth chart slots are used
  isBase: boolean; // Is this a base/starting package
  usagePercent: number; // Approximate % of snaps this package sees
}

/**
 * Offensive personnel packages
 */
export const OFFENSIVE_PACKAGES: Record<OffensivePersonnel, PersonnelPackage> = {
  [OffensivePersonnel.ELEVEN]: {
    id: OffensivePersonnel.ELEVEN,
    name: '11 Personnel',
    shortName: '11',
    description: '1 RB, 1 TE, 3 WR - Modern spread offense',
    slots: [
      DepthChartSlot.QB1,
      DepthChartSlot.RB1,
      DepthChartSlot.WR1,
      DepthChartSlot.WR2,
      DepthChartSlot.SLOT_WR,
      DepthChartSlot.TE1,
      DepthChartSlot.LT1,
      DepthChartSlot.LG1,
      DepthChartSlot.C1,
      DepthChartSlot.RG1,
      DepthChartSlot.RT1,
    ],
    isBase: true,
    usagePercent: 60,
  },
  [OffensivePersonnel.TWELVE]: {
    id: OffensivePersonnel.TWELVE,
    name: '12 Personnel',
    shortName: '12',
    description: '1 RB, 2 TE, 2 WR - Balanced attack',
    slots: [
      DepthChartSlot.QB1,
      DepthChartSlot.RB1,
      DepthChartSlot.WR1,
      DepthChartSlot.WR2,
      DepthChartSlot.TE1,
      DepthChartSlot.TE2,
      DepthChartSlot.LT1,
      DepthChartSlot.LG1,
      DepthChartSlot.C1,
      DepthChartSlot.RG1,
      DepthChartSlot.RT1,
    ],
    isBase: false,
    usagePercent: 20,
  },
  [OffensivePersonnel.TWENTY_ONE]: {
    id: OffensivePersonnel.TWENTY_ONE,
    name: '21 Personnel',
    shortName: '21',
    description: '2 RB, 1 TE, 2 WR - Power run game',
    slots: [
      DepthChartSlot.QB1,
      DepthChartSlot.RB1,
      DepthChartSlot.FB,
      DepthChartSlot.WR1,
      DepthChartSlot.WR2,
      DepthChartSlot.TE1,
      DepthChartSlot.LT1,
      DepthChartSlot.LG1,
      DepthChartSlot.C1,
      DepthChartSlot.RG1,
      DepthChartSlot.RT1,
    ],
    isBase: false,
    usagePercent: 8,
  },
  [OffensivePersonnel.TWENTY_TWO]: {
    id: OffensivePersonnel.TWENTY_TWO,
    name: '22 Personnel',
    shortName: '22',
    description: '2 RB, 2 TE, 1 WR - Heavy run/goal line',
    slots: [
      DepthChartSlot.QB1,
      DepthChartSlot.RB1,
      DepthChartSlot.FB,
      DepthChartSlot.WR1,
      DepthChartSlot.TE1,
      DepthChartSlot.TE2,
      DepthChartSlot.LT1,
      DepthChartSlot.LG1,
      DepthChartSlot.C1,
      DepthChartSlot.RG1,
      DepthChartSlot.RT1,
    ],
    isBase: false,
    usagePercent: 3,
  },
  [OffensivePersonnel.TEN]: {
    id: OffensivePersonnel.TEN,
    name: '10 Personnel',
    shortName: '10',
    description: '1 RB, 0 TE, 4 WR - Four wide spread',
    slots: [
      DepthChartSlot.QB1,
      DepthChartSlot.RB1,
      DepthChartSlot.WR1,
      DepthChartSlot.WR2,
      DepthChartSlot.SLOT_WR,
      DepthChartSlot.WR4,
      DepthChartSlot.LT1,
      DepthChartSlot.LG1,
      DepthChartSlot.C1,
      DepthChartSlot.RG1,
      DepthChartSlot.RT1,
    ],
    isBase: false,
    usagePercent: 5,
  },
  [OffensivePersonnel.EMPTY]: {
    id: OffensivePersonnel.EMPTY,
    name: 'Empty Personnel',
    shortName: '00',
    description: '0 RB, 0 TE, 5 WR - Empty backfield',
    slots: [
      DepthChartSlot.QB1,
      DepthChartSlot.WR1,
      DepthChartSlot.WR2,
      DepthChartSlot.WR3,
      DepthChartSlot.SLOT_WR,
      DepthChartSlot.WR4,
      DepthChartSlot.LT1,
      DepthChartSlot.LG1,
      DepthChartSlot.C1,
      DepthChartSlot.RG1,
      DepthChartSlot.RT1,
    ],
    isBase: false,
    usagePercent: 2,
  },
  [OffensivePersonnel.OH_ONE]: {
    id: OffensivePersonnel.OH_ONE,
    name: '01 Personnel',
    shortName: '01',
    description: '0 RB, 1 TE, 4 WR - Spread with TE',
    slots: [
      DepthChartSlot.QB1,
      DepthChartSlot.WR1,
      DepthChartSlot.WR2,
      DepthChartSlot.SLOT_WR,
      DepthChartSlot.WR4,
      DepthChartSlot.TE1,
      DepthChartSlot.LT1,
      DepthChartSlot.LG1,
      DepthChartSlot.C1,
      DepthChartSlot.RG1,
      DepthChartSlot.RT1,
    ],
    isBase: false,
    usagePercent: 1,
  },
  [OffensivePersonnel.THIRTEEN]: {
    id: OffensivePersonnel.THIRTEEN,
    name: '13 Personnel',
    shortName: '13',
    description: '1 RB, 3 TE, 1 WR - Heavy package',
    slots: [
      DepthChartSlot.QB1,
      DepthChartSlot.RB1,
      DepthChartSlot.WR1,
      DepthChartSlot.TE1,
      DepthChartSlot.TE2,
      DepthChartSlot.TE3,
      DepthChartSlot.LT1,
      DepthChartSlot.LG1,
      DepthChartSlot.C1,
      DepthChartSlot.RG1,
      DepthChartSlot.RT1,
    ],
    isBase: false,
    usagePercent: 1,
  },
  [OffensivePersonnel.TWENTY_THREE]: {
    id: OffensivePersonnel.TWENTY_THREE,
    name: '23 Personnel',
    shortName: '23',
    description: '2 RB, 3 TE, 0 WR - Jumbo package',
    slots: [
      DepthChartSlot.QB1,
      DepthChartSlot.RB1,
      DepthChartSlot.FB,
      DepthChartSlot.TE1,
      DepthChartSlot.TE2,
      DepthChartSlot.TE3,
      DepthChartSlot.LT1,
      DepthChartSlot.LG1,
      DepthChartSlot.C1,
      DepthChartSlot.RG1,
      DepthChartSlot.RT1,
    ],
    isBase: false,
    usagePercent: 0.5,
  },
  [OffensivePersonnel.GOAL_LINE]: {
    id: OffensivePersonnel.GOAL_LINE,
    name: 'Goal Line',
    shortName: 'GL',
    description: 'Heavy goal line package',
    slots: [
      DepthChartSlot.QB1,
      DepthChartSlot.RB1,
      DepthChartSlot.FB,
      DepthChartSlot.TE1,
      DepthChartSlot.TE2,
      DepthChartSlot.TE3,
      DepthChartSlot.LT1,
      DepthChartSlot.LG1,
      DepthChartSlot.C1,
      DepthChartSlot.RG1,
      DepthChartSlot.RT1,
    ],
    isBase: false,
    usagePercent: 0.5,
  },
};

/**
 * Defensive packages
 */
export const DEFENSIVE_PACKAGES: Record<DefensivePackage, PersonnelPackage> = {
  [DefensivePackage.BASE_43]: {
    id: DefensivePackage.BASE_43,
    name: '4-3 Base',
    shortName: '4-3',
    description: '4 DL, 3 LB, 4 DB - Standard base defense',
    slots: [
      DepthChartSlot.LE1,
      DepthChartSlot.DT1,
      DepthChartSlot.DT2,
      DepthChartSlot.RE1,
      DepthChartSlot.LOLB1,
      DepthChartSlot.MLB1,
      DepthChartSlot.ROLB1,
      DepthChartSlot.CB1,
      DepthChartSlot.CB2,
      DepthChartSlot.FS1,
      DepthChartSlot.SS1,
    ],
    isBase: true,
    usagePercent: 25,
  },
  [DefensivePackage.BASE_34]: {
    id: DefensivePackage.BASE_34,
    name: '3-4 Base',
    shortName: '3-4',
    description: '3 DL, 4 LB, 4 DB - Two-gap base defense',
    slots: [
      DepthChartSlot.LE1,
      DepthChartSlot.DT1, // Nose tackle in 3-4
      DepthChartSlot.RE1,
      DepthChartSlot.LOLB1,
      DepthChartSlot.MLB1,
      DepthChartSlot.MLB2, // Second ILB
      DepthChartSlot.ROLB1,
      DepthChartSlot.CB1,
      DepthChartSlot.CB2,
      DepthChartSlot.FS1,
      DepthChartSlot.SS1,
    ],
    isBase: true,
    usagePercent: 10,
  },
  [DefensivePackage.NICKEL]: {
    id: DefensivePackage.NICKEL,
    name: 'Nickel',
    shortName: 'NICK',
    description: '4 DL, 2 LB, 5 DB - Modern base defense',
    slots: [
      DepthChartSlot.RUSH_LE,
      DepthChartSlot.DT1,
      DepthChartSlot.DT2,
      DepthChartSlot.RUSH_RE,
      DepthChartSlot.SUB_LB, // Coverage LB
      DepthChartSlot.MLB1,
      DepthChartSlot.CB1,
      DepthChartSlot.CB2,
      DepthChartSlot.SLOT_CB, // Nickel CB
      DepthChartSlot.FS1,
      DepthChartSlot.SS1,
    ],
    isBase: false,
    usagePercent: 45,
  },
  [DefensivePackage.DIME]: {
    id: DefensivePackage.DIME,
    name: 'Dime',
    shortName: 'DIME',
    description: '4 DL, 1 LB, 6 DB - Pass defense',
    slots: [
      DepthChartSlot.RUSH_LE,
      DepthChartSlot.RUSH_DT,
      DepthChartSlot.DT1,
      DepthChartSlot.RUSH_RE,
      DepthChartSlot.SUB_LB,
      DepthChartSlot.CB1,
      DepthChartSlot.CB2,
      DepthChartSlot.CB3,
      DepthChartSlot.SLOT_CB,
      DepthChartSlot.FS1,
      DepthChartSlot.SS1,
    ],
    isBase: false,
    usagePercent: 12,
  },
  [DefensivePackage.QUARTER]: {
    id: DefensivePackage.QUARTER,
    name: 'Quarter',
    shortName: 'QTR',
    description: '3 DL, 1 LB, 7 DB - Prevent defense',
    slots: [
      DepthChartSlot.LE1,
      DepthChartSlot.DT1,
      DepthChartSlot.RE1,
      DepthChartSlot.SUB_LB,
      DepthChartSlot.CB1,
      DepthChartSlot.CB2,
      DepthChartSlot.CB3,
      DepthChartSlot.CB4,
      DepthChartSlot.SLOT_CB,
      DepthChartSlot.FS1,
      DepthChartSlot.SS1,
    ],
    isBase: false,
    usagePercent: 3,
  },
  [DefensivePackage.GOAL_LINE]: {
    id: DefensivePackage.GOAL_LINE,
    name: 'Goal Line Defense',
    shortName: 'GL',
    description: '5 DL, 4 LB, 2 DB - Short yardage',
    slots: [
      DepthChartSlot.LE1,
      DepthChartSlot.DT1,
      DepthChartSlot.DT2,
      DepthChartSlot.DT3, // Extra DT
      DepthChartSlot.RE1,
      DepthChartSlot.LOLB1,
      DepthChartSlot.MLB1,
      DepthChartSlot.MLB2,
      DepthChartSlot.ROLB1,
      DepthChartSlot.SS1,
      DepthChartSlot.FS1,
    ],
    isBase: false,
    usagePercent: 3,
  },
  [DefensivePackage.BIG_NICKEL]: {
    id: DefensivePackage.BIG_NICKEL,
    name: 'Big Nickel',
    shortName: 'BNIK',
    description: '4 DL, 2 LB, 5 DB - Extra safety vs TE',
    slots: [
      DepthChartSlot.LE1,
      DepthChartSlot.DT1,
      DepthChartSlot.DT2,
      DepthChartSlot.RE1,
      DepthChartSlot.MLB1,
      DepthChartSlot.SUB_LB,
      DepthChartSlot.CB1,
      DepthChartSlot.CB2,
      DepthChartSlot.FS1,
      DepthChartSlot.SS1,
      DepthChartSlot.SS2, // Third safety
    ],
    isBase: false,
    usagePercent: 2,
  },
};

/**
 * Special teams packages
 */
export const SPECIAL_TEAMS_PACKAGES: Record<string, PersonnelPackage> = {
  FIELD_GOAL: {
    id: 'FIELD_GOAL',
    name: 'Field Goal Unit',
    shortName: 'FG',
    description: 'Field goal and extra point unit',
    slots: [DepthChartSlot.K1, DepthChartSlot.H, DepthChartSlot.LS],
    isBase: true,
    usagePercent: 100,
  },
  PUNT: {
    id: 'PUNT',
    name: 'Punt Unit',
    shortName: 'PUNT',
    description: 'Punting unit',
    slots: [DepthChartSlot.P1, DepthChartSlot.LS],
    isBase: true,
    usagePercent: 100,
  },
  KICK_RETURN: {
    id: 'KICK_RETURN',
    name: 'Kick Return Unit',
    shortName: 'KR',
    description: 'Kick return unit',
    slots: [DepthChartSlot.KR1, DepthChartSlot.KR2],
    isBase: true,
    usagePercent: 100,
  },
  PUNT_RETURN: {
    id: 'PUNT_RETURN',
    name: 'Punt Return Unit',
    shortName: 'PR',
    description: 'Punt return unit',
    slots: [DepthChartSlot.PR1],
    isBase: true,
    usagePercent: 100,
  },
};

/**
 * Get base package for offense (11 personnel)
 */
export function getBaseOffensivePackage(): PersonnelPackage {
  return OFFENSIVE_PACKAGES[OffensivePersonnel.ELEVEN];
}

/**
 * Get base package for defense (depends on scheme, default to 4-3)
 */
export function getBaseDefensivePackage(is34Scheme: boolean = false): PersonnelPackage {
  return is34Scheme
    ? DEFENSIVE_PACKAGES[DefensivePackage.BASE_34]
    : DEFENSIVE_PACKAGES[DefensivePackage.BASE_43];
}

/**
 * Get package appropriate for game situation
 */
export function getSituationalDefensivePackage(
  down: number,
  yardsToGo: number,
  yardsToEndzone: number
): DefensivePackage {
  // Goal line situation
  if (yardsToEndzone <= 3 && yardsToGo <= 3) {
    return DefensivePackage.GOAL_LINE;
  }

  // Obvious passing situation (3rd/4th and long)
  if ((down >= 3 && yardsToGo >= 10) || (down === 4 && yardsToGo >= 5)) {
    return yardsToGo >= 15 ? DefensivePackage.QUARTER : DefensivePackage.DIME;
  }

  // Standard passing down (3rd and medium)
  if (down >= 3 && yardsToGo >= 4) {
    return DefensivePackage.NICKEL;
  }

  // Default to nickel (modern NFL base)
  return DefensivePackage.NICKEL;
}

/**
 * Get all offensive packages sorted by usage
 */
export function getOffensivePackagesByUsage(): PersonnelPackage[] {
  return Object.values(OFFENSIVE_PACKAGES).sort((a, b) => b.usagePercent - a.usagePercent);
}

/**
 * Get all defensive packages sorted by usage
 */
export function getDefensivePackagesByUsage(): PersonnelPackage[] {
  return Object.values(DEFENSIVE_PACKAGES).sort((a, b) => b.usagePercent - a.usagePercent);
}
