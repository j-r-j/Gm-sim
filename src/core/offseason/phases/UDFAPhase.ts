/**
 * UDFA Phase (Phase 7)
 * Handles signing of undrafted free agents
 */

import {
  OffSeasonState,
  addEvent,
  addSigning,
  completeTask,
  PlayerSigning,
} from '../OffSeasonPhaseManager';

/**
 * UDFA prospect information
 */
export interface UDFAProspect {
  prospectId: string;
  name: string;
  position: string;
  school: string;
  overallGrade: number;
  athleticScore: number;
  collegeProduction: number;
  projectedRole: 'roster_bubble' | 'practice_squad' | 'developmental';
  strengths: string[];
  weaknesses: string[];
  interest: Map<string, number>; // teamId -> interest level (1-100)
  signed: boolean;
  signedTeamId: string | null;
}

/**
 * UDFA signing offer
 */
export interface UDFAOffer {
  prospectId: string;
  prospectName: string;
  position: string;
  teamId: string;
  guaranteedMoney: number;
  rosterBonus: number;
  practiceSquadPriority: boolean;
}

/**
 * UDFA signing result
 */
export interface UDFASigningResult {
  prospect: UDFAProspect;
  offer: UDFAOffer;
  contract: {
    years: number;
    totalValue: number;
    guaranteed: number;
  };
}

/**
 * Team UDFA priority list
 */
export interface TeamUDFAPriorities {
  teamId: string;
  targetPositions: string[];
  signingBudget: number;
  remainingBudget: number;
  signedCount: number;
  maxSignings: number;
  signedPlayers: UDFASigningResult[];
}

/**
 * Default UDFA contract values
 */
const UDFA_CONTRACT = {
  years: 3,
  baseSalary: 750, // $750K per year
  minGuarantee: 5,
  maxGuarantee: 250,
  minRosterBonus: 0,
  maxRosterBonus: 100,
};

/**
 * Calculates UDFA offer based on prospect grade
 */
export function calculateUDFAOffer(
  prospect: UDFAProspect,
  teamId: string,
  budgetRemaining: number
): UDFAOffer {
  // Higher graded prospects get better offers
  const gradeMultiplier = prospect.overallGrade / 100;
  const athleticMultiplier = prospect.athleticScore / 100;

  const baseGuarantee = UDFA_CONTRACT.minGuarantee;
  const guaranteeRange = UDFA_CONTRACT.maxGuarantee - UDFA_CONTRACT.minGuarantee;
  const guaranteedMoney = Math.min(
    Math.round(baseGuarantee + guaranteeRange * gradeMultiplier * athleticMultiplier),
    budgetRemaining * 0.4
  );

  const rosterBonusRange = UDFA_CONTRACT.maxRosterBonus - UDFA_CONTRACT.minRosterBonus;
  const rosterBonus = Math.round(rosterBonusRange * gradeMultiplier);

  return {
    prospectId: prospect.prospectId,
    prospectName: prospect.name,
    position: prospect.position,
    teamId,
    guaranteedMoney,
    rosterBonus,
    practiceSquadPriority: prospect.projectedRole === 'practice_squad',
  };
}

/**
 * Determines if a UDFA would accept an offer
 */
export function wouldAcceptOffer(
  prospect: UDFAProspect,
  offer: UDFAOffer,
  competingOffers: UDFAOffer[]
): boolean {
  // Get interest level in offering team
  const interest = prospect.interest.get(offer.teamId) || 50;

  // Compare to competing offers
  let bestCompetingGuarantee = 0;
  for (const competing of competingOffers) {
    if (competing.guaranteedMoney > bestCompetingGuarantee) {
      bestCompetingGuarantee = competing.guaranteedMoney;
    }
  }

  // Accept if offer is best or within 10% and high interest
  const offerValue = offer.guaranteedMoney + (interest / 100) * 50;
  const bestCompetingValue = bestCompetingGuarantee;

  return offerValue >= bestCompetingValue * 0.9;
}

/**
 * Signs a UDFA
 */
export function signUDFA(
  state: OffSeasonState,
  result: UDFASigningResult
): OffSeasonState {
  const signing: PlayerSigning = {
    playerId: result.prospect.prospectId,
    playerName: result.prospect.name,
    position: result.prospect.position,
    teamId: result.offer.teamId,
    contractYears: result.contract.years,
    contractValue: result.contract.totalValue,
    signingType: 'udfa',
    phase: 'udfa',
  };

  let newState = addSigning(state, signing);

  newState = addEvent(
    newState,
    'signing',
    `Signed UDFA ${result.prospect.name} (${result.prospect.position}) from ${result.prospect.school}`,
    { result }
  );

  return newState;
}

/**
 * Processes UDFA phase
 */
export function processUDFA(
  state: OffSeasonState,
  priorities: TeamUDFAPriorities,
  signings: UDFASigningResult[]
): OffSeasonState {
  let newState = addEvent(
    state,
    'phase_start',
    `UDFA signing period begins - Budget: $${priorities.signingBudget}K`,
    { priorities }
  );

  for (const signing of signings) {
    newState = signUDFA(newState, signing);
  }

  newState = completeTask(newState, 'review_udfa');
  if (signings.length > 0) {
    newState = completeTask(newState, 'sign_udfa');
  }

  return newState;
}

/**
 * Gets available UDFAs sorted by grade
 */
export function getAvailableUDFAs(prospects: UDFAProspect[]): UDFAProspect[] {
  return prospects
    .filter((p) => !p.signed)
    .sort((a, b) => b.overallGrade - a.overallGrade);
}

/**
 * Gets UDFAs by position
 */
export function getUDFAsByPosition(
  prospects: UDFAProspect[],
  position: string
): UDFAProspect[] {
  return prospects
    .filter((p) => !p.signed && p.position === position)
    .sort((a, b) => b.overallGrade - a.overallGrade);
}

/**
 * Gets recommended UDFAs based on team needs
 */
export function getRecommendedUDFAs(
  prospects: UDFAProspect[],
  teamNeeds: string[],
  limit: number = 10
): UDFAProspect[] {
  const available = getAvailableUDFAs(prospects);

  // Score by need + grade
  const scored = available.map((p) => {
    const needBonus = teamNeeds.includes(p.position) ? 15 : 0;
    const interestBonus = (p.interest.get('user_team') || 50) / 10;
    return { prospect: p, score: p.overallGrade + needBonus + interestBonus };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.prospect);
}

/**
 * Creates UDFA contract
 */
export function createUDFAContract(offer: UDFAOffer): {
  years: number;
  totalValue: number;
  guaranteed: number;
} {
  return {
    years: UDFA_CONTRACT.years,
    totalValue: UDFA_CONTRACT.baseSalary * UDFA_CONTRACT.years,
    guaranteed: offer.guaranteedMoney,
  };
}

/**
 * Gets UDFA summary text
 */
export function getUDFASummaryText(prospect: UDFAProspect): string {
  return `${prospect.name} (${prospect.position})
${prospect.school}

Grade: ${prospect.overallGrade}
Athletic Score: ${prospect.athleticScore}
College Production: ${prospect.collegeProduction}
Projected Role: ${prospect.projectedRole.replace('_', ' ')}

Strengths: ${prospect.strengths.join(', ')}
Weaknesses: ${prospect.weaknesses.join(', ')}`;
}

/**
 * Gets signing summary text
 */
export function getUDFASigningSummaryText(result: UDFASigningResult): string {
  return `SIGNED UDFA: ${result.prospect.name}
Position: ${result.prospect.position}
School: ${result.prospect.school}
Grade: ${result.prospect.overallGrade}

Contract: ${result.contract.years} years
Guaranteed: $${result.contract.guaranteed}K
Roster Bonus: $${result.offer.rosterBonus}K
Practice Squad Priority: ${result.offer.practiceSquadPriority ? 'Yes' : 'No'}`;
}

/**
 * Calculates team UDFA priorities based on roster
 */
export function calculateUDFAPriorities(
  teamId: string,
  rosterNeeds: string[],
  budget: number = 1000,
  maxSignings: number = 15
): TeamUDFAPriorities {
  return {
    teamId,
    targetPositions: rosterNeeds,
    signingBudget: budget,
    remainingBudget: budget,
    signedCount: 0,
    maxSignings,
    signedPlayers: [],
  };
}

/**
 * Updates team priorities after signing
 */
export function updatePrioritiesAfterSigning(
  priorities: TeamUDFAPriorities,
  signing: UDFASigningResult
): TeamUDFAPriorities {
  return {
    ...priorities,
    remainingBudget: priorities.remainingBudget - signing.offer.guaranteedMoney,
    signedCount: priorities.signedCount + 1,
    signedPlayers: [...priorities.signedPlayers, signing],
  };
}

/**
 * Checks if team can sign more UDFAs
 */
export function canSignMoreUDFAs(priorities: TeamUDFAPriorities): boolean {
  return (
    priorities.signedCount < priorities.maxSignings &&
    priorities.remainingBudget > UDFA_CONTRACT.minGuarantee
  );
}
