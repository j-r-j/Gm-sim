/**
 * Enhanced Play Resolver
 * Integrates all new simulation systems:
 * - Team Composite Ratings with weak link detection
 * - Personnel Packages with mismatches
 * - Gradient Scheme Matchup Effects
 * - Play-Action Effectiveness based on run game
 * - Pass Rush Phases
 * - Presnap Reads and Audibles
 * - Enhanced Situational Modifiers
 * - Non-linear Fatigue Curves
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
import { PlayerWithEffective } from './MatchupResolver';
import { checkForInjury, createNoInjuryResult } from './InjuryProcessor';
import {
  calculateFatigueIncrease,
  determinePlayIntensity,
  calculateBetweenPlayRecovery,
} from './FatigueSystem';
import { generatePlayDescription, PlayResultForDescription } from './PlayDescriptionGenerator';
import { Player } from '../models/player/Player';
import { RoleType } from '../models/player/RoleFit';
import { PenaltyDetails, PlayResult } from './PlayResolver';

// New system imports
import {
  calculateTeamCompositeRatings,
  getMatchupAdvantage,
  TeamCompositeRatings,
} from './TeamCompositeRatings';
import {
  selectOffensivePersonnel,
  selectDefensivePersonnel,
  calculatePersonnelMismatch,
  OffensivePersonnelPackage,
  DefensivePersonnelPackage,
} from './PersonnelPackages';
import {
  getSchemeMatchupEffects,
  getPlayTypeEffects,
  applySchemeEffects,
} from './SchemeMatchupEffects';
import {
  RunGameTracker,
  calculatePlayActionEffectiveness,
  getPlayActionModifier,
  PlayActionEffectiveness,
} from './PlayActionEffectiveness';
import {
  getOverallPassRushResult,
  PhaseResult,
} from './PassRushPhases';
import {
  executePresnapRead,
  PresnapReadResult,
} from './PresnapReads';
import {
  determineSituation,
  getSituationalModifier,
  calculatePlayerSituationalModifier,
  SituationContext,
} from './SituationalModifiers';
import {
  calculateFatigueEffectiveness,
  getFatigueInjuryRiskMultiplier,
} from './FatigueCurves';

/**
 * Enhanced play result with additional data
 */
export interface EnhancedPlayResult extends PlayResult {
  // New fields for enhanced simulation
  personnelMatchup: {
    offense: OffensivePersonnelPackage;
    defense: DefensivePersonnelPackage;
    mismatchModifier: number;
  };
  schemeEffect: {
    overallAdvantage: number;
    playTypeModifier: number;
  };
  passRushResult?: PhaseResult;
  presnapRead?: PresnapReadResult;
  playActionBonus: number;
  situationalModifier: number;
  weakLinkExploited: boolean;
}

/**
 * Game state tracker for enhanced simulation
 */
export interface EnhancedGameState {
  offenseRunTracker: RunGameTracker;
  defenseRunTracker: RunGameTracker;
  totalOffensiveSnaps: number;
  totalDefensiveSnaps: number;
  touchCounts: Map<string, number>; // RB touches
}

/**
 * Create initial enhanced game state
 */
export function createEnhancedGameState(): EnhancedGameState {
  return {
    offenseRunTracker: new RunGameTracker(),
    defenseRunTracker: new RunGameTracker(),
    totalOffensiveSnaps: 0,
    totalDefensiveSnaps: 0,
    touchCounts: new Map(),
  };
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

  return Object.keys(player.skills)[0] || 'awareness';
}

/**
 * Calculate effective ratings for players with enhanced modifiers
 */
function calculateEnhancedPlayersEffective(
  players: Player[],
  teamState: TeamGameState,
  playType: PlayType,
  weather: WeatherCondition,
  stakes: GameStakes,
  isOffense: boolean,
  situationContext: SituationContext,
  enhancedState: EnhancedGameState
): PlayerWithEffective[] {
  return players.map((player) => {
    const skill = getRelevantSkill(player, playType, isOffense);
    const variance = getPlayerWeeklyVariance(teamState, player.id);
    const coach = getPositionCoach(teamState, player.position);
    const scheme = isOffense ? teamState.offensiveScheme : teamState.defensiveScheme;
    const role: RoleType = player.roleFit.currentRole;

    // Base effective rating
    let effective = calculateEffectiveRating({
      player,
      skill,
      positionCoach: coach,
      teamScheme: scheme,
      assignedRole: role,
      weather,
      gameStakes: stakes,
      weeklyVariance: variance,
    });

    // Apply situational modifier
    const situationalMod = calculatePlayerSituationalModifier(player, situationContext, skill);
    effective += situationalMod;

    // Apply fatigue curve effectiveness
    const snapCount = getSnapCount(teamState, player.id);
    const touches = enhancedState.touchCounts.get(player.id) || 0;
    const fatigueEffectiveness = calculateFatigueEffectiveness(
      player.position,
      snapCount,
      touches,
      player
    );
    effective *= fatigueEffectiveness;

    // Clamp to valid range
    effective = Math.max(1, Math.min(100, Math.round(effective)));

    return { player, effective };
  });
}

/**
 * Resolve a single play with enhanced simulation
 */
export function resolveEnhancedPlay(
  offensiveTeam: TeamGameState,
  defensiveTeam: TeamGameState,
  playCall: { offensive: OffensivePlayCall; defensive: DefensivePlayCall },
  context: PlayCallContext,
  enhancedState: EnhancedGameState
): EnhancedPlayResult {
  let { playType } = playCall.offensive;

  // Build situation context
  const situationContext: SituationContext = {
    down: context.down,
    distance: context.distance,
    fieldPosition: context.fieldPosition,
    quarter: context.quarter === 'OT' ? 'OT' : context.quarter,
    timeRemaining: context.timeRemaining,
    scoreDifferential: context.scoreDifferential,
    stakes:
      context.quarter === 4 && Math.abs(context.scoreDifferential) <= 7 ? 'playoff' : 'regular',
  };

  const stakes = situationContext.stakes;

  // 1. PERSONNEL PACKAGES
  const offensePersonnel = selectOffensivePersonnel(
    playType,
    context.down,
    context.distance,
    context.fieldPosition
  );
  const defensePersonnel = selectDefensivePersonnel(
    offensePersonnel,
    context.down,
    context.distance,
    context.fieldPosition
  );
  const isRunPlay = playType.startsWith('run') || playType === 'qb_sneak';
  const personnelMismatch = calculatePersonnelMismatch(
    offensePersonnel,
    defensePersonnel,
    isRunPlay
  );

  // 2. SCHEME MATCHUP EFFECTS
  const schemeMatchup = getSchemeMatchupEffects(
    offensiveTeam.offensiveScheme,
    defensiveTeam.defensiveScheme
  );
  const playTypeEffects = getPlayTypeEffects(schemeMatchup, playType);

  // 3. TEAM COMPOSITE RATINGS
  const compositeRatings = calculateTeamCompositeRatings(
    offensiveTeam,
    defensiveTeam,
    context.weather,
    stakes
  );

  // 4. PRESNAP READ (for pass plays)
  let presnapResult: PresnapReadResult | undefined;
  if (playType.includes('pass') || playType.includes('action')) {
    presnapResult = executePresnapRead(
      offensiveTeam.offense.qb,
      playType,
      playCall.defensive,
      context.fieldPosition,
      compositeRatings.offense.passProtection.weakLinkPosition
    );

    // Apply audible if QB changed the play
    if (presnapResult.audibled && presnapResult.newPlayType) {
      playType = presnapResult.newPlayType;
    }
  }

  // 5. PLAY-ACTION EFFECTIVENESS
  let playActionBonus = 0;
  let paEffectiveness: PlayActionEffectiveness | undefined;
  if (playType.includes('action')) {
    const runStats = enhancedState.offenseRunTracker.getStats();
    paEffectiveness = calculatePlayActionEffectiveness(runStats);
    playActionBonus = getPlayActionModifier(
      paEffectiveness,
      playType === 'play_action_deep'
    );
  }

  // 6. PASS RUSH PHASES (for pass plays)
  let passRushResult: PhaseResult | undefined;
  if (playType.includes('pass') || playType.includes('action')) {
    const qbMobility = offensiveTeam.offense.qb.skills.mobility?.trueValue || 50;
    passRushResult = getOverallPassRushResult(
      compositeRatings.offense.passProtection,
      compositeRatings.defense.passRush,
      playType,
      qbMobility,
      playCall.defensive.blitz
    );
  }

  // 7. GET PLAYERS AND CALCULATE EFFECTIVE RATINGS
  const offensivePlayers = getPlayersForPlayType(offensiveTeam, true, playType);
  const defensivePlayers = getPlayersForPlayType(defensiveTeam, false, playType);

  const offensiveEffectives = calculateEnhancedPlayersEffective(
    offensivePlayers,
    offensiveTeam,
    playType,
    context.weather,
    stakes,
    true,
    situationContext,
    enhancedState
  );
  const defensiveEffectives = calculateEnhancedPlayersEffective(
    defensivePlayers,
    defensiveTeam,
    playType,
    context.weather,
    stakes,
    false,
    situationContext,
    enhancedState
  );

  // 8. CALCULATE MATCHUP ADVANTAGE
  const isPassPlay = playType.includes('pass') || playType.includes('action');
  let matchupAdvantage = getMatchupAdvantage(
    compositeRatings.offense,
    compositeRatings.defense,
    isPassPlay
  );

  // Apply all modifiers to matchup advantage
  matchupAdvantage += personnelMismatch.modifier;
  matchupAdvantage += schemeMatchup.overallAdvantage;
  matchupAdvantage += playActionBonus;
  if (presnapResult) {
    matchupAdvantage += presnapResult.effectivenessModifier;
  }
  if (passRushResult) {
    matchupAdvantage += passRushResult.completionModifier;
  }

  // Situational modifier
  const situationalMod = getSituationalModifier(determineSituation(situationContext));
  matchupAdvantage += situationalMod.baseModifier;

  // 9. GENERATE OUTCOME TABLE WITH ALL MODIFIERS
  const situation = {
    down: context.down as 1 | 2 | 3 | 4,
    yardsToGo: context.distance,
    yardsToEndzone: 100 - context.fieldPosition,
  };

  // Calculate average ratings for outcome table
  const avgOffRating =
    offensiveEffectives.reduce((sum, p) => sum + p.effective, 0) /
    (offensiveEffectives.length || 1);
  const avgDefRating =
    defensiveEffectives.reduce((sum, p) => sum + p.effective, 0) /
    (defensiveEffectives.length || 1);

  // Apply scheme effects to base outcomes
  let outcomeTable = generateOutcomeTable(
    avgOffRating + matchupAdvantage / 2,
    avgDefRating - matchupAdvantage / 2,
    playType,
    situation,
    context.fieldPosition
  );

  // 10. ROLL OUTCOME
  const roll = rollOutcome(outcomeTable, matchupAdvantage);

  // 11. CHECK FOR SCRAMBLE (if pass rush forced it)
  if (passRushResult?.canScramble && roll.outcome === 'sack') {
    // QB escapes sack - convert to scramble
    const qbMobility = offensiveTeam.offense.qb.skills.mobility?.trueValue || 50;
    const scrambleYards = Math.max(
      -5,
      Math.floor((qbMobility - 50) / 10 + Math.random() * 8 - 2)
    );
    roll.outcome = scrambleYards >= 0 ? 'short_gain' : 'loss';
    roll.yards = scrambleYards;
  }

  // 12. PROCESS INJURIES
  const hadBigHit = roll.secondaryEffects.includes('big_hit');
  const shouldCheckInjury = roll.secondaryEffects.includes('injury_check');

  let injuryInfo = {
    injured: false,
    playerId: null as string | null,
  };

  if (shouldCheckInjury) {
    for (const player of offensivePlayers) {
      const fatigue = getPlayerFatigue(offensiveTeam, player.id);
      const fatigueInjuryMult = getFatigueInjuryRiskMultiplier(
        player.position,
        getSnapCount(offensiveTeam, player.id),
        fatigue
      );

      const injuryResult = checkForInjury({
        player,
        playType,
        outcome: roll.outcome,
        hadBigHit,
        currentFatigue: fatigue * fatigueInjuryMult,
        weather: context.weather,
      });

      if (injuryResult.occurred) {
        injuryInfo = { injured: true, playerId: player.id };
        break;
      }
    }
  }

  // 13. UPDATE FATIGUE AND SNAP COUNTS
  const intensity = determinePlayIntensity(playType, roll.outcome);
  for (const player of offensivePlayers) {
    const currentFatigue = getPlayerFatigue(offensiveTeam, player.id);
    const fatigueIncrease = calculateFatigueIncrease({
      player,
      currentFatigue,
      snapCount: getSnapCount(offensiveTeam, player.id),
      weather: context.weather,
      playIntensity: intensity,
    });

    let newFatigue = currentFatigue + fatigueIncrease;
    newFatigue = calculateBetweenPlayRecovery(newFatigue);
    updatePlayerFatigue(offensiveTeam, player.id, newFatigue);
    incrementSnapCount(offensiveTeam, player.id);
  }

  for (const player of defensivePlayers) {
    const currentFatigue = getPlayerFatigue(defensiveTeam, player.id);
    const fatigueIncrease = calculateFatigueIncrease({
      player,
      currentFatigue,
      snapCount: getSnapCount(defensiveTeam, player.id),
      weather: context.weather,
      playIntensity: intensity,
    });

    let newFatigue = currentFatigue + fatigueIncrease;
    newFatigue = calculateBetweenPlayRecovery(newFatigue);
    updatePlayerFatigue(defensiveTeam, player.id, newFatigue);
    incrementSnapCount(defensiveTeam, player.id);
  }

  // Track RB touches
  if (isRunPlay && offensiveTeam.offense.rb[0]) {
    const rbId = offensiveTeam.offense.rb[0].id;
    const currentTouches = enhancedState.touchCounts.get(rbId) || 0;
    enhancedState.touchCounts.set(rbId, currentTouches + 1);
  }

  // Update run game tracker
  if (isRunPlay) {
    enhancedState.offenseRunTracker.recordRun(roll.yards, context.distance);
  }

  enhancedState.totalOffensiveSnaps++;
  enhancedState.totalDefensiveSnaps++;

  // 14. CALCULATE GAME STATE CHANGES
  let yardsGained = roll.yards;
  const turnover = roll.outcome === 'interception' || roll.outcome === 'fumble_lost';
  let touchdown = roll.outcome === 'touchdown';

  // Cap non-touchdown gains at the 1-yard line
  if (!touchdown && yardsGained > 0 && context.fieldPosition + yardsGained >= 100) {
    yardsGained = 99 - context.fieldPosition;
  }

  let newFieldPosition = context.fieldPosition + yardsGained;
  if (turnover) {
    newFieldPosition = 100 - newFieldPosition;
  }
  newFieldPosition = Math.max(1, Math.min(99, newFieldPosition));

  let newDown = context.down + 1;
  let newDistance = context.distance - yardsGained;
  let firstDown = false;

  if (yardsGained >= context.distance && !turnover) {
    newDown = 1;
    newDistance = 10;
    firstDown = true;
  } else if (turnover || touchdown) {
    newDown = 1;
    newDistance = 10;
  } else if (newDown > 4) {
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
      playerId: null,
      declined: false,
    };

    if (team === 'offense') {
      yardsGained = -penalty.yards;
      newFieldPosition = Math.max(1, context.fieldPosition - penalty.yards);
    } else {
      yardsGained = penalty.yards;
      newFieldPosition = Math.min(99, context.fieldPosition + penalty.yards);
      if (['Pass Interference', 'Defensive Holding', 'Roughing the Passer'].includes(penalty.type)) {
        newDown = 1;
        newDistance = 10;
        firstDown = true;
      }
    }
  }

  // 15. GENERATE DESCRIPTION
  const primaryPlayers = getPrimaryPlayers(offensiveEffectives, defensiveEffectives, playType);
  const allPlayers = new Map<string, Player>();
  offensivePlayers.forEach((p) => allPlayers.set(p.id, p));
  defensivePlayers.forEach((p) => allPlayers.set(p.id, p));

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

  // Determine if weak link was exploited
  const weakLinkExploited =
    (passRushResult?.pressureType === 'sack' || passRushResult?.pressureType === 'hit') &&
    compositeRatings.offense.passProtection.weakLinkPenalty > 10;

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
    // Enhanced fields
    personnelMatchup: {
      offense: offensePersonnel,
      defense: defensePersonnel,
      mismatchModifier: personnelMismatch.modifier,
    },
    schemeEffect: {
      overallAdvantage: schemeMatchup.overallAdvantage,
      playTypeModifier: playTypeEffects.yards || 0,
    },
    passRushResult,
    presnapRead: presnapResult,
    playActionBonus,
    situationalModifier: situationalMod.baseModifier,
    weakLinkExploited,
  };
}

/**
 * Get primary players for display
 */
function getPrimaryPlayers(
  offensivePlayers: PlayerWithEffective[],
  defensivePlayers: PlayerWithEffective[],
  playType: PlayType
): { offensive: string; defensive: string | null } {
  if (playType.startsWith('run') || playType === 'qb_sneak' || playType === 'qb_scramble') {
    const rb = offensivePlayers.find((p) => p.player.position === 'RB');
    const qb = offensivePlayers.find((p) => p.player.position === 'QB');
    const tackler = defensivePlayers.length > 0 ? defensivePlayers[0] : null;

    return {
      offensive:
        (playType === 'qb_sneak' || playType === 'qb_scramble' ? qb?.player.id : rb?.player.id) ||
        offensivePlayers[0]?.player.id ||
        '',
      defensive: tackler?.player.id || null,
    };
  }

  const qb = offensivePlayers.find((p) => p.player.position === 'QB');
  const receiver = offensivePlayers.find((p) => ['WR', 'TE', 'RB'].includes(p.player.position));
  const defender = defensivePlayers.find((p) =>
    ['CB', 'FS', 'SS', 'OLB', 'ILB'].includes(p.player.position)
  );

  return {
    offensive: qb?.player.id || offensivePlayers[0]?.player.id || '',
    defensive: receiver?.player.id || defender?.player.id || null,
  };
}
