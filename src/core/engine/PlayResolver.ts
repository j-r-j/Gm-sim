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
  getActiveOffensivePlayers,
  getActiveDefensivePlayers,
  swapActivePlayer,
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
  selectFatigueSubstitute,
} from './FatigueSystem';
import { generatePlayDescription, PlayResultForDescription } from './PlayDescriptionGenerator';
import { Player } from '../models/player/Player';
import { RoleType } from '../models/player/RoleFit';
import {
  selectPassTarget,
  selectRunningBack,
  selectPrimaryTackler,
  TargetSituationContext,
  RBRotationContext,
  TackleContext,
} from './StatDistribution';

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

  // Safety
  safety: boolean;

  // Fatigue substitutions made before this play
  substitutions?: { outId: string; inId: string; position: string }[];

  // Key matchup result from MatchupResolver
  keyMatchup?: { offensePlayer: string; defensePlayer: string; winner: string };

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
  weather: WeatherCondition,
  fatigueMultiplier: number = 1.0
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

    // Apply fatigue increase (reduced by game plan conditioning) then between-play recovery
    let newFatigue = currentFatigue + fatigueIncrease * fatigueMultiplier;
    newFatigue = calculateBetweenPlayRecovery(newFatigue);

    updatePlayerFatigue(teamState, player.id, newFatigue);
    incrementSnapCount(teamState, player.id);
  }
}

/**
 * Get primary players for display using weighted stat distribution
 * This is the key function that determines who gets credited with the play
 */
function getPrimaryPlayers(
  offensivePlayers: PlayerWithEffective[],
  defensivePlayers: PlayerWithEffective[],
  playType: PlayType,
  targetPosition: string,
  context: PlayCallContext,
  offensiveTeam: TeamGameState,
  defensiveTeam: TeamGameState,
  yardsGained: number,
  outcome: string
): { offensive: string; defensive: string | null; receiver: string | null } {
  const qb = offensivePlayers.find((p) => p.player.position === 'QB');

  // For run plays - use weighted RB selection
  if (playType.startsWith('run') || playType === 'qb_sneak' || playType === 'qb_scramble') {
    let ballCarrier: Player | null = null;

    if (playType === 'qb_sneak' || playType === 'qb_scramble') {
      ballCarrier = qb?.player ?? null;
    } else {
      // Get all RBs and use weighted selection based on fatigue
      const runningBacks = offensivePlayers
        .filter((p) => p.player.position === 'RB')
        .map((p) => p.player);

      const rbContext: RBRotationContext = {
        currentGameCarries: offensiveTeam.snapCounts.get(runningBacks[0]?.id ?? '') ?? 0,
        currentGameSnaps: offensiveTeam.snapCounts.get(runningBacks[0]?.id ?? '') ?? 0,
        down: context.down,
        distance: context.distance,
        isRedZone: context.isRedZone,
        isGoalLine: context.fieldPosition >= 95,
        isTwoMinuteDrill: context.isTwoMinuteWarning,
      };

      ballCarrier = selectRunningBack(runningBacks, offensiveTeam, rbContext);
    }

    // Select tackler using weighted distribution based on play result
    const defenders = defensivePlayers.map((p) => p.player);
    const tackleContext: TackleContext = {
      playType,
      yardsGained,
      outcome,
    };

    const tackler = selectPrimaryTackler(defenders, tackleContext, defensiveTeam);

    return {
      offensive: ballCarrier?.id || offensivePlayers[0]?.player.id || '',
      defensive: tackler?.id || null,
      receiver: null,
    };
  }

  // For pass plays - use weighted target selection
  const receivers = offensivePlayers
    .filter((p) => ['WR', 'TE', 'RB'].includes(p.player.position))
    .map((p) => p.player);

  const targetSituation: TargetSituationContext = {
    down: context.down,
    distance: context.distance,
    isRedZone: context.isRedZone,
    isTwoMinuteDrill: context.isTwoMinuteWarning,
    scoreDifferential: context.scoreDifferential,
  };

  // Use the targetPosition hint to weight selection, but still use weighted random
  // This creates realistic distribution while respecting play design
  const selectedReceiver = selectPassTarget(receivers, playType, targetSituation, offensiveTeam);

  // Select tackler/defender based on outcome
  const defenders = defensivePlayers.map((p) => p.player);
  const tackleContext: TackleContext = {
    playType,
    yardsGained,
    outcome,
  };

  const tackler = selectPrimaryTackler(defenders, tackleContext, defensiveTeam);

  return {
    offensive: qb?.player.id || offensivePlayers[0]?.player.id || '',
    defensive: tackler?.id || null,
    receiver: selectedReceiver?.id || receivers[0]?.id || null,
  };
}

/**
 * Get a relevant player name for safety description
 */
function getRelevantPlayerName(
  offensivePlayers: Player[],
  playType: PlayType,
  outcome: PlayOutcome
): string {
  if (outcome === 'sack' || playType.includes('pass')) {
    const qb = offensivePlayers.find((p) => p.position === 'QB');
    if (qb) return `${qb.firstName.charAt(0)}. ${qb.lastName}`;
  }
  const rb = offensivePlayers.find((p) => p.position === 'RB');
  if (rb) return `${rb.firstName.charAt(0)}. ${rb.lastName}`;
  return 'Ball carrier';
}

/**
 * Home field context for play resolution
 */
export interface HomeFieldContext {
  isOffenseHome: boolean;
  homeFieldAdvantage: number; // Points equivalent (typically 2.5-3.5)
}

/**
 * Game plan modifiers applied to play resolution
 */
export interface GamePlanPlayModifiers {
  passOffenseBonus?: number;
  rushOffenseBonus?: number;
  passDefenseBonus?: number;
  rushDefenseBonus?: number;
  fatigueReduction?: number; // 0-1 multiplier (e.g. 0.85 means 15% less fatigue)
}

/**
 * Resolve a single play
 *
 * @param offensiveTeam - Offensive team game state
 * @param defensiveTeam - Defensive team game state
 * @param playCall - The offensive and defensive play calls
 * @param context - Play call context (down, distance, etc.)
 * @param homeFieldContext - Optional home field advantage context
 * @param gamePlanModifiers - Optional game plan modifiers from weekly practice focus
 * @returns The result of the play
 */
export function resolvePlay(
  offensiveTeam: TeamGameState,
  defensiveTeam: TeamGameState,
  playCall: { offensive: OffensivePlayCall; defensive: DefensivePlayCall },
  context: PlayCallContext,
  homeFieldContext?: HomeFieldContext,
  gamePlanModifiers?: GamePlanPlayModifiers
): PlayResult {
  const { playType, targetPosition } = playCall.offensive;

  // Determine stakes
  const stakes: GameStakes =
    context.quarter === 4 && Math.abs(context.scoreDifferential) <= 7 ? 'playoff' : 'regular';

  // Get players involved in the play
  const offensivePlayers = getPlayersForPlayType(offensiveTeam, true, playType);
  const defensivePlayers = getPlayersForPlayType(defensiveTeam, false, playType);

  // --- Fatigue substitutions ---
  const substitutions: { outId: string; inId: string; position: string }[] = [];

  const allActiveOffIds = getActiveOffensivePlayers(offensiveTeam.offense).map((p) => p.id);
  const allActiveDefIds = getActiveDefensivePlayers(defensiveTeam.defense).map((p) => p.id);

  for (const player of offensivePlayers) {
    const sub = selectFatigueSubstitute(offensiveTeam.allPlayers, allActiveOffIds, player);
    if (sub) {
      swapActivePlayer(offensiveTeam, player.id, sub.id, 'offense');
      substitutions.push({ outId: player.id, inId: sub.id, position: player.position });
      // Replace player in the local array so effective ratings use the sub
      const idx = offensivePlayers.indexOf(player);
      if (idx !== -1) offensivePlayers[idx] = sub;
    }
  }

  for (const player of defensivePlayers) {
    const sub = selectFatigueSubstitute(defensiveTeam.allPlayers, allActiveDefIds, player);
    if (sub) {
      swapActivePlayer(defensiveTeam, player.id, sub.id, 'defense');
      substitutions.push({ outId: player.id, inId: sub.id, position: player.position });
      const idx = defensivePlayers.indexOf(player);
      if (idx !== -1) defensivePlayers[idx] = sub;
    }
  }

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

  // Resolve the matchup and capture the result
  const matchupResult = resolvePlayMatchup(offensiveEffectives, defensiveEffectives, playType);

  // Calculate average ratings for outcome table
  let avgOffRating =
    offensiveEffectives.reduce((sum, p) => sum + p.effective, 0) /
    (offensiveEffectives.length || 1);
  let avgDefRating =
    defensiveEffectives.reduce((sum, p) => sum + p.effective, 0) /
    (defensiveEffectives.length || 1);

  // Apply matchup margin as a shift to offensive rating
  // Positive margin when offense wins matchup, negative when defense wins
  const signedMargin =
    matchupResult.overallWinner === 'offense'
      ? matchupResult.aggregateMargin
      : -matchupResult.aggregateMargin;
  avgOffRating += signedMargin * 0.3;

  // Apply home field advantage (converted from points to rating boost)
  // 2.5 point advantage = ~5 rating point boost (2 rating points per point)
  if (homeFieldContext) {
    const ratingBoost = homeFieldContext.homeFieldAdvantage * 2;
    if (homeFieldContext.isOffenseHome) {
      avgOffRating += ratingBoost;
    } else {
      avgDefRating += ratingBoost;
    }
  }

  // Apply game plan modifiers from weekly practice focus
  if (gamePlanModifiers) {
    const isPassPlay =
      playType.includes('pass') || playType.includes('action') || playType === 'qb_scramble';
    if (isPassPlay && gamePlanModifiers.passOffenseBonus) {
      avgOffRating += gamePlanModifiers.passOffenseBonus;
    }
    if (!isPassPlay && gamePlanModifiers.rushOffenseBonus) {
      avgOffRating += gamePlanModifiers.rushOffenseBonus;
    }
    if (isPassPlay && gamePlanModifiers.passDefenseBonus) {
      avgDefRating += gamePlanModifiers.passDefenseBonus;
    }
    if (!isPassPlay && gamePlanModifiers.rushDefenseBonus) {
      avgDefRating += gamePlanModifiers.rushDefenseBonus;
    }
  }

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

  const roll = rollOutcome(outcomeTable, signedMargin);

  // Check for secondary effects
  const hadBigHit = roll.secondaryEffects.includes('big_hit');
  const shouldCheckInjury = roll.secondaryEffects.includes('injury_check');

  // Process injuries if needed
  let injuryInfo = {
    injured: false,
    playerId: null as string | null,
    result: createNoInjuryResult(),
  };
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

  // Update fatigue (apply conditioning reduction from game plan if present)
  const fatigueMult = gamePlanModifiers?.fatigueReduction ?? 1.0;
  updatePlayFatigue(
    offensivePlayers,
    offensiveTeam,
    playType,
    roll.outcome,
    context.weather,
    fatigueMult
  );
  updatePlayFatigue(
    defensivePlayers,
    defensiveTeam,
    playType,
    roll.outcome,
    context.weather,
    fatigueMult
  );

  // Calculate new game state
  let yardsGained = roll.yards;
  const turnover = roll.outcome === 'interception' || roll.outcome === 'fumble_lost';

  // Only explicit touchdown outcomes count as touchdowns
  // Big gains that would reach the endzone are capped at the 1-yard line instead
  let touchdown = roll.outcome === 'touchdown';

  // Safety check: sack or loss near own end zone
  let safety = false;
  if (!turnover && !touchdown && yardsGained < 0) {
    const newPos = context.fieldPosition + yardsGained;
    if (newPos <= 0) {
      // Ball pushed behind own end zone
      const isSack = roll.outcome === 'sack';
      // ~3% base chance on runs, ~5% on sacks when inside 5-yard line
      if (context.fieldPosition <= 5) {
        const safetyChance = isSack ? 0.05 : 0.03;
        if (Math.random() < safetyChance) {
          safety = true;
        }
      }
      // If pushed all the way back (field position would be 0 or less), always a safety
      if (newPos <= 0) {
        safety = true;
      }
    }
  }

  // Cap non-touchdown gains at the 1-yard line
  if (!touchdown && yardsGained > 0 && context.fieldPosition + yardsGained >= 100) {
    yardsGained = 99 - context.fieldPosition; // Stop at the 1-yard line
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
      playerId:
        team === 'offense'
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
      if (
        ['Pass Interference', 'Defensive Holding', 'Roughing the Passer'].includes(penalty.type)
      ) {
        newDown = 1;
        newDistance = 10;
        firstDown = true;
      }
    }
  }

  // Get primary players for description using weighted stat distribution
  const primaryPlayers = getPrimaryPlayers(
    offensiveEffectives,
    defensiveEffectives,
    playType,
    targetPosition,
    context,
    offensiveTeam,
    defensiveTeam,
    yardsGained,
    roll.outcome
  );

  // Build all players map for description
  const allPlayers = new Map<string, Player>();
  offensivePlayers.forEach((p) => allPlayers.set(p.id, p));
  defensivePlayers.forEach((p) => allPlayers.set(p.id, p));

  // For pass plays:
  // - primaryOffensivePlayer = QB (StatisticsTracker credits passing stats here)
  // - primaryDefensivePlayer = receiver (StatisticsTracker credits receiving stats here)
  // For run plays:
  // - primaryOffensivePlayer = ball carrier
  // - primaryDefensivePlayer = tackler
  const isPassPlay =
    !playType.startsWith('run') && playType !== 'qb_sneak' && primaryPlayers.receiver;
  const primaryOffensivePlayerId = primaryPlayers.offensive;
  const primaryDefensivePlayerId = isPassPlay
    ? primaryPlayers.receiver // Receiver for pass plays (StatisticsTracker expects this)
    : primaryPlayers.defensive; // Tackler for run plays

  // Generate description
  const descResult: PlayResultForDescription = {
    playType,
    outcome: roll.outcome,
    yardsGained,
    primaryOffensivePlayer: primaryOffensivePlayerId,
    primaryDefensivePlayer: primaryDefensivePlayerId,
    turnover,
    touchdown,
    firstDown,
    penaltyOccurred,
    penaltyDetails,
  };

  const description = generatePlayDescription(descResult, allPlayers);

  // Override description for safety
  const finalDescription = safety
    ? `SAFETY! ${getRelevantPlayerName(offensivePlayers, playType, roll.outcome)} tackled in the end zone`
    : description;

  return {
    playType,
    outcome: roll.outcome,
    yardsGained,
    primaryOffensivePlayer: primaryOffensivePlayerId,
    primaryDefensivePlayer: primaryDefensivePlayerId,
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
    safety,
    substitutions: substitutions.length > 0 ? substitutions : undefined,
    keyMatchup:
      matchupResult.keyMatchup.offense !== 'Unknown'
        ? {
            offensePlayer: matchupResult.keyMatchup.offense,
            defensePlayer: matchupResult.keyMatchup.defense,
            winner:
              matchupResult.overallWinner === 'offense'
                ? matchupResult.keyMatchup.offense
                : matchupResult.keyMatchup.defense,
          }
        : undefined,
    description: finalDescription,
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

    // Blocked kick check (~2% chance)
    if (Math.random() < 0.02) {
      // Blocked FG - returned for TD ~10% of blocks
      const returnedForTD = Math.random() < 0.1;
      if (returnedForTD) {
        return {
          playType: 'field_goal',
          outcome: 'field_goal_missed',
          yardsGained: 0,
          primaryOffensivePlayer: kicker.id,
          primaryDefensivePlayer: returner.id,
          newDown: 1,
          newDistance: 10,
          newFieldPosition: 25, // Kickoff position after TD
          turnover: true,
          touchdown: true,
          firstDown: false,
          injuryOccurred: false,
          injuredPlayerId: null,
          penaltyOccurred: false,
          penaltyDetails: null,
          safety: false,
          description: `${distance}-yard field goal BLOCKED and returned for a TOUCHDOWN!`,
        };
      }
      // Blocked, defense recovers at line of scrimmage
      const losPosition = Math.min(80, 100 - context.fieldPosition + 7);
      return {
        playType: 'field_goal',
        outcome: 'field_goal_missed',
        yardsGained: 0,
        primaryOffensivePlayer: kicker.id,
        primaryDefensivePlayer: null,
        newDown: 1,
        newDistance: 10,
        newFieldPosition: losPosition,
        turnover: true,
        touchdown: false,
        firstDown: false,
        injuryOccurred: false,
        injuredPlayerId: null,
        penaltyOccurred: false,
        penaltyDetails: null,
        safety: false,
        description: `${distance}-yard field goal BLOCKED! Defense recovers.`,
      };
    }

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
      safety: false,
      description: made
        ? `${distance}-yard field goal is GOOD!`
        : `${distance}-yard field goal attempt NO GOOD`,
    };
  }

  if (playType === 'punt') {
    // Blocked punt check (~1% chance)
    if (Math.random() < 0.01) {
      // Blocked punt - returned for TD ~15% of blocks
      const returnedForTD = Math.random() < 0.15;
      if (returnedForTD) {
        return {
          playType: 'punt',
          outcome: 'good_gain',
          yardsGained: 0,
          primaryOffensivePlayer: kickingTeam.specialTeams.p.id,
          primaryDefensivePlayer: returner.id,
          newDown: 1,
          newDistance: 10,
          newFieldPosition: 25,
          turnover: true,
          touchdown: true,
          firstDown: false,
          injuryOccurred: false,
          injuredPlayerId: null,
          penaltyOccurred: false,
          penaltyDetails: null,
          safety: false,
          description: 'Punt BLOCKED and returned for a TOUCHDOWN!',
        };
      }
      // Blocked, defense recovers at spot
      const blockPosition = 100 - context.fieldPosition;
      return {
        playType: 'punt',
        outcome: 'good_gain',
        yardsGained: 0,
        primaryOffensivePlayer: kickingTeam.specialTeams.p.id,
        primaryDefensivePlayer: returner.id,
        newDown: 1,
        newDistance: 10,
        newFieldPosition: Math.max(1, Math.min(99, blockPosition)),
        turnover: true,
        touchdown: false,
        firstDown: false,
        injuryOccurred: false,
        injuredPlayerId: null,
        penaltyOccurred: false,
        penaltyDetails: null,
        safety: false,
        description: 'Punt BLOCKED! Defense recovers.',
      };
    }

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
      safety: false,
      description: `Punt for ${puntDistance} yards, returned for ${returnYards} yards`,
    };
  }

  // Kickoff - check for onside kick attempt
  // Onside kick: trailing by 1-16 points with < 5 minutes left in 4th quarter
  const shouldOnsideKick =
    context.quarter === 4 &&
    context.timeRemaining < 300 &&
    context.scoreDifferential < 0 &&
    context.scoreDifferential >= -16;

  if (shouldOnsideKick) {
    // Onside kick attempt - ~10% recovery rate
    const recovered = Math.random() < 0.1;
    const recoverySpot = 45 + Math.floor(Math.random() * 10); // ~own 45-55

    if (recovered) {
      return {
        playType: 'kickoff',
        outcome: 'good_gain',
        yardsGained: 0,
        primaryOffensivePlayer: kicker.id,
        primaryDefensivePlayer: returner.id,
        newDown: 1,
        newDistance: 10,
        newFieldPosition: recoverySpot,
        turnover: false, // Kicking team recovers, no possession change
        touchdown: false,
        firstDown: false,
        injuryOccurred: false,
        injuredPlayerId: null,
        penaltyOccurred: false,
        penaltyDetails: null,
        safety: false,
        description: `Onside kick RECOVERED by the kicking team at the ${recoverySpot}!`,
      };
    }

    // Not recovered - receiving team gets good field position
    return {
      playType: 'kickoff',
      outcome: 'good_gain',
      yardsGained: 0,
      primaryOffensivePlayer: kicker.id,
      primaryDefensivePlayer: returner.id,
      newDown: 1,
      newDistance: 10,
      newFieldPosition: 100 - recoverySpot, // Good position for receiving team
      turnover: true,
      touchdown: false,
      firstDown: false,
      injuryOccurred: false,
      injuredPlayerId: null,
      penaltyOccurred: false,
      penaltyDetails: null,
      safety: false,
      description: `Onside kick attempt fails. Receiving team takes over at the ${100 - recoverySpot}.`,
    };
  }

  // Normal kickoff - 55% touchback chance (NFL average)
  if (Math.random() < 0.55) {
    return {
      playType: 'kickoff',
      outcome: 'good_gain',
      yardsGained: 0,
      primaryOffensivePlayer: kicker.id,
      primaryDefensivePlayer: returner.id,
      newDown: 1,
      newDistance: 10,
      newFieldPosition: 25,
      turnover: true,
      touchdown: false,
      firstDown: false,
      injuryOccurred: false,
      injuredPlayerId: null,
      penaltyOccurred: false,
      penaltyDetails: null,
      safety: false,
      description: 'Touchback. Ball at the 25-yard line.',
    };
  }

  // Kickoff return - average starting position ~22-27
  const returnYards = 15 + Math.floor(Math.random() * 11);
  const startPosition = 7 + returnYards;

  return {
    playType: 'kickoff',
    outcome: 'good_gain',
    yardsGained: returnYards,
    primaryOffensivePlayer: kicker.id,
    primaryDefensivePlayer: returner.id,
    newDown: 1,
    newDistance: 10,
    newFieldPosition: startPosition,
    turnover: true,
    touchdown: false,
    firstDown: false,
    injuryOccurred: false,
    injuredPlayerId: null,
    penaltyOccurred: false,
    penaltyDetails: null,
    safety: false,
    description: `Kickoff returned to the ${startPosition} yard line`,
  };
}
