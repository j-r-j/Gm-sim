/**
 * Season End Phase (Phase 1)
 * Handles season recap, grades, awards, and draft order calculation
 */

import {
  OffSeasonState,
  SeasonRecap,
  setSeasonRecap,
  setDraftOrder,
  addEvent,
  completeTask,
} from '../OffSeasonPhaseManager';

/**
 * Season grade thresholds
 */
export type PlayerGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';

/**
 * Award types
 */
export type AwardType =
  | 'MVP'
  | 'OPOY'
  | 'DPOY'
  | 'OROY'
  | 'DROY'
  | 'CPOY'
  | 'WPMOY'
  | 'All-Pro First Team'
  | 'All-Pro Second Team'
  | 'Pro Bowl';

/**
 * Player season grade data
 */
export interface PlayerSeasonGrade {
  playerId: string;
  playerName: string;
  position: string;
  overallGrade: PlayerGrade;
  categories: {
    production: PlayerGrade;
    consistency: PlayerGrade;
    impact: PlayerGrade;
  };
  highlights: string[];
  concerns: string[];
}

/**
 * Award winner data
 */
export interface AwardWinner {
  award: AwardType;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  stats: string;
}

/**
 * Calculates a player grade based on performance
 */
export function calculatePlayerGrade(
  gamesPlayed: number,
  gamesStarted: number,
  performanceRating: number // 0-100
): PlayerGrade {
  // Penalize for missed games
  const availabilityFactor = Math.min(gamesPlayed / 17, 1);
  const adjustedRating = performanceRating * availabilityFactor;

  if (adjustedRating >= 95) return 'A+';
  if (adjustedRating >= 90) return 'A';
  if (adjustedRating >= 85) return 'A-';
  if (adjustedRating >= 80) return 'B+';
  if (adjustedRating >= 75) return 'B';
  if (adjustedRating >= 70) return 'B-';
  if (adjustedRating >= 65) return 'C+';
  if (adjustedRating >= 60) return 'C';
  if (adjustedRating >= 55) return 'C-';
  if (adjustedRating >= 45) return 'D';
  return 'F';
}

/**
 * Converts grade to numeric value for sorting
 */
export function gradeToNumber(grade: PlayerGrade): number {
  const gradeMap: Record<PlayerGrade, number> = {
    'A+': 12,
    A: 11,
    'A-': 10,
    'B+': 9,
    B: 8,
    'B-': 7,
    'C+': 6,
    C: 5,
    'C-': 4,
    D: 3,
    F: 1,
  };
  return gradeMap[grade];
}

/**
 * Generates season recap from season data
 */
export function generateSeasonRecap(
  year: number,
  teamId: string,
  teamRecord: { wins: number; losses: number; ties: number },
  divisionFinish: number,
  madePlayoffs: boolean,
  playoffResult: string | null,
  draftPosition: number,
  playerGrades: PlayerSeasonGrade[],
  awards: AwardWinner[]
): SeasonRecap {
  // Get top 5 performers
  const sortedGrades = [...playerGrades].sort(
    (a, b) => gradeToNumber(b.overallGrade) - gradeToNumber(a.overallGrade)
  );

  const topPerformers = sortedGrades.slice(0, 5).map((g) => ({
    playerId: g.playerId,
    playerName: g.playerName,
    position: g.position,
    grade: g.overallGrade,
  }));

  // Get team awards
  const teamAwards = awards
    .filter((a) => a.teamId === teamId)
    .map((a) => ({
      award: a.award,
      playerId: a.playerId,
      playerName: a.playerName,
    }));

  return {
    year,
    teamRecord,
    divisionFinish,
    madePlayoffs,
    playoffResult,
    draftPosition,
    topPerformers,
    awards: teamAwards,
  };
}

/**
 * Calculates draft order based on standings
 */
export function calculateDraftOrderFromStandings(
  standings: Array<{
    teamId: string;
    wins: number;
    losses: number;
    ties: number;
    playoffSeed: number | null;
    playoffElimRound: string | null;
    superBowlWinner: boolean;
  }>
): string[] {
  // Sort by:
  // 1. Super Bowl winner picks last
  // 2. Playoff teams pick later (by elimination round)
  // 3. Non-playoff teams by record (worst first)

  const sortedTeams = [...standings].sort((a, b) => {
    // Super Bowl winner picks last
    if (a.superBowlWinner) return 1;
    if (b.superBowlWinner) return -1;

    // Playoff teams
    if (a.playoffSeed && b.playoffSeed) {
      // Order by elimination round (earlier = earlier pick)
      const roundOrder: Record<string, number> = {
        wildCard: 1,
        divisional: 2,
        conference: 3,
        superBowl: 4,
      };
      const aRound = a.playoffElimRound ? roundOrder[a.playoffElimRound] || 0 : 4;
      const bRound = b.playoffElimRound ? roundOrder[b.playoffElimRound] || 0 : 4;
      if (aRound !== bRound) return aRound - bRound;
    }

    // Non-playoff before playoff
    if (a.playoffSeed && !b.playoffSeed) return 1;
    if (!a.playoffSeed && b.playoffSeed) return -1;

    // By record (worst first)
    const aWinPct = (a.wins + a.ties * 0.5) / (a.wins + a.losses + a.ties);
    const bWinPct = (b.wins + b.ties * 0.5) / (b.wins + b.losses + b.ties);
    return aWinPct - bWinPct;
  });

  return sortedTeams.map((t) => t.teamId);
}

/**
 * Generates playoff result description
 */
export function getPlayoffResultDescription(
  madePlayoffs: boolean,
  playoffSeed: number | null,
  eliminationRound: string | null,
  wonSuperBowl: boolean
): string | null {
  if (!madePlayoffs) return null;
  if (wonSuperBowl) return 'Super Bowl Champions';

  if (!eliminationRound) return 'Made Playoffs';

  const roundDescriptions: Record<string, string> = {
    wildCard: 'Lost in Wild Card Round',
    divisional: 'Lost in Divisional Round',
    conference: 'Lost in Conference Championship',
    superBowl: 'Super Bowl Runner-Up',
  };

  const baseDesc = roundDescriptions[eliminationRound] || 'Eliminated from Playoffs';
  return playoffSeed ? `#${playoffSeed} Seed - ${baseDesc}` : baseDesc;
}

/**
 * Processes season end phase
 */
export function processSeasonEnd(
  state: OffSeasonState,
  recap: SeasonRecap,
  draftOrder: string[]
): OffSeasonState {
  let newState = state;

  // Set recap
  newState = setSeasonRecap(newState, recap);

  // Set draft order
  newState = setDraftOrder(newState, draftOrder);

  // Add events for key accomplishments
  if (recap.madePlayoffs) {
    newState = addEvent(
      newState,
      'award',
      `Made playoffs as ${recap.divisionFinish === 1 ? 'Division Champion' : 'Wild Card'}`,
      { playoffResult: recap.playoffResult }
    );
  }

  for (const award of recap.awards) {
    newState = addEvent(newState, 'award', `${award.playerName} won ${award.award}`, {
      award,
    });
  }

  // Complete the view recap task
  newState = completeTask(newState, 'view_recap');

  return newState;
}

/**
 * Gets season summary text
 */
export function getSeasonSummaryText(recap: SeasonRecap): string {
  const { teamRecord, madePlayoffs, playoffResult, draftPosition } = recap;
  const recordStr = `${teamRecord.wins}-${teamRecord.losses}${teamRecord.ties > 0 ? `-${teamRecord.ties}` : ''}`;

  let summary = `Season Record: ${recordStr}`;

  if (madePlayoffs && playoffResult) {
    summary += `\n${playoffResult}`;
  } else {
    summary += '\nMissed Playoffs';
  }

  summary += `\nDraft Position: #${draftPosition}`;

  if (recap.awards.length > 0) {
    summary += `\nAwards: ${recap.awards.length}`;
  }

  return summary;
}

/**
 * Gets award display text
 */
export function getAwardDisplayText(award: AwardWinner): string {
  return `${award.award}: ${award.playerName} (${award.teamName}) - ${award.stats}`;
}

/**
 * Determines if a season was successful based on owner expectations
 */
export function evaluateSeasonSuccess(
  wins: number,
  expectedWins: number,
  madePlayoffs: boolean,
  playoffExpectation: 'miss' | 'make' | 'deep_run' | 'championship',
  playoffResult: string | null
): { met: boolean; exceeded: boolean; description: string } {
  let met = false;
  let exceeded = false;
  let description = '';

  // Win evaluation
  const winDiff = wins - expectedWins;

  if (winDiff >= 3) {
    exceeded = true;
    description = 'Significantly exceeded win expectations';
  } else if (winDiff >= 0) {
    met = true;
    description = 'Met win expectations';
  } else if (winDiff >= -2) {
    description = 'Slightly below win expectations';
  } else {
    description = 'Failed to meet win expectations';
  }

  // Playoff evaluation
  switch (playoffExpectation) {
    case 'championship':
      if (playoffResult === 'Super Bowl Champions') {
        exceeded = true;
        description = 'Won the Super Bowl!';
      } else if (playoffResult === 'Super Bowl Runner-Up') {
        met = true;
        description = 'Made it to the Super Bowl';
      } else {
        description = 'Failed to win championship';
      }
      break;
    case 'deep_run':
      if (playoffResult?.includes('Conference') || playoffResult?.includes('Super Bowl')) {
        met = true;
        if (playoffResult === 'Super Bowl Champions') exceeded = true;
      }
      break;
    case 'make':
      if (madePlayoffs) {
        met = true;
        if (playoffResult?.includes('Conference') || playoffResult?.includes('Super Bowl')) {
          exceeded = true;
        }
      }
      break;
    case 'miss':
      met = true; // No playoff expectation
      if (madePlayoffs) exceeded = true;
      break;
  }

  return { met, exceeded, description };
}
