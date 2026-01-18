/**
 * Scheme Matchup Effects
 * Gradient matchup system with specific effects for each scheme combination.
 * Replaces binary "counters" with nuanced play-type specific modifiers.
 */

import { OffensiveScheme, DefensiveScheme } from '../models/player/SchemeFit';
import { PlayType } from './OutcomeTables';

/**
 * Effect modifiers for specific play types
 */
export interface PlayTypeEffects {
  completion?: number; // % modifier to completion probability
  yards?: number; // % modifier to expected yards
  sack?: number; // % modifier to sack probability
  interception?: number; // % modifier to INT probability
  bigPlay?: number; // % modifier to big play probability
  fumble?: number; // % modifier to fumble probability
}

/**
 * Scheme matchup effect - how two schemes interact
 */
export interface SchemeMatchupEffect {
  offense: OffensiveScheme;
  defense: DefensiveScheme;
  deepPass: PlayTypeEffects;
  shortPass: PlayTypeEffects;
  runInside: PlayTypeEffects;
  runOutside: PlayTypeEffects;
  playAction: PlayTypeEffects;
  screen: PlayTypeEffects;
  overallAdvantage: number; // -20 to +20 (positive = offense)
  description: string;
}

/**
 * All scheme matchup effects
 */
const SCHEME_MATCHUPS: SchemeMatchupEffect[] = [
  // West Coast vs various defenses
  {
    offense: 'westCoast',
    defense: 'coverTwo',
    deepPass: { completion: -15, yards: -20, interception: 10 },
    shortPass: { completion: 5, yards: 10, bigPlay: -5 },
    runInside: { yards: -5 },
    runOutside: { yards: -5 },
    playAction: { completion: -10, yards: -15 },
    screen: { yards: 15, bigPlay: 10 },
    overallAdvantage: -2,
    description: 'Cover 2 takes away deep shots, forces underneath throws',
  },
  {
    offense: 'westCoast',
    defense: 'manPress',
    deepPass: { completion: -5, yards: 5, bigPlay: 15 },
    shortPass: { completion: -10, yards: -15, sack: 10 },
    runInside: { yards: 5 },
    runOutside: { yards: 10 },
    playAction: { completion: 10, yards: 15, bigPlay: 20 },
    screen: { yards: -10, interception: 5 },
    overallAdvantage: -3,
    description: 'Press coverage disrupts timing routes',
  },
  {
    offense: 'westCoast',
    defense: 'blitzHeavy',
    deepPass: { completion: -20, sack: 25, interception: 15 },
    shortPass: { completion: 10, yards: 15, bigPlay: 10 },
    runInside: { yards: -10, fumble: 10 },
    runOutside: { yards: 5 },
    playAction: { sack: 20, completion: -15 },
    screen: { yards: 25, bigPlay: 30 },
    overallAdvantage: 5,
    description: 'Quick passes exploit blitz, screens devastating',
  },
  {
    offense: 'westCoast',
    defense: 'coverThree',
    deepPass: { completion: -5, yards: -10 },
    shortPass: { completion: 10, yards: 5 },
    runInside: { yards: -5 },
    runOutside: { yards: 0 },
    playAction: { completion: 5, yards: 10 },
    screen: { yards: 5 },
    overallAdvantage: 3,
    description: 'Soft zones allow timing routes underneath',
  },

  // Air Raid vs various defenses
  {
    offense: 'airRaid',
    defense: 'coverTwo',
    deepPass: { completion: -20, yards: -25, interception: 15 },
    shortPass: { completion: 0, yards: 5 },
    runInside: { yards: 10 }, // Light boxes
    runOutside: { yards: 15 },
    playAction: { completion: -10, yards: -10 },
    screen: { yards: 10, bigPlay: 5 },
    overallAdvantage: -5,
    description: 'Two deep safeties bracket vertical routes',
  },
  {
    offense: 'airRaid',
    defense: 'blitzHeavy',
    deepPass: { completion: -15, sack: 30, bigPlay: 20 },
    shortPass: { completion: 5, yards: 10, bigPlay: 15 },
    runInside: { yards: -15, fumble: 15 },
    runOutside: { yards: -10 },
    playAction: { sack: 25, interception: 10 },
    screen: { yards: 30, bigPlay: 35 },
    overallAdvantage: 8,
    description: 'High risk/reward - big sacks or big plays',
  },
  {
    offense: 'airRaid',
    defense: 'manPress',
    deepPass: { completion: -10, yards: 10, bigPlay: 25, interception: 10 },
    shortPass: { completion: -15, yards: -20, sack: 15 },
    runInside: { yards: 5 },
    runOutside: { yards: 10 },
    playAction: { bigPlay: 20, completion: 5 },
    screen: { yards: -15, interception: 10 },
    overallAdvantage: 0,
    description: 'Coin flip - either deep shot connects or disruption',
  },
  {
    offense: 'airRaid',
    defense: 'coverThree',
    deepPass: { completion: 5, yards: 10, bigPlay: 10 },
    shortPass: { completion: 10, yards: 5 },
    runInside: { yards: 5 },
    runOutside: { yards: 0 },
    playAction: { completion: 10, yards: 15, bigPlay: 15 },
    screen: { yards: 5 },
    overallAdvantage: 8,
    description: 'Four verticals stress single high safety',
  },

  // Spread Option vs various defenses
  {
    offense: 'spreadOption',
    defense: 'fourThreeUnder',
    deepPass: { completion: -5, yards: 0 },
    shortPass: { completion: 5, yards: 5 },
    runInside: { yards: -10, fumble: 5 },
    runOutside: { yards: 5, bigPlay: 10 },
    playAction: { completion: 10, yards: 15 },
    screen: { yards: 10, bigPlay: 5 },
    overallAdvantage: 2,
    description: 'Designed runs struggle vs gap integrity',
  },
  {
    offense: 'spreadOption',
    defense: 'threeFour',
    deepPass: { completion: 5, yards: 5 },
    shortPass: { completion: 10, yards: 10 },
    runInside: { yards: -15, fumble: 10 },
    runOutside: { yards: -5 },
    playAction: { completion: 15, yards: 20 },
    screen: { yards: 5 },
    overallAdvantage: -3,
    description: '3-4 OLBs read option keys, multiple gaps filled',
  },
  {
    offense: 'spreadOption',
    defense: 'manPress',
    deepPass: { completion: 5, yards: 10, bigPlay: 15 },
    shortPass: { completion: -5, yards: -5 },
    runInside: { yards: 10, bigPlay: 15 },
    runOutside: { yards: 15, bigPlay: 20 },
    playAction: { completion: 10, yards: 10 },
    screen: { yards: -5 },
    overallAdvantage: 7,
    description: 'Man coverage leaves run lanes open, no extra eyes',
  },

  // Power Run vs various defenses
  {
    offense: 'powerRun',
    defense: 'fourThreeUnder',
    deepPass: { completion: 0, yards: 0 },
    shortPass: { completion: 5, yards: 5 },
    runInside: { yards: -10, fumble: 5 },
    runOutside: { yards: -5 },
    playAction: { completion: 15, yards: 20, bigPlay: 15 },
    screen: { yards: 5 },
    overallAdvantage: -4,
    description: 'Under front built to stop power, but PA kills',
  },
  {
    offense: 'powerRun',
    defense: 'blitzHeavy',
    deepPass: { completion: -10, sack: 20 },
    shortPass: { completion: 5, yards: 5 },
    runInside: { yards: 15, bigPlay: 20 },
    runOutside: { yards: 10, bigPlay: 15 },
    playAction: { sack: 15, bigPlay: 25 },
    screen: { yards: 20, bigPlay: 25 },
    overallAdvantage: 10,
    description: 'Blitzes leave gaping holes for power run',
  },
  {
    offense: 'powerRun',
    defense: 'coverTwo',
    deepPass: { completion: -10, yards: -15 },
    shortPass: { completion: 5, yards: 5 },
    runInside: { yards: 10, bigPlay: 10 },
    runOutside: { yards: 15, bigPlay: 15 },
    playAction: { completion: 10, yards: 15 },
    screen: { yards: 5 },
    overallAdvantage: 5,
    description: 'Cover 2 shell leaves light boxes',
  },

  // Zone Run vs various defenses
  {
    offense: 'zoneRun',
    defense: 'threeFour',
    deepPass: { completion: 5, yards: 5 },
    shortPass: { completion: 5, yards: 5 },
    runInside: { yards: -15 },
    runOutside: { yards: -10 },
    playAction: { completion: 10, yards: 10 },
    screen: { yards: 5 },
    overallAdvantage: -6,
    description: '3-4 two-gapping disrupts zone blocking angles',
  },
  {
    offense: 'zoneRun',
    defense: 'coverThree',
    deepPass: { completion: 0, yards: 0 },
    shortPass: { completion: 5, yards: 5 },
    runInside: { yards: -5 },
    runOutside: { yards: -5 },
    playAction: { completion: 5, yards: 10 },
    screen: { yards: 5 },
    overallAdvantage: -3,
    description: 'Single high = extra defender in box',
  },
  {
    offense: 'zoneRun',
    defense: 'manPress',
    deepPass: { completion: 5, yards: 10, bigPlay: 10 },
    shortPass: { completion: 5, yards: 5 },
    runInside: { yards: 10, bigPlay: 10 },
    runOutside: { yards: 15, bigPlay: 20 },
    playAction: { completion: 15, yards: 20, bigPlay: 20 },
    screen: { yards: 0 },
    overallAdvantage: 8,
    description: 'Man coverage pulls defenders out of box',
  },

  // Play Action vs various defenses
  {
    offense: 'playAction',
    defense: 'coverTwo',
    deepPass: { completion: 5, yards: 10, bigPlay: 15 },
    shortPass: { completion: 10, yards: 10 },
    runInside: { yards: -5 },
    runOutside: { yards: 0 },
    playAction: { completion: 15, yards: 20, bigPlay: 25 },
    screen: { yards: 5 },
    overallAdvantage: 5,
    description: 'PA freezes safeties, opens deep middle',
  },
  {
    offense: 'playAction',
    defense: 'manPress',
    deepPass: { completion: 10, yards: 15, bigPlay: 20 },
    shortPass: { completion: -5, yards: 0 },
    runInside: { yards: 5 },
    runOutside: { yards: 10 },
    playAction: { completion: 20, yards: 25, bigPlay: 30 },
    screen: { yards: -5 },
    overallAdvantage: 10,
    description: 'Man defenders turn backs, miss PA fake',
  },
  {
    offense: 'playAction',
    defense: 'blitzHeavy',
    deepPass: { completion: -15, sack: 25 },
    shortPass: { completion: 0, yards: 5 },
    runInside: { yards: 10, bigPlay: 10 },
    runOutside: { yards: 5 },
    playAction: { sack: 20, bigPlay: 30, yards: 20 },
    screen: { yards: 15, bigPlay: 20 },
    overallAdvantage: 3,
    description: 'PA needs time, blitz gets home or gives up bomb',
  },
];

/**
 * Default matchup effect (neutral)
 */
const DEFAULT_MATCHUP: SchemeMatchupEffect = {
  offense: 'westCoast',
  defense: 'fourThreeUnder',
  deepPass: {},
  shortPass: {},
  runInside: {},
  runOutside: {},
  playAction: {},
  screen: {},
  overallAdvantage: 0,
  description: 'Neutral matchup',
};

/**
 * Get scheme matchup effects for a given offense/defense combination
 */
export function getSchemeMatchupEffects(
  offense: OffensiveScheme,
  defense: DefensiveScheme
): SchemeMatchupEffect {
  for (const m of SCHEME_MATCHUPS) {
    if (m.offense === offense && m.defense === defense) {
      return m;
    }
  }
  return { ...DEFAULT_MATCHUP, offense, defense };
}

/**
 * Get effects for a specific play type
 */
export function getPlayTypeEffects(
  matchup: SchemeMatchupEffect,
  playType: PlayType
): PlayTypeEffects {
  // Map play types to effect categories
  if (playType === 'pass_deep' || playType === 'play_action_deep') {
    // Combine deep pass and play action effects for PA deep
    if (playType === 'play_action_deep') {
      return mergeEffects(matchup.deepPass, matchup.playAction);
    }
    return matchup.deepPass;
  }

  if (playType === 'pass_short' || playType === 'pass_medium') {
    return matchup.shortPass;
  }

  if (playType === 'play_action_short') {
    return mergeEffects(matchup.shortPass, matchup.playAction);
  }

  if (playType === 'pass_screen') {
    return matchup.screen;
  }

  if (playType === 'run_inside' || playType === 'run_draw' || playType === 'qb_sneak') {
    return matchup.runInside;
  }

  if (playType === 'run_outside' || playType === 'run_sweep') {
    return matchup.runOutside;
  }

  if (playType === 'qb_scramble') {
    return matchup.runOutside; // Treat like outside run
  }

  return {};
}

/**
 * Merge two effect objects (for combined effects like PA deep)
 */
function mergeEffects(effects1: PlayTypeEffects, effects2: PlayTypeEffects): PlayTypeEffects {
  return {
    completion: ((effects1.completion || 0) + (effects2.completion || 0)) / 2,
    yards: ((effects1.yards || 0) + (effects2.yards || 0)) / 2,
    sack: ((effects1.sack || 0) + (effects2.sack || 0)) / 2,
    interception: ((effects1.interception || 0) + (effects2.interception || 0)) / 2,
    bigPlay: ((effects1.bigPlay || 0) + (effects2.bigPlay || 0)) / 2,
    fumble: ((effects1.fumble || 0) + (effects2.fumble || 0)) / 2,
  };
}

/**
 * Apply scheme effects to outcome probabilities
 */
export function applySchemeEffects(
  baseProbabilities: Record<string, number>,
  effects: PlayTypeEffects,
  isPassPlay: boolean
): Record<string, number> {
  const modified = { ...baseProbabilities };

  if (isPassPlay) {
    // Completion effects
    if (effects.completion) {
      const completionOutcomes = ['touchdown', 'big_gain', 'good_gain', 'moderate_gain', 'short_gain'];
      for (const outcome of completionOutcomes) {
        if (modified[outcome]) {
          modified[outcome] *= 1 + effects.completion / 100;
        }
      }
      // Inverse effect on incomplete
      if (modified.incomplete) {
        modified.incomplete *= 1 - effects.completion / 100;
      }
    }

    // Sack effects
    if (effects.sack && modified.sack) {
      modified.sack *= 1 + effects.sack / 100;
    }

    // Interception effects
    if (effects.interception && modified.interception) {
      modified.interception *= 1 + effects.interception / 100;
    }
  }

  // Yards effects (affects gain distribution)
  if (effects.yards) {
    if (effects.yards > 0) {
      // Positive: boost big/good gains, reduce short gains
      if (modified.big_gain) modified.big_gain *= 1 + effects.yards / 100;
      if (modified.good_gain) modified.good_gain *= 1 + effects.yards / 150;
      if (modified.short_gain) modified.short_gain *= 1 - effects.yards / 200;
    } else {
      // Negative: reduce big/good gains, boost short gains
      if (modified.big_gain) modified.big_gain *= 1 + effects.yards / 100;
      if (modified.good_gain) modified.good_gain *= 1 + effects.yards / 150;
      if (modified.short_gain) modified.short_gain *= 1 - effects.yards / 200;
    }
  }

  // Big play effects
  if (effects.bigPlay) {
    if (modified.big_gain) modified.big_gain *= 1 + effects.bigPlay / 100;
    if (modified.touchdown) modified.touchdown *= 1 + effects.bigPlay / 100;
  }

  // Fumble effects
  if (effects.fumble) {
    if (modified.fumble) modified.fumble *= 1 + effects.fumble / 100;
    if (modified.fumble_lost) modified.fumble_lost *= 1 + effects.fumble / 100;
  }

  return modified;
}

/**
 * Calculate run success rate modifier based on scheme matchup
 */
export function getRunSuccessModifier(
  offenseScheme: OffensiveScheme,
  defenseScheme: DefensiveScheme,
  isInsideRun: boolean
): number {
  const matchup = getSchemeMatchupEffects(offenseScheme, defenseScheme);
  const effects = isInsideRun ? matchup.runInside : matchup.runOutside;

  // Return yards modifier as the primary factor
  return effects.yards || 0;
}

/**
 * Calculate pass success rate modifier based on scheme matchup
 */
export function getPassSuccessModifier(
  offenseScheme: OffensiveScheme,
  defenseScheme: DefensiveScheme,
  isDeepPass: boolean,
  isPlayAction: boolean
): number {
  const matchup = getSchemeMatchupEffects(offenseScheme, defenseScheme);

  let effects: PlayTypeEffects;
  if (isPlayAction) {
    effects = isDeepPass
      ? mergeEffects(matchup.deepPass, matchup.playAction)
      : mergeEffects(matchup.shortPass, matchup.playAction);
  } else {
    effects = isDeepPass ? matchup.deepPass : matchup.shortPass;
  }

  // Combine completion and yards for overall success
  return ((effects.completion || 0) + (effects.yards || 0)) / 2;
}
