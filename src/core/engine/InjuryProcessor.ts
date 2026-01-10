/**
 * Injury Processor
 * Handles injury checks during gameplay, determining if injuries occur
 * and their severity and effects.
 */

import { Player } from '../models/player/Player';
import { hasTrait } from '../models/player/HiddenTraits';
import { PlayType, PlayOutcome } from './OutcomeTables';
import { WeatherCondition } from './EffectiveRatingCalculator';

/**
 * Types of injuries that can occur during gameplay
 * (Distinct from InjuryType in models which is for roster status)
 */
export type GameplayInjuryType =
  | 'concussion'
  | 'ankle'
  | 'knee_minor'
  | 'knee_acl'
  | 'knee_mcl'
  | 'hamstring'
  | 'shoulder'
  | 'back'
  | 'hand'
  | 'foot'
  | 'ribs';

/**
 * Severity of a gameplay injury
 * (Distinct from InjurySeverity in models which is for roster status)
 */
export type GameplayInjurySeverity = 'minor' | 'moderate' | 'significant' | 'severe' | 'season_ending';

/**
 * Permanent effects that can result from injuries
 */
export type PermanentInjuryEffect = 'speed_reduction' | 'agility_reduction' | 'reinjury_risk' | 'none';

/**
 * Parameters for injury check
 */
export interface InjuryCheckParams {
  player: Player;
  playType: PlayType;
  outcome: PlayOutcome;
  hadBigHit: boolean;
  currentFatigue: number;
  weather: WeatherCondition;
}

/**
 * Result of an injury check
 */
export interface InjuryResult {
  occurred: boolean;
  type: GameplayInjuryType | null;
  severity: GameplayInjurySeverity | null;
  weeksOut: number;
  permanentEffects: PermanentInjuryEffect[];
}

/**
 * Base injury probabilities by outcome type
 */
const BASE_INJURY_PROBABILITY: Partial<Record<PlayOutcome, number>> = {
  touchdown: 0.005,
  big_gain: 0.015,
  good_gain: 0.01,
  moderate_gain: 0.008,
  short_gain: 0.006,
  no_gain: 0.012,
  loss: 0.015,
  big_loss: 0.025,
  sack: 0.035,
  incomplete: 0.003,
  interception: 0.008,
  fumble: 0.02,
  fumble_lost: 0.025,
};

/**
 * Injury type probabilities by position group
 */
const POSITION_INJURY_TYPES: Record<string, Partial<Record<GameplayInjuryType, number>>> = {
  QB: {
    shoulder: 0.25,
    knee_minor: 0.15,
    knee_mcl: 0.08,
    knee_acl: 0.05,
    ankle: 0.15,
    hand: 0.12,
    concussion: 0.1,
    ribs: 0.1,
  },
  RB: {
    knee_minor: 0.18,
    knee_acl: 0.08,
    knee_mcl: 0.08,
    ankle: 0.18,
    hamstring: 0.15,
    shoulder: 0.1,
    concussion: 0.08,
    foot: 0.08,
    ribs: 0.07,
  },
  WR: {
    hamstring: 0.22,
    knee_minor: 0.15,
    knee_acl: 0.08,
    ankle: 0.18,
    shoulder: 0.12,
    concussion: 0.1,
    foot: 0.08,
    hand: 0.07,
  },
  TE: {
    knee_minor: 0.18,
    knee_acl: 0.07,
    knee_mcl: 0.07,
    ankle: 0.15,
    shoulder: 0.15,
    concussion: 0.1,
    hamstring: 0.12,
    ribs: 0.08,
    back: 0.08,
  },
  OL: {
    knee_minor: 0.2,
    knee_acl: 0.1,
    knee_mcl: 0.1,
    ankle: 0.18,
    back: 0.12,
    shoulder: 0.1,
    concussion: 0.08,
    foot: 0.07,
    hand: 0.05,
  },
  DL: {
    knee_minor: 0.2,
    knee_acl: 0.1,
    knee_mcl: 0.1,
    ankle: 0.15,
    shoulder: 0.12,
    back: 0.1,
    concussion: 0.08,
    hamstring: 0.08,
    hand: 0.07,
  },
  LB: {
    knee_minor: 0.18,
    knee_acl: 0.1,
    hamstring: 0.15,
    ankle: 0.15,
    shoulder: 0.12,
    concussion: 0.12,
    back: 0.08,
    foot: 0.05,
    ribs: 0.05,
  },
  DB: {
    hamstring: 0.22,
    knee_minor: 0.15,
    knee_acl: 0.1,
    ankle: 0.15,
    shoulder: 0.1,
    concussion: 0.12,
    foot: 0.08,
    hand: 0.08,
  },
  K: {
    hamstring: 0.3,
    knee_minor: 0.25,
    ankle: 0.2,
    foot: 0.15,
    back: 0.1,
  },
  P: {
    hamstring: 0.3,
    knee_minor: 0.25,
    ankle: 0.2,
    foot: 0.15,
    back: 0.1,
  },
};

/**
 * Default injury type distribution
 */
const DEFAULT_INJURY_TYPES: Partial<Record<GameplayInjuryType, number>> = {
  knee_minor: 0.18,
  ankle: 0.18,
  hamstring: 0.15,
  shoulder: 0.12,
  concussion: 0.1,
  knee_acl: 0.08,
  knee_mcl: 0.07,
  back: 0.06,
  foot: 0.04,
  ribs: 0.02,
};

/**
 * Weeks out by injury type and severity
 */
const INJURY_DURATION: Record<GameplayInjuryType, Record<GameplayInjurySeverity, { min: number; max: number }>> = {
  concussion: {
    minor: { min: 1, max: 1 },
    moderate: { min: 1, max: 2 },
    significant: { min: 2, max: 4 },
    severe: { min: 4, max: 8 },
    season_ending: { min: 8, max: 17 },
  },
  ankle: {
    minor: { min: 1, max: 2 },
    moderate: { min: 2, max: 4 },
    significant: { min: 4, max: 6 },
    severe: { min: 6, max: 10 },
    season_ending: { min: 10, max: 17 },
  },
  knee_minor: {
    minor: { min: 1, max: 2 },
    moderate: { min: 2, max: 3 },
    significant: { min: 3, max: 5 },
    severe: { min: 5, max: 8 },
    season_ending: { min: 8, max: 17 },
  },
  knee_acl: {
    minor: { min: 6, max: 8 },
    moderate: { min: 8, max: 12 },
    significant: { min: 10, max: 17 },
    severe: { min: 17, max: 17 },
    season_ending: { min: 17, max: 17 },
  },
  knee_mcl: {
    minor: { min: 2, max: 4 },
    moderate: { min: 4, max: 6 },
    significant: { min: 6, max: 10 },
    severe: { min: 10, max: 14 },
    season_ending: { min: 14, max: 17 },
  },
  hamstring: {
    minor: { min: 1, max: 2 },
    moderate: { min: 2, max: 4 },
    significant: { min: 4, max: 6 },
    severe: { min: 6, max: 10 },
    season_ending: { min: 10, max: 17 },
  },
  shoulder: {
    minor: { min: 1, max: 2 },
    moderate: { min: 2, max: 4 },
    significant: { min: 4, max: 8 },
    severe: { min: 8, max: 14 },
    season_ending: { min: 14, max: 17 },
  },
  back: {
    minor: { min: 1, max: 2 },
    moderate: { min: 2, max: 4 },
    significant: { min: 4, max: 8 },
    severe: { min: 8, max: 12 },
    season_ending: { min: 12, max: 17 },
  },
  hand: {
    minor: { min: 1, max: 2 },
    moderate: { min: 2, max: 4 },
    significant: { min: 4, max: 6 },
    severe: { min: 6, max: 10 },
    season_ending: { min: 10, max: 17 },
  },
  foot: {
    minor: { min: 1, max: 2 },
    moderate: { min: 2, max: 4 },
    significant: { min: 4, max: 8 },
    severe: { min: 8, max: 12 },
    season_ending: { min: 12, max: 17 },
  },
  ribs: {
    minor: { min: 1, max: 2 },
    moderate: { min: 2, max: 4 },
    significant: { min: 4, max: 6 },
    severe: { min: 6, max: 10 },
    season_ending: { min: 10, max: 17 },
  },
};

/**
 * Map player position to position group
 */
function getPositionGroup(position: string): string {
  const positionMap: Record<string, string> = {
    QB: 'QB',
    RB: 'RB',
    WR: 'WR',
    TE: 'TE',
    LT: 'OL',
    LG: 'OL',
    C: 'OL',
    RG: 'OL',
    RT: 'OL',
    DE: 'DL',
    DT: 'DL',
    OLB: 'LB',
    ILB: 'LB',
    CB: 'DB',
    FS: 'DB',
    SS: 'DB',
    K: 'K',
    P: 'P',
  };

  return positionMap[position] || 'LB'; // Default to LB if unknown
}

/**
 * Select injury type based on position
 */
function selectInjuryType(player: Player): GameplayInjuryType {
  const positionGroup = getPositionGroup(player.position);
  const injuryDistribution = POSITION_INJURY_TYPES[positionGroup] || DEFAULT_INJURY_TYPES;

  const entries = Object.entries(injuryDistribution) as [GameplayInjuryType, number][];
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);

  let random = Math.random() * totalWeight;

  for (const [type, weight] of entries) {
    random -= weight;
    if (random <= 0) return type;
  }

  return 'knee_minor'; // Default fallback
}

/**
 * Determine injury severity
 */
function determineInjurySeverity(
  injuryType: GameplayInjuryType,
  hadBigHit: boolean,
  fatigue: number,
  player: Player
): GameplayInjurySeverity {
  // Base probabilities
  let severityRoll = Math.random();

  // Big hits increase severity
  if (hadBigHit) {
    severityRoll += 0.15;
  }

  // High fatigue increases severity
  if (fatigue > 70) {
    severityRoll += 0.1;
  } else if (fatigue > 50) {
    severityRoll += 0.05;
  }

  // Injury prone trait increases severity
  if (hasTrait(player.hiddenTraits, 'injuryProne')) {
    severityRoll += 0.15;
  }

  // Iron Man trait decreases severity
  if (hasTrait(player.hiddenTraits, 'ironMan')) {
    severityRoll -= 0.15;
  }

  // ACL injuries are usually severe
  if (injuryType === 'knee_acl') {
    severityRoll += 0.3;
  }

  // Determine severity based on roll
  if (severityRoll < 0.4) {
    return 'minor';
  } else if (severityRoll < 0.65) {
    return 'moderate';
  } else if (severityRoll < 0.82) {
    return 'significant';
  } else if (severityRoll < 0.95) {
    return 'severe';
  } else {
    return 'season_ending';
  }
}

/**
 * Calculate weeks out based on injury type and severity
 */
function calculateWeeksOut(injuryType: GameplayInjuryType, severity: GameplayInjurySeverity): number {
  const duration = INJURY_DURATION[injuryType][severity];
  const range = duration.max - duration.min;
  return duration.min + Math.floor(Math.random() * (range + 1));
}

/**
 * Determine permanent effects of injury
 */
function determinePermanentEffects(
  injuryType: GameplayInjuryType,
  severity: GameplayInjurySeverity
): PermanentInjuryEffect[] {
  const effects: PermanentInjuryEffect[] = [];

  // Only severe/season-ending injuries have permanent effects
  if (severity !== 'severe' && severity !== 'season_ending') {
    return ['none'];
  }

  // ACL injuries often have permanent effects
  if (injuryType === 'knee_acl') {
    if (Math.random() < 0.4) {
      effects.push('speed_reduction');
    }
    if (Math.random() < 0.3) {
      effects.push('agility_reduction');
    }
    effects.push('reinjury_risk');
  }

  // MCL injuries can have lingering effects
  if (injuryType === 'knee_mcl' && severity === 'season_ending') {
    if (Math.random() < 0.25) {
      effects.push('agility_reduction');
    }
    effects.push('reinjury_risk');
  }

  // Hamstring injuries prone to reinjury
  if (injuryType === 'hamstring' && severity === 'season_ending') {
    if (Math.random() < 0.3) {
      effects.push('speed_reduction');
    }
    effects.push('reinjury_risk');
  }

  // Ankle injuries can affect speed
  if (injuryType === 'ankle' && severity === 'season_ending') {
    if (Math.random() < 0.2) {
      effects.push('speed_reduction');
    }
  }

  // Concussions can have lingering effects (career consideration)
  if (injuryType === 'concussion' && severity === 'season_ending') {
    effects.push('reinjury_risk');
  }

  return effects.length > 0 ? effects : ['none'];
}

/**
 * Check if an injury occurs and determine its details
 *
 * @param params - Injury check parameters
 * @returns Injury result with type, severity, and effects
 */
export function checkForInjury(params: InjuryCheckParams): InjuryResult {
  const { player, outcome, hadBigHit, currentFatigue, weather } = params;

  // Get base probability for this outcome
  let baseProbability = BASE_INJURY_PROBABILITY[outcome] ?? 0.005;

  // Big hits significantly increase injury chance
  if (hadBigHit) {
    baseProbability *= 2;
  }

  // Fatigue increases injury risk
  if (currentFatigue > 80) {
    baseProbability *= 1.5;
  } else if (currentFatigue > 60) {
    baseProbability *= 1.25;
  }

  // Cold weather increases soft tissue injury risk
  if (!weather.isDome && weather.temperature < 40) {
    baseProbability *= 1.2;
  }

  // Wet conditions increase injury risk
  if (!weather.isDome && weather.precipitation !== 'none') {
    baseProbability *= 1.15;
  }

  // Injury prone trait increases chance
  if (hasTrait(player.hiddenTraits, 'injuryProne')) {
    baseProbability *= 1.8;
  }

  // Iron Man trait decreases chance
  if (hasTrait(player.hiddenTraits, 'ironMan')) {
    baseProbability *= 0.4;
  }

  // Age affects injury risk
  if (player.age >= 32) {
    baseProbability *= 1.3;
  } else if (player.age >= 30) {
    baseProbability *= 1.15;
  } else if (player.age <= 23) {
    baseProbability *= 0.9;
  }

  // Existing injury increases risk
  if (player.injuryStatus.severity !== 'none') {
    baseProbability *= 1.5;
  }

  // Roll for injury
  if (Math.random() > baseProbability) {
    return {
      occurred: false,
      type: null,
      severity: null,
      weeksOut: 0,
      permanentEffects: [],
    };
  }

  // Injury occurred - determine details
  const injuryType = selectInjuryType(player);
  const severity = determineInjurySeverity(injuryType, hadBigHit, currentFatigue, player);
  const weeksOut = calculateWeeksOut(injuryType, severity);
  const permanentEffects = determinePermanentEffects(injuryType, severity);

  return {
    occurred: true,
    type: injuryType,
    severity,
    weeksOut,
    permanentEffects,
  };
}

/**
 * Create a result for no injury
 */
export function createNoInjuryResult(): InjuryResult {
  return {
    occurred: false,
    type: null,
    severity: null,
    weeksOut: 0,
    permanentEffects: [],
  };
}

/**
 * Get injury severity display string
 */
export function getInjurySeverityDisplay(severity: GameplayInjurySeverity): string {
  const displays: Record<GameplayInjurySeverity, string> = {
    minor: 'Day-to-Day',
    moderate: 'Out',
    significant: 'Out (Extended)',
    severe: 'IR Candidate',
    season_ending: 'Season-Ending',
  };

  return displays[severity];
}

/**
 * Get injury type display string
 */
export function getInjuryTypeDisplay(type: GameplayInjuryType): string {
  const displays: Record<GameplayInjuryType, string> = {
    concussion: 'Concussion',
    ankle: 'Ankle',
    knee_minor: 'Knee',
    knee_acl: 'Torn ACL',
    knee_mcl: 'Torn MCL',
    hamstring: 'Hamstring',
    shoulder: 'Shoulder',
    back: 'Back',
    hand: 'Hand',
    foot: 'Foot',
    ribs: 'Ribs',
  };

  return displays[type];
}
