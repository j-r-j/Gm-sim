/**
 * Statistics Tracker
 * Tracks all game statistics for players and teams during a game.
 * Statistics are user-visible outcome data (unlike hidden engine internals).
 */

import { PlayResult } from '../engine/PlayResolver';
import { PlayType } from '../engine/OutcomeTables';

/**
 * Passing statistics for a player
 */
export interface PassingStats {
  attempts: number;
  completions: number;
  yards: number;
  touchdowns: number;
  interceptions: number;
  sacks: number;
  sackYardsLost: number;
  longestPass: number;
  rating: number; // Passer rating (calculated)
}

/**
 * Rushing statistics for a player
 */
export interface RushingStats {
  attempts: number;
  yards: number;
  touchdowns: number;
  fumbles: number;
  fumblesLost: number;
  longestRush: number;
  yardsPerCarry: number;
}

/**
 * Receiving statistics for a player
 */
export interface ReceivingStats {
  targets: number;
  receptions: number;
  yards: number;
  touchdowns: number;
  longestReception: number;
  yardsPerReception: number;
  drops: number;
}

/**
 * Defensive statistics for a player
 */
export interface DefensiveStats {
  tackles: number;
  tacklesForLoss: number;
  sacks: number;
  interceptions: number;
  passesDefended: number;
  forcedFumbles: number;
  fumblesRecovered: number;
  touchdowns: number; // Defensive TDs
}

/**
 * Kicking statistics for a player
 */
export interface KickingStats {
  fieldGoalAttempts: number;
  fieldGoalsMade: number;
  longestFieldGoal: number;
  extraPointAttempts: number;
  extraPointsMade: number;
}

/**
 * Complete game statistics for a player
 */
export interface PlayerGameStats {
  playerId: string;
  passing: PassingStats;
  rushing: RushingStats;
  receiving: ReceivingStats;
  defensive: DefensiveStats;
  kicking: KickingStats;
  snapsPlayed: number;
  penaltiesCommitted: number;
  penaltyYards: number;
}

/**
 * Complete game statistics for a team
 */
export interface TeamGameStats {
  teamId: string;

  // Scoring
  score: number;
  scoreByQuarter: number[];

  // Offense totals
  totalYards: number;
  passingYards: number;
  rushingYards: number;
  turnovers: number;

  // Time of possession
  timeOfPossession: number; // Seconds

  // Efficiency
  thirdDownAttempts: number;
  thirdDownConversions: number;
  fourthDownAttempts: number;
  fourthDownConversions: number;
  redZoneAttempts: number;
  redZoneTouchdowns: number;

  // Other
  penalties: number;
  penaltyYards: number;
  firstDowns: number;
  punts: number;
  puntYards: number;

  // Individual stats
  playerStats: Map<string, PlayerGameStats>;
}

/**
 * Create empty passing stats
 */
export function createEmptyPassingStats(): PassingStats {
  return {
    attempts: 0,
    completions: 0,
    yards: 0,
    touchdowns: 0,
    interceptions: 0,
    sacks: 0,
    sackYardsLost: 0,
    longestPass: 0,
    rating: 0,
  };
}

/**
 * Create empty rushing stats
 */
export function createEmptyRushingStats(): RushingStats {
  return {
    attempts: 0,
    yards: 0,
    touchdowns: 0,
    fumbles: 0,
    fumblesLost: 0,
    longestRush: 0,
    yardsPerCarry: 0,
  };
}

/**
 * Create empty receiving stats
 */
export function createEmptyReceivingStats(): ReceivingStats {
  return {
    targets: 0,
    receptions: 0,
    yards: 0,
    touchdowns: 0,
    longestReception: 0,
    yardsPerReception: 0,
    drops: 0,
  };
}

/**
 * Create empty defensive stats
 */
export function createEmptyDefensiveStats(): DefensiveStats {
  return {
    tackles: 0,
    tacklesForLoss: 0,
    sacks: 0,
    interceptions: 0,
    passesDefended: 0,
    forcedFumbles: 0,
    fumblesRecovered: 0,
    touchdowns: 0,
  };
}

/**
 * Create empty kicking stats
 */
export function createEmptyKickingStats(): KickingStats {
  return {
    fieldGoalAttempts: 0,
    fieldGoalsMade: 0,
    longestFieldGoal: 0,
    extraPointAttempts: 0,
    extraPointsMade: 0,
  };
}

/**
 * Create empty player game stats
 */
export function createEmptyPlayerGameStats(playerId: string): PlayerGameStats {
  return {
    playerId,
    passing: createEmptyPassingStats(),
    rushing: createEmptyRushingStats(),
    receiving: createEmptyReceivingStats(),
    defensive: createEmptyDefensiveStats(),
    kicking: createEmptyKickingStats(),
    snapsPlayed: 0,
    penaltiesCommitted: 0,
    penaltyYards: 0,
  };
}

/**
 * Create empty team game stats
 */
export function createEmptyTeamGameStats(teamId: string): TeamGameStats {
  return {
    teamId,
    score: 0,
    scoreByQuarter: [0, 0, 0, 0],
    totalYards: 0,
    passingYards: 0,
    rushingYards: 0,
    turnovers: 0,
    timeOfPossession: 0,
    thirdDownAttempts: 0,
    thirdDownConversions: 0,
    fourthDownAttempts: 0,
    fourthDownConversions: 0,
    redZoneAttempts: 0,
    redZoneTouchdowns: 0,
    penalties: 0,
    penaltyYards: 0,
    firstDowns: 0,
    punts: 0,
    puntYards: 0,
    playerStats: new Map(),
  };
}

/**
 * Calculate NFL passer rating
 * Uses the official NFL formula
 */
export function calculatePasserRating(stats: PassingStats): number {
  if (stats.attempts === 0) return 0;

  // Component A: Completion percentage
  let a = (stats.completions / stats.attempts - 0.3) * 5;
  a = Math.max(0, Math.min(2.375, a));

  // Component B: Yards per attempt
  let b = (stats.yards / stats.attempts - 3) * 0.25;
  b = Math.max(0, Math.min(2.375, b));

  // Component C: TD percentage
  let c = (stats.touchdowns / stats.attempts) * 20;
  c = Math.max(0, Math.min(2.375, c));

  // Component D: INT percentage
  let d = 2.375 - (stats.interceptions / stats.attempts) * 25;
  d = Math.max(0, Math.min(2.375, d));

  // Final calculation
  const rating = ((a + b + c + d) / 6) * 100;
  return Math.round(rating * 10) / 10;
}

/**
 * Check if a play type is a pass play
 */
function isPassPlay(playType: PlayType): boolean {
  return (
    playType.includes('pass') || playType.includes('action') || playType === 'qb_scramble'
  );
}

/**
 * Check if a play type is a run play
 */
function isRunPlay(playType: PlayType): boolean {
  return playType.startsWith('run') || playType === 'qb_sneak';
}

/**
 * Statistics Tracker class
 * Manages statistics for both teams during a game
 */
export class StatisticsTracker {
  private homeStats: TeamGameStats;
  private awayStats: TeamGameStats;
  private currentQuarter: number = 1;
  private inRedZone: Map<string, boolean> = new Map();

  constructor(homeTeamId: string, awayTeamId: string) {
    this.homeStats = createEmptyTeamGameStats(homeTeamId);
    this.awayStats = createEmptyTeamGameStats(awayTeamId);
    this.inRedZone.set(homeTeamId, false);
    this.inRedZone.set(awayTeamId, false);
  }

  /**
   * Set the current quarter (1-4 or 5 for OT)
   */
  setQuarter(quarter: number): void {
    this.currentQuarter = quarter;
    // Extend score by quarter array if needed (for OT)
    while (this.homeStats.scoreByQuarter.length < quarter) {
      this.homeStats.scoreByQuarter.push(0);
      this.awayStats.scoreByQuarter.push(0);
    }
  }

  /**
   * Update red zone status
   */
  setRedZone(teamId: string, inRedZone: boolean): void {
    this.inRedZone.set(teamId, inRedZone);
  }

  /**
   * Get or create player stats
   */
  private getOrCreatePlayerStats(teamStats: TeamGameStats, playerId: string): PlayerGameStats {
    let playerStats = teamStats.playerStats.get(playerId);
    if (!playerStats) {
      playerStats = createEmptyPlayerGameStats(playerId);
      teamStats.playerStats.set(playerId, playerStats);
    }
    return playerStats;
  }

  /**
   * Record a play and update statistics
   */
  recordPlay(
    play: PlayResult,
    offenseTeamId: string,
    context: {
      down: number;
      distance: number;
      fieldPosition: number;
      timeElapsed: number;
    }
  ): void {
    const isHome = offenseTeamId === this.homeStats.teamId;
    const offenseStats = isHome ? this.homeStats : this.awayStats;
    const defenseStats = isHome ? this.awayStats : this.homeStats;

    // Update time of possession
    offenseStats.timeOfPossession += context.timeElapsed;

    // Track red zone entry
    const wasInRedZone = this.inRedZone.get(offenseTeamId) || false;
    const nowInRedZone = context.fieldPosition >= 80;
    if (nowInRedZone && !wasInRedZone) {
      offenseStats.redZoneAttempts++;
    }
    this.inRedZone.set(offenseTeamId, nowInRedZone);

    // Handle different play types
    if (isPassPlay(play.playType)) {
      this.recordPassPlay(play, offenseStats, defenseStats, context);
    } else if (isRunPlay(play.playType)) {
      this.recordRushPlay(play, offenseStats, defenseStats, context);
    } else if (play.playType === 'field_goal') {
      this.recordFieldGoal(play, offenseStats, context.fieldPosition);
    } else if (play.playType === 'punt') {
      this.recordPunt(play, offenseStats);
    }

    // Handle penalties
    if (play.penaltyOccurred && play.penaltyDetails) {
      this.recordPenalty(play, offenseStats, defenseStats);
    }

    // Track first downs
    if (play.firstDown) {
      offenseStats.firstDowns++;
    }

    // Track down efficiency
    if (context.down === 3) {
      offenseStats.thirdDownAttempts++;
      if (play.firstDown || play.touchdown) {
        offenseStats.thirdDownConversions++;
      }
    } else if (context.down === 4 && !['punt', 'field_goal'].includes(play.playType)) {
      offenseStats.fourthDownAttempts++;
      if (play.firstDown || play.touchdown) {
        offenseStats.fourthDownConversions++;
      }
    }

    // Track scoring
    if (play.touchdown) {
      this.recordTouchdown(offenseStats);
    }

    // Track turnovers
    if (play.turnover && play.outcome !== 'incomplete') {
      offenseStats.turnovers++;
    }
  }

  /**
   * Record a passing play
   */
  private recordPassPlay(
    play: PlayResult,
    offenseStats: TeamGameStats,
    defenseStats: TeamGameStats,
    _context: { down: number; distance: number; fieldPosition: number }
  ): void {
    const qbStats = this.getOrCreatePlayerStats(offenseStats, play.primaryOffensivePlayer);
    qbStats.snapsPlayed++;

    // Sack
    if (play.outcome === 'sack') {
      qbStats.passing.sacks++;
      qbStats.passing.sackYardsLost += Math.abs(play.yardsGained);

      // Credit defensive player
      if (play.primaryDefensivePlayer) {
        const defStats = this.getOrCreatePlayerStats(defenseStats, play.primaryDefensivePlayer);
        defStats.defensive.sacks++;
        defStats.defensive.tackles++;
        if (play.yardsGained < 0) {
          defStats.defensive.tacklesForLoss++;
        }
      }
      return;
    }

    // Interception
    if (play.outcome === 'interception') {
      qbStats.passing.attempts++;
      qbStats.passing.interceptions++;

      if (play.primaryDefensivePlayer) {
        const defStats = this.getOrCreatePlayerStats(defenseStats, play.primaryDefensivePlayer);
        defStats.defensive.interceptions++;
        defStats.defensive.passesDefended++;
      }
      return;
    }

    // Incomplete pass
    if (play.outcome === 'incomplete') {
      qbStats.passing.attempts++;

      if (play.primaryDefensivePlayer) {
        const defStats = this.getOrCreatePlayerStats(defenseStats, play.primaryDefensivePlayer);
        defStats.defensive.passesDefended++;
      }
      return;
    }

    // Complete pass (any positive outcome or short_gain, moderate_gain, etc.)
    if (!play.turnover && play.outcome !== 'penalty_offense') {
      qbStats.passing.attempts++;
      qbStats.passing.completions++;
      qbStats.passing.yards += play.yardsGained;
      offenseStats.passingYards += play.yardsGained;
      offenseStats.totalYards += play.yardsGained;

      if (play.yardsGained > qbStats.passing.longestPass) {
        qbStats.passing.longestPass = play.yardsGained;
      }

      if (play.touchdown) {
        qbStats.passing.touchdowns++;
      }

      // Update passer rating
      qbStats.passing.rating = calculatePasserRating(qbStats.passing);

      // Credit receiver (we use defensivePlayer field for receiver in pass plays)
      if (play.primaryDefensivePlayer) {
        const receiverStats = this.getOrCreatePlayerStats(
          offenseStats,
          play.primaryDefensivePlayer
        );
        receiverStats.receiving.targets++;
        receiverStats.receiving.receptions++;
        receiverStats.receiving.yards += play.yardsGained;
        receiverStats.snapsPlayed++;

        if (play.yardsGained > receiverStats.receiving.longestReception) {
          receiverStats.receiving.longestReception = play.yardsGained;
        }

        if (play.touchdown) {
          receiverStats.receiving.touchdowns++;
        }

        // Update yards per reception
        if (receiverStats.receiving.receptions > 0) {
          receiverStats.receiving.yardsPerReception =
            receiverStats.receiving.yards / receiverStats.receiving.receptions;
        }
      }
    }
  }

  /**
   * Record a rushing play
   */
  private recordRushPlay(
    play: PlayResult,
    offenseStats: TeamGameStats,
    defenseStats: TeamGameStats,
    _context: { down: number; distance: number; fieldPosition: number }
  ): void {
    const rusherStats = this.getOrCreatePlayerStats(offenseStats, play.primaryOffensivePlayer);
    rusherStats.snapsPlayed++;

    // Fumble
    if (play.outcome === 'fumble' || play.outcome === 'fumble_lost') {
      rusherStats.rushing.fumbles++;
      if (play.outcome === 'fumble_lost') {
        rusherStats.rushing.fumblesLost++;

        if (play.primaryDefensivePlayer) {
          const defStats = this.getOrCreatePlayerStats(defenseStats, play.primaryDefensivePlayer);
          defStats.defensive.forcedFumbles++;
          defStats.defensive.fumblesRecovered++;
        }
      }
    }

    // Record rush attempt
    if (play.outcome !== 'penalty_offense') {
      rusherStats.rushing.attempts++;
      rusherStats.rushing.yards += play.yardsGained;
      offenseStats.rushingYards += play.yardsGained;
      offenseStats.totalYards += play.yardsGained;

      if (play.yardsGained > rusherStats.rushing.longestRush) {
        rusherStats.rushing.longestRush = play.yardsGained;
      }

      if (play.touchdown) {
        rusherStats.rushing.touchdowns++;
      }

      // Update yards per carry
      if (rusherStats.rushing.attempts > 0) {
        rusherStats.rushing.yardsPerCarry = rusherStats.rushing.yards / rusherStats.rushing.attempts;
      }
    }

    // Credit tackler
    if (play.primaryDefensivePlayer && !play.turnover) {
      const tacklerStats = this.getOrCreatePlayerStats(defenseStats, play.primaryDefensivePlayer);
      tacklerStats.defensive.tackles++;
      if (play.yardsGained < 0) {
        tacklerStats.defensive.tacklesForLoss++;
      }
    }
  }

  /**
   * Record a field goal attempt
   */
  private recordFieldGoal(
    play: PlayResult,
    offenseStats: TeamGameStats,
    fieldPosition: number
  ): void {
    const kickerStats = this.getOrCreatePlayerStats(offenseStats, play.primaryOffensivePlayer);
    kickerStats.snapsPlayed++;

    const distance = 100 - fieldPosition + 17; // Standard FG setup

    kickerStats.kicking.fieldGoalAttempts++;
    if (play.outcome === 'field_goal_made') {
      kickerStats.kicking.fieldGoalsMade++;
      offenseStats.score += 3;

      // Update score by quarter
      const quarterIndex = Math.min(this.currentQuarter - 1, offenseStats.scoreByQuarter.length - 1);
      offenseStats.scoreByQuarter[quarterIndex] += 3;

      if (distance > kickerStats.kicking.longestFieldGoal) {
        kickerStats.kicking.longestFieldGoal = distance;
      }
    }
  }

  /**
   * Record a punt
   */
  private recordPunt(play: PlayResult, offenseStats: TeamGameStats): void {
    offenseStats.punts++;
    offenseStats.puntYards += play.yardsGained;
  }

  /**
   * Record a penalty
   */
  private recordPenalty(
    play: PlayResult,
    offenseStats: TeamGameStats,
    defenseStats: TeamGameStats
  ): void {
    if (!play.penaltyDetails) return;

    if (play.penaltyDetails.team === 'offense') {
      offenseStats.penalties++;
      offenseStats.penaltyYards += play.penaltyDetails.yards;

      if (play.penaltyDetails.playerId) {
        const playerStats = this.getOrCreatePlayerStats(offenseStats, play.penaltyDetails.playerId);
        playerStats.penaltiesCommitted++;
        playerStats.penaltyYards += play.penaltyDetails.yards;
      }
    } else {
      defenseStats.penalties++;
      defenseStats.penaltyYards += play.penaltyDetails.yards;

      if (play.penaltyDetails.playerId) {
        const playerStats = this.getOrCreatePlayerStats(defenseStats, play.penaltyDetails.playerId);
        playerStats.penaltiesCommitted++;
        playerStats.penaltyYards += play.penaltyDetails.yards;
      }
    }
  }

  /**
   * Record a touchdown
   */
  private recordTouchdown(offenseStats: TeamGameStats): void {
    offenseStats.score += 6;

    // Update score by quarter
    const quarterIndex = Math.min(this.currentQuarter - 1, offenseStats.scoreByQuarter.length - 1);
    offenseStats.scoreByQuarter[quarterIndex] += 6;

    // Check red zone TD
    if (this.inRedZone.get(offenseStats.teamId)) {
      offenseStats.redZoneTouchdowns++;
    }
  }

  /**
   * Record an extra point attempt
   */
  recordExtraPoint(teamId: string, made: boolean, kickerId: string): void {
    const stats = teamId === this.homeStats.teamId ? this.homeStats : this.awayStats;
    const kickerStats = this.getOrCreatePlayerStats(stats, kickerId);

    kickerStats.kicking.extraPointAttempts++;
    if (made) {
      kickerStats.kicking.extraPointsMade++;
      stats.score += 1;

      // Update score by quarter
      const quarterIndex = Math.min(this.currentQuarter - 1, stats.scoreByQuarter.length - 1);
      stats.scoreByQuarter[quarterIndex] += 1;
    }
  }

  /**
   * Record a two-point conversion
   */
  recordTwoPointConversion(teamId: string, successful: boolean): void {
    if (successful) {
      const stats = teamId === this.homeStats.teamId ? this.homeStats : this.awayStats;
      stats.score += 2;

      // Update score by quarter
      const quarterIndex = Math.min(this.currentQuarter - 1, stats.scoreByQuarter.length - 1);
      stats.scoreByQuarter[quarterIndex] += 2;
    }
  }

  /**
   * Record a safety
   */
  recordSafety(scoringTeamId: string): void {
    const stats = scoringTeamId === this.homeStats.teamId ? this.homeStats : this.awayStats;
    stats.score += 2;

    // Update score by quarter
    const quarterIndex = Math.min(this.currentQuarter - 1, stats.scoreByQuarter.length - 1);
    stats.scoreByQuarter[quarterIndex] += 2;
  }

  /**
   * Record a defensive touchdown
   */
  recordDefensiveTouchdown(teamId: string, playerId: string): void {
    const stats = teamId === this.homeStats.teamId ? this.homeStats : this.awayStats;
    const playerStats = this.getOrCreatePlayerStats(stats, playerId);

    playerStats.defensive.touchdowns++;
    stats.score += 6;

    // Update score by quarter
    const quarterIndex = Math.min(this.currentQuarter - 1, stats.scoreByQuarter.length - 1);
    stats.scoreByQuarter[quarterIndex] += 6;
  }

  /**
   * Get home team statistics
   */
  getHomeStats(): TeamGameStats {
    return this.homeStats;
  }

  /**
   * Get away team statistics
   */
  getAwayStats(): TeamGameStats {
    return this.awayStats;
  }

  /**
   * Get statistics for a specific player
   */
  getPlayerStats(playerId: string): PlayerGameStats | null {
    let stats = this.homeStats.playerStats.get(playerId);
    if (!stats) {
      stats = this.awayStats.playerStats.get(playerId);
    }
    return stats || null;
  }

  /**
   * Get statistics for a specific team
   */
  getTeamStats(teamId: string): TeamGameStats | null {
    if (teamId === this.homeStats.teamId) {
      return this.homeStats;
    }
    if (teamId === this.awayStats.teamId) {
      return this.awayStats;
    }
    return null;
  }

  /**
   * Calculate passer rating for given stats
   */
  calculatePasserRating(stats: PassingStats): number {
    return calculatePasserRating(stats);
  }

  /**
   * Finalize statistics (calculate final averages, etc.)
   */
  finalizeStats(): void {
    // Finalize passer ratings for all QBs
    for (const playerStats of this.homeStats.playerStats.values()) {
      if (playerStats.passing.attempts > 0) {
        playerStats.passing.rating = calculatePasserRating(playerStats.passing);
      }
      if (playerStats.rushing.attempts > 0) {
        playerStats.rushing.yardsPerCarry =
          playerStats.rushing.yards / playerStats.rushing.attempts;
      }
      if (playerStats.receiving.receptions > 0) {
        playerStats.receiving.yardsPerReception =
          playerStats.receiving.yards / playerStats.receiving.receptions;
      }
    }

    for (const playerStats of this.awayStats.playerStats.values()) {
      if (playerStats.passing.attempts > 0) {
        playerStats.passing.rating = calculatePasserRating(playerStats.passing);
      }
      if (playerStats.rushing.attempts > 0) {
        playerStats.rushing.yardsPerCarry =
          playerStats.rushing.yards / playerStats.rushing.attempts;
      }
      if (playerStats.receiving.receptions > 0) {
        playerStats.receiving.yardsPerReception =
          playerStats.receiving.yards / playerStats.receiving.receptions;
      }
    }
  }
}
