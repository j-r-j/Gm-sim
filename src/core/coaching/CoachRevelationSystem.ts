/**
 * Coach Revelation System
 * Determines which coach attributes are revealed based on experience and time.
 *
 * Revelation rules:
 * - Personality type: Always visible
 * - Age, years experience: Always visible
 * - Reputation tier: Always visible
 * - Individual attributes: Revealed progressively based on coach's experience
 * - Contract details: Visible for own team only
 * - Chemistry values: Never directly shown (qualitative descriptions only)
 */

import { Coach } from '../models/staff/Coach';
import { CoachAttributes } from '../models/staff/CoachAttributes';

/**
 * Attribute visibility levels
 */
export type AttributeVisibility = 'hidden' | 'vague' | 'approximate' | 'revealed';

/**
 * Individual attribute revelation state
 */
export interface AttributeRevelation {
  development: AttributeVisibility;
  gameDayIQ: AttributeVisibility;
  schemeTeaching: AttributeVisibility;
  playerEvaluation: AttributeVisibility;
  talentID: AttributeVisibility;
  motivation: AttributeVisibility;
}

/**
 * Full coach revelation state
 */
export interface CoachRevelationState {
  // Always visible
  personalityVisible: true;
  ageVisible: true;
  experienceVisible: true;
  reputationTierVisible: true;
  treeNameVisible: true;

  // Progressively revealed
  attributes: AttributeRevelation;

  // Conditionally visible
  contractVisible: boolean;
  tendenciesDescriptionVisible: boolean;

  // Never directly visible (qualitative only)
  chemistryVisible: false;
  egoVisible: false;
}

/**
 * Experience thresholds for attribute revelation
 * More experienced coaches have more "known" qualities
 */
const REVELATION_THRESHOLDS = {
  // Years experience needed for each visibility level
  vague: 3, // Coach has been around enough to have some reputation
  approximate: 8, // Established coach, people know their tendencies
  revealed: 15, // Veteran coach, fully known quantity
};

/**
 * Order in which attributes are revealed as experience increases
 * Most visible traits first
 */
const ATTRIBUTE_REVELATION_ORDER: (keyof AttributeRevelation)[] = [
  'motivation', // How they treat players is most visible
  'gameDayIQ', // Game day decisions are public
  'schemeTeaching', // How well teams learn schemes is noticeable
  'development', // Player growth under them is trackable
  'playerEvaluation', // Draft/FA success is public record
  'talentID', // Hidden trait discovery is least visible
];

/**
 * Calculates revelation state for a coach
 */
export function calculateCoachRevelation(coach: Coach, isOwnTeam: boolean): CoachRevelationState {
  const experience = coach.attributes.yearsExperience;

  // Calculate attribute visibility based on experience
  const attributes = calculateAttributeRevelation(experience);

  return {
    // Always visible
    personalityVisible: true,
    ageVisible: true,
    experienceVisible: true,
    reputationTierVisible: true,
    treeNameVisible: true,

    // Progressively revealed
    attributes,

    // Conditionally visible
    contractVisible: isOwnTeam && coach.contract !== null,
    tendenciesDescriptionVisible: experience >= REVELATION_THRESHOLDS.vague,

    // Never directly visible
    chemistryVisible: false,
    egoVisible: false,
  };
}

/**
 * Calculates attribute revelation based on experience
 */
function calculateAttributeRevelation(yearsExperience: number): AttributeRevelation {
  const result: AttributeRevelation = {
    development: 'hidden',
    gameDayIQ: 'hidden',
    schemeTeaching: 'hidden',
    playerEvaluation: 'hidden',
    talentID: 'hidden',
    motivation: 'hidden',
  };

  // Determine base visibility level from experience
  let baseLevel: AttributeVisibility = 'hidden';
  if (yearsExperience >= REVELATION_THRESHOLDS.revealed) {
    baseLevel = 'revealed';
  } else if (yearsExperience >= REVELATION_THRESHOLDS.approximate) {
    baseLevel = 'approximate';
  } else if (yearsExperience >= REVELATION_THRESHOLDS.vague) {
    baseLevel = 'vague';
  }

  // Apply visibility based on revelation order
  // More experienced = more attributes at higher visibility
  const attributesRevealed = Math.min(
    ATTRIBUTE_REVELATION_ORDER.length,
    Math.floor(yearsExperience / 2) // One attribute every 2 years
  );

  for (let i = 0; i < ATTRIBUTE_REVELATION_ORDER.length; i++) {
    const attr = ATTRIBUTE_REVELATION_ORDER[i];
    if (i < attributesRevealed) {
      result[attr] = baseLevel;
    } else if (i < attributesRevealed + 2) {
      // Next couple attributes are one level lower
      result[attr] = decreaseVisibility(baseLevel);
    }
    // Rest stay hidden
  }

  return result;
}

/**
 * Decreases visibility by one level
 */
function decreaseVisibility(level: AttributeVisibility): AttributeVisibility {
  switch (level) {
    case 'revealed':
      return 'approximate';
    case 'approximate':
      return 'vague';
    case 'vague':
      return 'hidden';
    default:
      return 'hidden';
  }
}

/**
 * Gets display value for an attribute based on visibility
 */
export function getAttributeDisplayValue(
  attributes: CoachAttributes,
  attrName: keyof AttributeRevelation,
  visibility: AttributeVisibility
): string {
  const value = attributes[attrName];

  switch (visibility) {
    case 'revealed':
      return value.toString();
    case 'approximate':
      // Show range of ±10
      const min = Math.max(1, value - 10);
      const max = Math.min(100, value + 10);
      return `${min}-${max}`;
    case 'vague':
      // Show qualitative descriptor
      return getQualitativeDescriptor(value);
    case 'hidden':
    default:
      return '???';
  }
}

/**
 * Gets qualitative descriptor for a value
 */
export function getQualitativeDescriptor(value: number): string {
  if (value >= 90) return 'Elite';
  if (value >= 75) return 'Excellent';
  if (value >= 60) return 'Good';
  if (value >= 45) return 'Average';
  if (value >= 30) return 'Below Avg';
  return 'Poor';
}

/**
 * Gets color for attribute value
 */
export function getAttributeColor(value: number): string {
  if (value >= 80) return '#22C55E'; // green
  if (value >= 60) return '#3B82F6'; // blue
  if (value >= 40) return '#F59E0B'; // amber
  return '#EF4444'; // red
}

/**
 * Gets display name for an attribute
 */
export function getAttributeDisplayName(attrName: keyof AttributeRevelation): string {
  const names: Record<keyof AttributeRevelation, string> = {
    development: 'Player Development',
    gameDayIQ: 'Game Day IQ',
    schemeTeaching: 'Scheme Teaching',
    playerEvaluation: 'Player Evaluation',
    talentID: 'Talent Identification',
    motivation: 'Motivation',
  };
  return names[attrName];
}

/**
 * Gets description for an attribute
 */
export function getAttributeDescription(attrName: keyof AttributeRevelation): string {
  const descriptions: Record<keyof AttributeRevelation, string> = {
    development: 'How quickly players improve under this coach',
    gameDayIQ: 'Quality of in-game decisions and adjustments',
    schemeTeaching: 'How fast players learn and execute the scheme',
    playerEvaluation: 'Accuracy when evaluating player abilities',
    talentID: 'Ability to identify hidden potential in players',
    motivation: 'Impact on player morale and effort',
  };
  return descriptions[attrName];
}
