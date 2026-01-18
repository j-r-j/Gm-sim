/**
 * Phase Generators
 * Functions to automatically generate phase-specific data from GameState
 */

import type { GameState } from '../../models/game/GameState';
import type { Player } from '../../models/player/Player';
import type { AwardWinner, CoachEvaluationResult } from '../OffseasonPersistentData';
import type { OTAReport, RookieIntegrationReport } from '../phases/OTAsPhase';
import type { PositionBattle, PositionBattleCompetitor, DevelopmentReveal, CampInjury } from '../phases/TrainingCampPhase';
import type { PreseasonGame, PreseasonPlayerPerformance, PreseasonEvaluation } from '../phases/PreseasonPhase';
import type {
  OwnerExpectations as PersistentOwnerExpectations,
  MediaProjection as PersistentMediaProjection,
  SeasonGoal as PersistentSeasonGoal,
} from '../OffseasonPersistentData';
import { calculateOwnerExpectations, generateMediaProjections, generateSeasonGoals } from '../phases/SeasonStartPhase';
import { Position, OFFENSIVE_POSITIONS, DEFENSIVE_POSITIONS } from '../../models/player/Position';

// =============================================================================
// Season End Phase Generators
// =============================================================================

/**
 * Generates awards based on season performance
 * Simplified version that picks top performers
 */
export function generateSeasonAwards(gameState: GameState): AwardWinner[] {
  const awards: AwardWinner[] = [];
  const players = Object.values(gameState.players);
  const teams = Object.values(gameState.teams);

  // Find best player for MVP (simplified - highest perceived skills average)
  const mvpCandidate = findTopPlayerByPosition(players, null);
  if (mvpCandidate) {
    const team = teams.find(t => t.rosterPlayerIds.includes(mvpCandidate.id));
    awards.push({
      award: 'MVP',
      playerId: mvpCandidate.id,
      playerName: `${mvpCandidate.firstName} ${mvpCandidate.lastName}`,
      teamId: team?.id ?? '',
      teamName: team ? `${team.city} ${team.nickname}` : '',
    });
  }

  // Offensive Player of the Year
  const opoy = findTopPlayerByPosition(players, 'offense');
  if (opoy) {
    const team = teams.find(t => t.rosterPlayerIds.includes(opoy.id));
    awards.push({
      award: 'Offensive Player of the Year',
      playerId: opoy.id,
      playerName: `${opoy.firstName} ${opoy.lastName}`,
      teamId: team?.id ?? '',
      teamName: team ? `${team.city} ${team.nickname}` : '',
    });
  }

  // Defensive Player of the Year
  const dpoy = findTopPlayerByPosition(players, 'defense');
  if (dpoy) {
    const team = teams.find(t => t.rosterPlayerIds.includes(dpoy.id));
    awards.push({
      award: 'Defensive Player of the Year',
      playerId: dpoy.id,
      playerName: `${dpoy.firstName} ${dpoy.lastName}`,
      teamId: team?.id ?? '',
      teamName: team ? `${team.city} ${team.nickname}` : '',
    });
  }

  // Offensive Rookie of the Year
  const oroy = findTopRookie(players, 'offense');
  if (oroy) {
    const team = teams.find(t => t.rosterPlayerIds.includes(oroy.id));
    awards.push({
      award: 'Offensive Rookie of the Year',
      playerId: oroy.id,
      playerName: `${oroy.firstName} ${oroy.lastName}`,
      teamId: team?.id ?? '',
      teamName: team ? `${team.city} ${team.nickname}` : '',
    });
  }

  // Defensive Rookie of the Year
  const droy = findTopRookie(players, 'defense');
  if (droy) {
    const team = teams.find(t => t.rosterPlayerIds.includes(droy.id));
    awards.push({
      award: 'Defensive Rookie of the Year',
      playerId: droy.id,
      playerName: `${droy.firstName} ${droy.lastName}`,
      teamId: team?.id ?? '',
      teamName: team ? `${team.city} ${team.nickname}` : '',
    });
  }

  return awards;
}

function findTopPlayerByPosition(
  players: Player[],
  side: 'offense' | 'defense' | null
): Player | undefined {
  const filtered = players.filter(p => {
    if (side === 'offense') return OFFENSIVE_POSITIONS.includes(p.position);
    if (side === 'defense') return DEFENSIVE_POSITIONS.includes(p.position);
    return true;
  });

  return filtered.sort((a, b) => getPlayerScore(b) - getPlayerScore(a))[0];
}

function findTopRookie(
  players: Player[],
  side: 'offense' | 'defense'
): Player | undefined {
  const rookies = players.filter(p => {
    const isRookie = p.experience === 0;
    const matchesSide = side === 'offense'
      ? OFFENSIVE_POSITIONS.includes(p.position)
      : DEFENSIVE_POSITIONS.includes(p.position);
    return isRookie && matchesSide;
  });

  return rookies.sort((a, b) => getPlayerScore(b) - getPlayerScore(a))[0];
}

function getPlayerScore(player: Player): number {
  if (!player.skills.perceived) return 50;
  const values = Object.values(player.skills.perceived) as Array<{ low: number; high: number }>;
  if (values.length === 0) return 50;
  return values.reduce((sum, range) => sum + (range.low + range.high) / 2, 0) / values.length;
}

// =============================================================================
// Coaching Decisions Phase Generators
// =============================================================================

/**
 * Generates coach evaluations based on team performance
 */
export function generateCoachEvaluations(gameState: GameState): CoachEvaluationResult[] {
  const evaluations: CoachEvaluationResult[] = [];
  const userTeam = gameState.teams[gameState.userTeamId];

  if (!userTeam) return evaluations;

  const hierarchy = userTeam.staffHierarchy;

  // Evaluate head coach
  if (hierarchy.headCoach) {
    const coach = gameState.coaches[hierarchy.headCoach];
    if (coach) {
      const winPct = userTeam.currentRecord.wins /
        (userTeam.currentRecord.wins + userTeam.currentRecord.losses || 1);

      evaluations.push({
        coachId: coach.id,
        coachName: `${coach.firstName} ${coach.lastName}`,
        role: 'Head Coach',
        overallGrade: getGradeFromWinPct(winPct),
        strengths: generateCoachStrengths(winPct),
        weaknesses: generateCoachWeaknesses(winPct),
        recommendation: getCoachRecommendation(winPct),
        yearsRemaining: 2, // Default
      });
    }
  }

  // Evaluate offensive coordinator
  if (hierarchy.offensiveCoordinator) {
    const coach = gameState.coaches[hierarchy.offensiveCoordinator];
    if (coach) {
      const grade = Math.random() > 0.5 ? 'B' : 'C';
      evaluations.push({
        coachId: coach.id,
        coachName: `${coach.firstName} ${coach.lastName}`,
        role: 'Offensive Coordinator',
        overallGrade: grade as 'A' | 'B' | 'C' | 'D' | 'F',
        strengths: ['Play design', 'Player development'],
        weaknesses: grade === 'C' ? ['Red zone efficiency'] : [],
        recommendation: 'keep',
        yearsRemaining: 1,
      });
    }
  }

  // Evaluate defensive coordinator
  if (hierarchy.defensiveCoordinator) {
    const coach = gameState.coaches[hierarchy.defensiveCoordinator];
    if (coach) {
      const grade = Math.random() > 0.5 ? 'B' : 'C';
      evaluations.push({
        coachId: coach.id,
        coachName: `${coach.firstName} ${coach.lastName}`,
        role: 'Defensive Coordinator',
        overallGrade: grade as 'A' | 'B' | 'C' | 'D' | 'F',
        strengths: ['Scheme versatility', 'Third down defense'],
        weaknesses: grade === 'C' ? ['Run defense'] : [],
        recommendation: 'keep',
        yearsRemaining: 1,
      });
    }
  }

  return evaluations;
}

function getGradeFromWinPct(winPct: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (winPct >= 0.75) return 'A';
  if (winPct >= 0.6) return 'B';
  if (winPct >= 0.4) return 'C';
  if (winPct >= 0.25) return 'D';
  return 'F';
}

function generateCoachStrengths(winPct: number): string[] {
  if (winPct >= 0.6) {
    return ['Game management', 'Player motivation', 'In-game adjustments'];
  }
  if (winPct >= 0.4) {
    return ['Player development', 'Team culture'];
  }
  return ['Effort', 'Communication'];
}

function generateCoachWeaknesses(winPct: number): string[] {
  if (winPct >= 0.6) {
    return [];
  }
  if (winPct >= 0.4) {
    return ['Clock management', 'Fourth down decisions'];
  }
  return ['Play calling', 'Game preparation', 'Adjustments'];
}

function getCoachRecommendation(winPct: number): 'keep' | 'extend' | 'fire' | 'demote' {
  if (winPct >= 0.7) return 'extend';
  if (winPct >= 0.4) return 'keep';
  return 'fire';
}

// =============================================================================
// OTAs Phase Generators
// =============================================================================

/**
 * Generates OTA reports for user team players
 */
export function generateOTAReports(gameState: GameState): OTAReport[] {
  const reports: OTAReport[] = [];
  const userTeam = gameState.teams[gameState.userTeamId];

  if (!userTeam) return reports;

  for (const playerId of userTeam.rosterPlayerIds) {
    const player = gameState.players[playerId];
    if (!player) continue;

    const playerScore = getPlayerScore(player);
    const isRookie = player.experience === 0;
    const workEthic = 50 + Math.random() * 50; // Simplified work ethic

    // Determine attendance
    let attendance: 'full' | 'partial' | 'holdout' | 'excused' = 'full';
    if (Math.random() < 0.05) attendance = 'excused';
    else if (Math.random() < 0.08) attendance = 'partial';

    // Determine impression
    const performanceScore = playerScore * 0.6 + workEthic * 0.4 + (Math.random() * 20 - 10);
    let impression: 'standout' | 'solid' | 'average' | 'concerning' | 'injury' = 'average';
    if (Math.random() < 0.03) impression = 'injury';
    else if (performanceScore >= 85) impression = 'standout';
    else if (performanceScore >= 75) impression = 'solid';
    else if (performanceScore >= 60) impression = 'average';
    else impression = 'concerning';

    reports.push({
      playerId,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      type: isRookie ? 'rookie' : 'veteran',
      attendance,
      impression,
      notes: [getImpressionNote(impression)],
      highlights: impression === 'standout' ? ['Exceptional practice performance'] : [],
      concerns: impression === 'concerning' ? ['Struggling with playbook'] : [],
      conditioningLevel: Math.round(60 + Math.random() * 30),
      schemeGrasp: Math.round(50 + Math.random() * 40),
      coachFeedback: getCoachFeedback(impression),
    });
  }

  return reports;
}

function getImpressionNote(impression: string): string {
  switch (impression) {
    case 'standout': return 'One of the most impressive performers in OTAs';
    case 'solid': return 'Meeting expectations with steady improvement';
    case 'average': return 'Performing at expected level';
    case 'concerning': return 'Coaches working to address concerns';
    case 'injury': return 'Limited participation due to minor injury';
    default: return '';
  }
}

function getCoachFeedback(impression: string): string {
  switch (impression) {
    case 'standout': return "Extremely pleased with his progress. He's going to be a key contributor.";
    case 'solid': return 'Doing exactly what we expected. Steady and reliable.';
    case 'average': return "Still evaluating, but he's showing flashes.";
    case 'concerning': return "We're working with him to get up to speed.";
    case 'injury': return 'Taking it slow, being smart with his recovery.';
    default: return '';
  }
}

/**
 * Generates rookie integration reports
 */
export function generateRookieIntegrationReports(gameState: GameState): RookieIntegrationReport[] {
  const reports: RookieIntegrationReport[] = [];
  const userTeam = gameState.teams[gameState.userTeamId];

  if (!userTeam) return reports;

  for (const playerId of userTeam.rosterPlayerIds) {
    const player = gameState.players[playerId];
    if (!player || player.experience !== 0) continue;

    const playerScore = getPlayerScore(player);

    // Determine learning curve
    let learningCurve: 'ahead' | 'on_track' | 'behind' = 'on_track';
    if (playerScore >= 75 || Math.random() < 0.2) learningCurve = 'ahead';
    else if (playerScore < 60 || Math.random() < 0.2) learningCurve = 'behind';

    reports.push({
      playerId,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      draftRound: Math.ceil(Math.random() * 7), // Simplified
      learningCurve,
      physicalReadiness: playerScore >= 70 ? 'NFL_ready' : 'needs_work',
      mentalReadiness: learningCurve === 'ahead' ? 'sharp' : 'average',
      veteranMentor: null,
      adjustmentNotes: generateRookieNotes(learningCurve),
    });
  }

  return reports;
}

function generateRookieNotes(learningCurve: string): string[] {
  switch (learningCurve) {
    case 'ahead': return ['Picking up the playbook quickly', 'Showing NFL-level instincts'];
    case 'behind': return ['Taking extra time in meetings', 'Needs more reps'];
    default: return ['Progressing as expected', 'Fitting in well with teammates'];
  }
}

// =============================================================================
// Training Camp Phase Generators
// =============================================================================

/**
 * Generates position battles for training camp
 */
export function generatePositionBattles(gameState: GameState): PositionBattle[] {
  const battles: PositionBattle[] = [];
  const userTeam = gameState.teams[gameState.userTeamId];

  if (!userTeam) return battles;

  // Group players by position
  const playersByPosition = new Map<Position, Player[]>();
  for (const playerId of userTeam.rosterPlayerIds) {
    const player = gameState.players[playerId];
    if (!player) continue;

    const existing = playersByPosition.get(player.position) || [];
    existing.push(player);
    playersByPosition.set(player.position, existing);
  }

  // Create battles for positions with multiple players
  let battleId = 1;
  for (const [position, players] of playersByPosition) {
    if (players.length < 2) continue;

    // Sort by score
    const sorted = [...players].sort((a, b) => getPlayerScore(b) - getPlayerScore(a));

    // Create starter battle
    const competitors: PositionBattleCompetitor[] = sorted.slice(0, 3).map((p, idx) => ({
      playerId: p.id,
      playerName: `${p.firstName} ${p.lastName}`,
      currentScore: 70 + (2 - idx) * 10 + Math.random() * 10,
      trend: 'steady' as const,
      highlights: [],
      concerns: [],
      practiceGrade: idx === 0 ? 'A' as const : 'B' as const,
    }));

    const scoreDiff = competitors[0].currentScore - (competitors[1]?.currentScore ?? 0);

    battles.push({
      battleId: `battle-${battleId++}`,
      position,
      spotType: 'starter',
      competitors,
      status: scoreDiff > 15 ? 'decided' : scoreDiff > 5 ? 'ongoing' : 'too_close',
      winner: scoreDiff > 10 ? competitors[0].playerId : null,
      campWeek: 1,
      updates: [`${position} position battle heating up`],
    });
  }

  return battles;
}

/**
 * Generates development reveals during camp
 */
export function generateDevelopmentReveals(gameState: GameState): DevelopmentReveal[] {
  const reveals: DevelopmentReveal[] = [];
  const userTeam = gameState.teams[gameState.userTeamId];

  if (!userTeam) return reveals;

  // Pick 2-4 random players to have reveals
  const rosterIds = [...userTeam.rosterPlayerIds];
  const numReveals = 2 + Math.floor(Math.random() * 3);

  for (let i = 0; i < numReveals && rosterIds.length > 0; i++) {
    const idx = Math.floor(Math.random() * rosterIds.length);
    const playerId = rosterIds.splice(idx, 1)[0];
    const player = gameState.players[playerId];
    if (!player) continue;

    const revealTypes: DevelopmentReveal['revealType'][] = ['trait', 'skill_jump', 'decline', 'injury_concern', 'intangible'];
    const type = revealTypes[Math.floor(Math.random() * revealTypes.length)];

    reveals.push({
      playerId,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      revealType: type,
      description: getRevealDescription(type, player),
      impact: type === 'skill_jump' || type === 'intangible' ? 'positive' :
              type === 'decline' || type === 'injury_concern' ? 'negative' : 'neutral',
      details: {},
    });
  }

  return reveals;
}

function getRevealDescription(type: DevelopmentReveal['revealType'], player: Player): string {
  const name = `${player.firstName} ${player.lastName}`;
  switch (type) {
    case 'skill_jump': return `${name} showing significant improvement in practice`;
    case 'trait': return `${name} displaying leadership qualities in camp`;
    case 'decline': return `${name} appears to have lost a step`;
    case 'injury_concern': return `${name} dealing with nagging injury concerns`;
    case 'intangible': return `${name} showing exceptional work ethic`;
    default: return `${name} development update`;
  }
}

/**
 * Generates camp injuries
 */
export function generateCampInjuries(gameState: GameState): CampInjury[] {
  const injuries: CampInjury[] = [];
  const userTeam = gameState.teams[gameState.userTeamId];

  if (!userTeam) return injuries;

  // 5-10% chance of injury per player
  for (const playerId of userTeam.rosterPlayerIds) {
    if (Math.random() > 0.08) continue;

    const player = gameState.players[playerId];
    if (!player) continue;

    const severities: CampInjury['severity'][] = ['minor', 'moderate', 'serious'];
    const severity = severities[Math.floor(Math.random() * severities.length)];

    injuries.push({
      playerId,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      injuryType: getRandomInjuryType(),
      severity,
      estimatedReturn: getEstimatedReturn(severity),
      practiceStatus: severity === 'minor' ? 'limited' : 'out',
    });
  }

  return injuries;
}

function getRandomInjuryType(): string {
  const types = ['Hamstring strain', 'Ankle sprain', 'Knee soreness', 'Shoulder inflammation', 'Back tightness'];
  return types[Math.floor(Math.random() * types.length)];
}

function getEstimatedReturn(severity: CampInjury['severity']): string {
  switch (severity) {
    case 'minor': return '1-2 days';
    case 'moderate': return '1-2 weeks';
    case 'serious': return '4-6 weeks';
    case 'season_ending': return 'Season';
    default: return 'TBD';
  }
}

// =============================================================================
// Preseason Phase Generators
// =============================================================================

/**
 * Generates preseason games
 */
export function generatePreseasonGames(gameState: GameState): PreseasonGame[] {
  const games: PreseasonGame[] = [];
  const teams = Object.values(gameState.teams);
  const userTeam = gameState.teams[gameState.userTeamId];

  if (!userTeam) return games;

  for (let gameNum = 1; gameNum <= 3; gameNum++) {
    const opponent = teams[Math.floor(Math.random() * teams.length)];
    const isHome = gameNum % 2 === 1;
    const teamScore = 10 + Math.floor(Math.random() * 20);
    const oppScore = 10 + Math.floor(Math.random() * 20);

    games.push({
      gameNumber: gameNum,
      opponent: `${opponent.city} ${opponent.nickname}`,
      isHome,
      teamScore,
      opponentScore: oppScore,
      result: teamScore > oppScore ? 'win' : teamScore < oppScore ? 'loss' : 'tie',
      playerPerformances: generatePlayerPerformances(gameState, gameNum),
      injuries: [],
      highlights: [`Game ${gameNum} ${teamScore > oppScore ? 'victory' : 'loss'}`],
    });
  }

  return games;
}

function generatePlayerPerformances(gameState: GameState, gameNum: number): PreseasonPlayerPerformance[] {
  const performances: PreseasonPlayerPerformance[] = [];
  const userTeam = gameState.teams[gameState.userTeamId];

  if (!userTeam) return performances;

  // Pick 10-15 players to have notable performances
  const rosterIds = [...userTeam.rosterPlayerIds];
  const numPerformances = 10 + Math.floor(Math.random() * 6);

  for (let i = 0; i < numPerformances && rosterIds.length > 0; i++) {
    const idx = Math.floor(Math.random() * rosterIds.length);
    const playerId = rosterIds.splice(idx, 1)[0];
    const player = gameState.players[playerId];
    if (!player) continue;

    const grades: PreseasonPlayerPerformance['grade'][] = ['A', 'B', 'C', 'D', 'F'];
    const grade = grades[Math.floor(Math.random() * 4)]; // Bias toward better grades

    performances.push({
      playerId,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      snaps: gameNum === 3 ? 10 + Math.floor(Math.random() * 20) : 20 + Math.floor(Math.random() * 30),
      grade,
      stats: {},
      notes: [],
      rosterImpact: grade === 'A' ? 'lock' : grade === 'B' ? 'bubble' : grade === 'D' || grade === 'F' ? 'cut_candidate' : 'bubble',
    });
  }

  return performances;
}

/**
 * Generates preseason evaluations from games
 */
export function generatePreseasonEvaluations(
  games: PreseasonGame[],
  gameState: GameState
): PreseasonEvaluation[] {
  const evaluations: PreseasonEvaluation[] = [];
  const userTeam = gameState.teams[gameState.userTeamId];

  if (!userTeam) return evaluations;

  // Aggregate performances by player
  const playerPerfs = new Map<string, PreseasonPlayerPerformance[]>();
  for (const game of games) {
    for (const perf of game.playerPerformances) {
      const existing = playerPerfs.get(perf.playerId) || [];
      existing.push(perf);
      playerPerfs.set(perf.playerId, existing);
    }
  }

  for (const [playerId, perfs] of playerPerfs) {
    const player = gameState.players[playerId];
    if (!player) continue;

    const gradeValues = { A: 90, B: 80, C: 70, D: 60, F: 50 };
    const avgGrade = perfs.reduce((sum, p) => sum + gradeValues[p.grade], 0) / perfs.length;
    const totalSnaps = perfs.reduce((sum, p) => sum + p.snaps, 0);

    evaluations.push({
      playerId,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      gamesPlayed: perfs.length,
      totalSnaps,
      avgGrade,
      trend: avgGrade >= 80 ? 'improving' : avgGrade >= 65 ? 'steady' : 'declining',
      rosterProjection: avgGrade >= 85 ? 'lock' : avgGrade >= 75 ? 'bubble' : avgGrade >= 65 ? 'practice_squad' : 'cut_candidate',
      keyMoments: [],
      recommendation: avgGrade >= 75 ? 'Keep on roster' : 'Consider for PS or cut',
    });
  }

  return evaluations;
}

// =============================================================================
// Season Start Phase Generators
// =============================================================================

/**
 * Generates season start data (owner expectations, media projections, goals)
 * Returns types compatible with OffseasonPersistentData
 */
export function generateSeasonStartData(gameState: GameState): {
  ownerExpectations: PersistentOwnerExpectations;
  mediaProjections: PersistentMediaProjection[];
  seasonGoals: PersistentSeasonGoal[];
} {
  const userTeam = gameState.teams[gameState.userTeamId];

  if (!userTeam) {
    // Return defaults if no team found
    return {
      ownerExpectations: {
        wins: { minimum: 6, expected: 8, stretch: 10 },
        playoffs: true,
        division: false,
        championship: false,
        playerDevelopment: [],
        financialTargets: { minRevenue: 0, maxSpending: 200 },
        patience: 50,
      },
      mediaProjections: [],
      seasonGoals: [],
    };
  }

  // Calculate roster strength from team players
  let rosterStrength = 0;
  let playerCount = 0;
  for (const playerId of userTeam.rosterPlayerIds) {
    const player = gameState.players[playerId];
    if (player) {
      rosterStrength += getPlayerScore(player);
      playerCount++;
    }
  }
  rosterStrength = playerCount > 0 ? rosterStrength / playerCount : 60;

  // Get previous season wins
  const previousSeasonWins = userTeam.currentRecord.wins;

  // Determine owner personality based on owner data
  const owner = gameState.owners[userTeam.ownerId];
  let ownerPersonality: 'patient' | 'demanding' | 'balanced' = 'balanced';
  if (owner?.personality?.traits) {
    const patience = owner.personality.traits.patience;
    if (patience >= 70) ownerPersonality = 'patient';
    else if (patience <= 30) ownerPersonality = 'demanding';
  }

  // Get years with team
  const yearsWithTeam = gameState.careerStats.seasonsCompleted;

  // Generate owner expectations using SeasonStartPhase calculator
  const phaseExpectations = calculateOwnerExpectations(
    rosterStrength,
    previousSeasonWins,
    ownerPersonality,
    yearsWithTeam
  );

  // Convert to persistent format
  const ownerExpectations: PersistentOwnerExpectations = {
    wins: {
      minimum: phaseExpectations.minimumWins,
      expected: phaseExpectations.minimumWins + 2,
      stretch: Math.min(17, phaseExpectations.minimumWins + 4),
    },
    playoffs: phaseExpectations.playoffExpectation !== 'miss',
    division: phaseExpectations.playoffExpectation === 'deep_run' || phaseExpectations.playoffExpectation === 'championship',
    championship: phaseExpectations.playoffExpectation === 'championship',
    playerDevelopment: phaseExpectations.specificGoals.filter(g => g.includes('player') || g.includes('develop')),
    financialTargets: { minRevenue: 0, maxSpending: 200 },
    patience: phaseExpectations.patientLevel,
  };

  // Generate media projections using SeasonStartPhase generator
  const scheduleStrength = 0.5;
  const phaseProjections = generateMediaProjections(
    rosterStrength,
    scheduleStrength,
    previousSeasonWins
  );

  // Convert to persistent format
  const mediaProjections: PersistentMediaProjection[] = phaseProjections.map(p => ({
    source: p.source,
    projectedWins: p.projectedWins,
    projectedLosses: p.projectedLosses,
    playoffOdds: p.playoffProjection === 'super_bowl' ? 85 :
                 p.playoffProjection === 'division' ? 70 :
                 p.playoffProjection === 'wild_card' ? 50 : 20,
    divisionOdds: p.playoffProjection === 'super_bowl' ? 60 :
                  p.playoffProjection === 'division' ? 40 : 15,
    championshipOdds: p.playoffProjection === 'super_bowl' ? 12 :
                      p.playoffProjection === 'division' ? 5 : 1,
    ranking: p.teamRanking,
    analysis: p.analysis,
  }));

  // Get key players for goals
  const keyPlayers: Array<{ name: string; position: string }> = [];
  const sortedPlayers = userTeam.rosterPlayerIds
    .map(id => gameState.players[id])
    .filter((p): p is Player => p !== undefined)
    .sort((a, b) => getPlayerScore(b) - getPlayerScore(a))
    .slice(0, 5);

  for (const player of sortedPlayers) {
    keyPlayers.push({
      name: `${player.firstName} ${player.lastName}`,
      position: player.position,
    });
  }

  // Generate season goals using SeasonStartPhase generator and convert
  const phaseGoals = generateSeasonGoals(phaseExpectations, keyPlayers);

  // Convert to persistent format
  const seasonGoals: PersistentSeasonGoal[] = phaseGoals.map(g => ({
    id: g.id,
    type: g.type === 'team' ? (g.id.includes('wins') ? 'wins' :
          g.id.includes('playoffs') ? 'playoffs' :
          g.id.includes('championship') ? 'championship' : 'custom') :
          g.type === 'player' ? 'player_development' :
          g.type === 'personal' ? 'custom' : 'custom',
    description: g.description,
    target: g.target,
    status: 'pending' as const,
  }));

  return {
    ownerExpectations,
    mediaProjections,
    seasonGoals,
  };
}
