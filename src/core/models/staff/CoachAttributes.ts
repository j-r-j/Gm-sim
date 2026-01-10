/**
 * Coach Attributes Model
 * Defines the skill attributes for coaches (hidden from user)
 */

/**
 * Reputation tier visible to UI
 */
export type ReputationTier = 'unknown' | 'rising' | 'established' | 'elite' | 'legendary';

/**
 * Coach attributes (all hidden from user except experience and age)
 */
export interface CoachAttributes {
  // Core coaching abilities (all 1-100, hidden from user)
  development: number; // Player growth speed
  gameDayIQ: number; // In-game decisions
  schemeTeaching: number; // Players adapt to scheme faster
  playerEvaluation: number; // Accuracy perceiving player ratings
  talentID: number; // Spots hidden traits
  motivation: number; // Affects player morale

  // Reputation (affects free agency interest)
  reputation: number; // 1-100

  // Experience (visible to UI)
  yearsExperience: number;
  age: number;
}

/**
 * What the UI can see (partial view)
 */
export interface CoachAttributesViewModel {
  yearsExperience: number;
  age: number;
  reputationTier: ReputationTier;
  // All other attributes hidden
}

/**
 * Converts raw reputation score to tier (FOR ENGINE USE ONLY)
 */
export function getReputationTier(reputation: number): ReputationTier {
  if (reputation >= 90) return 'legendary';
  if (reputation >= 75) return 'elite';
  if (reputation >= 50) return 'established';
  if (reputation >= 25) return 'rising';
  return 'unknown';
}

/**
 * Creates a view model from full attributes (hides sensitive data)
 */
export function createAttributesViewModel(attributes: CoachAttributes): CoachAttributesViewModel {
  return {
    yearsExperience: attributes.yearsExperience,
    age: attributes.age,
    reputationTier: getReputationTier(attributes.reputation),
  };
}

/**
 * Creates default coach attributes
 */
export function createDefaultAttributes(): CoachAttributes {
  return {
    development: 50,
    gameDayIQ: 50,
    schemeTeaching: 50,
    playerEvaluation: 50,
    talentID: 50,
    motivation: 50,
    reputation: 50,
    yearsExperience: 5,
    age: 45,
  };
}

/**
 * Validates coach attributes
 */
export function validateAttributes(attributes: CoachAttributes): boolean {
  const numericFields: (keyof CoachAttributes)[] = [
    'development',
    'gameDayIQ',
    'schemeTeaching',
    'playerEvaluation',
    'talentID',
    'motivation',
    'reputation',
  ];

  // All numeric fields must be 1-100
  for (const field of numericFields) {
    const value = attributes[field];
    if (typeof value !== 'number' || value < 1 || value > 100) {
      return false;
    }
  }

  // Years experience must be non-negative
  if (attributes.yearsExperience < 0) {
    return false;
  }

  // Age must be reasonable (25-80)
  if (attributes.age < 25 || attributes.age > 80) {
    return false;
  }

  return true;
}

/**
 * Calculates overall coaching effectiveness (FOR ENGINE USE ONLY)
 * This is a weighted average of all attributes
 */
export function calculateOverallRating(attributes: CoachAttributes): number {
  const weights = {
    development: 0.2,
    gameDayIQ: 0.25,
    schemeTeaching: 0.15,
    playerEvaluation: 0.15,
    talentID: 0.1,
    motivation: 0.15,
  };

  let total = 0;
  total += attributes.development * weights.development;
  total += attributes.gameDayIQ * weights.gameDayIQ;
  total += attributes.schemeTeaching * weights.schemeTeaching;
  total += attributes.playerEvaluation * weights.playerEvaluation;
  total += attributes.talentID * weights.talentID;
  total += attributes.motivation * weights.motivation;

  return Math.round(total);
}
