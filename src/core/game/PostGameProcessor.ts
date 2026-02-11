/**
 * Post-Game Processor
 * Processes game results and generates updates for persistent state,
 * including player updates, team record updates, and news events.
 */

import { GameResult, GameInjury, NotableEvent } from './GameRunner';
import { PlayerGameStats, TeamGameStats } from './StatisticsTracker';
import { WeeklyGamePlan, GamePlanEmphasis } from '../gameplan/GamePlanManager';

/**
 * Injury update for a player
 */
export interface InjuryUpdate {
  playerId: string;
  newStatus: 'healthy' | 'questionable' | 'doubtful' | 'out' | 'ir';
  weeksRemaining: number;
}

/**
 * News event generated from game
 */
export interface NewsEvent {
  headline: string;
  body: string;
  involvedPlayerIds: string[];
  involvedTeamIds: string[];
  type: 'injury' | 'performance' | 'milestone' | 'trade_rumor' | 'contract';
}

/**
 * Player update from game
 */
export interface PlayerUpdate {
  playerId: string;
  fatigueChange: number;
  moraleChange: number;
  injuryUpdate: InjuryUpdate | null;
  seasonStats: Partial<PlayerGameStats>;
}

/**
 * Team update from game
 */
export interface TeamUpdate {
  teamId: string;
  winsChange: number;
  lossesChange: number;
  tiesChange: number;
  divisionRecord: { winsChange: number; lossesChange: number };
  conferenceRecord: { winsChange: number; lossesChange: number };
  pointsFor: number;
  pointsAgainst: number;
}

/**
 * Standings update for a team
 */
export interface StandingsUpdate {
  teamId: string;
  newDivisionRank: number;
  newConferenceRank: number;
  playoffPicture: 'in' | 'out' | 'contention';
}

/**
 * Complete post-game updates
 */
export interface PostGameUpdates {
  playerUpdates: PlayerUpdate[];
  teamUpdates: TeamUpdate[];
  standingsUpdate: StandingsUpdate[];
  newsEvents: NewsEvent[];
}

/**
 * Career stats for milestone checking
 */
export interface PlayerCareerStats {
  playerId: string;
  passingYards: number;
  passingTouchdowns: number;
  rushingYards: number;
  rushingTouchdowns: number;
  receivingYards: number;
  receivingTouchdowns: number;
  sacks: number;
  interceptions: number;
  gamesPlayed: number;
}

/**
 * Calculate morale change based on game performance
 */
function calculateMoraleChange(
  playerStats: PlayerGameStats,
  teamWon: boolean,
  _wasStarter: boolean
): number {
  let moraleChange = 0;

  // Team result affects morale
  if (teamWon) {
    moraleChange += 5;
  } else {
    moraleChange -= 3;
  }

  // Good individual performance
  if (playerStats.passing.touchdowns >= 3) moraleChange += 5;
  if (playerStats.rushing.yards >= 100) moraleChange += 5;
  if (playerStats.receiving.yards >= 100) moraleChange += 5;
  if (playerStats.defensive.sacks >= 2) moraleChange += 3;
  if (playerStats.defensive.interceptions >= 1) moraleChange += 5;

  // Poor performance
  if (playerStats.passing.interceptions >= 2) moraleChange -= 5;
  if (playerStats.rushing.fumblesLost >= 1) moraleChange -= 5;

  // Clamp morale change
  return Math.max(-15, Math.min(15, moraleChange));
}

/**
 * Calculate fatigue change based on snaps played
 */
function calculateFatigueChange(playerStats: PlayerGameStats): number {
  // Base fatigue from snaps
  const snapFatigue = Math.floor(playerStats.snapsPlayed / 10);

  // Recovery between games (assume ~40 fatigue recovery)
  const netFatigue = snapFatigue - 40;

  return Math.max(-50, Math.min(30, netFatigue));
}

/**
 * Process injury into injury update
 */
function processInjury(injury: GameInjury): InjuryUpdate {
  // Determine injury status based on weeks out
  let newStatus: InjuryUpdate['newStatus'] = 'questionable';

  if (injury.weeksOut === 0) {
    newStatus = 'questionable';
  } else if (injury.weeksOut <= 1) {
    newStatus = 'doubtful';
  } else if (injury.weeksOut <= 3) {
    newStatus = 'out';
  } else {
    newStatus = 'ir';
  }

  return {
    playerId: injury.playerId,
    newStatus,
    weeksRemaining: injury.weeksOut,
  };
}

/**
 * Generate player updates from game result
 */
function generatePlayerUpdates(result: GameResult, homeTeamWon: boolean): PlayerUpdate[] {
  const updates: PlayerUpdate[] = [];

  // Process home team players
  for (const [playerId, stats] of result.homeStats.playerStats) {
    const injury = result.injuries.find((i) => i.playerId === playerId);

    updates.push({
      playerId,
      fatigueChange: calculateFatigueChange(stats),
      moraleChange: calculateMoraleChange(stats, homeTeamWon, stats.snapsPlayed > 30),
      injuryUpdate: injury ? processInjury(injury) : null,
      seasonStats: stats,
    });
  }

  // Process away team players
  for (const [playerId, stats] of result.awayStats.playerStats) {
    const injury = result.injuries.find((i) => i.playerId === playerId);

    updates.push({
      playerId,
      fatigueChange: calculateFatigueChange(stats),
      moraleChange: calculateMoraleChange(stats, !homeTeamWon, stats.snapsPlayed > 30),
      injuryUpdate: injury ? processInjury(injury) : null,
      seasonStats: stats,
    });
  }

  return updates;
}

/**
 * Generate team updates from game result
 */
function generateTeamUpdates(
  result: GameResult,
  isDivisionalGame: boolean,
  isConferenceGame: boolean
): TeamUpdate[] {
  const updates: TeamUpdate[] = [];

  const homeWins = result.homeScore > result.awayScore;
  const isTie = result.homeScore === result.awayScore;

  // Home team update
  updates.push({
    teamId: result.homeTeamId,
    winsChange: homeWins ? 1 : 0,
    lossesChange: !homeWins && !isTie ? 1 : 0,
    tiesChange: isTie ? 1 : 0,
    divisionRecord: isDivisionalGame
      ? { winsChange: homeWins ? 1 : 0, lossesChange: !homeWins && !isTie ? 1 : 0 }
      : { winsChange: 0, lossesChange: 0 },
    conferenceRecord: isConferenceGame
      ? { winsChange: homeWins ? 1 : 0, lossesChange: !homeWins && !isTie ? 1 : 0 }
      : { winsChange: 0, lossesChange: 0 },
    pointsFor: result.homeScore,
    pointsAgainst: result.awayScore,
  });

  // Away team update
  updates.push({
    teamId: result.awayTeamId,
    winsChange: !homeWins && !isTie ? 1 : 0,
    lossesChange: homeWins ? 1 : 0,
    tiesChange: isTie ? 1 : 0,
    divisionRecord: isDivisionalGame
      ? { winsChange: !homeWins && !isTie ? 1 : 0, lossesChange: homeWins ? 1 : 0 }
      : { winsChange: 0, lossesChange: 0 },
    conferenceRecord: isConferenceGame
      ? { winsChange: !homeWins && !isTie ? 1 : 0, lossesChange: homeWins ? 1 : 0 }
      : { winsChange: 0, lossesChange: 0 },
    pointsFor: result.awayScore,
    pointsAgainst: result.homeScore,
  });

  return updates;
}

/**
 * Generate injury news event
 */
function generateInjuryNews(injury: GameInjury, teamId: string): NewsEvent {
  const severityText =
    injury.weeksOut === 0
      ? 'day-to-day'
      : injury.weeksOut <= 2
        ? `${injury.weeksOut} weeks`
        : 'extended period';

  return {
    headline: `${injury.playerName} suffers injury`,
    body: `${injury.playerName} suffered a ${injury.injuryType.toLowerCase()} injury during today's game and is expected to be out for ${severityText}.`,
    involvedPlayerIds: [injury.playerId],
    involvedTeamIds: [teamId],
    type: 'injury',
  };
}

/**
 * Generate performance news event
 */
function generatePerformanceNews(
  stats: PlayerGameStats,
  playerName: string,
  teamName: string,
  teamId: string,
  won: boolean
): NewsEvent | null {
  // Check for notable passing performance
  if (stats.passing.yards >= 300 || stats.passing.touchdowns >= 4) {
    return {
      headline: `${playerName} leads ${teamName} with big passing day`,
      body: `${playerName} threw for ${stats.passing.yards} yards and ${stats.passing.touchdowns} touchdowns in ${teamName}'s ${won ? 'victory' : 'loss'} today.`,
      involvedPlayerIds: [stats.playerId],
      involvedTeamIds: [teamId],
      type: 'performance',
    };
  }

  // Check for notable rushing performance
  if (stats.rushing.yards >= 150 || stats.rushing.touchdowns >= 2) {
    return {
      headline: `${playerName} dominates on the ground`,
      body: `${playerName} rushed for ${stats.rushing.yards} yards and ${stats.rushing.touchdowns} touchdowns, powering ${teamName} to a ${won ? 'win' : 'competitive showing'}.`,
      involvedPlayerIds: [stats.playerId],
      involvedTeamIds: [teamId],
      type: 'performance',
    };
  }

  // Check for notable receiving performance
  if (stats.receiving.yards >= 150 || stats.receiving.touchdowns >= 2) {
    return {
      headline: `${playerName} has breakout receiving game`,
      body: `${playerName} caught ${stats.receiving.receptions} passes for ${stats.receiving.yards} yards and ${stats.receiving.touchdowns} touchdowns.`,
      involvedPlayerIds: [stats.playerId],
      involvedTeamIds: [teamId],
      type: 'performance',
    };
  }

  // Check for notable defensive performance
  if (stats.defensive.sacks >= 3 || stats.defensive.interceptions >= 2) {
    return {
      headline: `${playerName} wreaks havoc on defense`,
      body: `${playerName} recorded ${stats.defensive.sacks} sacks and ${stats.defensive.interceptions} interceptions in a dominant defensive performance.`,
      involvedPlayerIds: [stats.playerId],
      involvedTeamIds: [teamId],
      type: 'performance',
    };
  }

  return null;
}

/**
 * Check for notable achievements/milestones
 */
export function checkMilestones(
  playerId: string,
  gameStats: PlayerGameStats,
  careerStats: PlayerCareerStats
): NotableEvent[] {
  const events: NotableEvent[] = [];

  // Check passing milestones
  const newPassingYards = careerStats.passingYards + gameStats.passing.yards;
  const milestones = [5000, 10000, 20000, 30000, 40000, 50000];

  for (const milestone of milestones) {
    if (careerStats.passingYards < milestone && newPassingYards >= milestone) {
      events.push({
        type: 'milestone',
        playerId,
        description: `Reached ${milestone.toLocaleString()} career passing yards`,
        quarter: 0,
        time: '',
      });
    }
  }

  // Check TD milestones
  const tdMilestones = [50, 100, 150, 200, 250, 300, 350, 400];
  const newPassingTDs = careerStats.passingTouchdowns + gameStats.passing.touchdowns;

  for (const milestone of tdMilestones) {
    if (careerStats.passingTouchdowns < milestone && newPassingTDs >= milestone) {
      events.push({
        type: 'milestone',
        playerId,
        description: `Threw career touchdown pass #${milestone}`,
        quarter: 0,
        time: '',
      });
    }
  }

  // Check rushing milestones
  const newRushingYards = careerStats.rushingYards + gameStats.rushing.yards;
  const rushMilestones = [1000, 5000, 10000, 15000];

  for (const milestone of rushMilestones) {
    if (careerStats.rushingYards < milestone && newRushingYards >= milestone) {
      events.push({
        type: 'milestone',
        playerId,
        description: `Reached ${milestone.toLocaleString()} career rushing yards`,
        quarter: 0,
        time: '',
      });
    }
  }

  // Check receiving milestones
  const newReceivingYards = careerStats.receivingYards + gameStats.receiving.yards;
  const recMilestones = [1000, 5000, 10000, 15000];

  for (const milestone of recMilestones) {
    if (careerStats.receivingYards < milestone && newReceivingYards >= milestone) {
      events.push({
        type: 'milestone',
        playerId,
        description: `Reached ${milestone.toLocaleString()} career receiving yards`,
        quarter: 0,
        time: '',
      });
    }
  }

  // Check sack milestones
  const newSacks = careerStats.sacks + gameStats.defensive.sacks;
  const sackMilestones = [25, 50, 75, 100, 125, 150];

  for (const milestone of sackMilestones) {
    if (careerStats.sacks < milestone && newSacks >= milestone) {
      events.push({
        type: 'milestone',
        playerId,
        description: `Recorded career sack #${milestone}`,
        quarter: 0,
        time: '',
      });
    }
  }

  return events;
}

/**
 * Generate game-related news events
 */
export function generateGameNews(
  result: GameResult,
  homeTeamName: string,
  awayTeamName: string,
  playerNames: Map<string, string>
): NewsEvent[] {
  const newsEvents: NewsEvent[] = [];

  const homeWon = result.homeScore > result.awayScore;

  // Game summary news
  newsEvents.push({
    headline: `${homeWon ? homeTeamName : awayTeamName} defeats ${homeWon ? awayTeamName : homeTeamName}`,
    body: `Final score: ${awayTeamName} ${result.awayScore}, ${homeTeamName} ${result.homeScore}.`,
    involvedPlayerIds: [],
    involvedTeamIds: [result.homeTeamId, result.awayTeamId],
    type: 'performance',
  });

  // Injury news
  for (const injury of result.injuries) {
    const teamId = result.homeStats.playerStats.has(injury.playerId)
      ? result.homeTeamId
      : result.awayTeamId;
    newsEvents.push(generateInjuryNews(injury, teamId));
  }

  // Performance news for home team
  for (const [playerId, stats] of result.homeStats.playerStats) {
    const playerName = playerNames.get(playerId) || 'Unknown Player';
    const news = generatePerformanceNews(
      stats,
      playerName,
      homeTeamName,
      result.homeTeamId,
      homeWon
    );
    if (news) {
      newsEvents.push(news);
    }
  }

  // Performance news for away team
  for (const [playerId, stats] of result.awayStats.playerStats) {
    const playerName = playerNames.get(playerId) || 'Unknown Player';
    const news = generatePerformanceNews(
      stats,
      playerName,
      awayTeamName,
      result.awayTeamId,
      !homeWon
    );
    if (news) {
      newsEvents.push(news);
    }
  }

  return newsEvents;
}

/**
 * Process a game result and generate all updates
 */
export function processGameResult(
  result: GameResult,
  options: {
    isDivisionalGame?: boolean;
    isConferenceGame?: boolean;
    homeTeamName?: string;
    awayTeamName?: string;
    playerNames?: Map<string, string>;
  } = {}
): PostGameUpdates {
  const {
    isDivisionalGame = false,
    isConferenceGame = true,
    homeTeamName = 'Home Team',
    awayTeamName = 'Away Team',
    playerNames = new Map(),
  } = options;

  const homeWon = result.homeScore > result.awayScore;

  // Generate updates
  const playerUpdates = generatePlayerUpdates(result, homeWon);
  const teamUpdates = generateTeamUpdates(result, isDivisionalGame, isConferenceGame);

  // Generate news events
  const newsEvents = generateGameNews(result, homeTeamName, awayTeamName, playerNames);

  // Standings updates would require access to full league standings
  // For now, return empty array (to be populated by season management system)
  const standingsUpdate: StandingsUpdate[] = [];

  return {
    playerUpdates,
    teamUpdates,
    standingsUpdate,
    newsEvents,
  };
}

/**
 * Apply player updates to player objects
 */
export function applyPlayerUpdates(
  updates: PlayerUpdate[],
  getPlayer: (id: string) => { fatigue: number; morale: number } | null,
  setPlayer: (id: string, changes: { fatigue?: number; morale?: number }) => void
): void {
  for (const update of updates) {
    const player = getPlayer(update.playerId);
    if (!player) continue;

    const newFatigue = Math.max(0, Math.min(100, player.fatigue + update.fatigueChange));
    const newMorale = Math.max(0, Math.min(100, player.morale + update.moraleChange));

    setPlayer(update.playerId, {
      fatigue: newFatigue,
      morale: newMorale,
    });
  }
}

/**
 * Create empty career stats
 */
export function createEmptyCareerStats(playerId: string): PlayerCareerStats {
  return {
    playerId,
    passingYards: 0,
    passingTouchdowns: 0,
    rushingYards: 0,
    rushingTouchdowns: 0,
    receivingYards: 0,
    receivingTouchdowns: 0,
    sacks: 0,
    interceptions: 0,
    gamesPlayed: 0,
  };
}

/**
 * Update career stats with game stats
 */
export function updateCareerStats(
  career: PlayerCareerStats,
  game: PlayerGameStats
): PlayerCareerStats {
  return {
    playerId: career.playerId,
    passingYards: career.passingYards + game.passing.yards,
    passingTouchdowns: career.passingTouchdowns + game.passing.touchdowns,
    rushingYards: career.rushingYards + game.rushing.yards,
    rushingTouchdowns: career.rushingTouchdowns + game.rushing.touchdowns,
    receivingYards: career.receivingYards + game.receiving.yards,
    receivingTouchdowns: career.receivingTouchdowns + game.receiving.touchdowns,
    sacks: career.sacks + game.defensive.sacks,
    interceptions: career.interceptions + game.defensive.interceptions,
    gamesPlayed: career.gamesPlayed + (game.snapsPlayed > 0 ? 1 : 0),
  };
}

/**
 * Game plan feedback after a game
 */
export interface GamePlanFeedback {
  overallEffectiveness: 'very_effective' | 'effective' | 'neutral' | 'ineffective';
  insights: string[];
}

// -- Feedback template arrays --

const EFFECTIVE_PASS_OFFENSE_TEMPLATES = [
  'Your focus on the passing game paid dividends — {passingYards} yards through the air',
  'Extra pass reps showed results with {passingYards} passing yards',
];

const INEFFECTIVE_PASS_OFFENSE_TEMPLATES = [
  'Despite emphasizing the passing game, only {passingYards} yards through the air',
  "The passing focus didn't translate — only {passingYards} passing yards",
];

const EFFECTIVE_RUSH_OFFENSE_TEMPLATES = [
  'The ground game was dominant — {rushingYards} rushing yards',
  'Pounding the rock worked with {rushingYards} yards on the ground',
];

const INEFFECTIVE_RUSH_OFFENSE_TEMPLATES = [
  'Despite emphasizing the run game, the ground attack only managed {rushingYards} yards',
  "The rushing focus didn't translate — only {rushingYards} yards on the ground",
];

const EFFECTIVE_PASS_DEFENSE_TEMPLATES = [
  'Your pass defense focus held them to just {oppPassingYards} passing yards',
  'Secondary preparation paid off — opponents managed only {oppPassingYards} through the air',
];

const INEFFECTIVE_PASS_DEFENSE_TEMPLATES = [
  'Despite focusing on pass defense, they threw for {oppPassingYards} yards',
  "Pass coverage prep wasn't enough — {oppPassingYards} passing yards allowed",
];

const EFFECTIVE_RUSH_DEFENSE_TEMPLATES = [
  'Run defense preparation worked — held them to {oppRushingYards} rushing yards',
  'Your emphasis on stopping the run paid off with only {oppRushingYards} yards allowed',
];

const INEFFECTIVE_RUSH_DEFENSE_TEMPLATES = [
  'Despite focusing on run defense, they ran for {oppRushingYards} yards',
  'Run defense prep fell short — {oppRushingYards} rushing yards allowed',
];

const CONDITIONING_EFFECTIVE_TEMPLATES = [
  'Smart rotation management — your starters stayed fresh throughout',
  'Conditioning focus paid off with strong fourth quarter play',
];

const EMPHASIS_EFFECTIVE_TEMPLATES: Partial<Record<GamePlanEmphasis, string[]>> = {
  attackWeakSecondary: [
    'Targeting their secondary worked — {passingYards} passing yards',
    'You exposed their weak secondary for {passingYards} yards through the air',
  ],
  attackWeakFront: [
    'Running at their weak front seven produced {rushingYards} rushing yards',
    "Their defensive front couldn't handle your ground game — {rushingYards} yards",
  ],
  establishRun: [
    'Ball control approach worked — {rushingYards} rushing yards and clock management',
    'Establishing the run set the tone with {rushingYards} yards on the ground',
  ],
  blitzHeavy: [
    'Aggressive blitzing rattled their QB — {sacks} sacks on the day',
    'The blitz-heavy approach generated {sacks} sacks',
  ],
  coverageShells: [
    'Conservative coverage limited their big plays to {oppPassingYards} passing yards',
    'Playing coverage shells kept them in check — {oppPassingYards} passing yards allowed',
  ],
  ballControl: [
    'Ball control strategy kept turnovers low with only {turnovers} giveaways',
    'Protecting the football worked — just {turnovers} turnovers',
  ],
};

/**
 * Pick a random template and fill in stat placeholders
 */
function fillTemplate(templates: string[], stats: Record<string, string | number>): string {
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template.replace(/\{(\w+)\}/g, (_, key) => String(stats[key] ?? '?'));
}

/**
 * Generate post-game feedback about how well the game plan worked
 */
export function generateGamePlanFeedback(
  gamePlan: WeeklyGamePlan | null,
  gameResult: GameResult,
  teamId: string
): GamePlanFeedback {
  // No game plan set
  if (!gamePlan || !gamePlan.isSet) {
    return {
      overallEffectiveness: 'neutral',
      insights: ['No specific game plan was set for this game.'],
    };
  }

  const isHome = gameResult.homeTeamId === teamId;
  const teamStats: TeamGameStats = isHome ? gameResult.homeStats : gameResult.awayStats;
  const oppStats: TeamGameStats = isHome ? gameResult.awayStats : gameResult.homeStats;

  const insights: string[] = [];
  let positiveCount = 0;
  let totalChecked = 0;

  const baseline = 12.5;
  const stats = {
    passingYards: teamStats.passingYards,
    rushingYards: teamStats.rushingYards,
    oppPassingYards: oppStats.passingYards,
    oppRushingYards: oppStats.rushingYards,
    turnovers: teamStats.turnovers,
    sacks: 0,
  };

  // Sum sacks from player stats
  for (const [, playerStats] of teamStats.playerStats) {
    stats.sacks += playerStats.defensive.sacks;
  }

  // Check pass offense focus
  if (gamePlan.practiceFocus.passOffense > baseline + 5) {
    totalChecked++;
    if (teamStats.passingYards >= 220) {
      positiveCount++;
      insights.push(fillTemplate(EFFECTIVE_PASS_OFFENSE_TEMPLATES, stats));
    } else {
      insights.push(fillTemplate(INEFFECTIVE_PASS_OFFENSE_TEMPLATES, stats));
    }
  }

  // Check rush offense focus
  if (gamePlan.practiceFocus.rushOffense > baseline + 5) {
    totalChecked++;
    if (teamStats.rushingYards >= 110) {
      positiveCount++;
      insights.push(fillTemplate(EFFECTIVE_RUSH_OFFENSE_TEMPLATES, stats));
    } else {
      insights.push(fillTemplate(INEFFECTIVE_RUSH_OFFENSE_TEMPLATES, stats));
    }
  }

  // Check pass defense focus
  if (gamePlan.practiceFocus.passDefense > baseline + 5) {
    totalChecked++;
    if (oppStats.passingYards <= 200) {
      positiveCount++;
      insights.push(fillTemplate(EFFECTIVE_PASS_DEFENSE_TEMPLATES, stats));
    } else {
      insights.push(fillTemplate(INEFFECTIVE_PASS_DEFENSE_TEMPLATES, stats));
    }
  }

  // Check rush defense focus
  if (gamePlan.practiceFocus.rushDefense > baseline + 5) {
    totalChecked++;
    if (oppStats.rushingYards <= 90) {
      positiveCount++;
      insights.push(fillTemplate(EFFECTIVE_RUSH_DEFENSE_TEMPLATES, stats));
    } else {
      insights.push(fillTemplate(INEFFECTIVE_RUSH_DEFENSE_TEMPLATES, stats));
    }
  }

  // Check conditioning focus
  if (gamePlan.practiceFocus.conditioning > 15) {
    totalChecked++;
    const teamInjuries = gameResult.injuries.filter((inj) => {
      if (isHome) {
        return gameResult.homeStats.playerStats.has(inj.playerId);
      }
      return gameResult.awayStats.playerStats.has(inj.playerId);
    });
    if (teamInjuries.length === 0) {
      positiveCount++;
      insights.push(fillTemplate(CONDITIONING_EFFECTIVE_TEMPLATES, stats));
    }
  }

  // Check emphasis-specific feedback
  if (gamePlan.gamePlanEmphasis !== 'balanced') {
    const emphasisTemplates = EMPHASIS_EFFECTIVE_TEMPLATES[gamePlan.gamePlanEmphasis];
    if (emphasisTemplates) {
      totalChecked++;
      let emphasisWorked = false;

      switch (gamePlan.gamePlanEmphasis) {
        case 'attackWeakSecondary':
          emphasisWorked = teamStats.passingYards >= 250;
          break;
        case 'attackWeakFront':
        case 'establishRun':
          emphasisWorked = teamStats.rushingYards >= 120;
          break;
        case 'blitzHeavy':
          emphasisWorked = stats.sacks >= 3;
          break;
        case 'coverageShells':
          emphasisWorked = oppStats.passingYards <= 180;
          break;
        case 'ballControl':
          emphasisWorked = teamStats.turnovers <= 1;
          break;
      }

      if (emphasisWorked) {
        positiveCount++;
        insights.push(fillTemplate(emphasisTemplates, stats));
      }
    }
  }

  // If no specific focus areas were above threshold, provide generic feedback
  if (insights.length === 0) {
    const won = isHome
      ? gameResult.homeScore > gameResult.awayScore
      : gameResult.awayScore > gameResult.homeScore;
    insights.push(
      won
        ? 'Your balanced game plan allowed the team to execute across the board.'
        : "The balanced approach didn't give your team a clear edge today."
    );
  }

  // Cap at 4 insights
  const finalInsights = insights.slice(0, 4);

  // Determine overall effectiveness
  let overallEffectiveness: GamePlanFeedback['overallEffectiveness'];
  if (totalChecked === 0) {
    overallEffectiveness = 'neutral';
  } else {
    const ratio = positiveCount / totalChecked;
    if (ratio >= 0.75) {
      overallEffectiveness = 'very_effective';
    } else if (ratio >= 0.5) {
      overallEffectiveness = 'effective';
    } else if (ratio >= 0.25) {
      overallEffectiveness = 'neutral';
    } else {
      overallEffectiveness = 'ineffective';
    }
  }

  return {
    overallEffectiveness,
    insights: finalInsights,
  };
}
