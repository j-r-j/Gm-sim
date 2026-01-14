/**
 * Job Market Manager
 * Handles available GM positions across the league
 */

import { Team } from '../models/team/Team';
import { Owner } from '../models/owner';
import { ReputationTier, getReputationTier } from './CareerRecordTracker';

/**
 * Reason a GM position is open
 */
export type OpeningReason =
  | 'fired'
  | 'retired'
  | 'resigned'
  | 'promoted'
  | 'expansion'
  | 'newOwnership';

/**
 * Team situation assessment
 */
export type TeamSituation =
  | 'contender'
  | 'playoff_team'
  | 'rebuilding'
  | 'full_rebuild'
  | 'mediocre';

/**
 * Interest level from a team
 */
export type InterestLevel = 'elite' | 'high' | 'moderate' | 'low' | 'none';

/**
 * A job opening in the league
 */
export interface JobOpening {
  id: string;
  teamId: string;
  teamName: string;
  teamCity: string;
  conference: string;
  division: string;

  // Opening details
  reason: OpeningReason;
  dateOpened: number; // Game week or year
  yearOpened: number;

  // Team context
  situation: TeamSituation;
  lastSeasonRecord: { wins: number; losses: number };
  playoffAppearancesLast5Years: number;
  championshipsLast10Years: number;
  currentRosterTalent: number; // 1-100

  // Owner info (partially hidden until interview)
  ownerName: string;
  ownerPatience: 'low' | 'moderate' | 'high';
  ownerSpending: 'low' | 'moderate' | 'high';
  ownerControl: 'low' | 'moderate' | 'high';

  // Market factors
  marketSize: 'small' | 'medium' | 'large';
  prestige: number; // 1-100
  fanbaseExpectations: 'low' | 'moderate' | 'high' | 'championship';

  // Whether this position has been filled
  isFilled: boolean;
  filledByPlayerId: string | null;
}

/**
 * Team interest in a candidate
 */
export interface TeamInterest {
  openingId: string;
  teamId: string;
  teamName: string;
  interestLevel: InterestLevel;
  reasonsForInterest: string[];
  reasonsAgainstInterest: string[];
  hasRequestedInterview: boolean;
  interviewScheduled: boolean;
}

/**
 * Job market state for the league
 */
export interface JobMarketState {
  currentYear: number;
  openings: JobOpening[];
  teamInterests: TeamInterest[];
  playerReputationScore: number;
  playerReputationTier: ReputationTier;
}

/**
 * Creates initial job market state
 */
export function createJobMarketState(year: number, reputationScore: number): JobMarketState {
  return {
    currentYear: year,
    openings: [],
    teamInterests: [],
    playerReputationScore: reputationScore,
    playerReputationTier: getReputationTier(reputationScore),
  };
}

/**
 * Generates a job opening from a team and owner
 */
export function generateJobOpening(
  team: Team,
  owner: Owner,
  reason: OpeningReason,
  year: number,
  week: number
): JobOpening {
  const situation = assessTeamSituation(team);
  const lastRecord = {
    wins: team.currentRecord.wins,
    losses: team.currentRecord.losses,
  };

  return {
    id: `opening-${team.id}-${year}`,
    teamId: team.id,
    teamName: team.nickname,
    teamCity: team.city,
    conference: team.conference,
    division: team.division,

    reason,
    dateOpened: week,
    yearOpened: year,

    situation,
    lastSeasonRecord: lastRecord,
    playoffAppearancesLast5Years: 0, // Initialized to 0; tracked through season simulation
    championshipsLast10Years: team.championships > 0 ? 1 : 0,
    currentRosterTalent: calculateRosterTalent(team),

    ownerName: `${owner.firstName} ${owner.lastName}`,
    ownerPatience: categorizeTraitValue(owner.personality.traits.patience),
    ownerSpending: categorizeTraitValue(owner.personality.traits.spending),
    ownerControl: categorizeTraitValue(owner.personality.traits.control),

    marketSize: team.marketSize,
    prestige: team.prestige,
    fanbaseExpectations: determineFanbaseExpectations(team),

    isFilled: false,
    filledByPlayerId: null,
  };
}

/**
 * Assesses a team's current situation
 */
function assessTeamSituation(team: Team): TeamSituation {
  const winPct =
    team.currentRecord.wins / (team.currentRecord.wins + team.currentRecord.losses || 1);

  if (team.playoffSeed !== null && team.playoffSeed <= 3) {
    return 'contender';
  }
  if (team.playoffSeed !== null) {
    return 'playoff_team';
  }
  if (winPct < 0.25) {
    return 'full_rebuild';
  }
  if (winPct < 0.4) {
    return 'rebuilding';
  }
  return 'mediocre';
}

/**
 * Calculates roster talent level (simplified)
 */
function calculateRosterTalent(team: Team): number {
  // In a real implementation, this would evaluate player ratings
  // For now, use prestige and recent performance as proxy
  const baseTalent = team.prestige;
  const performanceBonus = (team.currentRecord.wins / 17) * 20;
  return Math.min(100, Math.max(1, Math.round(baseTalent + performanceBonus - 10)));
}

/**
 * Categorizes a trait value into low/moderate/high
 */
function categorizeTraitValue(value: number): 'low' | 'moderate' | 'high' {
  if (value <= 35) return 'low';
  if (value <= 65) return 'moderate';
  return 'high';
}

/**
 * Determines fanbase expectations based on team history
 */
function determineFanbaseExpectations(team: Team): 'low' | 'moderate' | 'high' | 'championship' {
  if (team.championships > 0 && team.lastChampionshipYear !== null) {
    return 'championship';
  }
  if (team.prestige >= 70) return 'high';
  if (team.prestige >= 40) return 'moderate';
  return 'low';
}

/**
 * Calculates team interest in a candidate
 */
export function calculateTeamInterest(
  opening: JobOpening,
  reputationScore: number,
  careerChampionships: number,
  careerWinPercentage: number,
  timesFired: number
): TeamInterest {
  const reasonsFor: string[] = [];
  const reasonsAgainst: string[] = [];
  let interestScore = 0;

  // Base interest from reputation
  interestScore += reputationScore / 2;

  // Championship experience
  if (careerChampionships > 0) {
    interestScore += 15 * Math.min(careerChampionships, 3);
    reasonsFor.push(`${careerChampionships} championship${careerChampionships > 1 ? 's' : ''} won`);
  }

  // Winning record
  if (careerWinPercentage >= 0.55) {
    interestScore += 10;
    reasonsFor.push('Proven winning record');
  } else if (careerWinPercentage < 0.45) {
    interestScore -= 10;
    reasonsAgainst.push('Losing career record');
  }

  // Firing history
  if (timesFired >= 3) {
    interestScore -= 15;
    reasonsAgainst.push('Multiple firings raise concerns');
  } else if (timesFired >= 2) {
    interestScore -= 8;
    reasonsAgainst.push('Prior firing history');
  }

  // Team situation preferences
  if (opening.situation === 'contender') {
    // Contenders want proven winners
    if (careerWinPercentage >= 0.55) {
      interestScore += 10;
      reasonsFor.push('Experience fits contending team needs');
    } else {
      interestScore -= 5;
      reasonsAgainst.push('Contending team prefers proven winner');
    }
  } else if (opening.situation === 'full_rebuild') {
    // Rebuilds might take chances on newer GMs
    if (timesFired <= 1) {
      interestScore += 5;
      reasonsFor.push('Fresh perspective for rebuild');
    }
  }

  // Prestige affects interest threshold
  if (opening.prestige >= 70) {
    interestScore -= 10; // High prestige teams are pickier
  } else if (opening.prestige <= 30) {
    interestScore += 10; // Low prestige teams more willing
  }

  // Determine interest level
  const interestLevel = getInterestLevelFromScore(interestScore);

  return {
    openingId: opening.id,
    teamId: opening.teamId,
    teamName: `${opening.teamCity} ${opening.teamName}`,
    interestLevel,
    reasonsForInterest: reasonsFor,
    reasonsAgainstInterest: reasonsAgainst,
    hasRequestedInterview: false,
    interviewScheduled: false,
  };
}

/**
 * Converts interest score to interest level
 */
function getInterestLevelFromScore(score: number): InterestLevel {
  if (score >= 80) return 'elite';
  if (score >= 60) return 'high';
  if (score >= 40) return 'moderate';
  if (score >= 20) return 'low';
  return 'none';
}

/**
 * Adds an opening to the market
 */
export function addOpening(state: JobMarketState, opening: JobOpening): JobMarketState {
  return {
    ...state,
    openings: [...state.openings, opening],
  };
}

/**
 * Removes a filled opening from the market
 */
export function fillOpening(
  state: JobMarketState,
  openingId: string,
  filledBy: string | null
): JobMarketState {
  return {
    ...state,
    openings: state.openings.map((o) =>
      o.id === openingId ? { ...o, isFilled: true, filledByPlayerId: filledBy } : o
    ),
  };
}

/**
 * Calculates interest for all open positions
 */
export function calculateAllInterests(
  state: JobMarketState,
  careerChampionships: number,
  careerWinPercentage: number,
  timesFired: number
): JobMarketState {
  const interests = state.openings
    .filter((o) => !o.isFilled)
    .map((opening) =>
      calculateTeamInterest(
        opening,
        state.playerReputationScore,
        careerChampionships,
        careerWinPercentage,
        timesFired
      )
    );

  return {
    ...state,
    teamInterests: interests,
  };
}

/**
 * Gets openings the player can potentially interview for
 */
export function getAvailableOpenings(state: JobMarketState): JobOpening[] {
  const interestedTeamIds = new Set(
    state.teamInterests.filter((ti) => ti.interestLevel !== 'none').map((ti) => ti.teamId)
  );

  return state.openings.filter((o) => !o.isFilled && interestedTeamIds.has(o.teamId));
}

/**
 * Gets the interest level for a specific opening
 */
export function getInterestForOpening(
  state: JobMarketState,
  openingId: string
): TeamInterest | null {
  return state.teamInterests.find((ti) => ti.openingId === openingId) || null;
}

/**
 * Generates description of team situation
 */
export function getTeamSituationDescription(situation: TeamSituation): string {
  const descriptions: Record<TeamSituation, string> = {
    contender: 'Championship contender with Super Bowl expectations',
    playoff_team: 'Solid playoff team looking to take next step',
    rebuilding: 'Team in rebuild mode with young talent',
    full_rebuild: 'Full rebuild required - starting from scratch',
    mediocre: 'Middle-of-the-pack team with unclear direction',
  };
  return descriptions[situation];
}

/**
 * Gets opening description for display
 */
export function getOpeningDescription(opening: JobOpening): string {
  const situation = getTeamSituationDescription(opening.situation);
  const record = `${opening.lastSeasonRecord.wins}-${opening.lastSeasonRecord.losses}`;

  return `The ${opening.teamCity} ${opening.teamName} (${record}) - ${situation}`;
}

/**
 * Simulates other candidates filling positions
 */
export function simulateOtherHires(
  state: JobMarketState,
  excludeOpeningId?: string
): JobMarketState {
  // Some openings get filled by AI GMs over time
  const updatedOpenings = state.openings.map((opening) => {
    if (opening.isFilled || opening.id === excludeOpeningId) {
      return opening;
    }

    // Higher prestige positions fill faster
    const fillChance = opening.prestige / 200; // 0-50% chance
    if (Math.random() < fillChance) {
      return {
        ...opening,
        isFilled: true,
        filledByPlayerId: null, // Filled by AI
      };
    }

    return opening;
  });

  return {
    ...state,
    openings: updatedOpenings,
  };
}

/**
 * Cleans up old openings from previous years
 */
export function cleanupOldOpenings(state: JobMarketState): JobMarketState {
  const currentYear = state.currentYear;

  return {
    ...state,
    openings: state.openings.filter((o) => !o.isFilled && o.yearOpened >= currentYear - 1),
  };
}

/**
 * Updates reputation and recalculates interests
 */
export function updateReputation(state: JobMarketState, newScore: number): JobMarketState {
  return {
    ...state,
    playerReputationScore: newScore,
    playerReputationTier: getReputationTier(newScore),
  };
}

/**
 * Validates job market state
 */
export function validateJobMarketState(state: JobMarketState): boolean {
  if (typeof state.currentYear !== 'number' || state.currentYear < 2000) return false;
  if (!Array.isArray(state.openings)) return false;
  if (!Array.isArray(state.teamInterests)) return false;
  if (state.playerReputationScore < 0 || state.playerReputationScore > 100) return false;

  return true;
}
