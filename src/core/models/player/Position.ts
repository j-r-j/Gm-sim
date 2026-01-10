/**
 * NFL player positions
 */
export enum Position {
  // Offense
  QB = 'QB',
  RB = 'RB',
  WR = 'WR',
  TE = 'TE',
  LT = 'LT',
  LG = 'LG',
  C = 'C',
  RG = 'RG',
  RT = 'RT',

  // Defense
  DE = 'DE',
  DT = 'DT',
  OLB = 'OLB',
  ILB = 'ILB',
  CB = 'CB',
  FS = 'FS',
  SS = 'SS',

  // Special Teams
  K = 'K',
  P = 'P',
}

/**
 * All offensive positions
 */
export const OFFENSIVE_POSITIONS: Position[] = [
  Position.QB,
  Position.RB,
  Position.WR,
  Position.TE,
  Position.LT,
  Position.LG,
  Position.C,
  Position.RG,
  Position.RT,
];

/**
 * All defensive positions
 */
export const DEFENSIVE_POSITIONS: Position[] = [
  Position.DE,
  Position.DT,
  Position.OLB,
  Position.ILB,
  Position.CB,
  Position.FS,
  Position.SS,
];

/**
 * All special teams positions
 */
export const SPECIAL_TEAMS_POSITIONS: Position[] = [Position.K, Position.P];

/**
 * Check if a position is offensive
 */
export function isOffensivePosition(position: Position): boolean {
  return OFFENSIVE_POSITIONS.includes(position);
}

/**
 * Check if a position is defensive
 */
export function isDefensivePosition(position: Position): boolean {
  return DEFENSIVE_POSITIONS.includes(position);
}

/**
 * Check if a position is special teams
 */
export function isSpecialTeamsPosition(position: Position): boolean {
  return SPECIAL_TEAMS_POSITIONS.includes(position);
}
