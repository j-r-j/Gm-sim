/**
 * Owner Entity Model
 * Defines the team owner and their relationship with the GM
 */

import {
  OwnerPersonality,
  SecondaryTrait,
  validateOwnerPersonality,
  createDefaultOwnerPersonality,
} from './OwnerPersonality';
import { getJobSecurityStatus, validatePatienceValue } from './PatienceMeter';

/**
 * Owner demand types
 */
export type OwnerDemandType = 'signPlayer' | 'fireCoach' | 'draftPlayer' | 'tradeFor' | 'other';

/**
 * An active demand from the owner
 */
export interface OwnerDemand {
  id: string;
  type: OwnerDemandType;
  description: string;
  targetId: string | null; // Player/coach ID if applicable
  deadline: number; // Game week or off-season phase
  consequence: string; // What happens if ignored
  issuedWeek: number;
}

/**
 * Owner net worth levels affecting staff budget
 */
export type NetWorth = 'modest' | 'wealthy' | 'billionaire' | 'oligarch';

/**
 * All net worth levels
 */
export const ALL_NET_WORTH_LEVELS: NetWorth[] = ['modest', 'wealthy', 'billionaire', 'oligarch'];

/**
 * Complete owner entity
 */
export interface Owner {
  id: string;
  firstName: string;
  lastName: string;
  teamId: string;

  // Personality
  personality: OwnerPersonality;

  // Relationship with GM (you)
  patienceMeter: number; // 0-100, your job security
  trustLevel: number; // 0-100, affects how much freedom you have

  // Active demands
  activeDemands: OwnerDemand[];

  // History
  yearsAsOwner: number;
  previousGMsFired: number;
  championshipsWon: number;

  // Wealth (affects staff budget)
  netWorth: NetWorth;
}

/**
 * Patience description for view model
 */
export type PatienceDescription = 'very impatient' | 'impatient' | 'moderate' | 'patient' | 'very patient';

/**
 * Spending description for view model
 */
export type SpendingDescription = 'frugal' | 'budget-conscious' | 'moderate' | 'generous' | 'lavish';

/**
 * Control description for view model
 */
export type ControlDescription = 'hands-off' | 'occasional input' | 'involved' | 'controlling' | 'micromanager';

/**
 * Loyalty description for view model
 */
export type LoyaltyDescription = 'ruthless' | 'results-driven' | 'fair' | 'loyal' | 'extremely loyal';

/**
 * View model - what player sees (no raw numbers for personality)
 */
export interface OwnerViewModel {
  id: string;
  fullName: string;

  // Personality descriptions (not raw numbers)
  patienceDescription: PatienceDescription;
  spendingDescription: SpendingDescription;
  controlDescription: ControlDescription;
  loyaltyDescription: LoyaltyDescription;

  secondaryTraits: SecondaryTrait[];

  // Job security (shown to player)
  jobSecurityStatus: 'secure' | 'stable' | 'warm seat' | 'hot seat' | 'danger';

  // Active demands
  activeDemands: OwnerDemand[];

  // History
  yearsAsOwner: number;
  previousGMsFired: number;
  championshipsWon: number;

  // Net worth description
  netWorth: NetWorth;
}

/**
 * Converts a numeric trait value to a description
 */
function getTraitDescription<T extends string>(value: number, descriptions: [T, T, T, T, T]): T {
  if (value <= 20) return descriptions[0];
  if (value <= 40) return descriptions[1];
  if (value <= 60) return descriptions[2];
  if (value <= 80) return descriptions[3];
  return descriptions[4];
}

/**
 * Gets patience description from raw value
 */
export function getPatienceDescription(value: number): PatienceDescription {
  return getTraitDescription(value, [
    'very impatient',
    'impatient',
    'moderate',
    'patient',
    'very patient',
  ]);
}

/**
 * Gets spending description from raw value
 */
export function getSpendingDescription(value: number): SpendingDescription {
  return getTraitDescription(value, ['frugal', 'budget-conscious', 'moderate', 'generous', 'lavish']);
}

/**
 * Gets control description from raw value
 */
export function getControlDescription(value: number): ControlDescription {
  return getTraitDescription(value, [
    'hands-off',
    'occasional input',
    'involved',
    'controlling',
    'micromanager',
  ]);
}

/**
 * Gets loyalty description from raw value
 */
export function getLoyaltyDescription(value: number): LoyaltyDescription {
  return getTraitDescription(value, ['ruthless', 'results-driven', 'fair', 'loyal', 'extremely loyal']);
}

/**
 * Creates a view model from an Owner entity
 */
export function createOwnerViewModel(owner: Owner): OwnerViewModel {
  const { traits } = owner.personality;

  return {
    id: owner.id,
    fullName: `${owner.firstName} ${owner.lastName}`,

    patienceDescription: getPatienceDescription(traits.patience),
    spendingDescription: getSpendingDescription(traits.spending),
    controlDescription: getControlDescription(traits.control),
    loyaltyDescription: getLoyaltyDescription(traits.loyalty),

    secondaryTraits: [...owner.personality.secondaryTraits],

    jobSecurityStatus: getJobSecurityStatus(owner.patienceMeter),

    activeDemands: [...owner.activeDemands],

    yearsAsOwner: owner.yearsAsOwner,
    previousGMsFired: owner.previousGMsFired,
    championshipsWon: owner.championshipsWon,

    netWorth: owner.netWorth,
  };
}

/**
 * Validates an owner demand
 */
export function validateOwnerDemand(demand: OwnerDemand): boolean {
  if (!demand.id || typeof demand.id !== 'string') return false;
  if (!demand.description || typeof demand.description !== 'string') return false;
  if (!demand.consequence || typeof demand.consequence !== 'string') return false;
  if (typeof demand.deadline !== 'number' || demand.deadline < 0) return false;
  if (typeof demand.issuedWeek !== 'number' || demand.issuedWeek < 0) return false;

  const validTypes: OwnerDemandType[] = ['signPlayer', 'fireCoach', 'draftPlayer', 'tradeFor', 'other'];
  if (!validTypes.includes(demand.type)) return false;

  return true;
}

/**
 * Validates a complete Owner entity
 */
export function validateOwner(owner: Owner): boolean {
  // Basic field validation
  if (!owner.id || typeof owner.id !== 'string') return false;
  if (!owner.firstName || typeof owner.firstName !== 'string') return false;
  if (!owner.lastName || typeof owner.lastName !== 'string') return false;
  if (!owner.teamId || typeof owner.teamId !== 'string') return false;

  // Personality validation
  if (!validateOwnerPersonality(owner.personality)) return false;

  // Patience and trust
  if (!validatePatienceValue(owner.patienceMeter)) return false;
  if (owner.trustLevel < 0 || owner.trustLevel > 100) return false;

  // Demands validation
  if (!Array.isArray(owner.activeDemands)) return false;
  for (const demand of owner.activeDemands) {
    if (!validateOwnerDemand(demand)) return false;
  }

  // History validation
  if (owner.yearsAsOwner < 0 || owner.yearsAsOwner > 100) return false;
  if (owner.previousGMsFired < 0 || owner.previousGMsFired > 50) return false;
  if (owner.championshipsWon < 0 || owner.championshipsWon > 30) return false;

  // Net worth validation
  if (!ALL_NET_WORTH_LEVELS.includes(owner.netWorth)) return false;

  return true;
}

/**
 * Creates a default owner
 */
export function createDefaultOwner(id: string, teamId: string): Owner {
  return {
    id,
    firstName: 'John',
    lastName: 'Smith',
    teamId,
    personality: createDefaultOwnerPersonality(),
    patienceMeter: 50,
    trustLevel: 50,
    activeDemands: [],
    yearsAsOwner: 5,
    previousGMsFired: 1,
    championshipsWon: 0,
    netWorth: 'wealthy',
  };
}

/**
 * Gets the owner's full name
 */
export function getOwnerFullName(owner: Owner): string {
  return `${owner.firstName} ${owner.lastName}`;
}

/**
 * Adds a demand to the owner's active demands
 */
export function addOwnerDemand(owner: Owner, demand: OwnerDemand): Owner {
  return {
    ...owner,
    activeDemands: [...owner.activeDemands, demand],
  };
}

/**
 * Removes a demand from the owner's active demands
 */
export function removeOwnerDemand(owner: Owner, demandId: string): Owner {
  return {
    ...owner,
    activeDemands: owner.activeDemands.filter((d) => d.id !== demandId),
  };
}

/**
 * Updates the owner's patience meter
 */
export function updatePatienceMeter(owner: Owner, newValue: number): Owner {
  const clampedValue = Math.max(0, Math.min(100, newValue));
  return {
    ...owner,
    patienceMeter: clampedValue,
  };
}

/**
 * Updates the owner's trust level
 */
export function updateTrustLevel(owner: Owner, newValue: number): Owner {
  const clampedValue = Math.max(0, Math.min(100, newValue));
  return {
    ...owner,
    trustLevel: clampedValue,
  };
}

/**
 * Gets net worth budget multiplier for staff budget
 */
export function getNetWorthBudgetMultiplier(netWorth: NetWorth): number {
  const multipliers: Record<NetWorth, number> = {
    modest: 0.8,
    wealthy: 1.0,
    billionaire: 1.2,
    oligarch: 1.5,
  };

  return multipliers[netWorth];
}
