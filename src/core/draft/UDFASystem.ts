/**
 * UDFA System
 * Handles undrafted free agent signing with limited bonus budget
 * and competition with AI teams.
 */

import { Prospect, validateProspect } from './Prospect';
import { DraftClass } from './DraftClassGenerator';
import { Position } from '../models/player/Position';

/**
 * UDFA signing bonus budget per team (in thousands)
 */
export const UDFA_BONUS_BUDGET = 200;

/**
 * Maximum UDFA roster spots available
 */
export const MAX_UDFA_SIGNINGS = 20;

/**
 * UDFA interest level from a team
 */
export type UDFAInterestLevel = 'high' | 'moderate' | 'low' | 'none';

/**
 * AI team UDFA interest
 */
export interface TeamUDFAInterest {
  teamId: string;
  prospectId: string;
  interestLevel: UDFAInterestLevel;
  /** Bonus offer (thousands) */
  bonusOffer: number;
  /** Position need factor */
  needPriority: number;
}

/**
 * UDFA signing offer
 */
export interface UDFAOffer {
  teamId: string;
  prospectId: string;
  /** Signing bonus (thousands) */
  signingBonus: number;
  /** Contract years (typically 3) */
  years: number;
  /** Whether offer includes practice squad guarantee */
  practiceSquadGuarantee: boolean;
  /** Team's pitch/selling point */
  pitch: string;
}

/**
 * UDFA pool state
 */
export interface UDFAPoolState {
  /** Draft year */
  year: number;
  /** Available UDFAs */
  availableProspects: Prospect[];
  /** Signed UDFAs by team */
  signedByTeam: Map<string, Prospect[]>;
  /** Remaining budget by team (thousands) */
  remainingBudget: Map<string, number>;
  /** AI team interests (prospect ID -> interests) */
  aiInterests: Map<string, TeamUDFAInterest[]>;
  /** All team IDs */
  teamIds: string[];
  /** User's team ID */
  userTeamId: string;
}

/**
 * UDFA signing result
 */
export interface UDFASigningResult {
  success: boolean;
  prospect?: Prospect;
  signingBonus?: number;
  message: string;
}

/**
 * Creates UDFA pool from draft class (prospects not selected)
 */
export function createUDFAPool(
  draftClass: DraftClass,
  selectedProspectIds: Set<string>,
  teamIds: string[],
  userTeamId: string
): UDFAPoolState {
  // Filter out drafted prospects
  const availableProspects = draftClass.prospects.filter(
    (p) => !selectedProspectIds.has(p.id)
  );

  // Initialize budgets
  const remainingBudget = new Map<string, number>();
  const signedByTeam = new Map<string, Prospect[]>();

  for (const teamId of teamIds) {
    remainingBudget.set(teamId, UDFA_BONUS_BUDGET);
    signedByTeam.set(teamId, []);
  }

  // Generate AI interests
  const aiInterests = generateAIInterests(availableProspects, teamIds, userTeamId);

  return {
    year: draftClass.year,
    availableProspects,
    signedByTeam,
    remainingBudget,
    aiInterests,
    teamIds,
    userTeamId,
  };
}

/**
 * Generates AI team interests in UDFAs
 */
function generateAIInterests(
  prospects: Prospect[],
  teamIds: string[],
  userTeamId: string
): Map<string, TeamUDFAInterest[]> {
  const interests = new Map<string, TeamUDFAInterest[]>();

  for (const prospect of prospects) {
    const prospectInterests: TeamUDFAInterest[] = [];

    for (const teamId of teamIds) {
      if (teamId === userTeamId) continue;

      // Determine interest level based on prospect quality
      const quality = getProspectQuality(prospect);
      const interestLevel = determineInterestLevel(quality);

      if (interestLevel === 'none') continue;

      const bonusOffer = calculateBonusOffer(interestLevel, quality);
      const needPriority = Math.random(); // Simplified need priority

      prospectInterests.push({
        teamId,
        prospectId: prospect.id,
        interestLevel,
        bonusOffer,
        needPriority,
      });
    }

    if (prospectInterests.length > 0) {
      interests.set(prospect.id, prospectInterests);
    }
  }

  return interests;
}

/**
 * Gets prospect quality score (0-100)
 */
function getProspectQuality(prospect: Prospect): number {
  const ceilingScores: Record<string, number> = {
    franchiseCornerstone: 95,
    highEndStarter: 85,
    solidStarter: 75,
    qualityRotational: 60,
    specialist: 50,
    depth: 35,
    practiceSquad: 20,
  };

  return ceilingScores[prospect.player.roleFit.ceiling] || 30;
}

/**
 * Determines interest level based on quality
 */
function determineInterestLevel(quality: number): UDFAInterestLevel {
  const rand = Math.random();

  // Higher quality = more likely to generate interest
  if (quality >= 50) {
    if (rand < 0.4) return 'high';
    if (rand < 0.7) return 'moderate';
    if (rand < 0.9) return 'low';
    return 'none';
  } else if (quality >= 35) {
    if (rand < 0.2) return 'high';
    if (rand < 0.5) return 'moderate';
    if (rand < 0.8) return 'low';
    return 'none';
  } else {
    if (rand < 0.1) return 'moderate';
    if (rand < 0.4) return 'low';
    return 'none';
  }
}

/**
 * Calculates bonus offer based on interest and quality
 */
function calculateBonusOffer(interest: UDFAInterestLevel, quality: number): number {
  const baseOffers: Record<UDFAInterestLevel, number> = {
    high: 40,
    moderate: 20,
    low: 10,
    none: 0,
  };

  const base = baseOffers[interest];
  const qualityBonus = (quality / 100) * 30;
  const variance = (Math.random() - 0.5) * 10;

  return Math.max(5, Math.round(base + qualityBonus + variance));
}

/**
 * Gets AI competition for a prospect
 */
export function getProspectCompetition(
  state: UDFAPoolState,
  prospectId: string
): TeamUDFAInterest[] {
  return state.aiInterests.get(prospectId) || [];
}

/**
 * Gets top UDFA prospects by quality
 */
export function getTopUDFAs(state: UDFAPoolState, limit: number = 50): Prospect[] {
  return [...state.availableProspects]
    .sort((a, b) => getProspectQuality(b) - getProspectQuality(a))
    .slice(0, limit);
}

/**
 * Gets UDFAs by position
 */
export function getUDFAsByPosition(state: UDFAPoolState, position: Position): Prospect[] {
  return state.availableProspects.filter((p) => p.player.position === position);
}

/**
 * User attempts to sign a UDFA
 */
export function attemptUDFASigning(
  state: UDFAPoolState,
  prospectId: string,
  bonusOffer: number
): { result: UDFASigningResult; newState: UDFAPoolState } {
  const prospect = state.availableProspects.find((p) => p.id === prospectId);

  if (!prospect) {
    return {
      result: { success: false, message: 'Prospect not available' },
      newState: state,
    };
  }

  const userBudget = state.remainingBudget.get(state.userTeamId) || 0;
  if (bonusOffer > userBudget) {
    return {
      result: { success: false, message: 'Insufficient bonus budget' },
      newState: state,
    };
  }

  const userSignings = state.signedByTeam.get(state.userTeamId) || [];
  if (userSignings.length >= MAX_UDFA_SIGNINGS) {
    return {
      result: { success: false, message: 'Maximum UDFA roster limit reached' },
      newState: state,
    };
  }

  // Check AI competition
  const competition = getProspectCompetition(state, prospectId);
  const beatCompetition = evaluateOfferVsCompetition(bonusOffer, competition);

  if (!beatCompetition.success) {
    return {
      result: {
        success: false,
        message: `Prospect signed with ${beatCompetition.winningTeam || 'another team'} for a better offer`,
      },
      newState: removeProspectFromPool(state, prospectId, beatCompetition.winningTeam || ''),
    };
  }

  // Sign the prospect
  const newState = signProspect(state, state.userTeamId, prospect, bonusOffer);

  return {
    result: {
      success: true,
      prospect,
      signingBonus: bonusOffer,
      message: `Successfully signed ${prospect.player.firstName} ${prospect.player.lastName}`,
    },
    newState,
  };
}

/**
 * Evaluates user offer against AI competition
 */
function evaluateOfferVsCompetition(
  userOffer: number,
  competition: TeamUDFAInterest[]
): { success: boolean; winningTeam?: string } {
  if (competition.length === 0) {
    return { success: true };
  }

  // Find best competing offer
  const bestCompetitor = competition.reduce((best, current) => {
    const currentScore = current.bonusOffer * (1 + current.needPriority * 0.3);
    const bestScore = best.bonusOffer * (1 + best.needPriority * 0.3);
    return currentScore > bestScore ? current : best;
  });

  // User needs to beat competitor by at least match or slight premium
  const competitorEffectiveOffer = bestCompetitor.bonusOffer * 0.9; // 10% discount for user advantage

  if (userOffer >= competitorEffectiveOffer) {
    return { success: true };
  }

  return { success: false, winningTeam: bestCompetitor.teamId };
}

/**
 * Signs a prospect to a team
 */
function signProspect(
  state: UDFAPoolState,
  teamId: string,
  prospect: Prospect,
  bonus: number
): UDFAPoolState {
  const newAvailable = state.availableProspects.filter((p) => p.id !== prospect.id);

  const newSignedByTeam = new Map(state.signedByTeam);
  const teamSignings = [...(newSignedByTeam.get(teamId) || []), prospect];
  newSignedByTeam.set(teamId, teamSignings);

  const newBudget = new Map(state.remainingBudget);
  const currentBudget = newBudget.get(teamId) || 0;
  newBudget.set(teamId, currentBudget - bonus);

  // Remove from AI interests
  const newInterests = new Map(state.aiInterests);
  newInterests.delete(prospect.id);

  return {
    ...state,
    availableProspects: newAvailable,
    signedByTeam: newSignedByTeam,
    remainingBudget: newBudget,
    aiInterests: newInterests,
  };
}

/**
 * Removes prospect from pool (signed by AI)
 */
function removeProspectFromPool(
  state: UDFAPoolState,
  prospectId: string,
  signingTeamId: string
): UDFAPoolState {
  const prospect = state.availableProspects.find((p) => p.id === prospectId);
  if (!prospect) return state;

  const competition = state.aiInterests.get(prospectId) || [];
  const winnerInterest = competition.find((c) => c.teamId === signingTeamId);
  const bonus = winnerInterest?.bonusOffer || 10;

  return signProspect(state, signingTeamId, prospect, bonus);
}

/**
 * Simulates AI UDFA signings
 */
export function simulateAISignings(
  state: UDFAPoolState,
  rounds: number = 3
): UDFAPoolState {
  let currentState = state;

  for (let round = 0; round < rounds; round++) {
    // Each AI team makes signing attempts
    for (const teamId of currentState.teamIds) {
      if (teamId === currentState.userTeamId) continue;

      const teamBudget = currentState.remainingBudget.get(teamId) || 0;
      const teamSignings = currentState.signedByTeam.get(teamId) || [];

      if (teamBudget < 5 || teamSignings.length >= MAX_UDFA_SIGNINGS) {
        continue;
      }

      // Find prospects this team is interested in
      const interests: { prospect: Prospect; interest: TeamUDFAInterest }[] = [];
      for (const [prospectId, prospectInterests] of currentState.aiInterests) {
        const teamInterest = prospectInterests.find((i) => i.teamId === teamId);
        if (teamInterest && teamInterest.bonusOffer <= teamBudget) {
          const prospect = currentState.availableProspects.find((p) => p.id === prospectId);
          if (prospect) {
            interests.push({ prospect, interest: teamInterest });
          }
        }
      }

      if (interests.length === 0) continue;

      // Sort by interest priority
      interests.sort((a, b) => {
        const scoreA =
          (a.interest.interestLevel === 'high' ? 3 : a.interest.interestLevel === 'moderate' ? 2 : 1) *
          a.interest.needPriority;
        const scoreB =
          (b.interest.interestLevel === 'high' ? 3 : b.interest.interestLevel === 'moderate' ? 2 : 1) *
          b.interest.needPriority;
        return scoreB - scoreA;
      });

      // Attempt to sign top target
      const target = interests[0];
      if (target && Math.random() < 0.6) {
        // 60% chance to sign per round
        currentState = signProspect(
          currentState,
          teamId,
          target.prospect,
          target.interest.bonusOffer
        );
      }
    }
  }

  return currentState;
}

/**
 * Gets user's remaining UDFA budget
 */
export function getUserRemainingBudget(state: UDFAPoolState): number {
  return state.remainingBudget.get(state.userTeamId) || 0;
}

/**
 * Gets user's signed UDFAs
 */
export function getUserSignedUDFAs(state: UDFAPoolState): Prospect[] {
  return state.signedByTeam.get(state.userTeamId) || [];
}

/**
 * Gets team's signed UDFAs
 */
export function getTeamSignedUDFAs(state: UDFAPoolState, teamId: string): Prospect[] {
  return state.signedByTeam.get(teamId) || [];
}

/**
 * Creates a UDFA offer for display
 */
export function createUDFAOffer(
  teamId: string,
  prospectId: string,
  signingBonus: number,
  practiceSquadGuarantee: boolean = false
): UDFAOffer {
  const pitches = [
    'Best opportunity to make the 53-man roster',
    'Strong position group to learn from',
    'Excellent coaching staff for development',
    'Clear path to playing time',
    'Family-friendly organization',
    'Proven track record with UDFAs',
  ];

  return {
    teamId,
    prospectId,
    signingBonus,
    years: 3, // Standard UDFA contract
    practiceSquadGuarantee,
    pitch: pitches[Math.floor(Math.random() * pitches.length)],
  };
}

/**
 * UDFA pool summary
 */
export interface UDFAPoolSummary {
  totalAvailable: number;
  byPosition: Map<Position, number>;
  averageQuality: number;
  topProspects: { name: string; position: Position; quality: number }[];
}

/**
 * Gets UDFA pool summary
 */
export function getUDFAPoolSummary(state: UDFAPoolState): UDFAPoolSummary {
  const byPosition = new Map<Position, number>();

  for (const prospect of state.availableProspects) {
    const count = byPosition.get(prospect.player.position) || 0;
    byPosition.set(prospect.player.position, count + 1);
  }

  const qualities = state.availableProspects.map(getProspectQuality);
  const averageQuality = qualities.length > 0
    ? qualities.reduce((a, b) => a + b, 0) / qualities.length
    : 0;

  const topProspects = getTopUDFAs(state, 10).map((p) => ({
    name: `${p.player.firstName} ${p.player.lastName}`,
    position: p.player.position,
    quality: getProspectQuality(p),
  }));

  return {
    totalAvailable: state.availableProspects.length,
    byPosition,
    averageQuality,
    topProspects,
  };
}

/**
 * Validates UDFA pool state
 */
export function validateUDFAPoolState(state: UDFAPoolState): boolean {
  if (typeof state.year !== 'number') return false;
  if (state.year < 2000 || state.year > 2100) return false;

  if (!Array.isArray(state.availableProspects)) return false;
  for (const prospect of state.availableProspects.slice(0, 10)) {
    if (!validateProspect(prospect)) return false;
  }

  if (!(state.signedByTeam instanceof Map)) return false;
  if (!(state.remainingBudget instanceof Map)) return false;
  if (!(state.aiInterests instanceof Map)) return false;

  if (!Array.isArray(state.teamIds)) return false;
  if (!state.userTeamId || typeof state.userTeamId !== 'string') return false;

  return true;
}
