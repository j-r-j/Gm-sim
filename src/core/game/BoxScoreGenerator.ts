/**
 * Box Score Generator
 * Generates user-facing box scores from game statistics.
 * Box scores contain only visible outcome data, no engine internals.
 */

import { TeamGameStats, PlayerGameStats } from './StatisticsTracker';

/**
 * Scoring play entry
 */
export interface ScoringPlay {
  quarter: number;
  time: string;
  team: string;
  teamId: string;
  description: string;
  homeScore: number;
  awayScore: number;
}

/**
 * Player stat line for display
 */
export interface PlayerStatLine {
  playerId: string;
  playerName: string;
  position: string;
  statLine: string; // "22/31, 287 YDS, 2 TD, 1 INT"
}

/**
 * Team comparison category
 */
export interface TeamComparisonCategory {
  category: string;
  home: string | number;
  away: string | number;
}

/**
 * Complete box score for a game
 */
export interface BoxScore {
  gameId: string;
  date: string;
  week: number;

  // Teams
  homeTeam: {
    id: string;
    name: string;
    abbreviation: string;
    score: number;
    scoreByQuarter: number[];
  };
  awayTeam: {
    id: string;
    name: string;
    abbreviation: string;
    score: number;
    scoreByQuarter: number[];
  };

  // Team comparison
  teamComparison: TeamComparisonCategory[];

  // Scoring summary
  scoringSummary: ScoringPlay[];

  // Individual leaders
  passingLeaders: PlayerStatLine[];
  rushingLeaders: PlayerStatLine[];
  receivingLeaders: PlayerStatLine[];
  defensiveLeaders: PlayerStatLine[];

  // Full player stats (for detailed view)
  homePlayerStats: PlayerStatLine[];
  awayPlayerStats: PlayerStatLine[];
}

/**
 * Team info for box score generation
 */
export interface TeamInfo {
  id: string;
  name: string;
  abbreviation: string;
}

/**
 * Player info for stat lines
 */
export interface PlayerInfo {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
}

/**
 * Game info for box score
 */
export interface GameInfo {
  gameId: string;
  week: number;
  date: string;
}

/**
 * Format time of possession as MM:SS
 */
function formatTimeOfPossession(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format efficiency percentage
 */
function formatEfficiency(successes: number, attempts: number): string {
  if (attempts === 0) return '0/0 (0%)';
  const pct = Math.round((successes / attempts) * 100);
  return `${successes}/${attempts} (${pct}%)`;
}

/**
 * Generate passing stat line
 */
function generatePassingStatLine(stats: PlayerGameStats): string {
  const p = stats.passing;
  if (p.attempts === 0) return '-';
  return `${p.completions}/${p.attempts}, ${p.yards} YDS, ${p.touchdowns} TD, ${p.interceptions} INT`;
}

/**
 * Generate rushing stat line
 */
function generateRushingStatLine(stats: PlayerGameStats): string {
  const r = stats.rushing;
  if (r.attempts === 0) return '-';
  const avg = r.attempts > 0 ? (r.yards / r.attempts).toFixed(1) : '0.0';
  return `${r.attempts} CAR, ${r.yards} YDS, ${avg} AVG, ${r.touchdowns} TD`;
}

/**
 * Generate receiving stat line
 */
function generateReceivingStatLine(stats: PlayerGameStats): string {
  const r = stats.receiving;
  if (r.receptions === 0 && r.targets === 0) return '-';
  const avg = r.receptions > 0 ? (r.yards / r.receptions).toFixed(1) : '0.0';
  return `${r.receptions} REC, ${r.yards} YDS, ${avg} AVG, ${r.touchdowns} TD`;
}

/**
 * Generate defensive stat line
 */
function generateDefensiveStatLine(stats: PlayerGameStats): string {
  const d = stats.defensive;
  const parts: string[] = [];

  if (d.tackles > 0) parts.push(`${d.tackles} TKL`);
  if (d.sacks > 0) parts.push(`${d.sacks} SACK`);
  if (d.interceptions > 0) parts.push(`${d.interceptions} INT`);
  if (d.passesDefended > 0) parts.push(`${d.passesDefended} PD`);
  if (d.forcedFumbles > 0) parts.push(`${d.forcedFumbles} FF`);
  if (d.fumblesRecovered > 0) parts.push(`${d.fumblesRecovered} FR`);
  if (d.touchdowns > 0) parts.push(`${d.touchdowns} TD`);

  return parts.length > 0 ? parts.join(', ') : '-';
}

/**
 * Generate kicking stat line
 */
function generateKickingStatLine(stats: PlayerGameStats): string {
  const k = stats.kicking;
  const parts: string[] = [];

  if (k.fieldGoalAttempts > 0) {
    parts.push(`${k.fieldGoalsMade}/${k.fieldGoalAttempts} FG`);
  }
  if (k.extraPointAttempts > 0) {
    parts.push(`${k.extraPointsMade}/${k.extraPointAttempts} XP`);
  }

  return parts.length > 0 ? parts.join(', ') : '-';
}

/**
 * Get player full name from player info
 */
function getPlayerName(playerInfo: Map<string, PlayerInfo>, playerId: string): string {
  const info = playerInfo.get(playerId);
  if (!info) return 'Unknown Player';
  return `${info.firstName} ${info.lastName}`;
}

/**
 * Get player position from player info
 */
function getPlayerPosition(playerInfo: Map<string, PlayerInfo>, playerId: string): string {
  const info = playerInfo.get(playerId);
  return info?.position || '?';
}

/**
 * Extract passing leaders from team stats
 */
function extractPassingLeaders(
  teamStats: TeamGameStats,
  playerInfo: Map<string, PlayerInfo>,
  limit: number = 2
): PlayerStatLine[] {
  const leaders: PlayerStatLine[] = [];

  const sortedPlayers = Array.from(teamStats.playerStats.values())
    .filter((p) => p.passing.attempts > 0)
    .sort((a, b) => b.passing.yards - a.passing.yards);

  for (const player of sortedPlayers.slice(0, limit)) {
    leaders.push({
      playerId: player.playerId,
      playerName: getPlayerName(playerInfo, player.playerId),
      position: getPlayerPosition(playerInfo, player.playerId),
      statLine: generatePassingStatLine(player),
    });
  }

  return leaders;
}

/**
 * Extract rushing leaders from team stats
 */
function extractRushingLeaders(
  teamStats: TeamGameStats,
  playerInfo: Map<string, PlayerInfo>,
  limit: number = 3
): PlayerStatLine[] {
  const leaders: PlayerStatLine[] = [];

  const sortedPlayers = Array.from(teamStats.playerStats.values())
    .filter((p) => p.rushing.attempts > 0)
    .sort((a, b) => b.rushing.yards - a.rushing.yards);

  for (const player of sortedPlayers.slice(0, limit)) {
    leaders.push({
      playerId: player.playerId,
      playerName: getPlayerName(playerInfo, player.playerId),
      position: getPlayerPosition(playerInfo, player.playerId),
      statLine: generateRushingStatLine(player),
    });
  }

  return leaders;
}

/**
 * Extract receiving leaders from team stats
 */
function extractReceivingLeaders(
  teamStats: TeamGameStats,
  playerInfo: Map<string, PlayerInfo>,
  limit: number = 4
): PlayerStatLine[] {
  const leaders: PlayerStatLine[] = [];

  const sortedPlayers = Array.from(teamStats.playerStats.values())
    .filter((p) => p.receiving.receptions > 0)
    .sort((a, b) => b.receiving.yards - a.receiving.yards);

  for (const player of sortedPlayers.slice(0, limit)) {
    leaders.push({
      playerId: player.playerId,
      playerName: getPlayerName(playerInfo, player.playerId),
      position: getPlayerPosition(playerInfo, player.playerId),
      statLine: generateReceivingStatLine(player),
    });
  }

  return leaders;
}

/**
 * Extract defensive leaders from team stats
 */
function extractDefensiveLeaders(
  teamStats: TeamGameStats,
  playerInfo: Map<string, PlayerInfo>,
  limit: number = 4
): PlayerStatLine[] {
  const leaders: PlayerStatLine[] = [];

  // Score defensive plays (tackles + sacks*2 + ints*3 + etc.)
  const scoredPlayers = Array.from(teamStats.playerStats.values())
    .filter(
      (p) => p.defensive.tackles > 0 || p.defensive.sacks > 0 || p.defensive.interceptions > 0
    )
    .map((p) => ({
      player: p,
      score:
        p.defensive.tackles +
        p.defensive.sacks * 2 +
        p.defensive.interceptions * 3 +
        p.defensive.passesDefended +
        p.defensive.forcedFumbles * 2 +
        p.defensive.fumblesRecovered * 2 +
        p.defensive.touchdowns * 5,
    }))
    .sort((a, b) => b.score - a.score);

  for (const { player } of scoredPlayers.slice(0, limit)) {
    leaders.push({
      playerId: player.playerId,
      playerName: getPlayerName(playerInfo, player.playerId),
      position: getPlayerPosition(playerInfo, player.playerId),
      statLine: generateDefensiveStatLine(player),
    });
  }

  return leaders;
}

/**
 * Generate all player stat lines for a team
 */
function generateAllPlayerStats(
  teamStats: TeamGameStats,
  playerInfo: Map<string, PlayerInfo>
): PlayerStatLine[] {
  const stats: PlayerStatLine[] = [];

  for (const playerStat of teamStats.playerStats.values()) {
    const name = getPlayerName(playerInfo, playerStat.playerId);
    const position = getPlayerPosition(playerInfo, playerStat.playerId);

    // Determine primary stat type
    let statLine = '-';
    if (playerStat.passing.attempts > 0) {
      statLine = generatePassingStatLine(playerStat);
    } else if (playerStat.rushing.attempts > 0) {
      statLine = generateRushingStatLine(playerStat);
    } else if (playerStat.receiving.receptions > 0 || playerStat.receiving.targets > 0) {
      statLine = generateReceivingStatLine(playerStat);
    } else if (playerStat.defensive.tackles > 0 || playerStat.defensive.sacks > 0) {
      statLine = generateDefensiveStatLine(playerStat);
    } else if (
      playerStat.kicking.fieldGoalAttempts > 0 ||
      playerStat.kicking.extraPointAttempts > 0
    ) {
      statLine = generateKickingStatLine(playerStat);
    }

    if (statLine !== '-') {
      stats.push({
        playerId: playerStat.playerId,
        playerName: name,
        position,
        statLine,
      });
    }
  }

  return stats;
}

/**
 * Generate team comparison categories
 */
function generateTeamComparison(
  homeStats: TeamGameStats,
  awayStats: TeamGameStats
): TeamComparisonCategory[] {
  return [
    {
      category: 'First Downs',
      home: homeStats.firstDowns,
      away: awayStats.firstDowns,
    },
    {
      category: 'Total Yards',
      home: homeStats.totalYards,
      away: awayStats.totalYards,
    },
    {
      category: 'Passing Yards',
      home: homeStats.passingYards,
      away: awayStats.passingYards,
    },
    {
      category: 'Rushing Yards',
      home: homeStats.rushingYards,
      away: awayStats.rushingYards,
    },
    {
      category: 'Turnovers',
      home: homeStats.turnovers,
      away: awayStats.turnovers,
    },
    {
      category: 'Penalties',
      home: `${homeStats.penalties}-${homeStats.penaltyYards}`,
      away: `${awayStats.penalties}-${awayStats.penaltyYards}`,
    },
    {
      category: 'Time of Possession',
      home: formatTimeOfPossession(homeStats.timeOfPossession),
      away: formatTimeOfPossession(awayStats.timeOfPossession),
    },
    {
      category: '3rd Down',
      home: formatEfficiency(homeStats.thirdDownConversions, homeStats.thirdDownAttempts),
      away: formatEfficiency(awayStats.thirdDownConversions, awayStats.thirdDownAttempts),
    },
    {
      category: '4th Down',
      home: formatEfficiency(homeStats.fourthDownConversions, homeStats.fourthDownAttempts),
      away: formatEfficiency(awayStats.fourthDownConversions, awayStats.fourthDownAttempts),
    },
    {
      category: 'Red Zone',
      home: formatEfficiency(homeStats.redZoneTouchdowns, homeStats.redZoneAttempts),
      away: formatEfficiency(awayStats.redZoneTouchdowns, awayStats.redZoneAttempts),
    },
  ];
}

/**
 * Generate a complete box score from game statistics
 */
export function generateBoxScore(
  homeStats: TeamGameStats,
  awayStats: TeamGameStats,
  scoringPlays: ScoringPlay[],
  gameInfo: GameInfo,
  homeTeamInfo: TeamInfo,
  awayTeamInfo: TeamInfo,
  playerInfo: Map<string, PlayerInfo>
): BoxScore {
  // Combine all player info from both teams
  const allPlayerInfo = playerInfo;

  // Extract leaders from both teams combined
  const homePassingLeaders = extractPassingLeaders(homeStats, allPlayerInfo);
  const awayPassingLeaders = extractPassingLeaders(awayStats, allPlayerInfo);
  const homeRushingLeaders = extractRushingLeaders(homeStats, allPlayerInfo);
  const awayRushingLeaders = extractRushingLeaders(awayStats, allPlayerInfo);
  const homeReceivingLeaders = extractReceivingLeaders(homeStats, allPlayerInfo);
  const awayReceivingLeaders = extractReceivingLeaders(awayStats, allPlayerInfo);
  const homeDefensiveLeaders = extractDefensiveLeaders(awayStats, allPlayerInfo); // Defense stats from opposing offense
  const awayDefensiveLeaders = extractDefensiveLeaders(homeStats, allPlayerInfo);

  return {
    gameId: gameInfo.gameId,
    date: gameInfo.date,
    week: gameInfo.week,

    homeTeam: {
      id: homeTeamInfo.id,
      name: homeTeamInfo.name,
      abbreviation: homeTeamInfo.abbreviation,
      score: homeStats.score,
      scoreByQuarter: homeStats.scoreByQuarter,
    },

    awayTeam: {
      id: awayTeamInfo.id,
      name: awayTeamInfo.name,
      abbreviation: awayTeamInfo.abbreviation,
      score: awayStats.score,
      scoreByQuarter: awayStats.scoreByQuarter,
    },

    teamComparison: generateTeamComparison(homeStats, awayStats),

    scoringSummary: scoringPlays,

    passingLeaders: [...homePassingLeaders, ...awayPassingLeaders],
    rushingLeaders: [...homeRushingLeaders, ...awayRushingLeaders],
    receivingLeaders: [...homeReceivingLeaders, ...awayReceivingLeaders],
    defensiveLeaders: [...homeDefensiveLeaders, ...awayDefensiveLeaders],

    homePlayerStats: generateAllPlayerStats(homeStats, allPlayerInfo),
    awayPlayerStats: generateAllPlayerStats(awayStats, allPlayerInfo),
  };
}

/**
 * Create an empty box score
 */
export function createEmptyBoxScore(
  gameInfo: GameInfo,
  homeTeamInfo: TeamInfo,
  awayTeamInfo: TeamInfo
): BoxScore {
  return {
    gameId: gameInfo.gameId,
    date: gameInfo.date,
    week: gameInfo.week,

    homeTeam: {
      id: homeTeamInfo.id,
      name: homeTeamInfo.name,
      abbreviation: homeTeamInfo.abbreviation,
      score: 0,
      scoreByQuarter: [0, 0, 0, 0],
    },

    awayTeam: {
      id: awayTeamInfo.id,
      name: awayTeamInfo.name,
      abbreviation: awayTeamInfo.abbreviation,
      score: 0,
      scoreByQuarter: [0, 0, 0, 0],
    },

    teamComparison: [],
    scoringSummary: [],
    passingLeaders: [],
    rushingLeaders: [],
    receivingLeaders: [],
    defensiveLeaders: [],
    homePlayerStats: [],
    awayPlayerStats: [],
  };
}

/**
 * Get box score winner info
 */
export function getBoxScoreWinner(boxScore: BoxScore): {
  winnerId: string;
  loserId: string;
  isTie: boolean;
  winnerName: string;
  loserName: string;
} {
  if (boxScore.homeTeam.score === boxScore.awayTeam.score) {
    return {
      winnerId: '',
      loserId: '',
      isTie: true,
      winnerName: '',
      loserName: '',
    };
  }

  if (boxScore.homeTeam.score > boxScore.awayTeam.score) {
    return {
      winnerId: boxScore.homeTeam.id,
      loserId: boxScore.awayTeam.id,
      isTie: false,
      winnerName: boxScore.homeTeam.name,
      loserName: boxScore.awayTeam.name,
    };
  }

  return {
    winnerId: boxScore.awayTeam.id,
    loserId: boxScore.homeTeam.id,
    isTie: false,
    winnerName: boxScore.awayTeam.name,
    loserName: boxScore.homeTeam.name,
  };
}

/**
 * Format box score as a text summary
 */
export function formatBoxScoreSummary(boxScore: BoxScore): string {
  const { homeTeam, awayTeam } = boxScore;

  let summary = `${awayTeam.abbreviation} ${awayTeam.score} @ ${homeTeam.abbreviation} ${homeTeam.score}\n`;
  summary += `Week ${boxScore.week} | ${boxScore.date}\n\n`;

  // Quarter scores
  summary += 'Quarter Scores:\n';
  summary += `  ${awayTeam.abbreviation}: ${awayTeam.scoreByQuarter.join(' | ')}\n`;
  summary += `  ${homeTeam.abbreviation}: ${homeTeam.scoreByQuarter.join(' | ')}\n`;

  return summary;
}
