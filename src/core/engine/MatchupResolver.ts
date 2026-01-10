/**
 * Matchup Resolver
 * Resolves individual matchups between offensive and defensive players.
 * Aggregates matchups for overall play outcome determination.
 */

import { Player } from '../models/player/Player';
import { PlayType } from './OutcomeTables';

/**
 * Result of an individual matchup
 */
export interface MatchupResult {
  winner: 'offense' | 'defense' | 'neutral';
  marginOfVictory: number; // How decisively (0-40 typical range)
  offensiveRating: number;
  defensiveRating: number;
}

/**
 * Player with effective rating for matchup calculations
 */
export interface PlayerWithEffective {
  player: Player;
  effective: number;
}

/**
 * Result of aggregated play matchup
 */
export interface PlayMatchupResult {
  overallWinner: 'offense' | 'defense';
  aggregateMargin: number;
  keyMatchup: {
    offense: string; // Player name
    defense: string; // Player name
    result: string; // Description of matchup result
  };
}

/**
 * Resolve individual matchup between two players
 *
 * @param offensivePlayer - The offensive player
 * @param offensiveEffective - Offensive player's effective rating
 * @param defensivePlayer - The defensive player
 * @param defensiveEffective - Defensive player's effective rating
 * @returns Matchup result with winner and margin
 */
export function resolveMatchup(
  offensivePlayer: Player,
  offensiveEffective: number,
  defensivePlayer: Player,
  defensiveEffective: number
): MatchupResult {
  // Calculate raw difference
  const difference = offensiveEffective - defensiveEffective;

  // Add some randomness to prevent pure determinism
  // Random factor between -5 and +5
  const randomFactor = (Math.random() - 0.5) * 10;
  const adjustedDifference = difference + randomFactor;

  // Determine winner
  let winner: 'offense' | 'defense' | 'neutral';

  if (Math.abs(adjustedDifference) < 3) {
    winner = 'neutral';
  } else if (adjustedDifference > 0) {
    winner = 'offense';
  } else {
    winner = 'defense';
  }

  return {
    winner,
    marginOfVictory: Math.abs(adjustedDifference),
    offensiveRating: offensiveEffective,
    defensiveRating: defensiveEffective,
  };
}

/**
 * Get matchup description based on margin
 */
function getMatchupDescription(margin: number, winner: 'offense' | 'defense' | 'neutral'): string {
  if (winner === 'neutral') {
    return 'fought to a draw';
  }

  if (margin >= 20) {
    return winner === 'offense' ? 'completely dominated' : 'was completely dominated by';
  }

  if (margin >= 15) {
    return winner === 'offense' ? 'clearly won against' : 'clearly lost to';
  }

  if (margin >= 10) {
    return winner === 'offense' ? 'had the advantage over' : 'was beaten by';
  }

  if (margin >= 5) {
    return winner === 'offense' ? 'edged out' : 'was edged by';
  }

  return winner === 'offense' ? 'slightly won against' : 'barely lost to';
}

/**
 * Calculate weighted average of matchup results
 */
function calculateWeightedMargin(
  matchups: MatchupResult[],
  weights: number[]
): { margin: number; winner: 'offense' | 'defense' } {
  if (matchups.length === 0 || weights.length === 0) {
    return { margin: 0, winner: 'offense' };
  }

  let totalWeight = 0;
  let weightedSum = 0;

  for (let i = 0; i < matchups.length && i < weights.length; i++) {
    const matchup = matchups[i];
    const weight = weights[i];

    // Convert to signed margin (positive = offense wins)
    const signedMargin =
      matchup.winner === 'offense'
        ? matchup.marginOfVictory
        : matchup.winner === 'defense'
          ? -matchup.marginOfVictory
          : 0;

    weightedSum += signedMargin * weight;
    totalWeight += weight;
  }

  const finalMargin = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return {
    margin: Math.abs(finalMargin),
    winner: finalMargin >= 0 ? 'offense' : 'defense',
  };
}

/**
 * Find the key matchup (most impactful individual matchup)
 */
function findKeyMatchup(
  offensivePlayers: PlayerWithEffective[],
  defensivePlayers: PlayerWithEffective[],
  matchups: MatchupResult[]
): { offense: string; defense: string; result: string } {
  // Find the matchup with the largest margin
  let keyIndex = 0;
  let largestMargin = 0;

  for (let i = 0; i < matchups.length; i++) {
    if (matchups[i].marginOfVictory > largestMargin) {
      largestMargin = matchups[i].marginOfVictory;
      keyIndex = i;
    }
  }

  const keyMatchup = matchups[keyIndex] || matchups[0];
  const offPlayer = offensivePlayers[keyIndex] || offensivePlayers[0];
  const defPlayer = defensivePlayers[keyIndex] || defensivePlayers[0];

  const offName = offPlayer
    ? `${offPlayer.player.firstName.charAt(0)}. ${offPlayer.player.lastName}`
    : 'Offense';
  const defName = defPlayer
    ? `${defPlayer.player.firstName.charAt(0)}. ${defPlayer.player.lastName}`
    : 'Defense';

  return {
    offense: offName,
    defense: defName,
    result: getMatchupDescription(keyMatchup.marginOfVictory, keyMatchup.winner),
  };
}

/**
 * Aggregate matchups for a play
 * Combines multiple individual matchups into overall play outcome
 *
 * @param offensivePlayers - Offensive players with effective ratings
 * @param defensivePlayers - Defensive players with effective ratings
 * @param playType - Type of play being run
 * @returns Aggregated matchup result
 */
export function resolvePlayMatchup(
  offensivePlayers: PlayerWithEffective[],
  defensivePlayers: PlayerWithEffective[],
  _playType: PlayType
): PlayMatchupResult {
  // Handle empty arrays
  if (offensivePlayers.length === 0 || defensivePlayers.length === 0) {
    return {
      overallWinner: 'offense',
      aggregateMargin: 0,
      keyMatchup: {
        offense: 'Unknown',
        defense: 'Unknown',
        result: 'no contest',
      },
    };
  }

  // Resolve individual matchups
  // Pair up players by index (simplified - could be more sophisticated)
  const matchups: MatchupResult[] = [];
  const numMatchups = Math.min(offensivePlayers.length, defensivePlayers.length);

  for (let i = 0; i < numMatchups; i++) {
    const offPlayer = offensivePlayers[i];
    const defPlayer = defensivePlayers[i];

    const result = resolveMatchup(offPlayer.player, offPlayer.effective, defPlayer.player, defPlayer.effective);

    matchups.push(result);
  }

  // Create weight array matching matchup order
  // This is simplified - in reality we'd match positions more carefully
  const weightArray = matchups.map((_, index) => {
    if (index === 0) return 0.4; // Primary matchup
    if (index === 1) return 0.3; // Secondary matchup
    return 0.3 / (numMatchups - 2 || 1); // Split remaining among others
  });

  // Calculate weighted result
  const { margin, winner } = calculateWeightedMargin(matchups, weightArray);

  // Find key matchup
  const keyMatchup = findKeyMatchup(offensivePlayers, defensivePlayers, matchups);

  return {
    overallWinner: winner,
    aggregateMargin: margin,
    keyMatchup,
  };
}

/**
 * Calculate the average effective rating for a group of players
 */
export function calculateGroupEffectiveRating(players: PlayerWithEffective[]): number {
  if (players.length === 0) return 50;

  const total = players.reduce((sum, p) => sum + p.effective, 0);
  return total / players.length;
}

/**
 * Quick matchup check for simple plays (field goals, etc.)
 */
export function resolveSimpleMatchup(
  offensiveRating: number,
  defensiveRating: number
): MatchupResult {
  const difference = offensiveRating - defensiveRating;
  const randomFactor = (Math.random() - 0.5) * 8;
  const adjustedDifference = difference + randomFactor;

  return {
    winner: adjustedDifference > 2 ? 'offense' : adjustedDifference < -2 ? 'defense' : 'neutral',
    marginOfVictory: Math.abs(adjustedDifference),
    offensiveRating,
    defensiveRating,
  };
}
