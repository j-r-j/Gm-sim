/**
 * Role types representing a player's potential and current standing on a team
 */
export type RoleType =
  | 'franchiseCornerstone' // Top 5 at position, build around player
  | 'highEndStarter' // Top 15 at position, reliable starter
  | 'solidStarter' // Capable starter, not elite
  | 'qualityRotational' // Key backup, situational player
  | 'specialist' // One specific skill (ST, short yardage, etc.)
  | 'depth' // End of roster, emergency fill-in
  | 'practiceSquad'; // Development player, not roster ready

/**
 * Role fit for a player.
 * Determines their ceiling and how well they fit their current role.
 */
export interface RoleFit {
  /** The highest effective role this player can reach */
  ceiling: RoleType;

  /** The player's currently assigned role */
  currentRole: RoleType;

  /** How well they fit their current role (1-100, hidden from user) */
  roleEffectiveness: number;
}

/**
 * Role hierarchy from highest to lowest
 */
export const ROLE_HIERARCHY: RoleType[] = [
  'franchiseCornerstone',
  'highEndStarter',
  'solidStarter',
  'qualityRotational',
  'specialist',
  'depth',
  'practiceSquad',
];

/**
 * Gets the numeric rank of a role (0 = highest, 6 = lowest)
 */
export function getRoleRank(role: RoleType): number {
  return ROLE_HIERARCHY.indexOf(role);
}

/**
 * Checks if a role is higher than another
 */
export function isHigherRole(role1: RoleType, role2: RoleType): boolean {
  return getRoleRank(role1) < getRoleRank(role2);
}

/**
 * Creates a default role fit
 */
export function createDefaultRoleFit(): RoleFit {
  return {
    ceiling: 'depth',
    currentRole: 'depth',
    roleEffectiveness: 50,
  };
}

/**
 * Validates a role fit object
 */
export function validateRoleFit(roleFit: RoleFit): boolean {
  const validRoles = ROLE_HIERARCHY;

  return (
    validRoles.includes(roleFit.ceiling) &&
    validRoles.includes(roleFit.currentRole) &&
    roleFit.roleEffectiveness >= 1 &&
    roleFit.roleEffectiveness <= 100 &&
    // Current role cannot exceed ceiling
    getRoleRank(roleFit.currentRole) >= getRoleRank(roleFit.ceiling)
  );
}

/**
 * Gets a qualitative description of role fit for UI display.
 * Does NOT reveal the actual effectiveness number.
 */
export function getRoleFitDescription(roleFit: RoleFit): string {
  const effectiveness = roleFit.roleEffectiveness;

  if (effectiveness >= 85) {
    return 'Excelling in role';
  } else if (effectiveness >= 70) {
    return 'Comfortable in role';
  } else if (effectiveness >= 50) {
    return 'Adequate in role';
  } else if (effectiveness >= 30) {
    return 'Struggling in role';
  } else {
    return 'Poor fit for role';
  }
}

/**
 * Gets a display-friendly name for a role type
 */
export function getRoleDisplayName(role: RoleType): string {
  switch (role) {
    case 'franchiseCornerstone':
      return 'Franchise Cornerstone';
    case 'highEndStarter':
      return 'High-End Starter';
    case 'solidStarter':
      return 'Solid Starter';
    case 'qualityRotational':
      return 'Quality Rotational';
    case 'specialist':
      return 'Specialist';
    case 'depth':
      return 'Depth';
    case 'practiceSquad':
      return 'Practice Squad';
  }
}

/**
 * Calculates performance modifier based on role fit.
 * FOR ENGINE USE ONLY.
 */
export function getRoleFitModifier(roleFit: RoleFit): number {
  // Players fitting their role well get a bonus, poor fits get penalties
  const normalized = (roleFit.roleEffectiveness - 50) / 50; // -1 to 1
  return 1 + normalized * 0.1; // ±10% modifier
}
