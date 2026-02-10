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
} from './Contract';
import { getFranchiseTagValue } from './FranchiseTagSystem';
import { getSlotValues } from '../draft/RookieContractGenerator';
import { randomInt } from '../generators/utils/RandomUtils';

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
  [Position.TE]: 0.7,
  [Position.ILB]: 0.68,
  [Position.RB]: 0.65,
  [Position.LG]: 0.62,
  [Position.RG]: 0.62,
  [Position.C]: 0.6,
  [Position.RT]: 0.8,
  [Position.K]: 0.35,
  [Position.P]: 0.32,
};

/**
 * Skill tier to contract value percentages (relative to position top value)
 */
const SKILL_TIER_VALUE_RANGES: Record<string, { min: number; max: number }> = {
  elite: { min: 0.85, max: 1.1 },
  starter: { min: 0.45, max: 0.7 },
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
 * Returns bonus (guaranteed) and salary (non-guaranteed) per year
 */
export function calculateContractValue(
  position: Position,
  skillTier: string,
  age: number,
  experience: number,
  year: number
): { bonusPerYear: number; salaryPerYear: number; years: number } {
  // Get franchise tag value as baseline for position
  const franchiseValue = getFranchiseTagValue(position, 1, year);
  const positionMultiplier = POSITION_VALUE_MULTIPLIERS[position] || 0.6;

  // Get tier value range
  const tierRange = SKILL_TIER_VALUE_RANGES[skillTier] || SKILL_TIER_VALUE_RANGES.fringe;

  // Calculate base AAV within tier range
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

  // Guaranteed percentage based on tier (portion of AAV that is bonus)
  const guaranteePercentages: Record<string, number> = {
    elite: 0.6,
    starter: 0.45,
    backup: 0.3,
    fringe: 0.2,
  };
  const guaranteePct = guaranteePercentages[skillTier] || 0.2;

  // Split AAV into bonus (guaranteed) and salary (non-guaranteed)
  const bonusPerYear = Math.round(finalAAV * guaranteePct);
  const salaryPerYear = finalAAV - bonusPerYear;

  return {
    bonusPerYear,
    salaryPerYear,
    years,
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
    bonusPerYear: contractValue.bonusPerYear,
    salaryPerYear: contractValue.salaryPerYear,
    noTradeClause: skillTier === 'elite' && contractValue.years >= 4,
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

// ============================================================================
// Initial Roster Contract Generation
// ============================================================================
// These functions generate realistic, mid-deal contracts for new game creation.
// Instead of all 53 players starting with freshly-signed deals, players get
// contracts appropriate to their career stage:
//
// Typical NFL 53-man roster contract distribution:
// - ~25% on rookie contracts (drafted 0-3 years ago, cheap slotted deals)
// - ~35% on second contracts (4-7 years exp, the big-money extensions)
// - ~25% on veteran deals (8+ years, shorter term)
// - ~15% on veteran minimums (depth, journeymen)
// ============================================================================

/**
 * Contract category for initial roster generation
 */
type InitialContractCategory = 'rookieDeal' | 'secondContract' | 'veteranDeal' | 'veteranMinimum';

/**
 * Determines what kind of contract a player should be on for initial roster generation.
 * Based on experience level, draft status, and skill tier.
 */
function determineInitialContractCategory(
  player: Player,
  skillTier: string
): InitialContractCategory {
  const experience = player.experience;

  // Players with 0-3 years experience who were drafted are on rookie deals
  if (experience <= 3 && player.draftRound > 0) {
    return 'rookieDeal';
  }

  // Undrafted young players on minimum deals
  if (experience <= 3 && player.draftRound === 0) {
    return 'veteranMinimum';
  }

  // Players with 4-7 years on second contracts (the big extensions)
  if (experience >= 4 && experience <= 7) {
    // Fringe players might be on vet minimum instead of a real second contract
    if (skillTier === 'fringe') {
      return Math.random() < 0.6 ? 'veteranMinimum' : 'veteranDeal';
    }
    return 'secondContract';
  }

  // Veterans 8+ years
  if (skillTier === 'fringe' || skillTier === 'backup') {
    return Math.random() < 0.4 ? 'veteranMinimum' : 'veteranDeal';
  }

  return 'veteranDeal';
}

/**
 * Generates a rookie-scale contract for initial roster generation.
 * Uses the actual NFL rookie wage scale based on draft pick position,
 * with years remaining reflecting how long ago the player was drafted.
 */
function generateRookieDealForInitialRoster(
  player: Player,
  teamId: string,
  currentYear: number
): PlayerContract {
  const experience = player.experience;
  const signedYear = currentYear - experience;
  const yearsRemaining = Math.max(1, 4 - experience);

  // Get slot values from the rookie wage scale based on draft position
  const overallPick = player.draftPick || randomInt(33, 224);
  const round = player.draftRound || Math.min(7, Math.ceil(overallPick / 32));
  const slotValues = getSlotValues(overallPick, round);

  // Convert total 4-year value to per-year amounts
  const totalAAV = Math.round(slotValues.totalValue / 4);
  const bonusPerYear = Math.round(slotValues.signingBonus / 4);
  const salaryPerYear = totalAAV - bonusPerYear;

  const offer: ContractOffer = {
    years: 4,
    bonusPerYear,
    salaryPerYear,
    noTradeClause: false,
  };

  const playerName = `${player.firstName} ${player.lastName}`;
  const contract = createPlayerContract(
    player.id,
    playerName,
    teamId,
    player.position,
    offer,
    signedYear,
    'rookie'
  );

  return {
    ...contract,
    yearsRemaining,
  };
}

/**
 * Generates a second contract (extension after rookie deal) for initial roster generation.
 * These are typically the biggest deals on a team - players who proved themselves
 * during their rookie contract and earned a multi-year extension.
 */
function generateSecondContractForInitialRoster(
  player: Player,
  teamId: string,
  currentYear: number,
  skillTier: string
): PlayerContract {
  const contractValue = calculateContractValue(
    player.position,
    skillTier,
    player.age,
    player.experience,
    currentYear
  );

  const totalYears = contractValue.years;

  // They signed this deal somewhere between 0 and (totalYears-1) years ago
  const maxYearsInto = Math.min(totalYears - 1, Math.max(0, player.experience - 3));
  const yearsIntoContract = randomInt(0, Math.max(0, maxYearsInto));
  const signedYear = currentYear - yearsIntoContract;
  const yearsRemaining = totalYears - yearsIntoContract;

  const offer: ContractOffer = {
    years: totalYears,
    bonusPerYear: contractValue.bonusPerYear,
    salaryPerYear: contractValue.salaryPerYear,
    noTradeClause: skillTier === 'elite' && totalYears >= 4,
  };

  const playerName = `${player.firstName} ${player.lastName}`;
  const contract = createPlayerContract(
    player.id,
    playerName,
    teamId,
    player.position,
    offer,
    signedYear,
    'extension'
  );

  return {
    ...contract,
    yearsRemaining,
  };
}

/**
 * Generates a veteran deal for initial roster generation.
 * Veterans (8+ years experience) are typically on shorter contracts.
 * Elite veterans may still command multi-year deals, while
 * average veterans get 1-3 year contracts.
 */
function generateVeteranDealForInitialRoster(
  player: Player,
  teamId: string,
  currentYear: number,
  skillTier: string
): PlayerContract {
  const contractValue = calculateContractValue(
    player.position,
    skillTier,
    player.age,
    player.experience,
    currentYear
  );

  // Veterans tend to get shorter deals
  const totalYears = Math.min(contractValue.years, skillTier === 'elite' ? 4 : 3);

  const maxYearsInto = Math.max(0, totalYears - 1);
  const yearsIntoContract = randomInt(0, maxYearsInto);
  const signedYear = currentYear - yearsIntoContract;
  const yearsRemaining = totalYears - yearsIntoContract;

  const offer: ContractOffer = {
    years: totalYears,
    bonusPerYear: contractValue.bonusPerYear,
    salaryPerYear: contractValue.salaryPerYear,
    noTradeClause: skillTier === 'elite' && totalYears >= 4,
  };

  const playerName = `${player.firstName} ${player.lastName}`;
  const contract = createPlayerContract(
    player.id,
    playerName,
    teamId,
    player.position,
    offer,
    signedYear,
    'veteran'
  );

  return {
    ...contract,
    yearsRemaining,
  };
}

/**
 * Generates a veteran minimum contract for initial roster generation.
 * These are cheap 1-2 year deals for depth players, journeymen,
 * undrafted players, and aging veterans clinging to roster spots.
 */
function generateVetMinimumForInitialRoster(
  player: Player,
  teamId: string,
  currentYear: number
): PlayerContract {
  const minSalary = getMinimumSalary(player.experience);
  const totalYears = randomInt(1, 2);

  const yearsIntoContract = totalYears > 1 ? randomInt(0, 1) : 0;
  const signedYear = currentYear - yearsIntoContract;
  const yearsRemaining = totalYears - yearsIntoContract;

  const offer: ContractOffer = {
    years: totalYears,
    bonusPerYear: minSalary,
    salaryPerYear: 0,
    noTradeClause: false,
  };

  const playerName = `${player.firstName} ${player.lastName}`;
  const contract = createPlayerContract(
    player.id,
    playerName,
    teamId,
    player.position,
    offer,
    signedYear,
    'veteran'
  );

  return {
    ...contract,
    yearsRemaining,
  };
}

/**
 * Generates contracts for an initial roster with realistic contract diversity.
 * Unlike generateRosterContracts (which creates fresh contracts for mid-game use),
 * this function creates contracts where players are at various stages of their deals,
 * mirroring a real NFL team's salary cap situation:
 *
 * - Draft picks on cheap rookie-scale deals with 1-4 years remaining
 * - Star players on expensive second contracts (extensions)
 * - Veterans on shorter deals with varied years remaining
 * - Depth players on veteran minimum contracts
 *
 * This creates interesting cap management decisions from day one.
 */
export function generateInitialRosterContracts(
  players: Player[],
  teamId: string,
  year: number
): { contracts: Record<string, PlayerContract>; updatedPlayers: Player[] } {
  const contracts: Record<string, PlayerContract> = {};
  const updatedPlayers: Player[] = [];

  for (const player of players) {
    const skillTier = determineSkillTierFromPlayer(player);
    const category = determineInitialContractCategory(player, skillTier);

    let contract: PlayerContract;

    switch (category) {
      case 'rookieDeal':
        contract = generateRookieDealForInitialRoster(player, teamId, year);
        break;
      case 'secondContract':
        contract = generateSecondContractForInitialRoster(player, teamId, year, skillTier);
        break;
      case 'veteranDeal':
        contract = generateVeteranDealForInitialRoster(player, teamId, year, skillTier);
        break;
      case 'veteranMinimum':
        contract = generateVetMinimumForInitialRoster(player, teamId, year);
        break;
    }

    contracts[contract.id] = contract;
    updatedPlayers.push({
      ...player,
      contractId: contract.id,
    });
  }

  return { contracts, updatedPlayers };
}
