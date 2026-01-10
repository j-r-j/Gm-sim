import { Position, isOffensivePosition, isDefensivePosition } from '../../models/player/Position';
import { PhysicalAttributes } from '../../models/player/PhysicalAttributes';
import { TechnicalSkills } from '../../models/player/TechnicalSkills';
import {
  SchemeFits,
  OffensiveScheme,
  DefensiveScheme,
  FitLevel,
  ALL_OFFENSIVE_SCHEMES,
  ALL_DEFENSIVE_SCHEMES,
} from '../../models/player/SchemeFit';

/**
 * Ideal physical and skill profiles for each offensive scheme.
 */
export const OFFENSIVE_SCHEME_PROFILES: Record<
  OffensiveScheme,
  {
    physicalPreferences: {
      speedThreshold?: number; // Prefer faster (lower 40 time)
      agilityMin?: number;
      strengthMin?: number;
    };
    skillPreferences: Record<string, number>; // Skill name -> importance weight (1-10)
    positionImportance: Partial<Record<Position, number>>; // Which positions matter most (1-10)
  }
> = {
  westCoast: {
    physicalPreferences: {
      speedThreshold: 4.6,
      agilityMin: 65,
    },
    skillPreferences: {
      catching: 9,
      routeRunning: 8,
      yac: 8,
      accuracy: 9,
      decisionMaking: 8,
    },
    positionImportance: {
      [Position.QB]: 10,
      [Position.WR]: 8,
      [Position.TE]: 7,
      [Position.RB]: 6,
    },
  },
  airRaid: {
    physicalPreferences: {
      speedThreshold: 4.55,
      agilityMin: 70,
    },
    skillPreferences: {
      armStrength: 8,
      accuracy: 9,
      routeRunning: 9,
      separation: 8,
      catching: 8,
    },
    positionImportance: {
      [Position.QB]: 10,
      [Position.WR]: 10,
      [Position.TE]: 5,
      [Position.RB]: 4,
    },
  },
  spreadOption: {
    physicalPreferences: {
      speedThreshold: 4.65,
      agilityMin: 75,
    },
    skillPreferences: {
      mobility: 10,
      decisionMaking: 8,
      vision: 8,
      cutAbility: 8,
      breakaway: 7,
    },
    positionImportance: {
      [Position.QB]: 10,
      [Position.RB]: 8,
      [Position.WR]: 6,
    },
  },
  powerRun: {
    physicalPreferences: {
      strengthMin: 75,
    },
    skillPreferences: {
      power: 10,
      runBlock: 10,
      passBlock: 6,
      sustain: 8,
    },
    positionImportance: {
      [Position.LT]: 9,
      [Position.LG]: 10,
      [Position.C]: 8,
      [Position.RG]: 10,
      [Position.RT]: 9,
      [Position.RB]: 8,
      [Position.TE]: 7,
    },
  },
  zoneRun: {
    physicalPreferences: {
      agilityMin: 60,
    },
    skillPreferences: {
      footwork: 9,
      awareness: 8,
      runBlock: 8,
      pullAbility: 7,
      vision: 10,
      cutAbility: 9,
    },
    positionImportance: {
      [Position.LT]: 8,
      [Position.LG]: 9,
      [Position.C]: 9,
      [Position.RG]: 9,
      [Position.RT]: 8,
      [Position.RB]: 10,
    },
  },
  playAction: {
    physicalPreferences: {
      strengthMin: 60,
    },
    skillPreferences: {
      playAction: 10,
      armStrength: 8,
      accuracy: 8,
      routeRunning: 7,
      blocking: 7,
      runBlock: 8,
    },
    positionImportance: {
      [Position.QB]: 10,
      [Position.TE]: 8,
      [Position.RB]: 7,
      [Position.WR]: 6,
    },
  },
};

/**
 * Ideal physical and skill profiles for each defensive scheme.
 */
export const DEFENSIVE_SCHEME_PROFILES: Record<
  DefensiveScheme,
  {
    physicalPreferences: {
      speedThreshold?: number;
      agilityMin?: number;
      strengthMin?: number;
    };
    skillPreferences: Record<string, number>;
    positionImportance: Partial<Record<Position, number>>;
  }
> = {
  fourThreeUnder: {
    physicalPreferences: {
      strengthMin: 70,
    },
    skillPreferences: {
      passRush: 9,
      runDefense: 9,
      tackling: 8,
      shedBlocks: 8,
    },
    positionImportance: {
      [Position.DE]: 10,
      [Position.DT]: 9,
      [Position.OLB]: 7,
      [Position.ILB]: 8,
    },
  },
  threeFour: {
    physicalPreferences: {
      strengthMin: 75,
    },
    skillPreferences: {
      runDefense: 9,
      blitzing: 8,
      coverage: 7,
      shedBlocks: 9,
    },
    positionImportance: {
      [Position.DT]: 10,
      [Position.OLB]: 10,
      [Position.ILB]: 9,
      [Position.DE]: 8,
    },
  },
  coverThree: {
    physicalPreferences: {
      speedThreshold: 4.6,
    },
    skillPreferences: {
      zoneCoverage: 10,
      awareness: 9,
      ballSkills: 8,
      tackling: 7,
    },
    positionImportance: {
      [Position.FS]: 10,
      [Position.CB]: 9,
      [Position.SS]: 8,
      [Position.ILB]: 7,
    },
  },
  coverTwo: {
    physicalPreferences: {
      speedThreshold: 4.55,
    },
    skillPreferences: {
      zoneCoverage: 9,
      tackling: 8,
      awareness: 9,
      closing: 8,
    },
    positionImportance: {
      [Position.FS]: 10,
      [Position.SS]: 10,
      [Position.CB]: 8,
      [Position.ILB]: 7,
    },
  },
  manPress: {
    physicalPreferences: {
      speedThreshold: 4.5,
      agilityMin: 80,
    },
    skillPreferences: {
      manCoverage: 10,
      press: 10,
      closing: 8,
      ballSkills: 7,
    },
    positionImportance: {
      [Position.CB]: 10,
      [Position.SS]: 7,
      [Position.FS]: 7,
    },
  },
  blitzHeavy: {
    physicalPreferences: {
      speedThreshold: 4.65,
      agilityMin: 70,
    },
    skillPreferences: {
      blitzing: 10,
      passRush: 9,
      tackling: 8,
      pursuit: 8,
    },
    positionImportance: {
      [Position.OLB]: 10,
      [Position.ILB]: 9,
      [Position.SS]: 8,
      [Position.CB]: 6,
    },
  },
};

/**
 * Calculates a fit score based on physical attributes and skills.
 */
function calculateFitScore(
  position: Position,
  physical: PhysicalAttributes,
  skills: TechnicalSkills,
  schemeProfile: {
    physicalPreferences: {
      speedThreshold?: number;
      agilityMin?: number;
      strengthMin?: number;
    };
    skillPreferences: Record<string, number>;
    positionImportance: Partial<Record<Position, number>>;
  }
): number {
  let score = 50; // Base neutral score

  // Check position importance
  const positionWeight = schemeProfile.positionImportance[position] ?? 5;

  // Physical preferences
  if (schemeProfile.physicalPreferences.speedThreshold !== undefined) {
    // Lower 40 time is better
    if (physical.speed <= schemeProfile.physicalPreferences.speedThreshold) {
      score += 10;
    } else if (physical.speed > schemeProfile.physicalPreferences.speedThreshold + 0.2) {
      score -= 10;
    }
  }

  if (schemeProfile.physicalPreferences.agilityMin !== undefined) {
    if (physical.agility >= schemeProfile.physicalPreferences.agilityMin) {
      score += 10;
    } else if (physical.agility < schemeProfile.physicalPreferences.agilityMin - 15) {
      score -= 10;
    }
  }

  if (schemeProfile.physicalPreferences.strengthMin !== undefined) {
    if (physical.strength >= schemeProfile.physicalPreferences.strengthMin) {
      score += 10;
    } else if (physical.strength < schemeProfile.physicalPreferences.strengthMin - 15) {
      score -= 10;
    }
  }

  // Skill preferences
  for (const [skillName, importance] of Object.entries(schemeProfile.skillPreferences)) {
    const skill = skills[skillName];
    if (skill) {
      // Use true value for calculation (hidden from user)
      const skillScore = skill.trueValue;
      const importanceWeight = importance / 10;

      if (skillScore >= 70) {
        score += 8 * importanceWeight;
      } else if (skillScore >= 55) {
        score += 3 * importanceWeight;
      } else if (skillScore < 40) {
        score -= 8 * importanceWeight;
      }
    }
  }

  // Apply position importance weight
  score = 50 + (score - 50) * (positionWeight / 10);

  // Normalize to 0-100 range
  return Math.max(0, Math.min(100, score));
}

/**
 * Converts a score to a fit level.
 */
function scoreToFitLevel(score: number): FitLevel {
  if (score >= 80) return 'perfect';
  if (score >= 65) return 'good';
  if (score >= 45) return 'neutral';
  if (score >= 30) return 'poor';
  return 'terrible';
}

/**
 * Generates scheme fits based on player's physical attributes and skills.
 * @param position - The player's position
 * @param physical - The player's physical attributes
 * @param skills - The player's technical skills
 * @returns SchemeFits object with fit levels for all schemes
 */
export function generateSchemeFits(
  position: Position,
  physical: PhysicalAttributes,
  skills: TechnicalSkills
): SchemeFits {
  const offensive: Record<OffensiveScheme, FitLevel> = {} as Record<OffensiveScheme, FitLevel>;
  const defensive: Record<DefensiveScheme, FitLevel> = {} as Record<DefensiveScheme, FitLevel>;

  // Calculate offensive scheme fits
  for (const scheme of ALL_OFFENSIVE_SCHEMES) {
    const profile = OFFENSIVE_SCHEME_PROFILES[scheme];

    if (isOffensivePosition(position)) {
      const score = calculateFitScore(position, physical, skills, profile);
      offensive[scheme] = scoreToFitLevel(score);
    } else {
      // Defensive/ST players get neutral fits for offensive schemes
      offensive[scheme] = 'neutral';
    }
  }

  // Calculate defensive scheme fits
  for (const scheme of ALL_DEFENSIVE_SCHEMES) {
    const profile = DEFENSIVE_SCHEME_PROFILES[scheme];

    if (isDefensivePosition(position)) {
      const score = calculateFitScore(position, physical, skills, profile);
      defensive[scheme] = scoreToFitLevel(score);
    } else {
      // Offensive/ST players get neutral fits for defensive schemes
      defensive[scheme] = 'neutral';
    }
  }

  return { offensive, defensive };
}

/**
 * Gets the best fitting scheme for a player.
 */
export function getBestSchemeFit(
  fits: SchemeFits,
  isOffense: boolean
): { scheme: OffensiveScheme | DefensiveScheme; level: FitLevel } {
  const fitLevelOrder: FitLevel[] = ['perfect', 'good', 'neutral', 'poor', 'terrible'];

  if (isOffense) {
    let bestScheme: OffensiveScheme = 'westCoast';
    let bestLevel: FitLevel = 'terrible';

    for (const scheme of ALL_OFFENSIVE_SCHEMES) {
      const level = fits.offensive[scheme];
      if (fitLevelOrder.indexOf(level) < fitLevelOrder.indexOf(bestLevel)) {
        bestScheme = scheme;
        bestLevel = level;
      }
    }

    return { scheme: bestScheme, level: bestLevel };
  } else {
    let bestScheme: DefensiveScheme = 'fourThreeUnder';
    let bestLevel: FitLevel = 'terrible';

    for (const scheme of ALL_DEFENSIVE_SCHEMES) {
      const level = fits.defensive[scheme];
      if (fitLevelOrder.indexOf(level) < fitLevelOrder.indexOf(bestLevel)) {
        bestScheme = scheme;
        bestLevel = level;
      }
    }

    return { scheme: bestScheme, level: bestLevel };
  }
}
