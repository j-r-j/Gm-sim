/**
 * Scout Attributes Model
 * Defines attributes and specializations for scouts
 */

import { Position } from '../player/Position';

/**
 * Scout region coverage areas
 */
export type ScoutRegion = 'northeast' | 'southeast' | 'midwest' | 'west' | 'southwest';

/**
 * Scout attributes (mostly hidden from user)
 */
export interface ScoutAttributes {
  // Hidden from user
  evaluation: number; // 1-100: Accuracy of prospect grades
  speed: number; // 1-100: Prospects covered per week

  // Public
  experience: number; // Years scouting
  age: number;

  // Specializations (hidden accuracy bonuses)
  positionSpecialty: Position | null;
  regionKnowledge: ScoutRegion | null;
}

/**
 * All scout regions
 */
export const ALL_SCOUT_REGIONS: ScoutRegion[] = [
  'northeast',
  'southeast',
  'midwest',
  'west',
  'southwest',
];

/**
 * Creates default scout attributes
 */
export function createDefaultScoutAttributes(): ScoutAttributes {
  return {
    evaluation: 50,
    speed: 50,
    experience: 3,
    age: 35,
    positionSpecialty: null,
    regionKnowledge: null,
  };
}

/**
 * Validates scout attributes
 */
export function validateScoutAttributes(attributes: ScoutAttributes): boolean {
  // Evaluation must be 1-100
  if (attributes.evaluation < 1 || attributes.evaluation > 100) {
    return false;
  }

  // Speed must be 1-100
  if (attributes.speed < 1 || attributes.speed > 100) {
    return false;
  }

  // Experience must be non-negative
  if (attributes.experience < 0) {
    return false;
  }

  // Age must be reasonable (22-75)
  if (attributes.age < 22 || attributes.age > 75) {
    return false;
  }

  return true;
}

/**
 * Calculates evaluation accuracy bonus for a position (FOR ENGINE USE ONLY)
 */
export function getPositionSpecialtyBonus(
  attributes: ScoutAttributes,
  position: Position
): number {
  if (attributes.positionSpecialty === position) {
    // 10-20% bonus based on evaluation skill
    return 0.1 + (attributes.evaluation / 100) * 0.1;
  }
  return 0;
}

/**
 * Calculates evaluation accuracy bonus for a region (FOR ENGINE USE ONLY)
 */
export function getRegionKnowledgeBonus(
  attributes: ScoutAttributes,
  region: ScoutRegion
): number {
  if (attributes.regionKnowledge === region) {
    // 5-15% bonus based on experience
    return 0.05 + Math.min(attributes.experience / 20, 0.1);
  }
  return 0;
}

/**
 * Calculates prospects per week a scout can cover (FOR ENGINE USE ONLY)
 */
export function getProspectsPerWeek(attributes: ScoutAttributes): number {
  // Base: 3-8 prospects per week based on speed
  const base = 3 + Math.floor(attributes.speed / 20);
  return base;
}

/**
 * Gets display name for scout region
 */
export function getRegionDisplayName(region: ScoutRegion): string {
  const displayNames: Record<ScoutRegion, string> = {
    northeast: 'Northeast',
    southeast: 'Southeast',
    midwest: 'Midwest',
    west: 'West Coast',
    southwest: 'Southwest',
  };

  return displayNames[region];
}

/**
 * Gets states/schools typically covered by a region
 */
export function getRegionCoverage(region: ScoutRegion): string[] {
  const coverage: Record<ScoutRegion, string[]> = {
    northeast: ['New York', 'Pennsylvania', 'Ohio', 'Michigan', 'New Jersey'],
    southeast: ['Florida', 'Georgia', 'Alabama', 'South Carolina', 'Tennessee'],
    midwest: ['Texas', 'Oklahoma', 'Nebraska', 'Iowa', 'Kansas'],
    west: ['California', 'Oregon', 'Washington', 'Arizona', 'Colorado'],
    southwest: ['Louisiana', 'Arkansas', 'Mississippi', 'Texas'],
  };

  return coverage[region];
}
