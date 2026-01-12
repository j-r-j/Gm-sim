/**
 * Interview System
 * Manages the job application and interview process
 */

import { Owner } from '../models/owner';
import { JobOpening, TeamInterest, InterestLevel } from './JobMarketManager';
import { ReputationTier } from './CareerRecordTracker';

/**
 * Interview status
 */
export type InterviewStatus =
  | 'not_requested'
  | 'requested'
  | 'scheduled'
  | 'completed'
  | 'offer_extended'
  | 'offer_accepted'
  | 'offer_declined'
  | 'rejected';

/**
 * Contract offer details
 */
export interface ContractOffer {
  teamId: string;
  teamName: string;
  annualSalary: number;
  lengthYears: number;
  signingBonus: number;
  totalValue: number;
  autonomyLevel: 'low' | 'moderate' | 'high' | 'full';
  budgetLevel: 'limited' | 'moderate' | 'competitive' | 'unlimited';
  expirationWeek: number; // When the offer expires
}

/**
 * Owner preview revealed during interview
 */
export interface OwnerPreview {
  fullName: string;
  yearsAsOwner: number;
  previousGMsFired: number;
  championshipsWon: number;
  patienceLevel: 'very_impatient' | 'impatient' | 'moderate' | 'patient' | 'very_patient';
  spendingLevel: 'frugal' | 'budget_conscious' | 'moderate' | 'generous' | 'lavish';
  controlLevel: 'hands_off' | 'occasional_input' | 'involved' | 'controlling' | 'micromanager';
  keyQuote: string;
  warnings: string[];
}

/**
 * Interview record
 */
export interface InterviewRecord {
  id: string;
  openingId: string;
  teamId: string;
  teamName: string;

  // Status tracking
  status: InterviewStatus;
  requestedAt: number | null;
  scheduledFor: number | null;
  completedAt: number | null;

  // Results
  interviewScore: number | null; // How well the interview went
  offer: ContractOffer | null;
  ownerPreview: OwnerPreview | null;

  // Player decisions
  playerAccepted: boolean;
  rejectionReason: string | null;
}

/**
 * Interview system state
 */
export interface InterviewState {
  currentYear: number;
  currentWeek: number;
  interviews: InterviewRecord[];
  maxActiveInterviews: number;
  interviewsThisCycle: number;
}

/**
 * Creates initial interview state
 */
export function createInterviewState(year: number, week: number): InterviewState {
  return {
    currentYear: year,
    currentWeek: week,
    interviews: [],
    maxActiveInterviews: 5,
    interviewsThisCycle: 0,
  };
}

/**
 * Requests an interview with a team
 */
export function requestInterview(
  state: InterviewState,
  opening: JobOpening,
  teamInterest: TeamInterest
): { state: InterviewState; success: boolean; message: string } {
  // Check if already have an interview with this team
  const existingInterview = state.interviews.find(
    (i) => i.openingId === opening.id && i.status !== 'rejected' && i.status !== 'offer_declined'
  );

  if (existingInterview) {
    return {
      state,
      success: false,
      message: 'Already have an interview in progress with this team',
    };
  }

  // Check interest level
  if (teamInterest.interestLevel === 'none') {
    return {
      state,
      success: false,
      message: 'This team has no interest in your candidacy',
    };
  }

  // Check max active interviews
  const activeInterviews = state.interviews.filter(
    (i) => i.status === 'requested' || i.status === 'scheduled' || i.status === 'offer_extended'
  );

  if (activeInterviews.length >= state.maxActiveInterviews) {
    return {
      state,
      success: false,
      message: 'You have too many active interviews. Complete or decline some first.',
    };
  }

  // Calculate scheduling based on interest
  const scheduledWeek = calculateScheduledWeek(state.currentWeek, teamInterest.interestLevel);

  const newInterview: InterviewRecord = {
    id: `interview-${opening.id}-${Date.now()}`,
    openingId: opening.id,
    teamId: opening.teamId,
    teamName: `${opening.teamCity} ${opening.teamName}`,
    status: 'scheduled',
    requestedAt: state.currentWeek,
    scheduledFor: scheduledWeek,
    completedAt: null,
    interviewScore: null,
    offer: null,
    ownerPreview: null,
    playerAccepted: false,
    rejectionReason: null,
  };

  return {
    state: {
      ...state,
      interviews: [...state.interviews, newInterview],
      interviewsThisCycle: state.interviewsThisCycle + 1,
    },
    success: true,
    message: `Interview scheduled with ${newInterview.teamName}`,
  };
}

/**
 * Calculates when interview is scheduled based on interest
 */
function calculateScheduledWeek(currentWeek: number, interest: InterestLevel): number {
  const delays: Record<InterestLevel, number> = {
    elite: 0,      // Immediate
    high: 1,       // Next week
    moderate: 2,   // Two weeks
    low: 3,        // Three weeks
    none: 99,      // Never (shouldn't happen)
  };
  return currentWeek + delays[interest];
}

/**
 * Conducts an interview
 */
export function conductInterview(
  state: InterviewState,
  interviewId: string,
  owner: Owner,
  reputationScore: number,
  careerWinPercentage: number
): InterviewState {
  const interview = state.interviews.find((i) => i.id === interviewId);
  if (!interview || interview.status !== 'scheduled') {
    return state;
  }

  // Calculate interview score (how well it went)
  const interviewScore = calculateInterviewScore(reputationScore, careerWinPercentage, owner);

  // Generate owner preview
  const ownerPreview = generateOwnerPreview(owner);

  // Determine if offer is extended
  const { offer, rejected, rejectionReason } = determineInterviewOutcome(
    interviewScore,
    owner,
    interview.teamName,
    state.currentWeek
  );

  const updatedInterview: InterviewRecord = {
    ...interview,
    status: rejected ? 'rejected' : offer ? 'offer_extended' : 'completed',
    completedAt: state.currentWeek,
    interviewScore,
    offer,
    ownerPreview,
    rejectionReason,
  };

  return {
    ...state,
    interviews: state.interviews.map((i) =>
      i.id === interviewId ? updatedInterview : i
    ),
  };
}

/**
 * Calculates interview performance score
 */
function calculateInterviewScore(
  reputationScore: number,
  careerWinPercentage: number,
  owner: Owner
): number {
  let score = 50;

  // Reputation contributes
  score += (reputationScore - 50) / 2;

  // Win percentage matters
  if (careerWinPercentage >= 0.6) {
    score += 15;
  } else if (careerWinPercentage >= 0.5) {
    score += 8;
  } else if (careerWinPercentage < 0.4) {
    score -= 10;
  }

  // Random interview performance factor
  const interviewPerformance = Math.random() * 20 - 10; // -10 to +10
  score += interviewPerformance;

  // Owner personality affects perception
  if (owner.personality.traits.control >= 70) {
    // High control owners want someone they can direct
    score -= 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Generates owner preview revealed during interview
 */
export function generateOwnerPreview(owner: Owner): OwnerPreview {
  const { traits } = owner.personality;
  const warnings: string[] = [];

  // Generate warnings based on traits
  if (traits.patience <= 30) {
    warnings.push('Known for having a short leash with GMs');
  }
  if (traits.control >= 70) {
    warnings.push('Heavily involved in personnel decisions');
  }
  if (owner.previousGMsFired >= 3) {
    warnings.push(`Has fired ${owner.previousGMsFired} GMs in their tenure`);
  }
  if (traits.spending <= 30) {
    warnings.push('Reluctant to spend on premium free agents');
  }

  // Generate key quote
  const keyQuote = generateOwnerQuote(owner);

  return {
    fullName: `${owner.firstName} ${owner.lastName}`,
    yearsAsOwner: owner.yearsAsOwner,
    previousGMsFired: owner.previousGMsFired,
    championshipsWon: owner.championshipsWon,
    patienceLevel: getPatienceLevel(traits.patience),
    spendingLevel: getSpendingLevel(traits.spending),
    controlLevel: getControlLevel(traits.control),
    keyQuote,
    warnings,
  };
}

/**
 * Generates a characteristic quote from the owner
 */
function generateOwnerQuote(owner: Owner): string {
  const { traits, secondaryTraits } = owner.personality;

  if (secondaryTraits.includes('championshipOrBust')) {
    return "I'm not interested in playoff appearances. Championships are all that matter.";
  }
  if (secondaryTraits.includes('analyticsBeliever')) {
    return 'I believe in a data-driven approach to building a roster.';
  }
  if (secondaryTraits.includes('oldSchool')) {
    return "I trust football people who understand the game's fundamentals.";
  }
  if (traits.patience >= 70) {
    return "I understand building a winner takes time. I'm committed to the process.";
  }
  if (traits.patience <= 30) {
    return 'Our fans deserve better, and I expect results soon.';
  }
  if (traits.control >= 70) {
    return 'I like to be involved in major decisions. We work as a team here.';
  }
  if (traits.spending >= 70) {
    return "I'm willing to invest whatever it takes to win.";
  }

  return "I'm looking for a GM who shares my vision for this franchise.";
}

/**
 * Trait level converters
 */
function getPatienceLevel(value: number): OwnerPreview['patienceLevel'] {
  if (value <= 20) return 'very_impatient';
  if (value <= 40) return 'impatient';
  if (value <= 60) return 'moderate';
  if (value <= 80) return 'patient';
  return 'very_patient';
}

function getSpendingLevel(value: number): OwnerPreview['spendingLevel'] {
  if (value <= 20) return 'frugal';
  if (value <= 40) return 'budget_conscious';
  if (value <= 60) return 'moderate';
  if (value <= 80) return 'generous';
  return 'lavish';
}

function getControlLevel(value: number): OwnerPreview['controlLevel'] {
  if (value <= 20) return 'hands_off';
  if (value <= 40) return 'occasional_input';
  if (value <= 60) return 'involved';
  if (value <= 80) return 'controlling';
  return 'micromanager';
}

/**
 * Determines interview outcome
 */
function determineInterviewOutcome(
  interviewScore: number,
  owner: Owner,
  teamName: string,
  currentWeek: number
): { offer: ContractOffer | null; rejected: boolean; rejectionReason: string | null } {
  // Low score = rejected
  if (interviewScore < 40) {
    return {
      offer: null,
      rejected: true,
      rejectionReason: 'The team decided to pursue other candidates',
    };
  }

  // Medium score = no offer but not rejected
  if (interviewScore < 55) {
    return {
      offer: null,
      rejected: false,
      rejectionReason: null,
    };
  }

  // Good score = offer
  const offer = generateContractOffer(interviewScore, owner, teamName, currentWeek);

  return {
    offer,
    rejected: false,
    rejectionReason: null,
  };
}

/**
 * Generates a contract offer based on interview performance
 */
function generateContractOffer(
  interviewScore: number,
  owner: Owner,
  teamName: string,
  currentWeek: number
): ContractOffer {
  // Base salary calculation
  const baseSalary = 2000000; // $2M base
  const scoreBonus = (interviewScore - 50) * 50000; // +$50k per point above 50
  const annualSalary = Math.round(baseSalary + scoreBonus);

  // Contract length based on score and owner patience
  let lengthYears: number;
  if (interviewScore >= 80) {
    lengthYears = owner.personality.traits.patience >= 60 ? 5 : 4;
  } else if (interviewScore >= 65) {
    lengthYears = owner.personality.traits.patience >= 50 ? 4 : 3;
  } else {
    lengthYears = owner.personality.traits.patience >= 40 ? 3 : 2;
  }

  // Signing bonus
  const signingBonus = interviewScore >= 70 ? 500000 : interviewScore >= 60 ? 250000 : 0;

  // Autonomy based on owner control trait
  const controlTrait = owner.personality.traits.control;
  const autonomyLevel: ContractOffer['autonomyLevel'] =
    controlTrait <= 30 ? 'full' :
    controlTrait <= 50 ? 'high' :
    controlTrait <= 70 ? 'moderate' : 'low';

  // Budget based on owner spending
  const spendingTrait = owner.personality.traits.spending;
  const budgetLevel: ContractOffer['budgetLevel'] =
    spendingTrait >= 80 ? 'unlimited' :
    spendingTrait >= 60 ? 'competitive' :
    spendingTrait >= 40 ? 'moderate' : 'limited';

  return {
    teamId: owner.teamId,
    teamName,
    annualSalary,
    lengthYears,
    signingBonus,
    totalValue: annualSalary * lengthYears + signingBonus,
    autonomyLevel,
    budgetLevel,
    expirationWeek: currentWeek + 2, // Offer expires in 2 weeks
  };
}

/**
 * Accepts an offer
 */
export function acceptOffer(
  state: InterviewState,
  interviewId: string
): { state: InterviewState; offer: ContractOffer | null } {
  const interview = state.interviews.find((i) => i.id === interviewId);
  if (!interview || interview.status !== 'offer_extended' || !interview.offer) {
    return { state, offer: null };
  }

  // Decline all other offers
  const updatedInterviews = state.interviews.map((i) => {
    if (i.id === interviewId) {
      return { ...i, status: 'offer_accepted' as InterviewStatus, playerAccepted: true };
    }
    if (i.status === 'offer_extended') {
      return { ...i, status: 'offer_declined' as InterviewStatus };
    }
    return i;
  });

  return {
    state: { ...state, interviews: updatedInterviews },
    offer: interview.offer,
  };
}

/**
 * Declines an offer
 */
export function declineOffer(
  state: InterviewState,
  interviewId: string
): InterviewState {
  return {
    ...state,
    interviews: state.interviews.map((i) =>
      i.id === interviewId ? { ...i, status: 'offer_declined' as InterviewStatus } : i
    ),
  };
}

/**
 * Gets all pending interviews (scheduled but not completed)
 */
export function getPendingInterviews(state: InterviewState): InterviewRecord[] {
  return state.interviews.filter((i) => i.status === 'scheduled');
}

/**
 * Gets all active offers
 */
export function getActiveOffers(state: InterviewState): InterviewRecord[] {
  return state.interviews.filter((i) => i.status === 'offer_extended' && i.offer !== null);
}

/**
 * Checks for expired offers and updates status
 */
export function processExpiredOffers(state: InterviewState): InterviewState {
  return {
    ...state,
    interviews: state.interviews.map((interview) => {
      if (
        interview.status === 'offer_extended' &&
        interview.offer &&
        interview.offer.expirationWeek <= state.currentWeek
      ) {
        return {
          ...interview,
          status: 'offer_declined' as InterviewStatus,
          rejectionReason: 'Offer expired',
        };
      }
      return interview;
    }),
  };
}

/**
 * Advances the interview week
 */
export function advanceInterviewWeek(state: InterviewState, newWeek: number): InterviewState {
  return processExpiredOffers({
    ...state,
    currentWeek: newWeek,
  });
}

/**
 * Gets offer summary for display
 */
export function getOfferSummary(offer: ContractOffer): string {
  const salaryStr = `$${(offer.annualSalary / 1000000).toFixed(1)}M/year`;
  const totalStr = `$${(offer.totalValue / 1000000).toFixed(1)}M total`;
  return `${offer.lengthYears} years, ${salaryStr} (${totalStr})`;
}

/**
 * Validates interview state
 */
export function validateInterviewState(state: InterviewState): boolean {
  if (typeof state.currentYear !== 'number') return false;
  if (typeof state.currentWeek !== 'number') return false;
  if (!Array.isArray(state.interviews)) return false;
  if (state.maxActiveInterviews < 1) return false;
  if (state.interviewsThisCycle < 0) return false;

  return true;
}
