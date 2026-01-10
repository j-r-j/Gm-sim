/**
 * Scout Entity
 * Main scout model combining all scout-related data
 */

import { ScoutRole } from './StaffSalary';
import {
  ScoutAttributes,
  ScoutRegion,
  createDefaultScoutAttributes,
  getRegionDisplayName,
} from './ScoutAttributes';
import { ScoutTrackRecord, createEmptyTrackRecord } from './ScoutTrackRecord';

/**
 * Scout contract details
 */
export interface ScoutContract {
  salary: number;
  yearsTotal: number;
  yearsRemaining: number;
}

/**
 * Maximum number of focus prospects a scout can have
 */
export const MAX_FOCUS_PROSPECTS = 5;

/**
 * Minimum number of focus prospects a scout can have
 */
export const MIN_FOCUS_PROSPECTS = 3;

/**
 * Scout entity - full data model
 */
export interface Scout {
  id: string;
  firstName: string;
  lastName: string;
  role: ScoutRole;
  teamId: string | null;

  // Assignment
  region: ScoutRegion | null; // Regional scouts only

  // Core data (hidden)
  attributes: ScoutAttributes;
  trackRecord: ScoutTrackRecord;

  // Contract
  contract: ScoutContract | null;

  // Current assignments
  focusProspects: string[]; // Prospect IDs for deep evaluation (max 3-5)
  autoScoutingActive: boolean;

  // Status
  isAvailable: boolean;
  isRetired: boolean;
}

/**
 * View model - what user sees varies by years of data
 */
export interface ScoutViewModel {
  id: string;
  fullName: string;
  role: ScoutRole;
  region: ScoutRegion | null;
  regionDisplayName: string | null;

  // Public
  yearsExperience: number;
  age: number;
  positionSpecialty: string | null;

  // Revealed over time
  evaluationRating: number | null; // null until reliabilityRevealed
  hitRate: number | null;
  knownStrengths: string[];
  knownWeaknesses: string[];
  reliabilityKnown: boolean;

  // Contract (your scouts only)
  salary: number | null;
  yearsRemaining: number | null;
}

/**
 * Creates a scout view model from a full scout entity
 */
export function createScoutViewModel(scout: Scout, isOwnTeam: boolean): ScoutViewModel {
  const { trackRecord, attributes } = scout;

  return {
    id: scout.id,
    fullName: `${scout.firstName} ${scout.lastName}`,
    role: scout.role,
    region: scout.region,
    regionDisplayName: scout.region ? getRegionDisplayName(scout.region) : null,

    yearsExperience: attributes.experience,
    age: attributes.age,
    positionSpecialty: attributes.positionSpecialty,

    // Only reveal evaluation if reliability is known
    evaluationRating: trackRecord.reliabilityRevealed
      ? Math.round(attributes.evaluation / 10) * 10 // Round to nearest 10
      : null,
    hitRate: trackRecord.reliabilityRevealed ? trackRecord.overallHitRate : null,
    knownStrengths: trackRecord.knownStrengths,
    knownWeaknesses: trackRecord.knownWeaknesses,
    reliabilityKnown: trackRecord.reliabilityRevealed,

    // Only show contract for own scouts
    salary: isOwnTeam ? (scout.contract?.salary ?? null) : null,
    yearsRemaining: isOwnTeam ? (scout.contract?.yearsRemaining ?? null) : null,
  };
}

/**
 * Creates a default scout
 */
export function createDefaultScout(
  id: string,
  firstName: string,
  lastName: string,
  role: ScoutRole
): Scout {
  return {
    id,
    firstName,
    lastName,
    role,
    teamId: null,
    region: role === 'regionalScout' ? 'northeast' : null,
    attributes: createDefaultScoutAttributes(),
    trackRecord: createEmptyTrackRecord(id),
    contract: null,
    focusProspects: [],
    autoScoutingActive: true,
    isAvailable: true,
    isRetired: false,
  };
}

/**
 * Validates a scout entity
 */
export function validateScout(scout: Scout): boolean {
  // Must have ID and name
  if (!scout.id || !scout.firstName || !scout.lastName) {
    return false;
  }

  // Regional scouts must have a region
  if (scout.role === 'regionalScout' && !scout.region) {
    return false;
  }

  // Focus prospects must be within limits
  if (scout.focusProspects.length > MAX_FOCUS_PROSPECTS) {
    return false;
  }

  // Track record must belong to this scout
  if (scout.trackRecord.scoutId !== scout.id) {
    return false;
  }

  return true;
}

/**
 * Gets the full name of a scout
 */
export function getScoutFullName(scout: Scout): string {
  return `${scout.firstName} ${scout.lastName}`;
}

/**
 * Adds a prospect to focus list
 */
export function addFocusProspect(scout: Scout, prospectId: string): Scout | null {
  if (scout.focusProspects.length >= MAX_FOCUS_PROSPECTS) {
    return null; // Cannot add more
  }

  if (scout.focusProspects.includes(prospectId)) {
    return scout; // Already focusing
  }

  return {
    ...scout,
    focusProspects: [...scout.focusProspects, prospectId],
  };
}

/**
 * Removes a prospect from focus list
 */
export function removeFocusProspect(scout: Scout, prospectId: string): Scout {
  return {
    ...scout,
    focusProspects: scout.focusProspects.filter((id) => id !== prospectId),
  };
}

/**
 * Creates a scout contract
 */
export function createScoutContract(
  salary: number,
  yearsTotal: number
): ScoutContract {
  return {
    salary,
    yearsTotal,
    yearsRemaining: yearsTotal,
  };
}

/**
 * Advances a scout contract by one year
 */
export function advanceScoutContractYear(contract: ScoutContract): ScoutContract | null {
  if (contract.yearsRemaining <= 1) {
    return null; // Contract expired
  }

  return {
    ...contract,
    yearsRemaining: contract.yearsRemaining - 1,
  };
}

/**
 * Validates a scout contract
 */
export function validateScoutContract(contract: ScoutContract): boolean {
  if (contract.salary <= 0) {
    return false;
  }

  if (contract.yearsTotal < 1 || contract.yearsTotal > 5) {
    return false;
  }

  if (contract.yearsRemaining > contract.yearsTotal || contract.yearsRemaining < 0) {
    return false;
  }

  return true;
}

/**
 * Gets scout summary for display
 */
export function getScoutSummary(scout: Scout): string {
  const parts: string[] = [];

  if (scout.region) {
    parts.push(getRegionDisplayName(scout.region));
  }

  if (scout.attributes.positionSpecialty) {
    parts.push(`${scout.attributes.positionSpecialty} specialist`);
  }

  parts.push(`${scout.attributes.experience} years experience`);

  return parts.join(' | ');
}
