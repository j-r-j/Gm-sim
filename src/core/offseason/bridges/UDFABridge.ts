/**
 * UDFA Bridge
 * Connects UDFAPhase.ts (OffSeasonState events) with UDFASystem.ts (actual system)
 */

import {
  OffSeasonState,
  addEvent,
  addSigning,
  completeTask,
  PlayerSigning,
} from '../OffSeasonPhaseManager';
import {
  createUDFAPool,
  attemptUDFASigning,
  simulateAISignings,
  getTopUDFAs,
  getUserRemainingBudget,
  getUserSignedUDFAs,
  getUDFAPoolSummary,
  UDFAPoolState,
  UDFASigningResult,
  UDFA_BONUS_BUDGET,
  MAX_UDFA_SIGNINGS,
} from '../../draft/UDFASystem';
import { DraftClass } from '../../draft/DraftClassGenerator';
import type { UDFASigningRecord } from '../OffseasonPersistentData';
import { Prospect } from '../../draft/Prospect';

/**
 * Initializes the UDFA pool from draft results
 */
export function initializeUDFAPool(
  draftClass: DraftClass,
  draftedProspectIds: string[],
  teamIds: string[],
  userTeamId: string
): UDFAPoolState {
  const selectedProspectIds = new Set(draftedProspectIds);
  return createUDFAPool(draftClass, selectedProspectIds, teamIds, userTeamId);
}

/**
 * Processes user UDFA signing attempt
 */
export function processUserUDFASigning(
  poolState: UDFAPoolState,
  prospectId: string,
  bonusOffer: number
): { result: UDFASigningResult; newState: UDFAPoolState } {
  return attemptUDFASigning(poolState, prospectId, bonusOffer);
}

/**
 * Runs AI UDFA signing simulation
 */
export function runAIUDFASignings(poolState: UDFAPoolState, rounds: number = 3): UDFAPoolState {
  return simulateAISignings(poolState, rounds);
}

/**
 * Converts UDFA signings to persistent records
 */
export function convertToUDFASigningRecords(
  poolState: UDFAPoolState,
  _userTeamId: string
): UDFASigningRecord[] {
  const records: UDFASigningRecord[] = [];

  for (const [teamId, prospects] of poolState.signedByTeam) {
    for (const prospect of prospects) {
      records.push({
        prospectId: prospect.id,
        playerName: `${prospect.player.firstName} ${prospect.player.lastName}`,
        position: prospect.player.position,
        school: prospect.collegeName, // Map collegeName to school field
        teamId,
        contractYears: 3,
        baseSalary: 750, // Standard UDFA salary in thousands
        signingBonus: estimateSigningBonus(poolState, prospect.id, teamId),
      });
    }
  }

  return records;
}

/**
 * Estimates signing bonus for a prospect (approximation based on remaining budget)
 */
function estimateSigningBonus(
  poolState: UDFAPoolState,
  prospectId: string,
  teamId: string
): number {
  // Try to find the interest level for this signing
  const interests = poolState.aiInterests.get(prospectId);
  if (interests) {
    const teamInterest = interests.find((i) => i.teamId === teamId);
    if (teamInterest) {
      return teamInterest.bonusOffer;
    }
  }

  // Default signing bonus
  return 15;
}

/**
 * Integrates UDFA signings into OffSeasonState
 */
export function integrateUDFAIntoOffseasonState(
  state: OffSeasonState,
  poolState: UDFAPoolState,
  userTeamId: string
): OffSeasonState {
  let newState = addEvent(
    state,
    'phase_start',
    `UDFA signing period begins - Budget: $${UDFA_BONUS_BUDGET}K`,
    { budget: UDFA_BONUS_BUDGET, maxSignings: MAX_UDFA_SIGNINGS }
  );

  // Add signings for user's team
  const userSignings = getUserSignedUDFAs(poolState);
  for (const prospect of userSignings) {
    const signing: PlayerSigning = {
      playerId: prospect.id,
      playerName: `${prospect.player.firstName} ${prospect.player.lastName}`,
      position: prospect.player.position,
      teamId: userTeamId,
      contractYears: 3,
      contractValue: 750 * 3, // 3 years of base salary
      signingType: 'udfa',
      phase: 'udfa',
    };

    newState = addSigning(newState, signing);

    newState = addEvent(
      newState,
      'signing',
      `Signed UDFA ${prospect.player.firstName} ${prospect.player.lastName} (${prospect.player.position}) from ${prospect.collegeName}`,
      { prospectId: prospect.id }
    );
  }

  // Summary of all signings
  const summary = getUDFAPoolSummary(poolState);
  let totalSigned = 0;
  for (const prospects of poolState.signedByTeam.values()) {
    totalSigned += prospects.length;
  }

  newState = addEvent(
    newState,
    'phase_complete',
    `UDFA signing period complete: ${totalSigned} prospects signed league-wide`,
    {
      totalSigned,
      remainingAvailable: summary.totalAvailable,
      userSignings: userSignings.length,
    }
  );

  newState = completeTask(newState, 'review_udfa');
  if (userSignings.length > 0) {
    newState = completeTask(newState, 'sign_udfa');
  }

  return newState;
}

/**
 * Gets the top available UDFAs for user to review
 */
export function getTopAvailableUDFAs(poolState: UDFAPoolState, limit: number = 50): Prospect[] {
  return getTopUDFAs(poolState, limit);
}

/**
 * Gets user's remaining signing budget
 */
export function getUserBudget(poolState: UDFAPoolState): number {
  return getUserRemainingBudget(poolState);
}

/**
 * Gets user's signed UDFAs
 */
export function getUserUDFAs(poolState: UDFAPoolState): Prospect[] {
  return getUserSignedUDFAs(poolState);
}

/**
 * Checks if user can sign more UDFAs
 */
export function canUserSignMore(poolState: UDFAPoolState): boolean {
  const budget = getUserRemainingBudget(poolState);
  const signings = getUserSignedUDFAs(poolState);
  return budget >= 5 && signings.length < MAX_UDFA_SIGNINGS;
}

/**
 * Gets complete UDFA phase summary
 */
export function getUDFAPhaseSummary(
  poolState: UDFAPoolState,
  _userTeamId: string
): {
  userSignings: Prospect[];
  userBudgetRemaining: number;
  totalAvailable: number;
  topAvailable: Prospect[];
  leagueSignings: number;
} {
  const summary = getUDFAPoolSummary(poolState);
  let leagueSignings = 0;
  for (const prospects of poolState.signedByTeam.values()) {
    leagueSignings += prospects.length;
  }

  return {
    userSignings: getUserSignedUDFAs(poolState),
    userBudgetRemaining: getUserRemainingBudget(poolState),
    totalAvailable: summary.totalAvailable,
    topAvailable: getTopUDFAs(poolState, 20),
    leagueSignings,
  };
}
