/**
 * Career Record Tracker
 * Maintains comprehensive career statistics across all teams
 */

import { TenureStats } from './FiringMechanics';

/**
 * A snapshot of a single season's performance
 */
export interface SeasonSnapshot {
  year: number;
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  madePlayoffs: boolean;
  playoffWins: number;
  wonDivision: boolean;
  wonConference: boolean;
  wonChampionship: boolean;
  fired: boolean;
}

/**
 * A team tenure record
 */
export interface TeamTenure {
  teamId: string;
  teamName: string;
  startYear: number;
  endYear: number | null; // null if current
  seasons: number;
  totalWins: number;
  totalLosses: number;
  totalTies: number;
  winPercentage: number;
  playoffAppearances: number;
  divisionTitles: number;
  conferenceChampionships: number;
  championships: number;
  wasFired: boolean;
  reasonForDeparture: 'current' | 'fired' | 'resigned' | 'retired';
}

/**
 * Career achievement types
 */
export type CareerAchievement =
  | 'championship'
  | 'conferenceChampionship'
  | 'divisionTitle'
  | 'coachOfYear'
  | 'executiveOfYear'
  | 'perfectSeason'
  | 'worstToFirst'
  | 'dynastyBuilder'
  | 'rebuilder'
  | 'longevity';

/**
 * A career achievement record
 */
export interface AchievementRecord {
  type: CareerAchievement;
  year: number;
  teamId: string;
  description: string;
}

/**
 * Reputation factors that affect job market standing
 */
export interface ReputationFactors {
  baseReputation: number;
  championshipBonus: number;
  playoffBonus: number;
  winningSeasonBonus: number;
  losingSeasonPenalty: number;
  firingPenalty: number;
  unemploymentPenalty: number;
  ownerApprovalModifier: number;
}

/**
 * Complete career record
 */
export interface CareerRecord {
  // Identity
  gmId: string;
  gmName: string;

  // Career totals
  totalSeasons: number;
  totalWins: number;
  totalLosses: number;
  totalTies: number;
  careerWinPercentage: number;

  // Achievements
  championships: number;
  conferenceChampionships: number;
  divisionTitles: number;
  playoffAppearances: number;

  // Team history
  teamsWorkedFor: TeamTenure[];
  currentTeamId: string | null;

  // Reputation
  reputationScore: number;
  reputationFactors: ReputationFactors;

  // Detailed history
  seasonHistory: SeasonSnapshot[];
  achievements: AchievementRecord[];

  // Career status
  yearsUnemployed: number;
  timesFired: number;
  isRetired: boolean;
  retirementYear: number | null;
}

/**
 * Creates a new career record for a first-time GM
 */
export function createCareerRecord(gmId: string, gmName: string): CareerRecord {
  return {
    gmId,
    gmName,
    totalSeasons: 0,
    totalWins: 0,
    totalLosses: 0,
    totalTies: 0,
    careerWinPercentage: 0,
    championships: 0,
    conferenceChampionships: 0,
    divisionTitles: 0,
    playoffAppearances: 0,
    teamsWorkedFor: [],
    currentTeamId: null,
    reputationScore: 50,
    reputationFactors: createDefaultReputationFactors(),
    seasonHistory: [],
    achievements: [],
    yearsUnemployed: 0,
    timesFired: 0,
    isRetired: false,
    retirementYear: null,
  };
}

/**
 * Creates default reputation factors
 */
export function createDefaultReputationFactors(): ReputationFactors {
  return {
    baseReputation: 50,
    championshipBonus: 0,
    playoffBonus: 0,
    winningSeasonBonus: 0,
    losingSeasonPenalty: 0,
    firingPenalty: 0,
    unemploymentPenalty: 0,
    ownerApprovalModifier: 0,
  };
}

/**
 * Adds a new team to the career
 */
export function startNewTeam(
  record: CareerRecord,
  teamId: string,
  teamName: string,
  year: number
): CareerRecord {
  // Close out any current team
  const updatedTeams = record.teamsWorkedFor.map((tenure) => {
    if (tenure.endYear === null) {
      return {
        ...tenure,
        endYear: year - 1,
        reasonForDeparture: 'resigned' as const,
      };
    }
    return tenure;
  });

  const newTenure: TeamTenure = {
    teamId,
    teamName,
    startYear: year,
    endYear: null,
    seasons: 0,
    totalWins: 0,
    totalLosses: 0,
    totalTies: 0,
    winPercentage: 0,
    playoffAppearances: 0,
    divisionTitles: 0,
    conferenceChampionships: 0,
    championships: 0,
    wasFired: false,
    reasonForDeparture: 'current',
  };

  return {
    ...record,
    teamsWorkedFor: [...updatedTeams, newTenure],
    currentTeamId: teamId,
    yearsUnemployed: 0, // Reset unemployment when getting new job
  };
}

/**
 * Records a completed season
 */
export function recordSeason(record: CareerRecord, snapshot: SeasonSnapshot): CareerRecord {
  const totalGames =
    record.totalWins +
    record.totalLosses +
    record.totalTies +
    snapshot.wins +
    snapshot.losses +
    snapshot.ties;
  const newTotalWins = record.totalWins + snapshot.wins;

  // Update current team tenure
  const updatedTeams = record.teamsWorkedFor.map((tenure) => {
    if (tenure.teamId === snapshot.teamId && tenure.endYear === null) {
      const tenureGames =
        tenure.totalWins +
        tenure.totalLosses +
        tenure.totalTies +
        snapshot.wins +
        snapshot.losses +
        snapshot.ties;
      const newTenureWins = tenure.totalWins + snapshot.wins;

      return {
        ...tenure,
        seasons: tenure.seasons + 1,
        totalWins: newTenureWins,
        totalLosses: tenure.totalLosses + snapshot.losses,
        totalTies: tenure.totalTies + snapshot.ties,
        winPercentage: tenureGames > 0 ? newTenureWins / tenureGames : 0,
        playoffAppearances: tenure.playoffAppearances + (snapshot.madePlayoffs ? 1 : 0),
        divisionTitles: tenure.divisionTitles + (snapshot.wonDivision ? 1 : 0),
        conferenceChampionships: tenure.conferenceChampionships + (snapshot.wonConference ? 1 : 0),
        championships: tenure.championships + (snapshot.wonChampionship ? 1 : 0),
      };
    }
    return tenure;
  });

  // Generate achievements
  const newAchievements = [...record.achievements];
  if (snapshot.wonChampionship) {
    newAchievements.push({
      type: 'championship',
      year: snapshot.year,
      teamId: snapshot.teamId,
      description: `Won championship with ${snapshot.teamName}`,
    });
  }
  if (snapshot.wonConference && !snapshot.wonChampionship) {
    newAchievements.push({
      type: 'conferenceChampionship',
      year: snapshot.year,
      teamId: snapshot.teamId,
      description: `Won conference championship with ${snapshot.teamName}`,
    });
  }
  if (snapshot.wonDivision) {
    newAchievements.push({
      type: 'divisionTitle',
      year: snapshot.year,
      teamId: snapshot.teamId,
      description: `Won division title with ${snapshot.teamName}`,
    });
  }

  return {
    ...record,
    totalSeasons: record.totalSeasons + 1,
    totalWins: newTotalWins,
    totalLosses: record.totalLosses + snapshot.losses,
    totalTies: record.totalTies + snapshot.ties,
    careerWinPercentage: totalGames > 0 ? newTotalWins / totalGames : 0,
    championships: record.championships + (snapshot.wonChampionship ? 1 : 0),
    conferenceChampionships: record.conferenceChampionships + (snapshot.wonConference ? 1 : 0),
    divisionTitles: record.divisionTitles + (snapshot.wonDivision ? 1 : 0),
    playoffAppearances: record.playoffAppearances + (snapshot.madePlayoffs ? 1 : 0),
    teamsWorkedFor: updatedTeams,
    seasonHistory: [...record.seasonHistory, snapshot],
    achievements: newAchievements,
  };
}

/**
 * Records being fired from a team
 */
export function recordFiring(
  record: CareerRecord,
  teamId: string,
  year: number,
  finalPatienceLevel: number
): CareerRecord {
  const updatedTeams = record.teamsWorkedFor.map((tenure) => {
    if (tenure.teamId === teamId && tenure.endYear === null) {
      return {
        ...tenure,
        endYear: year,
        wasFired: true,
        reasonForDeparture: 'fired' as const,
      };
    }
    return tenure;
  });

  // Calculate reputation impact from firing
  const firingPenalty = calculateFiringReputationPenalty(finalPatienceLevel);
  const newReputationFactors = {
    ...record.reputationFactors,
    firingPenalty: record.reputationFactors.firingPenalty + firingPenalty,
  };

  return {
    ...record,
    teamsWorkedFor: updatedTeams,
    currentTeamId: null,
    timesFired: record.timesFired + 1,
    reputationFactors: newReputationFactors,
    reputationScore: calculateReputationScore(newReputationFactors),
  };
}

/**
 * Records voluntary resignation
 */
export function recordResignation(
  record: CareerRecord,
  teamId: string,
  year: number
): CareerRecord {
  const updatedTeams = record.teamsWorkedFor.map((tenure) => {
    if (tenure.teamId === teamId && tenure.endYear === null) {
      return {
        ...tenure,
        endYear: year,
        wasFired: false,
        reasonForDeparture: 'resigned' as const,
      };
    }
    return tenure;
  });

  return {
    ...record,
    teamsWorkedFor: updatedTeams,
    currentTeamId: null,
  };
}

/**
 * Records a year of unemployment
 */
export function recordUnemploymentYear(record: CareerRecord): CareerRecord {
  const newReputationFactors = {
    ...record.reputationFactors,
    unemploymentPenalty: record.reputationFactors.unemploymentPenalty + 3,
  };

  return {
    ...record,
    yearsUnemployed: record.yearsUnemployed + 1,
    reputationFactors: newReputationFactors,
    reputationScore: calculateReputationScore(newReputationFactors),
  };
}

/**
 * Calculates firing reputation penalty based on final patience level
 */
function calculateFiringReputationPenalty(finalPatienceLevel: number): number {
  // Lower patience = worse firing = bigger penalty
  if (finalPatienceLevel < 10) return 15; // Disastrous departure
  if (finalPatienceLevel < 20) return 12;
  if (finalPatienceLevel < 35) return 10;
  if (finalPatienceLevel < 50) return 7;
  return 5; // Relatively amicable parting
}

/**
 * Calculates total reputation score from factors
 */
export function calculateReputationScore(factors: ReputationFactors): number {
  const score =
    factors.baseReputation +
    factors.championshipBonus +
    factors.playoffBonus +
    factors.winningSeasonBonus -
    factors.losingSeasonPenalty -
    factors.firingPenalty -
    factors.unemploymentPenalty +
    factors.ownerApprovalModifier;

  return Math.max(0, Math.min(100, score));
}

/**
 * Updates reputation based on season performance
 */
export function updateReputationFromSeason(
  record: CareerRecord,
  snapshot: SeasonSnapshot,
  ownerApprovalChange: number
): CareerRecord {
  const newFactors = { ...record.reputationFactors };

  // Championship bonus
  if (snapshot.wonChampionship) {
    newFactors.championshipBonus += 15;
  } else if (snapshot.wonConference) {
    newFactors.championshipBonus += 8;
  }

  // Playoff bonus
  if (snapshot.madePlayoffs) {
    newFactors.playoffBonus += 3;
  }

  // Win/loss assessment
  const winPercentage = snapshot.wins / (snapshot.wins + snapshot.losses + snapshot.ties || 1);
  if (winPercentage >= 0.6) {
    newFactors.winningSeasonBonus += 2;
  } else if (winPercentage < 0.4) {
    newFactors.losingSeasonPenalty += 1;
  }

  // Owner approval
  newFactors.ownerApprovalModifier += Math.round(ownerApprovalChange / 10);

  return {
    ...record,
    reputationFactors: newFactors,
    reputationScore: calculateReputationScore(newFactors),
  };
}

/**
 * Gets reputation tier based on score
 */
export type ReputationTier = 'elite' | 'high' | 'moderate' | 'low' | 'none';

export function getReputationTier(score: number): ReputationTier {
  if (score >= 85) return 'elite';
  if (score >= 70) return 'high';
  if (score >= 50) return 'moderate';
  if (score >= 30) return 'low';
  return 'none';
}

/**
 * Gets reputation tier description
 */
export function getReputationTierDescription(tier: ReputationTier): string {
  const descriptions: Record<ReputationTier, string> = {
    elite: 'Top candidate - multiple teams interested',
    high: 'Strong interest from contending teams',
    moderate: 'Some interest from rebuilding teams',
    low: 'Limited interest - may need to take less desirable jobs',
    none: 'No current interest from any teams',
  };
  return descriptions[tier];
}

/**
 * Gets a career summary string
 */
export function getCareerSummary(record: CareerRecord): string {
  if (record.totalSeasons === 0) {
    return 'Rookie GM with no professional experience';
  }

  const parts: string[] = [];

  parts.push(`${record.totalSeasons} season${record.totalSeasons !== 1 ? 's' : ''} as GM`);
  parts.push(
    `${record.totalWins}-${record.totalLosses}${record.totalTies > 0 ? `-${record.totalTies}` : ''} record`
  );
  parts.push(`${Math.round(record.careerWinPercentage * 100)}% win rate`);

  if (record.championships > 0) {
    parts.push(`${record.championships} championship${record.championships !== 1 ? 's' : ''}`);
  }

  if (record.teamsWorkedFor.length > 1) {
    parts.push(`${record.teamsWorkedFor.length} different teams`);
  }

  return parts.join(' | ');
}

/**
 * Gets current team tenure or null if unemployed
 */
export function getCurrentTenure(record: CareerRecord): TeamTenure | null {
  return record.teamsWorkedFor.find((t) => t.endYear === null) || null;
}

/**
 * Converts tenure stats to career record format
 */
export function tenureStatsToTeamTenure(
  stats: TenureStats,
  teamId: string,
  teamName: string,
  startYear: number,
  endYear: number | null,
  wasFired: boolean
): TeamTenure {
  return {
    teamId,
    teamName,
    startYear,
    endYear,
    seasons: stats.totalSeasons,
    totalWins: stats.totalWins,
    totalLosses: stats.totalLosses,
    totalTies: 0,
    winPercentage: stats.winPercentage,
    playoffAppearances: stats.playoffAppearances,
    divisionTitles: stats.divisionTitles,
    conferenceChampionships: stats.conferenceChampionships,
    championships: stats.superBowlWins,
    wasFired,
    reasonForDeparture: endYear === null ? 'current' : wasFired ? 'fired' : 'resigned',
  };
}

/**
 * Validates a career record
 */
export function validateCareerRecord(record: CareerRecord): boolean {
  if (!record.gmId || typeof record.gmId !== 'string') return false;
  if (!record.gmName || typeof record.gmName !== 'string') return false;

  if (record.totalSeasons < 0) return false;
  if (record.totalWins < 0 || record.totalLosses < 0 || record.totalTies < 0) return false;
  if (record.careerWinPercentage < 0 || record.careerWinPercentage > 1) return false;

  if (record.championships < 0) return false;
  if (record.conferenceChampionships < 0) return false;
  if (record.divisionTitles < 0) return false;
  if (record.playoffAppearances < 0) return false;

  if (!Array.isArray(record.teamsWorkedFor)) return false;
  if (!Array.isArray(record.seasonHistory)) return false;
  if (!Array.isArray(record.achievements)) return false;

  if (record.reputationScore < 0 || record.reputationScore > 100) return false;
  if (record.yearsUnemployed < 0) return false;
  if (record.timesFired < 0) return false;

  return true;
}
