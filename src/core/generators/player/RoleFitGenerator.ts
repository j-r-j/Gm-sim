import { TechnicalSkills } from '../../models/player/TechnicalSkills';
import { RoleFit, RoleType, ROLE_HIERARCHY } from '../../models/player/RoleFit';
import { ConsistencyTier } from '../../models/player/Consistency';
import { weightedRandom, randomInt } from '../utils/RandomUtils';
import { getAverageTrueSkillValue } from './SkillGenerator';
import { getConsistencyScore } from './ConsistencyGenerator';

/**
 * Skill thresholds for each role ceiling.
 */
const ROLE_SKILL_THRESHOLDS: Record<RoleType, { min: number; max: number }> = {
  franchiseCornerstone: { min: 78, max: 100 },
  highEndStarter: { min: 68, max: 82 },
  solidStarter: { min: 58, max: 72 },
  qualityRotational: { min: 48, max: 62 },
  specialist: { min: 40, max: 55 },
  depth: { min: 30, max: 50 },
  practiceSquad: { min: 1, max: 40 },
};

/**
 * Gets the role ceiling based on skill average.
 */
function getRoleCeilingFromSkills(avgSkill: number): RoleType {
  for (const role of ROLE_HIERARCHY) {
    const threshold = ROLE_SKILL_THRESHOLDS[role];
    if (avgSkill >= threshold.min) {
      return role;
    }
  }
  return 'practiceSquad';
}

/**
 * Generates role fit for a player based on their skills, "It" factor, and consistency.
 * @param skills - The player's technical skills
 * @param itFactor - The player's "It" factor value
 * @param consistencyTier - The player's consistency tier
 * @returns A RoleFit object with ceiling, current role, and effectiveness
 */
export function generateRoleFit(
  skills: TechnicalSkills,
  itFactor: number,
  consistencyTier: ConsistencyTier
): RoleFit {
  // Get average skill value (using true values)
  const avgSkill = getAverageTrueSkillValue(skills);

  // High "It" factor can elevate ceiling
  const itBonus = (itFactor - 50) / 10; // -5 to +5

  // Consistency affects ceiling slightly
  const consistencyScore = getConsistencyScore(consistencyTier);
  const consistencyBonus = (consistencyScore - 50) / 20; // -2.5 to +2.5

  // Calculate effective skill level for ceiling
  const effectiveSkill = Math.max(1, Math.min(100, avgSkill + itBonus + consistencyBonus));

  // Determine ceiling based on effective skill
  const ceiling = getRoleCeilingFromSkills(effectiveSkill);

  // Current role starts at or below ceiling
  // Newer players typically start lower
  const ceilingIndex = ROLE_HIERARCHY.indexOf(ceiling);
  const startingRoleOptions: { value: RoleType; weight: number }[] = [];

  // Weight options toward lower roles
  for (let i = ceilingIndex; i < ROLE_HIERARCHY.length; i++) {
    const distanceFromCeiling = i - ceilingIndex;
    startingRoleOptions.push({
      value: ROLE_HIERARCHY[i],
      weight: distanceFromCeiling === 0 ? 0.3 : distanceFromCeiling === 1 ? 0.4 : 0.3,
    });

    // Don't go too far from ceiling
    if (i - ceilingIndex >= 2) break;
  }

  const currentRole = weightedRandom(startingRoleOptions);

  // Calculate role effectiveness (how well they fit current role)
  // Based on skill match to role requirements
  const roleThreshold = ROLE_SKILL_THRESHOLDS[currentRole];
  const roleCenter = (roleThreshold.min + roleThreshold.max) / 2;

  // Base effectiveness on how close skill is to role center
  const skillDiff = Math.abs(avgSkill - roleCenter);
  let baseEffectiveness = 75 - skillDiff;

  // Bonuses for "It" factor and consistency
  baseEffectiveness += itBonus * 2;
  baseEffectiveness += consistencyBonus * 2;

  // Add some randomness
  const effectiveness = Math.max(
    1,
    Math.min(100, Math.round(baseEffectiveness + randomInt(-10, 10)))
  );

  return {
    ceiling,
    currentRole,
    roleEffectiveness: effectiveness,
  };
}

/**
 * Generates role fit for a specific skill tier.
 */
export function generateRoleFitForTier(
  skillTier: 'elite' | 'starter' | 'backup' | 'fringe' | 'random',
  itFactor: number,
  consistencyTier: ConsistencyTier
): RoleFit {
  // Map skill tier to typical role ceilings
  const tierToCeiling: Record<string, RoleType> = {
    elite: 'franchiseCornerstone',
    starter: 'solidStarter',
    backup: 'qualityRotational',
    fringe: 'depth',
    random: 'qualityRotational',
  };

  const ceiling = tierToCeiling[skillTier];
  const ceilingIndex = ROLE_HIERARCHY.indexOf(ceiling);

  // Current role at or below ceiling
  const currentRoleIndex = Math.min(ROLE_HIERARCHY.length - 1, ceilingIndex + randomInt(0, 2));
  const currentRole = ROLE_HIERARCHY[currentRoleIndex];

  // Calculate effectiveness
  const consistencyScore = getConsistencyScore(consistencyTier);
  const itBonus = (itFactor - 50) / 10;
  const consistencyBonus = (consistencyScore - 50) / 20;

  const baseEffectiveness = 60 + itBonus * 2 + consistencyBonus * 2;
  const effectiveness = Math.max(
    1,
    Math.min(100, Math.round(baseEffectiveness + randomInt(-10, 10)))
  );

  return {
    ceiling,
    currentRole,
    roleEffectiveness: effectiveness,
  };
}
