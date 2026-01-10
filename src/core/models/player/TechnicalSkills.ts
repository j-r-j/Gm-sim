/**
 * Represents a single skill value with the three-layer rating system.
 * - trueValue: The player's actual ability (ONLY the game engine sees this)
 * - perceivedMin/Max: What scouts/coaches think (shown to user as RANGES)
 * - maturityAge: Age when the perceived range collapses to true value
 */
export interface SkillValue {
  /** The actual skill value (1-100). NEVER exposed to UI. */
  trueValue: number;

  /** Lower bound of perceived skill range shown to user */
  perceivedMin: number;

  /** Upper bound of perceived skill range shown to user */
  perceivedMax: number;

  /** Age at which the perceived range collapses to reveal true value */
  maturityAge: number;
}

/**
 * Technical skills for a player.
 * These improve with coaching and are position-specific.
 * Skills are stored with true values hidden, only ranges shown to users.
 */
export interface TechnicalSkills {
  [skillName: string]: SkillValue;
}

/**
 * Common skill names by position group
 */
export const SKILL_NAMES_BY_POSITION = {
  QB: [
    'armStrength',
    'accuracy',
    'decisionMaking',
    'pocketPresence',
    'playAction',
    'mobility',
    'leadership',
    'presnap',
  ],
  RB: [
    'vision',
    'cutAbility',
    'power',
    'breakaway',
    'catching',
    'passProtection',
    'fumbleProtection',
  ],
  WR: ['routeRunning', 'catching', 'separation', 'yac', 'blocking', 'contested', 'tracking'],
  TE: ['blocking', 'routeRunning', 'catching', 'yac', 'contested', 'sealing'],
  OL: ['passBlock', 'runBlock', 'awareness', 'footwork', 'power', 'sustain', 'pullAbility'],
  DL: ['passRush', 'runDefense', 'power', 'finesse', 'awareness', 'stamina', 'pursuit'],
  LB: ['tackling', 'coverage', 'blitzing', 'pursuit', 'awareness', 'shedBlocks', 'zoneCoverage'],
  DB: ['manCoverage', 'zoneCoverage', 'tackling', 'ballSkills', 'awareness', 'closing', 'press'],
  K: ['kickPower', 'kickAccuracy', 'clutch'],
  P: ['puntPower', 'puntAccuracy', 'hangTime', 'directional'],
} as const;

/**
 * Validates that a skill value has proper constraints:
 * - All values between 1-100
 * - perceivedMin <= trueValue <= perceivedMax
 * - maturityAge is reasonable (18-40)
 */
export function validateSkillValue(skill: SkillValue): boolean {
  return (
    skill.trueValue >= 1 &&
    skill.trueValue <= 100 &&
    skill.perceivedMin >= 1 &&
    skill.perceivedMin <= 100 &&
    skill.perceivedMax >= 1 &&
    skill.perceivedMax <= 100 &&
    skill.perceivedMin <= skill.trueValue &&
    skill.trueValue <= skill.perceivedMax &&
    skill.maturityAge >= 18 &&
    skill.maturityAge <= 40
  );
}

/**
 * Validates all skills in a TechnicalSkills object
 */
export function validateTechnicalSkills(skills: TechnicalSkills): boolean {
  return Object.values(skills).every(validateSkillValue);
}

/**
 * Gets the perceived skill range (what the UI shows)
 */
export function getPerceivedRange(skill: SkillValue): { min: number; max: number } {
  return {
    min: skill.perceivedMin,
    max: skill.perceivedMax,
  };
}

/**
 * Checks if a skill's true value should be revealed based on player age
 */
export function isSkillRevealed(skill: SkillValue, playerAge: number): boolean {
  return playerAge >= skill.maturityAge;
}
