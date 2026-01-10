import { Position } from '../../models/player/Position';
import { ConsistencyProfile, ConsistencyTier } from '../../models/player/Consistency';
import { weightedRandom } from '../utils/RandomUtils';

/**
 * Position-specific consistency tier weights.
 * Some positions naturally have more consistent performance than others.
 */
export const POSITION_CONSISTENCY_WEIGHTS: Record<Position, Record<ConsistencyTier, number>> = {
  // QBs tend to be more consistent due to experience and preparation
  [Position.QB]: {
    metronome: 0.08,
    steady: 0.25,
    average: 0.4,
    streaky: 0.18,
    volatile: 0.07,
    chaotic: 0.02,
  },

  // RBs can be streaky due to game flow and opportunity
  [Position.RB]: {
    metronome: 0.05,
    steady: 0.2,
    average: 0.35,
    streaky: 0.25,
    volatile: 0.1,
    chaotic: 0.05,
  },

  // WRs can have feast-or-famine weeks
  [Position.WR]: {
    metronome: 0.04,
    steady: 0.18,
    average: 0.35,
    streaky: 0.28,
    volatile: 0.1,
    chaotic: 0.05,
  },

  // TEs are more consistent due to varied usage
  [Position.TE]: {
    metronome: 0.06,
    steady: 0.22,
    average: 0.4,
    streaky: 0.2,
    volatile: 0.08,
    chaotic: 0.04,
  },

  // OL are generally the most consistent
  [Position.LT]: {
    metronome: 0.1,
    steady: 0.3,
    average: 0.4,
    streaky: 0.12,
    volatile: 0.06,
    chaotic: 0.02,
  },
  [Position.LG]: {
    metronome: 0.1,
    steady: 0.3,
    average: 0.4,
    streaky: 0.12,
    volatile: 0.06,
    chaotic: 0.02,
  },
  [Position.C]: {
    metronome: 0.12,
    steady: 0.32,
    average: 0.38,
    streaky: 0.1,
    volatile: 0.06,
    chaotic: 0.02,
  },
  [Position.RG]: {
    metronome: 0.1,
    steady: 0.3,
    average: 0.4,
    streaky: 0.12,
    volatile: 0.06,
    chaotic: 0.02,
  },
  [Position.RT]: {
    metronome: 0.1,
    steady: 0.3,
    average: 0.4,
    streaky: 0.12,
    volatile: 0.06,
    chaotic: 0.02,
  },

  // Pass rushers can be streaky
  [Position.DE]: {
    metronome: 0.05,
    steady: 0.2,
    average: 0.35,
    streaky: 0.25,
    volatile: 0.1,
    chaotic: 0.05,
  },
  [Position.DT]: {
    metronome: 0.08,
    steady: 0.25,
    average: 0.4,
    streaky: 0.18,
    volatile: 0.07,
    chaotic: 0.02,
  },

  // LBs are fairly consistent
  [Position.OLB]: {
    metronome: 0.06,
    steady: 0.22,
    average: 0.4,
    streaky: 0.2,
    volatile: 0.08,
    chaotic: 0.04,
  },
  [Position.ILB]: {
    metronome: 0.08,
    steady: 0.26,
    average: 0.4,
    streaky: 0.16,
    volatile: 0.07,
    chaotic: 0.03,
  },

  // CBs can be boom-or-bust
  [Position.CB]: {
    metronome: 0.04,
    steady: 0.16,
    average: 0.35,
    streaky: 0.28,
    volatile: 0.12,
    chaotic: 0.05,
  },
  [Position.FS]: {
    metronome: 0.06,
    steady: 0.22,
    average: 0.4,
    streaky: 0.2,
    volatile: 0.08,
    chaotic: 0.04,
  },
  [Position.SS]: {
    metronome: 0.06,
    steady: 0.22,
    average: 0.4,
    streaky: 0.2,
    volatile: 0.08,
    chaotic: 0.04,
  },

  // Kickers can be very streaky
  [Position.K]: {
    metronome: 0.1,
    steady: 0.2,
    average: 0.3,
    streaky: 0.25,
    volatile: 0.1,
    chaotic: 0.05,
  },
  [Position.P]: {
    metronome: 0.12,
    steady: 0.28,
    average: 0.35,
    streaky: 0.15,
    volatile: 0.07,
    chaotic: 0.03,
  },
};

/**
 * Generates a consistency profile for a player.
 * @param position - The player's position
 * @param itFactor - The player's "It" factor (high "It" players tend to be more consistent)
 * @returns A ConsistencyProfile object
 */
export function generateConsistencyProfile(
  position: Position,
  itFactor: number
): ConsistencyProfile {
  const positionWeights = POSITION_CONSISTENCY_WEIGHTS[position];

  // High "It" factor players are more likely to be consistent
  // Apply a modifier that shifts probability toward better consistency
  const itModifier = (itFactor - 50) / 100; // -0.5 to 0.5

  // Create modified weights
  const modifiedWeights: { value: ConsistencyTier; weight: number }[] = [];

  const tiers: ConsistencyTier[] = [
    'metronome',
    'steady',
    'average',
    'streaky',
    'volatile',
    'chaotic',
  ];

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    let weight = positionWeights[tier];

    // High "It" factor increases weight of consistent tiers (lower index)
    // Low "It" factor increases weight of inconsistent tiers (higher index)
    const tierPosition = i / (tiers.length - 1); // 0 to 1, 0 being most consistent
    const modifier = 1 + itModifier * (0.5 - tierPosition);

    weight *= Math.max(0.1, modifier);

    modifiedWeights.push({ value: tier, weight });
  }

  // Select tier
  const tier = weightedRandom(modifiedWeights);

  return {
    tier,
    currentStreak: 'neutral',
    streakGamesRemaining: 0,
  };
}

/**
 * Gets a numerical consistency score for comparison purposes.
 * FOR ENGINE USE ONLY.
 */
export function getConsistencyScore(tier: ConsistencyTier): number {
  const scores: Record<ConsistencyTier, number> = {
    metronome: 100,
    steady: 85,
    average: 70,
    streaky: 50,
    volatile: 30,
    chaotic: 10,
  };
  return scores[tier];
}
