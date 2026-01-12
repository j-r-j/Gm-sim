/**
 * Draft Phase (Phase 6)
 * Handles 7 rounds of the NFL Draft
 */

import {
  OffSeasonState,
  addEvent,
  addRosterChange,
  addSigning,
  completeTask,
  PlayerSigning,
} from '../OffSeasonPhaseManager';

/**
 * Draft pick information
 */
export interface DraftPick {
  round: number;
  pickNumber: number;
  overallPick: number;
  teamId: string;
  originalTeamId: string;
  isTraded: boolean;
  selectedProspectId: string | null;
  selectedProspectName: string | null;
}

/**
 * Draft prospect summary
 */
export interface DraftProspect {
  prospectId: string;
  name: string;
  position: string;
  school: string;
  overallGrade: number;
  projectedRound: number;
  athleticScore: number;
  productionScore: number;
  characterScore: number;
  teamFit: number;
  needs: string[];
  strengths: string[];
  weaknesses: string[];
  comparison: string;
}

/**
 * Draft trade offer
 */
export interface DraftTradeOffer {
  offerId: string;
  offeringTeamId: string;
  receivingTeamId: string;
  offeringPicks: DraftPick[];
  receivingPicks: DraftPick[];
  offeringPlayers: string[];
  receivingPlayers: string[];
  tradeValue: number;
}

/**
 * Draft selection result
 */
export interface DraftSelection {
  pick: DraftPick;
  prospect: DraftProspect;
  rookieContract: {
    years: number;
    totalValue: number;
    guaranteed: number;
    signingBonus: number;
  };
}

/**
 * Draft summary
 */
export interface DraftSummary {
  year: number;
  totalPicks: number;
  teamPicks: DraftSelection[];
  trades: DraftTradeOffer[];
  gradeByRound: Record<number, number>;
  overallGrade: string;
}

/**
 * Rookie wage scale values by pick
 */
const ROOKIE_WAGE_SCALE: Record<number, { total: number; signing: number }> = {
  1: { total: 41200, signing: 27500 },
  2: { total: 35500, signing: 23700 },
  3: { total: 32300, signing: 21500 },
  4: { total: 29700, signing: 19800 },
  5: { total: 27400, signing: 18300 },
  10: { total: 18500, signing: 12300 },
  15: { total: 12500, signing: 8300 },
  20: { total: 10000, signing: 6700 },
  32: { total: 5700, signing: 3800 },
  64: { total: 3200, signing: 850 },
  96: { total: 2800, signing: 650 },
  128: { total: 2600, signing: 500 },
  160: { total: 2500, signing: 450 },
  192: { total: 2400, signing: 400 },
  224: { total: 2350, signing: 350 },
  256: { total: 2300, signing: 300 },
};

/**
 * Draft pick trade values (simplified)
 */
const PICK_VALUES: Record<number, number> = {
  1: 3000,
  2: 2600,
  3: 2200,
  4: 1850,
  5: 1700,
  6: 1600,
  7: 1500,
  8: 1400,
  9: 1350,
  10: 1300,
  15: 1050,
  20: 850,
  25: 720,
  32: 590,
  33: 580,
  40: 500,
  50: 400,
  64: 270,
  80: 200,
  96: 150,
  112: 116,
  128: 100,
  160: 70,
  192: 50,
  224: 35,
  256: 20,
};

/**
 * Gets pick trade value
 */
export function getPickValue(overallPick: number): number {
  // Find closest value in table
  const keys = Object.keys(PICK_VALUES)
    .map(Number)
    .sort((a, b) => a - b);
  for (let i = 0; i < keys.length; i++) {
    if (overallPick <= keys[i]) {
      if (i === 0) return PICK_VALUES[keys[0]];
      // Interpolate between values
      const lower = keys[i - 1];
      const upper = keys[i];
      const ratio = (overallPick - lower) / (upper - lower);
      return Math.round(PICK_VALUES[lower] + (PICK_VALUES[upper] - PICK_VALUES[lower]) * ratio);
    }
  }
  return PICK_VALUES[256] || 20;
}

/**
 * Calculates rookie contract based on pick
 */
export function calculateRookieContract(overallPick: number): {
  years: number;
  totalValue: number;
  guaranteed: number;
  signingBonus: number;
} {
  // Find closest value in wage scale
  const keys = Object.keys(ROOKIE_WAGE_SCALE)
    .map(Number)
    .sort((a, b) => a - b);
  let scale = ROOKIE_WAGE_SCALE[256];

  for (let i = 0; i < keys.length; i++) {
    if (overallPick <= keys[i]) {
      if (i === 0) {
        scale = ROOKIE_WAGE_SCALE[keys[0]];
      } else {
        // Interpolate
        const lower = keys[i - 1];
        const upper = keys[i];
        const ratio = (overallPick - lower) / (upper - lower);
        const lowerScale = ROOKIE_WAGE_SCALE[lower];
        const upperScale = ROOKIE_WAGE_SCALE[upper];
        scale = {
          total: Math.round(lowerScale.total + (upperScale.total - lowerScale.total) * ratio),
          signing: Math.round(
            lowerScale.signing + (upperScale.signing - lowerScale.signing) * ratio
          ),
        };
      }
      break;
    }
  }

  // First round picks get 5th year option
  const years = overallPick <= 32 ? 5 : 4;

  return {
    years,
    totalValue: scale.total,
    guaranteed: scale.total, // Fully guaranteed for rookies
    signingBonus: scale.signing,
  };
}

/**
 * Makes a draft selection
 */
export function makeDraftSelection(
  state: OffSeasonState,
  pick: DraftPick,
  prospect: DraftProspect
): OffSeasonState {
  const rookieContract = calculateRookieContract(pick.overallPick);

  const selection: DraftSelection = {
    pick: {
      ...pick,
      selectedProspectId: prospect.prospectId,
      selectedProspectName: prospect.name,
    },
    prospect,
    rookieContract,
  };

  let newState = addRosterChange(state, {
    type: 'draft',
    playerId: prospect.prospectId,
    playerName: prospect.name,
    position: prospect.position,
    teamId: pick.teamId,
    phase: 'draft',
    details: { selection },
  });

  const signing: PlayerSigning = {
    playerId: prospect.prospectId,
    playerName: prospect.name,
    position: prospect.position,
    teamId: pick.teamId,
    contractYears: rookieContract.years,
    contractValue: rookieContract.totalValue,
    signingType: 'extension', // Rookie deal
    phase: 'draft',
  };

  newState = addSigning(newState, signing);

  newState = addEvent(
    newState,
    'draft_pick',
    `Round ${pick.round}, Pick ${pick.pickNumber}: ${prospect.name}, ${prospect.position} (${prospect.school})`,
    { selection }
  );

  return newState;
}

/**
 * Evaluates a trade offer
 */
export function evaluateTradeOffer(offer: DraftTradeOffer): {
  isBalanced: boolean;
  valueDifference: number;
  recommendation: 'accept' | 'decline' | 'counter';
} {
  let offeringValue = 0;
  let receivingValue = 0;

  for (const pick of offer.offeringPicks) {
    offeringValue += getPickValue(pick.overallPick);
  }
  for (const pick of offer.receivingPicks) {
    receivingValue += getPickValue(pick.overallPick);
  }

  const valueDifference = offeringValue - receivingValue;
  const percentageDiff = Math.abs(valueDifference) / Math.max(offeringValue, receivingValue);

  let isBalanced = percentageDiff < 0.15;
  let recommendation: 'accept' | 'decline' | 'counter' = 'counter';

  if (valueDifference > 0 && percentageDiff < 0.1) {
    recommendation = 'accept';
    isBalanced = true;
  } else if (valueDifference < -100) {
    recommendation = 'decline';
    isBalanced = false;
  }

  return { isBalanced, valueDifference, recommendation };
}

/**
 * Executes a draft trade
 */
export function executeDraftTrade(state: OffSeasonState, offer: DraftTradeOffer): OffSeasonState {
  return addEvent(state, 'trade', `Trade executed between teams`, { trade: offer });
}

/**
 * Processes draft phase
 */
export function processDraft(
  state: OffSeasonState,
  selections: DraftSelection[],
  trades: DraftTradeOffer[]
): OffSeasonState {
  let newState = state;

  for (const selection of selections) {
    newState = makeDraftSelection(newState, selection.pick, selection.prospect);
  }

  for (const trade of trades) {
    newState = executeDraftTrade(newState, trade);
  }

  newState = completeTask(newState, 'make_picks');
  if (trades.length > 0) {
    newState = completeTask(newState, 'trade_picks');
  }

  return newState;
}

/**
 * Gets draft summary
 */
export function getDraftSummary(
  selections: DraftSelection[],
  trades: DraftTradeOffer[]
): DraftSummary {
  const gradeByRound: Record<number, number> = {};

  for (const selection of selections) {
    const round = selection.pick.round;
    const grade = selection.prospect.overallGrade;
    if (!gradeByRound[round]) gradeByRound[round] = 0;
    gradeByRound[round] = (gradeByRound[round] + grade) / 2;
  }

  const avgGrade =
    Object.values(gradeByRound).reduce((a, b) => a + b, 0) / Object.keys(gradeByRound).length;
  let overallGrade: string;
  if (avgGrade >= 85) overallGrade = 'A';
  else if (avgGrade >= 75) overallGrade = 'B';
  else if (avgGrade >= 65) overallGrade = 'C';
  else if (avgGrade >= 55) overallGrade = 'D';
  else overallGrade = 'F';

  return {
    year: new Date().getFullYear(),
    totalPicks: selections.length,
    teamPicks: selections,
    trades,
    gradeByRound,
    overallGrade,
  };
}

/**
 * Gets pick summary text
 */
export function getPickSummaryText(selection: DraftSelection): string {
  const { pick, prospect, rookieContract } = selection;
  return `Round ${pick.round}, Pick ${pick.pickNumber} (Overall: ${pick.overallPick})
${prospect.name}, ${prospect.position}
${prospect.school}

Grade: ${prospect.overallGrade}
Comparison: ${prospect.comparison}

Strengths: ${prospect.strengths.join(', ')}
Weaknesses: ${prospect.weaknesses.join(', ')}

Contract: ${rookieContract.years} years, $${rookieContract.totalValue}K
Signing Bonus: $${rookieContract.signingBonus}K`;
}

/**
 * Gets best available prospect at position
 */
export function getBestAvailable(
  prospects: DraftProspect[],
  position?: string
): DraftProspect | null {
  let available = prospects.filter((p) => !p.prospectId.startsWith('drafted-'));

  if (position) {
    available = available.filter((p) => p.position === position);
  }

  return available.sort((a, b) => b.overallGrade - a.overallGrade)[0] || null;
}

/**
 * Gets team needs-based recommendations
 */
export function getRecommendations(
  prospects: DraftProspect[],
  teamNeeds: string[],
  limit: number = 5
): DraftProspect[] {
  const available = prospects.filter((p) => !p.prospectId.startsWith('drafted-'));

  // Score by need + grade
  const scored = available.map((p) => {
    const needBonus = teamNeeds.includes(p.position) ? 10 : 0;
    return { prospect: p, score: p.overallGrade + needBonus };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.prospect);
}
