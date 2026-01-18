import { Position } from '../../models/player/Position';
import {
  HiddenTraits,
  PositiveTrait,
  NegativeTrait,
  ALL_POSITIVE_TRAITS,
  ALL_NEGATIVE_TRAITS,
} from '../../models/player/HiddenTraits';
import { chance, randomInt } from '../utils/RandomUtils';

/**
 * Base probabilities for each positive trait (0-1 scale).
 */
export const TRAIT_PROBABILITIES: {
  positive: Record<PositiveTrait, number>;
  negative: Record<NegativeTrait, number>;
} = {
  positive: {
    clutch: 0.08, // 8% base chance
    filmJunkie: 0.1, // 10% base chance
    ironMan: 0.07, // 7% base chance
    leader: 0.06, // 6% base chance
    coolUnderPressure: 0.1, // 10% base chance
    motor: 0.12, // 12% base chance
    routeTechnician: 0.08, // 8% base chance
    brickWall: 0.08, // 8% base chance
    schemeVersatile: 0.1, // 10% base chance
    teamFirst: 0.12, // 12% base chance
  },
  negative: {
    chokes: 0.06, // 6% base chance
    lazy: 0.08, // 8% base chance
    injuryProne: 0.1, // 10% base chance
    lockerRoomCancer: 0.04, // 4% base chance
    hotHead: 0.06, // 6% base chance
    glassHands: 0.05, // 5% base chance
    disappears: 0.07, // 7% base chance
    systemDependent: 0.1, // 10% base chance
    diva: 0.05, // 5% base chance
  },
};

/**
 * Trait correlations - having one trait affects probability of another.
 * Positive modifiers increase probability, negative decrease.
 */
export const TRAIT_CORRELATIONS: Record<string, { trait: string; modifier: number }[]> = {
  // Positive trait correlations
  clutch: [
    { trait: 'coolUnderPressure', modifier: 0.4 },
    { trait: 'leader', modifier: 0.2 },
    { trait: 'chokes', modifier: -0.9 }, // Very unlikely to have both
  ],
  filmJunkie: [
    { trait: 'schemeVersatile', modifier: 0.3 },
    { trait: 'lazy', modifier: -0.8 },
  ],
  ironMan: [
    { trait: 'injuryProne', modifier: -0.95 }, // Almost mutually exclusive
    { trait: 'motor', modifier: 0.2 },
  ],
  leader: [
    { trait: 'teamFirst', modifier: 0.4 },
    { trait: 'clutch', modifier: 0.2 },
    { trait: 'lockerRoomCancer', modifier: -0.9 },
    { trait: 'diva', modifier: -0.6 },
  ],
  coolUnderPressure: [
    { trait: 'clutch', modifier: 0.3 },
    { trait: 'chokes', modifier: -0.9 },
    { trait: 'hotHead', modifier: -0.5 },
  ],
  motor: [
    { trait: 'lazy', modifier: -0.9 },
    { trait: 'disappears', modifier: -0.6 },
    { trait: 'teamFirst', modifier: 0.2 },
  ],
  teamFirst: [
    { trait: 'leader', modifier: 0.3 },
    { trait: 'diva', modifier: -0.8 },
    { trait: 'lockerRoomCancer', modifier: -0.7 },
  ],

  // Negative trait correlations
  chokes: [
    { trait: 'clutch', modifier: -0.9 },
    { trait: 'coolUnderPressure', modifier: -0.8 },
  ],
  lazy: [
    { trait: 'motor', modifier: -0.9 },
    { trait: 'filmJunkie', modifier: -0.7 },
  ],
  injuryProne: [{ trait: 'ironMan', modifier: -0.95 }],
  lockerRoomCancer: [
    { trait: 'leader', modifier: -0.9 },
    { trait: 'teamFirst', modifier: -0.8 },
  ],
  hotHead: [
    { trait: 'coolUnderPressure', modifier: -0.6 },
    { trait: 'leader', modifier: -0.3 },
  ],
  diva: [
    { trait: 'teamFirst', modifier: -0.8 },
    { trait: 'leader', modifier: -0.4 },
  ],
};

/**
 * Position-specific trait probability modifiers.
 * Values are multipliers applied to base probabilities.
 */
export const POSITION_TRAIT_MODIFIERS: Record<
  Position,
  {
    positive: Partial<Record<PositiveTrait, number>>;
    negative: Partial<Record<NegativeTrait, number>>;
  }
> = {
  // QBs are more likely to be leaders, clutch, and film junkies
  [Position.QB]: {
    positive: {
      clutch: 1.5,
      leader: 2.0,
      coolUnderPressure: 1.5,
      filmJunkie: 1.5,
    },
    negative: {
      chokes: 1.2, // High pressure position
      diva: 1.3,
    },
  },

  // RBs need to be durable
  [Position.RB]: {
    positive: {
      motor: 1.4,
      ironMan: 1.2,
    },
    negative: {
      injuryProne: 1.5, // Higher injury risk position
      glassHands: 0.8,
    },
  },

  // WRs can be divas, need good hands
  [Position.WR]: {
    positive: {
      routeTechnician: 2.0,
      clutch: 1.2,
    },
    negative: {
      diva: 2.0,
      glassHands: 1.5,
    },
  },

  // TEs need to be versatile
  [Position.TE]: {
    positive: {
      schemeVersatile: 1.5,
      brickWall: 1.3,
    },
    negative: {},
  },

  // OL need to be brick walls and team-first
  [Position.LT]: {
    positive: {
      brickWall: 2.0,
      teamFirst: 1.5,
      motor: 1.3,
    },
    negative: {
      lazy: 0.7, // Less likely
    },
  },
  [Position.LG]: {
    positive: {
      brickWall: 2.0,
      teamFirst: 1.5,
      motor: 1.3,
    },
    negative: {
      lazy: 0.7,
    },
  },
  [Position.C]: {
    positive: {
      brickWall: 1.8,
      teamFirst: 1.5,
      leader: 1.3, // Centers often call out protections
      filmJunkie: 1.4,
    },
    negative: {
      lazy: 0.7,
    },
  },
  [Position.RG]: {
    positive: {
      brickWall: 2.0,
      teamFirst: 1.5,
      motor: 1.3,
    },
    negative: {
      lazy: 0.7,
    },
  },
  [Position.RT]: {
    positive: {
      brickWall: 2.0,
      teamFirst: 1.5,
      motor: 1.3,
    },
    negative: {
      lazy: 0.7,
    },
  },

  // DL need motor and aggression
  [Position.DE]: {
    positive: {
      motor: 1.8,
      clutch: 1.2,
    },
    negative: {
      hotHead: 1.3,
    },
  },
  [Position.DT]: {
    positive: {
      brickWall: 1.8,
      motor: 1.5,
    },
    negative: {},
  },

  // LBs need to be leaders and have motor
  [Position.OLB]: {
    positive: {
      motor: 1.5,
      leader: 1.3,
    },
    negative: {
      hotHead: 1.2,
    },
  },
  [Position.ILB]: {
    positive: {
      leader: 1.8, // Often the defensive play-caller
      filmJunkie: 1.5,
      motor: 1.4,
    },
    negative: {},
  },

  // DBs need to be cool and clutch
  [Position.CB]: {
    positive: {
      coolUnderPressure: 1.5, // Bounce back from giving up plays
      clutch: 1.3,
    },
    negative: {
      chokes: 1.3, // High pressure position
      hotHead: 1.2,
    },
  },
  [Position.FS]: {
    positive: {
      filmJunkie: 1.4, // Need to read offenses
      leader: 1.3,
    },
    negative: {},
  },
  [Position.SS]: {
    positive: {
      motor: 1.3,
      clutch: 1.2,
    },
    negative: {
      hotHead: 1.2,
    },
  },

  // Specialists need to be clutch
  [Position.K]: {
    positive: {
      clutch: 2.0,
      coolUnderPressure: 2.0,
    },
    negative: {
      chokes: 2.0, // Very important for kickers
    },
  },
  [Position.P]: {
    positive: {
      coolUnderPressure: 1.5,
    },
    negative: {
      chokes: 1.5,
    },
  },
};

/**
 * Calculates how many traits should be revealed based on experience.
 * Veterans have established reputations, so more of their traits are known.
 * @param experience - Years of NFL experience
 * @param totalTraits - Total number of traits the player has
 * @returns Number of traits that should be revealed
 */
function calculateTraitsToReveal(experience: number, totalTraits: number): number {
  if (totalTraits === 0) return 0;

  // Revelation percentage based on experience
  // 0-1 years: 0% (rookies/young players are unknown)
  // 2-3 years: ~40% (some traits start showing)
  // 4-5 years: ~60% (established players)
  // 6-7 years: ~80% (well-known veterans)
  // 8+ years: ~95% (most traits are known)
  let revealPercentage: number;
  if (experience <= 1) {
    revealPercentage = 0;
  } else if (experience <= 3) {
    revealPercentage = 0.4;
  } else if (experience <= 5) {
    revealPercentage = 0.6;
  } else if (experience <= 7) {
    revealPercentage = 0.8;
  } else {
    revealPercentage = 0.95;
  }

  // Calculate number of traits to reveal with some randomness
  const baseTraits = Math.floor(totalTraits * revealPercentage);
  // Add chance for one more trait to be revealed
  const extraTrait = chance(revealPercentage) ? 1 : 0;

  return Math.min(totalTraits, baseTraits + extraTrait);
}

/**
 * Generates hidden traits for a player.
 * @param position - The player's position
 * @param experience - Years of NFL experience (default 0 for rookies)
 * @returns Generated hidden traits with appropriate traits revealed for veterans
 */
export function generateHiddenTraits(position: Position, experience: number = 0): HiddenTraits {
  const positionModifiers = POSITION_TRAIT_MODIFIERS[position];
  const selectedPositive: PositiveTrait[] = [];
  const selectedNegative: NegativeTrait[] = [];

  // Track probability modifiers from already-selected traits
  const correlationModifiers: Record<string, number> = {};

  // Determine number of positive traits (0-3)
  const numPositive = randomInt(0, 3);

  // Determine number of negative traits (0-2)
  const numNegative = randomInt(0, 2);

  // Shuffle traits to randomize selection order
  const shuffledPositive = [...ALL_POSITIVE_TRAITS].sort(() => Math.random() - 0.5);
  const shuffledNegative = [...ALL_NEGATIVE_TRAITS].sort(() => Math.random() - 0.5);

  // Select positive traits
  for (const trait of shuffledPositive) {
    if (selectedPositive.length >= numPositive) break;

    // Calculate probability
    let probability = TRAIT_PROBABILITIES.positive[trait];

    // Apply position modifier
    const posModifier = positionModifiers.positive[trait] ?? 1;
    probability *= posModifier;

    // Apply correlation modifiers from already-selected traits
    const corrMod = correlationModifiers[trait] ?? 0;
    probability = Math.max(0, Math.min(1, probability + corrMod));

    // Roll for trait
    if (chance(probability)) {
      selectedPositive.push(trait);

      // Apply correlation effects to other traits
      const correlations = TRAIT_CORRELATIONS[trait];
      if (correlations) {
        for (const corr of correlations) {
          correlationModifiers[corr.trait] =
            (correlationModifiers[corr.trait] ?? 0) + corr.modifier;
        }
      }
    }
  }

  // Select negative traits
  for (const trait of shuffledNegative) {
    if (selectedNegative.length >= numNegative) break;

    // Calculate probability
    let probability = TRAIT_PROBABILITIES.negative[trait];

    // Apply position modifier
    const posModifier = positionModifiers.negative[trait] ?? 1;
    probability *= posModifier;

    // Apply correlation modifiers
    const corrMod = correlationModifiers[trait] ?? 0;
    probability = Math.max(0, Math.min(1, probability + corrMod));

    // Roll for trait
    if (chance(probability)) {
      selectedNegative.push(trait);

      // Apply correlation effects
      const correlations = TRAIT_CORRELATIONS[trait];
      if (correlations) {
        for (const corr of correlations) {
          correlationModifiers[corr.trait] =
            (correlationModifiers[corr.trait] ?? 0) + corr.modifier;
        }
      }
    }
  }

  // Determine which traits to reveal based on experience
  const allTraits = [...selectedPositive, ...selectedNegative];
  const numToReveal = calculateTraitsToReveal(experience, allTraits.length);
  const revealedToUser: string[] = [];

  if (numToReveal > 0 && allTraits.length > 0) {
    // Shuffle all traits and pick the ones to reveal
    const shuffledAllTraits = [...allTraits].sort(() => Math.random() - 0.5);
    for (let i = 0; i < numToReveal && i < shuffledAllTraits.length; i++) {
      revealedToUser.push(shuffledAllTraits[i]);
    }
  }

  return {
    positive: selectedPositive,
    negative: selectedNegative,
    revealedToUser,
  };
}

/**
 * Gets the count of positive traits a player has.
 */
export function getPositiveTraitCount(traits: HiddenTraits): number {
  return traits.positive.length;
}

/**
 * Gets the count of negative traits a player has.
 */
export function getNegativeTraitCount(traits: HiddenTraits): number {
  return traits.negative.length;
}
