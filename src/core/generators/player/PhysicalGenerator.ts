import { Position } from '../../models/player/Position';
import { PhysicalAttributes } from '../../models/player/PhysicalAttributes';
import { clampedNormal, randomFloat } from '../utils/RandomUtils';

/**
 * Distribution parameters for a physical attribute.
 */
export interface AttributeDistribution {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
}

/**
 * Physical profile for a position, defining the distribution of each attribute.
 */
export interface PositionPhysicalProfile {
  height: AttributeDistribution;
  weight: AttributeDistribution;
  armLength: AttributeDistribution;
  handSize: AttributeDistribution;
  speed: AttributeDistribution; // 40-yard dash time (lower is better)
  acceleration: AttributeDistribution; // 1-100 scale
  agility: AttributeDistribution; // 1-100 scale
  strength: AttributeDistribution; // 1-100 scale
  verticalJump: AttributeDistribution;
}

/**
 * Position-specific physical profiles based on NFL combine data and realistic distributions.
 */
export const POSITION_PHYSICAL_PROFILES: Record<Position, PositionPhysicalProfile> = {
  // Quarterbacks - tall, average build, moderate athleticism
  [Position.QB]: {
    height: { mean: 75, stdDev: 2, min: 70, max: 79 },
    weight: { mean: 220, stdDev: 12, min: 195, max: 250 },
    armLength: { mean: 32.5, stdDev: 0.8, min: 30, max: 35 },
    handSize: { mean: 9.5, stdDev: 0.4, min: 8.5, max: 10.5 },
    speed: { mean: 4.85, stdDev: 0.15, min: 4.4, max: 5.3 },
    acceleration: { mean: 65, stdDev: 10, min: 40, max: 85 },
    agility: { mean: 60, stdDev: 10, min: 35, max: 85 },
    strength: { mean: 55, stdDev: 10, min: 30, max: 75 },
    verticalJump: { mean: 32, stdDev: 3, min: 25, max: 40 },
  },

  // Running Backs - shorter, powerful, explosive
  [Position.RB]: {
    height: { mean: 70, stdDev: 2, min: 66, max: 75 },
    weight: { mean: 210, stdDev: 15, min: 175, max: 245 },
    armLength: { mean: 31, stdDev: 0.8, min: 29, max: 34 },
    handSize: { mean: 9.2, stdDev: 0.5, min: 8.0, max: 10.5 },
    speed: { mean: 4.5, stdDev: 0.12, min: 4.25, max: 4.85 },
    acceleration: { mean: 82, stdDev: 8, min: 60, max: 98 },
    agility: { mean: 80, stdDev: 8, min: 60, max: 98 },
    strength: { mean: 70, stdDev: 10, min: 45, max: 90 },
    verticalJump: { mean: 36, stdDev: 3, min: 28, max: 44 },
  },

  // Wide Receivers - tall, lean, fast
  [Position.WR]: {
    height: { mean: 73, stdDev: 2.5, min: 68, max: 78 },
    weight: { mean: 195, stdDev: 15, min: 165, max: 230 },
    armLength: { mean: 32.5, stdDev: 1, min: 30, max: 35 },
    handSize: { mean: 9.3, stdDev: 0.5, min: 8.0, max: 10.5 },
    speed: { mean: 4.48, stdDev: 0.1, min: 4.25, max: 4.75 },
    acceleration: { mean: 85, stdDev: 7, min: 65, max: 99 },
    agility: { mean: 82, stdDev: 7, min: 60, max: 98 },
    strength: { mean: 55, stdDev: 10, min: 35, max: 80 },
    verticalJump: { mean: 38, stdDev: 3, min: 30, max: 46 },
  },

  // Tight Ends - tall, big, athletic
  [Position.TE]: {
    height: { mean: 77, stdDev: 1.5, min: 74, max: 80 },
    weight: { mean: 250, stdDev: 12, min: 225, max: 280 },
    armLength: { mean: 33.5, stdDev: 0.8, min: 31, max: 36 },
    handSize: { mean: 9.8, stdDev: 0.5, min: 8.5, max: 11 },
    speed: { mean: 4.68, stdDev: 0.12, min: 4.4, max: 5.0 },
    acceleration: { mean: 72, stdDev: 8, min: 50, max: 90 },
    agility: { mean: 65, stdDev: 8, min: 45, max: 85 },
    strength: { mean: 75, stdDev: 8, min: 55, max: 95 },
    verticalJump: { mean: 34, stdDev: 3, min: 26, max: 42 },
  },

  // Left Tackle - tallest, heaviest, long arms
  [Position.LT]: {
    height: { mean: 78, stdDev: 1.5, min: 75, max: 80 },
    weight: { mean: 310, stdDev: 15, min: 280, max: 350 },
    armLength: { mean: 34.5, stdDev: 0.8, min: 32, max: 36 },
    handSize: { mean: 10, stdDev: 0.5, min: 9, max: 11.5 },
    speed: { mean: 5.2, stdDev: 0.15, min: 4.85, max: 5.5 },
    acceleration: { mean: 50, stdDev: 8, min: 30, max: 70 },
    agility: { mean: 55, stdDev: 8, min: 35, max: 75 },
    strength: { mean: 85, stdDev: 7, min: 65, max: 100 },
    verticalJump: { mean: 28, stdDev: 3, min: 24, max: 36 },
  },

  // Left Guard
  [Position.LG]: {
    height: { mean: 76, stdDev: 1.5, min: 74, max: 79 },
    weight: { mean: 315, stdDev: 15, min: 290, max: 355 },
    armLength: { mean: 33.5, stdDev: 0.8, min: 31, max: 35 },
    handSize: { mean: 10, stdDev: 0.5, min: 9, max: 11 },
    speed: { mean: 5.25, stdDev: 0.15, min: 4.9, max: 5.5 },
    acceleration: { mean: 48, stdDev: 8, min: 28, max: 68 },
    agility: { mean: 50, stdDev: 8, min: 30, max: 70 },
    strength: { mean: 88, stdDev: 6, min: 70, max: 100 },
    verticalJump: { mean: 27, stdDev: 3, min: 24, max: 34 },
  },

  // Center
  [Position.C]: {
    height: { mean: 75, stdDev: 1.5, min: 73, max: 78 },
    weight: { mean: 305, stdDev: 15, min: 280, max: 340 },
    armLength: { mean: 33, stdDev: 0.8, min: 31, max: 35 },
    handSize: { mean: 9.8, stdDev: 0.5, min: 9, max: 11 },
    speed: { mean: 5.2, stdDev: 0.15, min: 4.85, max: 5.5 },
    acceleration: { mean: 50, stdDev: 8, min: 30, max: 70 },
    agility: { mean: 55, stdDev: 8, min: 35, max: 75 },
    strength: { mean: 85, stdDev: 7, min: 65, max: 100 },
    verticalJump: { mean: 27, stdDev: 3, min: 24, max: 34 },
  },

  // Right Guard
  [Position.RG]: {
    height: { mean: 76, stdDev: 1.5, min: 74, max: 79 },
    weight: { mean: 315, stdDev: 15, min: 290, max: 355 },
    armLength: { mean: 33.5, stdDev: 0.8, min: 31, max: 35 },
    handSize: { mean: 10, stdDev: 0.5, min: 9, max: 11 },
    speed: { mean: 5.25, stdDev: 0.15, min: 4.9, max: 5.5 },
    acceleration: { mean: 48, stdDev: 8, min: 28, max: 68 },
    agility: { mean: 50, stdDev: 8, min: 30, max: 70 },
    strength: { mean: 88, stdDev: 6, min: 70, max: 100 },
    verticalJump: { mean: 27, stdDev: 3, min: 24, max: 34 },
  },

  // Right Tackle
  [Position.RT]: {
    height: { mean: 77, stdDev: 1.5, min: 75, max: 80 },
    weight: { mean: 310, stdDev: 15, min: 285, max: 350 },
    armLength: { mean: 34, stdDev: 0.8, min: 32, max: 36 },
    handSize: { mean: 10, stdDev: 0.5, min: 9, max: 11.5 },
    speed: { mean: 5.2, stdDev: 0.15, min: 4.85, max: 5.5 },
    acceleration: { mean: 50, stdDev: 8, min: 30, max: 70 },
    agility: { mean: 52, stdDev: 8, min: 32, max: 72 },
    strength: { mean: 85, stdDev: 7, min: 65, max: 100 },
    verticalJump: { mean: 28, stdDev: 3, min: 24, max: 36 },
  },

  // Defensive End
  [Position.DE]: {
    height: { mean: 76, stdDev: 1.5, min: 74, max: 79 },
    weight: { mean: 265, stdDev: 15, min: 235, max: 300 },
    armLength: { mean: 34, stdDev: 0.8, min: 32, max: 36 },
    handSize: { mean: 10, stdDev: 0.5, min: 9, max: 11.5 },
    speed: { mean: 4.75, stdDev: 0.12, min: 4.5, max: 5.1 },
    acceleration: { mean: 75, stdDev: 8, min: 55, max: 95 },
    agility: { mean: 70, stdDev: 8, min: 50, max: 90 },
    strength: { mean: 82, stdDev: 7, min: 60, max: 98 },
    verticalJump: { mean: 32, stdDev: 3, min: 26, max: 40 },
  },

  // Defensive Tackle
  [Position.DT]: {
    height: { mean: 75, stdDev: 1.5, min: 73, max: 78 },
    weight: { mean: 305, stdDev: 18, min: 275, max: 365 },
    armLength: { mean: 33.5, stdDev: 0.8, min: 31, max: 36 },
    handSize: { mean: 10.2, stdDev: 0.5, min: 9, max: 11.5 },
    speed: { mean: 5.1, stdDev: 0.15, min: 4.8, max: 5.5 },
    acceleration: { mean: 58, stdDev: 8, min: 38, max: 78 },
    agility: { mean: 50, stdDev: 8, min: 30, max: 70 },
    strength: { mean: 90, stdDev: 5, min: 75, max: 100 },
    verticalJump: { mean: 28, stdDev: 3, min: 24, max: 36 },
  },

  // Outside Linebacker
  [Position.OLB]: {
    height: { mean: 74, stdDev: 1.5, min: 72, max: 77 },
    weight: { mean: 245, stdDev: 12, min: 220, max: 275 },
    armLength: { mean: 33, stdDev: 0.8, min: 31, max: 35 },
    handSize: { mean: 9.8, stdDev: 0.5, min: 8.5, max: 11 },
    speed: { mean: 4.65, stdDev: 0.12, min: 4.4, max: 4.95 },
    acceleration: { mean: 78, stdDev: 8, min: 58, max: 95 },
    agility: { mean: 72, stdDev: 8, min: 52, max: 92 },
    strength: { mean: 75, stdDev: 8, min: 55, max: 92 },
    verticalJump: { mean: 34, stdDev: 3, min: 28, max: 42 },
  },

  // Inside Linebacker
  [Position.ILB]: {
    height: { mean: 73, stdDev: 1.5, min: 71, max: 76 },
    weight: { mean: 240, stdDev: 12, min: 215, max: 270 },
    armLength: { mean: 32.5, stdDev: 0.8, min: 30, max: 35 },
    handSize: { mean: 9.8, stdDev: 0.5, min: 8.5, max: 11 },
    speed: { mean: 4.7, stdDev: 0.12, min: 4.45, max: 5.0 },
    acceleration: { mean: 75, stdDev: 8, min: 55, max: 92 },
    agility: { mean: 70, stdDev: 8, min: 50, max: 90 },
    strength: { mean: 78, stdDev: 8, min: 58, max: 95 },
    verticalJump: { mean: 35, stdDev: 3, min: 28, max: 42 },
  },

  // Cornerback
  [Position.CB]: {
    height: { mean: 71, stdDev: 2, min: 68, max: 76 },
    weight: { mean: 190, stdDev: 10, min: 170, max: 215 },
    armLength: { mean: 31.5, stdDev: 0.8, min: 29, max: 34 },
    handSize: { mean: 9.2, stdDev: 0.5, min: 8, max: 10.5 },
    speed: { mean: 4.45, stdDev: 0.08, min: 4.25, max: 4.65 },
    acceleration: { mean: 88, stdDev: 6, min: 70, max: 99 },
    agility: { mean: 85, stdDev: 6, min: 68, max: 98 },
    strength: { mean: 55, stdDev: 10, min: 35, max: 80 },
    verticalJump: { mean: 38, stdDev: 3, min: 32, max: 46 },
  },

  // Free Safety
  [Position.FS]: {
    height: { mean: 72, stdDev: 1.5, min: 69, max: 75 },
    weight: { mean: 200, stdDev: 10, min: 180, max: 220 },
    armLength: { mean: 31.5, stdDev: 0.8, min: 29, max: 34 },
    handSize: { mean: 9.3, stdDev: 0.5, min: 8, max: 10.5 },
    speed: { mean: 4.5, stdDev: 0.1, min: 4.3, max: 4.75 },
    acceleration: { mean: 85, stdDev: 7, min: 65, max: 98 },
    agility: { mean: 82, stdDev: 7, min: 62, max: 96 },
    strength: { mean: 60, stdDev: 10, min: 40, max: 85 },
    verticalJump: { mean: 38, stdDev: 3, min: 30, max: 45 },
  },

  // Strong Safety
  [Position.SS]: {
    height: { mean: 72, stdDev: 1.5, min: 70, max: 76 },
    weight: { mean: 210, stdDev: 10, min: 190, max: 230 },
    armLength: { mean: 32, stdDev: 0.8, min: 30, max: 34 },
    handSize: { mean: 9.5, stdDev: 0.5, min: 8.5, max: 10.5 },
    speed: { mean: 4.55, stdDev: 0.1, min: 4.35, max: 4.8 },
    acceleration: { mean: 82, stdDev: 7, min: 62, max: 95 },
    agility: { mean: 78, stdDev: 7, min: 58, max: 92 },
    strength: { mean: 68, stdDev: 10, min: 48, max: 88 },
    verticalJump: { mean: 36, stdDev: 3, min: 28, max: 44 },
  },

  // Kicker
  [Position.K]: {
    height: { mean: 72, stdDev: 2, min: 68, max: 77 },
    weight: { mean: 195, stdDev: 12, min: 170, max: 220 },
    armLength: { mean: 31, stdDev: 1, min: 28, max: 34 },
    handSize: { mean: 9, stdDev: 0.5, min: 7.5, max: 10.5 },
    speed: { mean: 4.9, stdDev: 0.2, min: 4.5, max: 5.4 },
    acceleration: { mean: 55, stdDev: 12, min: 30, max: 80 },
    agility: { mean: 55, stdDev: 12, min: 30, max: 80 },
    strength: { mean: 50, stdDev: 12, min: 25, max: 75 },
    verticalJump: { mean: 30, stdDev: 4, min: 24, max: 40 },
  },

  // Punter
  [Position.P]: {
    height: { mean: 74, stdDev: 2, min: 70, max: 78 },
    weight: { mean: 210, stdDev: 12, min: 180, max: 235 },
    armLength: { mean: 32, stdDev: 1, min: 29, max: 35 },
    handSize: { mean: 9.2, stdDev: 0.5, min: 8, max: 10.5 },
    speed: { mean: 4.85, stdDev: 0.2, min: 4.5, max: 5.3 },
    acceleration: { mean: 55, stdDev: 12, min: 30, max: 80 },
    agility: { mean: 55, stdDev: 12, min: 30, max: 80 },
    strength: { mean: 55, stdDev: 12, min: 30, max: 80 },
    verticalJump: { mean: 31, stdDev: 4, min: 24, max: 40 },
  },
};

/**
 * Generates physical attributes for a player based on their position.
 * @param position - The player's position
 * @returns Generated physical attributes
 */
export function generatePhysicalAttributes(position: Position): PhysicalAttributes {
  const profile = POSITION_PHYSICAL_PROFILES[position];

  // Generate height first, then correlate weight with height
  const height = Math.round(
    clampedNormal(
      profile.height.mean,
      profile.height.stdDev,
      profile.height.min,
      profile.height.max
    )
  );

  // Weight correlates with height - taller players tend to be heavier
  const heightDeviation = (height - profile.height.mean) / profile.height.stdDev;
  const weightAdjustment = heightDeviation * profile.weight.stdDev * 0.5;
  const weight = Math.round(
    clampedNormal(
      profile.weight.mean + weightAdjustment,
      profile.weight.stdDev,
      profile.weight.min,
      profile.weight.max
    )
  );

  // Arm length correlates with height
  const armLength = parseFloat(
    clampedNormal(
      profile.armLength.mean + heightDeviation * profile.armLength.stdDev * 0.3,
      profile.armLength.stdDev,
      profile.armLength.min,
      profile.armLength.max
    ).toFixed(1)
  );

  // Wingspan also correlates with height
  // Wingspan is typically about 1.02-1.05 times height
  const wingspanMultiplier = randomFloat(1.02, 1.05);
  const wingspan = parseFloat(Math.max(68, Math.min(86, height * wingspanMultiplier)).toFixed(1));

  // Hand size
  const handSize = parseFloat(
    clampedNormal(
      profile.handSize.mean,
      profile.handSize.stdDev,
      profile.handSize.min,
      profile.handSize.max
    ).toFixed(1)
  );

  // Speed (40-yard dash time)
  const speed = parseFloat(
    clampedNormal(
      profile.speed.mean,
      profile.speed.stdDev,
      profile.speed.min,
      profile.speed.max
    ).toFixed(2)
  );

  // Athletic attributes (1-100 scale)
  const acceleration = Math.round(
    clampedNormal(
      profile.acceleration.mean,
      profile.acceleration.stdDev,
      profile.acceleration.min,
      profile.acceleration.max
    )
  );

  const agility = Math.round(
    clampedNormal(
      profile.agility.mean,
      profile.agility.stdDev,
      profile.agility.min,
      profile.agility.max
    )
  );

  // Strength correlates slightly with weight
  const weightDeviation = (weight - profile.weight.mean) / profile.weight.stdDev;
  const strength = Math.round(
    clampedNormal(
      profile.strength.mean + weightDeviation * profile.strength.stdDev * 0.2,
      profile.strength.stdDev,
      profile.strength.min,
      profile.strength.max
    )
  );

  // Vertical jump (inversely correlates with weight)
  const verticalJump = Math.round(
    clampedNormal(
      profile.verticalJump.mean - weightDeviation * 1.5,
      profile.verticalJump.stdDev,
      profile.verticalJump.min,
      profile.verticalJump.max
    )
  );

  return {
    height,
    weight,
    armLength,
    handSize,
    wingspan,
    speed,
    acceleration,
    agility,
    strength,
    verticalJump,
  };
}
