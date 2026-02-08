/**
 * Weekly Awards & Record/Milestone Tracking
 *
 * Tracks weekly awards (Player of the Week), season award races (MVP, DPOY, OROY),
 * power rankings, and milestone/record tracking.
 */

import { GameState } from '../models/game/GameState';
import { Player } from '../models/player/Player';
import { SkillValue } from '../models/player/TechnicalSkills';
import { Team } from '../models/team/Team';

/**
 * Weekly player award
 */
export interface WeeklyPlayerAward {
  week: number;
  playerId: string;
  playerName: string;
  position: string;
  teamId: string;
  teamName: string;
  awardType: 'offensivePlayer' | 'defensivePlayer' | 'rookie';
  statLine: string;
}

/**
 * Season award candidate
 */
export interface AwardCandidate {
  playerId: string;
  playerName: string;
  position: string;
  teamId: string;
  teamName: string;
  /** Current score/ranking for this award */
  score: number;
  /** Key stat for display */
  keyStat: string;
}

/**
 * Season award race
 */
export interface AwardRace {
  awardName: string;
  awardAbbr: string;
  candidates: AwardCandidate[];
}

/**
 * Power ranking entry
 */
export interface PowerRankingEntry {
  teamId: string;
  teamName: string;
  abbreviation: string;
  rank: number;
  previousRank: number;
  change: number;
  record: string;
  blurb: string;
}

/**
 * Milestone being tracked
 */
export interface MilestoneTracker {
  playerId: string;
  playerName: string;
  position: string;
  teamId: string;
  milestoneType: string;
  description: string;
  currentValue: number;
  targetValue: number;
  progressPct: number;
}

/**
 * Complete awards state
 */
export interface WeeklyAwardsState {
  /** Awards given out each week */
  weeklyAwards: WeeklyPlayerAward[];
  /** Current power rankings */
  powerRankings: PowerRankingEntry[];
  /** Active milestone trackers */
  milestones: MilestoneTracker[];
  /** Last computed week */
  lastComputedWeek: number;
}

/**
 * Create initial awards state
 */
export function createWeeklyAwardsState(): WeeklyAwardsState {
  return {
    weeklyAwards: [],
    powerRankings: [],
    milestones: [],
    lastComputedWeek: 0,
  };
}

/**
 * Generate weekly player awards based on game results
 * In a real implementation this would use actual game stats.
 * Here we approximate from team performance and player ratings.
 */
export function generateWeeklyAwards(gameState: GameState, week: number): WeeklyPlayerAward[] {
  const awards: WeeklyPlayerAward[] = [];
  const teams = Object.values(gameState.teams);

  // Find teams that won by the most this week (best performances)
  const winningTeams = teams
    .filter((t) => t.currentRecord.wins > 0)
    .sort((a, b) => {
      const aDiff = a.currentRecord.pointsFor - a.currentRecord.pointsAgainst;
      const bDiff = b.currentRecord.pointsFor - b.currentRecord.pointsAgainst;
      return bDiff - aDiff;
    });

  // Offensive Player of the Week
  if (winningTeams.length > 0) {
    const offTeam = winningTeams[0];
    const offPlayers = offTeam.rosterPlayerIds
      .map((id) => gameState.players[id])
      .filter((p): p is Player => p != null && ['QB', 'RB', 'WR', 'TE'].includes(p.position))
      .sort((a, b) => estimateRating(b) - estimateRating(a));

    if (offPlayers.length > 0) {
      const mvp = offPlayers[0];
      awards.push({
        week,
        playerId: mvp.id,
        playerName: `${mvp.firstName} ${mvp.lastName}`,
        position: mvp.position,
        teamId: offTeam.id,
        teamName: `${offTeam.city} ${offTeam.nickname}`,
        awardType: 'offensivePlayer',
        statLine: generateStatLine(mvp.position, true),
      });
    }
  }

  // Defensive Player of the Week
  if (winningTeams.length > 1) {
    const defTeam = winningTeams[1];
    const defPlayers = defTeam.rosterPlayerIds
      .map((id) => gameState.players[id])
      .filter(
        (p): p is Player =>
          p != null && ['DE', 'DT', 'MLB', 'OLB', 'CB', 'SS', 'FS'].includes(p.position)
      )
      .sort((a, b) => estimateRating(b) - estimateRating(a));

    if (defPlayers.length > 0) {
      const dpow = defPlayers[0];
      awards.push({
        week,
        playerId: dpow.id,
        playerName: `${dpow.firstName} ${dpow.lastName}`,
        position: dpow.position,
        teamId: defTeam.id,
        teamName: `${defTeam.city} ${defTeam.nickname}`,
        awardType: 'defensivePlayer',
        statLine: generateStatLine(dpow.position, false),
      });
    }
  }

  return awards;
}

/**
 * Generate a plausible stat line for an award winner
 */
function generateStatLine(position: string, isOffensive: boolean): string {
  if (isOffensive) {
    switch (position) {
      case 'QB':
        return `${280 + Math.floor(Math.random() * 120)} YDS, ${3 + Math.floor(Math.random() * 2)} TD, ${Math.random() > 0.7 ? '1' : '0'} INT`;
      case 'RB':
        return `${120 + Math.floor(Math.random() * 80)} YDS, ${1 + Math.floor(Math.random() * 2)} TD, ${18 + Math.floor(Math.random() * 10)} ATT`;
      case 'WR':
        return `${100 + Math.floor(Math.random() * 80)} YDS, ${1 + Math.floor(Math.random() * 2)} TD, ${6 + Math.floor(Math.random() * 5)} REC`;
      case 'TE':
        return `${80 + Math.floor(Math.random() * 50)} YDS, ${1 + Math.floor(Math.random() * 1)} TD, ${5 + Math.floor(Math.random() * 4)} REC`;
      default:
        return 'Outstanding performance';
    }
  } else {
    switch (position) {
      case 'DE':
      case 'DT':
        return `${2 + Math.floor(Math.random() * 2)} SACK, ${4 + Math.floor(Math.random() * 3)} TKL, ${Math.random() > 0.5 ? '1 FF' : '1 TFL'}`;
      case 'MLB':
      case 'OLB':
        return `${8 + Math.floor(Math.random() * 5)} TKL, ${Math.random() > 0.5 ? '1 SACK' : '1 INT'}, ${1 + Math.floor(Math.random() * 2)} TFL`;
      case 'CB':
      case 'SS':
      case 'FS':
        return `${Math.random() > 0.5 ? '2 INT' : '1 INT'}, ${3 + Math.floor(Math.random() * 3)} PD, ${4 + Math.floor(Math.random() * 3)} TKL`;
      default:
        return 'Dominant defensive performance';
    }
  }
}

/**
 * Generate power rankings based on team records and point differential
 */
export function generatePowerRankings(
  gameState: GameState,
  previousRankings: PowerRankingEntry[]
): PowerRankingEntry[] {
  const teams = Object.values(gameState.teams);

  // Score teams
  const scored = teams.map((team) => {
    const wins = team.currentRecord.wins;
    const losses = team.currentRecord.losses;
    const totalGames = wins + losses;
    const winPct = totalGames > 0 ? wins / totalGames : 0.5;
    const pointDiff = team.currentRecord.pointsFor - team.currentRecord.pointsAgainst;

    // Score = win% * 80 + point differential * 0.5 + small random variance
    const score = winPct * 80 + pointDiff * 0.5 + (Math.random() * 5 - 2.5);

    return { team, score };
  });

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  // Build rankings
  const previousRankMap = new Map<string, number>();
  for (const prev of previousRankings) {
    previousRankMap.set(prev.teamId, prev.rank);
  }

  return scored.map(({ team }, index) => {
    const rank = index + 1;
    const prevRank = previousRankMap.get(team.id) || rank;
    const change = prevRank - rank;

    return {
      teamId: team.id,
      teamName: `${team.city} ${team.nickname}`,
      abbreviation: team.abbreviation,
      rank,
      previousRank: prevRank,
      change,
      record: `${team.currentRecord.wins}-${team.currentRecord.losses}`,
      blurb: generateRankingBlurb(team, rank, change),
    };
  });
}

/**
 * Generate a brief blurb for a power ranking entry
 */
function generateRankingBlurb(team: Team, rank: number, change: number): string {
  if (rank <= 3) {
    return change > 0
      ? `${team.nickname} surge into the top tier after strong play.`
      : `${team.nickname} continue to dominate the league.`;
  }
  if (rank <= 10) {
    return change > 2
      ? `${team.nickname} are heating up - watch out.`
      : change < -2
        ? `${team.nickname} stumble after a tough stretch.`
        : `${team.nickname} remain solid contenders.`;
  }
  if (rank <= 20) {
    return team.currentRecord.wins > team.currentRecord.losses
      ? `${team.nickname} are in the playoff conversation.`
      : `${team.nickname} need to find consistency.`;
  }
  return team.currentRecord.wins > 3
    ? `${team.nickname} are fighting to stay relevant.`
    : `${team.nickname} appear to be headed for a rebuild.`;
}

/**
 * Generate season award races (MVP, DPOY, etc.)
 */
export function generateAwardRaces(gameState: GameState): AwardRace[] {
  const teams = Object.values(gameState.teams);
  const races: AwardRace[] = [];

  // MVP Race - based on team success + player rating for QBs/RBs
  const mvpCandidates: AwardCandidate[] = [];
  for (const team of teams) {
    const winPct =
      team.currentRecord.wins + team.currentRecord.losses > 0
        ? team.currentRecord.wins / (team.currentRecord.wins + team.currentRecord.losses)
        : 0;

    // Only consider teams above .500
    if (winPct < 0.5 && team.currentRecord.wins + team.currentRecord.losses > 4) continue;

    const topOffPlayers = team.rosterPlayerIds
      .map((id) => gameState.players[id])
      .filter((p): p is Player => p != null && ['QB', 'RB', 'WR'].includes(p.position))
      .sort((a, b) => estimateRating(b) - estimateRating(a));

    if (topOffPlayers.length > 0) {
      const player = topOffPlayers[0];
      const rating = estimateRating(player);
      mvpCandidates.push({
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        position: player.position,
        teamId: team.id,
        teamName: `${team.city} ${team.nickname}`,
        score: rating * winPct * 1.5,
        keyStat: player.position === 'QB' ? 'Team leader' : 'Key contributor',
      });
    }
  }

  mvpCandidates.sort((a, b) => b.score - a.score);
  races.push({
    awardName: 'Most Valuable Player',
    awardAbbr: 'MVP',
    candidates: mvpCandidates.slice(0, 5),
  });

  // DPOY Race
  const dpoyCandidates: AwardCandidate[] = [];
  for (const team of teams) {
    const topDefPlayers = team.rosterPlayerIds
      .map((id) => gameState.players[id])
      .filter(
        (p): p is Player =>
          p != null && ['DE', 'DT', 'MLB', 'OLB', 'CB', 'SS', 'FS'].includes(p.position)
      )
      .sort((a, b) => estimateRating(b) - estimateRating(a));

    if (topDefPlayers.length > 0) {
      const player = topDefPlayers[0];
      const rating = estimateRating(player);
      dpoyCandidates.push({
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        position: player.position,
        teamId: team.id,
        teamName: `${team.city} ${team.nickname}`,
        score: rating + Math.random() * 10,
        keyStat: ['DE', 'DT'].includes(player.position) ? 'Pass rush dominance' : 'Playmaker',
      });
    }
  }

  dpoyCandidates.sort((a, b) => b.score - a.score);
  races.push({
    awardName: 'Defensive Player of the Year',
    awardAbbr: 'DPOY',
    candidates: dpoyCandidates.slice(0, 5),
  });

  // OROY Race - players with experience 0 or 1
  const rookies: AwardCandidate[] = [];
  for (const team of teams) {
    const rookiePlayers = team.rosterPlayerIds
      .map((id) => gameState.players[id])
      .filter((p): p is Player => p != null && p.experience <= 1)
      .sort((a, b) => estimateRating(b) - estimateRating(a));

    if (rookiePlayers.length > 0) {
      const player = rookiePlayers[0];
      const rating = estimateRating(player);
      rookies.push({
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        position: player.position,
        teamId: team.id,
        teamName: `${team.city} ${team.nickname}`,
        score: rating + Math.random() * 8,
        keyStat: 'Impressive rookie season',
      });
    }
  }

  rookies.sort((a, b) => b.score - a.score);
  races.push({
    awardName: 'Offensive Rookie of the Year',
    awardAbbr: 'OROY',
    candidates: rookies.slice(0, 5),
  });

  return races;
}

/**
 * Track milestones for notable players
 */
export function generateMilestones(gameState: GameState): MilestoneTracker[] {
  const milestones: MilestoneTracker[] = [];
  const week = gameState.league.calendar.currentWeek;

  // Only start tracking after week 4
  if (week < 4) return milestones;

  const teams = Object.values(gameState.teams);

  for (const team of teams) {
    const qbs = team.rosterPlayerIds
      .map((id) => gameState.players[id])
      .filter((p): p is Player => p != null && p.position === 'QB')
      .sort((a, b) => estimateRating(b) - estimateRating(a));

    if (qbs.length > 0) {
      const qb = qbs[0];
      const rating = estimateRating(qb);
      // Estimate pace - higher rated QBs pace for more yards
      const paceYards = Math.round(((rating / 100) * 300 * 17 * week) / 17);
      if (paceYards > 4000) {
        milestones.push({
          playerId: qb.id,
          playerName: `${qb.firstName} ${qb.lastName}`,
          position: 'QB',
          teamId: team.id,
          milestoneType: 'passing_yards',
          description: `On pace for ${Math.round(paceYards / 100) * 100}+ passing yards`,
          currentValue: Math.round((paceYards * week) / 17),
          targetValue: paceYards,
          progressPct: Math.round((week / 17) * 100),
        });
      }
    }
  }

  return milestones.slice(0, 8);
}

/**
 * Process all weekly awards
 */
export function processWeeklyAwards(gameState: GameState): WeeklyAwardsState {
  const week = gameState.league.calendar.currentWeek;
  const existing =
    (gameState as GameState & { weeklyAwards?: WeeklyAwardsState }).weeklyAwards ||
    createWeeklyAwardsState();

  const newAwards = generateWeeklyAwards(gameState, week);
  const powerRankings = generatePowerRankings(gameState, existing.powerRankings);
  const milestones = generateMilestones(gameState);

  return {
    weeklyAwards: [...existing.weeklyAwards, ...newAwards],
    powerRankings,
    milestones,
    lastComputedWeek: week,
  };
}

/**
 * Estimate player rating helper
 */
function estimateRating(player: Player): number {
  const skills = Object.values(player.skills || {});
  const skillValues = skills
    .filter((s): s is SkillValue => s != null && typeof s === 'object' && 'trueValue' in s)
    .map((s) => s.trueValue);
  if (skillValues.length === 0) return 50;
  return Math.round(skillValues.reduce((a, b) => a + b, 0) / skillValues.length);
}
