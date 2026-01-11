/**
 * Franchise Tag System
 * Position-based values, exclusive vs non-exclusive tags, and one per year limit
 */

import { Position } from '../models/player/Position';
import { PlayerContract, ContractOffer, createPlayerContract } from './Contract';

/**
 * Franchise tag type
 */
export type FranchiseTagType = 'exclusive' | 'non_exclusive' | 'transition';

/**
 * Franchise tag details
 */
export interface FranchiseTag {
  playerId: string;
  playerName: string;
  teamId: string;
  position: Position;
  type: FranchiseTagType;
  year: number;
  salary: number;
  deadline: string; // July 15th deadline
  isTagged: boolean;
  hasLongTermDeal: boolean;
  consecutiveTagCount: number; // 1st, 2nd, or 3rd tag
}

/**
 * Team's franchise tag status
 */
export interface TeamTagStatus {
  teamId: string;
  year: number;
  hasUsedFranchiseTag: boolean;
  hasUsedTransitionTag: boolean;
  taggedPlayerId: string | null;
  transitionPlayerId: string | null;
}

/**
 * Position franchise tag values (thousands)
 * Based on average of top 5 salaries at position
 * 2024 values as baseline
 */
export const FRANCHISE_TAG_VALUES: Record<Position, number> = {
  // Offense - Premium positions
  [Position.QB]: 32400, // $32.4M
  [Position.WR]: 21000, // $21.0M
  [Position.LT]: 19800, // $19.8M
  [Position.RT]: 18000, // $18.0M
  [Position.TE]: 14200, // $14.2M
  [Position.RB]: 10400, // $10.4M
  [Position.LG]: 16500, // $16.5M
  [Position.RG]: 16500, // $16.5M
  [Position.C]: 14500, // $14.5M

  // Defense
  [Position.DE]: 23000, // $23.0M
  [Position.DT]: 18500, // $18.5M
  [Position.OLB]: 20400, // $20.4M
  [Position.ILB]: 16800, // $16.8M
  [Position.CB]: 20000, // $20.0M
  [Position.FS]: 15200, // $15.2M
  [Position.SS]: 15200, // $15.2M

  // Special Teams
  [Position.K]: 5700, // $5.7M
  [Position.P]: 5300, // $5.3M
};

/**
 * Transition tag is typically 80-90% of franchise tag
 */
const TRANSITION_TAG_MULTIPLIER = 0.85;

/**
 * Second consecutive tag is 120% of first
 */
const SECOND_TAG_MULTIPLIER = 1.2;

/**
 * Third consecutive tag is 144% of first (1.2 * 1.2)
 */
const THIRD_TAG_MULTIPLIER = 1.44;

/**
 * Gets the franchise tag value for a position
 */
export function getFranchiseTagValue(
  position: Position,
  consecutiveTagCount: number = 1,
  year: number = 2024
): number {
  const baseValue = FRANCHISE_TAG_VALUES[position];

  // Apply annual cap growth (approximately 8% per year from 2024)
  const yearsFromBase = year - 2024;
  const growthFactor = Math.pow(1.08, Math.max(0, yearsFromBase));

  let value = Math.round(baseValue * growthFactor);

  // Apply multiplier for consecutive tags
  if (consecutiveTagCount === 2) {
    value = Math.round(value * SECOND_TAG_MULTIPLIER);
  } else if (consecutiveTagCount >= 3) {
    value = Math.round(value * THIRD_TAG_MULTIPLIER);
  }

  return value;
}

/**
 * Gets the transition tag value for a position
 */
export function getTransitionTagValue(position: Position, year: number = 2024): number {
  const franchiseValue = getFranchiseTagValue(position, 1, year);
  return Math.round(franchiseValue * TRANSITION_TAG_MULTIPLIER);
}

/**
 * Creates initial team tag status
 */
export function createTeamTagStatus(teamId: string, year: number): TeamTagStatus {
  return {
    teamId,
    year,
    hasUsedFranchiseTag: false,
    hasUsedTransitionTag: false,
    taggedPlayerId: null,
    transitionPlayerId: null,
  };
}

/**
 * Checks if a team can use the franchise tag
 */
export function canUseFranchiseTag(status: TeamTagStatus): {
  canUse: boolean;
  reason: string;
} {
  if (status.hasUsedFranchiseTag) {
    return {
      canUse: false,
      reason: 'Already used franchise tag this year',
    };
  }

  return {
    canUse: true,
    reason: 'Franchise tag available',
  };
}

/**
 * Checks if a team can use the transition tag
 */
export function canUseTransitionTag(status: TeamTagStatus): {
  canUse: boolean;
  reason: string;
} {
  if (status.hasUsedTransitionTag) {
    return {
      canUse: false,
      reason: 'Already used transition tag this year',
    };
  }

  // Can't use both franchise and transition on same player
  if (status.hasUsedFranchiseTag) {
    return {
      canUse: true,
      reason: 'Transition tag available (already used franchise on another player)',
    };
  }

  return {
    canUse: true,
    reason: 'Transition tag available',
  };
}

/**
 * Result of applying a franchise tag
 */
export interface FranchiseTagResult {
  success: boolean;
  tag: FranchiseTag | null;
  contract: PlayerContract | null;
  updatedStatus: TeamTagStatus | null;
  error: string | null;
}

/**
 * Applies a franchise tag to a player
 */
export function applyFranchiseTag(
  status: TeamTagStatus,
  playerId: string,
  playerName: string,
  position: Position,
  type: FranchiseTagType,
  consecutiveTagCount: number = 1
): FranchiseTagResult {
  // Validate tag availability
  if (type === 'transition') {
    const transitionCheck = canUseTransitionTag(status);
    if (!transitionCheck.canUse) {
      return {
        success: false,
        tag: null,
        contract: null,
        updatedStatus: null,
        error: transitionCheck.reason,
      };
    }
  } else {
    const franchiseCheck = canUseFranchiseTag(status);
    if (!franchiseCheck.canUse) {
      return {
        success: false,
        tag: null,
        contract: null,
        updatedStatus: null,
        error: franchiseCheck.reason,
      };
    }
  }

  // Calculate tag salary
  let salary: number;
  if (type === 'transition') {
    salary = getTransitionTagValue(position, status.year);
  } else {
    salary = getFranchiseTagValue(position, consecutiveTagCount, status.year);
  }

  // Create tag
  const tag: FranchiseTag = {
    playerId,
    playerName,
    teamId: status.teamId,
    position,
    type,
    year: status.year,
    salary,
    deadline: `July 15, ${status.year}`,
    isTagged: true,
    hasLongTermDeal: false,
    consecutiveTagCount,
  };

  // Create one-year contract
  const contractOffer: ContractOffer = {
    years: 1,
    totalValue: salary,
    guaranteedMoney: salary, // Fully guaranteed
    signingBonus: 0,
    firstYearSalary: salary,
    annualEscalation: 0,
    noTradeClause: false,
    voidYears: 0,
  };

  const contract = createPlayerContract(
    playerId,
    playerName,
    status.teamId,
    position,
    contractOffer,
    status.year,
    'franchise_tag'
  );

  // Update team status
  const updatedStatus: TeamTagStatus = {
    ...status,
    hasUsedFranchiseTag: type !== 'transition',
    hasUsedTransitionTag: type === 'transition',
    taggedPlayerId: type !== 'transition' ? playerId : status.taggedPlayerId,
    transitionPlayerId: type === 'transition' ? playerId : status.transitionPlayerId,
  };

  return {
    success: true,
    tag,
    contract,
    updatedStatus,
    error: null,
  };
}

/**
 * Removes a franchise tag (player signed long-term deal or tag rescinded)
 */
export function removeFranchiseTag(
  status: TeamTagStatus,
  playerId: string,
  signedLongTermDeal: boolean
): TeamTagStatus {
  if (status.taggedPlayerId === playerId) {
    return {
      ...status,
      hasUsedFranchiseTag: !signedLongTermDeal, // Keep used if just removing, reset if signed
      taggedPlayerId: null,
    };
  }

  if (status.transitionPlayerId === playerId) {
    return {
      ...status,
      hasUsedTransitionTag: !signedLongTermDeal,
      transitionPlayerId: null,
    };
  }

  return status;
}

/**
 * Franchise tag comparison between positions
 */
export interface PositionTagComparison {
  position: Position;
  franchiseValue: number;
  transitionValue: number;
  tier: 'premium' | 'mid' | 'value';
}

/**
 * Gets franchise tag comparisons for all positions
 */
export function getPositionTagComparisons(year: number = 2024): PositionTagComparison[] {
  const comparisons: PositionTagComparison[] = [];

  for (const position of Object.values(Position)) {
    const franchiseValue = getFranchiseTagValue(position as Position, 1, year);
    const transitionValue = getTransitionTagValue(position as Position, year);

    let tier: 'premium' | 'mid' | 'value';
    if (franchiseValue >= 20000) {
      tier = 'premium';
    } else if (franchiseValue >= 14000) {
      tier = 'mid';
    } else {
      tier = 'value';
    }

    comparisons.push({
      position: position as Position,
      franchiseValue,
      transitionValue,
      tier,
    });
  }

  // Sort by franchise value descending
  return comparisons.sort((a, b) => b.franchiseValue - a.franchiseValue);
}

/**
 * Exclusive vs Non-Exclusive tag differences
 */
export interface TagDifferences {
  type: FranchiseTagType;
  description: string;
  compensation: string;
  matchRights: boolean;
  value: number;
}

/**
 * Gets the differences between tag types
 */
export function getTagDifferences(position: Position, year: number = 2024): TagDifferences[] {
  const franchiseValue = getFranchiseTagValue(position, 1, year);
  const transitionValue = getTransitionTagValue(position, year);

  return [
    {
      type: 'exclusive',
      description: 'Cannot negotiate with other teams',
      compensation: 'N/A - Player cannot sign offer sheet',
      matchRights: true,
      value: franchiseValue,
    },
    {
      type: 'non_exclusive',
      description: 'Can negotiate with other teams',
      compensation: 'Two first-round picks if another team signs player',
      matchRights: true,
      value: franchiseValue,
    },
    {
      type: 'transition',
      description: 'Can negotiate with other teams',
      compensation: 'No draft pick compensation',
      matchRights: true, // Right of first refusal only
      value: transitionValue,
    },
  ];
}

/**
 * Advances tag status to new year
 */
export function advanceTagYear(status: TeamTagStatus, newYear: number): TeamTagStatus {
  return createTeamTagStatus(status.teamId, newYear);
}

/**
 * Gets tag history for cap projection
 */
export interface TagCapImpact {
  playerId: string;
  playerName: string;
  position: Position;
  year: number;
  tagType: FranchiseTagType;
  salary: number;
  wasConverted: boolean;
}

/**
 * Validates franchise tag
 */
export function validateFranchiseTag(tag: FranchiseTag): boolean {
  if (!tag.playerId || typeof tag.playerId !== 'string') return false;
  if (!tag.teamId || typeof tag.teamId !== 'string') return false;
  if (!Object.values(Position).includes(tag.position)) return false;
  if (!['exclusive', 'non_exclusive', 'transition'].includes(tag.type)) return false;
  if (typeof tag.year !== 'number' || tag.year < 2000 || tag.year > 2100) return false;
  if (typeof tag.salary !== 'number' || tag.salary < 0) return false;
  if (tag.consecutiveTagCount < 1 || tag.consecutiveTagCount > 3) return false;

  return true;
}

/**
 * Gets tag status summary for display
 */
export function getTagStatusSummary(status: TeamTagStatus): {
  franchiseStatus: string;
  transitionStatus: string;
  recommendation: string;
} {
  let franchiseStatus: string;
  if (status.hasUsedFranchiseTag) {
    franchiseStatus = `Franchise tag used on player`;
  } else {
    franchiseStatus = 'Franchise tag available';
  }

  let transitionStatus: string;
  if (status.hasUsedTransitionTag) {
    transitionStatus = `Transition tag used on player`;
  } else {
    transitionStatus = 'Transition tag available';
  }

  let recommendation: string;
  if (!status.hasUsedFranchiseTag && !status.hasUsedTransitionTag) {
    recommendation = 'Both tags available - use strategically on expiring players';
  } else if (!status.hasUsedFranchiseTag) {
    recommendation = 'Franchise tag still available for key player';
  } else if (!status.hasUsedTransitionTag) {
    recommendation = 'Consider transition tag for additional player retention';
  } else {
    recommendation = 'All tags used this year';
  }

  return {
    franchiseStatus,
    transitionStatus,
    recommendation,
  };
}
