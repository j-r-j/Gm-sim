/**
 * Scheme Definitions
 * Defines all offensive and defensive schemes with their requirements and tendencies
 */

import { OffensiveScheme, DefensiveScheme } from '../models/player/SchemeFit';
import { Position } from '../models/player/Position';

/**
 * Skill requirement for a scheme
 */
export interface SkillRequirement {
  skillName: string;
  importance: 'critical' | 'important' | 'beneficial';
  minimumValue: number; // 1-100
}

/**
 * Position requirements for a scheme
 */
export interface PositionRequirements {
  position: Position;
  skills: SkillRequirement[];
  weight: number; // How important this position is to the scheme (0-1)
}

/**
 * Play call distribution for a scheme
 */
export interface PlayCallDistribution {
  runPercentage: number; // 0-100
  shortPassPercentage: number; // 0-100
  mediumPassPercentage: number; // 0-100
  deepPassPercentage: number; // 0-100
  playActionPercentage: number; // 0-100, subset of passes
  screenPercentage: number; // 0-100, subset of passes
}

/**
 * Complete offensive scheme definition
 */
export interface OffensiveSchemeDefinition {
  id: OffensiveScheme;
  name: string;
  description: string;
  requirements: PositionRequirements[];
  tendencies: PlayCallDistribution;
  strengths: string[];
  weaknesses: string[];
  counterSchemes: DefensiveScheme[]; // Defensive schemes that counter this offense
}

/**
 * Defensive play call distribution
 */
export interface DefensivePlayCallDistribution {
  basePercentage: number; // Standard 4 rush
  blitzPercentage: number;
  zonePercentage: number;
  manPercentage: number;
  pressPercentage: number; // Press coverage at LOS
  twoDeepPercentage: number;
  singleHighPercentage: number;
}

/**
 * Complete defensive scheme definition
 */
export interface DefensiveSchemeDefinition {
  id: DefensiveScheme;
  name: string;
  description: string;
  requirements: PositionRequirements[];
  tendencies: DefensivePlayCallDistribution;
  strengths: string[];
  weaknesses: string[];
  counterSchemes: OffensiveScheme[]; // Offensive schemes that counter this defense
}

// ==========================================
// OFFENSIVE SCHEME DEFINITIONS
// ==========================================

export const WEST_COAST_OFFENSE: OffensiveSchemeDefinition = {
  id: 'westCoast',
  name: 'West Coast Offense',
  description: 'Short, quick passes with emphasis on YAC (Yards After Catch)',
  requirements: [
    {
      position: Position.QB,
      skills: [
        { skillName: 'accuracy', importance: 'critical', minimumValue: 75 },
        { skillName: 'decisionMaking', importance: 'critical', minimumValue: 70 },
        { skillName: 'presnap', importance: 'important', minimumValue: 65 },
      ],
      weight: 0.3,
    },
    {
      position: Position.WR,
      skills: [
        { skillName: 'routeRunning', importance: 'critical', minimumValue: 75 },
        { skillName: 'yac', importance: 'critical', minimumValue: 70 },
        { skillName: 'catching', importance: 'important', minimumValue: 70 },
      ],
      weight: 0.25,
    },
    {
      position: Position.RB,
      skills: [
        { skillName: 'catching', importance: 'important', minimumValue: 65 },
        { skillName: 'passProtection', importance: 'beneficial', minimumValue: 55 },
      ],
      weight: 0.15,
    },
    {
      position: Position.TE,
      skills: [
        { skillName: 'routeRunning', importance: 'important', minimumValue: 65 },
        { skillName: 'catching', importance: 'important', minimumValue: 65 },
      ],
      weight: 0.15,
    },
  ],
  tendencies: {
    runPercentage: 40,
    shortPassPercentage: 35,
    mediumPassPercentage: 15,
    deepPassPercentage: 10,
    playActionPercentage: 25,
    screenPercentage: 15,
  },
  strengths: ['Quick release', 'YAC opportunities', 'Ball control', 'Timing-based'],
  weaknesses: ['Limited deep shots', 'Requires precision', 'Vulnerable to tight coverage'],
  counterSchemes: ['manPress', 'blitzHeavy'],
};

export const AIR_RAID_OFFENSE: OffensiveSchemeDefinition = {
  id: 'airRaid',
  name: 'Air Raid Offense',
  description: 'Spread formations with high-volume passing attack',
  requirements: [
    {
      position: Position.QB,
      skills: [
        { skillName: 'armStrength', importance: 'critical', minimumValue: 75 },
        { skillName: 'accuracy', importance: 'critical', minimumValue: 70 },
        { skillName: 'decisionMaking', importance: 'important', minimumValue: 65 },
      ],
      weight: 0.35,
    },
    {
      position: Position.WR,
      skills: [
        { skillName: 'separation', importance: 'critical', minimumValue: 75 },
        { skillName: 'catching', importance: 'critical', minimumValue: 70 },
        { skillName: 'routeRunning', importance: 'important', minimumValue: 65 },
      ],
      weight: 0.35,
    },
    {
      position: Position.LT,
      skills: [
        { skillName: 'passBlock', importance: 'critical', minimumValue: 75 },
        { skillName: 'footwork', importance: 'important', minimumValue: 65 },
      ],
      weight: 0.15,
    },
  ],
  tendencies: {
    runPercentage: 30,
    shortPassPercentage: 25,
    mediumPassPercentage: 25,
    deepPassPercentage: 20,
    playActionPercentage: 15,
    screenPercentage: 20,
  },
  strengths: ['Explosive plays', 'Spreads defense', 'Matchup advantages', 'Fast tempo'],
  weaknesses: ['One-dimensional', 'Turnover risk', 'Pass protection dependent'],
  counterSchemes: ['coverTwo', 'blitzHeavy'],
};

export const SPREAD_OPTION_OFFENSE: OffensiveSchemeDefinition = {
  id: 'spreadOption',
  name: 'Spread Option Offense',
  description: 'Read-option plays with QB run threat and spread formations',
  requirements: [
    {
      position: Position.QB,
      skills: [
        { skillName: 'mobility', importance: 'critical', minimumValue: 80 },
        { skillName: 'decisionMaking', importance: 'critical', minimumValue: 70 },
        { skillName: 'accuracy', importance: 'important', minimumValue: 65 },
      ],
      weight: 0.35,
    },
    {
      position: Position.RB,
      skills: [
        { skillName: 'vision', importance: 'critical', minimumValue: 75 },
        { skillName: 'cutAbility', importance: 'important', minimumValue: 70 },
        { skillName: 'breakaway', importance: 'important', minimumValue: 65 },
      ],
      weight: 0.25,
    },
    {
      position: Position.WR,
      skills: [
        { skillName: 'blocking', importance: 'important', minimumValue: 60 },
        { skillName: 'separation', importance: 'beneficial', minimumValue: 60 },
      ],
      weight: 0.15,
    },
  ],
  tendencies: {
    runPercentage: 50,
    shortPassPercentage: 20,
    mediumPassPercentage: 15,
    deepPassPercentage: 15,
    playActionPercentage: 35,
    screenPercentage: 10,
  },
  strengths: ['Unpredictable', 'QB run threat', 'Exploits discipline', 'Play action'],
  weaknesses: ['QB injury risk', 'Requires athletic QB', 'Can be contained'],
  counterSchemes: ['threeFour', 'fourThreeUnder'],
};

export const POWER_RUN_OFFENSE: OffensiveSchemeDefinition = {
  id: 'powerRun',
  name: 'Power Run Offense',
  description: 'Physical, gap-scheme running attack with pulling linemen',
  requirements: [
    {
      position: Position.RB,
      skills: [
        { skillName: 'power', importance: 'critical', minimumValue: 80 },
        { skillName: 'vision', importance: 'important', minimumValue: 70 },
        { skillName: 'fumbleProtection', importance: 'important', minimumValue: 65 },
      ],
      weight: 0.25,
    },
    {
      position: Position.LG,
      skills: [
        { skillName: 'runBlock', importance: 'critical', minimumValue: 80 },
        { skillName: 'power', importance: 'critical', minimumValue: 75 },
        { skillName: 'pullAbility', importance: 'important', minimumValue: 70 },
      ],
      weight: 0.2,
    },
    {
      position: Position.RG,
      skills: [
        { skillName: 'runBlock', importance: 'critical', minimumValue: 80 },
        { skillName: 'power', importance: 'critical', minimumValue: 75 },
        { skillName: 'pullAbility', importance: 'important', minimumValue: 70 },
      ],
      weight: 0.2,
    },
    {
      position: Position.TE,
      skills: [
        { skillName: 'blocking', importance: 'critical', minimumValue: 75 },
        { skillName: 'sealing', importance: 'important', minimumValue: 70 },
      ],
      weight: 0.2,
    },
  ],
  tendencies: {
    runPercentage: 60,
    shortPassPercentage: 15,
    mediumPassPercentage: 15,
    deepPassPercentage: 10,
    playActionPercentage: 40,
    screenPercentage: 5,
  },
  strengths: ['Physical', 'Controls clock', 'Wears down defense', 'Play action setup'],
  weaknesses: ['Predictable', 'Can fall behind', 'Weather dependent'],
  counterSchemes: ['fourThreeUnder', 'blitzHeavy'],
};

export const ZONE_RUN_OFFENSE: OffensiveSchemeDefinition = {
  id: 'zoneRun',
  name: 'Zone Run Offense',
  description: 'Zone blocking scheme with one-cut running style',
  requirements: [
    {
      position: Position.RB,
      skills: [
        { skillName: 'vision', importance: 'critical', minimumValue: 80 },
        { skillName: 'cutAbility', importance: 'critical', minimumValue: 80 },
        { skillName: 'breakaway', importance: 'important', minimumValue: 70 },
      ],
      weight: 0.3,
    },
    {
      position: Position.C,
      skills: [
        { skillName: 'runBlock', importance: 'critical', minimumValue: 75 },
        { skillName: 'awareness', importance: 'critical', minimumValue: 75 },
        { skillName: 'footwork', importance: 'important', minimumValue: 70 },
      ],
      weight: 0.2,
    },
    {
      position: Position.LT,
      skills: [
        { skillName: 'footwork', importance: 'critical', minimumValue: 75 },
        { skillName: 'runBlock', importance: 'important', minimumValue: 70 },
      ],
      weight: 0.15,
    },
    {
      position: Position.RT,
      skills: [
        { skillName: 'footwork', importance: 'critical', minimumValue: 75 },
        { skillName: 'runBlock', importance: 'important', minimumValue: 70 },
      ],
      weight: 0.15,
    },
  ],
  tendencies: {
    runPercentage: 55,
    shortPassPercentage: 15,
    mediumPassPercentage: 15,
    deepPassPercentage: 15,
    playActionPercentage: 35,
    screenPercentage: 10,
  },
  strengths: ['Explosive runs', 'Outside zone stretches defense', 'Boot action', 'RB friendly'],
  weaknesses: ['Requires technique', 'Penetration disrupts', 'Needs patience'],
  counterSchemes: ['threeFour', 'coverThree'],
};

export const PLAY_ACTION_OFFENSE: OffensiveSchemeDefinition = {
  id: 'playAction',
  name: 'Play Action Heavy Offense',
  description: 'Heavy play-fake emphasis with vertical passing attack',
  requirements: [
    {
      position: Position.QB,
      skills: [
        { skillName: 'playAction', importance: 'critical', minimumValue: 80 },
        { skillName: 'armStrength', importance: 'critical', minimumValue: 75 },
        { skillName: 'accuracy', importance: 'important', minimumValue: 70 },
      ],
      weight: 0.3,
    },
    {
      position: Position.WR,
      skills: [
        { skillName: 'tracking', importance: 'critical', minimumValue: 75 },
        { skillName: 'contested', importance: 'important', minimumValue: 70 },
        { skillName: 'separation', importance: 'important', minimumValue: 65 },
      ],
      weight: 0.25,
    },
    {
      position: Position.RB,
      skills: [
        { skillName: 'vision', importance: 'important', minimumValue: 70 },
        { skillName: 'power', importance: 'important', minimumValue: 65 },
      ],
      weight: 0.2,
    },
    {
      position: Position.TE,
      skills: [
        { skillName: 'blocking', importance: 'important', minimumValue: 70 },
        { skillName: 'catching', importance: 'beneficial', minimumValue: 60 },
      ],
      weight: 0.15,
    },
  ],
  tendencies: {
    runPercentage: 45,
    shortPassPercentage: 15,
    mediumPassPercentage: 20,
    deepPassPercentage: 20,
    playActionPercentage: 50,
    screenPercentage: 8,
  },
  strengths: ['Deep shots', 'Exploits run defense', 'Big plays', 'Deceptive'],
  weaknesses: ['Needs run game', 'Protection dependent', 'Predictable if behind'],
  counterSchemes: ['coverTwo', 'manPress'],
};

// ==========================================
// DEFENSIVE SCHEME DEFINITIONS
// ==========================================

export const FOUR_THREE_UNDER_DEFENSE: DefensiveSchemeDefinition = {
  id: 'fourThreeUnder',
  name: '4-3 Under Defense',
  description: 'Traditional 4-3 with strong side emphasis and athletic linebackers',
  requirements: [
    {
      position: Position.DE,
      skills: [
        { skillName: 'passRush', importance: 'critical', minimumValue: 75 },
        { skillName: 'pursuit', importance: 'important', minimumValue: 70 },
        { skillName: 'runDefense', importance: 'important', minimumValue: 65 },
      ],
      weight: 0.25,
    },
    {
      position: Position.DT,
      skills: [
        { skillName: 'runDefense', importance: 'critical', minimumValue: 75 },
        { skillName: 'power', importance: 'important', minimumValue: 70 },
      ],
      weight: 0.2,
    },
    {
      position: Position.ILB,
      skills: [
        { skillName: 'tackling', importance: 'critical', minimumValue: 75 },
        { skillName: 'coverage', importance: 'important', minimumValue: 70 },
        { skillName: 'awareness', importance: 'important', minimumValue: 70 },
      ],
      weight: 0.25,
    },
    {
      position: Position.OLB,
      skills: [
        { skillName: 'blitzing', importance: 'important', minimumValue: 70 },
        { skillName: 'shedBlocks', importance: 'important', minimumValue: 65 },
      ],
      weight: 0.15,
    },
  ],
  tendencies: {
    basePercentage: 55,
    blitzPercentage: 25,
    zonePercentage: 50,
    manPercentage: 50,
    pressPercentage: 30,
    twoDeepPercentage: 40,
    singleHighPercentage: 60,
  },
  strengths: ['Balanced', 'Run defense', 'Pass rush lanes', 'Flexible'],
  weaknesses: ['Can be spread out', 'Mismatches in space', 'Requires discipline'],
  counterSchemes: ['spreadOption', 'airRaid'],
};

export const THREE_FOUR_DEFENSE: DefensiveSchemeDefinition = {
  id: 'threeFour',
  name: '3-4 Defense',
  description: 'Versatile front with multiple edge rushers and coverage options',
  requirements: [
    {
      position: Position.DT,
      skills: [
        { skillName: 'runDefense', importance: 'critical', minimumValue: 80 },
        { skillName: 'power', importance: 'critical', minimumValue: 80 },
        { skillName: 'stamina', importance: 'important', minimumValue: 70 },
      ],
      weight: 0.2,
    },
    {
      position: Position.DE,
      skills: [
        { skillName: 'runDefense', importance: 'critical', minimumValue: 75 },
        { skillName: 'passRush', importance: 'important', minimumValue: 65 },
      ],
      weight: 0.15,
    },
    {
      position: Position.OLB,
      skills: [
        { skillName: 'blitzing', importance: 'critical', minimumValue: 80 },
        { skillName: 'coverage', importance: 'important', minimumValue: 65 },
        { skillName: 'pursuit', importance: 'important', minimumValue: 70 },
      ],
      weight: 0.3,
    },
    {
      position: Position.ILB,
      skills: [
        { skillName: 'tackling', importance: 'critical', minimumValue: 75 },
        { skillName: 'zoneCoverage', importance: 'important', minimumValue: 70 },
      ],
      weight: 0.2,
    },
  ],
  tendencies: {
    basePercentage: 45,
    blitzPercentage: 35,
    zonePercentage: 55,
    manPercentage: 45,
    pressPercentage: 35,
    twoDeepPercentage: 45,
    singleHighPercentage: 55,
  },
  strengths: ['Versatile', 'Disguises', 'Multiple rushers', 'Run stopping NT'],
  weaknesses: ['Needs elite NT', 'OLB dependent', 'Can be exploited inside'],
  counterSchemes: ['powerRun', 'westCoast'],
};

export const COVER_THREE_DEFENSE: DefensiveSchemeDefinition = {
  id: 'coverThree',
  name: 'Cover 3 Defense',
  description: 'Three-deep zone with single high safety and contain principles',
  requirements: [
    {
      position: Position.FS,
      skills: [
        { skillName: 'zoneCoverage', importance: 'critical', minimumValue: 80 },
        { skillName: 'awareness', importance: 'critical', minimumValue: 75 },
        { skillName: 'closing', importance: 'important', minimumValue: 70 },
      ],
      weight: 0.25,
    },
    {
      position: Position.CB,
      skills: [
        { skillName: 'zoneCoverage', importance: 'critical', minimumValue: 75 },
        { skillName: 'tackling', importance: 'important', minimumValue: 65 },
        { skillName: 'awareness', importance: 'important', minimumValue: 70 },
      ],
      weight: 0.25,
    },
    {
      position: Position.SS,
      skills: [
        { skillName: 'tackling', importance: 'critical', minimumValue: 75 },
        { skillName: 'zoneCoverage', importance: 'important', minimumValue: 65 },
      ],
      weight: 0.2,
    },
    {
      position: Position.ILB,
      skills: [
        { skillName: 'zoneCoverage', importance: 'important', minimumValue: 70 },
        { skillName: 'awareness', importance: 'important', minimumValue: 70 },
      ],
      weight: 0.15,
    },
  ],
  tendencies: {
    basePercentage: 50,
    blitzPercentage: 20,
    zonePercentage: 75,
    manPercentage: 25,
    pressPercentage: 20,
    twoDeepPercentage: 15,
    singleHighPercentage: 85,
  },
  strengths: ['Deep coverage', 'Run support', 'Simple reads', 'Turnover potential'],
  weaknesses: ['Vulnerable to flats', 'Seam routes', 'Underneath open'],
  counterSchemes: ['westCoast', 'airRaid'],
};

export const COVER_TWO_DEFENSE: DefensiveSchemeDefinition = {
  id: 'coverTwo',
  name: 'Cover 2 Defense',
  description: 'Two-deep shells with cornerbacks in flats and safeties splitting deep',
  requirements: [
    {
      position: Position.SS,
      skills: [
        { skillName: 'zoneCoverage', importance: 'critical', minimumValue: 75 },
        { skillName: 'closing', importance: 'critical', minimumValue: 75 },
        { skillName: 'ballSkills', importance: 'important', minimumValue: 70 },
      ],
      weight: 0.25,
    },
    {
      position: Position.FS,
      skills: [
        { skillName: 'zoneCoverage', importance: 'critical', minimumValue: 75 },
        { skillName: 'closing', importance: 'critical', minimumValue: 75 },
        { skillName: 'ballSkills', importance: 'important', minimumValue: 70 },
      ],
      weight: 0.25,
    },
    {
      position: Position.CB,
      skills: [
        { skillName: 'tackling', importance: 'critical', minimumValue: 75 },
        { skillName: 'zoneCoverage', importance: 'important', minimumValue: 70 },
        { skillName: 'closing', importance: 'important', minimumValue: 65 },
      ],
      weight: 0.2,
    },
    {
      position: Position.ILB,
      skills: [
        { skillName: 'zoneCoverage', importance: 'important', minimumValue: 70 },
        { skillName: 'tackling', importance: 'important', minimumValue: 70 },
      ],
      weight: 0.15,
    },
  ],
  tendencies: {
    basePercentage: 55,
    blitzPercentage: 20,
    zonePercentage: 80,
    manPercentage: 20,
    pressPercentage: 25,
    twoDeepPercentage: 85,
    singleHighPercentage: 15,
  },
  strengths: ['Limits big plays', 'Deep coverage', 'Flat coverage', 'Ball hawking'],
  weaknesses: ['Middle of field', 'Seam routes', 'Run vulnerable', 'Deep corners'],
  counterSchemes: ['playAction', 'zoneRun'],
};

export const MAN_PRESS_DEFENSE: DefensiveSchemeDefinition = {
  id: 'manPress',
  name: 'Man Press Defense',
  description: 'Aggressive man coverage with press at the line of scrimmage',
  requirements: [
    {
      position: Position.CB,
      skills: [
        { skillName: 'manCoverage', importance: 'critical', minimumValue: 85 },
        { skillName: 'press', importance: 'critical', minimumValue: 80 },
        { skillName: 'closing', importance: 'important', minimumValue: 75 },
      ],
      weight: 0.35,
    },
    {
      position: Position.SS,
      skills: [
        { skillName: 'manCoverage', importance: 'important', minimumValue: 70 },
        { skillName: 'tackling', importance: 'important', minimumValue: 75 },
      ],
      weight: 0.2,
    },
    {
      position: Position.FS,
      skills: [
        { skillName: 'closing', importance: 'critical', minimumValue: 80 },
        { skillName: 'awareness', importance: 'important', minimumValue: 75 },
      ],
      weight: 0.2,
    },
    {
      position: Position.DE,
      skills: [
        { skillName: 'passRush', importance: 'critical', minimumValue: 80 },
        { skillName: 'finesse', importance: 'important', minimumValue: 70 },
      ],
      weight: 0.15,
    },
  ],
  tendencies: {
    basePercentage: 50,
    blitzPercentage: 25,
    zonePercentage: 20,
    manPercentage: 80,
    pressPercentage: 75,
    twoDeepPercentage: 30,
    singleHighPercentage: 70,
  },
  strengths: ['Disrupts timing', 'Creates turnovers', 'Tight coverage', 'Shutdown ability'],
  weaknesses: ['Requires elite CBs', 'Deep vulnerable', 'Pick plays', 'Recovery difficult'],
  counterSchemes: ['spreadOption', 'playAction'],
};

export const BLITZ_HEAVY_DEFENSE: DefensiveSchemeDefinition = {
  id: 'blitzHeavy',
  name: 'Blitz Heavy Defense',
  description: 'Aggressive blitzing with 40%+ blitz rate and high risk/reward plays',
  requirements: [
    {
      position: Position.OLB,
      skills: [
        { skillName: 'blitzing', importance: 'critical', minimumValue: 85 },
        { skillName: 'pursuit', importance: 'important', minimumValue: 75 },
        { skillName: 'tackling', importance: 'important', minimumValue: 70 },
      ],
      weight: 0.25,
    },
    {
      position: Position.ILB,
      skills: [
        { skillName: 'blitzing', importance: 'critical', minimumValue: 75 },
        { skillName: 'tackling', importance: 'important', minimumValue: 75 },
        { skillName: 'awareness', importance: 'important', minimumValue: 70 },
      ],
      weight: 0.2,
    },
    {
      position: Position.SS,
      skills: [
        { skillName: 'tackling', importance: 'critical', minimumValue: 80 },
        { skillName: 'closing', importance: 'important', minimumValue: 75 },
      ],
      weight: 0.2,
    },
    {
      position: Position.CB,
      skills: [
        { skillName: 'manCoverage', importance: 'critical', minimumValue: 75 },
        { skillName: 'closing', importance: 'important', minimumValue: 70 },
      ],
      weight: 0.2,
    },
  ],
  tendencies: {
    basePercentage: 35,
    blitzPercentage: 45,
    zonePercentage: 35,
    manPercentage: 65,
    pressPercentage: 50,
    twoDeepPercentage: 25,
    singleHighPercentage: 75,
  },
  strengths: ['Creates pressure', 'Forces turnovers', 'Disrupts timing', 'Aggressive'],
  weaknesses: ['Big play vulnerable', 'Risky', 'Exploitable', 'Screen susceptible'],
  counterSchemes: ['westCoast', 'airRaid'],
};

// ==========================================
// SCHEME COLLECTIONS
// ==========================================

/**
 * All offensive scheme definitions
 */
export const OFFENSIVE_SCHEME_DEFINITIONS: Record<OffensiveScheme, OffensiveSchemeDefinition> = {
  westCoast: WEST_COAST_OFFENSE,
  airRaid: AIR_RAID_OFFENSE,
  spreadOption: SPREAD_OPTION_OFFENSE,
  powerRun: POWER_RUN_OFFENSE,
  zoneRun: ZONE_RUN_OFFENSE,
  playAction: PLAY_ACTION_OFFENSE,
};

/**
 * All defensive scheme definitions
 */
export const DEFENSIVE_SCHEME_DEFINITIONS: Record<DefensiveScheme, DefensiveSchemeDefinition> = {
  fourThreeUnder: FOUR_THREE_UNDER_DEFENSE,
  threeFour: THREE_FOUR_DEFENSE,
  coverThree: COVER_THREE_DEFENSE,
  coverTwo: COVER_TWO_DEFENSE,
  manPress: MAN_PRESS_DEFENSE,
  blitzHeavy: BLITZ_HEAVY_DEFENSE,
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Gets an offensive scheme definition by ID
 */
export function getOffensiveSchemeDefinition(
  scheme: OffensiveScheme
): OffensiveSchemeDefinition {
  return OFFENSIVE_SCHEME_DEFINITIONS[scheme];
}

/**
 * Gets a defensive scheme definition by ID
 */
export function getDefensiveSchemeDefinition(
  scheme: DefensiveScheme
): DefensiveSchemeDefinition {
  return DEFENSIVE_SCHEME_DEFINITIONS[scheme];
}

/**
 * Checks if a scheme is offensive
 */
export function isOffensiveScheme(scheme: OffensiveScheme | DefensiveScheme): scheme is OffensiveScheme {
  return scheme in OFFENSIVE_SCHEME_DEFINITIONS;
}

/**
 * Checks if a scheme is defensive
 */
export function isDefensiveScheme(scheme: OffensiveScheme | DefensiveScheme): scheme is DefensiveScheme {
  return scheme in DEFENSIVE_SCHEME_DEFINITIONS;
}

/**
 * Gets the display name for a scheme
 */
export function getSchemeDisplayName(scheme: OffensiveScheme | DefensiveScheme): string {
  if (isOffensiveScheme(scheme)) {
    return OFFENSIVE_SCHEME_DEFINITIONS[scheme].name;
  }
  return DEFENSIVE_SCHEME_DEFINITIONS[scheme].name;
}

/**
 * Gets scheme description for display
 */
export function getSchemeDescription(scheme: OffensiveScheme | DefensiveScheme): string {
  if (isOffensiveScheme(scheme)) {
    return OFFENSIVE_SCHEME_DEFINITIONS[scheme].description;
  }
  return DEFENSIVE_SCHEME_DEFINITIONS[scheme].description;
}

/**
 * Gets schemes that counter a given offensive scheme
 */
export function getOffensiveSchemeCounters(scheme: OffensiveScheme): DefensiveScheme[] {
  return OFFENSIVE_SCHEME_DEFINITIONS[scheme].counterSchemes;
}

/**
 * Gets schemes that counter a given defensive scheme
 */
export function getDefensiveSchemeCounters(scheme: DefensiveScheme): OffensiveScheme[] {
  return DEFENSIVE_SCHEME_DEFINITIONS[scheme].counterSchemes;
}

/**
 * Gets scheme strengths for display (qualitative)
 */
export function getSchemeStrengths(scheme: OffensiveScheme | DefensiveScheme): string[] {
  if (isOffensiveScheme(scheme)) {
    return OFFENSIVE_SCHEME_DEFINITIONS[scheme].strengths;
  }
  return DEFENSIVE_SCHEME_DEFINITIONS[scheme].strengths;
}

/**
 * Gets scheme weaknesses for display (qualitative)
 */
export function getSchemeWeaknesses(scheme: OffensiveScheme | DefensiveScheme): string[] {
  if (isOffensiveScheme(scheme)) {
    return OFFENSIVE_SCHEME_DEFINITIONS[scheme].weaknesses;
  }
  return DEFENSIVE_SCHEME_DEFINITIONS[scheme].weaknesses;
}

/**
 * Validates a play call distribution (offensive)
 */
export function validatePlayCallDistribution(distribution: PlayCallDistribution): boolean {
  const total =
    distribution.runPercentage +
    distribution.shortPassPercentage +
    distribution.mediumPassPercentage +
    distribution.deepPassPercentage;

  // Should total to 100
  if (Math.abs(total - 100) > 1) {
    return false;
  }

  // All values should be non-negative
  return (
    distribution.runPercentage >= 0 &&
    distribution.shortPassPercentage >= 0 &&
    distribution.mediumPassPercentage >= 0 &&
    distribution.deepPassPercentage >= 0 &&
    distribution.playActionPercentage >= 0 &&
    distribution.playActionPercentage <= 100 &&
    distribution.screenPercentage >= 0 &&
    distribution.screenPercentage <= 100
  );
}

/**
 * Validates a defensive play call distribution
 */
export function validateDefensivePlayCallDistribution(
  distribution: DefensivePlayCallDistribution
): boolean {
  // Zone + Man should total 100
  if (Math.abs(distribution.zonePercentage + distribution.manPercentage - 100) > 1) {
    return false;
  }

  // Two deep + single high should total 100
  if (Math.abs(distribution.twoDeepPercentage + distribution.singleHighPercentage - 100) > 1) {
    return false;
  }

  // All values should be in valid range
  return (
    distribution.basePercentage >= 0 &&
    distribution.basePercentage <= 100 &&
    distribution.blitzPercentage >= 0 &&
    distribution.blitzPercentage <= 100 &&
    distribution.pressPercentage >= 0 &&
    distribution.pressPercentage <= 100
  );
}
