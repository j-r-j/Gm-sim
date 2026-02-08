/**
 * Halftime Adjustments System
 *
 * Provides the user with in-game decision points at halftime.
 * Decisions affect the second half simulation through modifiers.
 *
 * Decisions available:
 * 1. Offensive adjustment (run more, pass more, balanced, aggressive)
 * 2. Defensive adjustment (blitz more, zone, man, conservative)
 * 3. Player substitution override (bench struggling starter)
 */

/**
 * Offensive halftime adjustment options
 */
export type OffensiveAdjustment =
  | 'noChange'
  | 'runMore'
  | 'passMore'
  | 'goAggressive'
  | 'playConservative';

/**
 * Defensive halftime adjustment options
 */
export type DefensiveAdjustment =
  | 'noChange'
  | 'blitzMore'
  | 'playZone'
  | 'playMan'
  | 'preventDefense';

/**
 * Halftime stats summary for decision-making
 */
export interface HalftimeStats {
  userScore: number;
  opponentScore: number;
  scoreDiff: number;
  userPassYards: number;
  userRushYards: number;
  userTurnovers: number;
  opponentPassYards: number;
  opponentRushYards: number;
  opponentTurnovers: number;
  userTimeOfPossession: string;
  userThirdDownPct: number;
  /** Players performing notably well or poorly */
  notablePlayers: HalftimePlayerNote[];
}

/**
 * Notable player performance at halftime
 */
export interface HalftimePlayerNote {
  playerId: string;
  playerName: string;
  position: string;
  note: string;
  isPositive: boolean;
  /** If negative, can be benched */
  canBench: boolean;
}

/**
 * Complete halftime decision state
 */
export interface HalftimeDecisions {
  offensiveAdjustment: OffensiveAdjustment;
  defensiveAdjustment: DefensiveAdjustment;
  benchedPlayerIds: string[];
  isConfirmed: boolean;
}

/**
 * Modifiers applied to second half based on halftime decisions
 */
export interface SecondHalfModifiers {
  /** Adjust run/pass ratio (-20 to +20, positive = more passing) */
  runPassShift: number;
  /** Blitz frequency modifier (-0.2 to +0.2) */
  blitzFrequencyMod: number;
  /** Coverage quality modifier (-3 to +3 rating points) */
  coverageMod: number;
  /** Aggression modifier affecting big play chance and turnover risk */
  aggressionMod: number;
  /** Set of player IDs that should be subbed out */
  benchedPlayerIds: string[];
}

/** Labels for offensive adjustments */
export const OFFENSIVE_ADJUSTMENT_LABELS: Record<OffensiveAdjustment, string> = {
  noChange: 'No Change',
  runMore: 'Run More',
  passMore: 'Pass More',
  goAggressive: 'Go Aggressive',
  playConservative: 'Play Conservative',
};

/** Descriptions for offensive adjustments */
export const OFFENSIVE_ADJUSTMENT_DESCRIPTIONS: Record<OffensiveAdjustment, string> = {
  noChange: 'Keep the current game plan',
  runMore: 'Increase rush attempts to control the clock',
  passMore: 'Air it out and push downfield',
  goAggressive: 'Take more shots - higher risk, higher reward',
  playConservative: 'Shorter routes, fewer turnovers, grind it out',
};

/** Labels for defensive adjustments */
export const DEFENSIVE_ADJUSTMENT_LABELS: Record<DefensiveAdjustment, string> = {
  noChange: 'No Change',
  blitzMore: 'Blitz More',
  playZone: 'Zone Coverage',
  playMan: 'Man Coverage',
  preventDefense: 'Prevent Defense',
};

/** Descriptions for defensive adjustments */
export const DEFENSIVE_ADJUSTMENT_DESCRIPTIONS: Record<DefensiveAdjustment, string> = {
  noChange: 'Keep the current defensive scheme',
  blitzMore: 'Send more rushers to pressure the QB',
  playZone: 'Drop into zone coverage to prevent big plays',
  playMan: 'Lock up receivers one-on-one for tighter coverage',
  preventDefense: 'Prevent the deep ball - bend but do not break',
};

/**
 * Create default halftime decisions
 */
export function createDefaultHalftimeDecisions(): HalftimeDecisions {
  return {
    offensiveAdjustment: 'noChange',
    defensiveAdjustment: 'noChange',
    benchedPlayerIds: [],
    isConfirmed: false,
  };
}

/**
 * Calculate second half modifiers from halftime decisions
 */
export function calculateSecondHalfModifiers(decisions: HalftimeDecisions): SecondHalfModifiers {
  let runPassShift = 0;
  let blitzFrequencyMod = 0;
  let coverageMod = 0;
  let aggressionMod = 0;

  // Offensive adjustments
  switch (decisions.offensiveAdjustment) {
    case 'runMore':
      runPassShift = -15;
      aggressionMod = -0.5;
      break;
    case 'passMore':
      runPassShift = 15;
      aggressionMod = 0.5;
      break;
    case 'goAggressive':
      runPassShift = 10;
      aggressionMod = 2;
      break;
    case 'playConservative':
      runPassShift = -10;
      aggressionMod = -2;
      break;
  }

  // Defensive adjustments
  switch (decisions.defensiveAdjustment) {
    case 'blitzMore':
      blitzFrequencyMod = 0.15;
      coverageMod = -1;
      break;
    case 'playZone':
      blitzFrequencyMod = -0.1;
      coverageMod = 2;
      break;
    case 'playMan':
      blitzFrequencyMod = 0;
      coverageMod = 1;
      break;
    case 'preventDefense':
      blitzFrequencyMod = -0.15;
      coverageMod = 3;
      aggressionMod -= 1;
      break;
  }

  return {
    runPassShift,
    blitzFrequencyMod,
    coverageMod,
    aggressionMod,
    benchedPlayerIds: decisions.benchedPlayerIds,
  };
}

/**
 * Generate halftime stats from live game state
 * This creates a user-friendly summary for decision-making
 */
export function generateHalftimeStats(
  homeScore: number,
  awayScore: number,
  isUserHome: boolean,
  recentPlays: Array<{
    description: string;
    offenseTeam: string;
    isScoring?: boolean;
    isTurnover?: boolean;
  }>,
  _userTeamAbbr: string
): HalftimeStats {
  const userScore = isUserHome ? homeScore : awayScore;
  const opponentScore = isUserHome ? awayScore : homeScore;

  // Estimate stats from play count and score
  const totalPlays = recentPlays.length;
  const estimatedPassYards = Math.round(
    (userScore / Math.max(1, userScore + opponentScore)) * 150 + Math.random() * 50
  );
  const estimatedRushYards = Math.round(
    (userScore / Math.max(1, userScore + opponentScore)) * 80 + Math.random() * 30
  );
  const turnovers = recentPlays.filter((p) => p.isTurnover).length;
  const oppPassYards = Math.round(
    (opponentScore / Math.max(1, userScore + opponentScore)) * 150 + Math.random() * 50
  );
  const oppRushYards = Math.round(
    (opponentScore / Math.max(1, userScore + opponentScore)) * 80 + Math.random() * 30
  );

  const notablePlayers: HalftimePlayerNote[] = [];

  // Generate contextual notes based on score
  if (userScore < opponentScore - 14) {
    notablePlayers.push({
      playerId: 'qb-note',
      playerName: 'Your QB',
      position: 'QB',
      note: 'Struggling under pressure',
      isPositive: false,
      canBench: true,
    });
  }

  if (userScore > opponentScore + 7) {
    notablePlayers.push({
      playerId: 'defense-note',
      playerName: 'Defense',
      position: 'DEF',
      note: 'Dominating their offense',
      isPositive: true,
      canBench: false,
    });
  }

  return {
    userScore,
    opponentScore,
    scoreDiff: userScore - opponentScore,
    userPassYards: estimatedPassYards,
    userRushYards: estimatedRushYards,
    userTurnovers: Math.max(0, Math.min(turnovers, 3)),
    opponentPassYards: oppPassYards,
    opponentRushYards: oppRushYards,
    opponentTurnovers: Math.max(0, Math.floor(Math.random() * 2)),
    userTimeOfPossession: `${Math.floor(totalPlays * 0.4)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
    userThirdDownPct: Math.round(30 + Math.random() * 40),
    notablePlayers,
  };
}

/**
 * Generate AI recommendation based on halftime stats
 */
export function getHalftimeRecommendation(stats: HalftimeStats): {
  offensiveRec: OffensiveAdjustment;
  defensiveRec: DefensiveAdjustment;
  reasoning: string;
} {
  const { scoreDiff, userPassYards, userRushYards } = stats;

  let offensiveRec: OffensiveAdjustment = 'noChange';
  let defensiveRec: DefensiveAdjustment = 'noChange';
  let reasoning = '';

  if (scoreDiff < -14) {
    offensiveRec = 'goAggressive';
    defensiveRec = 'blitzMore';
    reasoning = 'Down big - need to take chances and create pressure to force turnovers.';
  } else if (scoreDiff < -7) {
    offensiveRec = 'passMore';
    defensiveRec = 'blitzMore';
    reasoning = 'Need to air it out and get stops. Pressure their QB.';
  } else if (scoreDiff < 0) {
    offensiveRec = userRushYards > userPassYards ? 'passMore' : 'runMore';
    defensiveRec = 'noChange';
    reasoning = 'Close game - adjust to exploit what is working.';
  } else if (scoreDiff > 14) {
    offensiveRec = 'playConservative';
    defensiveRec = 'preventDefense';
    reasoning = 'Comfortable lead - protect the ball and run the clock.';
  } else if (scoreDiff > 7) {
    offensiveRec = 'runMore';
    defensiveRec = 'playZone';
    reasoning = 'Solid lead - control the clock and prevent big plays.';
  } else {
    offensiveRec = 'noChange';
    defensiveRec = 'noChange';
    reasoning = 'Tight game - trust your game plan and execute.';
  }

  return { offensiveRec, defensiveRec, reasoning };
}
