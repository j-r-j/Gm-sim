/**
 * Play Resolver
 * Main play resolution function that ties together all engine components.
 * Takes game context and returns what happened on the play.
 */

import { PlayType, PlayOutcome, generateOutcomeTable, rollOutcome } from './OutcomeTables';
import { PlayCallContext, OffensivePlayCall, DefensivePlayCall } from './PlayCaller';
import {
  TeamGameState,
  getPlayerWeeklyVariance,
  getPlayerFatigue,
  updatePlayerFatigue,
  incrementSnapCount,
  getSnapCount,
  getPlayersForPlayType,
  getPositionCoach,
} from './TeamGameState';
import {
  calculateEffectiveRating,
  GameStakes,
  WeatherCondition,
} from './EffectiveRatingCalculator';
import { resolvePlayMatchup, PlayerWithEffective } from './MatchupResolver';
import { checkForInjury, InjuryResult, createNoInjuryResult } from './InjuryProcessor';
import {
  calculateFatigueIncrease,
  determinePlayIntensity,
  calculateBetweenPlayRecovery,
} from './FatigueSystem';
import { generatePlayDescription, PlayResultForDescription } from './PlayDescriptionGenerator';
import { Player } from '../models/player/Player';
import { RoleType } from '../models/player/RoleFit';

/**
 * Penalty details
 */
export interface PenaltyDetails {
  team: 'offense' | 'defense';
  type: string;
  yards: number;
  playerId: string | null;
  declined: boolean;
}

/**
 * Result of a play
 */
export interface PlayResult {
  // What happened
  playType: PlayType;
  outcome: PlayOutcome;
  yardsGained: number;

  // Who was involved (for stats/display)
  primaryOffensivePlayer: string; // Player ID
  primaryDefensivePlayer: string | null;

  // Game state changes
  newDown: number;
  newDistance: number;
  newFieldPosition: number;
  turnover: boolean;
  touchdown: boolean;
  firstDown: boolean;

  // Side effects
  injuryOccurred: boolean;
  injuredPlayerId: string | null;
  penaltyOccurred: boolean;
  penaltyDetails: PenaltyDetails | null;

  // For display (user sees this)
  description: string;
}

/**
 * Common penalty types
 */
const OFFENSIVE_PENALTIES = [
  { type: 'Holding', yards: 10, rate: 0.4 },
  { type: 'False Start', yards: 5, rate: 0.2 },
  { type: 'Illegal Formation', yards: 5, rate: 0.1 },
  { type: 'Offensive Pass Interference', yards: 10, rate: 0.15 },
  { type: 'Intentional Grounding', yards: 10, rate: 0.1 },
  { type: 'Delay of Game', yards: 5, rate: 0.05 },
];

const DEFENSIVE_PENALTIES = [
  { type: 'Pass Interference', yards: 15, rate: 0.35 },
  { type: 'Defensive Holding', yards: 5, rate: 0.25 },
  { type: 'Roughing the Passer', yards: 15, rate: 0.1 },
  { type: 'Offsides', yards: 5, rate: 0.15 },
  { type: 'Unnecessary Roughness', yards: 15, rate: 0.1 },
  { type: 'Encroachment', yards: 5, rate: 0.05 },
];

/**
 * Select a penalty type
 */
function selectPenalty(team: 'offense' | 'defense'): { type: string; yards: number } {
  const penalties = team === 'offense' ? OFFENSIVE_PENALTIES : DEFENSIVE_PENALTIES;
  const totalRate = penalties.reduce((sum, p) => sum + p.rate, 0);

  let roll = Math.random() * totalRate;
  for (const penalty of penalties) {
    roll -= penalty.rate;
    if (roll <= 0) {
      return { type: penalty.type, yards: penalty.yards };
    }
  }

  return penalties[0];
}

/**
 * Get relevant skill for a player based on play type
 */
function getRelevantSkill(player: Player, playType: PlayType, isOffense: boolean): string {
  const position = player.position;

  if (isOffense) {
    // Offensive skills by position and play type
    if (position === 'QB') {
      if (playType.includes('pass') || playType.includes('action')) {
        return 'accuracy';
      }
      return 'mobility';
    }
    if (position === 'RB') {
      if (playType.startsWith('run')) {
        return 'vision';
      }
      return 'catching';
    }
    if (position === 'WR') {
      if (playType === 'pass_deep' || playType === 'play_action_deep') {
        return 'tracking';
      }
      return 'routeRunning';
    }
    if (position === 'TE') {
      if (playType.startsWith('run')) {
        return 'blocking';
      }
      return 'catching';
    }
    if (['LT', 'LG', 'C', 'RG', 'RT'].includes(position)) {
      if (playType.startsWith('run')) {
        return 'runBlock';
      }
      return 'passBlock';
    }
  } else {
    // Defensive skills by position
    if (['DE', 'DT'].includes(position)) {
      if (playType.startsWith('run')) {
        return 'runDefense';
      }
      return 'passRush';
    }
    if (['OLB', 'ILB'].includes(position)) {
      return 'tackling';
    }
    if (['CB', 'FS', 'SS'].includes(position)) {
      return 'manCoverage';
    }
  }

  // Default
  return Object.keys(player.skills)[0] || 'awareness';
}

/**
 * Calculate effective ratings for players involved in a play
 */
function calculatePlayersEffective(
  players: Player[],
  teamState: TeamGameState,
  playType: PlayType,
  weather: WeatherCondition,
  stakes: GameStakes,
  isOffense: boolean
): PlayerWithEffective[] {
  return players.map((player) => {
    const skill = getRelevantSkill(player, playType, isOffense);
    const variance = getPlayerWeeklyVariance(teamState, player.id);
    const coach = getPositionCoach(teamState, player.position);

    // Determine scheme
    const scheme = isOffense ? teamState.offensiveScheme : teamState.defensiveScheme;

    // Get current role (simplified - use currentRole from player)
    const role: RoleType = player.roleFit.currentRole;

    const effective = calculateEffectiveRating({
      player,
      skill,
      positionCoach: coach,
      teamScheme: scheme,
      assignedRole: role,
      weather,
      gameStakes: stakes,
      weeklyVariance: variance,
    });

    return { player, effective };
  });
}

/**
 * Process injuries for players involved in play
 */
function processInjuries(
  players: Player[],
  teamState: TeamGameState,
  playType: PlayType,
  outcome: PlayOutcome,
  hadBigHit: boolean,
  weather: WeatherCondition
): { injured: boolean; playerId: string | null; result: InjuryResult } {
  for (const player of players) {
    const fatigue = getPlayerFatigue(teamState, player.id);

    const injuryResult = checkForInjury({
      player,
      playType,
      outcome,
      hadBigHit,
      currentFatigue: fatigue,
      weather,
    });

    if (injuryResult.occurred) {
      return {
        injured: true,
        playerId: player.id,
        result: injuryResult,
      };
    }
  }

  return {
    injured: false,
    playerId: null,
    result: createNoInjuryResult(),
  };
}

/**
 * Update fatigue for players involved in play
 */
function updatePlayFatigue(
  players: Player[],
  teamState: TeamGameState,
  playType: PlayType,
  outcome: PlayOutcome,
  weather: WeatherCondition
): void {
  const intensity = determinePlayIntensity(playType, outcome);

  for (const player of players) {
    const currentFatigue = getPlayerFatigue(teamState, player.id);
    const snapCount = getSnapCount(teamState, player.id);

    const fatigueIncrease = calculateFatigueIncrease({
      player,
      currentFatigue,
      snapCount,
      weather,
      playIntensity: intensity,
    });

    // Apply fatigue increase then between-play recovery
    let newFatigue = currentFatigue + fatigueIncrease;
    newFatigue = calculateBetweenPlayRecovery(newFatigue);

    updatePlayerFatigue(teamState, player.id, newFatigue);
    incrementSnapCount(teamState, player.id);
  }
}

/**
 * Get primary players for display
 */
function getPrimaryPlayers(
  offensivePlayers: PlayerWithEffective[],
  defensivePlayers: PlayerWithEffective[],
  playType: PlayType
): { offensive: string; defensive: string | null } {
  // For run plays, RB is primary
  if (playType.startsWith('run') || playType === 'qb_sneak' || playType === 'qb_scramble') {
    const rb = offensivePlayers.find((p) => p.player.position === 'RB');
    const qb = offensivePlayers.find((p) => p.player.position === 'QB');
    const tackler = defensivePlayers.length > 0 ? defensivePlayers[0] : null;

    return {
      offensive: (playType === 'qb_sneak' || playType === 'qb_scramble' ? qb?.player.id : rb?.player.id) || offensivePlayers[0]?.player.id || '',
      defensive: tackler?.player.id || null,
    };
  }

  // For pass plays, QB is primary offensive, receiver/defender are secondary
  const qb = offensivePlayers.find((p) => p.player.position === 'QB');
  const receiver = offensivePlayers.find((p) =>
    ['WR', 'TE', 'RB'].includes(p.player.position)
  );
  const defender = defensivePlayers.find((p) =>
    ['CB', 'FS', 'SS', 'OLB', 'ILB'].includes(p.player.position)
  );

  return {
    offensive: qb?.player.id || offensivePlayers[0]?.player.id || '',
    defensive: receiver?.player.id || defender?.player.id || null,
  };
}

/**
 * Resolve a single play
 *
 * @param offensiveTeam - Offensive team game state
 * @param defensiveTeam - Defensive team game state
 * @param playCall - The offensive and defensive play calls
 * @param context - Play call context (down, distance, etc.)
 * @param weeklyVariances - Pre-calculated weekly variances
 * @returns The result of the play
 */
export function resolvePlay(
  offensiveTeam: TeamGameState,
  defensiveTeam: TeamGameState,
  playCall: { offensive: OffensivePlayCall; defensive: DefensivePlayCall },
  context: PlayCallContext
): PlayResult {
  const { playType } = playCall.offensive;

  // Determine stakes
  const stakes: GameStakes =
    context.quarter === 4 && Math.abs(context.scoreDifferential) <= 7
      ? 'playoff'
      : 'regular';

  // Get players involved in the play
  const offensivePlayers = getPlayersForPlayType(offensiveTeam, true, playType);
  const defensivePlayers = getPlayersForPlayType(defensiveTeam, false, playType);

  // Calculate effective ratings for all players
  const offensiveEffectives = calculatePlayersEffective(
    offensivePlayers,
    offensiveTeam,
    playType,
    context.weather,
    stakes,
    true
  );
  const defensiveEffectives = calculatePlayersEffective(
    defensivePlayers,
    defensiveTeam,
    playType,
    context.weather,
    stakes,
    false
  );

  // Resolve the matchup (result used implicitly through player ratings)
  resolvePlayMatchup(offensiveEffectives, defensiveEffectives, playType);

  // Calculate average ratings for outcome table
  const avgOffRating =
    offensiveEffectives.reduce((sum, p) => sum + p.effective, 0) /
    (offensiveEffectives.length || 1);
  const avgDefRating =
    defensiveEffectives.reduce((sum, p) => sum + p.effective, 0) /
    (defensiveEffectives.length || 1);

  // Generate outcome table and roll
  const situation = {
    down: context.down as 1 | 2 | 3 | 4,
    yardsToGo: context.distance,
    yardsToEndzone: 100 - context.fieldPosition,
  };

  const outcomeTable = generateOutcomeTable(
    avgOffRating,
    avgDefRating,
    playType,
    situation,
    context.fieldPosition
  );

  const roll = rollOutcome(outcomeTable);

  // Check for secondary effects
  const hadBigHit = roll.secondaryEffects.includes('big_hit');
  const shouldCheckInjury = roll.secondaryEffects.includes('injury_check');

  // Process injuries if needed
  let injuryInfo = { injured: false, playerId: null as string | null, result: createNoInjuryResult() };
  if (shouldCheckInjury) {
    // Check offensive players first
    injuryInfo = processInjuries(
      offensivePlayers,
      offensiveTeam,
      playType,
      roll.outcome,
      hadBigHit,
      context.weather
    );

    // If no offensive injury, check defensive
    if (!injuryInfo.injured) {
      injuryInfo = processInjuries(
        defensivePlayers,
        defensiveTeam,
        playType,
        roll.outcome,
        hadBigHit,
        context.weather
      );
    }
  }

  // Update fatigue
  updatePlayFatigue(offensivePlayers, offensiveTeam, playType, roll.outcome, context.weather);
  updatePlayFatigue(defensivePlayers, defensiveTeam, playType, roll.outcome, context.weather);

  // Calculate new game state
  let yardsGained = roll.yards;
  const turnover =
    roll.outcome === 'interception' || roll.outcome === 'fumble_lost';
  const touchdown =
    roll.outcome === 'touchdown' ||
    (yardsGained > 0 && context.fieldPosition + yardsGained >= 100);

  // Adjust yards for touchdown
  if (touchdown && roll.outcome !== 'touchdown') {
    yardsGained = 100 - context.fieldPosition;
  }

  // Calculate new field position
  let newFieldPosition = context.fieldPosition + yardsGained;
  if (turnover) {
    // Turnover changes possession - flip field position
    newFieldPosition = 100 - newFieldPosition;
  }
  newFieldPosition = Math.max(1, Math.min(99, newFieldPosition));

  // Calculate new down and distance
  let newDown = context.down + 1;
  let newDistance = context.distance - yardsGained;
  let firstDown = false;

  if (yardsGained >= context.distance && !turnover) {
    // First down
    newDown = 1;
    newDistance = 10;
    firstDown = true;
  } else if (turnover || touchdown) {
    // Reset for new possession or score
    newDown = 1;
    newDistance = 10;
  } else if (newDown > 4) {
    // Turnover on downs
    newDown = 1;
    newDistance = 10;
    newFieldPosition = 100 - context.fieldPosition;
  }

  // Handle penalties
  let penaltyOccurred = false;
  let penaltyDetails: PenaltyDetails | null = null;

  if (roll.outcome === 'penalty_offense' || roll.outcome === 'penalty_defense') {
    penaltyOccurred = true;
    const team = roll.outcome === 'penalty_offense' ? 'offense' : 'defense';
    const penalty = selectPenalty(team);

    penaltyDetails = {
      team,
      type: penalty.type,
      yards: penalty.yards,
      playerId: team === 'offense'
        ? offensivePlayers[Math.floor(Math.random() * offensivePlayers.length)]?.id || null
        : defensivePlayers[Math.floor(Math.random() * defensivePlayers.length)]?.id || null,
      declined: false,
    };

    // Apply penalty yards
    if (team === 'offense') {
      yardsGained = -penalty.yards;
      newFieldPosition = Math.max(1, context.fieldPosition - penalty.yards);
    } else {
      // Defensive penalty - automatic first down on most
      yardsGained = penalty.yards;
      newFieldPosition = Math.min(99, context.fieldPosition + penalty.yards);
      if (['Pass Interference', 'Defensive Holding', 'Roughing the Passer'].includes(penalty.type)) {
        newDown = 1;
        newDistance = 10;
        firstDown = true;
      }
    }
  }

  // Get primary players for description
  const primaryPlayers = getPrimaryPlayers(offensiveEffectives, defensiveEffectives, playType);

  // Build all players map for description
  const allPlayers = new Map<string, Player>();
  offensivePlayers.forEach((p) => allPlayers.set(p.id, p));
  defensivePlayers.forEach((p) => allPlayers.set(p.id, p));

  // Generate description
  const descResult: PlayResultForDescription = {
    playType,
    outcome: roll.outcome,
    yardsGained,
    primaryOffensivePlayer: primaryPlayers.offensive,
    primaryDefensivePlayer: primaryPlayers.defensive,
    turnover,
    touchdown,
    firstDown,
    penaltyOccurred,
    penaltyDetails,
  };

  const description = generatePlayDescription(descResult, allPlayers);

  return {
    playType,
    outcome: roll.outcome,
    yardsGained,
    primaryOffensivePlayer: primaryPlayers.offensive,
    primaryDefensivePlayer: primaryPlayers.defensive,
    newDown,
    newDistance,
    newFieldPosition,
    turnover,
    touchdown,
    firstDown,
    injuryOccurred: injuryInfo.injured,
    injuredPlayerId: injuryInfo.playerId,
    penaltyOccurred,
    penaltyDetails,
    description,
  };
}

/**
 * Resolve a special teams play (kickoff, punt, field goal)
 */
export function resolveSpecialTeamsPlay(
  kickingTeam: TeamGameState,
  receivingTeam: TeamGameState,
  playType: 'kickoff' | 'punt' | 'field_goal',
  context: PlayCallContext
): PlayResult {
  // Simplified special teams resolution
  const kicker = kickingTeam.specialTeams.k;
  const returner = receivingTeam.specialTeams.returner;

  // Build players map
  const allPlayers = new Map<string, Player>();
  allPlayers.set(kicker.id, kicker);
  allPlayers.set(returner.id, returner);

  if (playType === 'field_goal') {
    // Calculate field goal distance
    const distance = 100 - context.fieldPosition + 17;

    // Get kicker rating
    const kickerVariance = getPlayerWeeklyVariance(kickingTeam, kicker.id);
    const kickerEffective = calculateEffectiveRating({
      player: kicker,
      skill: 'kickAccuracy',
      positionCoach: null,
      teamScheme: kickingTeam.offensiveScheme,
      assignedRole: kicker.roleFit.currentRole,
      weather: context.weather,
      gameStakes: 'regular',
      weeklyVariance: kickerVariance,
    });

    // Simple field goal probability
    let probability = 0.95;
    if (distance > 30) probability -= (distance - 30) * 0.015;
    if (distance > 45) probability -= (distance - 45) * 0.02;
    probability += (kickerEffective - 70) / 200;
    probability = Math.max(0.1, Math.min(0.99, probability));

    // Weather effects
    if (context.weather.wind > 15) probability -= 0.1;
    if (context.weather.precipitation !== 'none') probability -= 0.05;

    const made = Math.random() < probability;

    return {
      playType: 'field_goal',
      outcome: made ? 'field_goal_made' : 'field_goal_missed',
      yardsGained: 0,
      primaryOffensivePlayer: kicker.id,
      primaryDefensivePlayer: null,
      newDown: 1,
      newDistance: 10,
      newFieldPosition: made ? 25 : Math.min(80, 100 - context.fieldPosition + 7),
      turnover: !made,
      touchdown: false,
      firstDown: false,
      injuryOccurred: false,
      injuredPlayerId: null,
      penaltyOccurred: false,
      penaltyDetails: null,
      description: made
        ? `${distance}-yard field goal is GOOD!`
        : `${distance}-yard field goal attempt NO GOOD`,
    };
  }

  if (playType === 'punt') {
    // Punt distance based on punter rating
    const basePuntDistance = 42 + Math.floor(Math.random() * 12);
    const puntDistance = Math.min(basePuntDistance, 100 - context.fieldPosition - 10);

    // Return yards
    const returnYards = Math.floor(Math.random() * 15);

    const newPosition = 100 - (context.fieldPosition + puntDistance - returnYards);

    return {
      playType: 'punt',
      outcome: 'good_gain', // Punt doesn't have specific outcome
      yardsGained: puntDistance - returnYards,
      primaryOffensivePlayer: kickingTeam.specialTeams.p.id,
      primaryDefensivePlayer: returner.id,
      newDown: 1,
      newDistance: 10,
      newFieldPosition: Math.max(1, Math.min(99, newPosition)),
      turnover: true, // Possession change
      touchdown: false,
      firstDown: false,
      injuryOccurred: false,
      injuredPlayerId: null,
      penaltyOccurred: false,
      penaltyDetails: null,
      description: `Punt for ${puntDistance} yards, returned for ${returnYards} yards`,
    };
  }

  // Kickoff
  const returnYards = 20 + Math.floor(Math.random() * 15);

  return {
    playType: 'kickoff',
    outcome: 'good_gain',
    yardsGained: returnYards,
    primaryOffensivePlayer: kicker.id,
    primaryDefensivePlayer: returner.id,
    newDown: 1,
    newDistance: 10,
    newFieldPosition: 25 + returnYards - 5,
    turnover: true,
    touchdown: false,
    firstDown: false,
    injuryOccurred: false,
    injuredPlayerId: null,
    penaltyOccurred: false,
    penaltyDetails: null,
    description: `Kickoff returned to the ${25 + returnYards - 5} yard line`,
  };
}
