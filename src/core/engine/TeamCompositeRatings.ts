/**
 * Team Composite Ratings
 * Calculates team unit strengths with weak link detection and positional importance.
 * These ratings are used for play resolution and are NEVER shown to users.
 */

import { Player } from '../models/player/Player';
import { TeamGameState } from './TeamGameState';
import {
  calculateEffectiveRating,
  WeatherCondition,
  GameStakes,
} from './EffectiveRatingCalculator';
import { getPositionCoach, getPlayerWeeklyVariance } from './TeamGameState';
import { RoleType } from '../models/player/RoleFit';

/**
 * Positional importance weights for pass protection
 * LT is most important (blindside protection), RT next, C for calls, Guards least
 */
export const PASS_PROTECTION_WEIGHTS: Record<string, number> = {
  LT: 1.4, // Most important - protects QB's blind side
  RT: 1.2, // Protects QB's front side
  C: 1.1, // Makes line calls, handles interior stunts
  LG: 1.0, // Interior pressure is disruptive but less deadly
  RG: 1.0,
};

/**
 * Positional importance weights for run blocking (generic)
 * Center and Guards are most important for interior runs
 */
export const RUN_BLOCKING_WEIGHTS: Record<string, number> = {
  C: 1.3, // Anchors interior, combo blocks to LB level
  LG: 1.2, // Pull on power plays, create interior lanes
  RG: 1.2,
  LT: 1.0, // Seal the edge, but less involved in gap schemes
  RT: 1.0,
};

/**
 * Run blocking weights by play direction
 */
export const RUN_LEFT_WEIGHTS: Record<string, number> = {
  LT: 1.4, // Sealing backside
  LG: 1.3, // Lead blocker / puller
  C: 1.2, // Combo to playside
  RG: 0.8, // Backside cutoff
  RT: 0.6, // Minimal involvement
};

export const RUN_RIGHT_WEIGHTS: Record<string, number> = {
  LT: 0.6, // Minimal involvement
  LG: 0.8, // Backside cutoff
  C: 1.2, // Combo to playside
  RG: 1.3, // Lead blocker / puller
  RT: 1.4, // Sealing backside
};

/**
 * Result of a unit rating calculation
 */
export interface UnitRating {
  /** Simple average of all player ratings */
  average: number;
  /** Weighted average using positional importance */
  weightedAverage: number;
  /** Lowest individual rating in the unit */
  floor: number;
  /** Position of the weakest player */
  weakLinkPosition: string;
  /** Penalty applied for having a weak link */
  weakLinkPenalty: number;
  /** Final effective rating after all adjustments */
  effective: number;
}

/**
 * All team composite ratings for a play
 */
export interface TeamCompositeRatings {
  // Offensive units
  passProtection: UnitRating;
  runBlocking: UnitRating;
  receiving: UnitRating;
  rushing: UnitRating;

  // Defensive units
  passRush: UnitRating;
  runStopping: UnitRating;
  passCoverage: UnitRating;
}

/**
 * Parameters for calculating team composite ratings
 */
export interface CompositeRatingParams {
  teamState: TeamGameState;
  weather: WeatherCondition;
  stakes: GameStakes;
  playDirection?: 'left' | 'right' | 'middle';
}

/**
 * Calculate weak link penalty
 * If any player is significantly below average, the unit suffers
 */
function calculateWeakLinkPenalty(
  weightedAverage: number,
  floor: number,
  floorWeight: number
): number {
  // The gap between average and weakest player, adjusted by position importance
  const adjustedFloor = floor * floorWeight;
  const gap = weightedAverage - adjustedFloor;

  // Severe penalty if gap is large (>20 points)
  if (gap > 20) {
    return gap * 0.5;
  }
  // Moderate penalty for medium gaps (10-20)
  if (gap > 10) {
    return gap * 0.3;
  }
  // Minor penalty for small gaps
  return gap * 0.15;
}

/**
 * Get player's effective rating for a specific skill
 */
function getPlayerEffectiveRating(
  player: Player,
  skill: string,
  teamState: TeamGameState,
  weather: WeatherCondition,
  stakes: GameStakes,
  isOffense: boolean
): number {
  const variance = getPlayerWeeklyVariance(teamState, player.id);
  const coach = getPositionCoach(teamState, player.position);
  const scheme = isOffense ? teamState.offensiveScheme : teamState.defensiveScheme;
  const role: RoleType = player.roleFit.currentRole;

  return calculateEffectiveRating({
    player,
    skill,
    positionCoach: coach,
    teamScheme: scheme,
    assignedRole: role,
    weather,
    gameStakes: stakes,
    weeklyVariance: variance,
  });
}

/**
 * Calculate pass protection unit rating
 */
export function calculatePassProtectionRating(params: CompositeRatingParams): UnitRating {
  const { teamState, weather, stakes } = params;
  const olPlayers = teamState.offense.ol;

  if (olPlayers.length < 5) {
    return {
      average: 50,
      weightedAverage: 50,
      floor: 50,
      weakLinkPosition: 'Unknown',
      weakLinkPenalty: 0,
      effective: 50,
    };
  }

  const positions = ['LT', 'LG', 'C', 'RG', 'RT'];
  const ratings: { position: string; rating: number; weight: number }[] = [];

  let totalWeight = 0;
  let weightedSum = 0;
  let simpleSum = 0;
  let minRating = 100;
  let minPosition = '';
  let minWeight = 1;

  for (let i = 0; i < 5; i++) {
    const player = olPlayers[i];
    const position = positions[i];
    const weight = PASS_PROTECTION_WEIGHTS[position];

    const rating = getPlayerEffectiveRating(player, 'passBlock', teamState, weather, stakes, true);

    ratings.push({ position, rating, weight });
    weightedSum += rating * weight;
    totalWeight += weight;
    simpleSum += rating;

    // Track weakest link (by weighted value)
    const weightedRating = rating * weight;
    if (weightedRating < minRating * minWeight) {
      minRating = rating;
      minPosition = position;
      minWeight = weight;
    }
  }

  const average = simpleSum / 5;
  const weightedAverage = weightedSum / totalWeight;
  const weakLinkPenalty = calculateWeakLinkPenalty(weightedAverage, minRating, minWeight);
  const effective = Math.max(1, Math.min(100, weightedAverage - weakLinkPenalty));

  return {
    average,
    weightedAverage,
    floor: minRating,
    weakLinkPosition: minPosition,
    weakLinkPenalty,
    effective,
  };
}

/**
 * Calculate run blocking unit rating
 */
export function calculateRunBlockingRating(params: CompositeRatingParams): UnitRating {
  const { teamState, weather, stakes, playDirection } = params;
  const olPlayers = teamState.offense.ol;

  if (olPlayers.length < 5) {
    return {
      average: 50,
      weightedAverage: 50,
      floor: 50,
      weakLinkPosition: 'Unknown',
      weakLinkPenalty: 0,
      effective: 50,
    };
  }

  // Select weights based on play direction
  let weights: Record<string, number>;
  if (playDirection === 'left') {
    weights = RUN_LEFT_WEIGHTS;
  } else if (playDirection === 'right') {
    weights = RUN_RIGHT_WEIGHTS;
  } else {
    weights = RUN_BLOCKING_WEIGHTS;
  }

  const positions = ['LT', 'LG', 'C', 'RG', 'RT'];
  let totalWeight = 0;
  let weightedSum = 0;
  let simpleSum = 0;
  let minRating = 100;
  let minPosition = '';
  let minWeight = 1;

  for (let i = 0; i < 5; i++) {
    const player = olPlayers[i];
    const position = positions[i];
    const weight = weights[position];

    const rating = getPlayerEffectiveRating(player, 'runBlock', teamState, weather, stakes, true);

    weightedSum += rating * weight;
    totalWeight += weight;
    simpleSum += rating;

    const weightedRating = rating * weight;
    if (weightedRating < minRating * minWeight) {
      minRating = rating;
      minPosition = position;
      minWeight = weight;
    }
  }

  const average = simpleSum / 5;
  const weightedAverage = weightedSum / totalWeight;
  const weakLinkPenalty = calculateWeakLinkPenalty(weightedAverage, minRating, minWeight);
  const effective = Math.max(1, Math.min(100, weightedAverage - weakLinkPenalty));

  return {
    average,
    weightedAverage,
    floor: minRating,
    weakLinkPosition: minPosition,
    weakLinkPenalty,
    effective,
  };
}

/**
 * Calculate receiving unit rating
 * Top 3 receivers weighted: primary (50%), secondary (30%), tertiary (20%)
 */
export function calculateReceivingRating(params: CompositeRatingParams): UnitRating {
  const { teamState, weather, stakes } = params;
  const receivers: { player: Player; rating: number }[] = [];

  // Gather all receivers (WRs, TEs, RBs with receiving ability)
  for (const wr of teamState.offense.wr) {
    const rating = getPlayerEffectiveRating(wr, 'routeRunning', teamState, weather, stakes, true);
    receivers.push({ player: wr, rating });
  }
  for (const te of teamState.offense.te) {
    const rating = getPlayerEffectiveRating(te, 'catching', teamState, weather, stakes, true);
    receivers.push({ player: te, rating });
  }
  for (const rb of teamState.offense.rb) {
    const rating = getPlayerEffectiveRating(rb, 'catching', teamState, weather, stakes, true);
    receivers.push({ player: rb, rating: rating * 0.85 }); // RB receiving slightly discounted
  }

  // Sort by rating descending
  receivers.sort((a, b) => b.rating - a.rating);

  // Take top 3 with weights
  const weights = [0.5, 0.3, 0.2];
  let weightedSum = 0;
  let totalWeight = 0;
  let simpleSum = 0;
  let minRating = 100;
  let minPosition = '';

  for (let i = 0; i < Math.min(3, receivers.length); i++) {
    const { player, rating } = receivers[i];
    const weight = weights[i];

    weightedSum += rating * weight;
    totalWeight += weight;
    simpleSum += rating;

    if (rating < minRating) {
      minRating = rating;
      minPosition = player.position;
    }
  }

  const count = Math.min(3, receivers.length);
  const average = count > 0 ? simpleSum / count : 50;
  const weightedAverage = totalWeight > 0 ? weightedSum / totalWeight : 50;
  // Receiving has less weak link penalty - can avoid throwing to weak receivers
  const weakLinkPenalty = calculateWeakLinkPenalty(weightedAverage, minRating, 1) * 0.3;
  const effective = Math.max(1, Math.min(100, weightedAverage - weakLinkPenalty));

  return {
    average,
    weightedAverage,
    floor: minRating,
    weakLinkPosition: minPosition,
    weakLinkPenalty,
    effective,
  };
}

/**
 * Calculate rushing unit rating
 * RB rating with OL run blocking consideration
 */
export function calculateRushingRating(params: CompositeRatingParams): UnitRating {
  const { teamState, weather, stakes } = params;
  const rb = teamState.offense.rb[0];

  if (!rb) {
    return {
      average: 50,
      weightedAverage: 50,
      floor: 50,
      weakLinkPosition: 'RB',
      weakLinkPenalty: 0,
      effective: 50,
    };
  }

  // RB rushing ability
  const rbRating = getPlayerEffectiveRating(rb, 'vision', teamState, weather, stakes, true);

  // Get OL run blocking
  const olRunBlocking = calculateRunBlockingRating(params);

  // Rushing = 60% RB, 40% OL
  const weightedAverage = rbRating * 0.6 + olRunBlocking.effective * 0.4;
  const average = (rbRating + olRunBlocking.average) / 2;
  const floor = Math.min(rbRating, olRunBlocking.floor);
  const weakLinkPosition = rbRating < olRunBlocking.floor ? 'RB' : olRunBlocking.weakLinkPosition;

  // Weak link penalty - RB can't overcome a terrible OL
  const weakLinkPenalty = calculateWeakLinkPenalty(weightedAverage, floor, 1) * 0.5;
  const effective = Math.max(1, Math.min(100, weightedAverage - weakLinkPenalty));

  return {
    average,
    weightedAverage,
    floor,
    weakLinkPosition,
    weakLinkPenalty,
    effective,
  };
}

/**
 * Pass rush positional weights
 * Edge rushers (DE) are most important, interior (DT) creates collapse
 */
const PASS_RUSH_WEIGHTS: Record<string, number> = {
  DE: 1.4, // Elite edge rushers dominate
  DT: 1.1, // Interior pressure collapses pocket
  OLB: 1.2, // 3-4 edge rushers
  ILB: 0.6, // Occasional blitzers
};

/**
 * Calculate pass rush unit rating
 */
export function calculatePassRushRating(params: CompositeRatingParams): UnitRating {
  const { teamState, weather, stakes } = params;
  const dl = teamState.defense.dl;
  const lb = teamState.defense.lb;

  const rushers: { position: string; rating: number; weight: number }[] = [];

  // DL are primary pass rushers
  for (const player of dl) {
    const weight = PASS_RUSH_WEIGHTS[player.position] ?? 1.0;
    const rating = getPlayerEffectiveRating(player, 'passRush', teamState, weather, stakes, false);
    rushers.push({ position: player.position, rating, weight });
  }

  // OLBs can be edge rushers
  for (const player of lb) {
    if (player.position === 'OLB') {
      const weight = PASS_RUSH_WEIGHTS.OLB;
      const rating = getPlayerEffectiveRating(
        player,
        'blitzing',
        teamState,
        weather,
        stakes,
        false
      );
      rushers.push({ position: player.position, rating, weight });
    }
  }

  if (rushers.length === 0) {
    return {
      average: 50,
      weightedAverage: 50,
      floor: 50,
      weakLinkPosition: 'Unknown',
      weakLinkPenalty: 0,
      effective: 50,
    };
  }

  // Sort by weighted rating and take top 4
  rushers.sort((a, b) => b.rating * b.weight - a.rating * a.weight);
  const topRushers = rushers.slice(0, 4);

  let totalWeight = 0;
  let weightedSum = 0;
  let simpleSum = 0;
  let minRating = 100;
  let minPosition = '';

  for (const { position, rating, weight } of topRushers) {
    weightedSum += rating * weight;
    totalWeight += weight;
    simpleSum += rating;

    if (rating < minRating) {
      minRating = rating;
      minPosition = position;
    }
  }

  const average = simpleSum / topRushers.length;
  const weightedAverage = weightedSum / totalWeight;
  // Pass rush has moderate weak link penalty - offense can target weak rusher
  const weakLinkPenalty = calculateWeakLinkPenalty(weightedAverage, minRating, 1) * 0.4;
  const effective = Math.max(1, Math.min(100, weightedAverage - weakLinkPenalty));

  return {
    average,
    weightedAverage,
    floor: minRating,
    weakLinkPosition: minPosition,
    weakLinkPenalty,
    effective,
  };
}

/**
 * Calculate run stopping unit rating
 */
export function calculateRunStoppingRating(params: CompositeRatingParams): UnitRating {
  const { teamState, weather, stakes } = params;
  const dl = teamState.defense.dl;
  const lb = teamState.defense.lb;

  const defenders: { position: string; rating: number; weight: number }[] = [];

  // DL weights for run stopping
  const runStopWeights: Record<string, number> = {
    DT: 1.4, // Interior anchors are critical
    DE: 1.1, // Contain the edge
    ILB: 1.3, // Fill gaps, make tackles
    OLB: 1.0, // Edge contain
    SS: 0.8, // Run support
  };

  // DL run stopping
  for (const player of dl) {
    const weight = runStopWeights[player.position] ?? 1.0;
    const rating = getPlayerEffectiveRating(
      player,
      'runDefense',
      teamState,
      weather,
      stakes,
      false
    );
    defenders.push({ position: player.position, rating, weight });
  }

  // LB run stopping
  for (const player of lb) {
    const weight = runStopWeights[player.position] ?? 1.0;
    const rating = getPlayerEffectiveRating(player, 'tackling', teamState, weather, stakes, false);
    defenders.push({ position: player.position, rating, weight });
  }

  if (defenders.length === 0) {
    return {
      average: 50,
      weightedAverage: 50,
      floor: 50,
      weakLinkPosition: 'Unknown',
      weakLinkPenalty: 0,
      effective: 50,
    };
  }

  // Take top 7 (front 7)
  defenders.sort((a, b) => b.rating * b.weight - a.rating * a.weight);
  const topDefenders = defenders.slice(0, 7);

  let totalWeight = 0;
  let weightedSum = 0;
  let simpleSum = 0;
  let minRating = 100;
  let minPosition = '';
  let minWeight = 1;

  for (const { position, rating, weight } of topDefenders) {
    weightedSum += rating * weight;
    totalWeight += weight;
    simpleSum += rating;

    const weightedRating = rating * weight;
    if (weightedRating < minRating * minWeight) {
      minRating = rating;
      minPosition = position;
      minWeight = weight;
    }
  }

  const average = simpleSum / topDefenders.length;
  const weightedAverage = weightedSum / totalWeight;
  // Run stopping has significant weak link penalty - RBs find the weak gap
  const weakLinkPenalty = calculateWeakLinkPenalty(weightedAverage, minRating, minWeight) * 0.6;
  const effective = Math.max(1, Math.min(100, weightedAverage - weakLinkPenalty));

  return {
    average,
    weightedAverage,
    floor: minRating,
    weakLinkPosition: minPosition,
    weakLinkPenalty,
    effective,
  };
}

/**
 * Calculate pass coverage unit rating
 */
export function calculatePassCoverageRating(params: CompositeRatingParams): UnitRating {
  const { teamState, weather, stakes } = params;
  const db = teamState.defense.db;
  const lb = teamState.defense.lb;

  const coverageDefenders: { position: string; rating: number; weight: number }[] = [];

  // Coverage weights - CBs most important, then safeties
  const coverageWeights: Record<string, number> = {
    CB: 1.5, // Primary coverage, get targeted
    FS: 1.2, // Deep coverage, center field
    SS: 1.0, // Run support and short coverage
    ILB: 0.7, // Hook zones, TE coverage
    OLB: 0.8, // Flats, RB coverage
  };

  // DB coverage
  for (const player of db) {
    const weight = coverageWeights[player.position] ?? 1.0;
    const rating = getPlayerEffectiveRating(
      player,
      'manCoverage',
      teamState,
      weather,
      stakes,
      false
    );
    coverageDefenders.push({ position: player.position, rating, weight });
  }

  // LB coverage (limited)
  for (const player of lb) {
    const weight = coverageWeights[player.position] ?? 0.7;
    const rating = getPlayerEffectiveRating(player, 'coverage', teamState, weather, stakes, false);
    coverageDefenders.push({ position: player.position, rating, weight });
  }

  if (coverageDefenders.length === 0) {
    return {
      average: 50,
      weightedAverage: 50,
      floor: 50,
      weakLinkPosition: 'Unknown',
      weakLinkPenalty: 0,
      effective: 50,
    };
  }

  // Sort and take top 5 (typical coverage players)
  coverageDefenders.sort((a, b) => b.rating * b.weight - a.rating * a.weight);
  const topCoverage = coverageDefenders.slice(0, 5);

  let totalWeight = 0;
  let weightedSum = 0;
  let simpleSum = 0;
  let minRating = 100;
  let minPosition = '';
  let minWeight = 1;

  for (const { position, rating, weight } of topCoverage) {
    weightedSum += rating * weight;
    totalWeight += weight;
    simpleSum += rating;

    const weightedRating = rating * weight;
    if (weightedRating < minRating * minWeight) {
      minRating = rating;
      minPosition = position;
      minWeight = weight;
    }
  }

  const average = simpleSum / topCoverage.length;
  const weightedAverage = weightedSum / totalWeight;
  // Coverage has HIGH weak link penalty - QBs target the weak CB mercilessly
  const weakLinkPenalty = calculateWeakLinkPenalty(weightedAverage, minRating, minWeight) * 0.7;
  const effective = Math.max(1, Math.min(100, weightedAverage - weakLinkPenalty));

  return {
    average,
    weightedAverage,
    floor: minRating,
    weakLinkPosition: minPosition,
    weakLinkPenalty,
    effective,
  };
}

/**
 * Calculate all team composite ratings for a play
 */
export function calculateTeamCompositeRatings(
  offensiveTeam: TeamGameState,
  defensiveTeam: TeamGameState,
  weather: WeatherCondition,
  stakes: GameStakes,
  playDirection?: 'left' | 'right' | 'middle'
): { offense: TeamCompositeRatings; defense: TeamCompositeRatings } {
  const offenseParams: CompositeRatingParams = {
    teamState: offensiveTeam,
    weather,
    stakes,
    playDirection,
  };

  const defenseParams: CompositeRatingParams = {
    teamState: defensiveTeam,
    weather,
    stakes,
  };

  return {
    offense: {
      passProtection: calculatePassProtectionRating(offenseParams),
      runBlocking: calculateRunBlockingRating(offenseParams),
      receiving: calculateReceivingRating(offenseParams),
      rushing: calculateRushingRating(offenseParams),
      // Offensive team doesn't need defensive ratings
      passRush: {
        average: 0,
        weightedAverage: 0,
        floor: 0,
        weakLinkPosition: '',
        weakLinkPenalty: 0,
        effective: 0,
      },
      runStopping: {
        average: 0,
        weightedAverage: 0,
        floor: 0,
        weakLinkPosition: '',
        weakLinkPenalty: 0,
        effective: 0,
      },
      passCoverage: {
        average: 0,
        weightedAverage: 0,
        floor: 0,
        weakLinkPosition: '',
        weakLinkPenalty: 0,
        effective: 0,
      },
    },
    defense: {
      // Defensive team doesn't need offensive ratings
      passProtection: {
        average: 0,
        weightedAverage: 0,
        floor: 0,
        weakLinkPosition: '',
        weakLinkPenalty: 0,
        effective: 0,
      },
      runBlocking: {
        average: 0,
        weightedAverage: 0,
        floor: 0,
        weakLinkPosition: '',
        weakLinkPenalty: 0,
        effective: 0,
      },
      receiving: {
        average: 0,
        weightedAverage: 0,
        floor: 0,
        weakLinkPosition: '',
        weakLinkPenalty: 0,
        effective: 0,
      },
      rushing: {
        average: 0,
        weightedAverage: 0,
        floor: 0,
        weakLinkPosition: '',
        weakLinkPenalty: 0,
        effective: 0,
      },
      passRush: calculatePassRushRating(defenseParams),
      runStopping: calculateRunStoppingRating(defenseParams),
      passCoverage: calculatePassCoverageRating(defenseParams),
    },
  };
}

/**
 * Get matchup advantage for a play type
 * Returns a value from -40 to +40 where positive favors offense
 */
export function getMatchupAdvantage(
  offenseRatings: TeamCompositeRatings,
  defenseRatings: TeamCompositeRatings,
  isPassPlay: boolean
): number {
  if (isPassPlay) {
    // Pass play: OL pass protection vs DL pass rush, Receivers vs Coverage
    const protectionVsRush =
      offenseRatings.passProtection.effective - defenseRatings.passRush.effective;
    const receivingVsCoverage =
      offenseRatings.receiving.effective - defenseRatings.passCoverage.effective;

    // Weight: 40% protection, 60% receiving matchup
    return protectionVsRush * 0.4 + receivingVsCoverage * 0.6;
  } else {
    // Run play: OL run blocking vs DL/LB run stopping, RB vs defense
    const blockingVsStopping =
      offenseRatings.runBlocking.effective - defenseRatings.runStopping.effective;
    const rushingVsDefense =
      offenseRatings.rushing.effective - defenseRatings.runStopping.effective;

    // Weight: 50% blocking, 50% rushing
    return blockingVsStopping * 0.5 + rushingVsDefense * 0.5;
  }
}
