/**
 * Retirement System
 * Handles voluntary career endings and legacy calculation
 */

import { CareerRecord, TeamTenure } from './CareerRecordTracker';

/**
 * Legacy tier based on career accomplishments
 */
export type LegacyTier =
  | 'hall_of_fame'
  | 'legendary'
  | 'excellent'
  | 'good'
  | 'average'
  | 'forgettable'
  | 'poor';

/**
 * Hall of Fame status
 */
export type HallOfFameStatus = 'first_ballot' | 'eventual' | 'borderline' | 'unlikely' | 'no';

/**
 * Career highlight type
 */
export type HighlightType =
  | 'championship'
  | 'dynasty'
  | 'turnaround'
  | 'draft_success'
  | 'longevity'
  | 'innovation'
  | 'mentorship';

/**
 * A career highlight for the summary
 */
export interface CareerHighlight {
  type: HighlightType;
  year: number;
  teamName: string;
  description: string;
  significance: 'major' | 'notable' | 'minor';
}

/**
 * Final career statistics
 */
export interface FinalCareerStats {
  totalSeasons: number;
  totalWins: number;
  totalLosses: number;
  totalTies: number;
  winPercentage: number;
  teamsManaged: number;
  championships: number;
  conferenceChampionships: number;
  divisionTitles: number;
  playoffAppearances: number;
  playoffWinPercentage: number;
  timesFired: number;
  longestTenure: { teamName: string; seasons: number };
  bestSeason: { year: number; teamName: string; wins: number; losses: number };
}

/**
 * Career summary for retirement
 */
export interface CareerSummary {
  gmName: string;
  retirementYear: number;
  totalSeasons: number;

  // Final stats
  stats: FinalCareerStats;

  // Legacy
  legacyTier: LegacyTier;
  legacyScore: number;
  legacyDescription: string;

  // Hall of Fame
  hallOfFameStatus: HallOfFameStatus;
  hallOfFameReasons: string[];

  // Highlights
  highlights: CareerHighlight[];

  // Team memories
  teamLegacies: TeamLegacy[];

  // Final words
  farewellStatement: string;
  mediaReaction: string;
}

/**
 * Legacy with a specific team
 */
export interface TeamLegacy {
  teamId: string;
  teamName: string;
  tenure: string; // e.g., "2025-2030"
  record: string; // e.g., "52-44"
  achievements: string[];
  fanMemory: string; // How fans remember this tenure
}

/**
 * Retirement state
 */
export interface RetirementState {
  isRetired: boolean;
  retirementYear: number | null;
  retirementReason: 'voluntary' | 'forced' | 'health' | null;
  careerSummary: CareerSummary | null;
}

/**
 * Creates initial retirement state
 */
export function createRetirementState(): RetirementState {
  return {
    isRetired: false,
    retirementYear: null,
    retirementReason: null,
    careerSummary: null,
  };
}

/**
 * Initiates retirement
 */
export function initiateRetirement(
  careerRecord: CareerRecord,
  year: number,
  reason: 'voluntary' | 'forced' | 'health' = 'voluntary'
): RetirementState {
  const summary = generateCareerSummary(careerRecord, year);

  return {
    isRetired: true,
    retirementYear: year,
    retirementReason: reason,
    careerSummary: summary,
  };
}

/**
 * Generates comprehensive career summary
 */
export function generateCareerSummary(record: CareerRecord, retirementYear: number): CareerSummary {
  const stats = calculateFinalStats(record);
  const legacyScore = calculateLegacyScore(record);
  const legacyTier = getLegacyTier(legacyScore);
  const highlights = generateHighlights(record);
  const teamLegacies = generateTeamLegacies(record);
  const hallOfFameStatus = calculateHallOfFameStatus(record, legacyScore);
  const hallOfFameReasons = getHallOfFameReasons(record, hallOfFameStatus);

  return {
    gmName: record.gmName,
    retirementYear,
    totalSeasons: record.totalSeasons,
    stats,
    legacyTier,
    legacyScore,
    legacyDescription: getLegacyDescription(legacyTier, record),
    hallOfFameStatus,
    hallOfFameReasons,
    highlights,
    teamLegacies,
    farewellStatement: generateFarewellStatement(record, legacyTier),
    mediaReaction: generateMediaReaction(record, legacyTier),
  };
}

/**
 * Calculates final career statistics
 */
function calculateFinalStats(record: CareerRecord): FinalCareerStats {
  const totalGames = record.totalWins + record.totalLosses + record.totalTies;
  const winPercentage = totalGames > 0 ? record.totalWins / totalGames : 0;

  // Find longest tenure
  let longestTenure = { teamName: 'None', seasons: 0 };
  for (const tenure of record.teamsWorkedFor) {
    if (tenure.seasons > longestTenure.seasons) {
      longestTenure = { teamName: tenure.teamName, seasons: tenure.seasons };
    }
  }

  // Find best season
  let bestSeason = { year: 0, teamName: '', wins: 0, losses: 0 };
  for (const season of record.seasonHistory) {
    if (season.wins > bestSeason.wins) {
      bestSeason = {
        year: season.year,
        teamName: season.teamName,
        wins: season.wins,
        losses: season.losses,
      };
    }
  }

  // Calculate playoff win percentage
  let playoffWins = 0;
  let playoffLosses = 0;
  for (const season of record.seasonHistory) {
    if (season.madePlayoffs) {
      playoffWins += season.playoffWins;
      if (!season.wonChampionship) {
        playoffLosses += 1; // Lost in playoffs
      }
    }
  }
  const playoffWinPercentage =
    playoffWins + playoffLosses > 0 ? playoffWins / (playoffWins + playoffLosses) : 0;

  return {
    totalSeasons: record.totalSeasons,
    totalWins: record.totalWins,
    totalLosses: record.totalLosses,
    totalTies: record.totalTies,
    winPercentage,
    teamsManaged: record.teamsWorkedFor.length,
    championships: record.championships,
    conferenceChampionships: record.conferenceChampionships,
    divisionTitles: record.divisionTitles,
    playoffAppearances: record.playoffAppearances,
    playoffWinPercentage,
    timesFired: record.timesFired,
    longestTenure,
    bestSeason,
  };
}

/**
 * Calculates legacy score (0-100)
 */
export function calculateLegacyScore(record: CareerRecord): number {
  let score = 30; // Base score

  // Championships (major impact)
  score += record.championships * 20;

  // Conference championships
  score += record.conferenceChampionships * 8;

  // Division titles
  score += record.divisionTitles * 3;

  // Playoff appearances
  score += Math.min(record.playoffAppearances * 2, 20);

  // Winning record bonus
  if (record.careerWinPercentage >= 0.6) {
    score += 15;
  } else if (record.careerWinPercentage >= 0.55) {
    score += 10;
  } else if (record.careerWinPercentage >= 0.5) {
    score += 5;
  }

  // Longevity bonus
  if (record.totalSeasons >= 20) {
    score += 10;
  } else if (record.totalSeasons >= 15) {
    score += 7;
  } else if (record.totalSeasons >= 10) {
    score += 4;
  }

  // Penalties
  score -= record.timesFired * 5;

  // Multiple team success
  const teamsWithWinningRecords = record.teamsWorkedFor.filter(
    (t) => t.winPercentage >= 0.5
  ).length;
  if (teamsWithWinningRecords >= 2) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Converts score to legacy tier
 */
function getLegacyTier(score: number): LegacyTier {
  if (score >= 90) return 'hall_of_fame';
  if (score >= 75) return 'legendary';
  if (score >= 60) return 'excellent';
  if (score >= 45) return 'good';
  if (score >= 30) return 'average';
  if (score >= 15) return 'forgettable';
  return 'poor';
}

/**
 * Gets legacy tier description
 */
function getLegacyDescription(tier: LegacyTier, record: CareerRecord): string {
  const descriptions: Record<LegacyTier, (r: CareerRecord) => string> = {
    hall_of_fame: (r) =>
      `One of the greatest GMs in league history. ${r.championships} championships and a lasting impact on the game.`,
    legendary: (r) =>
      `A truly exceptional career. ${r.gmName} built multiple championship-caliber teams.`,
    excellent: (r) =>
      `A highly successful career with ${r.playoffAppearances} playoff appearances and consistent winning.`,
    good: (r) =>
      `A solid career with notable achievements. ${r.gmName} was a respected presence in the league.`,
    average: (_r) =>
      `A workmanlike career with ups and downs. Some good seasons mixed with struggles.`,
    forgettable: (_r) =>
      `A forgettable tenure in the league. Few memorable moments to reflect upon.`,
    poor: (_r) => `A difficult career marked by struggles and unfulfilled potential.`,
  };

  return descriptions[tier](record);
}

/**
 * Calculates Hall of Fame status
 */
function calculateHallOfFameStatus(record: CareerRecord, legacyScore: number): HallOfFameStatus {
  if (legacyScore >= 90 && record.championships >= 2) {
    return 'first_ballot';
  }
  if (legacyScore >= 80 || (record.championships >= 1 && record.careerWinPercentage >= 0.55)) {
    return 'eventual';
  }
  if (legacyScore >= 65 || record.championships >= 1) {
    return 'borderline';
  }
  if (legacyScore >= 50) {
    return 'unlikely';
  }
  return 'no';
}

/**
 * Gets reasons for Hall of Fame consideration
 */
function getHallOfFameReasons(record: CareerRecord, status: HallOfFameStatus): string[] {
  const reasons: string[] = [];

  if (record.championships > 0) {
    reasons.push(
      `${record.championships} Super Bowl championship${record.championships > 1 ? 's' : ''}`
    );
  }
  if (record.careerWinPercentage >= 0.55) {
    reasons.push(`${Math.round(record.careerWinPercentage * 100)}% career win rate`);
  }
  if (record.playoffAppearances >= 10) {
    reasons.push(`${record.playoffAppearances} playoff appearances`);
  }
  if (record.totalSeasons >= 15) {
    reasons.push(`${record.totalSeasons} years of service`);
  }

  if (status === 'unlikely' || status === 'no') {
    if (record.timesFired >= 2) {
      reasons.push(`${record.timesFired} firings hurt candidacy`);
    }
    if (record.careerWinPercentage < 0.5) {
      reasons.push('Losing career record hurts chances');
    }
  }

  return reasons;
}

/**
 * Generates career highlights
 */
function generateHighlights(record: CareerRecord): CareerHighlight[] {
  const highlights: CareerHighlight[] = [];

  // Championship highlights
  for (const achievement of record.achievements.filter((a) => a.type === 'championship')) {
    highlights.push({
      type: 'championship',
      year: achievement.year,
      teamName: getTeamNameFromId(record, achievement.teamId),
      description: achievement.description,
      significance: 'major',
    });
  }

  // Turnaround highlights (if team went from bad to good)
  for (let i = 1; i < record.seasonHistory.length; i++) {
    const prev = record.seasonHistory[i - 1];
    const curr = record.seasonHistory[i];
    if (prev.teamId === curr.teamId && prev.wins < 6 && curr.wins >= 10) {
      highlights.push({
        type: 'turnaround',
        year: curr.year,
        teamName: curr.teamName,
        description: `Turned ${curr.teamName} from ${prev.wins}-${prev.losses} to ${curr.wins}-${curr.losses}`,
        significance: 'notable',
      });
    }
  }

  // Longevity highlight
  const longestTenure = record.teamsWorkedFor.reduce(
    (longest, t) => (t.seasons > longest.seasons ? t : longest),
    { seasons: 0, teamName: '' }
  );
  if (longestTenure.seasons >= 8) {
    highlights.push({
      type: 'longevity',
      year: 0,
      teamName: longestTenure.teamName,
      description: `${longestTenure.seasons} seasons with ${longestTenure.teamName}`,
      significance: 'notable',
    });
  }

  return highlights.sort((a, b) => {
    const sigOrder = { major: 0, notable: 1, minor: 2 };
    return sigOrder[a.significance] - sigOrder[b.significance];
  });
}

/**
 * Helper to get team name from ID
 */
function getTeamNameFromId(record: CareerRecord, teamId: string): string {
  const tenure = record.teamsWorkedFor.find((t) => t.teamId === teamId);
  return tenure?.teamName || 'Unknown Team';
}

/**
 * Generates team-specific legacies
 */
function generateTeamLegacies(record: CareerRecord): TeamLegacy[] {
  return record.teamsWorkedFor.map((tenure) => {
    const achievements: string[] = [];

    if (tenure.championships > 0) {
      achievements.push(
        `${tenure.championships} championship${tenure.championships > 1 ? 's' : ''}`
      );
    }
    if (tenure.conferenceChampionships > 0) {
      achievements.push(
        `${tenure.conferenceChampionships} conference title${tenure.conferenceChampionships > 1 ? 's' : ''}`
      );
    }
    if (tenure.divisionTitles > 0) {
      achievements.push(
        `${tenure.divisionTitles} division title${tenure.divisionTitles > 1 ? 's' : ''}`
      );
    }
    if (tenure.playoffAppearances > 0) {
      achievements.push(
        `${tenure.playoffAppearances} playoff appearance${tenure.playoffAppearances > 1 ? 's' : ''}`
      );
    }

    const fanMemory = generateFanMemory(tenure);

    return {
      teamId: tenure.teamId,
      teamName: tenure.teamName,
      tenure: tenure.endYear
        ? `${tenure.startYear}-${tenure.endYear}`
        : `${tenure.startYear}-present`,
      record: `${tenure.totalWins}-${tenure.totalLosses}${tenure.totalTies > 0 ? `-${tenure.totalTies}` : ''}`,
      achievements,
      fanMemory,
    };
  });
}

/**
 * Generates fan memory of a tenure
 */
function generateFanMemory(tenure: TeamTenure): string {
  if (tenure.championships > 0) {
    return `Championship glory! Fans will forever remember the title runs.`;
  }
  if (tenure.winPercentage >= 0.6) {
    return `Golden era for the franchise. Consistent winning and exciting football.`;
  }
  if (tenure.wasFired && tenure.winPercentage < 0.4) {
    return `A dark period fans would rather forget. Things have gotten better since.`;
  }
  if (tenure.playoffAppearances >= 3) {
    return `Competitive years with playoff memories, even if the ultimate goal was elusive.`;
  }
  if (tenure.seasons <= 2) {
    return `A brief tenure that didn't leave much of an impression either way.`;
  }
  return `Mixed results. Some good seasons, some struggles. A middle-of-the-pack era.`;
}

/**
 * Generates farewell statement from the GM
 */
function generateFarewellStatement(record: CareerRecord, tier: LegacyTier): string {
  if (tier === 'hall_of_fame' || tier === 'legendary') {
    return `"It's been an incredible journey. To the fans, players, and coaches who made this possible - thank you. I leave this game with a full heart and no regrets."`;
  }
  if (tier === 'excellent' || tier === 'good') {
    return `"I'm proud of what we accomplished together. There were challenges, but we built something special. Time to enjoy some well-deserved rest."`;
  }
  if (tier === 'average') {
    return `"This game has given me so much. I wish we could have achieved more, but I'm at peace with my time in the league."`;
  }
  return `"It's time to step away. I hope to be remembered for the effort, even if the results weren't always there."`;
}

/**
 * Generates media reaction to retirement
 */
function generateMediaReaction(record: CareerRecord, tier: LegacyTier): string {
  if (tier === 'hall_of_fame') {
    return `League-wide tributes pour in as ${record.gmName} retires. Hall of Fame induction is a certainty.`;
  }
  if (tier === 'legendary') {
    return `A well-deserved retirement after a career that will be remembered for decades.`;
  }
  if (tier === 'excellent') {
    return `${record.gmName} retires as one of the better GMs of their era. A solid legacy secured.`;
  }
  if (tier === 'good') {
    return `${record.gmName} steps away after a respectable career with some memorable moments.`;
  }
  if (tier === 'average') {
    return `${record.gmName}'s retirement announcement generates modest attention across the league.`;
  }
  return `${record.gmName} quietly retires. The league moves on without much fanfare.`;
}

/**
 * Gets retirement summary for display
 */
export function getRetirementHeadline(summary: CareerSummary): string {
  return `${summary.gmName} Retires After ${summary.totalSeasons} Seasons`;
}

/**
 * Gets legacy tier display name
 */
export function getLegacyTierDisplayName(tier: LegacyTier): string {
  const displayNames: Record<LegacyTier, string> = {
    hall_of_fame: 'Hall of Fame',
    legendary: 'Legendary',
    excellent: 'Excellent',
    good: 'Good',
    average: 'Average',
    forgettable: 'Forgettable',
    poor: 'Poor',
  };
  return displayNames[tier];
}

/**
 * Gets Hall of Fame status display
 */
export function getHallOfFameStatusDisplay(status: HallOfFameStatus): string {
  const displays: Record<HallOfFameStatus, string> = {
    first_ballot: 'First Ballot Hall of Famer',
    eventual: 'Eventual Hall of Famer',
    borderline: 'Borderline Hall of Fame Candidate',
    unlikely: 'Hall of Fame Unlikely',
    no: 'Not a Hall of Fame Candidate',
  };
  return displays[status];
}

/**
 * Validates retirement state
 */
export function validateRetirementState(state: RetirementState): boolean {
  if (typeof state.isRetired !== 'boolean') return false;

  if (state.isRetired) {
    if (state.retirementYear === null || state.retirementYear < 2000) return false;
    if (state.retirementReason === null) return false;
    if (state.careerSummary === null) return false;
  }

  return true;
}
