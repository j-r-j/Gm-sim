/**
 * Contract Generator
 * Generates appropriate contracts for players based on skill level, position, age, and experience
 */

import { Player } from '../models/player/Player';
import { Position } from '../models/player/Position';
import {
  PlayerContract,
  ContractOffer,
  ContractType,
  createPlayerContract,
  getMinimumSalary,
  VETERAN_MINIMUM_SALARY,
} from './Contract';
import { getFranchiseTagValue } from './FranchiseTagSystem';

/**
 * Position value multipliers relative to franchise tag for contract generation
 */
const POSITION_VALUE_MULTIPLIERS: Record<Position, number> = {
  [Position.QB]: 1.0,
  [Position.DE]: 0.92,
  [Position.CB]: 0.88,
  [Position.LT]: 0.85,
  [Position.WR]: 0.82,
  [Position.DT]: 0.78,
  [Position.OLB]: 0.75,
  [Position.FS]: 0.72,
  [Position.SS]: 0.72,
  [Position.TE]: 0.70,
  [Position.ILB]: 0.68,
  [Position.RB]: 0.65,
  [Position.LG]: 0.62,
  [Position.RG]: 0.62,
  [Position.C]: 0.60,
  [Position.RT]: 0.80,
  [Position.K]: 0.35,
  [Position.P]: 0.32,
};

/**
 * Skill tier to contract value percentages (relative to position top value)
 */
const SKILL_TIER_VALUE_RANGES: Record<string, { min: number; max: number }> = {
  elite: { min: 0.85, max: 1.1 },
  starter: { min: 0.45, max: 0.70 },
  backup: { min: 0.15, max: 0.35 },
  fringe: { min: 0.05, max: 0.15 },
};

/**
 * Contract length based on skill tier and age
 */
function getContractYears(skillTier: string, age: number, position: Position): number {
  // Base years by tier
  const baseYears: Record<string, number> = {
    elite: 4,
    starter: 3,
    backup: 2,
    fringe: 1,
  };

  let years = baseYears[skillTier] || 2;

  // Age adjustments - older players get shorter contracts
  const peakAges: Record<string, number> = {
    QB: 32,
    RB: 26,
    WR: 28,
    TE: 28,
    OL: 30,
    DL: 28,
    LB: 27,
    DB: 27,
    ST: 32,
  };

  const posGroup = getPositionGroup(position);
  const peakAge = peakAges[posGroup] || 28;

  if (age > peakAge + 3) {
    years = Math.min(years, 2);
  } else if (age > peakAge + 1) {
    years = Math.min(years, 3);
  }

  // Young players can get longer deals
  if (age < peakAge - 2 && skillTier === 'elite') {
    years = Math.min(years + 1, 5);
  }

  return Math.max(1, years);
}

/**
 * Gets position group for contract calculations
 */
function getPositionGroup(position: Position): string {
  switch (position) {
    case Position.QB:
      return 'QB';
    case Position.RB:
      return 'RB';
    case Position.WR:
      return 'WR';
    case Position.TE:
      return 'TE';
    case Position.LT:
    case Position.LG:
    case Position.C:
    case Position.RG:
    case Position.RT:
      return 'OL';
    case Position.DE:
    case Position.DT:
      return 'DL';
    case Position.OLB:
    case Position.ILB:
      return 'LB';
    case Position.CB:
    case Position.FS:
    case Position.SS:
      return 'DB';
    case Position.K:
    case Position.P:
      return 'ST';
    default:
      return 'DB';
  }
}

/**
 * Determines skill tier from player's role ceiling
 */
export function determineSkillTierFromPlayer(player: Player): string {
  const ceiling = player.roleFit?.ceiling || 'depth';

  switch (ceiling) {
    case 'franchiseCornerstone':
    case 'highEndStarter':
      return 'elite';
    case 'solidStarter':
      return 'starter';
    case 'qualityRotational':
    case 'specialist':
      return 'backup';
    case 'depth':
    case 'practiceSquad':
    default:
      return 'fringe';
  }
}

/**
 * Calculates the contract value for a player
 */
export function calculateContractValue(
  position: Position,
  skillTier: string,
  age: number,
  experience: number,
  year: number
): { aav: number; totalValue: number; years: number; guaranteed: number; signingBonus: number } {
  // Get franchise tag value as baseline for position
  const franchiseValue = getFranchiseTagValue(position, 1, year);
  const positionMultiplier = POSITION_VALUE_MULTIPLIERS[position] || 0.6;

  // Get tier value range
  const tierRange = SKILL_TIER_VALUE_RANGES[skillTier] || SKILL_TIER_VALUE_RANGES.fringe;

  // Calculate base AAV within tier range
  // Use a random factor within the range (deterministic based on inputs for consistency)
  const tierMidpoint = (tierRange.min + tierRange.max) / 2;
  const baseAAV = Math.round(franchiseValue * positionMultiplier * tierMidpoint);

  // Apply age adjustment
  const peakAges: Record<string, number> = {
    QB: 32,
    RB: 26,
    WR: 28,
    TE: 28,
    OL: 30,
    DL: 28,
    LB: 27,
    DB: 27,
    ST: 32,
  };
  const posGroup = getPositionGroup(position);
  const peakAge = peakAges[posGroup] || 28;

  let ageMultiplier = 1.0;
  if (age > peakAge + 2) {
    ageMultiplier = Math.max(0.7, 1 - (age - peakAge - 2) * 0.08);
  } else if (age < peakAge - 2) {
    ageMultiplier = 1.05; // Small premium for young players
  }

  const adjustedAAV = Math.round(baseAAV * ageMultiplier);

  // Ensure minimum salary
  const minSalary = getMinimumSalary(experience);
  const finalAAV = Math.max(adjustedAAV, minSalary);

  // Calculate contract structure
  const years = getContractYears(skillTier, age, position);
  const totalValue = finalAAV * years;

  // Guaranteed money based on tier (as percentage of total)
  const guaranteePercentages: Record<string, number> = {
    elite: 0.60,
    starter: 0.45,
    backup: 0.30,
    fringe: 0.20,
  };
  const guaranteePct = guaranteePercentages[skillTier] || 0.2;
  const guaranteed = Math.round(totalValue * guaranteePct);

  // Signing bonus (typically 40-60% of guaranteed for larger deals)
  const signingBonusPct = skillTier === 'elite' ? 0.5 : skillTier === 'starter' ? 0.4 : 0.25;
  const signingBonus = Math.round(guaranteed * signingBonusPct);

  return {
    aav: finalAAV,
    totalValue,
    years,
    guaranteed,
    signingBonus,
  };
}

/**
 * Generates a contract for a player
 */
export function generatePlayerContract(
  player: Player,
  teamId: string,
  year: number
): PlayerContract {
  const skillTier = determineSkillTierFromPlayer(player);

  const contractValue = calculateContractValue(
    player.position,
    skillTier,
    player.age,
    player.experience,
    year
  );

  // Determine contract type based on experience
  let contractType: ContractType = 'veteran';
  if (player.experience <= 3 && player.draftRound > 0) {
    contractType = 'rookie';
  }

  const offer: ContractOffer = {
    years: contractValue.years,
    totalValue: contractValue.totalValue,
    guaranteedMoney: contractValue.guaranteed,
    signingBonus: contractValue.signingBonus,
    firstYearSalary: contractValue.aav,
    annualEscalation: skillTier === 'elite' ? 0.05 : skillTier === 'starter' ? 0.03 : 0.0,
    noTradeClause: skillTier === 'elite' && contractValue.years >= 4,
    voidYears: 0,
  };

  const playerName = `${player.firstName} ${player.lastName}`;

  return createPlayerContract(
    player.id,
    playerName,
    teamId,
    player.position,
    offer,
    year,
    contractType
  );
}

/**
 * Generates contracts for all players on a roster
 */
export function generateRosterContracts(
  players: Player[],
  teamId: string,
  year: number
): { contracts: Record<string, PlayerContract>; updatedPlayers: Player[] } {
  const contracts: Record<string, PlayerContract> = {};
  const updatedPlayers: Player[] = [];

  for (const player of players) {
    const contract = generatePlayerContract(player, teamId, year);
    contracts[contract.id] = contract;

    // Update player with contract reference
    updatedPlayers.push({
      ...player,
      contractId: contract.id,
    });
  }

  return { contracts, updatedPlayers };
}

/**
 * Calculates total cap usage for a set of contracts
 */
export function calculateTotalCapUsage(
  contracts: Record<string, PlayerContract>,
  year: number
): number {
  let totalCapHit = 0;

  for (const contract of Object.values(contracts)) {
    const yearData = contract.yearlyBreakdown.find((y) => y.year === year);
    if (yearData) {
      totalCapHit += yearData.capHit;
    }
  }

  return totalCapHit;
}

/**
 * Calculates future cap commitments from contracts
 */
export function calculateFutureCommitments(
  contracts: Record<string, PlayerContract>,
  currentYear: number
): { nextYear: number; twoYearsOut: number; threeYearsOut: number } {
  let nextYear = 0;
  let twoYearsOut = 0;
  let threeYearsOut = 0;

  for (const contract of Object.values(contracts)) {
    for (const yearData of contract.yearlyBreakdown) {
      if (yearData.year === currentYear + 1) {
        nextYear += yearData.capHit;
      } else if (yearData.year === currentYear + 2) {
        twoYearsOut += yearData.capHit;
      } else if (yearData.year === currentYear + 3) {
        threeYearsOut += yearData.capHit;
      }
    }
  }

  return { nextYear, twoYearsOut, threeYearsOut };
}

/**
 * Gets contracts for a specific team
 */
export function getTeamContracts(
  contracts: Record<string, PlayerContract>,
  teamId: string
): PlayerContract[] {
  return Object.values(contracts).filter((c) => c.teamId === teamId && c.status === 'active');
}

/**
 * Validates that team cap usage is within limits
 */
export function validateTeamCapUsage(
  contracts: Record<string, PlayerContract>,
  teamId: string,
  year: number,
  salaryCap: number
): { isValid: boolean; capUsage: number; capSpace: number; overBy: number } {
  const teamContracts = getTeamContracts(contracts, teamId);
  const capUsage = calculateTotalCapUsage(
    Object.fromEntries(teamContracts.map((c) => [c.id, c])),
    year
  );
  const capSpace = salaryCap - capUsage;
  const overBy = capUsage > salaryCap ? capUsage - salaryCap : 0;

  return {
    isValid: capUsage <= salaryCap,
    capUsage,
    capSpace,
    overBy,
  };
}
