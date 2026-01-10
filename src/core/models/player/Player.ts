import { Position } from './Position';
import { PhysicalAttributes, validatePhysicalAttributes } from './PhysicalAttributes';
import { TechnicalSkills, validateTechnicalSkills } from './TechnicalSkills';
import { HiddenTraits } from './HiddenTraits';
import { ItFactor, validateItFactor } from './ItFactor';
import { ConsistencyProfile, validateConsistencyProfile } from './Consistency';
import { SchemeFits, validateSchemeFits } from './SchemeFit';
import { RoleFit, validateRoleFit } from './RoleFit';
import { InjuryStatus, validateInjuryStatus } from './InjuryStatus';

/**
 * Complete Player entity.
 * This is the full player data structure containing all layers:
 * - True values (hidden from UI)
 * - Perceived values (shown as ranges)
 * - Dynamic state (changes during gameplay)
 */
export interface Player {
  /** Unique identifier */
  id: string;

  /** Player's first name */
  firstName: string;

  /** Player's last name */
  lastName: string;

  /** Player's position */
  position: Position;

  /** Player's age in years */
  age: number;

  /** NFL seasons played (0 for rookies) */
  experience: number;

  // ==================
  // Physical (mostly public)
  // ==================
  /** Physical attributes - concrete, measurable values */
  physical: PhysicalAttributes;

  // ==================
  // Skills (ranges shown, true values hidden)
  // ==================
  /** Technical skills with true values and perceived ranges */
  skills: TechnicalSkills;

  // ==================
  // All hidden from user
  // ==================
  /** Hidden traits revealed through gameplay events */
  hiddenTraits: HiddenTraits;

  /** The unmeasurable "It" factor */
  itFactor: ItFactor;

  /** Consistency profile determining week-to-week variance */
  consistency: ConsistencyProfile;

  /** Scheme fit levels for all offensive/defensive schemes */
  schemeFits: SchemeFits;

  /** Role ceiling and current role fit */
  roleFit: RoleFit;

  // ==================
  // Contract (placeholder)
  // ==================
  /** Contract ID, null if unsigned (implementation in PR-15) */
  contractId: string | null;

  // ==================
  // Dynamic state
  // ==================
  /** Current injury status */
  injuryStatus: InjuryStatus;

  /** Fatigue level (0-100, higher = more tired) */
  fatigue: number;

  /** Morale level (0-100, higher = happier) */
  morale: number;

  // ==================
  // Metadata
  // ==================
  /** College ID (for draft/history) */
  collegeId: string;

  /** Year player was drafted */
  draftYear: number;

  /** Round player was drafted (1-7, 0 for undrafted) */
  draftRound: number;

  /** Overall pick number (0 for undrafted) */
  draftPick: number;
}

/**
 * Validates a complete Player entity
 */
export function validatePlayer(player: Player): boolean {
  // Basic field validation
  if (!player.id || typeof player.id !== 'string') return false;
  if (!player.firstName || typeof player.firstName !== 'string') return false;
  if (!player.lastName || typeof player.lastName !== 'string') return false;
  if (!Object.values(Position).includes(player.position)) return false;
  if (player.age < 18 || player.age > 50) return false;
  if (player.experience < 0 || player.experience > 25) return false;

  // Sub-model validation
  if (!validatePhysicalAttributes(player.physical)) return false;
  if (!validateTechnicalSkills(player.skills)) return false;
  if (!validateItFactor(player.itFactor)) return false;
  if (!validateConsistencyProfile(player.consistency)) return false;
  if (!validateSchemeFits(player.schemeFits)) return false;
  if (!validateRoleFit(player.roleFit)) return false;
  if (!validateInjuryStatus(player.injuryStatus)) return false;

  // Dynamic state validation
  if (player.fatigue < 0 || player.fatigue > 100) return false;
  if (player.morale < 0 || player.morale > 100) return false;

  // Metadata validation
  if (player.draftYear < 1920 || player.draftYear > 2100) return false;
  if (player.draftRound < 0 || player.draftRound > 7) return false;
  if (player.draftPick < 0 || player.draftPick > 300) return false;

  return true;
}

/**
 * Gets the player's full name
 */
export function getPlayerFullName(player: Player): string {
  return `${player.firstName} ${player.lastName}`;
}

/**
 * Checks if a player is a rookie
 */
export function isRookie(player: Player): boolean {
  return player.experience === 0;
}

/**
 * Checks if a player is a veteran (5+ years)
 */
export function isVeteran(player: Player): boolean {
  return player.experience >= 5;
}

/**
 * Gets years until potential free agency (assuming 4-year rookie deal)
 */
export function getYearsToFreeAgency(player: Player): number {
  if (player.experience >= 4) {
    // Already eligible for free agency, depends on contract
    return 0;
  }
  return 4 - player.experience;
}
