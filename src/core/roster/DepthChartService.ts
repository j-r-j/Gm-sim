/**
 * Depth Chart Service
 * Business logic for the realistic depth chart system
 */

import { Player } from '../models/player/Player';
import { Position } from '../models/player/Position';
import { GameState } from '../models/game/GameState';
import {
  DepthChartSlot,
  SLOT_ELIGIBLE_POSITIONS,
  SLOT_INFO,
  getSlotsByCategory,
  getSlotsBySubcategory,
  canFillSlot,
  getPrimaryPositionForSlot,
} from './DepthChartSlots';
import {
  DepthChart,
  DepthChartAssignment,
  DepthChartGroupView,
  DepthChartSubcategoryView,
  DepthChartSlotView,
  DepthChartValidation,
  AutoFillResult,
  DepthChartGenerationOptions,
  LegacyDepthChart,
  PlayerDepthStatus,
} from './DepthChartTypes';
import {
  OffensivePersonnel,
  DefensivePackage,
  OFFENSIVE_PACKAGES,
  DEFENSIVE_PACKAGES,
} from './FormationPackages';

// ============================================
// POSITION FLEXIBILITY
// ============================================

/**
 * Position flexibility ratings
 * Defines how well positions can convert to other positions
 * 100 = natural position, lower = penalty for out-of-position
 */
const POSITION_FLEXIBILITY: Partial<Record<Position, Partial<Record<Position, number>>>> = {
  // Offensive Line flexibility
  [Position.LT]: { [Position.LT]: 100, [Position.RT]: 90, [Position.LG]: 75 },
  [Position.LG]: {
    [Position.LG]: 100,
    [Position.RG]: 95,
    [Position.C]: 80,
    [Position.LT]: 70,
    [Position.RT]: 65,
  },
  [Position.C]: { [Position.C]: 100, [Position.LG]: 85, [Position.RG]: 85 },
  [Position.RG]: {
    [Position.RG]: 100,
    [Position.LG]: 95,
    [Position.C]: 80,
    [Position.RT]: 70,
    [Position.LT]: 65,
  },
  [Position.RT]: { [Position.RT]: 100, [Position.LT]: 90, [Position.RG]: 75 },

  // Defensive Line flexibility
  [Position.DE]: { [Position.DE]: 100, [Position.DT]: 70, [Position.OLB]: 60 },
  [Position.DT]: { [Position.DT]: 100, [Position.DE]: 65 },

  // Linebacker flexibility
  [Position.OLB]: { [Position.OLB]: 100, [Position.ILB]: 75, [Position.DE]: 60 },
  [Position.ILB]: { [Position.ILB]: 100, [Position.OLB]: 80, [Position.SS]: 55 },

  // Secondary flexibility
  [Position.CB]: { [Position.CB]: 100, [Position.FS]: 65, [Position.SS]: 60 },
  [Position.FS]: { [Position.FS]: 100, [Position.SS]: 90, [Position.CB]: 70 },
  [Position.SS]: { [Position.SS]: 100, [Position.FS]: 90, [Position.CB]: 60, [Position.ILB]: 55 },

  // Skill position flexibility
  [Position.WR]: { [Position.WR]: 100, [Position.RB]: 55, [Position.CB]: 50 },
  [Position.RB]: { [Position.RB]: 100, [Position.WR]: 60, [Position.TE]: 50 },
  [Position.TE]: { [Position.TE]: 100, [Position.RB]: 55, [Position.WR]: 45 },

  // QB has no flexibility
  [Position.QB]: { [Position.QB]: 100 },

  // Special teams flexibility
  [Position.K]: { [Position.K]: 100, [Position.P]: 70 },
  [Position.P]: { [Position.P]: 100, [Position.K]: 70 },
};

/**
 * Get flexibility rating for playing a position at a slot
 */
export function getPositionFlexibilityRating(
  playerPosition: Position,
  slotPosition: Position
): number {
  if (playerPosition === slotPosition) return 100;
  return POSITION_FLEXIBILITY[playerPosition]?.[slotPosition] ?? 0;
}

// ============================================
// PLAYER RATING CALCULATIONS
// ============================================

/**
 * Get skill value from player's skill object (perceived mid-point)
 */
function getSkillValue(player: Player, skillName: string): number {
  const skill = player.skills[skillName];
  if (!skill) return 50;
  return (skill.perceivedMin + skill.perceivedMax) / 2;
}

/**
 * Get skills relevant for a position
 */
function getPositionSkills(position: Position): string[] {
  switch (position) {
    case Position.QB:
      return ['armStrength', 'accuracy', 'decisionMaking', 'pocketPresence', 'mobility'];
    case Position.RB:
      return ['vision', 'cutAbility', 'power', 'breakaway', 'catching'];
    case Position.WR:
      return ['routeRunning', 'catching', 'separation', 'yac'];
    case Position.TE:
      return ['blocking', 'routeRunning', 'catching', 'yac'];
    case Position.LT:
    case Position.LG:
    case Position.C:
    case Position.RG:
    case Position.RT:
      return ['passBlock', 'runBlock', 'awareness', 'footwork', 'power'];
    case Position.DE:
    case Position.DT:
      return ['passRush', 'runDefense', 'power', 'awareness'];
    case Position.OLB:
    case Position.ILB:
      return ['tackling', 'coverage', 'blitzing', 'pursuit', 'awareness'];
    case Position.CB:
    case Position.FS:
    case Position.SS:
      return ['manCoverage', 'zoneCoverage', 'tackling', 'ballSkills'];
    case Position.K:
      return ['kickPower', 'kickAccuracy', 'clutch'];
    case Position.P:
      return ['puntPower', 'puntAccuracy', 'hangTime'];
    default:
      return [];
  }
}

/**
 * Calculate player's overall rating for their position
 */
export function calculatePlayerRating(player: Player): number {
  const skills = getPositionSkills(player.position);
  if (skills.length === 0) return 50;

  const total = skills.reduce((sum, skill) => sum + getSkillValue(player, skill), 0);
  return Math.round(total / skills.length);
}

/**
 * Calculate how well a player fits a specific slot
 * Combines position rating with flexibility penalty
 */
export function calculateSlotEffectiveness(player: Player, slot: DepthChartSlot): number {
  const primaryPosition = getPrimaryPositionForSlot(slot);
  const baseRating = calculatePlayerRating(player);
  const flexibilityMultiplier =
    getPositionFlexibilityRating(player.position, primaryPosition) / 100;

  return Math.round(baseRating * flexibilityMultiplier);
}

/**
 * Get eligible players for a slot from roster
 */
export function getEligiblePlayersForSlot(
  gameState: GameState,
  teamId: string,
  slot: DepthChartSlot
): Player[] {
  const team = gameState.teams[teamId];
  if (!team) return [];

  const eligiblePositions = SLOT_ELIGIBLE_POSITIONS[slot];

  return team.rosterPlayerIds
    .map((id) => gameState.players[id])
    .filter((p): p is Player => p !== undefined)
    .filter((p) => eligiblePositions.includes(p.position))
    .sort((a, b) => calculateSlotEffectiveness(b, slot) - calculateSlotEffectiveness(a, slot));
}

/**
 * Rank players for a slot
 */
export function rankPlayersForSlot(
  players: Player[],
  slot: DepthChartSlot
): Array<{ player: Player; effectiveness: number }> {
  return players
    .filter((p) => canFillSlot(p.position, slot))
    .map((player) => ({
      player,
      effectiveness: calculateSlotEffectiveness(player, slot),
    }))
    .sort((a, b) => b.effectiveness - a.effectiveness);
}

// ============================================
// DEPTH CHART CREATION & GENERATION
// ============================================

/**
 * Create empty depth chart for a team
 */
export function createEmptyDepthChart(teamId: string): DepthChart {
  return {
    teamId,
    version: 2,
    assignments: [],
    formationOverrides: [],
    autoGenerated: false,
    lastUpdated: Date.now(),
    lastAutoSortDate: null,
  };
}

/**
 * Generate depth chart automatically based on roster
 */
export function generateDepthChart(
  gameState: GameState,
  teamId: string,
  options: DepthChartGenerationOptions = {
    preserveLockedAssignments: true,
    fillSpecialists: true,
    preferExperience: false,
  }
): AutoFillResult {
  const team = gameState.teams[teamId];
  if (!team) {
    throw new Error(`Team ${teamId} not found`);
  }

  const assignments: DepthChartAssignment[] = [];
  const usedPlayerIds = new Set<string>();
  const unfilledSlots: DepthChartSlot[] = [];
  const warnings: string[] = [];

  // Get all roster players
  const rosterPlayers = team.rosterPlayerIds
    .map((id) => gameState.players[id])
    .filter((p): p is Player => p !== undefined);

  // Get all slots to fill (all slots, sorted by priority)
  const allSlots = Object.values(DepthChartSlot);

  // Sort slots by importance (required first, then by depth level)
  const sortedSlots = allSlots.sort((a, b) => {
    const infoA = SLOT_INFO[a];
    const infoB = SLOT_INFO[b];

    // Required slots first
    if (infoA.isRequired !== infoB.isRequired) {
      return infoA.isRequired ? -1 : 1;
    }

    // Non-specialists before specialists
    if (infoA.isSpecialist !== infoB.isSpecialist) {
      return infoA.isSpecialist ? 1 : -1;
    }

    // Lower depth level first (starters before backups)
    return infoA.depthLevel - infoB.depthLevel;
  });

  // Fill each slot
  for (const slot of sortedSlots) {
    const slotInfo = SLOT_INFO[slot];

    // Skip specialists if not requested
    if (slotInfo.isSpecialist && !options.fillSpecialists) {
      continue;
    }

    // Find best available player
    const eligiblePlayers = rosterPlayers.filter(
      (p) => !usedPlayerIds.has(p.id) && canFillSlot(p.position, slot)
    );

    const rankedPlayers = rankPlayersForSlot(eligiblePlayers, slot);

    if (rankedPlayers.length > 0) {
      const best = rankedPlayers[0];
      usedPlayerIds.add(best.player.id);

      assignments.push({
        slot,
        playerId: best.player.id,
        isLocked: false,
        outOfPosition: best.player.position !== getPrimaryPositionForSlot(slot),
        effectivenessRating: best.effectiveness,
      });
    } else if (slotInfo.isRequired) {
      unfilledSlots.push(slot);
      warnings.push(`No eligible players for required slot: ${slotInfo.displayName}`);
    }
  }

  const depthChart: DepthChart = {
    teamId,
    version: 2,
    assignments,
    formationOverrides: [],
    autoGenerated: true,
    lastUpdated: Date.now(),
    lastAutoSortDate: Date.now(),
  };

  return {
    depthChart,
    assignmentsChanged: assignments.length,
    unfilledSlots,
    warnings,
  };
}

// ============================================
// DEPTH CHART MODIFICATION
// ============================================

/**
 * Assign a player to a slot
 */
export function assignPlayerToSlot(
  depthChart: DepthChart,
  playerId: string,
  slot: DepthChartSlot,
  playerPosition: Position
): DepthChart {
  // Remove any existing assignment for this slot
  const filteredAssignments = depthChart.assignments.filter((a) => a.slot !== slot);

  // Also remove player from any other slot
  const cleanedAssignments = filteredAssignments.filter((a) => a.playerId !== playerId);

  // Add new assignment
  const newAssignment: DepthChartAssignment = {
    slot,
    playerId,
    isLocked: false,
    outOfPosition: playerPosition !== getPrimaryPositionForSlot(slot),
    effectivenessRating: 0, // Will be recalculated when needed
  };

  return {
    ...depthChart,
    assignments: [...cleanedAssignments, newAssignment],
    autoGenerated: false,
    lastUpdated: Date.now(),
  };
}

/**
 * Remove a player from the depth chart
 */
export function removePlayerFromDepthChart(depthChart: DepthChart, playerId: string): DepthChart {
  return {
    ...depthChart,
    assignments: depthChart.assignments.filter((a) => a.playerId !== playerId),
    formationOverrides: depthChart.formationOverrides.filter((o) => o.playerId !== playerId),
    autoGenerated: false,
    lastUpdated: Date.now(),
  };
}

/**
 * Swap two players in the depth chart
 */
export function swapPlayers(
  depthChart: DepthChart,
  playerId1: string,
  playerId2: string
): DepthChart {
  const assignment1 = depthChart.assignments.find((a) => a.playerId === playerId1);
  const assignment2 = depthChart.assignments.find((a) => a.playerId === playerId2);

  if (!assignment1 || !assignment2) {
    throw new Error('Both players must be on the depth chart to swap');
  }

  const newAssignments = depthChart.assignments.map((a) => {
    if (a.playerId === playerId1) {
      return { ...a, slot: assignment2.slot, playerId: playerId1 };
    }
    if (a.playerId === playerId2) {
      return { ...a, slot: assignment1.slot, playerId: playerId2 };
    }
    return a;
  });

  return {
    ...depthChart,
    assignments: newAssignments,
    autoGenerated: false,
    lastUpdated: Date.now(),
  };
}

/**
 * Lock/unlock a slot assignment
 */
export function toggleSlotLock(depthChart: DepthChart, slot: DepthChartSlot): DepthChart {
  return {
    ...depthChart,
    assignments: depthChart.assignments.map((a) =>
      a.slot === slot ? { ...a, isLocked: !a.isLocked } : a
    ),
    lastUpdated: Date.now(),
  };
}

/**
 * Add formation override
 */
export function addFormationOverride(
  depthChart: DepthChart,
  packageId: OffensivePersonnel | DefensivePackage | string,
  slot: DepthChartSlot,
  playerId: string
): DepthChart {
  // Remove existing override for this package/slot combo
  const filtered = depthChart.formationOverrides.filter(
    (o) => !(o.package === packageId && o.slot === slot)
  );

  return {
    ...depthChart,
    formationOverrides: [...filtered, { package: packageId, slot, playerId }],
    lastUpdated: Date.now(),
  };
}

/**
 * Remove formation override
 */
export function removeFormationOverride(
  depthChart: DepthChart,
  packageId: OffensivePersonnel | DefensivePackage | string,
  slot: DepthChartSlot
): DepthChart {
  return {
    ...depthChart,
    formationOverrides: depthChart.formationOverrides.filter(
      (o) => !(o.package === packageId && o.slot === slot)
    ),
    lastUpdated: Date.now(),
  };
}

// ============================================
// DEPTH CHART QUERIES
// ============================================

/**
 * Get player assigned to a slot
 */
export function getPlayerForSlot(depthChart: DepthChart, slot: DepthChartSlot): string | null {
  const assignment = depthChart.assignments.find((a) => a.slot === slot);
  return assignment?.playerId ?? null;
}

/**
 * Get player for a slot in a specific formation
 */
export function getPlayerForSlotInFormation(
  depthChart: DepthChart,
  slot: DepthChartSlot,
  packageId: OffensivePersonnel | DefensivePackage | string
): string | null {
  // Check for formation override first
  const override = depthChart.formationOverrides.find(
    (o) => o.package === packageId && o.slot === slot
  );
  if (override) {
    return override.playerId;
  }

  // Fall back to standard assignment
  return getPlayerForSlot(depthChart, slot);
}

/**
 * Get all slots a player is assigned to
 */
export function getPlayerSlots(depthChart: DepthChart, playerId: string): DepthChartSlot[] {
  return depthChart.assignments.filter((a) => a.playerId === playerId).map((a) => a.slot);
}

/**
 * Get player's depth status
 */
export function getPlayerDepthStatus(depthChart: DepthChart, playerId: string): PlayerDepthStatus {
  const assignments = depthChart.assignments.filter((a) => a.playerId === playerId);
  const slots = assignments.map((a) => a.slot);

  // Find primary slot (lowest depth level)
  let primarySlot: DepthChartSlot | null = null;
  let lowestDepth = Infinity;

  for (const slot of slots) {
    const info = SLOT_INFO[slot];
    if (info.depthLevel < lowestDepth) {
      lowestDepth = info.depthLevel;
      primarySlot = slot;
    }
  }

  const secondarySlots = slots.filter((s) => s !== primarySlot);
  const isStarter = primarySlot !== null && SLOT_INFO[primarySlot].depthLevel === 1;

  return {
    playerId,
    primarySlot,
    secondarySlots,
    isStarter,
    isOnDepthChart: assignments.length > 0,
  };
}

/**
 * Get all starters
 */
export function getStarters(depthChart: DepthChart): DepthChartAssignment[] {
  return depthChart.assignments.filter((a) => SLOT_INFO[a.slot].depthLevel === 1);
}

// ============================================
// UI VIEW GENERATION
// ============================================

/**
 * Generate UI view for a category
 */
export function generateCategoryView(
  gameState: GameState,
  depthChart: DepthChart,
  category: 'offense' | 'defense' | 'specialTeams'
): DepthChartGroupView {
  const subcategoriesMap = getSlotsBySubcategory(category);
  const team = gameState.teams[depthChart.teamId];
  const rosterPlayers = team
    ? team.rosterPlayerIds
        .map((id) => gameState.players[id])
        .filter((p): p is Player => p !== undefined)
    : [];

  const subcategories: DepthChartSubcategoryView[] = [];

  for (const [subcategoryName, slots] of Object.entries(subcategoriesMap)) {
    const slotViews: DepthChartSlotView[] = slots.map((slot) => {
      const info = SLOT_INFO[slot];
      const assignment = depthChart.assignments.find((a) => a.slot === slot) ?? null;
      const eligibleCount = rosterPlayers.filter((p) => canFillSlot(p.position, slot)).length;

      return {
        slot,
        displayName: info.displayName,
        shortName: info.shortName,
        assignment,
        isRequired: info.isRequired,
        isSpecialist: info.isSpecialist,
        eligiblePlayerCount: eligibleCount,
      };
    });

    subcategories.push({
      name: subcategoryName,
      slots: slotViews,
    });
  }

  return {
    groupName:
      category === 'specialTeams'
        ? 'Special Teams'
        : category.charAt(0).toUpperCase() + category.slice(1),
    subcategories,
  };
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate depth chart
 */
export function validateDepthChart(
  gameState: GameState,
  depthChart: DepthChart
): DepthChartValidation {
  const missingRequiredSlots: DepthChartSlot[] = [];
  const emptySlots: DepthChartSlot[] = [];
  const outOfPositionPlayers: Array<{
    playerId: string;
    slot: DepthChartSlot;
    playerPosition: Position;
  }> = [];
  const duplicatePlayers: Array<{ playerId: string; slots: DepthChartSlot[] }> = [];
  const warnings: string[] = [];

  const allSlots = Object.values(DepthChartSlot);
  const assignedSlots = new Set(depthChart.assignments.map((a) => a.slot));

  // Check for missing/empty slots
  for (const slot of allSlots) {
    const info = SLOT_INFO[slot];
    if (!assignedSlots.has(slot)) {
      if (info.isRequired) {
        missingRequiredSlots.push(slot);
      } else {
        emptySlots.push(slot);
      }
    }
  }

  // Check for out-of-position players
  for (const assignment of depthChart.assignments) {
    const player = gameState.players[assignment.playerId];
    if (player && assignment.outOfPosition) {
      outOfPositionPlayers.push({
        playerId: assignment.playerId,
        slot: assignment.slot,
        playerPosition: player.position,
      });
    }
  }

  // Check for duplicate players (same player in multiple starter slots)
  const playerSlotMap = new Map<string, DepthChartSlot[]>();
  for (const assignment of depthChart.assignments) {
    const info = SLOT_INFO[assignment.slot];
    if (info.depthLevel === 1) {
      // Only check starters
      const slots = playerSlotMap.get(assignment.playerId) || [];
      slots.push(assignment.slot);
      playerSlotMap.set(assignment.playerId, slots);
    }
  }

  for (const [playerId, slots] of playerSlotMap) {
    if (slots.length > 1) {
      // Allow duplicate for special teams (KR/PR can be same player)
      const hasNonSpecialTeams = slots.some((s) => SLOT_INFO[s].category !== 'specialTeams');
      const allSpecialTeams = slots.every((s) => SLOT_INFO[s].category === 'specialTeams');

      if (hasNonSpecialTeams || !allSpecialTeams) {
        duplicatePlayers.push({ playerId, slots });
      }
    }
  }

  // Generate warnings
  if (missingRequiredSlots.length > 0) {
    warnings.push(
      `Missing ${missingRequiredSlots.length} required position${missingRequiredSlots.length > 1 ? 's' : ''}`
    );
  }

  if (outOfPositionPlayers.length > 3) {
    warnings.push(`${outOfPositionPlayers.length} players are playing out of position`);
  }

  const isValid =
    missingRequiredSlots.length === 0 &&
    duplicatePlayers.filter((d) => d.slots.some((s) => SLOT_INFO[s].category !== 'specialTeams'))
      .length === 0;

  return {
    isValid,
    missingRequiredSlots,
    emptySlots,
    outOfPositionPlayers,
    duplicatePlayers,
    warnings,
  };
}

// ============================================
// MIGRATION
// ============================================

/**
 * Migrate legacy depth chart to new format
 */
export function migrateLegacyDepthChart(
  legacy: LegacyDepthChart,
  gameState: GameState
): DepthChart {
  const assignments: DepthChartAssignment[] = [];

  // Map old position/depth to new slots
  for (const entry of legacy.entries) {
    const slot = mapLegacyPositionToSlot(entry.position, entry.depth);
    if (slot) {
      const player = gameState.players[entry.playerId];
      assignments.push({
        slot,
        playerId: entry.playerId,
        isLocked: false,
        outOfPosition: player ? player.position !== entry.position : false,
        effectivenessRating: 0,
      });
    }
  }

  return {
    teamId: legacy.teamId,
    version: 2,
    assignments,
    formationOverrides: [],
    autoGenerated: legacy.autoGenerated,
    lastUpdated: legacy.lastUpdated,
    lastAutoSortDate: null,
  };
}

/**
 * Map legacy position/depth to new slot
 */
function mapLegacyPositionToSlot(position: Position, depth: 1 | 2 | 3): DepthChartSlot | null {
  const mapping: Record<string, DepthChartSlot> = {
    'QB-1': DepthChartSlot.QB1,
    'QB-2': DepthChartSlot.QB2,
    'QB-3': DepthChartSlot.QB3,
    'RB-1': DepthChartSlot.RB1,
    'RB-2': DepthChartSlot.RB2,
    'RB-3': DepthChartSlot.RB3,
    'WR-1': DepthChartSlot.WR1,
    'WR-2': DepthChartSlot.WR2,
    'WR-3': DepthChartSlot.SLOT_WR,
    'TE-1': DepthChartSlot.TE1,
    'TE-2': DepthChartSlot.TE2,
    'TE-3': DepthChartSlot.TE3,
    'LT-1': DepthChartSlot.LT1,
    'LT-2': DepthChartSlot.LT2,
    'LG-1': DepthChartSlot.LG1,
    'LG-2': DepthChartSlot.LG2,
    'C-1': DepthChartSlot.C1,
    'C-2': DepthChartSlot.C2,
    'RG-1': DepthChartSlot.RG1,
    'RG-2': DepthChartSlot.RG2,
    'RT-1': DepthChartSlot.RT1,
    'RT-2': DepthChartSlot.RT2,
    'DE-1': DepthChartSlot.LE1,
    'DE-2': DepthChartSlot.RE1,
    'DE-3': DepthChartSlot.LE2,
    'DT-1': DepthChartSlot.DT1,
    'DT-2': DepthChartSlot.DT2,
    'DT-3': DepthChartSlot.DT3,
    'OLB-1': DepthChartSlot.LOLB1,
    'OLB-2': DepthChartSlot.ROLB1,
    'OLB-3': DepthChartSlot.LOLB2,
    'ILB-1': DepthChartSlot.MLB1,
    'ILB-2': DepthChartSlot.MLB2,
    'CB-1': DepthChartSlot.CB1,
    'CB-2': DepthChartSlot.CB2,
    'CB-3': DepthChartSlot.SLOT_CB,
    'FS-1': DepthChartSlot.FS1,
    'FS-2': DepthChartSlot.FS2,
    'SS-1': DepthChartSlot.SS1,
    'SS-2': DepthChartSlot.SS2,
    'K-1': DepthChartSlot.K1,
    'K-2': DepthChartSlot.K2,
    'P-1': DepthChartSlot.P1,
    'P-2': DepthChartSlot.P2,
  };

  const key = `${position}-${depth}`;
  return mapping[key] ?? null;
}

// ============================================
// LINEUP GENERATION FOR GAME ENGINE
// ============================================

/**
 * Get lineup for a specific offensive package
 */
export function getOffensiveLineup(
  depthChart: DepthChart,
  personnel: OffensivePersonnel
): Map<DepthChartSlot, string> {
  const package_ = OFFENSIVE_PACKAGES[personnel];
  const lineup = new Map<DepthChartSlot, string>();

  for (const slot of package_.slots) {
    const playerId = getPlayerForSlotInFormation(depthChart, slot, personnel);
    if (playerId) {
      lineup.set(slot, playerId);
    }
  }

  return lineup;
}

/**
 * Get lineup for a specific defensive package
 */
export function getDefensiveLineup(
  depthChart: DepthChart,
  package_: DefensivePackage
): Map<DepthChartSlot, string> {
  const packageDef = DEFENSIVE_PACKAGES[package_];
  const lineup = new Map<DepthChartSlot, string>();

  for (const slot of packageDef.slots) {
    const playerId = getPlayerForSlotInFormation(depthChart, slot, package_);
    if (playerId) {
      lineup.set(slot, playerId);
    }
  }

  return lineup;
}

/**
 * Get all starters for game simulation
 */
export function getGameStarters(depthChart: DepthChart): {
  offense: Map<DepthChartSlot, string>;
  defense: Map<DepthChartSlot, string>;
  specialTeams: Map<DepthChartSlot, string>;
} {
  const offense = getOffensiveLineup(depthChart, OffensivePersonnel.ELEVEN);
  const defense = getDefensiveLineup(depthChart, DefensivePackage.NICKEL);

  const specialTeams = new Map<DepthChartSlot, string>();
  const stSlots = getSlotsByCategory('specialTeams');
  for (const slot of stSlots) {
    const info = SLOT_INFO[slot];
    if (info.depthLevel === 1) {
      const playerId = getPlayerForSlot(depthChart, slot);
      if (playerId) {
        specialTeams.set(slot, playerId);
      }
    }
  }

  return { offense, defense, specialTeams };
}

/**
 * Select starting lineup from depth chart
 * Converts depth chart to the StartingLineup format expected by game engine
 */
export function selectStartingLineupFromDepthChart(
  gameState: GameState,
  depthChart: DepthChart,
  injuredPlayerIds: string[] = []
): {
  offense: {
    qb: string | null;
    rb: string[];
    wr: string[];
    te: string[];
    lt: string | null;
    lg: string | null;
    c: string | null;
    rg: string | null;
    rt: string | null;
  };
  defense: {
    de: string[];
    dt: string[];
    olb: string[];
    ilb: string[];
    cb: string[];
    fs: string | null;
    ss: string | null;
  };
  specialTeams: {
    k: string | null;
    p: string | null;
    returner: string | null;
  };
} {
  const injuredSet = new Set(injuredPlayerIds);

  // Helper to get player if not injured
  const getAvailablePlayer = (slot: DepthChartSlot): string | null => {
    const playerId = getPlayerForSlot(depthChart, slot);
    if (playerId && !injuredSet.has(playerId)) {
      return playerId;
    }
    return null;
  };

  // Get players with fallback to backup if starter is injured
  const getPlayerWithFallback = (
    starterSlot: DepthChartSlot,
    backupSlot: DepthChartSlot
  ): string | null => {
    const starterId = getPlayerForSlot(depthChart, starterSlot);
    if (starterId && !injuredSet.has(starterId)) {
      return starterId;
    }
    const backupId = getPlayerForSlot(depthChart, backupSlot);
    if (backupId && !injuredSet.has(backupId)) {
      return backupId;
    }
    return null;
  };

  return {
    offense: {
      qb: getPlayerWithFallback(DepthChartSlot.QB1, DepthChartSlot.QB2),
      rb: [getAvailablePlayer(DepthChartSlot.RB1), getAvailablePlayer(DepthChartSlot.RB2)].filter(
        (id): id is string => id !== null
      ),
      wr: [
        getAvailablePlayer(DepthChartSlot.WR1),
        getAvailablePlayer(DepthChartSlot.WR2),
        getAvailablePlayer(DepthChartSlot.SLOT_WR),
      ].filter((id): id is string => id !== null),
      te: [getAvailablePlayer(DepthChartSlot.TE1), getAvailablePlayer(DepthChartSlot.TE2)].filter(
        (id): id is string => id !== null
      ),
      lt: getPlayerWithFallback(DepthChartSlot.LT1, DepthChartSlot.LT2),
      lg: getPlayerWithFallback(DepthChartSlot.LG1, DepthChartSlot.LG2),
      c: getPlayerWithFallback(DepthChartSlot.C1, DepthChartSlot.C2),
      rg: getPlayerWithFallback(DepthChartSlot.RG1, DepthChartSlot.RG2),
      rt: getPlayerWithFallback(DepthChartSlot.RT1, DepthChartSlot.RT2),
    },
    defense: {
      de: [
        getPlayerWithFallback(DepthChartSlot.LE1, DepthChartSlot.LE2),
        getPlayerWithFallback(DepthChartSlot.RE1, DepthChartSlot.RE2),
      ].filter((id): id is string => id !== null),
      dt: [getAvailablePlayer(DepthChartSlot.DT1), getAvailablePlayer(DepthChartSlot.DT2)].filter(
        (id): id is string => id !== null
      ),
      olb: [
        getPlayerWithFallback(DepthChartSlot.LOLB1, DepthChartSlot.LOLB2),
        getPlayerWithFallback(DepthChartSlot.ROLB1, DepthChartSlot.ROLB2),
      ].filter((id): id is string => id !== null),
      ilb: [
        getAvailablePlayer(DepthChartSlot.MLB1),
        getAvailablePlayer(DepthChartSlot.MLB2),
      ].filter((id): id is string => id !== null),
      cb: [
        getAvailablePlayer(DepthChartSlot.CB1),
        getAvailablePlayer(DepthChartSlot.CB2),
        getAvailablePlayer(DepthChartSlot.SLOT_CB),
      ].filter((id): id is string => id !== null),
      fs: getPlayerWithFallback(DepthChartSlot.FS1, DepthChartSlot.FS2),
      ss: getPlayerWithFallback(DepthChartSlot.SS1, DepthChartSlot.SS2),
    },
    specialTeams: {
      k: getPlayerWithFallback(DepthChartSlot.K1, DepthChartSlot.K2),
      p: getPlayerWithFallback(DepthChartSlot.P1, DepthChartSlot.P2),
      returner: getAvailablePlayer(DepthChartSlot.KR1) ?? getAvailablePlayer(DepthChartSlot.PR1),
    },
  };
}
