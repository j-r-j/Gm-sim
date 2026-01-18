/**
 * Play-Action Effectiveness
 * Models how play-action effectiveness depends on run game success.
 * Teams that can't run get no PA benefit; dominant running teams get massive PA boost.
 */

/**
 * Recent run game statistics for PA calculation
 */
export interface RunGameStats {
  /** Total run attempts in recent plays */
  attempts: number;
  /** Total rushing yards in recent plays */
  yards: number;
  /** Successful runs (gained expected yards or more) */
  successfulRuns: number;
  /** Big runs (15+ yards) */
  bigRuns: number;
  /** Average yards per carry */
  ypc: number;
}

/**
 * Play-action effectiveness result
 */
export interface PlayActionEffectiveness {
  /** Bonus to route running effectiveness (defenders bite harder) */
  routeBonus: number;
  /** Extra time in pocket (average seconds) */
  extraPocketTime: number;
  /** Bonus to deep completion rate (safety late to cover) */
  deepCompletionBonus: number;
  /** Overall PA effectiveness multiplier (0.7 to 1.5) */
  overallMultiplier: number;
  /** Description of PA effectiveness */
  description: string;
}

/**
 * Window of plays to consider for run game success
 */
const RUN_GAME_WINDOW = 10;

/**
 * Track run game stats
 */
export class RunGameTracker {
  private runResults: { yards: number; success: boolean }[] = [];

  /**
   * Record a run play result
   */
  recordRun(yardsGained: number, yardsNeeded: number): void {
    const success = yardsGained >= Math.min(yardsNeeded, 4); // 4 yards = successful run
    this.runResults.push({ yards: yardsGained, success });

    // Keep only recent plays
    if (this.runResults.length > RUN_GAME_WINDOW) {
      this.runResults.shift();
    }
  }

  /**
   * Get current run game statistics
   */
  getStats(): RunGameStats {
    if (this.runResults.length === 0) {
      return {
        attempts: 0,
        yards: 0,
        successfulRuns: 0,
        bigRuns: 0,
        ypc: 0,
      };
    }

    const attempts = this.runResults.length;
    const yards = this.runResults.reduce((sum, r) => sum + r.yards, 0);
    const successfulRuns = this.runResults.filter((r) => r.success).length;
    const bigRuns = this.runResults.filter((r) => r.yards >= 15).length;
    const ypc = yards / attempts;

    return {
      attempts,
      yards,
      successfulRuns,
      bigRuns,
      ypc,
    };
  }

  /**
   * Get run success rate (0-1)
   */
  getSuccessRate(): number {
    if (this.runResults.length === 0) return 0.45; // League average
    return this.runResults.filter((r) => r.success).length / this.runResults.length;
  }

  /**
   * Reset tracker (new game)
   */
  reset(): void {
    this.runResults = [];
  }
}

/**
 * Calculate play-action effectiveness based on run game success
 */
export function calculatePlayActionEffectiveness(stats: RunGameStats): PlayActionEffectiveness {
  // Need minimum attempts for PA to be effective
  if (stats.attempts < 3) {
    return {
      routeBonus: 0,
      extraPocketTime: 0,
      deepCompletionBonus: 0,
      overallMultiplier: 1.0,
      description: 'Insufficient run attempts - defense not respecting run',
    };
  }

  const successRate = stats.successfulRuns / stats.attempts;
  const ypc = stats.ypc;

  // Thresholds for run game credibility
  // Elite: 5.0+ YPC, 60%+ success
  // Good: 4.5+ YPC, 50%+ success
  // Average: 4.0+ YPC, 45%+ success
  // Poor: <4.0 YPC, <45% success

  let routeBonus = 0;
  let extraPocketTime = 0;
  let deepCompletionBonus = 0;
  let overallMultiplier = 1.0;
  let description = '';

  if (ypc >= 5.0 && successRate >= 0.6) {
    // Elite run game - massive PA advantage
    routeBonus = 15; // Linebackers completely bite on fake
    extraPocketTime = 0.5; // Half second extra in pocket
    deepCompletionBonus = 20; // Safety way late to deep
    overallMultiplier = 1.4;
    description = 'Elite run game - defense selling out to stop run, PA devastating';
  } else if (ypc >= 4.5 && successRate >= 0.5) {
    // Good run game - strong PA advantage
    routeBonus = 10;
    extraPocketTime = 0.35;
    deepCompletionBonus = 15;
    overallMultiplier = 1.25;
    description = 'Good run game - LBs hesitating, PA very effective';
  } else if (ypc >= 4.0 && successRate >= 0.45) {
    // Average run game - moderate PA advantage
    routeBonus = 5;
    extraPocketTime = 0.2;
    deepCompletionBonus = 8;
    overallMultiplier = 1.1;
    description = 'Average run game - PA getting some effect';
  } else if (ypc >= 3.5 || successRate >= 0.4) {
    // Below average - minimal PA advantage
    routeBonus = 2;
    extraPocketTime = 0.1;
    deepCompletionBonus = 3;
    overallMultiplier = 1.0;
    description = 'Mediocre run game - defense not fully respecting run';
  } else {
    // Poor run game - no PA advantage, might even hurt
    routeBonus = -3; // Defense keying pass immediately
    extraPocketTime = -0.1; // QB holds ball too long on fake
    deepCompletionBonus = -5;
    overallMultiplier = 0.85;
    description = 'Poor run game - defense ignoring run fake entirely';
  }

  // Big play bonus - if running backs are breaking big runs, defense really respects
  if (stats.bigRuns >= 2) {
    routeBonus += 5;
    deepCompletionBonus += 5;
    overallMultiplier *= 1.1;
  }

  return {
    routeBonus,
    extraPocketTime,
    deepCompletionBonus,
    overallMultiplier: Math.max(0.7, Math.min(1.5, overallMultiplier)),
    description,
  };
}

/**
 * Get PA modifier for a specific play type
 */
export function getPlayActionModifier(
  effectiveness: PlayActionEffectiveness,
  isDeepPass: boolean
): number {
  if (isDeepPass) {
    // Deep passes benefit most from PA
    return effectiveness.routeBonus + effectiveness.deepCompletionBonus;
  }
  // Short/medium passes benefit from route bonus and extra time
  return effectiveness.routeBonus * 0.7;
}

/**
 * Adjust sack probability based on PA pocket time
 */
export function adjustSackProbability(
  baseSackRate: number,
  effectiveness: PlayActionEffectiveness
): number {
  // Extra pocket time reduces sack rate, but PA takes longer to develop
  const timeAdjustment = effectiveness.extraPocketTime;

  if (timeAdjustment > 0) {
    // Good PA effectiveness = extra time = less sacks
    return baseSackRate * (1 - timeAdjustment * 0.3);
  } else {
    // Bad PA = wasted time on fake = more sacks
    return baseSackRate * (1 - timeAdjustment * 0.5);
  }
}

/**
 * Check if play-action should be effective against given defense
 */
export function shouldUsePlayAction(
  runStats: RunGameStats,
  defenseIsAggressiveVsRun: boolean,
  down: number,
  distance: number
): { recommended: boolean; reason: string } {
  const effectiveness = calculatePlayActionEffectiveness(runStats);

  // Never use PA on obvious passing downs with poor run game
  if (down === 3 && distance > 10 && runStats.ypc < 4.0) {
    return {
      recommended: false,
      reason: 'Obvious passing down, defense won\'t bite on fake',
    };
  }

  // Always use PA if run game is elite and defense is selling out
  if (effectiveness.overallMultiplier >= 1.25 && defenseIsAggressiveVsRun) {
    return {
      recommended: true,
      reason: 'Elite run game and aggressive defense - PA will be devastating',
    };
  }

  // Good situations for PA: early downs, defense expecting run
  if ((down === 1 || down === 2) && distance <= 10 && runStats.ypc >= 4.0) {
    return {
      recommended: true,
      reason: 'Early down situation with effective run game',
    };
  }

  // Neutral - can go either way
  if (effectiveness.overallMultiplier >= 1.0) {
    return {
      recommended: Math.random() < 0.4, // 40% of the time
      reason: 'Moderate PA effectiveness',
    };
  }

  return {
    recommended: false,
    reason: 'Run game not effective enough for PA',
  };
}

/**
 * Create a new run game tracker
 */
export function createRunGameTracker(): RunGameTracker {
  return new RunGameTracker();
}
