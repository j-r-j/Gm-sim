import { Position } from '../../models/player/Position';

/**
 * Maturity and career phase constants for each position.
 * These determine when players reach their peak and begin declining.
 */
export interface PositionMaturityProfile {
  /** Age range when players reach full maturity (skills become clear) */
  maturityAge: { min: number; max: number };
  /** Age when peak performance begins */
  peakStart: number;
  /** Age when peak performance ends */
  peakEnd: number;
  /** Age when decline begins */
  declineStart: number;
}

/**
 * Position-specific maturity and career phase constants.
 * Based on NFL career patterns for each position.
 */
export const POSITION_MATURITY: Record<Position, PositionMaturityProfile> = {
  // Quarterbacks mature late, peak for a long time
  [Position.QB]: {
    maturityAge: { min: 27, max: 28 },
    peakStart: 28,
    peakEnd: 34,
    declineStart: 35,
  },

  // Running backs mature early, short careers
  [Position.RB]: {
    maturityAge: { min: 24, max: 25 },
    peakStart: 25,
    peakEnd: 27,
    declineStart: 28,
  },

  // Wide receivers have medium maturity, good longevity
  [Position.WR]: {
    maturityAge: { min: 26, max: 27 },
    peakStart: 27,
    peakEnd: 30,
    declineStart: 31,
  },

  // Tight ends need time to develop blocking and receiving
  [Position.TE]: {
    maturityAge: { min: 26, max: 27 },
    peakStart: 27,
    peakEnd: 31,
    declineStart: 32,
  },

  // Offensive linemen mature at medium pace, long careers
  [Position.LT]: {
    maturityAge: { min: 25, max: 26 },
    peakStart: 26,
    peakEnd: 32,
    declineStart: 33,
  },
  [Position.LG]: {
    maturityAge: { min: 25, max: 26 },
    peakStart: 26,
    peakEnd: 32,
    declineStart: 33,
  },
  [Position.C]: {
    maturityAge: { min: 25, max: 26 },
    peakStart: 26,
    peakEnd: 33,
    declineStart: 34,
  },
  [Position.RG]: {
    maturityAge: { min: 25, max: 26 },
    peakStart: 26,
    peakEnd: 32,
    declineStart: 33,
  },
  [Position.RT]: {
    maturityAge: { min: 25, max: 26 },
    peakStart: 26,
    peakEnd: 32,
    declineStart: 33,
  },

  // Defensive linemen mature at medium pace
  [Position.DE]: {
    maturityAge: { min: 25, max: 26 },
    peakStart: 26,
    peakEnd: 30,
    declineStart: 31,
  },
  [Position.DT]: {
    maturityAge: { min: 25, max: 26 },
    peakStart: 26,
    peakEnd: 31,
    declineStart: 32,
  },

  // Linebackers have varied maturity depending on type
  [Position.OLB]: {
    maturityAge: { min: 25, max: 26 },
    peakStart: 26,
    peakEnd: 29,
    declineStart: 30,
  },
  [Position.ILB]: {
    maturityAge: { min: 25, max: 26 },
    peakStart: 26,
    peakEnd: 30,
    declineStart: 31,
  },

  // Defensive backs mature early, rely on speed
  [Position.CB]: {
    maturityAge: { min: 24, max: 25 },
    peakStart: 25,
    peakEnd: 28,
    declineStart: 29,
  },
  [Position.FS]: {
    maturityAge: { min: 25, max: 26 },
    peakStart: 26,
    peakEnd: 30,
    declineStart: 31,
  },
  [Position.SS]: {
    maturityAge: { min: 25, max: 26 },
    peakStart: 26,
    peakEnd: 30,
    declineStart: 31,
  },

  // Specialists have long careers
  [Position.K]: {
    maturityAge: { min: 24, max: 25 },
    peakStart: 25,
    peakEnd: 38,
    declineStart: 39,
  },
  [Position.P]: {
    maturityAge: { min: 24, max: 25 },
    peakStart: 25,
    peakEnd: 38,
    declineStart: 39,
  },
};

/**
 * Gets a random maturity age for a position.
 * @param position - The player's position
 * @returns A maturity age within the position's range
 */
export function getRandomMaturityAge(position: Position): number {
  const profile = POSITION_MATURITY[position];
  return (
    profile.maturityAge.min +
    Math.floor(Math.random() * (profile.maturityAge.max - profile.maturityAge.min + 1))
  );
}

/**
 * Calculates the typical draft age range for a position.
 * Most players enter the draft between 21-23.
 */
export function getTypicalDraftAge(): { min: number; max: number } {
  return { min: 21, max: 23 };
}

/**
 * Determines the career phase based on player age and position.
 * @param position - The player's position
 * @param age - The player's current age
 * @returns The current career phase
 */
export function getCareerPhase(
  position: Position,
  age: number
): 'developing' | 'maturing' | 'peak' | 'declining' | 'twilight' {
  const profile = POSITION_MATURITY[position];

  if (age < profile.maturityAge.min) {
    return 'developing';
  } else if (age < profile.peakStart) {
    return 'maturing';
  } else if (age <= profile.peakEnd) {
    return 'peak';
  } else if (age <= profile.declineStart + 2) {
    return 'declining';
  } else {
    return 'twilight';
  }
}
