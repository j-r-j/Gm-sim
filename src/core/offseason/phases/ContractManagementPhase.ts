/**
 * Contract Management Phase (Phase 3)
 * Handles cuts, restructures, franchise tags, and cap management
 */

import {
  OffSeasonState,
  addEvent,
  addRelease,
  completeTask,
  PlayerRelease,
} from '../OffSeasonPhaseManager';

/**
 * Contract decision types
 */
export type ContractDecision = 'keep' | 'cut' | 'restructure' | 'franchise_tag' | 'transition_tag';

/**
 * Player contract info for management
 */
export interface PlayerContractInfo {
  playerId: string;
  playerName: string;
  position: string;
  age: number;
  overallRating: number;
  currentCapHit: number;
  deadCapIfCut: number;
  capSavingsIfCut: number;
  yearsRemaining: number;
  guaranteedRemaining: number;
  canRestructure: boolean;
  restructureSavings: number;
  restructureNewYears: number;
  isEligibleForTag: boolean;
  franchiseTagCost: number;
  transitionTagCost: number;
}

/**
 * Team cap situation
 */
export interface TeamCapSituation {
  teamId: string;
  salaryCap: number;
  currentSpending: number;
  capSpace: number;
  deadCap: number;
  projectedRollover: number;
  topCapHits: PlayerContractInfo[];
  cutCandidates: PlayerContractInfo[];
  tagCandidates: PlayerContractInfo[];
}

/**
 * Restructure result
 */
export interface RestructureResult {
  playerId: string;
  playerName: string;
  position: string;
  oldCapHit: number;
  newCapHit: number;
  capSaved: number;
  newGuaranteed: number;
  yearsAdded: number;
  futureCapHits: number[];
}

/**
 * Franchise tag result
 */
export interface FranchiseTagResult {
  playerId: string;
  playerName: string;
  position: string;
  tagType: 'franchise' | 'transition';
  tagCost: number;
  previousSalary: number;
}

/**
 * Calculates cap situation for a team
 */
export function calculateCapSituation(
  teamId: string,
  salaryCap: number,
  contracts: PlayerContractInfo[]
): TeamCapSituation {
  const currentSpending = contracts.reduce((sum, c) => sum + c.currentCapHit, 0);
  const deadCap = contracts.reduce(
    (sum, c) => (c.yearsRemaining === 0 ? sum + c.deadCapIfCut : sum),
    0
  );
  const capSpace = salaryCap - currentSpending;
  const projectedRollover = Math.max(0, capSpace);

  // Sort by cap hit for top hits
  const topCapHits = [...contracts].sort((a, b) => b.currentCapHit - a.currentCapHit).slice(0, 10);

  // Identify cut candidates (high cap savings, low dead cap)
  const cutCandidates = contracts
    .filter((c) => c.capSavingsIfCut > 2000 && c.capSavingsIfCut > c.deadCapIfCut * 2)
    .sort((a, b) => b.capSavingsIfCut - a.capSavingsIfCut)
    .slice(0, 10);

  // Identify tag candidates (expiring contracts, high value)
  const tagCandidates = contracts
    .filter((c) => c.yearsRemaining === 1 && c.isEligibleForTag && c.overallRating >= 80)
    .sort((a, b) => b.overallRating - a.overallRating)
    .slice(0, 5);

  return {
    teamId,
    salaryCap,
    currentSpending,
    capSpace,
    deadCap,
    projectedRollover,
    topCapHits,
    cutCandidates,
    tagCandidates,
  };
}

/**
 * Calculates restructure options
 */
export function calculateRestructureOption(contract: PlayerContractInfo): RestructureResult | null {
  if (!contract.canRestructure) {
    return null;
  }

  const convertibleAmount = Math.floor(contract.currentCapHit * 0.6); // Convert 60% to signing bonus
  const yearsToSpread = Math.min(contract.yearsRemaining + 2, 5); // Spread over remaining + 2 years
  const annualBonus = Math.floor(convertibleAmount / yearsToSpread);
  const newCapHit = contract.currentCapHit - convertibleAmount + annualBonus;
  const capSaved = contract.currentCapHit - newCapHit;

  // Calculate future cap implications
  const futureCapHits: number[] = [];
  for (let i = 0; i < yearsToSpread; i++) {
    futureCapHits.push(annualBonus);
  }

  return {
    playerId: contract.playerId,
    playerName: contract.playerName,
    position: contract.position,
    oldCapHit: contract.currentCapHit,
    newCapHit,
    capSaved,
    newGuaranteed: contract.guaranteedRemaining + convertibleAmount,
    yearsAdded: 2,
    futureCapHits,
  };
}

/**
 * Applies a franchise tag
 */
export function applyFranchiseTag(
  state: OffSeasonState,
  contract: PlayerContractInfo,
  tagType: 'franchise' | 'transition'
): OffSeasonState {
  const tagCost = tagType === 'franchise' ? contract.franchiseTagCost : contract.transitionTagCost;

  const result: FranchiseTagResult = {
    playerId: contract.playerId,
    playerName: contract.playerName,
    position: contract.position,
    tagType,
    tagCost,
    previousSalary: contract.currentCapHit,
  };

  const tagName = tagType === 'franchise' ? 'Franchise' : 'Transition';
  let newState = addEvent(
    state,
    'contract',
    `Applied ${tagName} Tag to ${contract.playerName} ($${tagCost}K)`,
    { result }
  );

  newState = completeTask(newState, 'franchise_tag');

  return newState;
}

/**
 * Cuts a player
 */
export function cutPlayer(
  state: OffSeasonState,
  contract: PlayerContractInfo,
  releaseType: 'cut' | 'waived' | 'released' | 'buyout' = 'cut'
): OffSeasonState {
  const release: PlayerRelease = {
    playerId: contract.playerId,
    playerName: contract.playerName,
    position: contract.position,
    teamId: '', // Would be filled from context
    releaseType,
    capSavings: contract.capSavingsIfCut,
    deadCap: contract.deadCapIfCut,
    phase: 'contract_management',
  };

  let newState = addRelease(state, release);
  newState = completeTask(newState, 'cut_players');

  return newState;
}

/**
 * Restructures a contract
 */
export function restructureContract(
  state: OffSeasonState,
  result: RestructureResult
): OffSeasonState {
  let newState = addEvent(
    state,
    'contract',
    `Restructured ${result.playerName}'s contract (saved $${result.capSaved}K)`,
    { result }
  );

  newState = completeTask(newState, 'restructure');

  return newState;
}

/**
 * Processes contract management phase
 */
export function processContractManagement(
  state: OffSeasonState,
  capSituation: TeamCapSituation
): OffSeasonState {
  let newState = addEvent(
    state,
    'contract',
    `Cap Situation: $${capSituation.capSpace}K available`,
    { capSituation }
  );

  newState = completeTask(newState, 'review_cap');

  return newState;
}

/**
 * Gets cap situation summary text
 */
export function getCapSummaryText(situation: TeamCapSituation): string {
  const spaceIndicator = situation.capSpace >= 0 ? '+' : '';
  return `Salary Cap: $${situation.salaryCap}K
Current Spending: $${situation.currentSpending}K
Cap Space: ${spaceIndicator}$${situation.capSpace}K
Dead Cap: $${situation.deadCap}K
Projected Rollover: $${situation.projectedRollover}K

Top Cap Hits: ${situation.topCapHits.length} players over $10M
Cut Candidates: ${situation.cutCandidates.length} potential saves
Tag Candidates: ${situation.tagCandidates.length} eligible players`;
}

/**
 * Gets contract decision summary
 */
export function getContractDecisionSummary(contract: PlayerContractInfo): string {
  return `${contract.playerName} (${contract.position})
Rating: ${contract.overallRating} | Age: ${contract.age}
Cap Hit: $${contract.currentCapHit}K
If Cut: Save $${contract.capSavingsIfCut}K, Dead $${contract.deadCapIfCut}K
Years Left: ${contract.yearsRemaining} ($${contract.guaranteedRemaining}K guaranteed)
${contract.canRestructure ? `Restructure: Save $${contract.restructureSavings}K` : 'Cannot restructure'}
${contract.isEligibleForTag ? `Franchise Tag: $${contract.franchiseTagCost}K` : ''}`;
}

/**
 * Calculates minimum required cap space for off-season
 */
export function calculateMinimumCapNeeded(
  draftPickCosts: number,
  udaSlots: number,
  practiceSquadCosts: number
): number {
  const estimatedUdfaCosts = udaSlots * 750; // ~$750K average for UDFAs
  const buffer = 5000; // $5M buffer for in-season moves

  return draftPickCosts + estimatedUdfaCosts + practiceSquadCosts + buffer;
}

/**
 * Gets cut priority ranking
 */
export function getCutPriority(contract: PlayerContractInfo): number {
  // Higher score = better cut candidate
  const savingsScore = contract.capSavingsIfCut / 1000; // More savings = higher priority
  const deadCapPenalty = contract.deadCapIfCut / 500; // More dead cap = lower priority
  const ratingPenalty = contract.overallRating / 10; // Better players = lower priority
  const ageFactor = Math.max(0, (contract.age - 28) / 5); // Older = higher priority

  return savingsScore - deadCapPenalty - ratingPenalty + ageFactor;
}

/**
 * Identifies cap casualties
 */
export function identifyCapCasualties(
  contracts: PlayerContractInfo[],
  capSpaceNeeded: number
): PlayerContractInfo[] {
  // Sort by cut priority
  const sortedContracts = [...contracts]
    .filter((c) => c.capSavingsIfCut > 0)
    .sort((a, b) => getCutPriority(b) - getCutPriority(a));

  const casualties: PlayerContractInfo[] = [];
  let currentSavings = 0;

  for (const contract of sortedContracts) {
    if (currentSavings >= capSpaceNeeded) break;
    casualties.push(contract);
    currentSavings += contract.capSavingsIfCut;
  }

  return casualties;
}
