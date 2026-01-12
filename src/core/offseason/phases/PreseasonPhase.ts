/**
 * Preseason Phase (Phase 10)
 * Handles 3 preseason exhibition games and player evaluations
 */

import {
  OffSeasonState,
  addEvent,
  completeTask,
} from '../OffSeasonPhaseManager';

/**
 * Preseason game result
 */
export interface PreseasonGame {
  gameNumber: number; // 1, 2, or 3
  opponent: string;
  isHome: boolean;
  teamScore: number;
  opponentScore: number;
  result: 'win' | 'loss' | 'tie';
  playerPerformances: PreseasonPlayerPerformance[];
  injuries: PreseasonInjury[];
  highlights: string[];
}

/**
 * Player performance in preseason game
 */
export interface PreseasonPlayerPerformance {
  playerId: string;
  playerName: string;
  position: string;
  snaps: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  stats: Record<string, number>;
  notes: string[];
  rosterImpact: 'lock' | 'bubble' | 'cut_candidate' | 'practice_squad';
}

/**
 * Preseason injury
 */
export interface PreseasonInjury {
  playerId: string;
  playerName: string;
  position: string;
  gameNumber: number;
  injuryType: string;
  severity: 'minor' | 'moderate' | 'serious' | 'season_ending';
  missedTime: string;
}

/**
 * Preseason evaluation summary
 */
export interface PreseasonEvaluation {
  playerId: string;
  playerName: string;
  position: string;
  gamesPlayed: number;
  totalSnaps: number;
  avgGrade: number;
  trend: 'improving' | 'steady' | 'declining';
  rosterProjection: 'lock' | 'bubble' | 'cut_candidate' | 'practice_squad';
  keyMoments: string[];
  recommendation: string;
}

/**
 * Preseason summary
 */
export interface PreseasonSummary {
  year: number;
  record: { wins: number; losses: number; ties: number };
  games: PreseasonGame[];
  evaluations: PreseasonEvaluation[];
  standouts: PreseasonEvaluation[];
  cutCandidates: PreseasonEvaluation[];
  injuries: PreseasonInjury[];
}

/**
 * Simulates a preseason game
 */
export function simulatePreseasonGame(
  gameNumber: number,
  opponent: string,
  isHome: boolean,
  rosterPlayers: Array<{
    playerId: string;
    playerName: string;
    position: string;
    overallRating: number;
    isStarter: boolean;
  }>
): PreseasonGame {
  // Determine snaps based on game number and starter status
  const snapDistribution: Record<number, { starter: number; backup: number }> = {
    1: { starter: 15, backup: 35 },
    2: { starter: 25, backup: 40 },
    3: { starter: 5, backup: 50 },
  };

  const distribution = snapDistribution[gameNumber] || { starter: 20, backup: 35 };

  const playerPerformances: PreseasonPlayerPerformance[] = [];
  const injuries: PreseasonInjury[] = [];

  for (const player of rosterPlayers) {
    const snaps = player.isStarter ? distribution.starter : distribution.backup;
    if (snaps === 0) continue;

    // Generate performance
    const variance = Math.random() * 20 - 10;
    const performanceScore = Math.min(100, Math.max(0, player.overallRating + variance));

    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'C';
    if (performanceScore >= 85) grade = 'A';
    else if (performanceScore >= 75) grade = 'B';
    else if (performanceScore >= 60) grade = 'C';
    else if (performanceScore >= 45) grade = 'D';
    else grade = 'F';

    // Determine roster impact
    let rosterImpact: 'lock' | 'bubble' | 'cut_candidate' | 'practice_squad' = 'bubble';
    if (player.isStarter) rosterImpact = 'lock';
    else if (grade === 'A' || grade === 'B') rosterImpact = 'bubble';
    else if (grade === 'C') rosterImpact = 'practice_squad';
    else rosterImpact = 'cut_candidate';

    playerPerformances.push({
      playerId: player.playerId,
      playerName: player.playerName,
      position: player.position,
      snaps,
      grade,
      stats: generatePreseasonStats(player.position, snaps),
      notes: generatePerformanceNotes(grade),
      rosterImpact,
    });

    // Injury chance (higher for more snaps)
    const injuryChance = 0.02 * (snaps / 50);
    if (Math.random() < injuryChance) {
      injuries.push(generatePreseasonInjury(player, gameNumber));
    }
  }

  // Simulate score
  const teamBase = 10 + Math.floor(Math.random() * 20);
  const oppBase = 10 + Math.floor(Math.random() * 20);
  const teamScore = teamBase + Math.floor(Math.random() * 7) * 3;
  const opponentScore = oppBase + Math.floor(Math.random() * 7) * 3;

  const result: 'win' | 'loss' | 'tie' =
    teamScore > opponentScore ? 'win' : teamScore < opponentScore ? 'loss' : 'tie';

  return {
    gameNumber,
    opponent,
    isHome,
    teamScore,
    opponentScore,
    result,
    playerPerformances,
    injuries,
    highlights: generateGameHighlights(playerPerformances),
  };
}

/**
 * Generates preseason stats based on position
 */
function generatePreseasonStats(position: string, snaps: number): Record<string, number> {
  const stats: Record<string, number> = { snaps };

  switch (position) {
    case 'QB':
      stats.completions = Math.floor(snaps / 4);
      stats.attempts = Math.floor(snaps / 3);
      stats.yards = stats.completions * (5 + Math.floor(Math.random() * 10));
      stats.touchdowns = Math.random() < 0.3 ? 1 : 0;
      stats.interceptions = Math.random() < 0.15 ? 1 : 0;
      break;
    case 'RB':
      stats.carries = Math.floor(snaps / 5);
      stats.rushYards = stats.carries * (2 + Math.floor(Math.random() * 5));
      stats.receptions = Math.floor(snaps / 15);
      break;
    case 'WR':
    case 'TE':
      stats.targets = Math.floor(snaps / 8);
      stats.receptions = Math.floor(stats.targets * 0.6);
      stats.yards = stats.receptions * (8 + Math.floor(Math.random() * 8));
      break;
    default:
      stats.tackles = Math.floor(snaps / 10);
      stats.assists = Math.floor(snaps / 15);
  }

  return stats;
}

/**
 * Generates performance notes based on grade
 */
function generatePerformanceNotes(grade: 'A' | 'B' | 'C' | 'D' | 'F'): string[] {
  const notes: Record<typeof grade, string[]> = {
    A: [
      'Dominant performance',
      'Making a strong case for the roster',
      'Exceeded all expectations',
    ],
    B: [
      'Solid showing',
      'Did his job well',
      'Showed improvement from camp',
    ],
    C: [
      'Average performance',
      'Nothing notable good or bad',
      'Needs to show more',
    ],
    D: [
      'Struggled in key situations',
      'Made mental errors',
      'Not NFL ready yet',
    ],
    F: [
      'Poor performance throughout',
      'Major concerns moving forward',
      'Cut candidate after tonight',
    ],
  };

  const options = notes[grade];
  return [options[Math.floor(Math.random() * options.length)]];
}

/**
 * Generates preseason injury
 */
function generatePreseasonInjury(
  player: { playerId: string; playerName: string; position: string },
  gameNumber: number
): PreseasonInjury {
  const injuryTypes = [
    { type: 'Hamstring strain', severity: 'minor' as const, time: '1-2 weeks' },
    { type: 'Ankle sprain', severity: 'minor' as const, time: '1 week' },
    { type: 'Shoulder stinger', severity: 'minor' as const, time: 'Day-to-day' },
    { type: 'Knee sprain', severity: 'moderate' as const, time: '2-4 weeks' },
    { type: 'Concussion', severity: 'moderate' as const, time: 'Protocol' },
    { type: 'ACL tear', severity: 'season_ending' as const, time: 'Season' },
  ];

  // Weight towards minor injuries
  const weights = [0.3, 0.25, 0.2, 0.15, 0.07, 0.03];
  const roll = Math.random();
  let cumulative = 0;
  let selected = injuryTypes[0];

  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (roll < cumulative) {
      selected = injuryTypes[i];
      break;
    }
  }

  return {
    playerId: player.playerId,
    playerName: player.playerName,
    position: player.position,
    gameNumber,
    injuryType: selected.type,
    severity: selected.severity,
    missedTime: selected.time,
  };
}

/**
 * Generates game highlights
 */
function generateGameHighlights(performances: PreseasonPlayerPerformance[]): string[] {
  const highlights: string[] = [];
  const standouts = performances.filter((p) => p.grade === 'A');

  for (const standout of standouts.slice(0, 3)) {
    highlights.push(`${standout.playerName} (${standout.position}) with an outstanding game`);
  }

  return highlights;
}

/**
 * Creates preseason evaluation
 */
export function createPreseasonEvaluation(
  playerId: string,
  playerName: string,
  position: string,
  performances: PreseasonPlayerPerformance[]
): PreseasonEvaluation {
  const gamesPlayed = performances.length;
  const totalSnaps = performances.reduce((sum, p) => sum + p.snaps, 0);

  const gradeValues = { A: 95, B: 80, C: 65, D: 45, F: 25 };
  const avgGrade =
    performances.reduce((sum, p) => sum + gradeValues[p.grade], 0) / gamesPlayed;

  // Determine trend
  let trend: 'improving' | 'steady' | 'declining' = 'steady';
  if (gamesPlayed >= 2) {
    const firstGrade = gradeValues[performances[0].grade];
    const lastGrade = gradeValues[performances[performances.length - 1].grade];
    if (lastGrade > firstGrade + 10) trend = 'improving';
    else if (lastGrade < firstGrade - 10) trend = 'declining';
  }

  // Determine roster projection
  let rosterProjection: 'lock' | 'bubble' | 'cut_candidate' | 'practice_squad' = 'bubble';
  if (avgGrade >= 85) rosterProjection = 'lock';
  else if (avgGrade >= 70) rosterProjection = 'bubble';
  else if (avgGrade >= 55) rosterProjection = 'practice_squad';
  else rosterProjection = 'cut_candidate';

  const keyMoments = performances.flatMap((p) => p.notes);

  const recommendations: Record<typeof rosterProjection, string> = {
    lock: 'Roster spot secured. Ready for regular season.',
    bubble: 'On the bubble. Final week crucial.',
    practice_squad: 'Practice squad candidate. Development potential.',
    cut_candidate: 'Likely release candidate unless significant improvement.',
  };

  return {
    playerId,
    playerName,
    position,
    gamesPlayed,
    totalSnaps,
    avgGrade,
    trend,
    rosterProjection,
    keyMoments,
    recommendation: recommendations[rosterProjection],
  };
}

/**
 * Processes preseason phase
 */
export function processPreseason(
  state: OffSeasonState,
  games: PreseasonGame[],
  evaluations: PreseasonEvaluation[]
): OffSeasonState {
  const wins = games.filter((g) => g.result === 'win').length;
  const losses = games.filter((g) => g.result === 'loss').length;
  const ties = games.filter((g) => g.result === 'tie').length;

  let newState = addEvent(
    state,
    'phase_complete',
    `Preseason complete: ${wins}-${losses}${ties > 0 ? `-${ties}` : ''}`,
    { wins, losses, ties }
  );

  // Add standout events
  const standouts = evaluations.filter((e) => e.rosterProjection === 'lock' && e.avgGrade >= 85);
  for (const standout of standouts.slice(0, 3)) {
    newState = addEvent(
      newState,
      'development_reveal',
      `${standout.playerName} locked up roster spot with strong preseason`,
      { evaluation: standout }
    );
  }

  newState = completeTask(newState, 'sim_games');
  newState = completeTask(newState, 'evaluate_players');

  return newState;
}

/**
 * Gets preseason summary
 */
export function getPreseasonSummary(
  games: PreseasonGame[],
  evaluations: PreseasonEvaluation[]
): PreseasonSummary {
  const injuries = games.flatMap((g) => g.injuries);

  return {
    year: new Date().getFullYear(),
    record: {
      wins: games.filter((g) => g.result === 'win').length,
      losses: games.filter((g) => g.result === 'loss').length,
      ties: games.filter((g) => g.result === 'tie').length,
    },
    games,
    evaluations,
    standouts: evaluations.filter((e) => e.avgGrade >= 80),
    cutCandidates: evaluations.filter((e) => e.rosterProjection === 'cut_candidate'),
    injuries,
  };
}

/**
 * Gets game summary text
 */
export function getPreseasonGameText(game: PreseasonGame): string {
  const location = game.isHome ? 'vs' : '@';
  return `Preseason Game ${game.gameNumber}: ${location} ${game.opponent}
Final: ${game.teamScore} - ${game.opponentScore} (${game.result.toUpperCase()})

Highlights:
${game.highlights.map((h) => `- ${h}`).join('\n')}

Injuries:
${game.injuries.length > 0 ? game.injuries.map((i) => `- ${i.playerName}: ${i.injuryType} (${i.missedTime})`).join('\n') : 'None'}`;
}

/**
 * Gets evaluation text
 */
export function getEvaluationText(evaluation: PreseasonEvaluation): string {
  return `${evaluation.playerName} (${evaluation.position})
Games: ${evaluation.gamesPlayed} | Snaps: ${evaluation.totalSnaps}
Average Grade: ${Math.round(evaluation.avgGrade)}
Trend: ${evaluation.trend}
Projection: ${evaluation.rosterProjection.replace('_', ' ').toUpperCase()}

Recommendation: ${evaluation.recommendation}`;
}
