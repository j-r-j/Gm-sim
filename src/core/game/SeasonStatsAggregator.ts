/**
 * Season Stats Aggregator
 * Aggregates game statistics into season totals for players and teams.
 * Calculates league rankings and derived statistics.
 */

import {
  PlayerGameStats,
  PassingStats,
  RushingStats,
  ReceivingStats,
  DefensiveStats,
  KickingStats,
  createEmptyPassingStats,
  createEmptyRushingStats,
  createEmptyReceivingStats,
  createEmptyDefensiveStats,
  createEmptyKickingStats,
  calculatePasserRating,
} from './StatisticsTracker';
import { GameResult } from './GameRunner';

/**
 * Player season statistics
 */
export interface PlayerSeasonStats {
  playerId: string;
  gamesPlayed: number;
  gamesStarted: number;

  // Cumulative stats
  passing: PassingStats;
  rushing: RushingStats;
  receiving: ReceivingStats;
  defensive: DefensiveStats;
  kicking: KickingStats;

  // Calculated values
  fantasyPoints: number; // For comparison purposes
  approximateValue: number; // Hidden, for AI evaluation
}

/**
 * Team season statistics
 */
export interface TeamSeasonStats {
  teamId: string;
  gamesPlayed: number;

  // Cumulative
  pointsFor: number;
  pointsAgainst: number;
  totalYards: number;
  yardsAllowed: number;
  turnoversForced: number;
  turnoversCommitted: number;

  // Averages
  pointsPerGame: number;
  yardsPerGame: number;
  pointsAllowedPerGame: number;
  yardsAllowedPerGame: number;

  // Rankings (calculated)
  offenseRank: number;
  defenseRank: number;
}

/**
 * League rankings for a team
 */
export interface TeamRankings {
  offenseRank: number;
  defenseRank: number;
  pointsForRank: number;
  pointsAgainstRank: number;
}

/**
 * Create empty player season stats
 */
export function createEmptyPlayerSeasonStats(playerId: string): PlayerSeasonStats {
  return {
    playerId,
    gamesPlayed: 0,
    gamesStarted: 0,
    passing: createEmptyPassingStats(),
    rushing: createEmptyRushingStats(),
    receiving: createEmptyReceivingStats(),
    defensive: createEmptyDefensiveStats(),
    kicking: createEmptyKickingStats(),
    fantasyPoints: 0,
    approximateValue: 0,
  };
}

/**
 * Create empty team season stats
 */
export function createEmptyTeamSeasonStats(teamId: string): TeamSeasonStats {
  return {
    teamId,
    gamesPlayed: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    totalYards: 0,
    yardsAllowed: 0,
    turnoversForced: 0,
    turnoversCommitted: 0,
    pointsPerGame: 0,
    yardsPerGame: 0,
    pointsAllowedPerGame: 0,
    yardsAllowedPerGame: 0,
    offenseRank: 0,
    defenseRank: 0,
  };
}

/**
 * Add passing stats
 */
function addPassingStats(season: PassingStats, game: PassingStats): PassingStats {
  return {
    attempts: season.attempts + game.attempts,
    completions: season.completions + game.completions,
    yards: season.yards + game.yards,
    touchdowns: season.touchdowns + game.touchdowns,
    interceptions: season.interceptions + game.interceptions,
    sacks: season.sacks + game.sacks,
    sackYardsLost: season.sackYardsLost + game.sackYardsLost,
    longestPass: Math.max(season.longestPass, game.longestPass),
    rating: 0, // Recalculated after aggregation
  };
}

/**
 * Add rushing stats
 */
function addRushingStats(season: RushingStats, game: RushingStats): RushingStats {
  const totalAttempts = season.attempts + game.attempts;
  const totalYards = season.yards + game.yards;

  return {
    attempts: totalAttempts,
    yards: totalYards,
    touchdowns: season.touchdowns + game.touchdowns,
    fumbles: season.fumbles + game.fumbles,
    fumblesLost: season.fumblesLost + game.fumblesLost,
    longestRush: Math.max(season.longestRush, game.longestRush),
    yardsPerCarry: totalAttempts > 0 ? totalYards / totalAttempts : 0,
  };
}

/**
 * Add receiving stats
 */
function addReceivingStats(season: ReceivingStats, game: ReceivingStats): ReceivingStats {
  const totalReceptions = season.receptions + game.receptions;
  const totalYards = season.yards + game.yards;

  return {
    targets: season.targets + game.targets,
    receptions: totalReceptions,
    yards: totalYards,
    touchdowns: season.touchdowns + game.touchdowns,
    longestReception: Math.max(season.longestReception, game.longestReception),
    yardsPerReception: totalReceptions > 0 ? totalYards / totalReceptions : 0,
    drops: season.drops + game.drops,
  };
}

/**
 * Add defensive stats
 */
function addDefensiveStats(season: DefensiveStats, game: DefensiveStats): DefensiveStats {
  return {
    tackles: season.tackles + game.tackles,
    tacklesForLoss: season.tacklesForLoss + game.tacklesForLoss,
    sacks: season.sacks + game.sacks,
    interceptions: season.interceptions + game.interceptions,
    passesDefended: season.passesDefended + game.passesDefended,
    forcedFumbles: season.forcedFumbles + game.forcedFumbles,
    fumblesRecovered: season.fumblesRecovered + game.fumblesRecovered,
    touchdowns: season.touchdowns + game.touchdowns,
  };
}

/**
 * Add kicking stats
 */
function addKickingStats(season: KickingStats, game: KickingStats): KickingStats {
  return {
    fieldGoalAttempts: season.fieldGoalAttempts + game.fieldGoalAttempts,
    fieldGoalsMade: season.fieldGoalsMade + game.fieldGoalsMade,
    longestFieldGoal: Math.max(season.longestFieldGoal, game.longestFieldGoal),
    extraPointAttempts: season.extraPointAttempts + game.extraPointAttempts,
    extraPointsMade: season.extraPointsMade + game.extraPointsMade,
  };
}

/**
 * Calculate fantasy points for a game
 * Uses PPR (Point Per Reception) scoring
 */
function calculateFantasyPoints(stats: PlayerGameStats): number {
  let points = 0;

  // Passing: 0.04 pts/yard, 4 pts/TD, -2 pts/INT
  points += stats.passing.yards * 0.04;
  points += stats.passing.touchdowns * 4;
  points -= stats.passing.interceptions * 2;

  // Rushing: 0.1 pts/yard, 6 pts/TD
  points += stats.rushing.yards * 0.1;
  points += stats.rushing.touchdowns * 6;
  points -= stats.rushing.fumblesLost * 2;

  // Receiving: 1 pt/reception, 0.1 pts/yard, 6 pts/TD
  points += stats.receiving.receptions * 1;
  points += stats.receiving.yards * 0.1;
  points += stats.receiving.touchdowns * 6;

  // Kicking: 3 pts/FG, 1 pt/XP
  points += stats.kicking.fieldGoalsMade * 3;
  points += stats.kicking.extraPointsMade * 1;

  // Defense: 1 pt/sack, 2 pts/INT, 2 pts/fumble recovery, 6 pts/TD
  points += stats.defensive.sacks * 1;
  points += stats.defensive.interceptions * 2;
  points += stats.defensive.fumblesRecovered * 2;
  points += stats.defensive.touchdowns * 6;

  return Math.round(points * 10) / 10;
}

/**
 * Calculate approximate value (hidden metric for AI evaluation)
 * Based on Pro Football Reference's AV formula
 */
function calculateApproximateValue(stats: PlayerSeasonStats): number {
  let av = 0;

  // Passing contribution
  if (stats.passing.attempts > 0) {
    const passValue =
      (stats.passing.yards * 0.02 +
        stats.passing.touchdowns * 2 -
        stats.passing.interceptions * 2) /
      10;
    av += Math.max(0, passValue);
  }

  // Rushing contribution
  if (stats.rushing.attempts > 0) {
    const rushValue =
      (stats.rushing.yards * 0.04 + stats.rushing.touchdowns * 2 - stats.rushing.fumblesLost * 2) /
      10;
    av += Math.max(0, rushValue);
  }

  // Receiving contribution
  if (stats.receiving.receptions > 0) {
    const recValue = (stats.receiving.yards * 0.04 + stats.receiving.touchdowns * 2) / 10;
    av += Math.max(0, recValue);
  }

  // Defensive contribution
  const defValue =
    (stats.defensive.tackles * 0.3 +
      stats.defensive.sacks * 2 +
      stats.defensive.interceptions * 3 +
      stats.defensive.forcedFumbles * 1.5 +
      stats.defensive.touchdowns * 5) /
    10;
  av += Math.max(0, defValue);

  // Kicking contribution
  if (stats.kicking.fieldGoalAttempts > 0) {
    const accuracy = stats.kicking.fieldGoalsMade / stats.kicking.fieldGoalAttempts;
    const kickValue = (stats.kicking.fieldGoalsMade * accuracy * 3) / 10;
    av += Math.max(0, kickValue);
  }

  // Games played factor
  if (stats.gamesPlayed > 0) {
    av *= stats.gamesPlayed / 17; // Scale to full season
  }

  return Math.round(av * 10) / 10;
}

/**
 * Aggregate player stats from multiple games
 */
export function aggregatePlayerStats(gameStats: PlayerGameStats[]): PlayerSeasonStats {
  if (gameStats.length === 0) {
    return createEmptyPlayerSeasonStats('');
  }

  const playerId = gameStats[0].playerId;
  let season = createEmptyPlayerSeasonStats(playerId);

  let gamesStarted = 0;
  let totalFantasyPoints = 0;

  for (const game of gameStats) {
    season.gamesPlayed++;

    // Count as start if significant snaps
    if (game.snapsPlayed >= 30) {
      gamesStarted++;
    }

    // Aggregate all stat categories
    season.passing = addPassingStats(season.passing, game.passing);
    season.rushing = addRushingStats(season.rushing, game.rushing);
    season.receiving = addReceivingStats(season.receiving, game.receiving);
    season.defensive = addDefensiveStats(season.defensive, game.defensive);
    season.kicking = addKickingStats(season.kicking, game.kicking);

    // Calculate fantasy points
    totalFantasyPoints += calculateFantasyPoints(game);
  }

  season.gamesStarted = gamesStarted;
  season.fantasyPoints = Math.round(totalFantasyPoints * 10) / 10;

  // Recalculate passer rating with full season stats
  if (season.passing.attempts > 0) {
    season.passing.rating = calculatePasserRating(season.passing);
  }

  // Calculate approximate value
  season.approximateValue = calculateApproximateValue(season);

  return season;
}

/**
 * Aggregate team stats from game results
 */
export function aggregateTeamStats(gameResults: GameResult[], teamId: string): TeamSeasonStats {
  const stats = createEmptyTeamSeasonStats(teamId);

  for (const result of gameResults) {
    const isHome = result.homeTeamId === teamId;
    const teamStats = isHome ? result.homeStats : result.awayStats;
    const oppStats = isHome ? result.awayStats : result.homeStats;

    stats.gamesPlayed++;
    stats.pointsFor += teamStats.score;
    stats.pointsAgainst += oppStats.score;
    stats.totalYards += teamStats.totalYards;
    stats.yardsAllowed += oppStats.totalYards;
    stats.turnoversCommitted += teamStats.turnovers;
    stats.turnoversForced += oppStats.turnovers;
  }

  // Calculate averages
  if (stats.gamesPlayed > 0) {
    stats.pointsPerGame = Math.round((stats.pointsFor / stats.gamesPlayed) * 10) / 10;
    stats.yardsPerGame = Math.round((stats.totalYards / stats.gamesPlayed) * 10) / 10;
    stats.pointsAllowedPerGame = Math.round((stats.pointsAgainst / stats.gamesPlayed) * 10) / 10;
    stats.yardsAllowedPerGame = Math.round((stats.yardsAllowed / stats.gamesPlayed) * 10) / 10;
  }

  return stats;
}

/**
 * Calculate league rankings for all teams
 */
export function calculateLeagueRankings(teamStats: TeamSeasonStats[]): Map<string, TeamRankings> {
  const rankings = new Map<string, TeamRankings>();

  if (teamStats.length === 0) {
    return rankings;
  }

  // Sort by different metrics
  const byPointsFor = [...teamStats].sort((a, b) => b.pointsPerGame - a.pointsPerGame);
  const byPointsAgainst = [...teamStats].sort(
    (a, b) => a.pointsAllowedPerGame - b.pointsAllowedPerGame
  );
  const byYards = [...teamStats].sort((a, b) => b.yardsPerGame - a.yardsPerGame);
  const byYardsAllowed = [...teamStats].sort(
    (a, b) => a.yardsAllowedPerGame - b.yardsAllowedPerGame
  );

  // Assign rankings
  for (const team of teamStats) {
    const offenseRank = byYards.findIndex((t) => t.teamId === team.teamId) + 1;
    const defenseRank = byYardsAllowed.findIndex((t) => t.teamId === team.teamId) + 1;
    const pointsForRank = byPointsFor.findIndex((t) => t.teamId === team.teamId) + 1;
    const pointsAgainstRank = byPointsAgainst.findIndex((t) => t.teamId === team.teamId) + 1;

    rankings.set(team.teamId, {
      offenseRank,
      defenseRank,
      pointsForRank,
      pointsAgainstRank,
    });
  }

  return rankings;
}

/**
 * Apply rankings to team stats
 */
export function applyRankingsToTeamStats(
  teamStats: TeamSeasonStats[],
  rankings: Map<string, TeamRankings>
): TeamSeasonStats[] {
  return teamStats.map((stats) => {
    const ranking = rankings.get(stats.teamId);
    if (ranking) {
      return {
        ...stats,
        offenseRank: ranking.offenseRank,
        defenseRank: ranking.defenseRank,
      };
    }
    return stats;
  });
}

/**
 * Get league leaders for a stat category
 */
export function getLeagueLeaders(
  playerStats: PlayerSeasonStats[],
  category: 'passing' | 'rushing' | 'receiving' | 'sacks' | 'interceptions',
  limit: number = 10
): { playerId: string; value: number }[] {
  let sorted: { playerId: string; value: number }[];

  switch (category) {
    case 'passing':
      sorted = playerStats
        .filter((p) => p.passing.attempts >= 100)
        .map((p) => ({ playerId: p.playerId, value: p.passing.yards }))
        .sort((a, b) => b.value - a.value);
      break;

    case 'rushing':
      sorted = playerStats
        .filter((p) => p.rushing.attempts >= 50)
        .map((p) => ({ playerId: p.playerId, value: p.rushing.yards }))
        .sort((a, b) => b.value - a.value);
      break;

    case 'receiving':
      sorted = playerStats
        .filter((p) => p.receiving.receptions >= 20)
        .map((p) => ({ playerId: p.playerId, value: p.receiving.yards }))
        .sort((a, b) => b.value - a.value);
      break;

    case 'sacks':
      sorted = playerStats
        .map((p) => ({ playerId: p.playerId, value: p.defensive.sacks }))
        .sort((a, b) => b.value - a.value);
      break;

    case 'interceptions':
      sorted = playerStats
        .map((p) => ({ playerId: p.playerId, value: p.defensive.interceptions }))
        .sort((a, b) => b.value - a.value);
      break;

    default:
      sorted = [];
  }

  return sorted.slice(0, limit);
}

/**
 * Calculate passer rating leaders
 */
export function getPasserRatingLeaders(
  playerStats: PlayerSeasonStats[],
  minAttempts: number = 100,
  limit: number = 10
): { playerId: string; rating: number }[] {
  return playerStats
    .filter((p) => p.passing.attempts >= minAttempts)
    .map((p) => ({ playerId: p.playerId, rating: p.passing.rating }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

/**
 * Calculate yards per carry leaders
 */
export function getYardsPerCarryLeaders(
  playerStats: PlayerSeasonStats[],
  minAttempts: number = 50,
  limit: number = 10
): { playerId: string; ypc: number }[] {
  return playerStats
    .filter((p) => p.rushing.attempts >= minAttempts)
    .map((p) => ({ playerId: p.playerId, ypc: p.rushing.yardsPerCarry }))
    .sort((a, b) => b.ypc - a.ypc)
    .slice(0, limit);
}

/**
 * Calculate yards per reception leaders
 */
export function getYardsPerReceptionLeaders(
  playerStats: PlayerSeasonStats[],
  minReceptions: number = 20,
  limit: number = 10
): { playerId: string; ypr: number }[] {
  return playerStats
    .filter((p) => p.receiving.receptions >= minReceptions)
    .map((p) => ({ playerId: p.playerId, ypr: p.receiving.yardsPerReception }))
    .sort((a, b) => b.ypr - a.ypr)
    .slice(0, limit);
}

/**
 * Get top fantasy performers
 */
export function getFantasyLeaders(
  playerStats: PlayerSeasonStats[],
  limit: number = 20
): { playerId: string; fantasyPoints: number }[] {
  return playerStats
    .map((p) => ({ playerId: p.playerId, fantasyPoints: p.fantasyPoints }))
    .sort((a, b) => b.fantasyPoints - a.fantasyPoints)
    .slice(0, limit);
}

/**
 * Get players with highest approximate value (for AI evaluation)
 * This is a hidden metric not shown to users
 */
export function getApproximateValueLeaders(
  playerStats: PlayerSeasonStats[],
  limit: number = 50
): { playerId: string; av: number }[] {
  return playerStats
    .map((p) => ({ playerId: p.playerId, av: p.approximateValue }))
    .sort((a, b) => b.av - a.av)
    .slice(0, limit);
}
