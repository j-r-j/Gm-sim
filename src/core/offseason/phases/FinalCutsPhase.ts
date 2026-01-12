/**
 * Final Cuts Phase (Phase 11)
 * Handles roster cuts to 53 players, practice squad formation, and waiver claims
 */

import {
  OffSeasonState,
  addEvent,
  addRelease,
  addSigning,
  completeTask,
  PlayerRelease,
  PlayerSigning,
} from '../OffSeasonPhaseManager';

/**
 * Player for cut evaluation
 */
export interface CutEvaluationPlayer {
  playerId: string;
  playerName: string;
  position: string;
  age: number;
  experience: number;
  overallRating: number;
  preseasonGrade: number;
  salary: number;
  guaranteed: number;
  deadCapIfCut: number;
  isVested: boolean;
  practiceSquadEligible: boolean;
  recommendation: 'keep' | 'cut' | 'ir' | 'practice_squad' | 'trade_block';
  notes: string[];
}

/**
 * Roster status
 */
export interface RosterStatus {
  teamId: string;
  activeRoster: CutEvaluationPlayer[];
  practiceSquad: CutEvaluationPlayer[];
  injuredReserve: CutEvaluationPlayer[];
  cutPlayers: CutEvaluationPlayer[];
  rosterSize: number;
  maxRosterSize: number;
  practiceSquadSize: number;
  maxPracticeSquadSize: number;
  capsRequired: number;
}

/**
 * Waiver claim
 */
export interface WaiverClaim {
  playerId: string;
  playerName: string;
  position: string;
  formerTeam: string;
  claimingTeam: string;
  claimPriority: number;
  wasSuccessful: boolean;
}

/**
 * Final cuts summary
 */
export interface FinalCutsSummary {
  year: number;
  playersCut: number;
  playersToPS: number;
  playersToIR: number;
  waiverClaims: WaiverClaim[];
  finalRoster: CutEvaluationPlayer[];
  practiceSquad: CutEvaluationPlayer[];
}

/**
 * Practice squad eligibility rules
 */
export function isPracticeSquadEligible(
  experience: number,
  gamesPreviouslyOnPS: number,
  isVested: boolean
): boolean {
  // Players with 0-2 accrued seasons are PS eligible
  // Players with 3+ seasons can be on PS if not vested
  if (experience <= 2) return true;
  if (experience <= 4 && !isVested) return true;
  if (gamesPreviouslyOnPS < 3) return true;
  return false;
}

/**
 * Calculates cut priority
 */
export function calculateCutPriority(player: CutEvaluationPlayer): number {
  // Higher score = more likely to cut
  let score = 0;

  // Rating factor (lower rating = higher cut priority)
  score += (100 - player.overallRating);

  // Preseason factor
  score += (100 - player.preseasonGrade);

  // Age factor (older players more expendable for depth)
  if (player.age >= 30) score += 10;
  if (player.age >= 33) score += 15;

  // Salary factor (higher salary = more savings)
  if (player.salary > 2000) score += 5;

  // Dead cap penalty
  score -= player.deadCapIfCut / 500;

  // Experience factor (rookies need development)
  if (player.experience === 0) score -= 15;

  return score;
}

/**
 * Evaluates roster for cuts
 */
export function evaluateRosterForCuts(
  roster: CutEvaluationPlayer[],
  targetSize: number = 53
): {
  keep: CutEvaluationPlayer[];
  cut: CutEvaluationPlayer[];
  practiceSquad: CutEvaluationPlayer[];
  ir: CutEvaluationPlayer[];
} {
  // Sort by position groups to ensure minimum requirements
  const positionMinimums: Record<string, number> = {
    QB: 2,
    RB: 3,
    WR: 5,
    TE: 3,
    OL: 9,
    DL: 6,
    LB: 6,
    CB: 5,
    S: 4,
    K: 1,
    P: 1,
  };

  const keep: CutEvaluationPlayer[] = [];
  const cut: CutEvaluationPlayer[] = [];
  const practiceSquad: CutEvaluationPlayer[] = [];
  const ir: CutEvaluationPlayer[] = [];

  // First, ensure minimum position requirements
  const positionCounts = new Map<string, number>();
  const sortedRoster = [...roster].sort(
    (a, b) => b.overallRating - a.overallRating
  );

  for (const player of sortedRoster) {
    const count = positionCounts.get(player.position) || 0;
    const minimum = positionMinimums[player.position] || 2;

    if (count < minimum) {
      keep.push(player);
      positionCounts.set(player.position, count + 1);
    }
  }

  // Then fill remaining spots by rating
  const remaining = sortedRoster.filter(
    (p) => !keep.includes(p)
  );
  const spotsLeft = targetSize - keep.length;

  for (let i = 0; i < remaining.length; i++) {
    const player = remaining[i];

    if (i < spotsLeft) {
      keep.push(player);
    } else if (player.recommendation === 'ir') {
      ir.push(player);
    } else if (player.practiceSquadEligible) {
      practiceSquad.push(player);
    } else {
      cut.push(player);
    }
  }

  return { keep, cut, practiceSquad, ir };
}

/**
 * Cuts a player from the roster
 */
export function cutPlayer(
  state: OffSeasonState,
  player: CutEvaluationPlayer,
  teamId: string
): OffSeasonState {
  const release: PlayerRelease = {
    playerId: player.playerId,
    playerName: player.playerName,
    position: player.position,
    teamId,
    releaseType: 'waived',
    capSavings: player.salary - player.deadCapIfCut,
    deadCap: player.deadCapIfCut,
    phase: 'final_cuts',
  };

  return addRelease(state, release);
}

/**
 * Signs a player to practice squad
 */
export function signToPracticeSquad(
  state: OffSeasonState,
  player: CutEvaluationPlayer,
  teamId: string
): OffSeasonState {
  const signing: PlayerSigning = {
    playerId: player.playerId,
    playerName: player.playerName,
    position: player.position,
    teamId,
    contractYears: 1,
    contractValue: 350, // Practice squad minimum
    signingType: 'free_agent',
    phase: 'final_cuts',
  };

  let newState = addSigning(state, signing);
  newState = addEvent(
    newState,
    'signing',
    `Signed ${player.playerName} to practice squad`,
    { player }
  );

  return newState;
}

/**
 * Places a player on IR
 */
export function placeOnIR(
  state: OffSeasonState,
  player: CutEvaluationPlayer,
  teamId: string
): OffSeasonState {
  return addEvent(
    state,
    'roster_move',
    `Placed ${player.playerName} on Injured Reserve`,
    {
      playerId: player.playerId,
      playerName: player.playerName,
      position: player.position,
      teamId,
      moveType: 'ir',
    }
  );
}

/**
 * Processes waiver claim
 */
export function processWaiverClaim(
  state: OffSeasonState,
  claim: WaiverClaim
): OffSeasonState {
  if (claim.wasSuccessful) {
    const signing: PlayerSigning = {
      playerId: claim.playerId,
      playerName: claim.playerName,
      position: claim.position,
      teamId: claim.claimingTeam,
      contractYears: 1,
      contractValue: 0, // Claimed contract
      signingType: 'free_agent',
      phase: 'final_cuts',
    };

    let newState = addSigning(state, signing);
    newState = addEvent(
      newState,
      'signing',
      `Claimed ${claim.playerName} (${claim.position}) off waivers`,
      { claim }
    );
    return newState;
  }

  return addEvent(
    state,
    'roster_move',
    `Failed waiver claim for ${claim.playerName}`,
    { claim }
  );
}

/**
 * Processes final cuts phase
 */
export function processFinalCuts(
  state: OffSeasonState,
  cuts: CutEvaluationPlayer[],
  practiceSquad: CutEvaluationPlayer[],
  irPlayers: CutEvaluationPlayer[],
  waiverClaims: WaiverClaim[],
  teamId: string
): OffSeasonState {
  let newState = state;

  // Process cuts
  for (const player of cuts) {
    newState = cutPlayer(newState, player, teamId);
  }

  // Process practice squad signings
  for (const player of practiceSquad) {
    newState = signToPracticeSquad(newState, player, teamId);
  }

  // Process IR placements
  for (const player of irPlayers) {
    newState = placeOnIR(newState, player, teamId);
  }

  // Process waiver claims
  for (const claim of waiverClaims) {
    newState = processWaiverClaim(newState, claim);
  }

  newState = addEvent(
    newState,
    'phase_complete',
    `Final roster set: ${cuts.length} players released, ${practiceSquad.length} to practice squad`,
    {
      cuts: cuts.length,
      practiceSquad: practiceSquad.length,
      ir: irPlayers.length,
      waiverClaims: waiverClaims.length,
    }
  );

  newState = completeTask(newState, 'cut_to_53');
  if (practiceSquad.length > 0) {
    newState = completeTask(newState, 'form_practice_squad');
  }
  if (waiverClaims.length > 0) {
    newState = completeTask(newState, 'claim_waivers');
  }

  return newState;
}

/**
 * Gets roster status
 */
export function getRosterStatus(
  roster: CutEvaluationPlayer[],
  maxRosterSize: number = 53,
  maxPracticeSquadSize: number = 16
): RosterStatus {
  const evaluation = evaluateRosterForCuts(roster, maxRosterSize);

  return {
    teamId: '',
    activeRoster: evaluation.keep,
    practiceSquad: evaluation.practiceSquad.slice(0, maxPracticeSquadSize),
    injuredReserve: evaluation.ir,
    cutPlayers: evaluation.cut,
    rosterSize: evaluation.keep.length,
    maxRosterSize,
    practiceSquadSize: Math.min(evaluation.practiceSquad.length, maxPracticeSquadSize),
    maxPracticeSquadSize,
    capsRequired: maxRosterSize - evaluation.keep.length,
  };
}

/**
 * Gets final cuts summary
 */
export function getFinalCutsSummary(
  cuts: CutEvaluationPlayer[],
  practiceSquad: CutEvaluationPlayer[],
  irPlayers: CutEvaluationPlayer[],
  waiverClaims: WaiverClaim[],
  finalRoster: CutEvaluationPlayer[]
): FinalCutsSummary {
  return {
    year: new Date().getFullYear(),
    playersCut: cuts.length,
    playersToPS: practiceSquad.length,
    playersToIR: irPlayers.length,
    waiverClaims,
    finalRoster,
    practiceSquad,
  };
}

/**
 * Gets cut summary text
 */
export function getCutSummaryText(player: CutEvaluationPlayer): string {
  return `${player.playerName} (${player.position})
Rating: ${player.overallRating} | Age: ${player.age}
Preseason Grade: ${player.preseasonGrade}
Salary: $${player.salary}K | Dead Cap: $${player.deadCapIfCut}K
PS Eligible: ${player.practiceSquadEligible ? 'Yes' : 'No'}
Recommendation: ${player.recommendation.replace('_', ' ').toUpperCase()}
${player.notes.length > 0 ? `\nNotes: ${player.notes.join(', ')}` : ''}`;
}

/**
 * Gets roster breakdown text
 */
export function getRosterBreakdownText(status: RosterStatus): string {
  const positionCounts = new Map<string, number>();
  for (const player of status.activeRoster) {
    positionCounts.set(player.position, (positionCounts.get(player.position) || 0) + 1);
  }

  const breakdown = Array.from(positionCounts.entries())
    .map(([pos, count]) => `${pos}: ${count}`)
    .join(' | ');

  return `Roster Status
Active: ${status.rosterSize}/${status.maxRosterSize}
Practice Squad: ${status.practiceSquadSize}/${status.maxPracticeSquadSize}
IR: ${status.injuredReserve.length}
Cuts Needed: ${status.capsRequired}

Position Breakdown:
${breakdown}`;
}
